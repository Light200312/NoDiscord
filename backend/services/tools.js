async function loadAgentsFromDb() {
  if (!isDbReady()) return [];
  const storedAgents = await Agent.find({}).sort({ createdAt: 1 }).lean();
  return storedAgents.map((entry) =>
    normalizeAgent({
      ...entry,
      initials: entry.avatarInitials,
    })
  );
}
//5
async function listAgents() {
  if (isDbReady()) {
    const storedAgents = await loadAgentsFromDb();
    if (storedAgents.length) {
      agents.splice(0, agents.length, ...storedAgents);
    }
  }
  return agents;
}
//4
function getSession(sessionId) {
  const session = sessions.get(sessionId);
  return session ? projectSession(session) : null;
}

function createSystemMessage(text, extra = {}) {
  return {
    id: createId("msg"),
    author: "Orchestrator",
    type: "system",
    text,
    timestamp: Date.now(),
    ...extra,
  };
}

function buildParticipationStats(messages = [], candidateIds = []) {
  const candidateSet = new Set(candidateIds.map(String));
  const stats = new Map(
    candidateIds.map((agentId) => [
      String(agentId),
      {
        turnsTaken: 0,
        lastSpokeTurnIndex: -1,
      },
    ])
  );

  let speakingTurnIndex = 0;
  messages.forEach((message) => {
    const agentId = String(message?.agentId || "");
    if (!candidateSet.has(agentId)) return;
    const entry = stats.get(agentId);
    if (!entry) return;
    entry.turnsTaken += 1;
    entry.lastSpokeTurnIndex = speakingTurnIndex;
    speakingTurnIndex += 1;
  });

  return { stats, totalAgentTurns: speakingTurnIndex };
}

function getLastSpeakingAgentId(messages = [], candidateIds = []) {
  const candidateSet = new Set(candidateIds.map(String));
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (candidateSet.has(String(message?.agentId || ""))) return String(message.agentId);
  }
  return "";
}
