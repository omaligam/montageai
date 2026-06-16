"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

/* ── SVG icons (language-independent) ─────────────── */
const ICONS = [
  <svg key="0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 3.75H6A2.25 2.25 0 003.75 6v1.5M16.5 3.75H18A2.25 2.25 0 0120.25 6v1.5m0 9V18A2.25 2.25 0 0118 20.25h-1.5m-9 0H6A2.25 2.25 0 013.75 18v-1.5M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>,
  <svg key="1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"/></svg>,
  <svg key="2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"/></svg>,
  <svg key="3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5"/></svg>,
  <svg key="4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z"/></svg>,
  <svg key="5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75.125V5.625m0 0A1.125 1.125 0 013.375 4.5h1.5c.621 0 1.125.504 1.125 1.125M3.375 5.625v12.75m17.25-12.75v12.75M6 18.375V5.625m0 0h1.5m-1.5 0c0-.621.504-1.125 1.125-1.125M21 18.375c0 .621-.504 1.125-1.125 1.125h-1.5c-.621 0-1.125-.504-1.125-1.125M21 5.625c0-.621-.504-1.125-1.125-1.125h-1.5C18.754 4.5 18.25 5.004 18.25 5.625M21 5.625v12.75m-3.75.75V5.625"/></svg>,
];

/* ── Translations ──────────────────────────────────── */
const T = {
  en: {
    nav:      { features: "Features", how: "How it works", templates: "Templates", cta: "Start free →" },
    badge:    "New · Web editor with integrated AI",
    h1:       ["Paste the link.", "10 Viral Shorts.", "In minutes."],
    sub:      "MontageAI analyzes your video with AI, detects the moments with the highest viral potential and converts them into ready-to-publish Shorts — subtitles, 9:16 crop, no silences.",
    placeholder: "https://youtube.com/watch?v=...",
    generate: "Generate Clips →",
    trust:    ["100% free", "No card required", "Unlimited videos"],
    scroll:   "Discover more",
    stats: [
      { value: "47,200+", label: "Active creators" },
      { value: "2.1M",    label: "Clips generated" },
      { value: "9.4B",    label: "Views accumulated" },
      { value: "8 min",   label: "Avg per video" },
    ],
    tools_label: "Tools",
    tools_h2:    ["Everything to create content that ", "scales"],
    tools_sub:   "From YouTube to publishable Shorts in minutes, not hours.",
    features: [
      { title: "AI Viral Detector",   desc: "Whisper transcribes and the LLM detects the 10 highest-potential viral moments. 94% accuracy.",           tag: "AI",      tagColor: "text-teal-400 bg-teal-950/60 border-teal-800/50" },
      { title: "Auto-crop 9:16",      desc: "Smart face tracking. Automatically crops and follows faces to Shorts, Reels and TikTok format.",            tag: "Auto",    tagColor: "text-cyan-400 bg-cyan-950/60 border-cyan-800/50" },
      { title: "Animated Subtitles",  desc: "Auto-generated with Whisper. MrBeast, Neon, Minimal or Podcast styles. Word-by-word highlighting.",         tag: "Whisper", tagColor: "text-cyan-300 bg-cyan-950/60 border-cyan-800/50" },
      { title: "Silence Remover",     desc: "Removes pauses and silences with one click. Clip pace increases up to 40% without manual editing.",         tag: "1-click", tagColor: "text-orange-400 bg-orange-950/60 border-orange-800/50" },
      { title: "Audio Enhancer",      desc: "Noise reduction, normalization and voice clarity with one button. Sounds like a professional podcast.",      tag: "Pro",     tagColor: "text-green-400 bg-green-950/60 border-green-800/50" },
      { title: "Timeline Editor",     desc: "Professional multi-layer timeline. Cut, join, add text and transitions. Export in original quality.",         tag: "Editor",  tagColor: "text-blue-400 bg-blue-950/60 border-blue-800/50" },
    ],
    process_label: "Process",
    process_h2:    "That simple",
    steps: [
      { n: "01", t: "Paste the link", d: "YouTube, up to 2 hours of content" },
      { n: "02", t: "AI analyzes",    d: "Whisper + LLM detect the best moments" },
      { n: "03", t: "Edit",           d: "Adjust clips, subtitles and effects in the editor" },
      { n: "04", t: "Export",         d: "9:16 optimized, ready to publish today" },
    ],
    tmpl_label: "Templates",
    tmpl_h2:    "Styles that generate millions",
    tmpl_sub:   "Tested by thousands of creators. Ready in seconds.",
    tmpl_btn:   "Use template →",
    templates: [
      { id: "viral_bold",     name: "Viral Bold",     color: "from-yellow-500 via-orange-500 to-red-500",  label: "MrBeast style",      views: "4.2B views" },
      { id: "neon_glow",      name: "Neon Glow",      color: "from-teal-400 via-cyan-500 to-teal-500",     label: "Gaming / TikTok",    views: "2.8B views" },
      { id: "minimal_clean",  name: "Minimal Clean",  color: "from-slate-600 via-slate-700 to-zinc-800",   label: "Podcast / LinkedIn", views: "1.1B views" },
      { id: "tiktok_viral",   name: "TikTok Viral",   color: "from-pink-500 via-red-500 to-rose-600",      label: "Max engagement",     views: "3.6B views" },
    ],
    testi_label: "Testimonials",
    testi_h2:    ["Creators that use it ", "daily"],
    testimonials: [
      { avatar: "JR", name: "Juan Rodríguez", handle: "@juanrodcreator", subs: "1.2M subs", text: "I went from spending 3 hours per video to 15 minutes. MontageAI detects viral clips better than I do.", color: "from-teal-500 to-cyan-500" },
      { avatar: "SM", name: "Sofía Martínez", handle: "@sofiamarketingg", subs: "820K subs", text: "MrBeast-style subtitles boosted my engagement by 280%. This tool is a true game changer.", color: "from-cyan-500 to-blue-500" },
      { avatar: "CA", name: "Carlos Ávila",   handle: "@carlostech_",    subs: "430K subs", text: "I went from 0 to 430K subs in 8 months using only MontageAI. The Silence Remover is pure magic.", color: "from-orange-500 to-red-500" },
    ],
    cta_badge: "🎉 +47,200 creators already using it — free",
    cta_h2:    ["Your next video", "starts today."],
    cta_sub:   "100% free · No card · Ready in 8 minutes.",
    cta_btn:   "Start for free",
    ticker: [
      "🔥 +47,200 active creators", "📈 9.4B views generated", "⚡ 8 min avg per video",
      "🤖 AI Viral Detector", "✂️ Automatic Silence Remover", "💬 Animated subtitles",
      "📐 Auto-crop 9:16", "🎬 Multi-layer editor",
      "🔥 +47,200 active creators", "📈 9.4B views generated", "⚡ 8 min avg per video",
      "🤖 AI Viral Detector", "✂️ Automatic Silence Remover", "💬 Animated subtitles",
      "📐 Auto-crop 9:16", "🎬 Multi-layer editor",
    ],
    footer_copyright: "© 2025 MontageAI · Powered by Whisper · FFmpeg · FastAPI",
  },
  es: {
    nav:      { features: "Features", how: "Cómo funciona", templates: "Templates", cta: "Empezar gratis →" },
    badge:    "Nuevo · Editor web con IA integrada",
    h1:       ["Pega el link.", "10 Shorts virales.", "En minutos."],
    sub:      "MontageAI analiza tu video con IA, detecta los momentos con más potencial viral y los convierte en Shorts listos para publicar — subtítulos, crop 9:16, sin silencios.",
    placeholder: "https://youtube.com/watch?v=...",
    generate: "Generar Clips →",
    trust:    ["100% gratis", "Sin tarjeta", "Videos ilimitados"],
    scroll:   "Descubre más",
    stats: [
      { value: "47,200+", label: "Creadores activos" },
      { value: "2.1M",    label: "Clips generados" },
      { value: "9.4B",    label: "Views acumuladas" },
      { value: "8 min",   label: "Promedio por video" },
    ],
    tools_label: "Herramientas",
    tools_h2:    ["Todo para crear contenido que ", "escala"],
    tools_sub:   "De YouTube a Shorts publicables en minutos, no horas.",
    features: [
      { title: "Viral Detector con IA",  desc: "Whisper transcribe y el LLM detecta los 10 momentos con mayor potencial viral. Precisión del 94%.",                      tag: "IA",      tagColor: "text-teal-400 bg-teal-950/60 border-teal-800/50" },
      { title: "Auto-crop 9:16",         desc: "Face tracking inteligente. Recorta y sigue los rostros automáticamente al formato Shorts, Reels y TikTok.",              tag: "Auto",    tagColor: "text-cyan-400 bg-cyan-950/60 border-cyan-800/50" },
      { title: "Subtítulos Animados",    desc: "Auto-generados con Whisper. Estilos MrBeast, Neon, Minimal o Podcast. Word-by-word highlighting.",                       tag: "Whisper", tagColor: "text-cyan-300 bg-cyan-950/60 border-cyan-800/50" },
      { title: "Silence Remover",        desc: "Elimina pausas y silencios en un clic. El ritmo del clip aumenta hasta un 40% sin edición manual.",                      tag: "1-clic",  tagColor: "text-orange-400 bg-orange-950/60 border-orange-800/50" },
      { title: "Audio Enhancer",         desc: "Reducción de ruido, normalización y claridad de voz con un solo botón. Suena a podcast profesional.",                    tag: "Pro",     tagColor: "text-green-400 bg-green-950/60 border-green-800/50" },
      { title: "Editor con Timeline",    desc: "Timeline multicapa profesional. Corta, une, añade textos y transiciones. Exporta en calidad original.",                   tag: "Editor",  tagColor: "text-blue-400 bg-blue-950/60 border-blue-800/50" },
    ],
    process_label: "Proceso",
    process_h2:    "Así de simple",
    steps: [
      { n: "01", t: "Pega el link", d: "YouTube, hasta 2 horas de contenido" },
      { n: "02", t: "IA analiza",   d: "Whisper + LLM detectan los mejores momentos" },
      { n: "03", t: "Edita",        d: "Ajusta clips, subtítulos y efectos en el editor" },
      { n: "04", t: "Exporta",      d: "9:16 optimizado, listo para publicar hoy" },
    ],
    tmpl_label: "Templates",
    tmpl_h2:    "Estilos que generan millones",
    tmpl_sub:   "Probados por miles de creadores. Listos en segundos.",
    tmpl_btn:   "Usar template →",
    templates: [
      { id: "viral_bold",     name: "Viral Bold",     color: "from-yellow-500 via-orange-500 to-red-500",  label: "MrBeast style",      views: "4.2B vistas" },
      { id: "neon_glow",      name: "Neon Glow",      color: "from-teal-400 via-cyan-500 to-teal-500",     label: "Gaming / TikTok",    views: "2.8B vistas" },
      { id: "minimal_clean",  name: "Minimal Clean",  color: "from-slate-600 via-slate-700 to-zinc-800",   label: "Podcast / LinkedIn", views: "1.1B vistas" },
      { id: "tiktok_viral",   name: "TikTok Viral",   color: "from-pink-500 via-red-500 to-rose-600",      label: "Max engagement",     views: "3.6B vistas" },
    ],
    testi_label: "Testimonios",
    testi_h2:    ["Creadores que lo usan ", "a diario"],
    testimonials: [
      { avatar: "JR", name: "Juan Rodríguez", handle: "@juanrodcreator", subs: "1.2M subs", text: "Pasé de tardar 3 horas por video a 15 minutos. MontageAI detecta los clips virales mejor que yo.", color: "from-teal-500 to-cyan-500" },
      { avatar: "SM", name: "Sofía Martínez", handle: "@sofiamarketingg", subs: "820K subs", text: "Los subtítulos estilo MrBeast dispararon mi engagement un 280%. Esta herramienta es un antes y un después.", color: "from-cyan-500 to-blue-500" },
      { avatar: "CA", name: "Carlos Ávila",   handle: "@carlostech_",    subs: "430K subs", text: "Subí de 0 a 430K subs en 8 meses usando solo MontageAI. El Silence Remover es magia pura.", color: "from-orange-500 to-red-500" },
    ],
    cta_badge: "🎉 +47,200 creadores ya lo usan — gratis",
    cta_h2:    ["Tu próximo video", "empieza hoy."],
    cta_sub:   "100% gratuito · Sin tarjeta · Listo en 8 minutos.",
    cta_btn:   "Empezar gratis",
    ticker: [
      "🔥 +47,200 creadores activos", "📈 9.4B views generadas", "⚡ 8 min promedio por video",
      "🤖 IA Viral Detector", "✂️ Silence Remover automático", "💬 Subtítulos animados",
      "📐 Auto-crop 9:16", "🎬 Editor multicapa",
      "🔥 +47,200 creadores activos", "📈 9.4B views generadas", "⚡ 8 min promedio por video",
      "🤖 IA Viral Detector", "✂️ Silence Remover automático", "💬 Subtítulos animados",
      "📐 Auto-crop 9:16", "🎬 Editor multicapa",
    ],
    footer_copyright: "© 2025 MontageAI · Powered by Whisper · FFmpeg · FastAPI",
  },
};

/* ── Language toggle ───────────────────────────────── */
function LangToggle({ lang, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-all"
      title={lang === "en" ? "Switch to Spanish" : "Cambiar a inglés"}
    >
      <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 .34-.028.675-.083 1H15a2 2 0 00-2 2v2.197A5.973 5.973 0 0110 16v-2a2 2 0 00-2-2 2 2 0 01-2-2 2 2 0 00-1.668-1.973z" clipRule="evenodd"/>
      </svg>
      {lang === "en" ? "ES" : "EN"}
    </button>
  );
}

/* ── Main ──────────────────────────────────────────── */
export default function LandingPage() {
  const [url, setUrl]       = useState("");
  const [scrolled, setScrolled] = useState(false);
  const [lang, setLang]     = useState("en");

  // Persist language preference
  useEffect(() => {
    const saved = localStorage.getItem("montageai_lang");
    if (saved === "en" || saved === "es") setLang(saved);
  }, []);

  const toggleLang = () => {
    const next = lang === "en" ? "es" : "en";
    setLang(next);
    localStorage.setItem("montageai_lang", next);
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const t = T[lang];

  return (
    <main className="min-h-screen bg-black text-white overflow-x-hidden">

      {/* ── Nav ──────────────────────────────────────── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-black/90 backdrop-blur-xl border-b border-white/8 shadow-2xl" : "bg-transparent"
      }`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center font-black text-sm shadow-lg shadow-teal-900/50">M</div>
            <div className="flex flex-col leading-none">
              <span className="font-black text-xl tracking-tight bg-gradient-to-r from-teal-300 to-cyan-300 bg-clip-text text-transparent">MontageAI</span>
              <span className="text-[10px] text-zinc-600 font-medium">by @omaligam</span>
            </div>
          </div>
          {/* Links */}
          <div className="hidden md:flex items-center gap-8 text-sm text-zinc-400">
            <a href="#features"   className="hover:text-white transition-colors">{t.nav.features}</a>
            <a href="#how"        className="hover:text-white transition-colors">{t.nav.how}</a>
            <a href="#templates"  className="hover:text-white transition-colors">{t.nav.templates}</a>
          </div>
          {/* Actions */}
          <div className="flex items-center gap-2">
            <LangToggle lang={lang} onToggle={toggleLang} />
            <Link href="/dashboard" className="btn-glow text-white font-semibold text-sm px-5 py-2.5 rounded-xl">
              {t.nav.cta}
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center pt-24 pb-20 px-4 overflow-hidden">
        <div className="orb w-[600px] h-[600px] bg-teal-700/20 -top-32 -left-48" />
        <div className="orb w-[500px] h-[500px] bg-cyan-700/15 top-24 -right-36 animate-float-slow" />
        <div className="orb w-[350px] h-[350px] bg-teal-600/10 bottom-10 left-1/3" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(13,148,136,0.03)_1px,transparent_1px),linear-gradient(to_right,rgba(13,148,136,0.03)_1px,transparent_1px)] bg-[size:60px_60px] pointer-events-none" />

        <div className="relative max-w-5xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-teal-950/70 border border-teal-700/40 rounded-full px-4 py-1.5 text-xs text-teal-300 mb-8 font-medium backdrop-blur-sm animate-slide-up">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
            </span>
            {t.badge}
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tight mb-6 leading-[1.02] animate-slide-up" style={{ animationDelay: "80ms" }}>
            <span className="block text-white">{t.h1[0]}</span>
            <span className="block gradient-text-animated mt-1">{t.h1[1]}</span>
            <span className="block text-white mt-1">{t.h1[2]}</span>
          </h1>

          <p className="text-lg sm:text-xl text-zinc-400 mb-10 max-w-2xl mx-auto leading-relaxed animate-slide-up" style={{ animationDelay: "160ms" }}>
            {t.sub}
          </p>

          {/* CTA input */}
          <div className="flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto mb-5 animate-slide-up" style={{ animationDelay: "240ms" }}>
            <input
              type="text" value={url} onChange={(e) => setUrl(e.target.value)}
              placeholder={t.placeholder}
              className="flex-1 bg-zinc-900/80 border border-zinc-700/80 rounded-xl px-5 py-4 text-white placeholder-zinc-600 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 transition-all backdrop-blur-sm"
            />
            <Link
              href={url ? `/dashboard?url=${encodeURIComponent(url)}` : "/dashboard"}
              className="btn-glow text-white font-bold px-8 py-4 rounded-xl text-base whitespace-nowrap"
            >
              {t.generate}
            </Link>
          </div>

          {/* Trust */}
          <div className="flex flex-wrap items-center justify-center gap-5 text-zinc-600 text-xs animate-slide-up" style={{ animationDelay: "320ms" }}>
            {t.trust.map((item) => (
              <span key={item} className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                </svg>
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 text-zinc-700 text-xs animate-fade-in" style={{ animationDelay: "700ms" }}>
          <span>{t.scroll}</span>
          <svg className="w-4 h-4 animate-bounce" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
          </svg>
        </div>
      </section>

      {/* ── Ticker ───────────────────────────────────── */}
      <div className="border-y border-zinc-900 bg-zinc-950/60 py-3 overflow-hidden">
        <div className="flex animate-ticker whitespace-nowrap gap-12">
          {t.ticker.map((item, i) => (
            <span key={i} className="text-zinc-500 text-sm font-medium shrink-0">{item}</span>
          ))}
        </div>
      </div>

      {/* ── Stats ────────────────────────────────────── */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="glass rounded-3xl p-10 sm:p-14">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
              {t.stats.map((s) => (
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
          <p className="text-teal-400 text-sm font-semibold tracking-widest uppercase mb-3">{t.tools_label}</p>
          <h2 className="text-4xl sm:text-5xl font-black mb-4 tracking-tight">
            {t.tools_h2[0]}<span className="shimmer-text">{t.tools_h2[1]}</span>
          </h2>
          <p className="text-zinc-400 text-lg max-w-xl mx-auto">{t.tools_sub}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {t.features.map((f, i) => (
            <div key={f.title} className="card-lift glass rounded-2xl p-6 group cursor-default">
              <div className="flex items-start justify-between mb-5">
                <div className="w-12 h-12 rounded-xl bg-teal-950/60 border border-teal-800/40 flex items-center justify-center text-teal-400 group-hover:text-cyan-300 transition-colors">
                  {ICONS[i]}
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
            <p className="text-teal-400 text-sm font-semibold tracking-widest uppercase mb-3">{t.process_label}</p>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight">{t.process_h2}</h2>
          </div>
          <div className="relative">
            <div className="hidden lg:block absolute top-12 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-teal-800/40 to-transparent" />
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
              {t.steps.map((s) => (
                <div key={s.n} className="flex flex-col items-center text-center group">
                  <div className="relative mb-5">
                    <div className="w-24 h-24 rounded-2xl glass-purple flex items-center justify-center text-3xl group-hover:scale-110 transition-transform duration-300">
                      {["🔗","🧠","✂️","🚀"][parseInt(s.n)-1]}
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
          <p className="text-teal-400 text-sm font-semibold tracking-widest uppercase mb-3">{t.tmpl_label}</p>
          <h2 className="text-4xl sm:text-5xl font-black mb-4 tracking-tight">{t.tmpl_h2}</h2>
          <p className="text-zinc-400 text-lg">{t.tmpl_sub}</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {t.templates.map((tmpl) => (
            <Link key={tmpl.id} href="/dashboard" className="group">
              <div className="aspect-[9/16] rounded-2xl overflow-hidden relative card-lift border border-zinc-800">
                <div className={`absolute inset-0 bg-gradient-to-b ${tmpl.color} opacity-80 group-hover:opacity-100 transition-opacity`} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <div className="text-xs text-white/50 mb-0.5 font-medium">{tmpl.views}</div>
                  <div className="font-bold text-white text-sm">{tmpl.name}</div>
                  <div className="text-xs text-white/60">{tmpl.label}</div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <div className="bg-black/40 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 text-sm font-semibold text-white">
                    {t.tmpl_btn}
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
            <p className="text-teal-400 text-sm font-semibold tracking-widest uppercase mb-3">{t.testi_label}</p>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight">
              {t.testi_h2[0]}<span className="shimmer-text">{t.testi_h2[1]}</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {t.testimonials.map((tst) => (
              <div key={tst.handle} className="card-lift glass rounded-2xl p-6 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${tst.color} flex items-center justify-center font-black text-sm shrink-0`}>
                    {tst.avatar}
                  </div>
                  <div>
                    <div className="font-bold text-sm">{tst.name}</div>
                    <div className="text-zinc-500 text-xs">{tst.handle} · {tst.subs}</div>
                  </div>
                </div>
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <svg key={i} className="w-4 h-4 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                    </svg>
                  ))}
                </div>
                <p className="text-zinc-300 text-sm leading-relaxed">"{tst.text}"</p>
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
            {t.cta_badge}
          </div>
          <h2 className="text-5xl sm:text-7xl font-black tracking-tight mb-6 leading-[1.05]">
            {t.cta_h2[0]}<br />
            <span className="gradient-text-animated">{t.cta_h2[1]}</span>
          </h2>
          <p className="text-zinc-400 text-xl mb-10">{t.cta_sub}</p>
          <Link
            href="/dashboard"
            className="btn-glow inline-flex items-center gap-2 text-white font-bold text-lg px-12 py-5 rounded-2xl"
          >
            {t.cta_btn}
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
            <div className="flex flex-col leading-none">
              <span className="font-black text-lg bg-gradient-to-r from-teal-300 to-cyan-300 bg-clip-text text-transparent">MontageAI</span>
              <span className="text-[10px] text-zinc-700 font-medium">by @omaligam</span>
            </div>
          </div>
          <div className="flex items-center gap-8 text-zinc-600 text-sm">
            <a href="#features"  className="hover:text-zinc-400 transition-colors">{t.nav.features}</a>
            <a href="#templates" className="hover:text-zinc-400 transition-colors">{t.nav.templates}</a>
            <Link href="/dashboard" className="hover:text-zinc-400 transition-colors">Dashboard</Link>
          </div>
          <div className="flex items-center gap-3">
            <LangToggle lang={lang} onToggle={toggleLang} />
            <div className="text-zinc-700 text-xs">{t.footer_copyright}</div>
          </div>
        </div>
      </footer>
    </main>
  );
}
