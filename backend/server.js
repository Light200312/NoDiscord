import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { connectDB } from "./DB/config.js";
import {
  autoStepSession,
  createAgent,
  findOrDraftAgentByName,
  getSession,
  listAgents,
  postUserMessage,
  seedAgents,
  startSession,
  stopSession,
  suggestAgents,
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
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
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

///here

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