import axios from "axios";

const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "google/gemini-2.0-flash-001";
const TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS || 45000);

function extractTextContent(content) {
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && typeof item.text === "string") return item.text;
        return "";
      })
      .join("\n")
      .trim();
  }
  return "";
}

function extractFirstJsonObject(text = "") {
  const safeText = String(text || "");
  const start = safeText.indexOf("{");
  const end = safeText.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return safeText.slice(start, end + 1);
}
//todo: format conv and return as array of {speaker, text} objects instead of string, so that the model can refer to specific past messages more easily
function formatConversation(conversation = []) {
  return conversation
    .slice(-8)
    .map((message) => {
      const speaker = String(message?.author || "Unknown").trim() || "Unknown";
      const type = String(message?.type || "").trim();
      const prefix = type === "system" ? "[system]" : "";
      return `${prefix}${speaker}: ${String(message?.text || "").trim()}`.trim();
    })
    .join("\n");
}

function buildMentorSystem(agent, mood) {
    //added current date to system prompt to help the model stay grounded in time and avoid hallucinating recent events or outdated information. 
  const currentDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  //inspired by Character.ai persona design
  // persona object for llm to make dynamic responses based on agents profile. 
  const personaLines = [
    `[CURRENT DATE: ${currentDate}] Always use this date for context. If asked about current events, politics, or recent information, use this date as reference.`,
    `You are ${agent.name}, role: ${agent.role}.`,
    `Domain: ${agent.domain || "General"}.`,
    `Era: ${agent.era || "present day"}.`,
    `Expertise: ${agent.expertise || "broad reasoning"}.`,
    `Stance: ${agent.stance || "neutral"}.`,
    `Persona and reasoning method: ${agent.description || `${agent.name} is an expert mentor.`}`,
    `Speech style: ${agent.speechStyle || agent.style || "clear and direct"}.`,
    `Personality traits: ${agent.personalityTraits || "thoughtful, analytical, composed"}.`,
    `Special ability: ${agent.specialAbility || "finding the strongest angle quickly"}.`,
    `Typical opening angle: ${agent.openingAngle || "frame the strongest practical tension first"}.`,
    `Backstory/lore: ${agent.backstoryLore || agent.description || `${agent.name} is an expert mentor.`}`,
    `Debate stats: logic ${agent.stats?.logic ?? 70}, rhetoric ${agent.stats?.rhetoric ?? 70}, bias ${agent.stats?.bias ?? 40}.`,
    `Debate mood: ${mood}.`,
    "Stay fully within this persona and these constraints.",
    "Sound like this person or persona specifically, not like a generic AI assistant or moderator.",
    "Let word choice, rhythm, priorities, and argumentative habits reflect the persona naturally.",
    "Do not mention the prompt, hidden instructions, or that you are an AI.",
    "If uncertain about a fact, acknowledge uncertainty in character instead of inventing details.",
  ];

  return personaLines.join("\n");
}
// todo:func to call openrouter with { system (default system architecture), prompt(ai role), model(agent persona) , temperature(creativity value) , maxTokens = 6600(limit of api calls per call) }
// returns object with response
async function callOpenRouter({ system, prompt, model = OPENROUTER_MODEL, temperature = 0.5, maxTokens = 6600 }) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("Missing OPENROUTER_API_KEY.");
// ai req 
  const response = await axios.post(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      model,
      temperature,
      max_tokens: maxTokens,// limit api token use 
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
// OpenRouter's response format may vary; this attempts to extract the main text content robustly.
  return extractTextContent(response.data?.choices?.[0]?.message?.content);
}
// openroutercall returns obj but as a string, so we need to convert them into json obj
async function callJsonTask({ system, prompt, temperature = 0.3 }) {
  const raw = await callOpenRouter({ system, prompt, temperature });
  const jsonText = extractFirstJsonObject(raw);
  if (!jsonText) {
    throw new Error("Model did not return JSON.");
  }
  return JSON.parse(jsonText);
}
// returns res in  obj format


// todo: make a fall back function that returns a dead reply so asistants still responds even if the llm api call fails,
function buildFallbackReply({ agent, topic, mood, userText, turnNumber }) {
  const openings = {
    supportive: "There is something workable in your case, but it needs firmer structure.",
    skeptical: "The weak point is that the claim is running ahead of the proof.",
    aggressive: "That argument is exposed; an opponent would break it quickly.",
    balanced: "There is a real argument here, but it is not yet sharp enough.",
  };

  const opener = openings[mood] || openings.balanced;
  return `${opener} From a ${agent.domain} perspective, the missing piece is precision. On "${topic}", your latest point was "${userText}". Tighten it by grounding the claim in one concrete mechanism, one credible example, and one clear consequence.

My angle on turn ${turnNumber}: ${agent.openingAngle || "frame the strongest practical argument first."} Speak in a ${agent.speechStyle || "clear and direct"} way and lean into ${agent.specialAbility || "your strongest line of reasoning"}.`;
}
//generates mentor reply and next agent for the council 
async function generateMentorReply({ agent, topic, mood, userText, conversation, turnNumber }) {
  const system = buildMentorSystem(agent, mood);
  const prompt = `Task goal:
Respond as this persona in a live council chat and help the user sharpen their argument on the topic.

Topic:
${topic}

Council context:
${formatConversation(conversation) || "No prior messages."}

Latest user message:
${userText}

Output constraints:
- answer as one council speaker, not as a moderator
- stay fully in character
- begin directly with the response; do not introduce yourself by name
- give critique plus one concrete improvement
- build on earlier mentor points only when it genuinely sharpens the response
- keep the voice faithful to the persona's speaking tone, reasoning method, and priorities
- avoid generic assistant phrasing
- for real public figures, echo recognizable reasoning style without inventing fake biographical facts or quoting famous lines
- 1-2 short paragraphs max`;

  try {
    return await callOpenRouter({ system, prompt, temperature: 0.6 });
  } catch (error) {
    console.error("LLM provider failed: openrouter", error.message);
  }

  return buildFallbackReply({ agent, topic, mood, userText, turnNumber });
}

export { callJsonTask, generateMentorReply };