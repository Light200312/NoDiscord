import mongoose from "mongoose";

const sessionParticipantSchema = new mongoose.Schema(
  {
    id: { type: String, trim: true },
    name: { type: String, trim: true },
    role: { type: String, trim: true },
    avatarInitials: { type: String, trim: true },
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, trim: true },
    sessionId: { type: String, required: true, trim: true, index: true },
    topic: { type: String, required: true, trim: true, index: true },
    sessionParticipantIds: [{ type: String, trim: true }],
    sessionParticipants: [sessionParticipantSchema],
    speakerId: { type: String, required: true, trim: true },
    speakerName: { type: String, required: true, trim: true },
    speakerInitials: { type: String, required: true, trim: true },
    isUser: { type: Boolean, required: true, default: false },
    type: {
      type: String,
      enum: ["system", "user", "mentor"],
      required: true,
      default: "mentor",
    },
    text: { type: String, required: true, trim: true },
    roleLabel: { type: String, trim: true, default: "" },
    initiatedBy: { type: String, trim: true, default: "" },
    timestamp: { type: Number, required: true, default: Date.now },
  },
  { timestamps: true }
);

messageSchema.index({ sessionId: 1, timestamp: 1 });

const Message = mongoose.models.NoDiscordMessage || mongoose.model("NoDiscordMessage", messageSchema);

export default Message;
