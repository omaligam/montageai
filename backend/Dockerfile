FROM python:3.11-slim

WORKDIR /app

# Node.js 20 LTS via NodeSource (yt-dlp necesita 'node' para descifrar firmas nsig)
RUN apt-get update && apt-get install -y curl ca-certificates \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs ffmpeg \
    && rm -rf /var/lib/apt/lists/* \
    && node --version

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir --upgrade yt-dlp

COPY . .

# Puerto configurable (Railway lo asigna automáticamente)
ENV PORT=8000
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT}
