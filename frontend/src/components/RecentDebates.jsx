import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../libs/store";

export function RecentDebates() {
  const navigate = useNavigate();
  const history = useStore((state) => state.history);
  const historyLoading = useStore((state) => state.historyLoading);
  const loadAgents = useStore((state) => state.loadAgents);
  const loadHistory = useStore((state) => state.loadHistory);
  const openHistorySession = useStore((state) => state.openHistorySession);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleResume = async (debateId) => {
    await loadAgents();
    await openHistorySession(debateId);
    navigate("/debate");
  };

  if (historyLoading || !history || history.length === 0) {
    return null;
  }

  return (
    <div className="mt-8 rounded-[24px] border border-slate-800 bg-slate-900/75 p-6 shadow-2xl shadow-black/20 backdrop-blur">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-white">Recent Debates</p>
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
            {history.length} saved session{history.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <div className="max-h-72 space-y-2 overflow-y-auto">
        {history.slice(0, 10).map((debate) => (
          <div
            key={debate.id}
            className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 transition hover:border-slate-700"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{debate.topic || "Untitled Debate"}</p>
                <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                  <span className="capitalize">{debate.mood}</span>
                  <span>•</span>
                  <span>{debate.agentIds?.length || 0} agents</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {new Date(debate.lastActivityAt || debate.createdAt || Date.now()).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => handleResume(debate.id)}
                className="shrink-0 rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-300 transition hover:bg-blue-500/20"
              >
                Open
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
