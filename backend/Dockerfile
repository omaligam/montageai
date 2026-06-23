FROM python:3.11-slim

WORKDIR /app

# ffmpeg + nodejs (yt-dlp requiere JS runtime para descifrar firmas de YouTube)
RUN apt-get update && apt-get install -y ffmpeg curl ca-certificates nodejs npm \
    && rm -rf /var/lib/apt/lists/* \
    && node --version && which node

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir --upgrade yt-dlp

COPY . .

# Puerto configurable (Railway lo asigna automáticamente)
ENV PORT=8000
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT}
