"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { projects as projectsApi } from "@/lib/api";
import { Suspense } from "react";

function ProjectCard({ project, onDelete }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-zinc-600 transition-colors group">
      <div className="aspect-video bg-zinc-800 relative overflow-hidden">
        {project.thumbnail ? (
          <img src={project.thumbnail} alt={project.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-600 text-4xl">🎬</div>
        )}
        <div className="absolute top-2 right-2">
          {project.status === "processing" && (
            <span className="bg-violet-600/90 text-white text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1">
              <span className="w-2 h-2 border border-white border-t-transparent rounded-full animate-spin" />
              Procesando
            </span>
          )}
          {project.status === "ready" && (
            <span className="bg-green-600/90 text-white text-xs px-2 py-1 rounded-full font-medium">✓ Listo</span>
          )}
          {project.status === "error" && (
            <span className="bg-red-600/90 text-white text-xs px-2 py-1 rounded-full font-medium">✗ Error</span>
          )}
          {project.status === "draft" && (
            <span className="bg-zinc-700/90 text-white text-xs px-2 py-1 rounded-full font-medium">Borrador</span>
          )}
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-bold text-sm leading-snug line-clamp-1 mb-1">{project.title}</h3>
        <p className="text-zinc-500 text-xs mb-4">
          {new Date(project.updated_at).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" })}
        </p>
        <div className="flex gap-2">
          <Link
            href={`/editor/${project.id}`}
            className="flex-1 text-center text-xs bg-violet-600 hover:bg-violet-500 text-white font-semibold py-2 rounded-lg transition-colors"
          >
            Abrir editor
          </Link>
          <button onClick={() => onDelete(project.id)} className="text-xs text-zinc-500 hover:text-red-400 transition-colors px-2">✕</button>
        </div>
      </div>
    </div>
  );
}

function DashboardContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const returnUrl    = searchParams.get("url") || "";
  const fileInputRef = useRef(null);

  const [projectList, setProjectList] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [creating, setCreating]       = useState(false);
  const [url, setUrl]                 = useState(returnUrl);
  const [showNew, setShowNew]         = useState(!!returnUrl);
  const [error, setError]             = useState("");
  const [dragOver, setDragOver]       = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null); // null | 0-100

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    try {
      const data = await projectsApi.list();
      setProjectList(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!url.trim()) return;
    setError(""); setCreating(true);
    try {
      const title   = `Video ${new Date().toLocaleDateString("es")}`;
      const project = await projectsApi.create({ title, source_url: url });
      router.push(`/editor/${project.id}`);
    } catch (err) {
      setError(err.message);
      setCreating(false);
    }
  }

  const handleFileUpload = useCallback(async (file) => {
    if (!file) return;
    const allowed = ["video/mp4", "video/quicktime", "video/x-msvideo", "video/x-matroska", "video/webm", "video/x-m4v"];
    if (!allowed.includes(file.type) && !file.name.match(/\.(mp4|mov|avi|mkv|webm|m4v)$/i)) {
      setError("Formato no soportado. Usa mp4, mov, mkv o webm.");
      return;
    }
    setError("");
    setUploadProgress(0);
    setCreating(true);
    try {
      const project = await projectsApi.upload(file, file.name.replace(/\.[^/.]+$/, ""), (pct) => {
        setUploadProgress(pct);
      });
      router.push(`/editor/${project.id}`);
    } catch (err) {
      setError(err.message);
      setCreating(false);
      setUploadProgress(null);
    }
  }, [router]);

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }

  async function handleDelete(id) {
    if (!confirm("¿Borrar este proyecto?")) return;
    await projectsApi.delete(id);
    setProjectList((p) => p.filter((x) => x.id !== id));
  }

  function handleLogout() {
    router.push("/");
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-zinc-900">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center font-black text-sm">M</div>
          <span className="font-black text-lg bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">MontageAI</span>
        </Link>
        <div className="flex items-center gap-4">
          <button onClick={handleLogout} className="text-zinc-500 text-sm hover:text-white transition-colors">Inicio</button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black">Mis proyectos</h1>
            <p className="text-zinc-400 text-sm mt-1">{projectList.length} proyectos</p>
          </div>
          <button
            onClick={() => setShowNew((v) => !v)}
            className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold px-5 py-3 rounded-xl transition-all text-sm flex items-center gap-2"
          >
            + Nuevo proyecto
          </button>
        </div>

        {/* New project panel */}
        {showNew && (
          <div className="bg-zinc-900 border border-violet-800/50 rounded-2xl p-6 mb-8 space-y-5">
            <h2 className="font-bold text-lg">Nuevo proyecto</h2>

            {/* YouTube URL */}
            <div>
              <p className="text-xs text-zinc-400 font-semibold mb-2 uppercase tracking-wider">Desde YouTube</p>
              <form onSubmit={handleCreate} className="flex gap-3">
                <input
                  type="text" value={url} onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 outline-none focus:border-violet-500 transition-colors"
                />
                <button
                  type="submit" disabled={creating || !url.trim()}
                  className="bg-violet-600 hover:bg-violet-500 text-white font-bold px-6 py-3 rounded-xl transition-all disabled:opacity-50 whitespace-nowrap"
                >
                  {creating && uploadProgress === null ? "Creando..." : "Crear →"}
                </button>
              </form>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-zinc-800" />
              <span className="text-zinc-600 text-xs">o</span>
              <div className="flex-1 h-px bg-zinc-800" />
            </div>

            {/* File upload drop zone */}
            <div>
              <p className="text-xs text-zinc-400 font-semibold mb-2 uppercase tracking-wider">Subir video propio</p>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => !creating && fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  dragOver
                    ? "border-violet-500 bg-violet-950/30"
                    : "border-zinc-700 hover:border-zinc-500 bg-zinc-800/30"
                } ${creating ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {uploadProgress !== null ? (
                  <div className="space-y-3">
                    <p className="text-sm text-zinc-300 font-medium">Subiendo video... {uploadProgress}%</p>
                    <div className="h-2 bg-zinc-700 rounded-full overflow-hidden max-w-xs mx-auto">
                      <div
                        className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="text-4xl mb-3">📁</div>
                    <p className="text-sm font-semibold text-zinc-300 mb-1">Arrastra tu video aquí</p>
                    <p className="text-xs text-zinc-500">o haz clic para seleccionar · mp4, mov, mkv, webm</p>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/quicktime,video/x-msvideo,video/x-matroska,video/webm,.mp4,.mov,.avi,.mkv,.webm,.m4v"
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files?.[0])}
              />
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}
            <p className="text-zinc-600 text-xs">La IA generará hasta 10 clips de máximo 60s automáticamente.</p>
          </div>
        )}

        {/* Projects grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-zinc-500">Cargando...</div>
        ) : projectList.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🎬</div>
            <h3 className="text-xl font-bold mb-2">Aún no tienes proyectos</h3>
            <p className="text-zinc-400 mb-6">Crea tu primer proyecto desde YouTube o sube tu propio video.</p>
            <button
              onClick={() => setShowNew(true)}
              className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold px-6 py-3 rounded-xl"
            >
              + Crear primer proyecto
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {projectList.map((p) => (
              <ProjectCard key={p.id} project={p} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense>
      <DashboardContent />
    </Suspense>
  );
}
