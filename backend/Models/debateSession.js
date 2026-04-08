import mongoose from "mongoose";

const debateSettingsSchema = new mongoose.Schema(
  {
    orchestrationMode: { type: String, trim: true, default: "dynamic" },
    memoryMode: { type: String, trim: true, default: "minimal" },
    contextMode: { type: String, trim: true, default: "simple" },
    audioAutoSpeak: { type: Boolean, default: true },
    autoLoopEnabled: { type: Boolean, default: false },
    languageMode: { type: String, trim: true, default: "english_us" },
    scopeMode: { type: String, trim: true, default: "global" },
    scopeCountry: { type: String, trim: true, default: "" },
    autoSaveAgents: { type: Boolean, default: false },
  },
  { _id: false }
);

const debateSessionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, trim: true },
    topic: { type: String, required: true, trim: true, index: true },
    mood: { type: String, required: true, trim: true, default: "balanced" },
    agentIds: [{ type: String, trim: true }],
    orchestrationMode: { type: String, trim: true, default: "dynamic" },
    memoryMode: { type: String, trim: true, default: "minimal" },
    contextMode: { type: String, trim: true, default: "simple" },
    languageMode: { type: String, trim: true, default: "english_us" },
    scopeMode: { type: String, trim: true, default: "global" },
    scopeCountry: { type: String, trim: true, default: "" },
    sourceType: { type: String, trim: true, default: "debate", index: true },
    sourceFeature: { type: String, trim: true, default: "", index: true },
    sourceLabel: { type: String, trim: true, default: "" },
    maxArguments: { type: Number, default: 25 },
    closed: { type: Boolean, default: false },
    closedReason: { type: String, trim: true, default: "" },
    nextAgentId: { type: String, trim: true, default: "" },
    lastActivityAt: { type: Number, default: Date.now, index: true },
    settings: { type: debateSettingsSchema, default: () => ({}) },
  },
  { timestamps: true }
);

const DebateSession =
  mongoose.models.NoDiscordDebateSession ||
  mongoose.model("NoDiscordDebateSession", debateSessionSchema);

export default DebateSession;
