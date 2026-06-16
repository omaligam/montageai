"use client";
import { useState } from "react";
import Link from "next/link";

const FEATURES = [
  {
    icon: "✂️",
    title: "Editor con Timeline",
    desc:  "Corta, une y reordena clips con un editor profesional. Capas de video, audio y texto.",
  },
  {
    icon: "🤖",
    title: "IA Viral Detector",
    desc:  "Whisper + LLM detectan los 10 momentos más virales de cualquier video de YouTube.",
  },
  {
    icon: "💬",
    title: "Subtítulos Animados",
    desc:  "Auto-generados con Whisper, estilo MrBeast, neon, minimal o podcast.",
  },
  {
    icon: "🔇",
    title: "Silence Remover",
    desc:  "Elimina silencios automáticamente. El clip queda compacto y de mayor ritmo.",
  },
  {
    icon: "📐",
    title: "Auto-crop 9:16",
    desc:  "Detecta rostros y recorta automáticamente al formato Shorts/Reels/TikTok.",
  },
  {
    icon: "🎵",
    title: "Audio Enhancer",
    desc:  "Reduce ruido, normaliza volumen y mejora la claridad de voz con un click.",
  },
];

const TEMPLATES = [
  { id: "viral_bold",  name: "Viral Bold",    color: "from-yellow-500 to-orange-500",  label: "MrBeast style" },
  { id: "neon_glow",   name: "Neon Glow",     color: "from-cyan-500 to-purple-500",    label: "Gaming / TikTok" },
  { id: "minimal_clean",name: "Minimal",      color: "from-gray-600 to-gray-800",      label: "LinkedIn / Podcast" },
  { id: "tiktok_viral",name: "TikTok Viral",  color: "from-pink-500 to-red-500",       label: "Max engagement" },
];

export default function LandingPage() {
  const [url, setUrl]     = useState("");
  const [email, setEmail] = useState("");

  return (
    <main className="min-h-screen bg-black text-white overflow-x-hidden">
      {/* ── Nav ─────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-black/80 backdrop-blur border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center font-black text-sm">M</div>
          <span className="font-black text-lg tracking-tight bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">MontageAI</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-sm bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold px-4 py-2 rounded-lg transition-all">
            Entrar
          </Link>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="pt-32 pb-20 px-4 text-center relative">
        <div className="absolute inset-0 bg-gradient-to-b from-violet-950/30 via-transparent to-transparent pointer-events-none" />
        <div className="relative max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-violet-950/60 border border-violet-700/50 rounded-full px-4 py-1.5 text-xs text-violet-300 mb-6 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Ahora con Editor Web Completo
          </div>
          <h1 className="text-5xl sm:text-7xl font-black tracking-tight mb-6 leading-none">
            <span className="block">Pega el link.</span>
            <span className="block bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
              Obtén 10 Shorts virales.
            </span>
          </h1>
          <p className="text-xl text-zinc-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            MontageAI analiza tu video con IA, detecta los momentos más virales y los convierte en Shorts listos para publicar — con subtítulos, crop 9:16 y sin silencios.
          </p>

          {/* CTA input */}
          <div className="flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto mb-4">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-5 py-4 text-white placeholder-zinc-500 outline-none focus:border-violet-500 transition-colors"
            />
            <Link
              href={url ? `/dashboard?url=${encodeURIComponent(url)}` : "/dashboard"}
              className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold px-8 py-4 rounded-xl transition-all whitespace-nowrap"
            >
              Generar Clips →
            </Link>
          </div>
          <p className="text-zinc-600 text-sm">100% gratis · Sin tarjeta · Videos ilimitados</p>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────── */}
      <section className="py-20 px-4 max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-black mb-3">Todo lo que necesitas para crear contenido viral</h2>
          <p className="text-zinc-400 text-lg">De YouTube a Shorts publicables en minutos, no horas.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 hover:border-violet-700/50 transition-colors group">
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className="font-bold text-lg mb-2 group-hover:text-violet-300 transition-colors">{f.title}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────── */}
      <section className="py-20 px-4 bg-zinc-950/50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-black mb-14">Cómo funciona</h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
            {[
              { n: "1", t: "Pega el link", d: "Cualquier video de YouTube, hasta 2 horas" },
              { n: "2", t: "IA analiza",   d: "Whisper transcribe, LLM detecta los mejores momentos" },
              { n: "3", t: "Edita",        d: "Ajusta en el editor, agrega subtítulos y efectos" },
              { n: "4", t: "Exporta",      d: "Descarga en 9:16, listo para publicar" },
            ].map((s) => (
              <div key={s.n} className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center font-black text-xl mb-4">{s.n}</div>
                <h3 className="font-bold mb-1">{s.t}</h3>
                <p className="text-zinc-400 text-sm">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Templates ────────────────────────────────────────── */}
      <section className="py-20 px-4 max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-black mb-3">Templates listos para usar</h2>
          <p className="text-zinc-400">Estilos probados que generan millones de vistas.</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {TEMPLATES.map((t) => (
            <div key={t.id} className="aspect-[9/16] rounded-2xl overflow-hidden relative group cursor-pointer">
              <div className={`w-full h-full bg-gradient-to-b ${t.color} opacity-80 group-hover:opacity-100 transition-opacity`} />
              <div className="absolute inset-0 flex flex-col items-center justify-end p-4">
                <div className="bg-black/60 backdrop-blur rounded-xl px-3 py-2 text-center">
                  <div className="font-bold text-sm">{t.name}</div>
                  <div className="text-xs text-zinc-300">{t.label}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className="py-24 px-4 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-violet-950/40 to-fuchsia-950/40 pointer-events-none" />
        <div className="relative max-w-2xl mx-auto">
          <h2 className="text-4xl sm:text-5xl font-black mb-6">Empieza a crear hoy.</h2>
          <p className="text-zinc-400 text-lg mb-8">100% gratuito. Sin tarjeta. Sin límites.</p>
          <Link href="/dashboard" className="inline-block bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold text-lg px-10 py-5 rounded-2xl transition-all shadow-lg shadow-violet-900/40">
            Empezar ahora →
          </Link>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="border-t border-zinc-900 py-8 px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-zinc-600 text-sm">
        <span>© 2025 MontageAI</span>
        <span>Powered by Whisper · Ollama · FFmpeg</span>
      </footer>
    </main>
  );
}
