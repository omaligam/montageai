"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";

/* ── Data ──────────────────────────────────────────── */
const STATS = [
  { value: "47,200+", label: "Creadores activos" },
  { value: "2.1M",    label: "Clips generados" },
  { value: "9.4B",    label: "Views acumuladas" },
  { value: "8 min",   label: "Promedio por video" },
];

const FEATURES = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 3.75H6A2.25 2.25 0 003.75 6v1.5M16.5 3.75H18A2.25 2.25 0 0120.25 6v1.5m0 9V18A2.25 2.25 0 0118 20.25h-1.5m-9 0H6A2.25 2.25 0 013.75 18v-1.5M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
      </svg>
    ),
    title: "Viral Detector con IA",
    desc: "Whisper transcribe y el LLM detecta los 10 momentos con mayor potencial viral. Precisión del 94%.",
    tag: "IA",
    tagColor: "text-teal-400 bg-teal-950/60 border-teal-800/50",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"/>
      </svg>
    ),
    title: "Auto-crop 9:16",
    desc: "Face tracking inteligente. Recorta y sigue los rostros automáticamente al formato Shorts, Reels y TikTok.",
    tag: "Auto",
    tagColor: "text-cyan-400 bg-cyan-950/60 border-cyan-800/50",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"/>
      </svg>
    ),
    title: "Subtítulos Animados",
    desc: "Auto-generados con Whisper. Estilos MrBeast, Neon, Minimal o Podcast. Word-by-word highlighting.",
    tag: "Whisper",
    tagColor: "text-cyan-300 bg-cyan-950/60 border-cyan-800/50",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5"/>
      </svg>
    ),
    title: "Silence Remover",
    desc: "Elimina pausas y silencios en un clic. El ritmo del clip aumenta hasta un 40% sin edición manual.",
    tag: "1-clic",
    tagColor: "text-orange-400 bg-orange-950/60 border-orange-800/50",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z"/>
      </svg>
    ),
    title: "Audio Enhancer",
    desc: "Reducción de ruido, normalización y claridad de voz con un solo botón. Suena a podcast profesional.",
    tag: "Pro",
    tagColor: "text-green-400 bg-green-950/60 border-green-800/50",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75.125V5.625m0 0A1.125 1.125 0 013.375 4.5h1.5c.621 0 1.125.504 1.125 1.125M3.375 5.625v12.75m17.25-12.75v12.75M6 18.375V5.625m0 0h1.5m-1.5 0c0-.621.504-1.125 1.125-1.125M21 18.375c0 .621-.504 1.125-1.125 1.125h-1.5c-.621 0-1.125-.504-1.125-1.125M21 5.625c0-.621-.504-1.125-1.125-1.125h-1.5C18.754 4.5 18.25 5.004 18.25 5.625M21 5.625v12.75m-3.75.75V5.625"/>
      </svg>
    ),
    title: "Editor con Timeline",
    desc: "Timeline multicapa profesional. Corta, une, añade textos y transiciones. Exporta en calidad original.",
    tag: "Editor",
    tagColor: "text-blue-400 bg-blue-950/60 border-blue-800/50",
  },
];

const TESTIMONIALS = [
  {
    avatar: "JR",
    name: "Juan Rodríguez",
    handle: "@juanrodcreator",
    subs: "1.2M subs",
    text: "Pasé de tardar 3 horas por video a 15 minutos. MontageAI detecta los clips virales mejor que yo.",
    color: "from-teal-500 to-cyan-500",
  },
  {
    avatar: "SM",
    name: "Sofía Martínez",
    handle: "@sofiamarketingg",
    subs: "820K subs",
    text: "Los subtítulos estilo MrBeast dispararon mi engagement un 280%. Esta herramienta es un antes y un después.",
    color: "from-cyan-500 to-blue-500",
  },
  {
    avatar: "CA",
    name: "Carlos Ávila",
    handle: "@carlostech_",
    subs: "430K subs",
    text: "Subí de 0 a 430K subs en 8 meses usando solo MontageAI. El Silence Remover es magia pura.",
    color: "from-orange-500 to-red-500",
  },
];

const TEMPLATES = [
  { id: "viral_bold",    name: "Viral Bold",    color: "from-yellow-500 via-orange-500 to-red-500",   label: "MrBeast style",    views: "4.2B vistas" },
  { id: "neon_glow",    name: "Neon Glow",     color: "from-teal-400 via-cyan-500 to-teal-500",      label: "Gaming / TikTok",  views: "2.8B vistas" },
  { id: "minimal_clean",name: "Minimal Clean", color: "from-slate-600 via-slate-700 to-zinc-800",    label: "Podcast / LinkedIn",views: "1.1B vistas" },
  { id: "tiktok_viral", name: "TikTok Viral",  color: "from-pink-500 via-red-500 to-rose-600",       label: "Max engagement",   views: "3.6B vistas" },
];

const TICKER_ITEMS = [
  "🔥 +47,200 creadores activos",
  "📈 9.4B views generadas",
  "⚡ 8 min promedio por video",
  "🤖 IA Viral Detector",
  "✂️ Silence Remover automático",
  "💬 Subtítulos animados",
  "📐 Auto-crop 9:16",
  "🎬 Editor multicapa",
  "🔥 +47,200 creadores activos",
  "📈 9.4B views generadas",
  "⚡ 8 min promedio por video",
  "🤖 IA Viral Detector",
  "✂️ Silence Remover automático",
  "💬 Subtítulos animados",
  "📐 Auto-crop 9:16",
  "🎬 Editor multicapa",
];

/* ── Main ──────────────────────────────────────────── */
export default function LandingPage() {
  const [url, setUrl] = useState("");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <main className="min-h-screen bg-black text-white overflow-x-hidden">

      {/* ── Nav ──────────────────────────────────────── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-black/90 backdrop-blur-xl border-b border-white/8 shadow-2xl" : "bg-transparent"
      }`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center font-black text-sm shadow-lg shadow-teal-900/50">M</div>
            <span className="font-black text-xl tracking-tight bg-gradient-to-r from-teal-300 to-cyan-300 bg-clip-text text-transparent">MontageAI</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-zinc-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how" className="hover:text-white transition-colors">Cómo funciona</a>
            <a href="#templates" className="hover:text-white transition-colors">Templates</a>
          </div>
          <Link href="/dashboard" className="btn-glow text-white font-semibold text-sm px-5 py-2.5 rounded-xl">
            Empezar gratis →
          </Link>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center pt-24 pb-20 px-4 overflow-hidden">
        {/* Background orbs */}
        <div className="orb w-[600px] h-[600px] bg-teal-700/20 -top-32 -left-48" />
        <div className="orb w-[500px] h-[500px] bg-cyan-700/15 top-24 -right-36 animate-float-slow" />
        <div className="orb w-[350px] h-[350px] bg-teal-600/10 bottom-10 left-1/3" />
        {/* Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(13,148,136,0.03)_1px,transparent_1px),linear-gradient(to_right,rgba(13,148,136,0.03)_1px,transparent_1px)] bg-[size:60px_60px] pointer-events-none" />

        <div className="relative max-w-5xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-teal-950/70 border border-teal-700/40 rounded-full px-4 py-1.5 text-xs text-teal-300 mb-8 font-medium backdrop-blur-sm animate-slide-up">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
            </span>
            Nuevo · Editor web con IA integrada
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tight mb-6 leading-[1.02] animate-slide-up" style={{ animationDelay: "80ms" }}>
            <span className="block text-white">Pega el link.</span>
            <span className="block gradient-text-animated mt-1">10 Shorts virales.</span>
            <span className="block text-white mt-1">En minutos.</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-zinc-400 mb-10 max-w-2xl mx-auto leading-relaxed animate-slide-up" style={{ animationDelay: "160ms" }}>
            MontageAI analiza tu video con IA, detecta los momentos con más potencial viral
            y los convierte en Shorts listos para publicar — subtítulos, crop 9:16, sin silencios.
          </p>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto mb-5 animate-slide-up" style={{ animationDelay: "240ms" }}>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              className="flex-1 bg-zinc-900/80 border border-zinc-700/80 rounded-xl px-5 py-4 text-white placeholder-zinc-600 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 transition-all backdrop-blur-sm"
            />
            <Link
              href={url ? `/dashboard?url=${encodeURIComponent(url)}` : "/dashboard"}
              className="btn-glow text-white font-bold px-8 py-4 rounded-xl text-base whitespace-nowrap"
            >
              Generar Clips →
            </Link>
          </div>

          {/* Trust signals */}
          <div className="flex flex-wrap items-center justify-center gap-5 text-zinc-600 text-xs animate-slide-up" style={{ animationDelay: "320ms" }}>
            {["100% gratis", "Sin tarjeta", "Videos ilimitados"].map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                </svg>
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 text-zinc-700 text-xs animate-fade-in" style={{ animationDelay: "700ms" }}>
          <span>Descubre más</span>
          <svg className="w-4 h-4 animate-bounce" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
          </svg>
        </div>
      </section>

      {/* ── Ticker ───────────────────────────────────── */}
      <div className="border-y border-zinc-900 bg-zinc-950/60 py-3 overflow-hidden">
        <div className="flex animate-ticker whitespace-nowrap gap-12">
          {TICKER_ITEMS.map((item, i) => (
            <span key={i} className="text-zinc-500 text-sm font-medium shrink-0">{item}</span>
          ))}
        </div>
      </div>

      {/* ── Stats ────────────────────────────────────── */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="glass rounded-3xl p-10 sm:p-14">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
              {STATS.map((s) => (
                <div key={s.label} className="text-center">
                  <div className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-teal-300 to-cyan-300 bg-clip-text text-transparent mb-1.5">
                    {s.value}
                  </div>
                  <div className="text-zinc-500 text-sm font-medium">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────── */}
      <section id="features" className="py-20 px-4 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-teal-400 text-sm font-semibold tracking-widest uppercase mb-3">Herramientas</p>
          <h2 className="text-4xl sm:text-5xl font-black mb-4 tracking-tight">
            Todo para crear contenido que <span className="shimmer-text">escala</span>
          </h2>
          <p className="text-zinc-400 text-lg max-w-xl mx-auto">De YouTube a Shorts publicables en minutos, no horas.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <div key={f.title} className="card-lift glass rounded-2xl p-6 group cursor-default">
              <div className="flex items-start justify-between mb-5">
                <div className="w-12 h-12 rounded-xl bg-teal-950/60 border border-teal-800/40 flex items-center justify-center text-teal-400 group-hover:text-cyan-300 transition-colors">
                  {f.icon}
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${f.tagColor}`}>
                  {f.tag}
                </span>
              </div>
              <h3 className="font-bold text-lg mb-2 group-hover:text-teal-300 transition-colors">{f.title}</h3>
              <p className="text-zinc-500 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ─────────────────────────────── */}
      <section id="how" className="py-24 px-4 relative overflow-hidden">
        <div className="orb w-[400px] h-[400px] bg-teal-800/10 -top-10 -right-20" />
        <div className="max-w-5xl mx-auto relative">
          <div className="text-center mb-16">
            <p className="text-teal-400 text-sm font-semibold tracking-widest uppercase mb-3">Proceso</p>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight">Así de simple</h2>
          </div>
          <div className="relative">
            <div className="hidden lg:block absolute top-12 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-teal-800/40 to-transparent" />
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
              {[
                { n: "01", t: "Pega el link",  d: "YouTube, hasta 2 horas de contenido", icon: "🔗" },
                { n: "02", t: "IA analiza",    d: "Whisper + LLM detectan los mejores momentos", icon: "🧠" },
                { n: "03", t: "Edita",         d: "Ajusta clips, subtítulos y efectos en el editor", icon: "✂️" },
                { n: "04", t: "Exporta",       d: "9:16 optimizado, listo para publicar hoy", icon: "🚀" },
              ].map((s) => (
                <div key={s.n} className="flex flex-col items-center text-center group">
                  <div className="relative mb-5">
                    <div className="w-24 h-24 rounded-2xl glass-purple flex items-center justify-center text-3xl group-hover:scale-110 transition-transform duration-300">
                      {s.icon}
                    </div>
                    <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center text-xs font-black shadow-lg shadow-teal-900/50">
                      {s.n.slice(-1)}
                    </div>
                  </div>
                  <h3 className="font-bold text-lg mb-2 group-hover:text-teal-300 transition-colors">{s.t}</h3>
                  <p className="text-zinc-500 text-sm leading-relaxed">{s.d}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Templates ────────────────────────────────── */}
      <section id="templates" className="py-20 px-4 max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-teal-400 text-sm font-semibold tracking-widest uppercase mb-3">Templates</p>
          <h2 className="text-4xl sm:text-5xl font-black mb-4 tracking-tight">Estilos que generan millones</h2>
          <p className="text-zinc-400 text-lg">Probados por miles de creadores. Listos en segundos.</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {TEMPLATES.map((t) => (
            <Link key={t.id} href="/dashboard" className="group">
              <div className="aspect-[9/16] rounded-2xl overflow-hidden relative card-lift border border-zinc-800">
                <div className={`absolute inset-0 bg-gradient-to-b ${t.color} opacity-80 group-hover:opacity-100 transition-opacity`} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <div className="text-xs text-white/50 mb-0.5 font-medium">{t.views}</div>
                  <div className="font-bold text-white text-sm">{t.name}</div>
                  <div className="text-xs text-white/60">{t.label}</div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <div className="bg-black/40 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 text-sm font-semibold text-white">
                    Usar template →
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────── */}
      <section className="py-24 px-4 relative overflow-hidden">
        <div className="orb w-[500px] h-[500px] bg-cyan-800/10 -bottom-24 -left-24" />
        <div className="max-w-6xl mx-auto relative">
          <div className="text-center mb-14">
            <p className="text-teal-400 text-sm font-semibold tracking-widest uppercase mb-3">Testimonios</p>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight">
              Creadores que lo usan <span className="shimmer-text">a diario</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div key={t.handle} className="card-lift glass rounded-2xl p-6 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center font-black text-sm shrink-0`}>
                    {t.avatar}
                  </div>
                  <div>
                    <div className="font-bold text-sm">{t.name}</div>
                    <div className="text-zinc-500 text-xs">{t.handle} · {t.subs}</div>
                  </div>
                </div>
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <svg key={i} className="w-4 h-4 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                    </svg>
                  ))}
                </div>
                <p className="text-zinc-300 text-sm leading-relaxed">"{t.text}"</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────── */}
      <section className="py-28 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-teal-950/20 to-transparent pointer-events-none" />
        <div className="orb w-[700px] h-[700px] bg-teal-700/12 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        <div className="relative max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-teal-950/60 border border-teal-700/40 rounded-full px-4 py-1.5 text-xs text-teal-300 mb-8 font-medium backdrop-blur">
            🎉 +47,200 creadores ya lo usan — gratis
          </div>
          <h2 className="text-5xl sm:text-7xl font-black tracking-tight mb-6 leading-[1.05]">
            Tu próximo video<br />
            <span className="gradient-text-animated">empieza hoy.</span>
          </h2>
          <p className="text-zinc-400 text-xl mb-10">100% gratuito · Sin tarjeta · Listo en 8 minutos.</p>
          <Link
            href="/dashboard"
            className="btn-glow inline-flex items-center gap-2 text-white font-bold text-lg px-12 py-5 rounded-2xl"
          >
            Empezar gratis
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd"/>
            </svg>
          </Link>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────── */}
      <footer className="border-t border-zinc-900/80 py-10 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center font-black text-sm">M</div>
            <span className="font-black text-lg bg-gradient-to-r from-teal-300 to-cyan-300 bg-clip-text text-transparent">MontageAI</span>
          </div>
          <div className="flex items-center gap-8 text-zinc-600 text-sm">
            <a href="#features" className="hover:text-zinc-400 transition-colors">Features</a>
            <a href="#templates" className="hover:text-zinc-400 transition-colors">Templates</a>
            <Link href="/dashboard" className="hover:text-zinc-400 transition-colors">Dashboard</Link>
          </div>
          <div className="text-zinc-700 text-xs">© 2025 MontageAI · Powered by Whisper · FFmpeg · FastAPI</div>
        </div>
      </footer>
    </main>
  );
}
