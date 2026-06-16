const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function request(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
    throw new Error(err.detail || "Request failed");
  }

  return res.json();
}

// ── Projects ─────────────────────────────────────────────────
export const projects = {
  list:   ()          => request("/projects"),
  create: (data)      => request("/projects",       { method: "POST",  body: JSON.stringify(data) }),
  get:    (id)        => request(`/projects/${id}`),
  update: (id, data)  => request(`/projects/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (id)        => request(`/projects/${id}`, { method: "DELETE" }),
  jobs:   (id)        => request(`/projects/${id}/jobs`),
  job:    (id, jobId) => request(`/projects/${id}/jobs/${jobId}`),

  upload: (file, title = "", onProgress) => {
    const form = new FormData();
    form.append("file",  file);
    form.append("title", title || file.name.replace(/\.[^/.]+$/, ""));

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${API_URL}/projects/upload`);

      if (onProgress) {
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
        });
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          try { reject(new Error(JSON.parse(xhr.responseText).detail)); }
          catch { reject(new Error(`Upload failed: ${xhr.status}`)); }
        }
      };
      xhr.onerror = () => reject(new Error("Network error during upload"));
      xhr.send(form);
    });
  },
};

// ── AI Tools ─────────────────────────────────────────────────
export const ai = {
  subtitles:    (data) => request("/ai/subtitles",      { method: "POST", body: JSON.stringify(data) }),
  removeSilence:(data) => request("/ai/remove-silence", { method: "POST", body: JSON.stringify(data) }),
  autocrop:     (data) => request("/ai/autocrop",       { method: "POST", body: JSON.stringify(data) }),
  enhanceAudio: (data) => request("/ai/enhance-audio",  { method: "POST", body: JSON.stringify(data) }),
  export:       (data) => request("/ai/export",         { method: "POST", body: JSON.stringify(data) }),
};

// ── Templates ────────────────────────────────────────────────
export const templateApi = {
  list: (category) => request(`/templates${category ? `?category=${category}` : ""}`),
  get:  (id)       => request(`/templates/${id}`),
};

// ── Poll job until done ───────────────────────────────────────
export async function pollJob(projectId, jobId, onProgress, intervalMs = 2000) {
  return new Promise((resolve, reject) => {
    const timer = setInterval(async () => {
      try {
        const job = await projects.job(projectId, jobId);
        if (onProgress) onProgress(job);
        if (job.status === "done")  { clearInterval(timer); resolve(job); }
        if (job.status === "error") { clearInterval(timer); reject(new Error(job.error)); }
      } catch (e) {
        clearInterval(timer);
        reject(e);
      }
    }, intervalMs);
  });
}
