// Next.js API route — proxy de descarga sin problemas de CORS
// El servidor fetch al backend (server-to-server) y re-sirve al cliente
// como same-origin, garantizando que el atributo `download` funcione.

const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://montageai-production.up.railway.app";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const jobId   = searchParams.get("job");
  const filename = searchParams.get("file");

  if (!jobId || !filename) {
    return new Response("Missing job or file param", { status: 400 });
  }

  // Sanitize — sólo alfanumérico, guiones, puntos
  if (!/^[\w-]+$/.test(jobId) || !/^[\w.-]+$/.test(filename)) {
    return new Response("Invalid params", { status: 400 });
  }

  const backendUrl = `${BACKEND_URL}/download/${jobId}/${filename}`;

  let upstream;
  try {
    upstream = await fetch(backendUrl);
  } catch {
    return new Response("Backend unreachable", { status: 502 });
  }

  if (!upstream.ok) {
    return new Response("File not found", { status: upstream.status });
  }

  // Streamed pass-through — sin cargar todo en memoria
  return new Response(upstream.body, {
    headers: {
      "Content-Type": "video/mp4",
      "Content-Disposition": `attachment; filename="${filename}"`,
      ...(upstream.headers.get("content-length")
        ? { "Content-Length": upstream.headers.get("content-length") }
        : {}),
    },
  });
}
