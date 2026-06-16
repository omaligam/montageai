from fastapi import APIRouter

router = APIRouter(prefix="/templates", tags=["templates"])

# ──────────────────────────────────────────────────────────────
# Built-in template library
# ──────────────────────────────────────────────────────────────
TEMPLATES = [
    {
        "id":          "viral_bold",
        "name":        "Viral Bold",
        "description": "Subtítulos grandes en negrita al estilo MrBeast",
        "category":    "subtitles",
        "thumbnail":   "/templates/viral_bold.jpg",
        "config": {
            "subtitle_style": "bold",
            "font":           "Impact",
            "font_size":      72,
            "color":          "white",
            "stroke_color":   "black",
            "stroke_width":   4,
            "position":       "bottom",
            "animation":      "pop",
        },
    },
    {
        "id":          "neon_glow",
        "name":        "Neon Glow",
        "description": "Subtítulos neón animados estilo gaming/TikTok",
        "category":    "subtitles",
        "thumbnail":   "/templates/neon_glow.jpg",
        "config": {
            "subtitle_style": "neon",
            "font":           "Montserrat",
            "font_size":      64,
            "color":          "#00ffcc",
            "stroke_color":   "#ff00ff",
            "stroke_width":   3,
            "position":       "center",
            "animation":      "glow",
        },
    },
    {
        "id":          "minimal_clean",
        "name":        "Minimal Clean",
        "description": "Subtítulos minimalistas estilo podcast/LinkedIn",
        "category":    "subtitles",
        "thumbnail":   "/templates/minimal_clean.jpg",
        "config": {
            "subtitle_style": "minimal",
            "font":           "Inter",
            "font_size":      48,
            "color":          "white",
            "stroke_color":   "transparent",
            "stroke_width":   0,
            "position":       "bottom",
            "animation":      "fade",
        },
    },
    {
        "id":          "cinematic",
        "name":        "Cinematic",
        "description": "Barras negras + subtítulos elegantes estilo documental",
        "category":    "style",
        "thumbnail":   "/templates/cinematic.jpg",
        "config": {
            "letterbox":      True,
            "color_grade":    "cinematic",
            "subtitle_style": "minimal",
            "font":           "Garamond",
            "font_size":      44,
            "color":          "white",
        },
    },
    {
        "id":          "podcast_clips",
        "name":        "Podcast Clips",
        "description": "Estilo Joe Rogan/Lex Fridman: fondo oscuro, subtítulos en palabra",
        "category":    "style",
        "thumbnail":   "/templates/podcast.jpg",
        "config": {
            "subtitle_style": "word",
            "font":           "SF Pro",
            "font_size":      56,
            "color":          "white",
            "highlight_color":"#f5c518",
            "background":     "dark",
        },
    },
    {
        "id":          "instagram_reel",
        "name":        "Instagram Reel",
        "description": "Optimizado para Instagram: colores vibrantes, texto top",
        "category":    "platform",
        "thumbnail":   "/templates/instagram.jpg",
        "config": {
            "aspect":         "9:16",
            "subtitle_style": "bold",
            "position":       "top",
            "font_size":      60,
            "color":          "#FF4081",
            "animation":      "slide",
        },
    },
    {
        "id":          "tiktok_viral",
        "name":        "TikTok Viral",
        "description": "Máximo engagement: emojis, texto grande, colores pop",
        "category":    "platform",
        "thumbnail":   "/templates/tiktok.jpg",
        "config": {
            "aspect":         "9:16",
            "subtitle_style": "emoji",
            "font_size":      68,
            "color":          "white",
            "stroke_color":   "#000",
            "stroke_width":   5,
            "animation":      "bounce",
        },
    },
    {
        "id":          "youtube_shorts",
        "name":        "YouTube Shorts",
        "description": "Formato optimizado para YouTube Shorts con call to action",
        "category":    "platform",
        "thumbnail":   "/templates/yt_shorts.jpg",
        "config": {
            "aspect":         "9:16",
            "subtitle_style": "default",
            "font_size":      54,
            "color":          "white",
            "cta":            True,
        },
    },
]


@router.get("")
def list_templates(category: str = None):
    if category:
        return [t for t in TEMPLATES if t["category"] == category]
    return TEMPLATES


@router.get("/{template_id}")
def get_template(template_id: str):
    for t in TEMPLATES:
        if t["id"] == template_id:
            return t
    from fastapi import HTTPException
    raise HTTPException(status_code=404, detail="Template not found")
