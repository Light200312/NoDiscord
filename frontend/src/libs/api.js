import axios from "axios";
function normalizeBaseUrl(value) {
    const trimmed=String(value || "").trim();
    if (!trimmed) return "/";
  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
}
const Base_URL=normalizeBaseUrl(import.meta.env.VITE_API_URL || "/");
const http = axios.create({
  baseURL: BASE_URL,
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
        .get("/api/handshake", {
          headers: { "X-Client-Name": "minimal-vr-frontend" },
        })
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

  sendMessage: (sessionId, text) => http.post(`/api/session/${sessionId}/message`, { text }),

  autoStep: (sessionId) => http.post(`/api/session/${sessionId}/auto-step`),

  stopSession: (sessionId) => http.post(`/api/session/${sessionId}/stop`),
};

export { api, http };
