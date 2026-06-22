"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { projects as projectsApi } from "@/lib/api";
import { Suspense } from "react";

/* ── Inline SVG icons ──────────────────────────────── */
const IPlus   = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>;
const IVideo  = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"/></svg>;
const ILink   = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"/></svg>;
const IUpload = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/></svg>;
const IEdit   = () => <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"/></svg>;
const ITrash  = () => <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/></svg>;
const ISearch = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0016.803 15.803z"/></svg>;
const IGrid   = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"/></svg>;
const IRows   = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"/></svg>;

/* ── Status badge ──────────────────────────────────── */
function StatusBadge({ status }) {
  const map = {
    processing: { label: "Procesando", cls: "bg-teal-500/15 text-teal-300 border-teal-500/30" },
    ready:      { label: "Listo",      cls: "bg-green-500/15 text-green-300 border-green-500/30" },
    error:      { label: "Error",      cls: "bg-red-500/15 text-red-300 border-red-500/30" },
    draft:      { label: "Borrador",   cls: "bg-zinc-700/50 text-zinc-400 border-zinc-600/40" },
  };
  const s = map[status] || map.draft;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium ${s.cls}`}>
      {status === "processing" && <span className="w-1.5 h-1.5 rounded-full border border-current border-t-transparent animate-spin" />}
      {status === "ready"      && <span className="w-1.5 h-1.5 rounded-full bg-green-400" />}
      {status === "error"      && <span className="w-1.5 h-1.5 rounded-full bg-red-400" />}
      {s.label}
    </span>
  );
}

/* ── Project card (grid) ───────────────────────────── */
function ProjectCard({ project, onDelete }) {
  const date = new Date(project.updated_at).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" });
  return (
    <div className="glass rounded-2xl overflow-hidden card-lift group">
      <div className="aspect-video bg-zinc-900/80 relative overflow-hidden">
        {project.thumbnail
          ? <img src={project.thumbnail} alt={project.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          : <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-zinc-700"><span className="text-3xl">🎬</span><span className="text-xs">Sin preview</span></div>
        }
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4">
          <Link href={`/clips/${project.id}`} className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 text-xs font-semibold text-white">
            Abrir editor →
          </Link>
        </div>
        <div className="absolute top-2.5 right-2.5">
          <StatusBadge status={project.status} />
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-sm line-clamp-1 mb-0.5 group-hover:text-teal-300 transition-colors">{project.title}</h3>
        <p className="text-zinc-600 text-xs mb-4">{date}</p>
        <div className="flex gap-2">
          <Link href={`/clips/${project.id}`} className="flex-1 flex items-center justify-center gap-1.5 text-xs btn-glow text-white font-semibold py-2 rounded-lg">
            <IEdit /> Editar
          </Link>
          <button onClick={() => onDelete(project.id)} className="p-2 text-zinc-600 hover:text-red-400 transition-colors rounded-lg hover:bg-red-950/30">
            <ITrash />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Project row (list) ────────────────────────────── */
function ProjectRow({ project, onDelete }) {
  const date = new Date(project.updated_at).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" });
  return (
    <div className="flex items-center gap-4 p-4 glass rounded-xl card-lift group">
      <div className="w-16 h-10 bg-zinc-900 rounded-lg overflow-hidden shrink-0">
        {project.thumbnail
          ? <img src={project.thumbnail} alt="" className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-zinc-600 text-lg">🎬</div>
        }
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm truncate group-hover:text-teal-300 transition-colors">{project.title}</div>
        <div className="text-zinc-600 text-xs mt-0.5">{date}</div>
      </div>
      <StatusBadge status={project.status} />
      <div className="flex items-center gap-2 shrink-0">
        <Link href={`/clips/${project.id}`} className="flex items-center gap-1.5 text-xs bg-teal-600/80 hover:bg-teal-500 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors">
          <IEdit /> Editar
        </Link>
        <button onClick={() => onDelete(project.id)} className="p-1.5 text-zinc-600 hover:text-red-400 transition-colors rounded-lg hover:bg-red-950/30">
          <ITrash />
        </button>
      </div>
    </div>
  );
}

/* ── New project modal ─────────────────────────────── */
function NewProjectModal({ onClose, onCreate, onUpload, uploadProgress, creating, error }) {
  const [url, setUrl]       = useState("");
  const [tab, setTab]       = useState("url");
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);

  function handleDrop(e) {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) onUpload(file);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md glass-purple rounded-3xl p-7 shadow-2xl shadow-teal-950/60 animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-black text-xl">Nuevo proyecto</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 flex items-center justify-center transition-colors text-xl leading-none">×</button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-zinc-900/70 rounded-xl p-1 mb-6">
          {[
            { id: "url",    label: "YouTube URL", Icon: ILink },
            { id: "upload", label: "Subir video",  Icon: IUpload },
          ].map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 flex items-center justify-center gap-2 text-sm font-semibold py-2.5 rounded-lg transition-all ${
                tab === id ? "bg-teal-600 text-white shadow-lg shadow-teal-900/40" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <Icon /> {label}
            </button>
          ))}
        </div>

        {tab === "url" ? (
          <form onSubmit={(e) => { e.preventDefault(); onCreate(url); }} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">URL del video</label>
              <input
                type="text" value={url} onChange={(e) => setUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                autoFocus
                className="w-full bg-zinc-900/80 border border-zinc-700 rounded-xl px-4 py-3.5 text-white placeholder-zinc-600 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 transition-all text-sm"
              />
            </div>
            {error && <p className="text-red-400 text-sm bg-red-950/30 border border-red-900/50 rounded-xl px-4 py-2.5">{error}</p>}
            <button
              type="submit" disabled={creating || !url.trim()}
              className="w-full btn-glow text-white font-bold py-3.5 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed text-sm"
            >
              {creating ? "Creando…" : "Crear proyecto →"}
            </button>
            <p className="text-zinc-700 text-xs text-center">La IA generará hasta 10 clips de máximo 60s</p>
          </form>
        ) : (
          <div className="space-y-4">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => !creating && fileRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
                dragOver ? "border-teal-500 bg-teal-950/30" : "border-zinc-700 hover:border-teal-700/60 bg-zinc-900/30 hover:bg-teal-950/10"
              } ${creating ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {uploadProgress !== null ? (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-zinc-200">Subiendo… {uploadProgress}%</p>
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden max-w-xs mx-auto">
                    <div className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              ) : (
                <>
                  <div className="w-14 h-14 rounded-2xl glass-purple flex items-center justify-center text-teal-400 mx-auto mb-4 text-2xl">⬆️</div>
                  <p className="text-sm font-semibold text-zinc-200 mb-1">Arrastra tu video aquí</p>
                  <p className="text-xs text-zinc-600">o haz clic · mp4, mov, mkv, webm</p>
                </>
              )}
            </div>
            {error && <p className="text-red-400 text-sm bg-red-950/30 border border-red-900/50 rounded-xl px-4 py-2.5">{error}</p>}
            <input ref={fileRef} type="file" accept="video/mp4,video/quicktime,video/x-msvideo,video/x-matroska,video/webm,.mp4,.mov,.avi,.mkv,.webm,.m4v" className="hidden" onChange={(e) => onUpload(e.target.files?.[0])} />
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Dashboard ─────────────────────────────────────── */
function DashboardContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const returnUrl    = searchParams.get("url") || "";

  const [projectList, setProjectList]   = useState([]);
  const [loading, setLoading]           = useState(true);
  const [creating, setCreating]         = useState(false);
  const [showNew, setShowNew]           = useState(!!returnUrl);
  const [error, setError]               = useState("");
  const [uploadProgress, setUploadProgress] = useState(null);
  const [search, setSearch]             = useState("");
  const [view, setView]                 = useState("grid");
  const [filter, setFilter]             = useState("all");

  useEffect(() => { loadProjects(); }, []);

  async function loadProjects() {
    try { const data = await projectsApi.list(); setProjectList(data); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function handleCreate(url) {
    if (!url.trim()) return;
    setError(""); setCreating(true);
    try {
      const project = await projectsApi.create({ title: `Video ${new Date().toLocaleDateString("es")}`, source_url: url });
      router.push(`/clips/${project.id}`);
    } catch (err) { setError(err.message); setCreating(false); }
  }

  const handleUpload = useCallback(async (file) => {
    if (!file) return;
    const allowed = ["video/mp4","video/quicktime","video/x-msvideo","video/x-matroska","video/webm","video/x-m4v"];
    if (!allowed.includes(file.type) && !file.name.match(/\.(mp4|mov|avi|mkv|webm|m4v)$/i)) {
      setError("Formato no soportado. Usa mp4, mov, mkv o webm."); return;
    }
    setError(""); setUploadProgress(0); setCreating(true);
    try {
      const project = await projectsApi.upload(file, file.name.replace(/\.[^/.]+$/, ""), (pct) => setUploadProgress(pct));
      router.push(`/clips/${project.id}`);
    } catch (err) { setError(err.message); setCreating(false); setUploadProgress(null); }
  }, [router]);

  async function handleDelete(id) {
    if (!confirm("¿Eliminar este proyecto?")) return;
    await projectsApi.delete(id);
    setProjectList((p) => p.filter((x) => x.id !== id));
  }

  const filtered = projectList.filter((p) => {
    const matchSearch = p.title.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || p.status === filter;
    return matchSearch && matchFilter;
  });

  const stats = {
    total:      projectList.length,
    ready:      projectList.filter((p) => p.status === "ready").length,
    processing: projectList.filter((p) => p.status === "processing").length,
  };

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Subtle grid bg */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(13,148,136,0.02)_1px,transparent_1px),linear-gradient(to_right,rgba(13,148,136,0.02)_1px,transparent_1px)] bg-[size:60px_60px] pointer-events-none" />

      {/* ── Nav ──────────────────────────────────────── */}
      <nav className="relative z-10 border-b border-zinc-900 bg-black/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center font-black text-sm shadow-md shadow-teal-900/50">M</div>
              <div className="flex flex-col leading-none">
                <span className="font-black text-lg bg-gradient-to-r from-teal-300 to-cyan-300 bg-clip-text text-transparent">MontageAI</span>
                <span className="text-[10px] text-zinc-600 font-medium">by @omaligam</span>
              </div>
            </Link>
            <div className="hidden md:flex items-center gap-1 h-8 border-l border-zinc-800 pl-4">
              <span className="flex items-center gap-1.5 text-teal-300 text-sm font-semibold bg-teal-950/50 border border-teal-800/40 px-2.5 py-1 rounded-lg">
                <IVideo /> Proyectos
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/" className="text-zinc-500 hover:text-white text-sm transition-colors px-3 py-1.5 rounded-lg hover:bg-zinc-900">
              ← Inicio
            </Link>
            <button
              onClick={() => setShowNew(true)}
              className="btn-glow flex items-center gap-2 text-white font-bold text-sm px-4 py-2 rounded-xl"
            >
              <IPlus /> Nuevo proyecto
            </button>
          </div>
        </div>
      </nav>

      <div className="relative z-10 flex-1 max-w-7xl mx-auto w-full px-6 py-8">

        {/* ── Page header ─────────────────────────────── */}
        <div className="mb-8">
          <h1 className="text-3xl font-black tracking-tight mb-1">Mis proyectos</h1>
          <p className="text-zinc-600 text-sm">{projectList.length} proyectos totales</p>
        </div>

        {/* ── Stats ───────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Total",       value: stats.total,      icon: "🎬", color: "text-white" },
            { label: "Listos",      value: stats.ready,      icon: "✅", color: "text-green-400" },
            { label: "Procesando",  value: stats.processing, icon: "⚡", color: "text-teal-400" },
          ].map((s) => (
            <div key={s.label} className="glass rounded-2xl px-5 py-4 flex items-center gap-4">
              <div className="text-2xl">{s.icon}</div>
              <div>
                <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
                <div className="text-zinc-600 text-xs font-medium">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Toolbar ─────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"><ISearch /></div>
            <input
              type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar proyectos…"
              className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-teal-600/60 focus:ring-1 focus:ring-teal-600/20 transition-all"
            />
          </div>

          <div className="flex items-center gap-1 bg-zinc-900/60 border border-zinc-800 rounded-xl p-1 text-xs">
            {[
              { id: "all",        label: "Todos" },
              { id: "ready",      label: "Listos" },
              { id: "processing", label: "Procesando" },
              { id: "draft",      label: "Borrador" },
            ].map((f) => (
              <button
                key={f.id} onClick={() => setFilter(f.id)}
                className={`font-semibold px-3 py-1.5 rounded-lg transition-all ${
                  filter === f.id ? "bg-teal-600 text-white" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-zinc-900/60 border border-zinc-800 rounded-xl p-1">
            <button onClick={() => setView("grid")} className={`p-2 rounded-lg transition-colors ${view === "grid" ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"}`}><IGrid /></button>
            <button onClick={() => setView("list")} className={`p-2 rounded-lg transition-colors ${view === "list" ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"}`}><IRows /></button>
          </div>
        </div>

        {/* ── Content ─────────────────────────────────── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <div className="w-10 h-10 rounded-full border-2 border-teal-500 border-t-transparent animate-spin" />
            <p className="text-zinc-600 text-sm">Cargando proyectos…</p>
          </div>

        ) : projectList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-24 h-24 rounded-3xl glass-purple flex items-center justify-center text-4xl mb-6 animate-float">🎬</div>
            <h3 className="text-2xl font-black mb-2">Sin proyectos aún</h3>
            <p className="text-zinc-500 mb-8 max-w-sm text-sm">Crea tu primer proyecto desde un link de YouTube o sube tu propio video.</p>
            <button onClick={() => setShowNew(true)} className="btn-glow flex items-center gap-2 text-white font-bold px-6 py-3 rounded-xl">
              <IPlus /> Crear primer proyecto
            </button>
          </div>

        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-zinc-600 text-sm">No hay proyectos que coincidan con "{search}"</p>
          </div>

        ) : view === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map((p) => <ProjectCard key={p.id} project={p} onDelete={handleDelete} />)}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map((p) => <ProjectRow key={p.id} project={p} onDelete={handleDelete} />)}
          </div>
        )}
      </div>

      {/* ── Modal ────────────────────────────────────── */}
      {showNew && (
        <NewProjectModal
          onClose={() => { setShowNew(false); setError(""); }}
          onCreate={handleCreate}
          onUpload={handleUpload}
          uploadProgress={uploadProgress}
          creating={creating}
          error={error}
        />
      )}
    </div>
  );
}

export default function DashboardPage() {
  return <Suspense><DashboardContent /></Suspense>;
}
