import os
import json
import re
import httpx

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL   = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

# Ollama como fallback (solo si está disponible)
OLLAMA_URL = os.getenv("OLLAMA_URL", "")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen3:latest")

# ─────────────────────────────────────────────────────────────
# LLM — Groq (gratis) con fallback a Ollama o heurística
# ─────────────────────────────────────────────────────────────

async def ask_llm(prompt: str) -> str:
    """Groq primero (gratis), Ollama como fallback."""
    if GROQ_API_KEY:
        return await _ask_groq(prompt)
    if OLLAMA_URL:
        return await _ask_ollama(prompt)
    raise RuntimeError("No LLM configured — using heuristic fallback")


async def _ask_groq(prompt: str) -> str:
    try:
        from groq import AsyncGroq
    except ImportError:
        raise RuntimeError("groq package not installed")

    client = AsyncGroq(api_key=GROQ_API_KEY)
    response = await client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
        temperature=0.2,
        max_tokens=4000,
    )
    return response.choices[0].message.content


async def _ask_ollama(prompt: str) -> str:
    async with httpx.AsyncClient(timeout=120) as client:
        response = await client.post(
            OLLAMA_URL,
            json={"model": OLLAMA_MODEL, "prompt": prompt, "stream": False,
                  "format": "json", "think": False, "options": {"temperature": 0.2, "num_predict": 4000}},
        )
    response.raise_for_status()
    return response.json()["response"]


def parse_json(text: str) -> dict:
    try:
        return json.loads(text)
    except Exception:
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except Exception:
                pass
    return {"clips": []}


# ─────────────────────────────────────────────────────────────
# Build candidate windows (30–60 s, sliding 1 segment at a time)
# ─────────────────────────────────────────────────────────────

def build_windows(segments: list, min_dur: float = 25.0, max_dur: float = 58.0) -> list:
    """Sliding-window approach: step 1 segment, target 30-58 s clips."""
    windows = []
    n = len(segments)

    for i in range(n):
        start = segments[i]["start"]
        texts = []
        end   = start

        for j in range(i, n):
            texts.append(segments[j]["text"])
            end = segments[j]["end"]
            dur = end - start
            if dur >= max_dur:
                break

        dur = end - start
        if dur < min_dur:
            continue

        content = " ".join(texts).strip()
        if not content:
            continue

        # Quick heuristic score based on text signals
        base_score = _heuristic_score(content)

        windows.append({
            "id":    len(windows),
            "start": round(start, 2),
            "end":   round(end,   2),
            "dur":   round(dur,   1),
            "text":  content[:600],          # trim for AI context
            "base":  base_score,
        })

    # Deduplicate: remove windows that overlap > 70% with a higher-scoring one
    windows.sort(key=lambda w: w["base"], reverse=True)
    kept = []
    for w in windows:
        overlap = any(_overlap_pct(w, k) > 0.70 for k in kept)
        if not overlap:
            kept.append(w)
        if len(kept) >= 30:   # send max 30 candidates to AI
            break

    # Re-assign clean IDs
    for idx, w in enumerate(kept):
        w["id"] = idx

    return kept


def _overlap_pct(a: dict, b: dict) -> float:
    """Fraction of `a` that overlaps with `b`."""
    overlap = max(0, min(a["end"], b["end"]) - max(a["start"], b["start"]))
    return overlap / max((a["end"] - a["start"]), 1)


def _heuristic_score(text: str) -> float:
    """Simple rule-based score so fallback picks good clips without AI."""
    score = 5.0
    lower = text.lower()

    # Viral signals
    hooks = [
        "you won't believe", "nobody talks about", "secret", "never told",
        "mistake", "wrong", "truth", "stop", "warning", "shocking",
        "changed my life", "i quit", "i lost", "i made", "how i",
        "the real reason", "most people", "everyone is", "nobody knows",
        "don't do this", "do this instead", "3 things", "5 things",
        "no one talks", "they don't want you", "what happens if",
        "here's why", "this is why", "wait for it", "watch until",
    ]
    for h in hooks:
        if h in lower:
            score += 0.5

    # Numbers are engaging
    numbers = re.findall(r"\b\d+\b", text)
    score += min(len(numbers) * 0.2, 1.0)

    # Questions drive curiosity
    score += lower.count("?") * 0.3

    # Emotional words
    emotions = ["love", "hate", "fear", "angry", "sad", "happy", "amazing",
                "terrible", "incredible", "insane", "crazy", "wild", "unreal"]
    for e in emotions:
        if e in lower:
            score += 0.2

    # Short punchy text scores higher (Shorts viewers have short attention)
    words = len(text.split())
    if words < 80:
        score += 0.5
    elif words > 200:
        score -= 0.5

    return round(min(score, 10.0), 1)


# ─────────────────────────────────────────────────────────────
# AI ranking
# ─────────────────────────────────────────────────────────────

def _build_prompt(windows: list) -> str:
    clips_summary = []
    for w in windows:
        clips_summary.append({
            "id":    w["id"],
            "start": w["start"],
            "end":   w["end"],
            "dur":   w["dur"],
            "text":  w["text"],
        })

    return f"""You are an expert viral short-form video editor for TikTok, YouTube Shorts, and Instagram Reels.

Your job: pick the BEST 10 clips from the list below and give each a viral score.

VIRAL CRITERIA (judge honestly):
- Hook in first 3 seconds: does it grab attention immediately?
- Curiosity gap: does it make viewers NEED to watch more?
- Emotion: does it trigger strong feeling (laugh, shock, inspiration, fear)?
- Story arc: setup → conflict → payoff even in 30-60 seconds
- Value: teaches something useful or surprising
- Replay value: would people watch again?
- Strong ending: satisfying conclusion or cliffhanger

SCORING:
9.5-10 = viral gold, strong hook + emotion + story
8.5-9.4 = very strong, one element missing
7.0-8.4 = good content, average hook
<7.0 = weak, skip it

RULES:
- Return EXACTLY 10 clips (or all if fewer available)
- Prefer clips that START with a strong hook
- Avoid clips that start mid-sentence with no context
- Give different scores — don't give everyone 9.5

Return ONLY valid JSON, no explanation:
{{
  "clips": [
    {{
      "id": 0,
      "title": "short punchy title (max 8 words)",
      "hook": "one sentence: what makes this clip viral",
      "score": 9.2
    }}
  ]
}}

CANDIDATE CLIPS:
{json.dumps(clips_summary, ensure_ascii=False)}"""


# ─────────────────────────────────────────────────────────────
# Main entry point
# ─────────────────────────────────────────────────────────────

async def find_hooks(segments: list) -> list:
    print(f"[hook_detector] {len(segments)} segments → building windows")
    windows = build_windows(segments)
    print(f"[hook_detector] {len(windows)} candidate windows")

    if not windows:
        return []

    # ── AI ranking ────────────────────────────────────────────
    ai_selected = []
    try:
        answer = await ask_llm(_build_prompt(windows))
        result = parse_json(answer)
        ai_selected = result.get("clips", [])
        print(f"[hook_detector] AI returned {len(ai_selected)} clips")
    except Exception as e:
        print(f"[hook_detector] AI error: {e} — falling back to heuristic")

    # ── Map AI results back to windows ────────────────────────
    final = []
    used_ids = set()

    for clip in ai_selected:
        try:
            wid = int(clip["id"])
            if wid in used_ids or wid >= len(windows):
                continue
            used_ids.add(wid)
            source = windows[wid]
            score  = float(clip.get("score", 8.0))
            score  = max(1.0, min(10.0, score))   # clamp, never force to 9
            final.append({
                "title":      clip.get("title", "Viral Clip")[:80],
                "hook":       clip.get("hook",  "")[:200],
                "score":      score,
                "start_time": source["start"],
                "end_time":   source["end"],
            })
        except Exception:
            pass

    # ── Fallback: heuristic top clips ────────────────────────
    if len(final) < 5:
        print("[hook_detector] AI result insufficient — using heuristic fallback")
        heuristic_sorted = sorted(windows, key=lambda w: w["base"], reverse=True)
        for w in heuristic_sorted:
            if w["id"] in used_ids:
                continue
            used_ids.add(w["id"])
            final.append({
                "title":      _auto_title(w["text"]),
                "hook":       "Strong detected moment",
                "score":      w["base"],
                "start_time": w["start"],
                "end_time":   w["end"],
            })
            if len(final) >= 10:
                break

    final_sorted = sorted(final, key=lambda x: x["score"], reverse=True)[:10]
    print(f"[hook_detector] returning {len(final_sorted)} clips")
    return final_sorted


def _auto_title(text: str) -> str:
    """Generate a short title from the first few words of the clip text."""
    words = text.split()
    title = " ".join(words[:7])
    if len(words) > 7:
        title += "..."
    return title.capitalize()
