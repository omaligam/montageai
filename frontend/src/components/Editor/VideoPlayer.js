"use client";
import { useRef, useEffect } from "react";
import { useEditorStore } from "@/store/editorStore";

export default function VideoPlayer() {
  const videoRef  = useRef(null);
  const rafRef    = useRef(null);
  const loadedRef = useRef(null); // id del clip actualmente cargado en <video>

  const {
    currentTime, playing, duration, tracks,
    showSubtitles, toggleSubtitles,
    setCurrentTime, setPlaying,
  } = useEditorStore();

  const videoTrack = tracks.find((t) => t.type === "video");
  const items      = videoTrack?.items ?? [];

  function getActiveItem(t) {
    return items.find((i) => i.trackStart <= t && i.trackEnd > t) ?? null;
  }

  const activeItem = getActiveItem(currentTime);
  const hasClips   = items.length > 0;

  // ── Cargar clip cuando cambia ──────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!activeItem) {
      video.pause();
      return;
    }

    // Solo cambiar src si es un clip diferente
    if (loadedRef.current === activeItem.id) return;
    loadedRef.current = activeItem.id;

    const url = activeItem.downloadUrl || "";
    video.src = url;
    video.load();

    const onCanPlay = () => {
      video.currentTime = 0;  // siempre desde el inicio del clip
      if (useEditorStore.getState().playing) {
        video.play().catch(() => {});
      }
    };
    video.addEventListener("canplay", onCanPlay, { once: true });

  }, [activeItem?.id]); // solo cuando cambia el clip, no en cada frame

  // ── Play / Pause ──────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (playing) {
      // Si el clip está cargado, reproducir directamente
      if (video.readyState >= 3) {
        video.play().catch(() => {});
      }
      // Si aún no está cargado, el canplay listener lo hará
    } else {
      video.pause();
    }
  }, [playing]);

  // ── RAF: actualizar currentTime del store ─────────────────
  useEffect(() => {
    if (!playing) {
      cancelAnimationFrame(rafRef.current);
      return;
    }

    function tick() {
      const video = videoRef.current;
      if (!video) return;

      const state = useEditorStore.getState();
      if (!state.playing) return;

      // Leer tracks frescos del store (no del closure)
      const vTrack    = state.tracks.find((t) => t.type === "video");
      const allItems  = vTrack?.items ?? [];
      const ct        = state.currentTime;
      const dur       = state.duration;
      const item      = allItems.find((i) => i.trackStart <= ct && i.trackEnd > ct);

      if (!item) {
        // Fin del timeline
        setPlaying(false);
        return;
      }

      const trackTime = item.trackStart + video.currentTime;

      if (trackTime >= (dur || 0)) {
        setPlaying(false);
        setCurrentTime(dur || 0);
        return;
      }

      setCurrentTime(trackTime);
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing]);

  // ── Cuando el video termina, pasar al siguiente clip ──────
  function handleEnded() {
    const { currentTime: ct, tracks: t } = useEditorStore.getState();
    const allItems = t.find((tr) => tr.type === "video")?.items ?? [];
    const next = allItems.find((i) => i.trackStart > ct);
    if (next) {
      setCurrentTime(next.trackStart);
      loadedRef.current = null; // forzar recarga
    } else {
      setPlaying(false);
    }
  }

  // ── Seek bar ──────────────────────────────────────────────
  function handleSeek(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const t    = pct * (duration || 0);
    setCurrentTime(t);
    setPlaying(false);
    loadedRef.current = null; // forzar recarga del clip correcto
    const video = videoRef.current;
    const item  = items.find((i) => i.trackStart <= t && i.trackEnd > t);
    if (video && item) {
      video.src = item.downloadUrl || "";
      video.load();
      loadedRef.current = item.id;
      video.addEventListener("canplay", () => {
        video.currentTime = t - item.trackStart;
      }, { once: true });
    }
  }

  function togglePlay() {
    if (!hasClips) return;
    setPlaying(!playing);
  }

  function goToStart() {
    setPlaying(false);
    setCurrentTime(0);
    loadedRef.current = null;
    const video = videoRef.current;
    const first = items[0];
    if (video && first) {
      video.src = first.downloadUrl || "";
      video.load();
      loadedRef.current = first.id;
    }
  }

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Overlays de texto activos (solo si subtítulos están activos)
  const allTextItems = tracks
    .filter((t) => t.type === "text")
    .flatMap((t) => t.items)
    .filter((i) => i.trackStart <= currentTime && i.trackEnd > currentTime);
  const textItems = showSubtitles ? allTextItems : [];
  const hasSubtitleItems = tracks.filter((t) => t.type === "text").some((t) => t.items.length > 0);

  return (
    <div className="flex flex-col h-full bg-zinc-950 select-none">
      {/* ── Video area ─────────────────────────────────────── */}
      <div
        className="flex-1 flex items-center justify-center bg-black relative overflow-hidden cursor-pointer"
        onClick={togglePlay}
      >
        {hasClips ? (
          <video
            ref={videoRef}
            className="max-h-full max-w-full"
            style={{ aspectRatio: "9/16", maxHeight: "100%", objectFit: "contain" }}
            onEnded={handleEnded}
            playsInline
          />
        ) : (
          <div className="text-zinc-600 flex flex-col items-center gap-3 pointer-events-none">
            <span className="text-5xl">🎬</span>
            <span className="text-sm">Arrastra un clip al timeline para previsualizar</span>
          </div>
        )}

        {/* Botón Play central */}
        {hasClips && !playing && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-16 h-16 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 flex items-center justify-center">
              <span className="text-white text-2xl ml-1">▶</span>
            </div>
          </div>
        )}

        {/* Overlays de texto */}
        {textItems.map((item) => (
          <div
            key={item.id}
            className="absolute left-0 right-0 flex justify-center pointer-events-none"
            style={{ bottom: "12%" }}
          >
            <span style={{
              fontSize:   `${item.fontSize || 48}px`,
              color:      item.color || "#ffffff",
              textShadow: "2px 2px 8px rgba(0,0,0,0.9)",
              fontWeight: "bold",
              padding:    "0 16px",
              textAlign:  "center",
              maxWidth:   "90%",
              display:    "block",
            }}>
              {item.text}
            </span>
          </div>
        ))}

        {/* Tiempo */}
        {hasClips && (
          <div className="absolute bottom-2 right-2 bg-black/60 text-white/70 text-[10px] font-mono px-1.5 py-0.5 rounded pointer-events-none">
            {_fmt(currentTime)}
          </div>
        )}
      </div>

      {/* ── Controles ──────────────────────────────────────── */}
      <div className="px-4 pt-2.5 pb-3 border-t border-zinc-800">
        {/* Seek bar */}
        <div
          className="h-1.5 bg-zinc-700 rounded-full mb-3 cursor-pointer relative group"
          onClick={handleSeek}
        >
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full pointer-events-none"
            style={{ width: `${pct}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none"
            style={{ left: `calc(${pct}% - 6px)` }}
          />
          {duration > 0 && items.map((item) => (
            <div
              key={item.id}
              className="absolute top-0 h-full bg-violet-500/30 pointer-events-none"
              style={{
                left:  `${(item.trackStart / duration) * 100}%`,
                width: `${((item.trackEnd - item.trackStart) / duration) * 100}%`,
              }}
            />
          ))}
        </div>

        {/* Botones */}
        <div className="flex items-center gap-3">
          <button onClick={goToStart} className="text-zinc-400 hover:text-white text-sm" title="Inicio">⏮</button>
          <button
            onClick={togglePlay}
            disabled={!hasClips}
            className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center font-bold text-sm hover:bg-zinc-200 disabled:opacity-40"
          >
            {playing ? "⏸" : "▶"}
          </button>
          <button
            onClick={() => { setCurrentTime(duration); setPlaying(false); }}
            className="text-zinc-400 hover:text-white text-sm"
          >⏭</button>

          {/* CC — toggle subtítulos */}
          <button
            onClick={toggleSubtitles}
            title={hasSubtitleItems ? (showSubtitles ? "Ocultar subtítulos" : "Mostrar subtítulos") : "Genera subtítulos en la pestaña IA →"}
            className={`ml-1 px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
              showSubtitles
                ? "border-violet-500 bg-violet-900/50 text-violet-300"
                : hasSubtitleItems
                ? "border-zinc-600 text-zinc-400 hover:border-zinc-400"
                : "border-zinc-800 text-zinc-600 cursor-default"
            }`}
          >
            CC
          </button>

          <span className="text-zinc-500 text-xs ml-auto font-mono">
            {_fmt(currentTime)} / {_fmt(duration)}
          </span>
        </div>
      </div>
    </div>
  );
}

function _fmt(s) {
  const m   = Math.floor((s || 0) / 60);
  const sec = Math.floor((s || 0) % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}
