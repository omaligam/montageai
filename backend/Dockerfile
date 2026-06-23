FROM python:3.11-slim

WORKDIR /app

# ffmpeg + nodejs para yt-dlp (descifrado de firmas nsig de YouTube)
# En Debian el binario se llama 'nodejs' pero yt-dlp busca 'node' → symlink
RUN apt-get update && apt-get install -y ffmpeg curl ca-certificates nodejs \
    && rm -rf /var/lib/apt/lists/* \
    && ln -sf /usr/bin/nodejs /usr/local/bin/node \
    && node --version

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir --upgrade yt-dlp

COPY . .

# Puerto configurable (Railway lo asigna automáticamente)
ENV PORT=8000
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT}
