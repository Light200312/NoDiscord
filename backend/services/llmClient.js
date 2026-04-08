import axios from "axios";

const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "google/gemini-2.0-flash-001";
const GROK_MODEL = process.env.GROK_MODEL || "grok-4-1-fast-reasoning";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash-001";
const TOGETHER_MODEL = process.env.TGAI_MODEL || "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free";
const TGI_BASE_URL = String(process.env.TGI_BASE_URL || "http://127.0.0.1:8080").replace(/\/$/, "");
const TGI_MODEL = process.env.TGI_MODEL || "tgi-local";
const TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS || 60000);
const GEMINI_RPM = Number(process.env.GEMINI_RPM || 10);
const RATE_LIMIT_WINDOW_MS = 60_000;
const DEFAULT_PROVIDER_CONCURRENCY = Number(process.env.LLM_MAX_CONCURRENCY || 1);
const DEFAULT_PROVIDER_RETRIES = Number(process.env.LLM_MAX_RETRIES || 3);
const DEFAULT_PROVIDER_BASE_DELAY_MS = Number(process.env.LLM_RETRY_BASE_DELAY_MS || 2000);
const DEFAULT_PROVIDER_MAX_DELAY_MS = Number(process.env.LLM_RETRY_MAX_DELAY_MS || 30_000);
const DEFAULT_PROVIDER_RPM = Number(process.env.LLM_DEFAULT_RPM || 10);
const TOKEN_BUDGETS = {
  reply: Number(process.env.LLM_MAX_TOKENS_REPLY || 1000),
  orchestration: Number(process.env.LLM_MAX_TOKENS_ORCHESTRATION || 400),
  generation: Number(process.env.LLM_MAX_TOKENS_GENERATION || 2000),
  report: Number(process.env.LLM_MAX_TOKENS_REPORT || 2500),
  smallJson: Number(process.env.LLM_MAX_TOKENS_SMALL_JSON || 1200),
  test: Number(process.env.LLM_MAX_TOKENS_TEST || 16),
};

const providerRateState = new Map();
const providerExecutionState = new Map();
const RETRYABLE_STATUS_CODES = new Set([408, 409, 425, 429, 500, 502, 503, 504]);
const RETRYABLE_ERROR_CODES = new Set([
  "ECONNABORTED",
  "ECONNRESET",
  "ENOTFOUND",
  "EAI_AGAIN",
  "ETIMEDOUT",
  "ERR_NETWORK",
]);

const PROVIDER_POLICIES = {
  openrouter: {
    rpm: Number(process.env.OPENROUTER_RPM || DEFAULT_PROVIDER_RPM),
    maxConcurrent: Number(process.env.OPENROUTER_MAX_CONCURRENCY || DEFAULT_PROVIDER_CONCURRENCY),
    minIntervalMs: Number(process.env.OPENROUTER_MIN_INTERVAL_MS || 6500),
    maxRetries: Number(process.env.OPENROUTER_MAX_RETRIES || DEFAULT_PROVIDER_RETRIES),
    baseDelayMs: Number(process.env.OPENROUTER_RETRY_BASE_DELAY_MS || DEFAULT_PROVIDER_BASE_DELAY_MS),
    maxDelayMs: Number(process.env.OPENROUTER_RETRY_MAX_DELAY_MS || DEFAULT_PROVIDER_MAX_DELAY_MS),
  },
  grok: {
    rpm: Number(process.env.GROK_RPM || DEFAULT_PROVIDER_RPM),
    maxConcurrent: Number(process.env.GROK_MAX_CONCURRENCY || DEFAULT_PROVIDER_CONCURRENCY),
    minIntervalMs: Number(process.env.GROK_MIN_INTERVAL_MS || 6500),
    maxRetries: Number(process.env.GROK_MAX_RETRIES || DEFAULT_PROVIDER_RETRIES),
    baseDelayMs: Number(process.env.GROK_RETRY_BASE_DELAY_MS || DEFAULT_PROVIDER_BASE_DELAY_MS),
    maxDelayMs: Number(process.env.GROK_RETRY_MAX_DELAY_MS || DEFAULT_PROVIDER_MAX_DELAY_MS),
  },
  gemini: {
    rpm: GEMINI_RPM,
    maxConcurrent: Number(process.env.GEMINI_MAX_CONCURRENCY || DEFAULT_PROVIDER_CONCURRENCY),
    minIntervalMs: Number(process.env.GEMINI_MIN_INTERVAL_MS || Math.ceil(RATE_LIMIT_WINDOW_MS / Math.max(GEMINI_RPM, 1))),
    maxRetries: Number(process.env.GEMINI_MAX_RETRIES || DEFAULT_PROVIDER_RETRIES),
    baseDelayMs: Number(process.env.GEMINI_RETRY_BASE_DELAY_MS || DEFAULT_PROVIDER_BASE_DELAY_MS),
    maxDelayMs: Number(process.env.GEMINI_RETRY_MAX_DELAY_MS || DEFAULT_PROVIDER_MAX_DELAY_MS),
  },
  together: {
    rpm: Number(process.env.TGAI_RPM || DEFAULT_PROVIDER_RPM),
    maxConcurrent: Number(process.env.TGAI_MAX_CONCURRENCY || DEFAULT_PROVIDER_CONCURRENCY),
    minIntervalMs: Number(process.env.TGAI_MIN_INTERVAL_MS || 6500),
    maxRetries: Number(process.env.TGAI_MAX_RETRIES || DEFAULT_PROVIDER_RETRIES),
    baseDelayMs: Number(process.env.TGAI_RETRY_BASE_DELAY_MS || DEFAULT_PROVIDER_BASE_DELAY_MS),
    maxDelayMs: Number(process.env.TGAI_RETRY_MAX_DELAY_MS || DEFAULT_PROVIDER_MAX_DELAY_MS),
  },
  tgi: {
    rpm: Number(process.env.TGI_RPM || 0),
    maxConcurrent: Number(process.env.TGI_MAX_CONCURRENCY || 2),
    minIntervalMs: Number(process.env.TGI_MIN_INTERVAL_MS || 0),
    maxRetries: Number(process.env.TGI_MAX_RETRIES || 1),
    baseDelayMs: Number(process.env.TGI_RETRY_BASE_DELAY_MS || 1000),
    maxDelayMs: Number(process.env.TGI_RETRY_MAX_DELAY_MS || 5000),
  },
};

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

function extractBalancedJsonValue(text = "", opener = "{", closer = "}") {
  const safe = String(text || "");
  const start = safe.indexOf(opener);
  if (start < 0) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < safe.length; index += 1) {
    const char = safe[index];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
      continue;
    }

    if (char === opener) {
      depth += 1;
      continue;
    }

    if (char === closer) {
      depth -= 1;
      if (depth === 0) {
        return safe.slice(start, index + 1);
      }
    }
  }

  return null;
}

function extractFirstJsonObject(text = "") {
  return extractBalancedJsonValue(text, "{", "}");
}

function extractFirstJsonArray(text = "") {
  return extractBalancedJsonValue(text, "[", "]");
}

function extractFirstJson(text = "") {
  const safe = String(text || "");
  const objectStart = safe.indexOf("{");
  const arrayStart = safe.indexOf("[");

  if (objectStart < 0 && arrayStart < 0) return null;
  if (arrayStart >= 0 && (objectStart < 0 || arrayStart < objectStart)) {
    return extractFirstJsonArray(safe);
  }
  return extractFirstJsonObject(safe);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function jitter(ms) {
  const spread = Math.max(250, Math.round(ms * 0.2));
  return Math.max(0, ms + Math.round((Math.random() * 2 - 1) * spread));
}

async function acquireRateLimitSlot(provider, { rpm, windowMs = RATE_LIMIT_WINDOW_MS } = {}) {
  if (!Number.isFinite(rpm) || rpm <= 0) return;

  const current =
    providerRateState.get(provider) || {
      timestamps: [],
      tail: Promise.resolve(),
    };

  let releaseTail;
  const previousTail = current.tail;
  current.tail = new Promise((resolve) => {
    releaseTail = resolve;
  });
  providerRateState.set(provider, current);

  await previousTail;

  try {
    const prune = () => {
      const now = Date.now();
      current.timestamps = current.timestamps.filter((timestamp) => now - timestamp < windowMs);
      return now;
    };

    let now = prune();
    if (current.timestamps.length >= rpm) {
      const oldestTimestamp = current.timestamps[0];
      const waitMs = Math.max(0, windowMs - (now - oldestTimestamp) + 5);
      console.log(`[rate-limit] ${provider} reached ${rpm} RPM. Waiting ${waitMs}ms before next call.`);
      await sleep(waitMs);
      now = prune();
    }

    current.timestamps.push(now);
  } finally {
    releaseTail();
  }
}

function getProviderPolicy(provider) {
  const policy = PROVIDER_POLICIES[provider] || {};
  return {
    rpm: Number.isFinite(Number(policy.rpm)) ? Number(policy.rpm) : DEFAULT_PROVIDER_RPM,
    windowMs: RATE_LIMIT_WINDOW_MS,
    maxConcurrent: Math.max(1, Number(policy.maxConcurrent || DEFAULT_PROVIDER_CONCURRENCY)),
    minIntervalMs: Math.max(0, Number(policy.minIntervalMs || 0)),
    maxRetries: Math.max(0, Number(policy.maxRetries || DEFAULT_PROVIDER_RETRIES)),
    baseDelayMs: Math.max(250, Number(policy.baseDelayMs || DEFAULT_PROVIDER_BASE_DELAY_MS)),
    maxDelayMs: Math.max(1000, Number(policy.maxDelayMs || DEFAULT_PROVIDER_MAX_DELAY_MS)),
  };
}

function getProviderExecutionState(provider) {
  if (!providerExecutionState.has(provider)) {
    providerExecutionState.set(provider, {
      timestamps: [],
      active: 0,
      nextAllowedAt: 0,
    });
  }
  return providerExecutionState.get(provider);
}

function pruneProviderTimestamps(state, windowMs) {
  const now = Date.now();
  state.timestamps = state.timestamps.filter((timestamp) => now - timestamp < windowMs);
  return now;
}

async function acquireProviderExecutionSlot(provider) {
  const policy = getProviderPolicy(provider);
  const state = getProviderExecutionState(provider);

  while (true) {
    const now = pruneProviderTimestamps(state, policy.windowMs);
    const intervalWaitMs = Math.max(0, state.nextAllowedAt - now);
    const rateWaitMs =
      policy.rpm > 0 && state.timestamps.length >= policy.rpm
        ? Math.max(0, policy.windowMs - (now - state.timestamps[0]) + 5)
        : 0;

    if (state.active < policy.maxConcurrent && intervalWaitMs <= 0 && rateWaitMs <= 0) {
      state.active += 1;
      state.timestamps.push(now);
      state.nextAllowedAt = Math.max(state.nextAllowedAt, now + policy.minIntervalMs);
      return { state, policy };
    }

    const waitMs = Math.max(intervalWaitMs, rateWaitMs, state.active >= policy.maxConcurrent ? 100 : 0);
    console.log(`[rate-limit] ${provider} queueing next request for ${waitMs}ms.`);
    await sleep(waitMs);
  }
}

function releaseProviderExecutionSlot(state) {
  state.active = Math.max(0, state.active - 1);
}

function parseRetryAfterHeader(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;

  const seconds = Number(raw);
  if (Number.isFinite(seconds)) return Math.max(0, Math.round(seconds * 1000));

  const asDate = Date.parse(raw);
  if (Number.isFinite(asDate)) return Math.max(0, asDate - Date.now());

  return null;
}

function parseRetryDelayValue(value) {
  const raw = String(value || "").trim();
  const match = raw.match(/^(\d+(?:\.\d+)?)(ms|s|m)?$/i);
  if (!match) return null;

  const amount = Number(match[1]);
  const unit = String(match[2] || "ms").toLowerCase();
  if (!Number.isFinite(amount)) return null;
  if (unit === "m") return Math.round(amount * 60_000);
  if (unit === "s") return Math.round(amount * 1000);
  return Math.round(amount);
}

function getSuggestedRetryDelayMs(error) {
  const headerDelay = parseRetryAfterHeader(error?.response?.headers?.["retry-after"]);
  if (Number.isFinite(headerDelay)) return headerDelay;

  const details = Array.isArray(error?.response?.data?.error?.details) ? error.response.data.error.details : [];
  for (const detail of details) {
    const retryDelay = parseRetryDelayValue(detail?.retryDelay);
    if (Number.isFinite(retryDelay)) return retryDelay;
  }

  return null;
}

function isRetryableError(error) {
  const status = Number(error?.response?.status);
  if (RETRYABLE_STATUS_CODES.has(status)) return true;

  const errorCode = String(error?.code || "").trim().toUpperCase();
  return RETRYABLE_ERROR_CODES.has(errorCode);
}

function getRetryDelayMs(provider, error, attempt) {
  const policy = getProviderPolicy(provider);
  const suggested = getSuggestedRetryDelayMs(error);
  if (Number.isFinite(suggested) && suggested > 0) {
    return Math.min(policy.maxDelayMs, Math.max(policy.baseDelayMs, jitter(suggested)));
  }

  const delay = policy.baseDelayMs * (2 ** attempt);
  return Math.min(policy.maxDelayMs, jitter(delay));
}

async function runWithProviderPolicy(provider, operation) {
  const { state, policy } = await acquireProviderExecutionSlot(provider);

  try {
    for (let attempt = 0; ; attempt += 1) {
      try {
        return await operation();
      } catch (error) {
        if (!isRetryableError(error) || attempt >= policy.maxRetries) {
          throw error;
        }

        const delayMs = getRetryDelayMs(provider, error, attempt);
        state.nextAllowedAt = Math.max(state.nextAllowedAt, Date.now() + delayMs);
        console.warn(
          `[llm] ${provider} transient failure. Retrying in ${delayMs}ms (${attempt + 1}/${policy.maxRetries}).`
        );
        await sleep(delayMs);
      }
    }
  } finally {
    releaseProviderExecutionSlot(state);
  }
}

function normalizePromptInput(input) {
  if (typeof input === "string") {
    return {
      system: "Return only valid JSON that satisfies the user's request.",
      prompt: input,
      temperature: 0.3,
      maxTokens: TOKEN_BUDGETS.smallJson,
    };
  }
  return {
    system: String(input?.system || "").trim(),
    prompt: String(input?.prompt || "").trim(),
    temperature: Number.isFinite(Number(input?.temperature)) ? Number(input.temperature) : 0.3,
    maxTokens: Number.isFinite(Number(input?.maxTokens))
      ? Number(input.maxTokens)
      : TOKEN_BUDGETS.smallJson,
  };
}

function buildProviderErrorMessage(provider, error) {
  const status = error?.response?.status ? `status ${error.response.status}` : "no-status";
  const details =
    String(error?.response?.data?.error?.message || error?.response?.data?.message || error?.message || "").trim() ||
    "unknown error";
  return `${provider} failed (${status}): ${details}`;
}

async function callOpenRouter({ system, prompt, model = OPENROUTER_MODEL, temperature = 0.4, maxTokens = 1400 }) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("Missing OPENROUTER_API_KEY.");

  const response = await runWithProviderPolicy("openrouter", () =>
    axios.post(
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
    )
  );

  return extractTextContent(response.data?.choices?.[0]?.message?.content);
}

async function callOpenRouterSecondary({
  system,
  prompt,
  model = OPENROUTER_MODEL,
  temperature = 0.4,
  maxTokens = 1400,
}) {
  const apiKey = process.env.OPENROUTER_API_KEY2;
  if (!apiKey) throw new Error("Missing OPENROUTER_API_KEY2.");

  const response = await runWithProviderPolicy("openrouter", () =>
    axios.post(
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
    )
  );

  return extractTextContent(response.data?.choices?.[0]?.message?.content);
}

async function callGrok({ system, prompt, model = GROK_MODEL, temperature = 0.4, maxTokens = 1400 }) {
  const apiKey = process.env.GROK_API_Key;
  if (!apiKey) throw new Error("Missing GROK_API_Key.");

  const response = await runWithProviderPolicy("grok", () =>
    axios.post(
      "https://api.x.ai/v1/chat/completions",
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
    )
  );

  const text = extractTextContent(response.data?.choices?.[0]?.message?.content);
  if (!text) throw new Error("Grok returned no content.");
  return text;
}

async function callGemini({ system, prompt, model = GEMINI_MODEL, temperature = 0.4, maxTokens = 1400 }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY.");

  const response = await runWithProviderPolicy("gemini", () =>
    axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        contents: [
          {
            role: "user",
            parts: [{ text: `${system}\n\n${prompt}` }],
          },
        ],
        generationConfig: {
          temperature,
          maxOutputTokens: Number(maxTokens || TOKEN_BUDGETS.smallJson),
        },
      },
      {
        timeout: TIMEOUT_MS,
        headers: {
          "content-type": "application/json",
        },
      }
    )
  );

  const candidate = response.data?.candidates?.[0];
  const text = candidate?.content?.parts?.map((part) => part.text).join("\n") || "";
  if (!text.trim()) throw new Error("Gemini returned no content.");
  return text.trim();
}

async function callTogetherAI({ system, prompt, model = TOGETHER_MODEL, temperature = 0.4, maxTokens = 1400 }) {
  const apiKey = process.env.TGAI;
  if (!apiKey) throw new Error("Missing TGAI.");

  const response = await runWithProviderPolicy("together", () =>
    axios.post(
      "https://api.together.xyz/v1/chat/completions",
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
    )
  );

  const text = extractTextContent(response.data?.choices?.[0]?.message?.content);
  if (!text) throw new Error("Together AI returned no content.");
  return text;
}

async function callTGI({ system, prompt, temperature = 0.4, maxTokens = 1400 }) {
  const chatPayload = {
    model: TGI_MODEL,
    temperature,
    max_tokens: maxTokens,
    messages: [
      { role: "system", content: system },
      { role: "user", content: prompt },
    ],
  };

  try {
    const response = await runWithProviderPolicy("tgi", () =>
      axios.post(`${TGI_BASE_URL}/v1/chat/completions`, chatPayload, {
        timeout: TIMEOUT_MS,
        headers: {
          "content-type": "application/json",
        },
      })
    );
    const text = extractTextContent(response.data?.choices?.[0]?.message?.content);
    if (!text) throw new Error("TGI chat endpoint returned no content.");
    return text;
  } catch (chatError) {
    const fallbackPrompt = `${system}\n\n${prompt}`;
    const response = await runWithProviderPolicy("tgi", () =>
      axios.post(
        `${TGI_BASE_URL}/generate`,
        {
          inputs: fallbackPrompt,
          parameters: {
            temperature,
            max_new_tokens: maxTokens,
            return_full_text: false,
          },
        },
        {
          timeout: TIMEOUT_MS,
          headers: {
            "content-type": "application/json",
          },
        },
      )
    );
    const text = String(response.data?.generated_text || "").trim();
    if (!text) {
      throw new Error(`TGI chat fallback failed: ${buildProviderErrorMessage("TGI-chat", chatError)}`);
    }
    return text;
  }
}

function getProviderChain() {
  return [
    { name: "openrouter", enabled: Boolean(process.env.OPENROUTER_API_KEY), fn: callOpenRouter },
    { name: "openrouter-backup", enabled: Boolean(process.env.OPENROUTER_API_KEY2), fn: callOpenRouterSecondary },
    { name: "grok", enabled: Boolean(process.env.GROK_API_Key), fn: callGrok },
    { name: "gemini", enabled: Boolean(process.env.GEMINI_API_KEY), fn: callGemini },
    { name: "together", enabled: Boolean(process.env.TGAI), fn: callTogetherAI },
    { name: "tgi", enabled: true, fn: callTGI },
  ];
}

function hasLLMProviderConfigured() {
  return Boolean(
      process.env.OPENROUTER_API_KEY ||
      process.env.OPENROUTER_API_KEY2 ||
      process.env.GROK_API_Key ||
      process.env.GEMINI_API_KEY ||
      process.env.TGAI ||
      process.env.TGI_BASE_URL
  );
}

async function callWithFallback(request, { maxTokens = 1400, preferredProviders } = {}) {
  const chain = getProviderChain().filter((provider) =>
    Array.isArray(preferredProviders) && preferredProviders.length
      ? preferredProviders.includes(provider.name)
      : provider.enabled
  );

  const errors = [];

  for (let index = 0; index < chain.length; index += 1) {
    const provider = chain[index];
    try {
      console.log(`[llm] trying ${provider.name}`);
      const text = await provider.fn({ ...request, maxTokens });
      console.log(`[llm] ${provider.name} succeeded`);
      return { text, provider: provider.name };
    } catch (error) {
      const message = buildProviderErrorMessage(provider.name, error);
      errors.push(message);
      const nextProvider = chain[index + 1]?.name;
      if (nextProvider) {
        console.warn(`[llm] ${message}. Trying ${nextProvider} next.`);
      } else {
        console.error(`[llm] ${message}. No providers left to try.`);
      }
    }
  }

  throw new Error(errors.join(" | "));
}

async function callJsonTask(input) {
  const request = normalizePromptInput(input);
  const { text } = await callWithFallback(request, { maxTokens: request.maxTokens || TOKEN_BUDGETS.smallJson });
  const jsonText = extractFirstJson(text);
  if (!jsonText) throw new Error("Model did not return JSON.");
  return JSON.parse(jsonText);
}

function formatConversation(conversation = []) {
  return conversation
    .slice(-8)
    .map((message) => `${message.speakerName}: ${String(message.text || "").trim()}`)
    .join("\n");
}

function normalizeLanguageMode(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "hinglish") return "hinglish";
  if (normalized === "english_us") return "english_us";
  return "english_us";
}

function getLanguageInstruction(languageMode = "english_in") {
  const normalizedLanguageMode = normalizeLanguageMode(languageMode);
  if (normalizedLanguageMode === "hinglish") {
    return [
      "Respond in natural Hinglish using roman script only.",
      "Keep the language about 80% Hindi and 20% English, like a normal Indian speaker in everyday conversation.",
      "Prefer simple, familiar Hindi phrasing with some natural English words where Indians commonly mix them in.",
      "Do not sound foreign, over-formal, overly Sanskritized, or like a translated script.",
      "Do not use markdown bullets, asterisks, or * anywhere in the response.",
      "Use a clear, well-known Indian conversational voice that still fits the persona.",
    ].join(" ");
  }
  if (normalizedLanguageMode === "english_us") {
    return "Respond in clear, natural US English. Use familiar American phrasing and a conversational tone.";
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
    `Identity anchor: when you answer, sound like ${agent.name} would sound if speaking live in this room right now.`,
    "Character-faithfulness rules:",
    "- speak in a way that matches this specific person's worldview, rhythm, priorities, and temperament",
    "- preserve the persona's likely diction level: plainspoken, scholarly, blunt, poetic, bureaucratic, tactical, etc.",
    "- let the answer reflect the persona's incentives, lived experience, and intellectual habits, not just the topic",
    "- if the persona is historical or fictional, avoid sounding like a generic modern AI assistant explaining them from outside",
    "- answer from inside the character's point of view, not as a narrator describing the character",
    "- let the speech style visibly shape sentence length, emphasis, and framing",
    "- use the agent's known backstory, role, era, and priorities as the source of their instincts",
    "- for historical figures, ground the response in historically plausible beliefs, concerns, institutions, and conflicts from their world",
    "- for real public figures, prefer historically or biographically defensible positions over improvised personality",
    "- if you draw on known historical record, absorb it naturally into the voice; do not cite it like a textbook unless this persona naturally would",
    "- do not use bland assistant phrases like 'as an AI', 'I would suggest', 'it's important to note', or generic summary filler",
    "- when the persona is opinionated or distinctive, let that distinctiveness show without becoming parody or caricature",
    "- prefer concrete framing, metaphors, and priorities this persona would naturally reach for",
    "- if a fact is uncertain, express uncertainty in-character rather than breaking persona",
    getLanguageInstruction(languageMode),
    "Stay fully within this persona and these constraints.",
    "Sound like this person or persona specifically, not like a generic AI assistant or moderator.",
    "If uncertain about a fact, acknowledge uncertainty in character instead of inventing details.",
  ].join("\n");
}

function buildFallbackReply({ agent, topic, userText, turnNumber, languageMode }) {
  const normalizedLanguageMode = normalizeLanguageMode(languageMode);
  const intro =
    normalizedLanguageMode === "hinglish"
      ? `Tumhari baat mein potential hai, lekin "${topic}" par ise aur sharp banana padega.`
      : `Your point has potential, but it needs sharper structure on "${topic}".`;

  if (normalizedLanguageMode === "hinglish") {
    return `${intro} Latest point "${userText}" ko aur strong banane ke liye ek concrete mechanism, ek solid example, aur ek clear consequence add karo.\n\nTurn ${turnNumber} mein ${agent.specialAbility || "apni strongest reasoning"} par lean karo aur tone ${agent.speechStyle || "clear aur direct"} rakho.`;
  }

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
- make the reply recognizably sound like this persona, not just a smart generic debater
- preserve their likely worldview, sentence rhythm, and choice of examples
- use wording this persona could plausibly say in a live conversation
- let ${agent.name}'s speechStyle and openingAngle influence how the answer begins and unfolds
- when useful, draw on historically grounded details, institutional logic, or lived experience this persona would actually know
- do not turn the answer into a biography or encyclopedia entry; make it feel like a real person speaking
- avoid sterile bullet-point thinking unless this persona would naturally speak that way
- avoid generic assistant phrasing
- 1-2 short paragraphs max`;

  try {
    const { text } = await callWithFallback(
      { system, prompt, temperature: 0.6 },
      { maxTokens: TOKEN_BUDGETS.reply }
    );
    return text;
  } catch (error) {
    console.error(`[llm] all providers failed for mentor reply: ${error.message}`);
    return buildFallbackReply({ agent, topic, userText, turnNumber, languageMode });
  }
}

async function testLLMProviders() {
  const request = {
    system: "Reply with only the word OK.",
    prompt: "Reply with only the word OK.",
    temperature: 0,
  };

  const results = [];
  for (const provider of getProviderChain()) {
    if (!provider.enabled && provider.name !== "tgi") {
      results.push({ provider: provider.name, ok: false, reason: "disabled or missing credentials" });
      continue;
    }
    try {
      console.log(`[llm-test] trying ${provider.name}`);
      const text = await provider.fn({ ...request, maxTokens: TOKEN_BUDGETS.test });
      results.push({ provider: provider.name, ok: Boolean(String(text || "").trim()), preview: String(text || "").trim().slice(0, 60) });
      console.log(`[llm-test] ${provider.name} ok`);
    } catch (error) {
      const message = buildProviderErrorMessage(provider.name, error);
      results.push({ provider: provider.name, ok: false, reason: message });
      console.warn(`[llm-test] ${message}`);
    }
  }
  return results;
}

async function testGeminiRateLimiter({ rpm = 10, requests = 12, windowMs = 60_000 } = {}) {
  providerRateState.delete("gemini-test");
  const startedAt = Date.now();
  const timestamps = [];

  for (let index = 0; index < requests; index += 1) {
    await acquireRateLimitSlot("gemini-test", { rpm, windowMs });
    timestamps.push(Date.now() - startedAt);
  }

  return {
    rpm,
    requests,
    windowMs,
    timestamps,
    totalElapsedMs: timestamps[timestamps.length - 1] || 0,
  };
}

export {
  callGemini,
  callGrok,
  callJsonTask,
  callOpenRouter,
  callTGI,
  callTogetherAI,
  callWithFallback,
  generateMentorReply,
  hasLLMProviderConfigured,
  TOKEN_BUDGETS,
  testGeminiRateLimiter,
  testLLMProviders,
};
