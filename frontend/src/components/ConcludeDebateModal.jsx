import { useEffect, useMemo, useState } from "react";
import { downloadPdf } from "../libs/pdf";
import { api } from "../libs/api";

const ARGUMENT_SIGNAL_WORDS = [
  "should",
  "must",
  "because",
  "therefore",
  "evidence",
  "reason",
  "argue",
  "claim",
  "impact",
  "result",
  "data",
  "policy",
  "risk",
  "solution",
];

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "that",
  "with",
  "this",
  "from",
  "have",
  "about",
  "your",
  "their",
  "they",
  "them",
  "into",
  "also",
  "would",
  "could",
  "there",
  "where",
  "when",
  "what",
  "were",
  "been",
  "more",
  "than",
  "will",
  "just",
  "some",
  "because",
  "which",
  "while",
  "after",
  "before",
  "under",
  "between",
  "over",
  "only",
]);

function normalizeText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function summarizeMessage(text = "", maxLength = 180) {
  const normalized = normalizeText(text);
  if (!normalized) return "";
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

function formatTimestamp(timestamp) {
  if (!timestamp) return "Unknown time";
  return new Date(timestamp).toLocaleString();
}

function scoreMessage(text = "") {
  const normalized = normalizeText(text).toLowerCase();
  const words = normalized.split(/\s+/).filter(Boolean);
  const signalScore = ARGUMENT_SIGNAL_WORDS.reduce(
    (score, term) => score + (normalized.includes(term) ? 2 : 0),
    0
  );
  return signalScore + Math.min(words.length, 50) / 10;
}

function inferContribution(text = "") {
  const normalized = normalizeText(text).toLowerCase();
  if (/risk|safety|harm|threat|failure/.test(normalized)) {
    return "Highlights practical risks and what to mitigate first.";
  }
  if (/cost|budget|price|economic|resource/.test(normalized)) {
    return "Grounds the debate in feasibility and resource trade-offs.";
  }
  if (/data|evidence|study|research|metric/.test(normalized)) {
    return "Adds evidence that strengthens decision quality.";
  }
  if (/ethic|fair|privacy|rights|equity/.test(normalized)) {
    return "Introduces social and ethical guardrails for the decision.";
  }
  if (/policy|law|regulation|government/.test(normalized)) {
    return "Connects arguments to policy and implementation constraints.";
  }
  return "Adds an additional lens that improves the final recommendation.";
}

function getTopThemes(messages = []) {
  const counts = new Map();
  messages.forEach((message) => {
    normalizeText(message.text)
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 3 && !STOP_WORDS.has(word))
      .forEach((word) => counts.set(word, (counts.get(word) || 0) + 1));
  });
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 4)
    .map(([word]) => word);
}

function buildReport(messages = [], topic = "") {
  const debateMessages = (messages || [])
    .filter((message) => (message.type === "mentor" || message.type === "user") && normalizeText(message.text))
    .map((message) => ({
      id: message.id,
      author: message.author || message.speakerName || (message.type === "user" ? "You" : "Council Member"),
      type: message.type,
      text: normalizeText(message.text),
      summary: summarizeMessage(message.text),
      timestamp: formatTimestamp(message.timestamp),
      score: scoreMessage(message.text),
    }));

  const keyArguments = [...debateMessages]
    .sort((left, right) => right.score - left.score)
    .slice(0, 5)
    .map((item) => ({
      ...item,
      quote: `"${item.summary}" — ${item.author}`,
      contribution: inferContribution(item.text),
    }));

  const mentorMessages = debateMessages.filter((message) => message.type === "mentor");
  const userMessages = debateMessages.filter((message) => message.type === "user");
  const themes = getTopThemes(debateMessages);
  const topicLabel = normalizeText(topic) || "Untitled debate topic";
  const themeLabel = themes.length ? themes.join(", ") : "multiple competing priorities";

  const problemDefinition = `This report examines the topic "${topicLabel}" by combining all debate turns from participants and the user. The core problem is balancing strong but competing claims while moving toward an actionable outcome.`;

  const summaryDraft = `The discussion covered ${debateMessages.length} total turns (${mentorMessages.length} mentor responses and ${userMessages.length} user prompts). The most recurring themes were ${themeLabel}. Key points progressed from framing the challenge to evaluating constraints, trade-offs, and practical implications.`;

  const conclusionDraft =
    keyArguments.length > 0
      ? `Based on the strongest arguments, the council converges on a balanced path: preserve high-impact benefits, mitigate the clearest risks, and sequence implementation in manageable steps. This conclusion reflects the most evidence-backed and practically feasible points raised in the debate.`
      : `The available discussion is limited, but a cautious conclusion is to proceed with a balanced approach that tests assumptions, monitors risks, and iterates based on results.`;

  return {
    topicLabel,
    problemDefinition,
    keyArguments,
    summaryDraft,
    conclusionDraft,
    totalTurns: debateMessages.length,
  };
}

function ConcludeDebateModal({ isOpen, onClose, topic, sessionId, messages, participants }) {
  const report = useMemo(() => buildReport(messages, topic), [messages, topic]);
  const [summary, setSummary] = useState("");
  const [conclusion, setConclusion] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const [llmReport, setLlmReport] = useState(null);
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [draftError, setDraftError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setLlmReport(null);
    setDraftError("");
    setSummary(report.summaryDraft);
    setConclusion(report.conclusionDraft);
  }, [isOpen, report.summaryDraft, report.conclusionDraft]);

  useEffect(() => {
    if (!isOpen || !sessionId) return;
    let isActive = true;

    async function fetchLlmReport() {
      setIsGeneratingDraft(true);
      setDraftError("");
      try {
        const data = await api.generateReport(sessionId);
        if (!isActive) return;
        const generated = data?.report || null;
        setLlmReport(generated);
        if (generated?.summary) setSummary(generated.summary);
        if (generated?.conclusion) setConclusion(generated.conclusion);
      } catch (error) {
        if (!isActive) return;
        setDraftError(error.message || "Could not generate AI draft right now.");
      } finally {
        if (isActive) setIsGeneratingDraft(false);
      }
    }

    fetchLlmReport();
    return () => {
      isActive = false;
    };
  }, [isOpen, sessionId]);

  const handleDownload = () => {
    setIsDownloading(true);
    try {
      const effectiveProblemDefinition = llmReport?.problemDefinition || report.problemDefinition;
      const effectiveKeyArguments = Array.isArray(llmReport?.keyQuotedArguments) && llmReport.keyQuotedArguments.length
        ? llmReport.keyQuotedArguments.map((entry) => ({
            quote: normalizeText(entry.quote),
            contribution: normalizeText(entry.howItHelps),
          }))
        : report.keyArguments.map((item) => ({ quote: item.quote, contribution: item.contribution }));
      const participantNames = (participants || []).map((agent) => agent.name).filter(Boolean);
      const sections = [
        { type: "title", text: "NoDiscord Debate Report" },
        { type: "paragraph", text: `Topic: ${report.topicLabel}` },
        {
          type: "paragraph",
          text: `Participants: ${participantNames.length ? participantNames.join(", ") : "Not available"}`,
        },
        { type: "paragraph", text: `Generated: ${new Date().toLocaleString()}` },
        { type: "heading", text: "1) Problem Definition" },
        { type: "paragraph", text: effectiveProblemDefinition },
        { type: "heading", text: "2) Key Quoted Arguments & How They Help" },
        effectiveKeyArguments.length
          ? {
              type: "list",
              items: effectiveKeyArguments.map(
                (item, index) => `${index + 1}. ${item.quote} | Contribution: ${item.contribution}`
              ),
            }
          : { type: "paragraph", text: "No strong argument blocks were detected in the available messages." },
        { type: "heading", text: "3) Summary" },
        { type: "paragraph", text: summary || report.summaryDraft },
        { type: "heading", text: "4) Final Conclusion" },
        { type: "paragraph", text: conclusion || report.conclusionDraft },
      ];

      const safeTopic = report.topicLabel.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase();
      downloadPdf(`nodiscord-report-${safeTopic || "session"}.pdf`, sections);
      onClose();
    } catch (error) {
      console.error("Failed to generate NoDiscord report PDF", error);
      window.alert("Could not generate the report PDF. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
      <div className="w-full max-w-4xl rounded-3xl border border-slate-700 bg-slate-900 text-slate-100 shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-800 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Conclude Debate</p>
            <h2 className="mt-2 text-xl font-semibold text-white">Generate Topic Report PDF</h2>
            <p className="mt-2 text-sm text-slate-400">Total messages reviewed: {report.totalTurns}</p>
            <p className="mt-1 text-xs text-slate-500">
              {isGeneratingDraft
                ? "Generating AI draft from full debate..."
                : llmReport?.source === "llm"
                ? "AI-generated draft ready."
                : "Using fallback draft from debate messages."}
            </p>
            {llmReport?.savedConclusionId ? (
              <p className="mt-1 text-xs text-emerald-300">
                Saved to MongoDB • {llmReport.sourceType === "feature" ? `Feature: ${llmReport.sourceLabel || llmReport.sourceFeature}` : "Source: Debate"}
              </p>
            ) : null}
            {draftError ? <p className="mt-1 text-xs text-amber-300">{draftError}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-800"
          >
            Close
          </button>
        </div>

        <div className="max-h-[70vh] space-y-5 overflow-y-auto px-6 py-5">
          <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Problem / Topic</p>
            <p className="mt-3 text-sm leading-6 text-slate-200">{llmReport?.problemDefinition || report.problemDefinition}</p>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Key Quoted Arguments & Contribution
            </p>
            <div className="mt-3 space-y-3">
              {(llmReport?.keyQuotedArguments?.length ? llmReport.keyQuotedArguments : report.keyArguments).length ? (
                (llmReport?.keyQuotedArguments?.length ? llmReport.keyQuotedArguments : report.keyArguments).map(
                  (item, index) => (
                  <div key={item.id || `${item.author || item.speaker}-${index}`} className="rounded-xl border border-slate-800 bg-slate-900/80 p-3">
                    <p className="text-sm text-slate-100">{item.quote}</p>
                    {item.timestamp ? <p className="mt-2 text-xs text-slate-400">{item.timestamp}</p> : null}
                    <p className="mt-2 text-xs text-cyan-200">
                      How this helps: {item.contribution || item.howItHelps}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400">No clear key arguments found from current messages.</p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Summary</p>
            <textarea
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              rows={4}
              className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm leading-6 text-slate-100 outline-none transition focus:border-cyan-400"
            />
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Final Conclusion</p>
            <textarea
              value={conclusion}
              onChange={(event) => setConclusion(event.target.value)}
              rows={4}
              className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm leading-6 text-slate-100 outline-none transition focus:border-cyan-400"
            />
          </section>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-800 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={isDownloading}
            className="rounded-full border border-blue-400/30 bg-gradient-to-r from-blue-500 to-cyan-500 px-5 py-2 text-sm font-semibold text-white transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isDownloading ? "Generating…" : "Download PDF Report"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConcludeDebateModal;
