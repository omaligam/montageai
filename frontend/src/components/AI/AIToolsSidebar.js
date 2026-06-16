"use client";
import { useState } from "react";
import { ai, pollJob } from "@/lib/api";
import { useEditorStore } from "@/store/editorStore";

const SUBTITLE_STYLES = [
  { id: "bold",    label: "Viral Bold",  desc: "Estilo MrBeast" },
  { id: "neon",    label: "Neon Glow",   desc: "Gaming / TikTok" },
  { id: "minimal", label: "Minimal",     desc: "Podcast / LinkedIn" },
  { id: "default", label: "Default",     desc: "Estándar" },
];

const AUTOCROP_MODES = [
  { id: "face",   label: "Face Tracking", desc: "Detecta rostros" },
  { id: "center", label: "Center Crop",   desc: "Centro fijo" },
  { id: "smart",  label: "Smart Crop",    desc: "Movimiento + cara" },
];

export default function AIToolsSidebar({ projectId, selectedClipId, onJobStarted }) {
  const [activeTab, setActiveTab]       = useState("subtitles");
  const [subtitleStyle, setSubtitleStyle] = useState("bold");
  const [autocropMode, setAutocropMode] = useState("face");
  const [silenceDb, setSilenceDb]       = useState(-35);
  const [silenceMs, setSilenceMs]       = useState(600);
  const [enhanceDenoise, setDenoise]    = useState(true);
  const [enhanceNorm, setNorm]          = useState(true);
  const [status, setStatus]             = useState(null);  // null | "running" | "done" | "error"
  const [message, setMessage]           = useState("");

  const clips = useEditorStore((s) => s.clips);
  const clipId = selectedClipId || clips[0]?.id;

  async function runTool(toolFn, body, label) {
    if (!clipId) { setMessage("Selecciona un clip primero"); setStatus("error"); return; }
    setStatus("running"); setMessage(`Ejecutando ${label}...`);
    try {
      const { job_id } = await toolFn({ project_id: projectId, clip_id: clipId, ...body });
      await pollJob(
        projectId, job_id,
        (job) => setMessage(`${label}: ${job.step || job.status} (${job.progress}%)`),
        2000,
      );
      setStatus("done"); setMessage(`✓ ${label} completado`);
      if (onJobStarted) onJobStarted();
    } catch (err) {
      setStatus("error"); setMessage(err.message);
    }
  }

  const tabs = [
    { id: "subtitles", icon: "💬", label: "Subtítulos" },
    { id: "silence",   icon: "🔇", label: "Silencios" },
    { id: "autocrop",  icon: "📐", label: "Autocrop" },
    { id: "audio",     icon: "🎵", label: "Audio" },
  ];

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      <div className="px-4 py-3 border-b border-zinc-800">
        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Herramientas IA</h3>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex-1 py-2 text-[10px] font-semibold transition-colors flex flex-col items-center gap-0.5 ${
              activeTab === t.id
                ? "text-violet-400 border-b-2 border-violet-500"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <span>{t.icon}</span>
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* Subtítulos */}
        {activeTab === "subtitles" && (
          <div>
            <p className="text-xs text-zinc-400 mb-4">Genera subtítulos con Whisper y los quema en el video con el estilo seleccionado.</p>
            <div className="space-y-2 mb-5">
              {SUBTITLE_STYLES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSubtitleStyle(s.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors text-left ${
                    subtitleStyle === s.id
                      ? "border-violet-500 bg-violet-900/30"
                      : "border-zinc-800 hover:border-zinc-600"
                  }`}
                >
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{s.label}</div>
                    <div className="text-xs text-zinc-400">{s.desc}</div>
                  </div>
                  {subtitleStyle === s.id && <span className="text-violet-400 text-sm">✓</span>}
                </button>
              ))}
            </div>
            <AIButton
              onClick={() => runTool(ai.subtitles, { style: subtitleStyle }, "Subtítulos")}
              status={status}
              label="Generar subtítulos"
            />
          </div>
        )}

        {/* Silence remover */}
        {activeTab === "silence" && (
          <div>
            <p className="text-xs text-zinc-400 mb-4">Detecta y elimina silencios automáticamente para un clip más compacto y dinámico.</p>
            <div className="mb-4">
              <label className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wide block mb-2">
                Silencio mínimo (ms): <span className="text-white">{silenceMs}ms</span>
              </label>
              <input type="range" min={200} max={2000} step={100}
                value={silenceMs} onChange={(e) => setSilenceMs(+e.target.value)}
                className="w-full accent-violet-500" />
            </div>
            <div className="mb-5">
              <label className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wide block mb-2">
                Umbral de silencio: <span className="text-white">{silenceDb} dB</span>
              </label>
              <input type="range" min={-60} max={-20} step={1}
                value={silenceDb} onChange={(e) => setSilenceDb(+e.target.value)}
                className="w-full accent-violet-500" />
            </div>
            <AIButton
              onClick={() => runTool(ai.removeSilence, { min_silence_ms: silenceMs, silence_db: silenceDb }, "Silence remover")}
              status={status}
              label="Eliminar silencios"
            />
          </div>
        )}

        {/* Autocrop */}
        {activeTab === "autocrop" && (
          <div>
            <p className="text-xs text-zinc-400 mb-4">Convierte el video a formato 9:16 con detección inteligente del área de interés.</p>
            <div className="space-y-2 mb-5">
              {AUTOCROP_MODES.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setAutocropMode(m.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors text-left ${
                    autocropMode === m.id
                      ? "border-violet-500 bg-violet-900/30"
                      : "border-zinc-800 hover:border-zinc-600"
                  }`}
                >
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{m.label}</div>
                    <div className="text-xs text-zinc-400">{m.desc}</div>
                  </div>
                  {autocropMode === m.id && <span className="text-violet-400 text-sm">✓</span>}
                </button>
              ))}
            </div>
            <AIButton
              onClick={() => runTool(ai.autocrop, { mode: autocropMode }, "Auto-crop")}
              status={status}
              label="Aplicar auto-crop 9:16"
            />
          </div>
        )}

        {/* Audio enhance */}
        {activeTab === "audio" && (
          <div>
            <p className="text-xs text-zinc-400 mb-4">Mejora la calidad del audio: reducción de ruido, normalización y claridad de voz.</p>
            <div className="space-y-3 mb-5">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={enhanceDenoise}
                  onChange={(e) => setDenoise(e.target.checked)}
                  className="accent-violet-500 w-4 h-4" />
                <div>
                  <div className="text-sm font-semibold">Reducción de ruido</div>
                  <div className="text-xs text-zinc-400">Elimina ruido de fondo</div>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={enhanceNorm}
                  onChange={(e) => setNorm(e.target.checked)}
                  className="accent-violet-500 w-4 h-4" />
                <div>
                  <div className="text-sm font-semibold">Normalizar volumen</div>
                  <div className="text-xs text-zinc-400">Estándar -14 LUFS (streaming)</div>
                </div>
              </label>
            </div>
            <AIButton
              onClick={() => runTool(ai.enhanceAudio, { denoise: enhanceDenoise, normalize: enhanceNorm }, "Audio enhance")}
              status={status}
              label="Mejorar audio"
            />
          </div>
        )}

        {/* Status message */}
        {message && (
          <div className={`mt-4 text-xs px-3 py-2 rounded-xl ${
            status === "error"   ? "bg-red-900/30 text-red-400 border border-red-800/50" :
            status === "done"    ? "bg-green-900/30 text-green-400 border border-green-800/50" :
            "bg-zinc-800/60 text-zinc-400"
          }`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}

function AIButton({ onClick, status, label }) {
  const running = status === "running";
  return (
    <button
      onClick={onClick}
      disabled={running}
      className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold text-sm py-3 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
    >
      {running && <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />}
      {running ? "Procesando..." : label}
    </button>
  );
}
