import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { connectDB } from "./DB/config.js";
import {
  autoStepSession,
  createAgent,
  findOrDraftAgentByName,
  generateSessionReport,
  getSession,
  listConclusions,
  listDebateHistory,
  listAgents,
  postUserMessage,
  seedAgents,
  startSession,
  stopSession,
  suggestAgents,
  walkIntoPastDebate,
  generateLegalPanel,
  generateInterviewPanel,
  generateMedicalPanel,
} from "./services/debateService.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3001);
const normalizeOrigin = (origin = "") => String(origin || "").trim().replace(/\/$/, "");
const configuredOrigins = String(process.env.FRONTEND_ORIGIN || "")
  .split(",")
  .map(normalizeOrigin)
  .filter(Boolean);
const allowedOrigins = new Set(
  [
    ...configuredOrigins,
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5175",
    "http://127.0.0.1:5176",
  ]
    .map(normalizeOrigin)
    .filter(Boolean)
);

app.use(
  cors({
    origin(origin, callback) {
      const normalizedOrigin = normalizeOrigin(origin);
      if (!normalizedOrigin || allowedOrigins.has(normalizedOrigin)) return callback(null, true);
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);
app.use(express.json());

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

await seedAgents();

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, app: "minimal-vr-backend", timestamp: new Date().toISOString() });
});


app.get("/api/handshake", (req, res) => {
  const requestOrigin = normalizeOrigin(req.get("origin"));
  const clientName = String(req.get("x-client-name") || "unknown-client").trim();
  const handshakeOrigin = requestOrigin || "same-origin/no-origin";

  console.log(
    `[handshake] Backend connected to ${clientName} from ${handshakeOrigin} at ${new Date().toISOString()}`
  );

  res.json({
    connected: true,
    clientName,
    backendUrl: `http://localhost:${port}`,
    handshakeOrigin,
    timestamp: new Date().toISOString(),
  });
});



app.get("/api/agents", async (_req, res) => {
  res.json({ agents: await listAgents() });
});

app.post("/api/agents", async (req, res) => {
  try {
    const agent = await createAgent(req.body || {});
    res.status(201).json({ agent });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.post("/api/agents/find", async (req, res) => {
  try {
    const result = await findOrDraftAgentByName(req.body || {});
    res.json(result);
  } catch (error) {
    const upstreamStatus = Number(error?.statusCode || error?.response?.status || 0);
    const status = upstreamStatus >= 400 && upstreamStatus < 600 ? upstreamStatus : 400;
    const message =
      String(error?.response?.data?.error?.message || error?.message || "").trim() ||
      "Failed to create the requested agent draft.";
    res.status(status).json({ message });
  }
});

app.post("/api/agents/suggest", async (req, res) => {
  try {
    const result = await suggestAgents(req.body || {});
    res.json(result);
  } catch (error) {
    const upstreamStatus = Number(error?.statusCode || error?.response?.status || 0);
    const status = upstreamStatus >= 400 && upstreamStatus < 600 ? upstreamStatus : 400;
    const message =
      String(error?.response?.data?.error?.message || error?.message || "").trim() || "Failed to suggest agents.";
    res.status(status).json({ message });
  }
});

app.post("/api/session/start", async (req, res) => {
  try {
    const session = await startSession(req.body || {});
    res.status(201).json({ session });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.get("/api/history", async (_req, res) => {
  res.json({ discussions: await listDebateHistory() });
});

app.get("/api/session/:sessionId", async (req, res) => {
  const session = await getSession(req.params.sessionId);
  if (!session) {
    return res.status(404).json({ message: "Session not found." });
  }
  return res.json({ session });
});

app.post("/api/session/:sessionId/message", async (req, res) => {
  try {
    const result = await postUserMessage(req.params.sessionId, req.body?.text);
    res.json({ session: result.session, mentorMessage: result.mentorMessage });
  } catch (error) {
    const status = error.message === "Session not found." ? 404 : 400;
    res.status(status).json({ message: error.message });
  }
});

app.post("/api/session/:sessionId/auto-step", async (req, res) => {
  try {
    const result = await autoStepSession(req.params.sessionId);
    res.json({ session: result.session, mentorMessage: result.mentorMessage });
  } catch (error) {
    const status = error.message === "Session not found." ? 404 : 400;
    res.status(status).json({ message: error.message });
  }
});

app.post("/api/session/:sessionId/stop", async (req, res) => {
  try {
    const session = await stopSession(req.params.sessionId);
    res.json({ session });
  } catch (error) {
    const status = error.message === "Session not found." ? 404 : 400;
    res.status(status).json({ message: error.message });
  }
});

app.post("/api/session/:sessionId/report", async (req, res) => {
  try {
    const report = await generateSessionReport(req.params.sessionId);
    res.json({ report });
  } catch (error) {
    const status = error.message === "Session not found." ? 404 : 400;
    res.status(status).json({ message: error.message });
  }
});

app.get("/api/conclusions", async (req, res) => {
  try {
    const conclusions = await listConclusions(req.query || {});
    res.json({ conclusions });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.post("/api/debate/history", async (req, res) => {
  try {
    const result = await walkIntoPastDebate(req.body || {});
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Learn Indian Laws Feature
app.post("/api/features/learn-laws", async (req, res) => {
  try {
    const result = await generateLegalPanel(req.body || {});
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// VR Interview Feature
app.post("/api/features/vr-interview", async (req, res) => {
  try {
    const result = await generateInterviewPanel(req.body || {});
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Health Diagnosis Feature
app.post("/api/features/health-diagnosis", async (req, res) => {
  try {
    const result = await generateMedicalPanel(req.body || {});
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.listen(port, () => {
  console.log(`✓ minimal_vr backend running on http://localhost:${port}`);
  console.log(`✓ Waiting for frontend connections...`);
});

connectDB()
  .then(async (connection) => {
    if (connection) {
      await seedAgents();
      console.log("✓ Backend synced agents with MongoDB");
    } else {
      console.warn("⚠ Continuing with in-memory agents (Mongo unavailable)");
    }
  })
  .catch((error) => {
    console.error(`MongoDB startup sync failed: ${error.message}`);
  });
