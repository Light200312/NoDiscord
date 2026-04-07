import TopicMemory from "../Models/topicMemory.js";
import { callOpenRouter } from "./llmClient.js";

const ACTIVE_CONTEXT_LIMIT = 8;
const FLUSH_MIN_MESSAGES = 6;
const MAX_SUMMARY_MESSAGES = 24;

function truncateText(text = "", maxChars = 400) {
  const safe = String(text || "");
  return safe.length > maxChars ? `${safe.slice(0, maxChars - 1)}...` : safe;
}

function sortMessages(messages = []) {
  return [...messages].sort((a, b) => Number(a?.timestamp || 0) - Number(b?.timestamp || 0));
}

function summarizeHistory(messages = [], limit = ACTIVE_CONTEXT_LIMIT) {
  return messages
    .slice(-limit)
    .map((message) => `${message.speakerName}: ${truncateText(message.text)}`)
    .join("\n");
}

function getLastUserMessage(messages = []) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.isUser) return messages[index];
  }
  return null;
}

function shouldTriggerRetrieval(messages = []) {
  const text = String(getLastUserMessage(messages)?.text || "").toLowerCase();
  if (!text) return false;
  return [
    "earlier",
    "previous",
    "before",
    "remember",
    "mentioned",
    "that point",
    "that claim",
    "back to",
  ].some((phrase) => text.includes(phrase));
}

function extractPendingMessages(messages = [], lastFlushedAt, activeLimit = ACTIVE_CONTEXT_LIMIT) {
  const sorted = sortMessages(messages).filter((message) => message.type !== "system");
  const cutoffIndex = Math.max(0, sorted.length - activeLimit);
  const pending = sorted
    .slice(0, cutoffIndex)
    .filter((message) => Number(message?.timestamp || 0) > Number(lastFlushedAt || 0));
  return pending.slice(0, MAX_SUMMARY_MESSAGES);
}

function formatTranscript(messages = []) {
  return messages.map((message) => `${message.speakerName}: ${truncateText(message.text)}`).join("\n");
}

async function summarizeMinimal({ topic, priorSummary, messages }) {
  const system = "You are a concise memory summarizer for a discussion assistant.";
  const prompt = `Topic:
${topic}

Prior summary:
${priorSummary || "None"}

New transcript excerpt:
${formatTranscript(messages) || "No new messages."}

Update the summary in <= 120 words. Focus on durable facts, decisions, and unresolved points. Return only the summary text.`;

  return String(await callOpenRouter({ system, prompt, temperature: 0.2, maxTokens: 260 })).trim();
}

async function summarizeRich({ topic, priorSummary, messages, priorFacts = [], priorQuestions = [] }) {
  const system = "You are a discussion memory curator. Extract durable knowledge only.";
  const prompt = `Topic:
${topic}

Prior summary:
${priorSummary || "None"}

Prior key facts:
${priorFacts.length ? priorFacts.map((fact) => `- ${fact}`).join("\n") : "None"}

Prior open questions:
${priorQuestions.length ? priorQuestions.map((question) => `- ${question}`).join("\n") : "None"}

New transcript excerpt:
${formatTranscript(messages) || "No new messages."}

Return strict JSON:
{
  "summary": "updated summary in <= 140 words",
  "keyFacts": ["up to 6 concise facts"],
  "openQuestions": ["up to 4 unresolved questions"]
}`;

  const raw = await callOpenRouter({ system, prompt, temperature: 0.2, maxTokens: 420 });
  try {
    const parsed = JSON.parse(raw);
    return {
      summary: String(parsed.summary || "").trim(),
      keyFacts: Array.isArray(parsed.keyFacts) ? parsed.keyFacts.map((item) => String(item).trim()).filter(Boolean) : [],
      openQuestions: Array.isArray(parsed.openQuestions)
        ? parsed.openQuestions.map((item) => String(item).trim()).filter(Boolean)
        : [],
    };
  } catch (_) {
    return {
      summary: String(raw || "").trim(),
      keyFacts: priorFacts,
      openQuestions: priorQuestions,
    };
  }
}

async function updateTopicMemory({ topic, sessionId = "", messages = [], memoryMode = "minimal" }) {
  if (!topic || memoryMode === "off") return { memory: null, updated: false };

  const key = { topic, sessionId: String(sessionId || "") };
  const existing = await TopicMemory.findOne(key).lean();
  const pending = extractPendingMessages(messages, Number(existing?.lastFlushedAt || 0));
  if (!pending.length) return { memory: existing || null, updated: false };
  if (pending.length < FLUSH_MIN_MESSAGES && existing?.summary) return { memory: existing, updated: false };

  const base = {
    summary: existing?.summary || "",
    keyFacts: existing?.keyFacts || [],
    openQuestions: existing?.openQuestions || [],
  };

  let summary = base.summary;
  let keyFacts = base.keyFacts;
  let openQuestions = base.openQuestions;

  if (memoryMode === "rich") {
    const rich = await summarizeRich({
      topic,
      priorSummary: base.summary,
      priorFacts: base.keyFacts,
      priorQuestions: base.openQuestions,
      messages: pending,
    });
    summary = rich.summary || base.summary;
    keyFacts = rich.keyFacts.length ? rich.keyFacts : base.keyFacts;
    openQuestions = rich.openQuestions.length ? rich.openQuestions : base.openQuestions;
  } else {
    summary = await summarizeMinimal({ topic, priorSummary: base.summary, messages: pending });
  }

  const latestTimestamp = Number(pending[pending.length - 1]?.timestamp || Date.now());
  const memory = await TopicMemory.findOneAndUpdate(
    key,
    {
      $set: {
        topic,
        sessionId: String(sessionId || ""),
        summary,
        keyFacts,
        openQuestions,
        lastUpdated: Date.now(),
        lastFlushedAt: latestTimestamp,
        messageCount: Number(existing?.messageCount || 0) + pending.length,
      },
    },
    { upsert: true, returnDocument: "after" }
  ).lean();

  return { memory, updated: true };
}

function formatMemoryBlock(memory, { memoryMode = "minimal", includeRich = false } = {}) {
  if (!memory?.summary) return "";
  if (memoryMode !== "rich" || !includeRich) return `Topic memory:\n${memory.summary}`;
  const facts = (memory.keyFacts || []).slice(0, 6);
  const questions = (memory.openQuestions || []).slice(0, 4);
  return [
    `Topic memory summary: ${memory.summary}`,
    facts.length ? `Key facts:\n${facts.map((item) => `- ${item}`).join("\n")}` : "",
    questions.length ? `Open questions:\n${questions.map((item) => `- ${item}`).join("\n")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

async function buildContextSummary({ topic, sessionId, messages, memoryMode = "minimal", contextMode = "simple" }) {
  const activeContext = summarizeHistory(messages);
  if (!topic || memoryMode === "off") {
    return { contextSummary: activeContext, memory: null };
  }

  let memory = null;
  try {
    const result = await updateTopicMemory({ topic, sessionId, messages, memoryMode });
    memory = result.memory || null;
  } catch (error) {
    console.error("Topic memory update failed:", error.message);
  }

  const memoryBlock = formatMemoryBlock(memory, {
    memoryMode,
    includeRich: contextMode === "rich" || shouldTriggerRetrieval(messages),
  });

  return {
    contextSummary: [memoryBlock, activeContext].filter(Boolean).join("\n\n"),
    memory,
  };
}

export { buildContextSummary };
