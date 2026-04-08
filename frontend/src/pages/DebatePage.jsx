import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../libs/store";
import ConcludeDebateModal from "../components/ConcludeDebateModal";

const AGENT_COLOR_MAP = {
  "Ava Rao": "border-blue-500/40 bg-blue-500/10 text-blue-100 shadow-blue-500/10",
  "Minister Kavya": "border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-100 shadow-fuchsia-500/10",
  "Prof. Meera Joshi": "border-emerald-500/40 bg-emerald-500/10 text-emerald-100 shadow-emerald-500/10",
  "Rohan Mallick": "border-amber-500/40 bg-amber-500/10 text-amber-100 shadow-amber-500/10",
  "Dr. Sara Nair": "border-pink-500/40 bg-pink-500/10 text-pink-100 shadow-pink-500/10",
  "Arjun Patel": "border-cyan-500/40 bg-cyan-500/10 text-cyan-100 shadow-cyan-500/10",
  "Nisha Verma": "border-indigo-500/40 bg-indigo-500/10 text-indigo-100 shadow-indigo-500/10",
};

function getInitials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function DebatePage() {
  const navigate = useNavigate();
  const agents = useStore((s) => s.agents);
  const loading = useStore((s) => s.loading);
  const session = useStore((s) => s.session);
  const settings = useStore((s) => s.settings);
  const setSettings = useStore((s) => s.setSettings);
  const loadAgents = useStore((s) => s.loadAgents);
  const refreshSession = useStore((s) => s.refreshSession);
  const sendMessage = useStore((s) => s.sendMessage);
  const autoStep = useStore((s) => s.autoStep);
  const stopSession = useStore((s) => s.stopSession);
  const restartSession = useStore((s) => s.restartSession);

  const [messageText, setMessageText] = useState("");
  const [availableVoices, setAvailableVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState("");
  const [speakingId, setSpeakingId] = useState(null);
  const [showAgentInfo, setShowAgentInfo] = useState(null);
  const [isAgentPanelOpen, setIsAgentPanelOpen] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isConcluding, setIsConcluding] = useState(false);
  const [isConcludeModalOpen, setIsConcludeModalOpen] = useState(false);

  const messagesEndRef = useRef(null);
  const audioQueueRef = useRef([]);
  const lastSpokenIndexRef = useRef(-1);
  const synth = useRef(typeof window !== "undefined" ? window.speechSynthesis : null);
  const autoLoopTimerRef = useRef(null);
  const autoLoopInFlightRef = useRef(false);
  const recognitionRef = useRef(null);
  const currentUtteranceRef = useRef(null);

  const cancelCurrentSpeech = () => {
    if (synth.current) {
      synth.current.cancel();
    }
    currentUtteranceRef.current = null;
    setIsSpeaking(false);
    setIsPaused(false);
    setSpeakingId(null);
  };

  const clearPendingAutoLoop = () => {
    if (autoLoopTimerRef.current) {
      clearTimeout(autoLoopTimerRef.current);
      autoLoopTimerRef.current = null;
    }
  };

  const playAudioQueue = (forcePlay = false) => {
    if (!synth.current) return;
    if (isRecording) return;
    if (isSpeaking) return;
    if (audioQueueRef.current.length === 0) return;
    if (!settings.audioAutoSpeak && !forcePlay) return;
    setIsSpeaking(true);
    const messageId = audioQueueRef.current.shift();
    setSpeakingId(messageId);

    const utterance = new SpeechSynthesisUtterance();
    const message = (session.messages || []).find((m) => m.id === messageId);
    if (!message) {
      setIsSpeaking(false);
      playAudioQueue();
      return;
    }

    utterance.text = message.text;
    utterance.rate = 0.95;
    utterance.pitch = 1;

    if (availableVoices.length > 0) {
      utterance.voice = availableVoices.find((voice) => voice.name === selectedVoice) || availableVoices[0];
    }

    utterance.onend = () => {
      setIsSpeaking(false);
      setSpeakingId(null);
      setIsPaused(false);
      currentUtteranceRef.current = null;
      playAudioQueue();
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setSpeakingId(null);
      setIsPaused(false);
      currentUtteranceRef.current = null;
      playAudioQueue();
    };

    currentUtteranceRef.current = utterance;
    synth.current.speak(utterance);
  };

  useEffect(() => {
    if (session?.id) {
      refreshSession(session.id).catch(() => {});
    }
  }, [session?.id, refreshSession]);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  useEffect(() => {
    if (!synth.current) return undefined;

    const loadVoices = () => {
      const voices = synth.current?.getVoices?.() || [];
      setAvailableVoices(voices);
      setSelectedVoice((current) => {
        if (current && voices.some((voice) => voice.name === current)) {
          return current;
        }

        const preferredVoice =
          settings.languageMode === "hinglish"
            ? voices.find((voice) => /india|hindi/i.test(`${voice.name} ${voice.lang}`))
            : voices.find((voice) => /en[-_]in|india/i.test(`${voice.lang} ${voice.name}`));

        return preferredVoice?.name || voices[0]?.name || "";
      });
    };

    loadVoices();
    synth.current.addEventListener?.("voiceschanged", loadVoices);

    return () => {
      synth.current?.removeEventListener?.("voiceschanged", loadVoices);
    };
  }, [settings.languageMode]);

  useEffect(() => {
    if (!session?.settings) return;
    setSettings((currentSettings) => {
      const nextSettings = {
        ...currentSettings,
        ...session.settings,
      };

      const hasChanged = Object.keys(nextSettings).some(
        (key) => nextSettings[key] !== currentSettings[key]
      );

      return hasChanged ? nextSettings : currentSettings;
    });
  }, [session?.id, session?.settings, setSettings]);

  useEffect(() => {
    clearPendingAutoLoop();
    audioQueueRef.current = [];
    lastSpokenIndexRef.current = -1;
    autoLoopInFlightRef.current = false;
    cancelCurrentSpeech();

    return () => {
      clearPendingAutoLoop();
      autoLoopInFlightRef.current = false;
      audioQueueRef.current = [];
      lastSpokenIndexRef.current = -1;
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      cancelCurrentSpeech();
    };
  }, [session?.id]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [session?.messages?.length, speakingId]);

  useEffect(() => {
    const mentorOnlyMessages = (session?.messages || []).filter((m) => m.type === "mentor");
    mentorOnlyMessages.forEach((msg, idx) => {
      if (idx > lastSpokenIndexRef.current && !audioQueueRef.current.includes(msg.id)) {
        audioQueueRef.current.push(msg.id);
        lastSpokenIndexRef.current = idx;
      }
    });

    if (settings.audioAutoSpeak && !isRecording && audioQueueRef.current.length > 0 && !isSpeaking) {
      setTimeout(() => playAudioQueue(), 0);
    }
  }, [session?.messages, isSpeaking, isRecording, settings.audioAutoSpeak]);

  useEffect(() => {
    clearPendingAutoLoop();
    if (
      !settings.autoLoopEnabled ||
      !session ||
      session.closed ||
      loading ||
      isSpeaking ||
      isRecording
    ) {
      autoLoopInFlightRef.current = false;
      return;
    }

    const mentorTurnCount = (session.messages || []).filter((m) => m.type === "mentor").length;
    if (mentorTurnCount >= (session.maxArguments || 25)) {
      return;
    }

    const queueBlocksLoop = settings.audioAutoSpeak && audioQueueRef.current.length > 0;

    if (!isSpeaking && !queueBlocksLoop && !autoLoopInFlightRef.current) {
      autoLoopTimerRef.current = setTimeout(async () => {
        autoLoopInFlightRef.current = true;
        try {
          await autoStep();
        } finally {
          autoLoopInFlightRef.current = false;
        }
      }, 1200);
    }
    return () => {
      clearPendingAutoLoop();
    };
  }, [
    settings.autoLoopEnabled,
    settings.audioAutoSpeak,
    session?.messages?.length,
    session?.closed,
    isSpeaking,
    isRecording,
    loading,
    autoStep,
  ]);

  const selectedAgents = (session?.agentIds || [])
    .map((id) => agents.find((a) => a.id === id))
    .filter(Boolean);

  const mentorTurnCount = (session?.messages || []).filter((m) => m.type === "mentor").length;
  const canContinue = session && !session.closed && mentorTurnCount < (session.maxArguments || 25);
  const activeAgentInfo = showAgentInfo || selectedAgents[0] || null;

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim() || loading) return;
    const text = messageText;
    setMessageText("");
    await sendMessage(text);
  };

  const handlePlayAudio = (messageId) => {
    if (!synth.current) return;
    if (speakingId === messageId && isPaused) {
      synth.current.resume();
      setIsPaused(false);
      return;
    }

    if (speakingId === messageId && isSpeaking) return;

    audioQueueRef.current = audioQueueRef.current.filter((queuedId) => queuedId !== messageId);

    if (synth.current.speaking || synth.current.pending || isSpeaking) {
      cancelCurrentSpeech();
    }

    audioQueueRef.current.unshift(messageId);
    playAudioQueue(true);
  };

  const handlePauseResume = () => {
    if (!synth.current || !isSpeaking) return;
    if (isPaused) {
      synth.current.resume();
      setIsPaused(false);
    } else {
      synth.current.pause();
      setIsPaused(true);
    }
  };

  const handleStopAudio = () => {
    audioQueueRef.current = [];
    cancelCurrentSpeech();
  };

  const handleStartRecording = async () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not available in this browser.");
      return;
    }

    cancelCurrentSpeech();
    const recognition = new SpeechRecognition();
    recognition.lang = settings.languageMode === "hinglish" ? "hi-IN" : "en-IN";
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript || "")
        .join(" ")
        .trim();
      setMessageText(transcript);
    };

    recognition.onend = () => {
      setIsRecording(false);
      recognitionRef.current = null;
    };

    recognition.onerror = () => {
      setIsRecording(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  };

  const handleStopRecording = () => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleConcludeDebate = async () => {
    if (!session?.id || isConcluding || loading) return;
    setIsConcluding(true);
    try {
      if (!session.closed) {
        await stopSession();
      }
      setIsConcludeModalOpen(true);
    } catch (error) {
      console.error("Failed to conclude debate before report generation", error);
      window.alert("Could not conclude the debate right now. Please try again.");
    } finally {
      setIsConcluding(false);
    }
  };

  if (!session) {
    return (
      <div className="relative flex lg:h-[88vh] sm:h-[88vh] min-h-0 items-center justify-center overflow-hidden bg-slate-950 px-6">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:120px_120px]" />
          <div className="absolute left-1/4 top-20 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="absolute bottom-10 right-1/4 h-72 w-72 rounded-full bg-fuchsia-500/10 blur-3xl" />
        </div>
        <div className="relative w-full max-w-xl rounded-[32px] border border-slate-800 bg-slate-900/90 p-10 text-center shadow-2xl shadow-black/30 backdrop-blur">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-700 bg-slate-800 text-lg font-semibold text-slate-100">
            DC
          </div>
          <p className="mb-3 text-sm uppercase tracking-[0.35em] text-slate-400">Debate Council</p>
          <p className="mb-4 text-3xl font-semibold text-white">No active debate session</p>
          <p className="mb-8 text-slate-400">
            Start a new round to open the live chamber, roster, and turn-by-turn debate feed.
          </p>
          <button
            onClick={() => navigate("/agents")}
            className="rounded-full border border-white/15 bg-white px-6 py-3 font-semibold text-slate-950 transition hover:scale-[1.02] hover:bg-slate-100"
          >
            Start a new debate
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full flex lg:h-[88vh] min-h-0 flex-col overflow-hidden bg-slate-950 text-slate-100">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:120px_120px]" />
        <div className="absolute left-[10%] top-28 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute bottom-16 right-[8%] h-80 w-80 rounded-full bg-fuchsia-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex h-screen min-h-0 w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        <div className="grid min-h-0 flex-1 gap-4 overflow-hidden xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex min-h-0 flex-col overflow-hidden rounded-[28px] border border-slate-800 bg-slate-900/75 shadow-2xl shadow-black/20 backdrop-blur">
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-white">Debate Topic</p>
                <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
                  {session.topic}
                </p>
              </div>
              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                {loading ? "Thinking..." : "Ready"}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="mx-auto flex max-w-4xl flex-col gap-4">
                {(session.messages || []).map((msg, idx) => {
                  const isUser = msg.type === "user";
                  const isSystem = msg.type === "system";
                  const isMentor = msg.type === "mentor";
                  const isSpeakingNow = msg.id === speakingId;

                  return (
                    <div
                      key={msg.id || idx}
                      className={`flex ${isUser ? "justify-end" : isSystem ? "justify-center" : "justify-start"}`}
                    >
                      <div
                        className={`w-full max-w-3xl rounded-[24px] border p-4 shadow-lg transition sm:p-5 ${
                          isUser
                            ? "border-blue-400/30 bg-gradient-to-br from-blue-500/20 to-cyan-500/10 text-slate-50 shadow-blue-950/30"
                            : isSystem
                            ? "max-w-2xl border-slate-800 bg-slate-950/80 text-center text-sm italic text-slate-400"
                            : isSpeakingNow
                            ? `${AGENT_COLOR_MAP[msg.author] || "border-slate-700 bg-slate-800/90 text-slate-100 shadow-black/20"} ring-2 ring-blue-400/50`
                            : `${AGENT_COLOR_MAP[msg.author] || "border-slate-700 bg-slate-800/90 text-slate-100 shadow-black/20"}`
                        }`}
                      >
                        {!isSystem && (
                          <div className="mb-3 flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <button
                                type="button"
                                onClick={() => {
                                  const matchedAgent = selectedAgents.find((agent) => agent.name === msg.author);
                                  if (matchedAgent) setShowAgentInfo(matchedAgent);
                                }}
                                className={`flex h-11 w-11 items-center justify-center rounded-2xl border text-xs font-semibold tracking-[0.2em] ${
                                  isUser
                                    ? "border-white/15 bg-white/10 text-white"
                                    : "border-white/10 bg-slate-950/40 text-slate-200"
                                }`}
                              >
                                {getInitials(msg.author || "U")}
                              </button>
                              <div>
                                <p className="text-sm font-semibold">{msg.author}</p>
                                {msg.roleLabel && (
                                  <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                                    {msg.roleLabel}
                                  </p>
                                )}
                              </div>
                            </div>

                            {isMentor && (
                              <div className="flex items-center gap-2">
                                <button 
                                  type="button"
                                  onClick={() => handlePlayAudio(msg.id)}
                                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-200 transition hover:bg-white/10"
                                >
                                  {isSpeakingNow ? (isPaused ? "Resume" : "Playing") : "Play"}
                                </button>
                                {isSpeakingNow && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={handlePauseResume}
                                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-200 transition hover:bg-white/10"
                                    >
                                      {isPaused ? "Resume" : "Pause"}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={handleStopAudio}
                                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-200 transition hover:bg-white/10"
                                    >
                                      Stop
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                        <p className="whitespace-pre-wrap text-sm leading-7 sm:text-[15px]">{msg.text}</p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {canContinue ? (
              <form
                onSubmit={handleSendMessage}
                className="shrink-0 border-t border-slate-800 bg-slate-900/95 px-3 py-2.5 backdrop-blur"
              >
                <div className="mx-auto max-w-4xl space-y-2.5 flex items-center gap-2">
                  <div className="rounded-[20px] border w-full border-slate-800 bg-slate-950 px-3 mt-3 py-2.5">
                    <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-800 pb-2">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                        Composer Tools
                      </span>
                      <select
                        value={selectedVoice}
                        onChange={(e) => setSelectedVoice(e.target.value)}
                        className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-100 outline-none transition focus:border-blue-400"
                        disabled={availableVoices.length === 0}
                      >
                        {availableVoices.length === 0 ? (
                          <option value="">No voices available</option>
                        ) : (
                          availableVoices.map((voice) => (
                            <option key={`${voice.name}-${voice.lang}`} value={voice.name}>
                              {voice.name} ({voice.lang})
                            </option>
                          ))
                        )}
                      </select>

                      <label className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-300">
                        <input
                          type="checkbox"
                          checked={settings.autoLoopEnabled}
                          onChange={(e) => setSettings({ autoLoopEnabled: e.target.checked })}
                          className="h-3.5 w-3.5 accent-blue-500"
                        />
                        Auto loop
                      </label>

                      <select
                        value={settings.languageMode}
                        onChange={(e) => setSettings({ languageMode: e.target.value })}
                        className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-100 outline-none transition focus:border-blue-400"
                      >
                        <option value="english_in">English (IN)</option>
                        <option value="hinglish">Hinglish</option>
                      </select>

                      <label className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-300">
                        <input
                          type="checkbox"
                          checked={settings.audioAutoSpeak}
                          onChange={(e) => setSettings({ audioAutoSpeak: e.target.checked })}
                          className="h-3.5 w-3.5 accent-blue-500"
                        />
                        Auto speak
                      </label>

                      <button
                        type="button"
                        onClick={isRecording ? handleStopRecording : handleStartRecording}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                          isRecording
                            ? "border-rose-400/30 bg-rose-500/15 text-rose-200 hover:bg-rose-500/20"
                            : "border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-600 hover:bg-slate-800"
                        }`}
                      >
                        {isRecording ? "Stop Recording" : "Audio Input"}
                      </button>
                    </div>

                    <textarea
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage(e);
                        }
                      }}
                      placeholder="Send your argument or question..."
                      rows={1}
                      className="mt-2 w-full resize-none bg-transparent px-1 py-0.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-500"
                    />
                  </div>

                  <div className="flex flex-col  items-center w-14 gap-2">
                    <button
                      type="button"
                      onClick={handleConcludeDebate}
                      disabled={isConcluding || loading}
                      className="rounded-full border border-white/10 bg-red-500 font-extrabold px-2 py-2 text-xs text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isConcluding ? "..." : "End"}
                    </button>
                    <button
                      type="submit"
                      disabled={!messageText.trim() || loading}
                      aria-label={loading ? "Waiting for response" : "Send message"}
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-blue-400/30 bg-gradient-to-r from-blue-500 to-cyan-500 text-lg font-semibold text-white transition hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {loading ? "…" : "➤"}
                    </button>
                  </div>
                </div>
              </form>
            ) : null}
          </div>

          <aside className="hidden min-h-0 overflow-hidden xl:flex xl:flex-col xl:gap-4">
            <div className="shrink-0 rounded-[24px] border border-slate-800 bg-slate-900/75 p-4 shadow-2xl shadow-black/20 backdrop-blur">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                Live Debate Chamber
              </p>
              {/* <h1 className="mt-3 text-xs font-semibold text-white break-words">
                {session.topic}
              </h1> */}

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-[18px] border border-slate-800 bg-slate-950/70 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Mood</p>
                    <p className="mt-1.5 text-xs font-semibold capitalize text-slate-100">{session.mood}</p>
                  </div>
                <div className="rounded-[18px] border border-slate-800 bg-slate-950/70 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Experts</p>
                  <p className="mt-1.5 text-xs font-semibold text-slate-100">{selectedAgents.length}</p>
                </div>
                  <div className="rounded-[18px] border border-slate-800 bg-slate-950/70 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Arguments</p>
                  <p className="mt-1.5 text-xs font-semibold text-slate-100">
                    {mentorTurnCount}/{session.maxArguments}
                  </p>
                </div>
                <div className="rounded-[18px] border border-slate-800 bg-slate-950/70 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Status</p>
                  <p className={`mt-1.5 text-xs font-semibold ${session.closed ? "text-rose-300" : "text-emerald-300"}`}>
                    {session.closed ? "Debate Ended" : "Debate Active"}
                  </p>
                </div>
                <div className="rounded-[18px] border border-slate-800 bg-slate-950/70 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Flow</p>
                  <p className="mt-1.5 text-xs font-semibold text-slate-100">{session.orchestrationMode || settings.orchestrationMode}</p>
                </div>
                <div className="rounded-[18px] border border-slate-800 bg-slate-950/70 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Language</p>
                  <p className="mt-1.5 text-xs font-semibold text-slate-100">
                    {session.languageMode === "hinglish" || settings.languageMode === "hinglish" ? "Hinglish" : "English (IN)"}
                  </p>
                </div>
              </div>
            </div>

            <div className="min-h-0 flex flex-1 flex-col overflow-hidden rounded-[24px] border border-slate-800 bg-slate-900/75 shadow-2xl shadow-black/20 backdrop-blur">
              <div className="shrink-0 border-b border-slate-800 px-5 py-4">
                <p className="text-sm font-semibold text-white">Council Roster</p>
                <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
                  {selectedAgents.length} active voices
                </p>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                <div className="space-y-2">
                  {selectedAgents.map((agent) => {
                    const isActive = activeAgentInfo?.id === agent.id;
                    return (
                      <div key={agent.id}>
                        <button
                          type="button"
                          onClick={() => {
                            if (activeAgentInfo?.id === agent.id) {
                              // Same agent clicked -> toggle close
                              setShowAgentInfo('');
                            } else {
                              // Different agent clicked -> open it
                              setShowAgentInfo(agent);
                            }
                          }}
                          className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                            isActive
                              ? "border-blue-400/40 bg-blue-500/10"
                              : "border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-950"
                          }`}
                        >
                          <div className="flex items-center gap-3 overflow-hidden justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-xs font-semibold tracking-[0.2em] text-slate-100 flex-shrink-0">
                                {getInitials(agent.name)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-white">{agent.name}</p>
                                <p className="truncate text-xs uppercase tracking-[0.18em] text-slate-500">
                                  {agent.role}
                                </p>
                              </div>
                            </div>
                            <span className={`text-lg transition-transform flex-shrink-0 ${isActive ? "rotate-180" : ""}`}>
                              ▼
                            </span>
                          </div>
                        </button>

                        {/* Expandable Agent Details */}
                        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                          isActive ? "max-h-96" : "max-h-0"
                        }`}>
                          <div className="p-3 bg-slate-950/40 border border-t-0 border-slate-800 rounded-b-2xl space-y-3">
                            <div className="space-y-2 text-xs text-slate-300">
                              <div>
                                <p className="text-slate-500 font-medium">Domain</p>
                                <p className="text-slate-200">{agent.domain}</p>
                              </div>
                              <div>
                                <p className="text-slate-500 font-medium">Expertise</p>
                                <p className="text-slate-200">{agent.expertise}</p>
                              </div>
                              <div>
                                <p className="text-slate-500 font-medium">Stance</p>
                                <p className="text-slate-200">{agent.stance}</p>
                              </div>
                              <div>
                                <p className="text-slate-500 font-medium">Special Ability</p>
                                <p className="text-slate-200">{agent.specialAbility}</p>
                              </div>
                              <div className="border-t border-slate-800 pt-2">
                                <p className="text-slate-400 text-xs leading-relaxed">{agent.description}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </aside>
        </div>

        {!canContinue ? (
          <div className="mt-4 shrink-0 rounded-[28px] border border-slate-800 bg-slate-900/80 p-8 text-center shadow-2xl shadow-black/20 backdrop-blur">
            <p className="text-lg font-medium text-slate-100">
              {session.closed
                ? "Debate has concluded. Great discussion!"
                : "Maximum arguments reached."}
            </p>
            <p className="mt-2 text-sm text-slate-400">
              Start a fresh session or return to the roster builder to reconfigure the council.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                onClick={() => restartSession()}
                className="rounded-full border border-blue-400/30 bg-gradient-to-r from-blue-500 to-cyan-500 px-6 py-3 font-semibold text-white transition hover:scale-[1.01]"
              >
                Start New Debate
              </button>
              <button
                onClick={() => navigate("/agents")}
                className="rounded-full border border-white/10 bg-white/5 px-6 py-3 font-semibold text-slate-200 transition hover:bg-white/10"
              >
                Back to Agents
              </button>
              <button
                onClick={() => setIsConcludeModalOpen(true)}
                className="rounded-full border border-emerald-400/30 bg-emerald-500/15 px-6 py-3 font-semibold text-emerald-100 transition hover:bg-emerald-500/25"
              >
                Download Topic Report
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <ConcludeDebateModal
        isOpen={isConcludeModalOpen}
        onClose={() => setIsConcludeModalOpen(false)}
        topic={session?.topic}
        sessionId={session?.id}
        messages={session?.messages || []}
        participants={selectedAgents}
      />
    </div>
  );
}

export default DebatePage;
