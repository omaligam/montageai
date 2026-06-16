"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { projects as projectsApi, ai, pollJob } from "@/lib/api";
import { useEditorStore } from "@/store/editorStore";
import VideoPlayer     from "@/components/Editor/VideoPlayer";
import Timeline        from "@/components/Editor/Timeline";
import PropertiesPanel from "@/components/Editor/PropertiesPanel";
import Toolbar         from "@/components/Editor/Toolbar";
import AIToolsSidebar  from "@/components/AI/AIToolsSidebar";
import TemplateGallery from "@/components/Templates/TemplateGallery";

const SIDE_TABS = [
  { id: "clips",     icon: "🎬", label: "Clips" },
  { id: "ai",        icon: "🤖", label: "IA" },
  { id: "templates", icon: "🎨", label: "Templates" },
  { id: "props",     icon: "⚙️", label: "Props" },
];

export default function EditorPage() {
  const params   = useParams();
  const router   = useRouter();
  const id       = params.id;

  const {
    setProject, setClips, clips, addClipToTrack, tracks, selectedItemId,
    getSelectedItem, reset, undo, redo, canUndo, canRedo, setTracks
  } = useEditorStore();

  const [project, setLocalProject]  = useState(null);
  const [loading, setLoading]       = useState(true);
  const [sideTab, setSideTab]       = useState("clips");
  const [jobStatus, setJobStatus]   = useState(null);
  const [exportModal, setExportModal] = useState(false);
  const [exportOptions, setExportOptions] = useState({ format: "mp4", quality: "high", aspect: "9:16", burn_subtitles: false });
  const [exportJobId, setExportJobId] = useState(null);
  const [exporting, setExporting]   = useState(false);
  const [saveStatus, setSaveStatus] = useState("saved"); // "saved" | "saving" | "unsaved"
  // Flag para ignorar el primer cambio de tracks al restaurar desde DB
  const isRestoringRef = useRef(false);

  // ── Load project ────────────────────────────────────────────
  useEffect(() => {
    loadProject();
    return () => reset();
  }, [id]);

  // ── Keyboard shortcuts: Ctrl+Z / Ctrl+Shift+Z ───────────────
  useEffect(() => {
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) { redo(); } else { undo(); }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        e.preventDefault();
        redo();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  // ── Marcar unsaved cuando tracks cambia por acción del usuario ─
  useEffect(() => {
    if (isRestoringRef.current) {
      // Este cambio viene de setTracks (restore desde DB) — ignorar
      isRestoringRef.current = false;
      return;
    }
    setSaveStatus("unsaved");
  }, [tracks]);

  // ── Autosave cada 30s ────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    const timer = setInterval(async () => {
      if (saveStatus === "unsaved") {
        setSaveStatus("saving");
        try {
          const { tracks: t, duration: d } = useEditorStore.getState();
          await projectsApi.update(id, { edit_data: { tracks: t, duration: d } });
          setSaveStatus("saved");
        } catch {
          setSaveStatus("unsaved");
        }
      }
    }, 30_000);
    return () => clearInterval(timer);
  }, [id, saveStatus]);

  async function loadProject() {
    try {
      const p = await projectsApi.get(id);
      setLocalProject(p);
      setProject(p);
      setClips(p.clips || []);

      // ── Restaurar o reconstruir timeline ────────────────────
      const savedTracks = p.edit_data?.tracks;
      const savedDur    = p.edit_data?.duration;
      const hasItems    = savedTracks?.some((t) => t.items?.length > 0);

      // Detectar datos corruptos: el primer clip de video no empieza en 0
      // (ocurre cuando auto-add se ejecutó múltiples veces sin reset)
      const firstVideoItem = savedTracks?.find((t) => t.type === "video")?.items?.[0];
      const dataCorrupted  = hasItems && firstVideoItem && firstVideoItem.trackStart > 0.5;

      if (hasItems && !dataCorrupted) {
        // Datos limpios: restaurar desde DB
        isRestoringRef.current = true;
        setTracks(savedTracks, savedDur);
        setSaveStatus("saved");
      } else {
        // Sin datos o datos corruptos: reconstruir desde clips
        if (p.clips?.length > 0) {
          const freshTracks  = useEditorStore.getState().tracks;
          const storeHasItems = freshTracks.some((t) => t.items?.length > 0);
          if (!storeHasItems) {
            const videoTrackId = freshTracks.find((t) => t.type === "video")?.id;
            if (videoTrackId) {
              p.clips.forEach((clip) => addClipToTrack(clip, videoTrackId));
              // Guardar inmediatamente para reparar los datos corruptos
              setTimeout(() => {
                const { tracks: t, duration: d } = useEditorStore.getState();
                projectsApi.update(id, { edit_data: { tracks: t, duration: d } }).catch(() => {});
              }, 500);
            }
          }
        }
      }

      if (p.status === "processing") {
        pollProcessing();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function pollProcessing() {
    setJobStatus({ step: "downloading", progress: 0 });
    const interval = setInterval(async () => {
      try {
        const jobs = await projectsApi.jobs(id);
        const latest = jobs[0];
        if (!latest) return;
        setJobStatus({ step: latest.step, progress: latest.progress, status: latest.status });
        if (latest.status === "done") {
          clearInterval(interval);
          loadProject();  // loadProject ya auto-agrega los clips al timeline
        }
        if (latest.status === "error") {
          clearInterval(interval);
          loadProject();
        }
      } catch (e) {
        clearInterval(interval);
      }
    }, 3000);
  }

  // ── Drop clip to timeline ───────────────────────────────────
  function handleDropClip(clip, trackId) {
    addClipToTrack(clip, trackId);
  }

  // ── Reset timeline y agregar todos los clips de nuevo ──────
  function handleAddAllToTimeline() {
    const { reset: resetStore } = useEditorStore.getState();
    resetStore();
    // Esperar al siguiente tick para que el reset se aplique
    setTimeout(() => {
      const freshTracks = useEditorStore.getState().tracks;
      const videoTrack  = freshTracks.find((t) => t.type === "video");
      if (!videoTrack) return;
      clips.forEach((clip) => addClipToTrack(clip, videoTrack.id));
    }, 50);
  }

  // ── Save edit data ──────────────────────────────────────────
  async function handleSave() {
    const { tracks: t, duration: d } = useEditorStore.getState();
    await projectsApi.update(id, {
      edit_data: { tracks: t, duration: d }
    });
  }

  // ── Export ──────────────────────────────────────────────────
  async function handleExport() {
    setExporting(true);
    try {
      // Guardar antes de exportar
      const { tracks: t, duration: d } = useEditorStore.getState();
      await projectsApi.update(id, { edit_data: { tracks: t, duration: d } });
      setSaveStatus("saved");

      const { job_id } = await ai.export({
        project_id: id,
        ...exportOptions,
        edit_data: { tracks: t, duration: d },
      });
      setExportJobId(job_id);
      const job = await pollJob(id, job_id, (j) => setJobStatus(j), 3000);
      if (job.result?.download_url) {
        window.open(job.result.download_url, "_blank");
      }
    } catch (e) {
      alert("Error al exportar: " + e.message);
    } finally {
      setExporting(false);
      setExportModal(false);
    }
  }

  // ── Apply template ──────────────────────────────────────────
  async function handleApplyTemplate(template) {
    const selected = getSelectedItem();
    if (!selected) return;
    // Apply subtitle generation with template style
    try {
      const { job_id } = await ai.subtitles({
        project_id: id,
        clip_id:    selected.clipId,
        style:      template.config?.subtitle_style || "bold",
      });
      await pollJob(id, job_id, () => {}, 3000);
      await loadProject();
    } catch (e) {
      console.error(e);
    }
  }

  // ── Processing overlay ──────────────────────────────────────
  if (loading) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-zinc-400">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Cargando proyecto...</span>
        </div>
      </div>
    );
  }

  const processingSteps = {
    downloading:  { label: "Descargando video...",    pct: 15 },
    transcribing: { label: "Transcribiendo audio...", pct: 40 },
    analyzing:    { label: "Analizando con IA...",    pct: 65 },
    cutting:      { label: "Cortando clips...",       pct: 85 },
    complete:     { label: "Listo",                   pct: 100 },
  };

  return (
    <div className="h-screen bg-black flex flex-col overflow-hidden">
      {/* Toolbar */}
      <Toolbar
        projectId={id}
        clips={clips}
        onExport={() => setExportModal(true)}
        onShowTemplates={() => setSideTab("templates")}
        onShowAI={() => setSideTab("ai")}
        saveStatus={saveStatus}
      />

      {/* Processing banner */}
      {project?.status === "processing" && jobStatus && (
        <div className="bg-violet-950/80 border-b border-violet-800 px-4 py-2 flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin shrink-0" />
          <div className="flex-1">
            <div className="text-xs text-violet-300 font-medium">
              {processingSteps[jobStatus.step]?.label || "Procesando..."}
            </div>
            <div className="h-1 bg-violet-900 rounded-full mt-1 overflow-hidden">
              <div
                className="h-full bg-violet-400 rounded-full transition-all duration-500"
                style={{ width: `${jobStatus.progress || 0}%` }}
              />
            </div>
          </div>
          <span className="text-xs text-violet-400">{jobStatus.progress || 0}%</span>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar — clips/media panel */}
        <div className="w-56 bg-zinc-950 border-r border-zinc-800 flex flex-col overflow-hidden shrink-0">
          {/* Side tabs */}
          <div className="flex border-b border-zinc-800">
            {SIDE_TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setSideTab(t.id)}
                className={`flex-1 py-2.5 flex flex-col items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider transition-colors ${
                  sideTab === t.id
                    ? "text-violet-400 border-b-2 border-violet-500"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <span className="text-base">{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          {/* Panel content */}
          <div className="flex-1 overflow-hidden">
            {sideTab === "clips" && (
              <ClipsPanel
                clips={clips}
                tracks={tracks}
                onAddAll={handleAddAllToTimeline}
                onAddClip={(clip) => addClipToTrack(clip, tracks.find((t) => t.type === "video")?.id)}
              />
            )}
            {sideTab === "ai" && (
              <AIToolsSidebar
                projectId={id}
                selectedClipId={getSelectedItem()?.clipId}
                onJobStarted={loadProject}
              />
            )}
            {sideTab === "templates" && (
              <TemplateGallery
                onApply={handleApplyTemplate}
                selectedClipId={getSelectedItem()?.clipId}
              />
            )}
            {sideTab === "props" && <PropertiesPanel />}
          </div>
        </div>

        {/* Center — Video player */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-hidden">
            <VideoPlayer />
          </div>

          {/* Timeline */}
          <div className="h-56 shrink-0">
            <Timeline onDropClip={handleDropClip} />
          </div>
        </div>

        {/* Right sidebar — properties (only on lg+) */}
        <div className="w-52 bg-zinc-950 border-l border-zinc-800 hidden lg:flex flex-col overflow-hidden shrink-0">
          <PropertiesPanel />
        </div>
      </div>

      {/* Export Modal */}
      {exportModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-sm">
            <h2 className="font-black text-xl mb-6">Exportar video</h2>

            <div className="space-y-4 mb-6">
              <div>
                <label className="text-xs text-zinc-400 font-semibold block mb-2">Formato</label>
                <div className="flex gap-2">
                  {["mp4", "webm"].map((f) => (
                    <button key={f} onClick={() => setExportOptions((o) => ({ ...o, format: f }))}
                      className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                        exportOptions.format === f ? "border-violet-500 bg-violet-900/40 text-violet-300" : "border-zinc-700 text-zinc-400"
                      }`}>{f.toUpperCase()}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-zinc-400 font-semibold block mb-2">Calidad</label>
                <div className="flex gap-2">
                  {["low", "medium", "high"].map((q) => (
                    <button key={q} onClick={() => setExportOptions((o) => ({ ...o, quality: q }))}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold border capitalize transition-colors ${
                        exportOptions.quality === q ? "border-violet-500 bg-violet-900/40 text-violet-300" : "border-zinc-700 text-zinc-400"
                      }`}>{q}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-zinc-400 font-semibold block mb-2">Resolución</label>
                <div className="flex gap-2">
                  {[
                    { value: "9:16",  label: "1080",  sub: "1080×1920" },
                    { value: "16:9",  label: "1080p", sub: "1920×1080" },
                    { value: "1:1",   label: "1080²", sub: "1080×1080" },
                  ].map((a) => (
                    <button key={a.value} onClick={() => setExportOptions((o) => ({ ...o, aspect: a.value }))}
                      className={`flex-1 py-2 rounded-lg border transition-colors flex flex-col items-center gap-0.5 ${
                        exportOptions.aspect === a.value ? "border-violet-500 bg-violet-900/40 text-violet-300" : "border-zinc-700 text-zinc-400"
                      }`}>
                      <span className="text-xs font-bold">{a.label}</span>
                      <span className="text-[9px] opacity-60">{a.sub}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Subtítulos */}
            <div className="border border-zinc-800 rounded-xl p-4 mb-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={exportOptions.burn_subtitles}
                    onChange={(e) => setExportOptions((o) => ({ ...o, burn_subtitles: e.target.checked }))}
                  />
                  <div className={`w-9 h-5 rounded-full transition-colors ${exportOptions.burn_subtitles ? "bg-violet-600" : "bg-zinc-700"}`} />
                  <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${exportOptions.burn_subtitles ? "translate-x-4" : ""}`} />
                </div>
                <div>
                  <div className="text-sm font-semibold">Quemar subtítulos</div>
                  <div className="text-xs text-zinc-500">Incrustar texto en el video final</div>
                </div>
              </label>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setExportModal(false)}
                className="flex-1 py-3 rounded-xl border border-zinc-700 text-sm text-zinc-400 hover:text-white transition-colors">
                Cancelar
              </button>
              <button onClick={handleExport} disabled={exporting}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                {exporting ? (
                  <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Exportando...</>
                ) : "⬇ Exportar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Clips Panel ─────────────────────────────────────────────────────────────
function ClipsPanel({ clips, tracks, onAddAll, onAddClip }) {
  if (!clips || clips.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-4 text-center text-zinc-600">
        <span className="text-4xl mb-2">⏳</span>
        <span className="text-xs">Los clips aparecerán aquí cuando la IA termine de procesarlos.</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-zinc-800 flex items-center justify-between">
        <span className="text-xs text-zinc-400">{clips.length} clips</span>
        <button
          onClick={onAddAll}
          title="Limpia el timeline y agrega todos los clips desde cero"
          className="text-[10px] text-violet-400 hover:text-violet-300 font-semibold transition-colors"
        >
          ↺ Reiniciar timeline
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {clips.map((clip) => (
          <div
            key={clip.id}
            className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden cursor-pointer hover:border-zinc-600 transition-colors group"
            draggable
            onDragStart={(e) => e.dataTransfer.setData("clip", JSON.stringify(clip))}
          >
            {/* Thumbnail */}
            <div className="aspect-video bg-zinc-800 relative overflow-hidden">
              {clip.thumbnail_url ? (
                <img src={clip.thumbnail_url} alt={clip.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-600 text-2xl">🎬</div>
              )}
              <div className="absolute top-1 right-1 bg-black/60 text-[9px] text-zinc-300 px-1.5 py-0.5 rounded font-mono">
                {clip.duration ? `${Math.round(clip.duration)}s` : ""}
              </div>
              {/* Score */}
              <div className="absolute top-1 left-1 bg-black/60 text-[9px] text-green-400 px-1.5 py-0.5 rounded font-bold">
                ★ {clip.score?.toFixed(1)}
              </div>
            </div>

            <div className="p-2">
              <p className="text-xs font-semibold leading-snug line-clamp-1 mb-1">{clip.title}</p>
              <button
                onClick={() => onAddClip(clip)}
                className="w-full text-[10px] bg-zinc-800 hover:bg-violet-700 text-zinc-300 hover:text-white py-1.5 rounded-lg transition-colors font-semibold"
              >
                + Al timeline
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
