FROM python:3.11-slim

WORKDIR /app

# ffmpeg para procesar video — quickjs (en requirements.txt) maneja JS de yt-dlp
RUN apt-get update && apt-get install -y ffmpeg curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir --upgrade yt-dlp

COPY . .

# Puerto configurable (Railway lo asigna automáticamente)
ENV PORT=8000
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT}
