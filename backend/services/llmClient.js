import axios from "axios";

const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "google/gemini-2.0-flash-001";
const TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS || 60000);

function extractTextContent(content) {
  if (typeof content === "string") return content.trim();
  if (!Array.isArray(content)) return "";
  return content
    .map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object" && typeof item.text === "string") return item.text;
      return "";
    })
    .join("\n")
    .trim();
}

function extractFirstJsonObject(text = "") {
  const safe = String(text || "");
  const start = safe.indexOf("{");
  const end = safe.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  return safe.slice(start, end + 1);
}

async function callOpenRouter({ system, prompt, model = OPENROUTER_MODEL, temperature = 0.4, maxTokens = 1400 }) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("Missing OPENROUTER_API_KEY.");

  const response = await axios.post(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      model,
      temperature,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
    },
    {
      timeout: TIMEOUT_MS,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
    }
  );

  return extractTextContent(response.data?.choices?.[0]?.message?.content);
}

async function callJsonTask({ system, prompt, temperature = 0.3 }) {
  const raw = await callOpenRouter({ system, prompt, temperature });
  const jsonText = extractFirstJsonObject(raw);
  if (!jsonText) throw new Error("Model did not return JSON.");
  return JSON.parse(jsonText);
}

function formatConversation(conversation = []) {
  return conversation
    .slice(-8)
    .map((message) => `${message.speakerName}: ${String(message.text || "").trim()}`)
    .join("\n");
}

function getLanguageInstruction(languageMode = "english_in") {
  if (languageMode === "hinglish") {
    return "Respond in natural Hinglish using roman script. Mix Hindi and English fluidly, but keep the answer easy to follow.";
  }
  return "Respond in Indian English. Use clear English phrasing familiar to users in India.";
}

const TEMPERATURE_PROFILES = {
  hostile: {
    goal: "Defeat and dominate",
    tone: "Interrupting, mocking, and high confrontation",
    focus: "Winning at all costs",
  },
  adversarial: {
    goal: "Win through strong counter-arguments",
    tone: "Sharp and intense but issue-focused",
    focus: "Expose flaws in opponent logic",
  },
  competitive: {
    goal: "Outperform within structured rules",
    tone: "Controlled and firm",
    focus: "Logic, evidence, and rebuttals",
  },
  analytical: {
    goal: "Test ideas rigorously",
    tone: "Calm and probing",
    focus: "Question assumptions and reasoning",
  },
  dialectical: {
    goal: "Arrive at deeper truth together",
    tone: "Curious and respectful",
    focus: "Guide with questions over attacks",
  },
  collaborative: {
    goal: "Understand multiple perspectives",
    tone: "Open-minded and thoughtful",
    focus: "Build on each other's ideas",
  },
  reflective: {
    goal: "Share views without pressure",
    tone: "Relaxed and personal",
    focus: "Exchange experiences over winning",
  },
};

function buildMentorSystem(agent, mood, temperature, languageMode) {
  const profile = TEMPERATURE_PROFILES[temperature] || TEMPERATURE_PROFILES.analytical;
  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return [
    `[CURRENT DATE: ${currentDate}] Use this date as your temporal reference.`,
    `You are ${agent.name}, role: ${agent.role}.`,
    `Domain: ${agent.domain || "General"}.`,
    `Era: ${agent.era || "present day"}.`,
    `Expertise: ${agent.expertise || "broad reasoning"}.`,
    `Stance: ${agent.stance || "context-aware"}.`,
    `Persona and reasoning method: ${agent.description || `${agent.name} is an expert mentor.`}`,
    `Speech style: ${agent.speechStyle || "clear and direct"}.`,
    `Personality traits: ${agent.personalityTraits || "thoughtful, analytical, composed"}.`,
    `Special ability: ${agent.specialAbility || "finding the strongest angle quickly"}.`,
    `Typical opening angle: ${agent.openingAngle || "frame the strongest practical tension first"}.`,
    `Backstory/lore: ${agent.backstoryLore || agent.description || `${agent.name} is an expert mentor.`}`,
    `Debate stats: logic ${agent.stats?.logic ?? 70}, rhetoric ${agent.stats?.rhetoric ?? 70}, bias ${agent.stats?.bias ?? 40}.`,
    `Debate mood: ${mood}.`,
    `Debate temperature: ${temperature}.`,
    `Temperature guidance: goal=${profile.goal}; tone=${profile.tone}; focus=${profile.focus}.`,
    getLanguageInstruction(languageMode),
    "Stay fully within this persona and these constraints.",
    "Sound like this person or persona specifically, not like a generic AI assistant or moderator.",
    "If uncertain about a fact, acknowledge uncertainty in character instead of inventing details.",
  ].join("\n");
}

function buildFallbackReply({ agent, topic, userText, turnNumber, languageMode }) {
  const intro =
    languageMode === "hinglish"
      ? `Tumhari baat mein potential hai, lekin "${topic}" par ise aur sharper banana padega.`
      : `Your point has potential, but it needs sharper structure on "${topic}".`;

  return `${intro} ${agent.name} would tighten the latest point, "${userText}", by adding one concrete mechanism, one defensible example, and one clear consequence.\n\nTurn ${turnNumber}: lean into ${agent.specialAbility || "your strongest line of reasoning"} and keep the answer ${agent.speechStyle || "clear and direct"}.`;
}

async function generateMentorReply({
  agent,
  topic,
  mood,
  temperature,
  userText,
  conversation,
  turnNumber,
  contextSummary = "",
  languageMode = "english_in",
}) {
  const effectiveTemperature = String(temperature || mood || "analytical").trim();
  const effectiveMood = String(mood || effectiveTemperature).trim();
  const system = buildMentorSystem(agent, effectiveMood, effectiveTemperature, languageMode);
  const prompt = `Task goal:
Respond as this persona in a live council chat and help the user sharpen their argument on the topic.

Topic:
${topic}

Conversation memory:
${contextSummary || "No durable memory yet."}

Recent conversation:
${formatConversation(conversation) || "No prior messages."}

Latest driving message:
${userText}

Output constraints:
- answer as one council speaker, not as a moderator
- stay fully in character
- begin directly with the response; do not introduce yourself by name
- give critique plus one concrete improvement
- build on earlier council points when it genuinely sharpens the response
- keep the voice faithful to the persona's tone, reasoning method, and priorities
- avoid generic assistant phrasing
- 1-2 short paragraphs max`;

  try {
    return await callOpenRouter({ system, prompt, temperature: 0.6, maxTokens: 700 });
  } catch (error) {
    console.error("LLM provider failed:", error.message);
    return buildFallbackReply({ agent, topic, userText, turnNumber, languageMode });
  }
}

export { callJsonTask, callOpenRouter, generateMentorReply };
