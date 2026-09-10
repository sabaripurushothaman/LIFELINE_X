/**
 * LIFELINE-X API Client
 * Typed interface to the FastAPI backend.
 */

// In development, Vite proxies /api/* → http://localhost:8000 (see vite.config.ts).
// In production, FastAPI serves the frontend, so relative paths work directly.
// Either way, an empty base string means all /api/* calls resolve correctly.
const API_BASE = import.meta.env.VITE_API_URL ?? '';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ─── Health ──────────────────────────────────────────────────────────────────

export const api = {
  getHealth: () => apiFetch('/api/health'),

  getSystemStatus: () => apiFetch('/api/system/status'),

  // ─── Analysis ──────────────────────────────────────────────────────────────

  startAnalysisWithFiles: async (
    videoFile: File,
    telemetryFile: File | null,
    incidentId: string,
    sampleEveryN: number,
  ) => {
    const form = new FormData();
    form.append('video', videoFile);
    if (telemetryFile) form.append('telemetry', telemetryFile);
    form.append('incident_id', incidentId);
    form.append('sample_every_n', String(sampleEveryN));
    const res = await fetch(`${API_BASE}/api/analysis/start-with-telemetry`, {
      method: 'POST',
      body: form,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail ?? `HTTP ${res.status}`);
    }
    return res.json();
  },

  getAnalysis: (analysisId: string) =>
    apiFetch(`/api/analysis/${analysisId}`),

  listAnalyses: () => apiFetch('/api/analysis'),

  // ─── Survivors ─────────────────────────────────────────────────────────────

  getSurvivors: (analysisId?: string) =>
    apiFetch(`/api/survivors${analysisId ? `?analysis_id=${analysisId}` : ''}`),

  getSurvivor: (trackId: string, analysisId?: string) =>
    apiFetch(`/api/survivors/${trackId}${analysisId ? `?analysis_id=${analysisId}` : ''}`),

  // ─── Evidence ──────────────────────────────────────────────────────────────

  getEvidence: (trackId: string, analysisId?: string) =>
    apiFetch(`/api/evidence/${trackId}${analysisId ? `?analysis_id=${analysisId}` : ''}`),

  // ─── Reviews ───────────────────────────────────────────────────────────────

  submitReview: (payload: {
    analysis_id: string;
    track_id: string;
    decision: string;
    notes?: string;
  }) =>
    apiFetch('/api/reviews', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // ─── Map ───────────────────────────────────────────────────────────────────

  getMapData: (analysisId: string) =>
    apiFetch(`/api/map/${analysisId}`),

  // ─── Export ────────────────────────────────────────────────────────────────

  exportAnalysis: async (analysisId: string, format: 'geojson' | 'csv' | 'json') => {
    const res = await fetch(`${API_BASE}/api/export/${analysisId}?format=${format}`);
    if (!res.ok) throw new Error(`Export failed: HTTP ${res.status}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lifeline_x_${analysisId}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  },

  // ─── Evaluation ────────────────────────────────────────────────────────────

  getEvaluation: () => apiFetch('/api/evaluation'),

  // ─── Emergency Routing ─────────────────────────────────────────────────────

  getRouting: (
    from_lat: number,
    from_lon: number,
    to_lat: number,
    to_lon: number,
    track_id?: string,
  ) => {
    const params = new URLSearchParams({
      from_lat: String(from_lat),
      from_lon: String(from_lon),
      to_lat: String(to_lat),
      to_lon: String(to_lon),
      ...(track_id ? { track_id } : {}),
    });
    return apiFetch(`/api/routing?${params.toString()}`);
  },
};
