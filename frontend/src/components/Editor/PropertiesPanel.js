"use client";
import { useEditorStore } from "@/store/editorStore";

export default function PropertiesPanel() {
  const { getSelectedItem, updateItemProp, deleteItem, selectedItemId } = useEditorStore();
  const item = getSelectedItem();

  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-zinc-600 px-4 text-center">
        <span className="text-3xl mb-2">🖱️</span>
        <span className="text-sm">Selecciona un elemento<br />en el timeline</span>
      </div>
    );
  }

  const isText  = item.type === "text" || item.text !== undefined && item.clipId === null;
  const isVideo = !isText;

  function Input({ label, type = "text", value, onChange, min, max, step }) {
    return (
      <div className="mb-4">
        <label className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wide block mb-1">{label}</label>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(type === "number" ? parseFloat(e.target.value) : e.target.value)}
          min={min} max={max} step={step}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-violet-500 transition-colors"
        />
      </div>
    );
  }

  function Select({ label, value, onChange, options }) {
    return (
      <div className="mb-4">
        <label className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wide block mb-1">{label}</label>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-violet-500 transition-colors"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-4 py-3 border-b border-zinc-800">
        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Propiedades</h3>
      </div>

      <div className="p-4 flex-1 overflow-y-auto">
        {/* Common */}
        <div className="mb-5 pb-5 border-b border-zinc-800">
          <div className="text-xs font-semibold text-zinc-300 mb-3">{item.title || "Clip"}</div>
          <div className="flex gap-2 text-xs text-zinc-500">
            <span>{_fmt(item.trackStart)} → {_fmt(item.trackEnd)}</span>
            <span>·</span>
            <span>{_fmt(item.trackEnd - item.trackStart)} dur.</span>
          </div>
        </div>

        {/* Text properties */}
        {isText && (
          <>
            <Input
              label="Texto"
              value={item.text || ""}
              onChange={(v) => updateItemProp(item.id, "text", v)}
            />
            <Input
              label="Tamaño de fuente"
              type="number" min={12} max={120} step={2}
              value={item.fontSize || 48}
              onChange={(v) => updateItemProp(item.id, "fontSize", v)}
            />
            <div className="mb-4">
              <label className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wide block mb-1">Color</label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={item.color || "#ffffff"}
                  onChange={(e) => updateItemProp(item.id, "color", e.target.value)}
                  className="w-8 h-8 rounded-md cursor-pointer border border-zinc-700 bg-transparent"
                />
                <input
                  type="text"
                  value={item.color || "#ffffff"}
                  onChange={(e) => updateItemProp(item.id, "color", e.target.value)}
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-violet-500"
                />
              </div>
            </div>
            <Select
              label="Animación"
              value={item.animation || "none"}
              onChange={(v) => updateItemProp(item.id, "animation", v)}
              options={[
                { value: "none",  label: "Sin animación" },
                { value: "fade",  label: "Fade" },
                { value: "pop",   label: "Pop / Scale" },
                { value: "slide", label: "Slide up" },
              ]}
            />
          </>
        )}

        {/* Video properties */}
        {isVideo && (
          <>
            <div className="mb-4">
              <label className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wide block mb-1">Opacidad</label>
              <input
                type="range" min={0} max={1} step={0.01}
                value={item.opacity ?? 1}
                onChange={(e) => updateItemProp(item.id, "opacity", parseFloat(e.target.value))}
                className="w-full accent-violet-500"
              />
              <span className="text-xs text-zinc-500">{Math.round((item.opacity ?? 1) * 100)}%</span>
            </div>
            <div className="mb-4">
              <label className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wide block mb-1">Velocidad</label>
              <input
                type="range" min={0.25} max={4} step={0.25}
                value={item.speed ?? 1}
                onChange={(e) => updateItemProp(item.id, "speed", parseFloat(e.target.value))}
                className="w-full accent-violet-500"
              />
              <span className="text-xs text-zinc-500">{item.speed ?? 1}x</span>
            </div>
            {item.hook && (
              <div className="mb-4 bg-zinc-800/60 rounded-xl p-3">
                <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wide mb-1">Hook viral</p>
                <p className="text-xs text-zinc-300 leading-relaxed">{item.hook}</p>
              </div>
            )}
          </>
        )}

        {/* Delete */}
        <div className="mt-auto pt-4 border-t border-zinc-800">
          <button
            onClick={() => deleteItem(item.id)}
            className="w-full text-sm text-red-400 hover:text-red-300 hover:bg-red-900/20 py-2 rounded-xl transition-colors border border-red-900/30"
          >
            Eliminar del timeline
          </button>
        </div>
      </div>
    </div>
  );
}

function _fmt(s) {
  const m   = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}
