"use client";
import { useState } from "react";

export default function ClipCard({ clip, index }) {
  const [imgError, setImgError] = useState(false);

  function handleDownload() {
    const a = document.createElement("a");
    a.href = clip.download_url;
    a.download = `short_${index}_${clip.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.mp4`;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  const scoreColor =
    clip.score >= 9
      ? "text-green-400"
      : clip.score >= 7
      ? "text-yellow-400"
      : "text-zinc-400";

  const durationStr = clip.duration
    ? `${Math.floor(clip.duration)}s`
    : "";

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col hover:border-teal-700 transition-colors group">
      {/* Thumbnail / Preview */}
      <div className="relative bg-zinc-800 aspect-[9/16] overflow-hidden">
        {!imgError && clip.thumbnail_url ? (
          <img
            src={clip.thumbnail_url}
            alt={clip.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-teal-900/40 to-cyan-900/40">
            <div className="text-5xl mb-2">🎬</div>
            <span className="text-zinc-500 text-xs">Short #{index}</span>
          </div>
        )}

        {/* Score badge */}
        <div className="absolute top-2 right-2 bg-black/70 backdrop-blur rounded-lg px-2 py-1">
          <span className={`text-xs font-bold ${scoreColor}`}>
            ★ {clip.score?.toFixed(1)}
          </span>
        </div>

        {/* Duration badge */}
        {durationStr && (
          <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur rounded-lg px-2 py-1">
            <span className="text-xs text-zinc-300">{durationStr}</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col flex-1 p-4 gap-3">
        <div>
          <div className="text-xs text-teal-400 font-semibold mb-1 uppercase tracking-wide">
            Short #{index}
          </div>
          <h3 className="text-sm font-bold text-white leading-snug line-clamp-2">
            {clip.title}
          </h3>
        </div>

        {clip.hook && (
          <p className="text-xs text-zinc-400 leading-relaxed line-clamp-3">
            {clip.hook}
          </p>
        )}

        {/* Download */}
        <button
          onClick={handleDownload}
          className="mt-auto w-full btn-glow text-white text-sm font-semibold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2"
        >
          <DownloadIcon />
          Download MP4
        </button>
      </div>
    </div>
  );
}

function DownloadIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}
