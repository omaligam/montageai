#!/bin/bash
# setup_autorefresh.command
# Doble-click en Finder para instalar el daemon de auto-refresh de cookies.
# Solo necesitas correr esto UNA VEZ.

cd "$(dirname "$0")"

PLIST_SRC="$HOME/Desktop/montageai/ai.montageai.cookies.plist"
PLIST_DST="$HOME/Library/LaunchAgents/ai.montageai.cookies.plist"

echo ""
echo "🍪  MontageAI — Instalando auto-refresh de cookies..."
echo ""

# Copiar plist a LaunchAgents
cp "$PLIST_SRC" "$PLIST_DST"
echo "✓ Plist copiado a LaunchAgents"

# Descargar cualquier versión anterior
launchctl unload "$PLIST_DST" 2>/dev/null || true

# Cargar el daemon (también corre inmediatamente por RunAtLoad)
launchctl load "$PLIST_DST"
echo "✓ Daemon instalado — correrá cada día a las 6:00 AM"
echo ""
echo "Ejecutando primera actualización de cookies ahora..."
echo ""

# Primera ejecución manual para verificar que todo funciona
bash "$HOME/Desktop/montageai/refresh_cookies.sh"

echo ""
echo "✅ Listo. Las cookies se refrescarán automáticamente cada mañana."
echo "   Log: ~/Library/Logs/montageai_cookies.log"
echo ""
read -p "Presiona Enter para cerrar..."
