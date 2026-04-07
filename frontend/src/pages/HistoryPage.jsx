import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../libs/store";

function HistoryPage() {
  const navigate = useNavigate();
  const history = useStore((state) => state.history);
  const historyLoading = useStore((state) => state.historyLoading);
  const loadHistory = useStore((state) => state.loadHistory);
  const loadAgents = useStore((state) => state.loadAgents);
  const openHistorySession = useStore((state) => state.openHistorySession);

  useEffect(() => {
    loadAgents();
    loadHistory();
  }, [loadAgents, loadHistory]);

  const handleOpen = async (sessionId) => {
    await openHistorySession(sessionId);
    navigate("/debate");
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:120px_120px]" />
        <div className="absolute left-[8%] top-24 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute bottom-10 right-[8%] h-72 w-72 rounded-full bg-fuchsia-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 rounded-[28px] border border-slate-800 bg-slate-900/75 p-6 shadow-2xl shadow-black/20 backdrop-blur">
          <p className="text-sm font-semibold text-white">Debate History</p>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-400">
            Reload any persisted council session with its saved topic, participants, orchestration settings, and message history.
          </p>
        </div>

        <div className="rounded-[28px] border border-slate-800 bg-slate-900/75 p-5 shadow-2xl shadow-black/20 backdrop-blur sm:p-6">
          {historyLoading ? (
            <p className="text-sm text-slate-400">Loading saved debates...</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-slate-400">No saved debates found yet.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {history.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => handleOpen(entry.id)}
                  className="rounded-[24px] border border-slate-800 bg-slate-950/60 p-5 text-left transition hover:border-slate-700 hover:bg-slate-950"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-lg font-semibold text-white">{entry.topic}</p>
                      <p className="mt-2 text-xs uppercase tracking-[0.22em] text-slate-500">
                        {entry.mood} • {entry.agentIds?.length || 0} agents
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs ${
                        entry.closed ? "bg-rose-500/10 text-rose-300" : "bg-emerald-500/10 text-emerald-300"
                      }`}
                    >
                      {entry.closed ? "Closed" : "Active"}
                    </span>
                  </div>
                  <p className="mt-4 text-sm text-slate-400">
                    {new Date(entry.lastActivityAt || entry.createdAt || Date.now()).toLocaleString()}
                  </p>
                  <p className="mt-3 text-sm text-slate-300">
                    Orchestration: {entry.settings?.orchestrationMode || "dynamic"} • Memory: {entry.settings?.memoryMode || "minimal"}
                  </p>
                  <p className="mt-2 text-xs text-slate-400">
                    Source: {entry.sourceType === "feature" ? `Feature • ${entry.sourceLabel || entry.sourceFeature}` : "Debate"}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default HistoryPage;
