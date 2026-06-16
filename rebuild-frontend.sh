#!/bin/bash
echo "🔄 Rebuilding frontend..."
docker-compose up -d --build frontend
echo "✅ Listo — abre localhost:3000"
