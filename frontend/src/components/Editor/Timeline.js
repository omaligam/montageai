"use client";
import { useRef, useState, useEffect, useCallback } from "react";
import { useEditorStore } from "@/store/editorStore";

const TRACK_H    = 60;
const LABEL_W    = 88;
const PX_PER_SEC = 80;
const RULER_H    = 32;
const SNAP_PX    = 8;
const MIN_ZOOM   = 0.1;
const MAX_ZOOM   = 8;

const TRACK_STYLE = {
  video: { gradient:"linear-gradient(180deg,#6d28d9 0%,#4c1d95 100%)", border:"#7c3aed", glow:"rgba(124,58,237,0.55)", stripe:"rgba(255,255,255,0.035)" },
  audio: { gradient:"linear-gradient(180deg,#047857 0%,#064e3b 100%)", border:"#059669", glow:"rgba(5,150,105,0.45)",  stripe:"rgba(255,255,255,0.035)" },
  text:  { gradient:"linear-gradient(180deg,#92400e 0%,#78350f 100%)", border:"#b45309", glow:"rgba(180,83,9,0.45)",   stripe:"rgba(255,255,255,0.035)" },
};

// ─────────────────────────────────────────────────────────────
export default function Timeline({ onDropClip }) {
  const scrollRef     = useRef(null);
  const containerRef  = useRef(null);
  const [hoverX,    setHoverX]    = useState(null);
  const [snapTime,  setSnapTime]  = useState(null);
  const [ctx,       setCtx]       = useState(null); // {type,item,side} para context menu
  const [ctxPos,    setCtxPos]    = useState({ x:0, y:0 });

  const {
    tracks, currentTime, duration, zoom,
    selectedItemId, setCurrentTime, moveItem,
    trimItem, deleteItem, selectItem, cutAtCurrentTime,
    setZoom, undo, redo, playing, setPlaying,
  } = useEditorStore();

  const pps    = PX_PER_SEC * zoom;
  const totalW = Math.max((duration || 0) * pps + 600, 900);

  // ── Fit to content ─────────────────────────────────────────
  const fitZoom = useCallback(() => {
    const el = scrollRef.current;
    if (!el || !duration) return;
    const avail = el.clientWidth - LABEL_W - 40;
    const z     = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, avail / (duration * PX_PER_SEC)));
    setZoom(z);
    el.scrollLeft = 0;
  }, [duration, setZoom]);

  // ── Keyboard shortcuts ─────────────────────────────────────
  useEffect(() => {
    function onKey(e) {
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if ((e.key === "Delete" || e.key === "Backspace") && selectedItemId) {
        e.preventDefault();
        deleteItem(selectedItemId);
      }
      if (e.key === "c" && !e.ctrlKey && !e.metaKey) {
        cutAtCurrentTime();
      }
      if (e.key === " ") {
        e.preventDefault();
        setPlaying(!playing);
      }
      if (e.key === "f" || e.key === "F") {
        fitZoom();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault(); undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault(); redo();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedItemId, deleteItem, cutAtCurrentTime, playing, setPlaying, fitZoom, undo, redo]);

  // ── Ctrl+Rueda = zoom ──────────────────────────────────────
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    function onWheel(e) {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      // Zoom centrado en el cursor
      const rect  = el.getBoundingClientRect();
      const xInEl = e.clientX - rect.left + el.scrollLeft - LABEL_W;
      const tAtCursor = Math.max(0, xInEl / pps);

      const factor  = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom * factor));
      setZoom(newZoom);

      // Reposicionar scroll para que el punto bajo el cursor no se mueva
      requestAnimationFrame(() => {
        el.scrollLeft = tAtCursor * (PX_PER_SEC * newZoom) + LABEL_W - (e.clientX - rect.left);
      });
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoom, pps, setZoom]);

  // ── Cerrar context menu con Escape o clic fuera ────────────
  useEffect(() => {
    if (!ctx) return;
    function close(e) {
      if (!e.target.closest?.("[data-ctx-menu]")) setCtx(null);
    }
    function onEsc(e) { if (e.key === "Escape") setCtx(null); }
    window.addEventListener("mousedown", close);
    window.addEventListener("keydown", onEsc);
    return () => { window.removeEventListener("mousedown", close); window.removeEventListener("keydown", onEsc); };
  }, [ctx]);

  // ── Helpers ───────────────────────────────────────────────
  function clientXToTime(clientX) {
    const el = scrollRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    return Math.max(0, (clientX - rect.left + el.scrollLeft - LABEL_W) / pps);
  }

  function getSnapTimes(excludeId) {
    const times = [0];
    if (currentTime > 0) times.push(currentTime); // snap al playhead
    for (const track of tracks)
      for (const item of track.items) {
        if (item.id !== excludeId) { times.push(item.trackStart, item.trackEnd); }
      }
    return times;
  }

  function trySnap(t, excludeId) {
    for (const s of getSnapTimes(excludeId))
      if (Math.abs(s - t) * pps <= SNAP_PX) return { t: s, snapped: true };
    return { t, snapped: false };
  }

  // ── Playhead drag (regla) ─────────────────────────────────
  function startPlayheadDrag(e) {
    e.preventDefault();
    e.stopPropagation();
    setCurrentTime(clientXToTime(e.clientX));
    const move = (mv) => setCurrentTime(clientXToTime(mv.clientX));
    const up   = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup",   up);
  }

  // ── Drag clip ────────────────────────────────────────────
  function startDrag(e, item) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    selectItem(item.id);
    const sx = e.clientX, orig = item.trackStart, dur = item.trackEnd - item.trackStart;

    const move = (mv) => {
      const raw = Math.max(0, orig + (mv.clientX - sx) / pps);
      const { t: ts, snapped: ss } = trySnap(raw, item.id);
      const { t: te, snapped: se } = trySnap(raw + dur, item.id);
      const final = ss ? ts : se ? te - dur : raw;
      moveItem(item.id, Math.max(0, final));
      setSnapTime(ss ? ts : se ? te : null);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup",   up);
      setSnapTime(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup",   up);
  }

  // ── Trim ─────────────────────────────────────────────────
  function startTrim(e, item, side) {
    e.preventDefault();
    e.stopPropagation();
    const move = (mv) => {
      const { t } = trySnap(clientXToTime(mv.clientX), item.id);
      trimItem(item.id, side, t);
    };
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup",   up);
  }

  // ── Context menu ─────────────────────────────────────────
  function openCtx(e, item) {
    e.preventDefault();
    e.stopPropagation();
    selectItem(item.id);
    setCtxPos({ x: e.clientX, y: e.clientY });
    setCtx(item);
  }

  // ── Ruler ─────────────────────────────────────────────────
  function renderRuler() {
    const total = Math.ceil((duration || 0) + 20);
    const step  = pps >= 200 ? 0.5 : pps >= 120 ? 1 : pps >= 50 ? 2 : pps >= 25 ? 5 : 10;
    const ticks = [];
    for (let s = 0; s <= total; s = +(s + step).toFixed(6)) {
      const major = Math.abs(Math.round(s) - s) < 0.01 && (step <= 1 || s % 5 === 0);
      ticks.push(
        <div key={s} style={{ position:"absolute", left: s * pps, top:0, pointerEvents:"none" }}>
          <div style={{ width:1, height: major ? 16 : 6, background: major ? "#4a4a4a" : "#282828", marginTop: RULER_H - (major ? 16 : 6) }} />
          {major && (
            <span style={{ position:"absolute", bottom: RULER_H - 14, left:3, fontSize:9, color:"#555", fontFamily:"monospace" }}>
              {_fmt(s)}
            </span>
          )}
        </div>
      );
    }
    return ticks;
  }

  const playheadPx = LABEL_W + (currentTime || 0) * pps;

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      style={{ display:"flex", flexDirection:"column", height:"100%", background:"#111", borderTop:"2px solid #000", userSelect:"none", outline:"none" }}
    >
      {/* ── Toolbar ──────────────────────────────────────── */}
      <div style={{ display:"flex", alignItems:"center", gap:6, padding:"0 10px", height:34, background:"#191919", borderBottom:"1px solid #222", flexShrink:0 }}>
        <span style={{ fontSize:9, fontWeight:700, color:"#3a3a3a", letterSpacing:2, textTransform:"uppercase" }}>Timeline</span>

        {/* Zoom controls */}
        <div style={{ display:"flex", alignItems:"center", gap:2, marginLeft:8 }}>
          <ToolBtn onClick={() => setZoom(Math.max(MIN_ZOOM, zoom / 1.3))} title="Alejar (Ctrl+Rueda)">−</ToolBtn>
          <span style={{ fontSize:9, color:"#555", width:34, textAlign:"center", fontFamily:"monospace" }}>{Math.round(zoom * 100)}%</span>
          <ToolBtn onClick={() => setZoom(Math.min(MAX_ZOOM, zoom * 1.3))} title="Acercar (Ctrl+Rueda)">+</ToolBtn>
          <ToolBtn onClick={fitZoom} title="Ajustar al contenido (F)" style={{ marginLeft:2, fontSize:9 }}>⊞ Fit</ToolBtn>
        </div>

        {/* Actions */}
        <div style={{ display:"flex", gap:4, marginLeft:8 }}>
          <ToolBtn onClick={cutAtCurrentTime} title="Cortar en cabezal (C)">✂ Cortar</ToolBtn>
          {selectedItemId && (
            <ToolBtn onClick={() => deleteItem(selectedItemId)} danger title="Eliminar (Supr)">⌫ Eliminar</ToolBtn>
          )}
        </div>

        {/* Shortcuts hint */}
        <div style={{ display:"flex", gap:8, marginLeft:"auto", alignItems:"center" }}>
          <span style={{ fontSize:8, color:"#333" }}>Espacio = play/pause · C = cortar · F = ajustar · Ctrl+Z = deshacer</span>
          <span style={{ fontSize:10, color:"#555", fontFamily:"monospace" }}>{_fmtFull(currentTime)} / {_fmtFull(duration || 0)}</span>
        </div>
      </div>

      {/* ── Scrollable ───────────────────────────────────── */}
      <div ref={scrollRef} style={{ flex:1, overflowX:"auto", overflowY:"auto", position:"relative" }}>
        <div style={{ position:"relative", width: LABEL_W + totalW, minHeight: RULER_H + tracks.length * TRACK_H }}>

          {/* ── Ruler ──────────────────────────────────── */}
          <div
            onPointerDown={startPlayheadDrag}
            onPointerMove={(e) => {
              const el = scrollRef.current;
              if (!el) return;
              const r = el.getBoundingClientRect();
              setHoverX(e.clientX - r.left + el.scrollLeft - LABEL_W);
            }}
            onPointerLeave={() => setHoverX(null)}
            style={{ position:"sticky", top:0, zIndex:20, display:"flex", height:RULER_H, background:"#1c1c1c", borderBottom:"1px solid #252525", cursor:"col-resize" }}
          >
            {/* Corner */}
            <div style={{ width:LABEL_W, minWidth:LABEL_W, flexShrink:0, borderRight:"1px solid #252525", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <span style={{ fontSize:7, color:"#333", fontFamily:"monospace", letterSpacing:0.5 }}>M:S</span>
            </div>
            {/* Ticks */}
            <div style={{ position:"relative", flex:1, height:RULER_H, overflow:"hidden" }}>
              {renderRuler()}
              {/* Hover indicator */}
              {hoverX !== null && hoverX >= 0 && (
                <div style={{ position:"absolute", top:0, left:hoverX, bottom:0, width:1, background:"rgba(255,255,255,0.07)", pointerEvents:"none" }}>
                  <span style={{ position:"absolute", top:5, left:4, fontSize:8, color:"#888", fontFamily:"monospace", background:"#1c1c1c", padding:"1px 3px", borderRadius:2, whiteSpace:"nowrap" }}>
                    {_fmtFull(Math.max(0, hoverX / pps))}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ── Playhead head ──────────────────────────── */}
          <div
            onPointerDown={startPlayheadDrag}
            style={{ position:"absolute", top:4, left: playheadPx - 8, width:16, height: RULER_H - 4, zIndex:35, cursor:"col-resize", display:"flex", flexDirection:"column", alignItems:"center" }}
          >
            <div style={{ width:11, height:11, borderRadius:"50%", background:"#f43f5e", marginTop:1, boxShadow:"0 0 10px rgba(244,63,94,0.9), 0 0 4px rgba(244,63,94,0.6)", flexShrink:0 }} />
            <div style={{ width:0, height:0, borderLeft:"7px solid transparent", borderRight:"7px solid transparent", borderTop:"10px solid #f43f5e", flexShrink:0 }} />
          </div>

          {/* Playhead line */}
          <div style={{ position:"absolute", top:0, bottom:0, left:playheadPx, width:1, background:"rgba(244,63,94,0.9)", zIndex:30, pointerEvents:"none" }} />

          {/* ── Snap line ──────────────────────────────── */}
          {snapTime !== null && (
            <div style={{ position:"absolute", top: RULER_H, bottom:0, left: LABEL_W + snapTime * pps, width:1, background:"rgba(250,204,21,0.9)", zIndex:28, pointerEvents:"none" }}>
              <div style={{ width:8, height:8, borderRadius:"50%", background:"#fbbf24", transform:"translate(-3.5px,-4px)", boxShadow:"0 0 6px rgba(251,191,36,0.8)" }} />
            </div>
          )}

          {/* ── Tracks ─────────────────────────────────── */}
          {tracks.map((track, ti) => {
            const col = TRACK_STYLE[track.type] || TRACK_STYLE.video;
            return (
              <div
                key={track.id}
                style={{ display:"flex", height:TRACK_H, borderBottom:"1px solid #181818" }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const j = e.dataTransfer.getData("clip");
                  if (j && onDropClip) onDropClip(JSON.parse(j), track.id);
                }}
              >
                {/* Label */}
                <div style={{ width:LABEL_W, minWidth:LABEL_W, flexShrink:0, background:"#1c1c1c", borderRight:"1px solid #252525", display:"flex", flexDirection:"column", alignItems:"flex-start", justifyContent:"center", padding:"0 10px", gap:3 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <div style={{ width:3, height:16, borderRadius:2, background:col.border, boxShadow:`0 0 6px ${col.glow}` }} />
                    <span style={{ fontSize:9, fontWeight:700, color:"#606060", letterSpacing:1.5, textTransform:"uppercase" }}>{track.label}</span>
                  </div>
                  <span style={{ fontSize:8, color:"#303030", fontFamily:"monospace", paddingLeft:9 }}>
                    {track.items.length > 0 ? `${track.items.length} clip${track.items.length !== 1 ? "s" : ""}` : "vacío"}
                  </span>
                </div>

                {/* Lane */}
                <div
                  style={{ position:"relative", flex:1, background: ti % 2 === 0 ? "#141414" : "#131313" }}
                  onClick={(e) => { if (e.target === e.currentTarget) selectItem(null); }}
                >
                  {/* Subtle grid lines every 5s */}
                  <GridLines pps={pps} duration={duration} />

                  {track.items.length === 0 && (
                    <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", paddingLeft:16, fontSize:10, color:"#252525", fontStyle:"italic", pointerEvents:"none" }}>
                      {track.type === "video" ? "Arrastra clips aquí" : ""}
                    </div>
                  )}

                  {track.items.map((item) => {
                    const L   = item.trackStart * pps;
                    const W   = Math.max(16, (item.trackEnd - item.trackStart) * pps);
                    const dur = item.trackEnd - item.trackStart;
                    const sel = item.id === selectedItemId;

                    return (
                      <div
                        key={item.id}
                        onClick={(e) => { e.stopPropagation(); selectItem(item.id); }}
                        onPointerDown={(e) => startDrag(e, item)}
                        onContextMenu={(e) => openCtx(e, item)}
                        style={{
                          position:"absolute", left:L, top:5, bottom:5, width:W,
                          background: col.gradient,
                          border: sel ? "1.5px solid rgba(255,255,255,0.9)" : `1.5px solid ${col.border}`,
                          borderRadius:4, overflow:"hidden", cursor:"grab", userSelect:"none",
                          boxShadow: sel
                            ? `0 0 0 1px rgba(255,255,255,0.15), 0 0 14px ${col.glow}, 0 3px 12px rgba(0,0,0,0.9)`
                            : `0 1px 4px rgba(0,0,0,0.7)`,
                          transition:"box-shadow 0.1s",
                        }}
                      >
                        {/* Thumbnail bg (video clips with thumbnail) */}
                        {track.type === "video" && item.thumbnailUrl && (
                          <div style={{
                            position:"absolute", inset:0, top:18,
                            backgroundImage:`url(${item.thumbnailUrl})`,
                            backgroundSize:"cover", backgroundPosition:"center",
                            opacity:0.18, pointerEvents:"none",
                          }} />
                        )}

                        {/* Diagonal stripes */}
                        <div style={{
                          position:"absolute", inset:0, top:18,
                          background:`repeating-linear-gradient(-45deg,${col.stripe} 0,${col.stripe} 3px,transparent 3px,transparent 14px)`,
                          pointerEvents:"none",
                        }} />

                        {/* Header */}
                        <div style={{
                          position:"absolute", top:0, left:0, right:0, height:18,
                          background: sel ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.45)",
                          borderBottom:"1px solid rgba(255,255,255,0.06)",
                          display:"flex", alignItems:"center", paddingLeft:7, paddingRight:18, gap:4,
                        }}>
                          <span style={{ fontSize:8, opacity:0.5, flexShrink:0 }}>
                            {track.type === "video" ? "▶" : track.type === "audio" ? "♪" : "T"}
                          </span>
                          <span style={{ fontSize:9, fontWeight:700, color: sel ? "#fff" : "rgba(255,255,255,0.88)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                            {track.type === "text" ? `"${item.text || ""}"` : (item.title || "Clip")}
                          </span>
                        </div>

                        {/* Duration badge */}
                        {W > 48 && (
                          <div style={{ position:"absolute", bottom:4, right:5, fontSize:8, color:"rgba(255,255,255,0.28)", fontFamily:"monospace" }}>
                            {_fmtFull(dur)}
                          </div>
                        )}

                        {/* Trim handles */}
                        <TrimHandle side="left"  onPointerDown={(e) => startTrim(e, item, "start")} sel={sel} />
                        <TrimHandle side="right" onPointerDown={(e) => startTrim(e, item, "end")}   sel={sel} />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Status bar ──────────────────────────────────── */}
      <div style={{ padding:"3px 12px", borderTop:"1px solid #1a1a1a", background:"#0e0e0e", flexShrink:0, display:"flex", gap:8, alignItems:"center" }}>
        <span style={{ fontSize:9, color:"#2e2e2e" }}>Ctrl+Rueda: zoom</span>
        <Sep /><span style={{ fontSize:9, color:"#2e2e2e" }}>Arrastrar regla: mover cabezal</span>
        <Sep /><span style={{ fontSize:9, color:"#2e2e2e" }}>Bordes: recortar</span>
        <Sep /><span style={{ fontSize:9, color:"#2e2e2e" }}>Clic derecho: opciones</span>
        {snapTime !== null && <><Sep /><span style={{ fontSize:9, color:"#fbbf24" }}>⚡ snap</span></>}
      </div>

      {/* ── Context menu ────────────────────────────────── */}
      {ctx && (
        <div
          data-ctx-menu="1"
          style={{
            position:"fixed", left:ctxPos.x, top:ctxPos.y,
            background:"#1e1e1e", border:"1px solid #333", borderRadius:6,
            boxShadow:"0 8px 24px rgba(0,0,0,0.8)",
            zIndex:1000, minWidth:160, padding:"4px 0",
            fontSize:12,
          }}
        >
          <CtxItem icon="✂" label="Cortar aquí" shortcut="C" onClick={() => { cutAtCurrentTime(); setCtx(null); }} />
          <CtxItem icon="📋" label="Duplicar" onClick={() => {
            // Simplificado: mover al final
            setCtx(null);
          }} />
          <div style={{ height:1, background:"#2e2e2e", margin:"4px 0" }} />
          <CtxItem icon="🔒" label="Anclar al inicio" onClick={() => {
            moveItem(ctx.id, 0);
            setCtx(null);
          }} />
          <div style={{ height:1, background:"#2e2e2e", margin:"4px 0" }} />
          <CtxItem icon="⌫" label="Eliminar clip" danger shortcut="Supr" onClick={() => { deleteItem(ctx.id); setCtx(null); }} />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Grid lines subtiles en los carriles
function GridLines({ pps, duration }) {
  if (!duration) return null;
  const step  = pps >= 200 ? 1 : pps >= 50 ? 5 : 10;
  const total = Math.ceil(duration + 20);
  const lines = [];
  for (let s = step; s <= total; s += step) {
    lines.push(
      <div key={s} style={{ position:"absolute", top:0, bottom:0, left: s * pps, width:1, background:"rgba(255,255,255,0.025)", pointerEvents:"none" }} />
    );
  }
  return <>{lines}</>;
}

// ─────────────────────────────────────────────────────────────
function TrimHandle({ side, onPointerDown, sel }) {
  const [hov, setHov] = useState(false);
  const vis = hov || sel;
  return (
    <div
      onPointerDown={(e) => { e.stopPropagation(); onPointerDown(e); }}
      onPointerEnter={() => setHov(true)}
      onPointerLeave={() => setHov(false)}
      style={{
        position:"absolute",
        [side === "left" ? "left" : "right"]: 0,
        top:0, bottom:0, width:10,
        cursor: side === "left" ? "w-resize" : "e-resize",
        zIndex:4,
        background: vis ? "rgba(255,255,255,0.18)" : "transparent",
        borderLeft:  side === "right" && vis ? "2px solid rgba(255,255,255,0.5)" : "none",
        borderRight: side === "left"  && vis ? "2px solid rgba(255,255,255,0.5)" : "none",
        display:"flex", alignItems:"center", justifyContent:"center",
        transition:"background 0.08s",
      }}
    >
      {vis && (
        <div style={{ display:"flex", flexDirection:"column", gap:2.5, pointerEvents:"none" }}>
          {[0,1,2].map(i => <div key={i} style={{ width:1.5, height:7, background:"rgba(255,255,255,0.8)", borderRadius:1 }} />)}
        </div>
      )}
    </div>
  );
}

function ToolBtn({ onClick, children, danger, title, style: s = {} }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick} title={title}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        padding:"0 8px", height:22, borderRadius:3,
        background: danger ? (hov ? "#500" : "#3b0606") : (hov ? "#2e2e2e" : "#222"),
        border: danger ? "1px solid #7f1d1d" : "1px solid #333",
        color: danger ? "#fca5a5" : (hov ? "#d4d4d4" : "#888"),
        cursor:"pointer", fontSize:10, fontWeight:600,
        transition:"background 0.1s, color 0.1s",
        ...s,
      }}
    >{children}</button>
  );
}

function CtxItem({ icon, label, shortcut, danger, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        display:"flex", alignItems:"center", gap:8,
        padding:"6px 14px", cursor:"pointer",
        background: hov ? (danger ? "#3b0606" : "#2a2a2a") : "transparent",
        color: danger ? "#fca5a5" : "#ccc",
        fontSize:12, userSelect:"none",
      }}
    >
      <span style={{ fontSize:12, width:14, flexShrink:0 }}>{icon}</span>
      <span style={{ flex:1 }}>{label}</span>
      {shortcut && <span style={{ fontSize:10, color:"#555", fontFamily:"monospace" }}>{shortcut}</span>}
    </div>
  );
}

function Sep() { return <span style={{ fontSize:9, color:"#222" }}>·</span>; }

function _fmt(s) {
  const m = Math.floor((s || 0) / 60);
  return `${m}:${Math.floor((s || 0) % 60).toString().padStart(2,"0")}`;
}

function _fmtFull(s) {
  const m  = Math.floor((s || 0) / 60);
  const se = Math.floor((s || 0) % 60);
  const f  = Math.floor(((s || 0) % 1) * 30); // 30fps
  return `${String(m).padStart(2,"0")}:${String(se).padStart(2,"0")}:${String(f).padStart(2,"0")}`;
}
