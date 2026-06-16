"use client";
import { useEditorStore } from "@/store/editorStore";

export default function Toolbar({ projectId, clips, onExport, onShowTemplates, onShowAI, saveStatus }) {
  const { cutAtCurrentTime, addText, undo, redo, canUndo, canRedo } = useEditorStore();

  const tools = [
    { icon: "✂️", label: "Cortar",    action: cutAtCurrentTime, tip: "Cortar clip en posición actual (C)" },
    { icon: "T",  label: "Texto",     action: addText,           tip: "Agregar overlay de texto" },
    { icon: "🎨", label: "Templates", action: onShowTemplates,   tip: "Galería de templates" },
    { icon: "🤖", label: "IA Tools",  action: onShowAI,          tip: "Herramientas de IA" },
  ];

  const saveLabel = saveStatus === "saving" ? "Guardando..." : saveStatus === "unsaved" ? "Sin guardar" : "Guardado ✓";
  const saveColor = saveStatus === "unsaved" ? "text-amber-400" : saveStatus === "saving" ? "text-zinc-400 animate-pulse" : "text-green-500";

  return (
    <div className="flex items-center gap-1 px-3 h-12 bg-zinc-900 border-b border-zinc-800 shrink-0">
      {/* Logo mini */}
      <div className="w-7 h-7 rounded-md bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center font-black text-xs mr-2 shrink-0">M</div>

      {/* Undo / Redo */}
      <button
        onClick={undo} disabled={!canUndo()}
        title="Deshacer (Ctrl+Z)"
        className="p-1.5 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >↩</button>
      <button
        onClick={redo} disabled={!canRedo()}
        title="Rehacer (Ctrl+Shift+Z)"
        className="p-1.5 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed mr-1"
      >↪</button>

      {/* Separator */}
      <div className="w-px h-5 bg-zinc-700 mx-1" />

      {/* Tools */}
      <div className="flex items-center gap-0.5">
        {tools.map((t) => (
          <button
            key={t.label}
            onClick={t.action}
            title={t.tip}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <span>{t.icon}</span>
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Save status */}
      <span className={`text-[10px] font-medium mr-3 hidden sm:block ${saveColor}`}>{saveLabel}</span>

      {/* Export */}
      <button
        onClick={onExport}
        className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold text-xs px-4 py-2 rounded-lg transition-all"
      >
        ⬇ Exportar
      </button>
    </div>
  );
}
