"use client";
import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { projects as projectsApi } from "@/lib/api";

/* ── Processing steps map ─────────────────────────────────── */
const STEPS = {
  downloading:  { label: "Downloading video…",        pct: 15 },
  transcribing: { label: "Transcribing audio…",       pct: 40 },
  analyzing:    { label: "Analyzing viral moments…",  pct: 65 },
  cutting:      { label: "Cutting clips…",             pct: 85 },
  complete:     { label: "Done!",                      pct: 100 },
};

/* ── Download hook ────────────────────────────────────────── */
function useDownload() {
  const [states, setStates] = useState({}); // { clipId: "idle"|"loading"|"done"|"error" }

  async function download(clip) {
    const id = clip.id || clip.download_url;
    setStates((s) => ({ ...s, [id]: "loading" }));

    try {
      const match = clip.download_url.match(/\/clips\/([\w-]+)\/([\w.-]+)$/);
      if (!match) throw new Error("URL inválida");
      const [, jobId, filename] = match;

      const res = await fetch(`/api/download?job=${jobId}&file=${filename}`);

      if (res.status === 404) {
        alert("❌ Clip no encontrado. Los archivos se borran al redeplegar el servidor — genera clips nuevos.");
        setStates((s) => ({ ...s, [id]: "error" }));
        return;
      }
      if (!res.ok) {
        alert(`❌ Error ${res.status} al descargar. Inténtalo de nuevo.`);
        setStates((s) => ({ ...s, [id]: "error" }));
        return;
      }

      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = Object.assign(document.createElement("a"), { href: url, download: filename });
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 300);
      setStates((s) => ({ ...s, [id]: "done" }));
      setTimeout(() => setStates((s) => ({ ...s, [id]: "idle" })), 2500);
    } catch (err) {
      alert("❌ " + err.message);
      setStates((s) => ({ ...s, [id]: "error" }));
    }
  }

  return { states, download };
}

/* ── Video preview modal ─────────────────────────────────── */
function VideoModal({ clip, onClose }) {
  const videoRef = useRef(null);
  const match = clip?.download_url?.match(/\/clips\/([\w-]+)\/([\w.-]+)$/);
  const src   = match ? `/api/download?job=${match[1]}&file=${match[2]}` : null;

  // Close on backdrop click or Escape
  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  if (!clip) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      {/* Panel — stop propagation so clicking inside doesn't close */}
      <div
        className="relative w-full max-w-sm flex flex-col items-center gap-3"
        onClick={e => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-zinc-400 hover:text-white text-sm font-semibold transition-colors"
        >
          ✕ Cerrar
        </button>

        {/* Video — 9:16 */}
        <div className="w-full aspect-[9/16] bg-black rounded-2xl overflow-hidden shadow-2xl">
          {src ? (
            <video
              ref={videoRef}
              src={src}
              controls
              autoPlay
              playsInline
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-zinc-500 text-sm">
              No se puede cargar el video
            </div>
          )}
        </div>

        {/* Title + score */}
        <div className="text-center">
          <p className="text-white font-semibold text-sm">{clip.title || `Viral Short`}</p>
          {clip.score && (
            <p className="text-zinc-400 text-xs mt-0.5">Viral Score: {clip.score.toFixed(1)}/10</p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Score color + label ──────────────────────────────────── */
function scoreInfo(score) {
  if (score >= 9)   return { color: "#22c55e", label: "🔥 Viral",    bar: "bg-green-500"  };
  if (score >= 7.5) return { color: "#f59e0b", label: "⚡ High",     bar: "bg-amber-500"  };
  if (score >= 6)   return { color: "#3b82f6", label: "👍 Good",     bar: "bg-blue-500"   };
  return                   { color: "#71717a", label: "· Normal",     bar: "bg-zinc-500"   };
}

/* ── Clip card ────────────────────────────────────────────── */
function ClipCard({ clip, index, onDownload, dlState, onPlay }) {
  const [imgErr, setImgErr] = useState(false);
  const dur  = clip.duration ? `${Math.round(clip.duration)}s` : "";
  const info = scoreInfo(clip.score ?? 0);
  const pct  = Math.round(((clip.score ?? 0) / 10) * 100);
  const loading = dlState === "loading";
  const done    = dlState === "done";

  return (
    <div className="flex flex-col bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-zinc-600 transition-all duration-200 group">

      {/* Thumbnail — 9:16 */}
      <div className="relative aspect-[9/16] bg-zinc-800 overflow-hidden">
        {!imgErr && clip.thumbnail_url ? (
          <img
            src={clip.thumbnail_url}
            alt={clip.title}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
            onError={() => setImgErr(true)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-zinc-800 to-zinc-900">
            <span className="text-4xl">🎬</span>
            <span className="text-zinc-600 text-xs font-medium">Short #{index + 1}</span>
          </div>
        )}

        {/* Play button overlay */}
        <button
          onClick={onPlay}
          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/30 z-10"
          aria-label="Preview clip"
        >
          <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/60 flex items-center justify-center shadow-xl hover:scale-110 transition-transform duration-150">
            <svg className="w-6 h-6 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
        </button>

        {/* Badges overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20 pointer-events-none" />

        {/* Score top-left */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1">
          <span className="text-[11px] font-bold" style={{ color: info.color }}>{info.label}</span>
        </div>

        {/* Duration top-right */}
        {dur && (
          <div className="absolute top-2.5 right-2.5 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1">
            <span className="text-[11px] text-white font-mono">{dur}</span>
          </div>
        )}

        {/* Short # bottom */}
        <div className="absolute bottom-2.5 left-2.5">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Short #{index + 1}</span>
        </div>
      </div>

      {/* Info block */}
      <div className="p-4 flex flex-col gap-3 flex-1">
        {/* Title */}
        <h3 className="text-sm font-semibold text-white leading-snug line-clamp-2 min-h-[2.5rem]">
          {clip.title || `Viral Short #${index + 1}`}
        </h3>

        {/* Score bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-500 font-medium">Viral Score</span>
            <span className="font-bold text-white">{clip.score?.toFixed(1) ?? "–"}<span className="text-zinc-600">/10</span></span>
          </div>
          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${info.bar}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Hook */}
        {clip.hook && (
          <p className="text-xs text-zinc-500 leading-relaxed line-clamp-2">{clip.hook}</p>
        )}

        {/* Buttons */}
        <div className="mt-auto flex flex-col gap-2 pt-1">
          {/* Download */}
          <button
            onClick={() => onDownload(clip)}
            disabled={loading}
            className={`w-full flex items-center justify-center gap-2 text-sm font-bold py-2.5 rounded-xl transition-all duration-200 ${
              done
                ? "bg-green-500/20 border border-green-500/40 text-green-400"
                : loading
                ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                : "bg-teal-500 hover:bg-teal-400 active:scale-[0.98] text-black shadow-lg shadow-teal-900/30"
            }`}
          >
            {loading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
                Descargando…
              </>
            ) : done ? (
              <>✓ Descargado</>
            ) : (
              <>
                <DownloadIcon />
                Download MP4
              </>
            )}
          </button>

          {/* Open in editor */}
          <Link
            href={`/editor/${clip.project_id || ""}`}
            className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-xl border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors"
          >
            <EditIcon /> Open in editor
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ── Processing overlay ───────────────────────────────────── */
function ProcessingView({ jobStatus, projectTitle }) {
  const step = jobStatus?.step;
  const info = STEPS[step] || { label: "Processing…", pct: 5 };
  const pct  = jobStatus?.progress ?? info.pct;

  return (
    <div className="flex-1 flex flex-col items-center justify-center py-24 px-4">
      <div className="w-full max-w-md text-center space-y-8">

        {/* Animated icon */}
        <div className="relative mx-auto w-24 h-24">
          <div className="absolute inset-0 rounded-full border-4 border-teal-500/20" />
          <div className="absolute inset-0 rounded-full border-4 border-t-teal-500 animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center text-3xl">🤖</div>
        </div>

        <div className="space-y-3">
          <h2 className="text-xl font-black text-white">AI is analyzing your video</h2>
          <p className="text-zinc-400 text-sm">{info.label}</p>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-teal-500 to-cyan-400 rounded-full transition-all duration-700"
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>{info.label}</span>
            <span className="font-mono font-bold text-teal-400">{pct}%</span>
          </div>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-4 gap-2">
          {Object.entries(STEPS).filter(([k]) => k !== "complete").map(([key, val]) => {
            const done    = pct >= val.pct;
            const current = step === key;
            return (
              <div key={key} className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all ${
                current ? "bg-teal-950/60 border border-teal-700/40" :
                done    ? "opacity-40" : "opacity-20"
              }`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  done ? "bg-teal-500 text-black" : "bg-zinc-800 text-zinc-500"
                }`}>
                  {done && !current ? "✓" : val.pct / 20}
                </div>
                <span className="text-[9px] text-zinc-400 text-center leading-tight capitalize">{key}</span>
              </div>
            );
          })}
        </div>

        <p className="text-zinc-600 text-xs">This usually takes 1–3 minutes depending on video length</p>
      </div>
    </div>
  );
}

/* ── Main page ────────────────────────────────────────────── */
export default function ClipsPage() {
  const { id }    = useParams();
  const router    = useRouter();

  const [project,     setProject]     = useState(null);
  const [clips,       setClips]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [jobStatus,   setJobStatus]   = useState(null);
  const [jobError,    setJobError]    = useState(null);
  const [previewClip, setPreviewClip] = useState(null);
  const pollRef = useRef(null);

  const { states: dlStates, download } = useDownload();

  useEffect(() => {
    loadProject();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [id]);

  async function loadProject() {
    try {
      const p = await projectsApi.get(id);
      setProject(p);
      setClips(p.clips || []);
      if (p.status === "processing") {
        startPolling();
      } else if (p.status === "error") {
        // Fetch job to get the actual error message
        try {
          const jobs = await projectsApi.jobs(id);
          const latest = jobs[0];
          if (latest?.error) setJobError(parseYouTubeError(latest.error));
        } catch {}
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function parseYouTubeError(raw) {
    if (!raw) return null;
    if (/Sign in to confirm you're not a bot|confirm.*bot/i.test(raw))
      return "YouTube bloqueó la descarga porque el servidor está en un datacenter. Prueba con un video diferente o usa 'Subir video' en vez de URL.";
    if (/age.?restrict|sign in to confirm your age/i.test(raw))
      return "Este video tiene restricción de edad y no se puede descargar. Prueba con un video público.";
    if (/private video|video unavailable/i.test(raw))
      return "Este video es privado o no está disponible.";
    if (/copyright|has been blocked/i.test(raw))
      return "Este video fue bloqueado por copyright.";
    if (/geo.?restrict|not available in your country/i.test(raw))
      return "Este video no está disponible en la región del servidor.";
    // Generic: take last meaningful line
    const lines = raw.split("\n").map(l => l.trim()).filter(l => l.startsWith("ERROR:") || l.startsWith("WARNING:"));
    const last = lines[lines.length - 1];
    return last ? last.replace(/^ERROR:\s*/i, "") : "Error desconocido al procesar el video.";
  }

  function startPolling() {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const jobs   = await projectsApi.jobs(id);
        const latest = jobs[0];
        if (!latest) return;
        setJobStatus({ step: latest.step, progress: latest.progress, status: latest.status });

        if (latest.status === "done" || latest.status === "error") {
          clearInterval(pollRef.current);
          if (latest.status === "error" && latest.error) {
            setJobError(parseYouTubeError(latest.error));
          }
          const p = await projectsApi.get(id);
          setProject(p);
          setClips(p.clips || []);
        }
      } catch { clearInterval(pollRef.current); }
    }, 2500);
  }

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-teal-500 border-t-transparent animate-spin" />
          <span className="text-zinc-500 text-sm">Loading…</span>
        </div>
      </div>
    );
  }

  const isProcessing = project?.status === "processing";
  const hasClips     = clips.length > 0;

  return (
    <div className="min-h-screen bg-black text-white">

      {/* ── Subtle grid bg ─────────────────────────────── */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(13,148,136,0.02)_1px,transparent_1px),linear-gradient(to_right,rgba(13,148,136,0.02)_1px,transparent_1px)] bg-[size:60px_60px] pointer-events-none" />

      {/* ── Nav ────────────────────────────────────────── */}
      <nav className="sticky top-0 z-20 border-b border-zinc-900 bg-black/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-5 py-3.5">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center font-black text-sm shadow-md shadow-teal-900/50">M</div>
            <span className="font-black text-lg bg-gradient-to-r from-teal-300 to-cyan-300 bg-clip-text text-transparent">MontageAI</span>
          </Link>

          {/* Center — project title */}
          {project && (
            <div className="hidden sm:flex items-center gap-2 text-sm text-zinc-500">
              <span className="text-zinc-700">📁</span>
              <span className="font-medium text-zinc-300 truncate max-w-[200px]">{project.title}</span>
              {isProcessing && (
                <span className="flex items-center gap-1 text-xs text-teal-400 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                  Processing
                </span>
              )}
              {!isProcessing && hasClips && (
                <span className="text-xs bg-green-500/15 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full font-semibold">
                  ✓ {clips.length} clips ready
                </span>
              )}
            </div>
          )}

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <Link href="/dashboard" className="text-xs text-zinc-500 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-zinc-900">
              ← Dashboard
            </Link>
            {hasClips && (
              <Link href={`/editor/${id}`} className="flex items-center gap-1.5 text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 px-3 py-1.5 rounded-lg transition-colors">
                <EditIcon /> Editor →
              </Link>
            )}
          </div>
        </div>
      </nav>

      <div className="relative z-10 max-w-7xl mx-auto px-5 py-8">

        {/* ── Processing state ───────────────────────── */}
        {isProcessing && <ProcessingView jobStatus={jobStatus} projectTitle={project?.title} />}

        {/* ── Error state ────────────────────────────── */}
        {project?.status === "error" && (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
            <div className="text-5xl">⚠️</div>
            <h2 className="text-xl font-black text-red-400">Processing failed</h2>
            <p className="text-zinc-500 text-sm max-w-sm">
              {jobError || "Hubo un error procesando tu video."}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Link href="/dashboard" className="text-sm font-semibold text-teal-400 hover:text-teal-300 transition-colors px-4 py-2 rounded-xl border border-teal-800 hover:border-teal-600">
                ← Volver al dashboard
              </Link>
              <Link href="/dashboard" className="text-sm font-semibold bg-teal-500 hover:bg-teal-400 text-black px-4 py-2 rounded-xl transition-colors">
                + Nuevo proyecto
              </Link>
            </div>
          </div>
        )}

        {/* ── Clips ready ────────────────────────────── */}
        {!isProcessing && hasClips && (
          <>
            {/* Page header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
              <div>
                <p className="text-teal-400 text-xs font-semibold tracking-widest uppercase mb-1">AI Clips</p>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{clips.length} Viral Shorts ready</h1>
                <p className="text-zinc-500 text-sm mt-1">{project?.title}</p>
              </div>

              {/* Download all */}
              <DownloadAllButton clips={clips} />
            </div>

            {/* Clips grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {clips.map((clip, i) => (
                <ClipCard
                  key={clip.id}
                  clip={{ ...clip, project_id: id }}
                  index={i}
                  onDownload={download}
                  dlState={dlStates[clip.id || clip.download_url] || "idle"}
                  onPlay={() => setPreviewClip({ ...clip, project_id: id })}
                />
              ))}
            </div>

            {/* Bottom CTA */}
            <div className="mt-12 text-center">
              <div className="inline-flex flex-col sm:flex-row items-center gap-3 bg-zinc-900/80 border border-zinc-800 rounded-2xl px-6 py-4">
                <span className="text-sm text-zinc-400">Want more control? Use the full editor</span>
                <Link
                  href={`/editor/${id}`}
                  className="flex items-center gap-1.5 text-sm font-bold bg-teal-500 hover:bg-teal-400 text-black px-5 py-2 rounded-xl transition-colors"
                >
                  <EditIcon /> Open Editor →
                </Link>
              </div>
            </div>
          </>
        )}

        {/* ── Empty (done but no clips) ──────────────── */}
        {!isProcessing && !hasClips && project?.status !== "error" && (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
            <div className="text-5xl">🎬</div>
            <h2 className="text-xl font-black">No clips found</h2>
            <p className="text-zinc-500 text-sm max-w-sm">The AI couldn't find viral moments in this video, or processing hasn't started yet.</p>
            <Link href="/dashboard" className="text-sm font-semibold text-teal-400 hover:text-teal-300 transition-colors">
              ← Try another video
            </Link>
          </div>
        )}
      </div>

      {/* ── Video preview modal ──────────────────────── */}
      {previewClip && (
        <VideoModal clip={previewClip} onClose={() => setPreviewClip(null)} />
      )}
    </div>
  );
}

/* ── Download All ─────────────────────────────────────────── */
function DownloadAllButton({ clips }) {
  const [downloading, setDownloading] = useState(false);

  async function downloadAll() {
    if (downloading) return;
    setDownloading(true);
    for (const clip of clips) {
      try {
        const match = clip.download_url?.match(/\/clips\/([\w-]+)\/([\w.-]+)$/);
        if (!match) continue;
        const [, jobId, filename] = match;
        const res  = await fetch(`/api/download?job=${jobId}&file=${filename}`);
        if (!res.ok) continue;
        const blob = await res.blob();
        const url  = URL.createObjectURL(blob);
        const a    = Object.assign(document.createElement("a"), { href: url, download: filename });
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 300);
        // Small delay between downloads
        await new Promise((r) => setTimeout(r, 500));
      } catch { /* continue */ }
    }
    setDownloading(false);
  }

  return (
    <button
      onClick={downloadAll}
      disabled={downloading}
      className="flex items-center gap-2 text-sm font-bold bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white px-5 py-2.5 rounded-xl transition-colors disabled:opacity-50 shrink-0"
    >
      {downloading ? (
        <>
          <span className="w-3.5 h-3.5 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
          Downloading all…
        </>
      ) : (
        <>
          <DownloadIcon />
          Download All
        </>
      )}
    </button>
  );
}

/* ── Icons ────────────────────────────────────────────────── */
function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  );
}

function EditIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  );
}
