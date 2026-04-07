import mongoose from "mongoose";

const keyQuotedArgumentSchema = new mongoose.Schema(
  {
    quote: { type: String, trim: true, default: "" },
    speaker: { type: String, trim: true, default: "" },
    howItHelps: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const conclusionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, trim: true },
    sessionId: { type: String, trim: true, index: true, default: "" },
    topic: { type: String, required: true, trim: true, index: true },
    problemDefinition: { type: String, trim: true, default: "" },
    keyQuotedArguments: [keyQuotedArgumentSchema],
    summary: { type: String, trim: true, default: "" },
    conclusion: { type: String, trim: true, default: "" },
    reportSource: { type: String, trim: true, default: "fallback" },
    sourceType: {
      type: String,
      enum: ["debate", "feature"],
      default: "debate",
      index: true,
    },
    sourceFeature: { type: String, trim: true, default: "", index: true },
    sourceLabel: { type: String, trim: true, default: "" },
    participantNames: [{ type: String, trim: true }],
    messageCount: { type: Number, default: 0 },
    generatedAt: { type: Number, default: Date.now, index: true },
  },
  { timestamps: true }
);

const Conclusion =
  mongoose.models.NoDiscordConclusion || mongoose.model("NoDiscordConclusion", conclusionSchema);

export default Conclusion;
