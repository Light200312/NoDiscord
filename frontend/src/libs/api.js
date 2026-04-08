import axios from "axios";

function normalizeBaseUrl(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "/";
  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
}

const Base_URL = normalizeBaseUrl(import.meta.env.VITE_API_URL || "/");

const http = axios.create({
  baseURL: Base_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 60_000,
});

let handshakePromise = null;

http.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const message = err.response?.data?.message || err.message || "Network error";
    return Promise.reject(new Error(message));
  }
);

const api = {
  handshake: () => {
    if (!handshakePromise) {
      handshakePromise = http
        .get("/api/handshake", { headers: { "X-Client-Name": "minimal-vr-frontend" } })
        .catch((error) => {
          handshakePromise = null;
          throw error;
        });
    }
    return handshakePromise;
  },
  listAgents: () => http.get("/api/agents"),
  createAgent: (payload) => http.post("/api/agents", payload),
  findAgentByName: (payload) => http.post("/api/agents/find", payload),
  suggestAgents: (payload) => http.post("/api/agents/suggest", payload),
  startSession: (payload) => http.post("/api/session/start", payload),
  getSession: (sessionId) => http.get(`/api/session/${sessionId}`),
  getHistory: () => http.get("/api/history"),
  getConclusions: (params) => http.get("/api/conclusions", { params }),
  generateHistoricalDebate: (payload) => http.post("/api/debate/history", payload),
  generateLegalPanel: (payload) => http.post("/api/features/learn-laws", payload),
  generateInterviewPanel: (payload) => http.post("/api/features/vr-interview", payload),
  generateMedicalPanel: (payload) => http.post("/api/features/health-diagnosis", payload),
  sendMessage: (sessionId, text) => http.post(`/api/session/${sessionId}/message`, { text }),
  autoStep: (sessionId) => http.post(`/api/session/${sessionId}/auto-step`),
  stopSession: (sessionId) => http.post(`/api/session/${sessionId}/stop`),
  generateReport: (sessionId) => http.post(`/api/session/${sessionId}/report`),
};

export { api, http };
