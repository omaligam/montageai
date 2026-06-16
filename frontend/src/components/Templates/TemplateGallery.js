"use client";
import { useState, useEffect } from "react";
import { templateApi } from "@/lib/api";

const CATEGORY_COLORS = {
  subtitles: "text-violet-400",
  style:     "text-amber-400",
  platform:  "text-emerald-400",
};

const CATEGORY_LABELS = {
  subtitles: "Subtítulos",
  style:     "Estilo",
  platform:  "Plataforma",
};

const TEMPLATE_ICONS = {
  viral_bold:    "💥",
  neon_glow:     "🌈",
  minimal_clean: "✦",
  cinematic:     "🎬",
  podcast_clips: "🎙️",
  instagram_reel:"📸",
  tiktok_viral:  "♪",
  youtube_shorts:"▶",
};

export default function TemplateGallery({ onApply, selectedClipId }) {
  const [templates, setTemplates] = useState([]);
  const [filter, setFilter]       = useState("all");
  const [applying, setApplying]   = useState(null);

  useEffect(() => {
    templateApi.list().then(setTemplates).catch(console.error);
  }, []);

  const filtered = filter === "all" ? templates : templates.filter((t) => t.category === filter);

  async function handleApply(template) {
    if (!selectedClipId) {
      alert("Selecciona un clip en el timeline primero");
      return;
    }
    setApplying(template.id);
    if (onApply) await onApply(template);
    setApplying(null);
  }

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      <div className="px-4 py-3 border-b border-zinc-800">
        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Templates</h3>
      </div>

      {/* Filter */}
      <div className="flex gap-1 px-3 py-2 border-b border-zinc-800 overflow-x-auto">
        {["all", "subtitles", "style", "platform"].map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`text-[10px] font-semibold px-3 py-1.5 rounded-full whitespace-nowrap transition-colors ${
              filter === cat
                ? "bg-violet-600 text-white"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800"
            }`}
          >
            {cat === "all" ? "Todos" : CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filtered.map((template) => (
          <div
            key={template.id}
            className="bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-xl p-3 transition-colors group"
          >
            <div className="flex items-start gap-3">
              <div className="text-2xl">{TEMPLATE_ICONS[template.id] || "✦"}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-semibold text-sm">{template.name}</span>
                  <span className={`text-[9px] font-bold uppercase tracking-wider ${CATEGORY_COLORS[template.category]}`}>
                    {CATEGORY_LABELS[template.category]}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">{template.description}</p>
              </div>
            </div>
            <button
              onClick={() => handleApply(template)}
              disabled={applying === template.id}
              className="mt-3 w-full text-xs bg-zinc-800 hover:bg-violet-700 text-zinc-300 hover:text-white font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-1"
            >
              {applying === template.id ? (
                <>
                  <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                  Aplicando...
                </>
              ) : (
                "Aplicar template"
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
