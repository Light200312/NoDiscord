import { useStore } from "../libs/store";
import { useNavigate } from "react-router-dom";

export function RecentDebates() {
  const navigate = useNavigate();
  const recentDebates = useStore((s) => s.recentDebates);
  const loadAgents = useStore((s) => s.loadAgents);
  const resumeDebate = useStore((s) => s.resumeDebate);
  const clearRecentDebates = useStore((s) => s.clearRecentDebates);

  const handleResume = (debateId) => {
    const debate = resumeDebate(debateId);
    if (debate) {
      loadAgents();
      navigate("/agents");
    }
  };

  const handleClear = () => {
    if (window.confirm("Clear all recent debates?")) {
      clearRecentDebates();
    }
  };

  if (!recentDebates || recentDebates.length === 0) {
    return null;
  }

  return (
    <div className="mt-8 rounded-[24px] border border-slate-800 bg-slate-900/75 p-6 shadow-2xl shadow-black/20 backdrop-blur">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-semibold text-white">Recent Debates</p>
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
            {recentDebates.length} saved session{recentDebates.length !== 1 ? "s" : ""}
          </p>
        </div>
        {recentDebates.length > 0 && (
          <button
            onClick={handleClear}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300 transition hover:bg-white/10"
          >
            Clear All
          </button>
        )}
      </div>

      <div className="space-y-2 max-h-72 overflow-y-auto">
        {recentDebates.map((debate) => (
          <div
            key={debate.id}
            className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 hover:border-slate-700 transition"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {debate.topic || "Untitled Debate"}
                </p>
                <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                  <span className="capitalize">{debate.mood}</span>
                  <span>•</span>
                  <span>{debate.agentIds?.length || 0} agents</span>
                  <span>•</span>
                  <span
                    className={`font-medium ${
                      debate.status === "active"
                        ? "text-emerald-400"
                        : "text-slate-400"
                    }`}
                  >
                    {debate.status === "active" ? "Active" : "Ended"}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {new Date(debate.createdAt).toLocaleDateString()} at{" "}
                  {new Date(debate.createdAt).toLocaleTimeString()}
                </p>
              </div>
              <button
                onClick={() => handleResume(debate.id)}
                className="shrink-0 rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-300 transition hover:bg-blue-500/20"
              >
                Resume
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
