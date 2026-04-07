import mongoose from "mongoose";

const agentSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true },
    era: { type: String, required: true, trim: true },
    stats: {
      logic: { type: Number, required: true },
      rhetoric: { type: Number, required: true },
      bias: { type: Number, required: true },
    },
    description: { type: String, required: true, trim: true },
    personalityTraits: { type: String, trim: true, default: "" },
    backstoryLore: { type: String, trim: true, default: "" },
    speechStyle: { type: String, trim: true, default: "" },
    domain: { type: String, trim: true, default: "other" },
    specialAbility: { type: String, required: true, trim: true },
    avatarInitials: { type: String, required: true, trim: true },
    createdFrom: {
      type: String,
      enum: ["manual", "ai_suggest", "ai_find"],
      default: "manual",
    },
    sourceTopic: { type: String, trim: true, default: "" },
    tags: [{ type: String, trim: true }],
  },
  { timestamps: true }
);

const Agent = mongoose.models.MinimalAgent || mongoose.model("MinimalAgent", agentSchema);

export default Agent;