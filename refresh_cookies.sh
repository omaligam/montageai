#!/bin/bash
# refresh_cookies.sh — exporta cookies de YouTube desde Chrome y las sube a Railway
# Corre automáticamente cada día a las 6am via launchd.
# También puede correr a mano: bash ~/Desktop/montageai/refresh_cookies.sh

set -euo pipefail

RAILWAY_URL="https://montageai-production.up.railway.app"
ADMIN_SECRET="beLrC-7OzlJXCDcGx3b2cIU3RHus0y7P"
COOKIES_TMP="/tmp/yt_cookies_refresh_$$.txt"
LOG_FILE="$HOME/Library/Logs/montageai_cookies.log"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"; }

log "=== MontageAI Cookie Refresh ==="

# 1. Exportar cookies de Chrome usando yt-dlp
log "Exportando cookies desde Chrome..."
if ! python3 -m yt_dlp \
    --cookies-from-browser chrome \
    --skip-download \
    --quiet \
    --cookies "$COOKIES_TMP" \
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ" 2>>"$LOG_FILE"; then
    log "ERROR: yt-dlp no pudo exportar cookies"
    exit 1
fi

# Verificar que el archivo no está vacío
LINES=$(wc -l < "$COOKIES_TMP" 2>/dev/null || echo 0)
if [ "$LINES" -lt 10 ]; then
    log "ERROR: Archivo de cookies muy corto ($LINES líneas)"
    rm -f "$COOKIES_TMP"
    exit 1
fi
log "Cookies exportadas: $LINES líneas"

# 2. Enviar al backend de Railway
log "Enviando a Railway..."
HTTP_STATUS=$(curl -s -o /tmp/montageai_refresh_response.txt -w "%{http_code}" \
    -X POST "$RAILWAY_URL/admin/refresh-cookies" \
    -H "Authorization: Bearer $ADMIN_SECRET" \
    -H "Content-Type: text/plain" \
    --data-binary "@$COOKIES_TMP" \
    --max-time 30)

RESPONSE=$(cat /tmp/montageai_refresh_response.txt 2>/dev/null || echo "")

if [ "$HTTP_STATUS" = "200" ]; then
    log "✅ Cookies actualizadas en Railway — $RESPONSE"
else
    log "❌ Railway respondió HTTP $HTTP_STATUS: $RESPONSE"
    rm -f "$COOKIES_TMP"
    exit 1
fi

# 3. Limpiar
rm -f "$COOKIES_TMP" /tmp/montageai_refresh_response.txt
log "Hecho."
