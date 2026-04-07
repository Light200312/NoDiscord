import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../libs/store.js";

const MOOD_OPTIONS = [
  { value: "supportive", label: "Supportive" },
  { value: "balanced", label: "Balanced" },
  { value: "skeptical", label: "Skeptical" },
  { value: "aggressive", label: "Aggressive" },
];

const DOMAIN_OPTIONS = [
  "All",
  "Technical",
  "Politics",
  "Education",
  "Finance",
  "Research",
  "Engineering",
  "General",
];

function AgentCard({ agent, selected, onToggle }) {
  return (
    <div
      className={`rounded-lg p-4 cursor-pointer transition border ${
        selected
          ? "border-blue-500 bg-blue-50"
          : "border-slate-200 hover:border-slate-400 hover:shadow-md"
      }`}
      onClick={onToggle}
    >
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 text-white flex items-center justify-center font-bold">
          {agent.initials || agent.name.split(" ").slice(0, 2).map(w => w[0]).join("")}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{agent.name}</h3>
          <p className="text-sm text-gray-600">{agent.role}</p>
          <p className="text-xs text-gray-500 mt-1">{agent.domain}</p>
        </div>
      </div>
      <p className="text-sm text-gray-600 mt-3">{agent.description}</p>
      <button
        className={`mt-3 px-3 py-1 rounded text-sm font-medium transition ${
          selected
            ? "bg-blue-600 text-white"
            : "bg-gray-200 text-gray-900 hover:bg-gray-300"
        }`}
      >
        {selected ? "✓ Selected" : "Select"}
      </button>
    </div>
  );
}

function SuggestedAgentCard({ agent, justification, onAdd }) {
  return (
    <div className="rounded-lg bg-slate-50 border border-blue-300 p-4 hover:shadow-md transition">
      <div className="flex items-start gap-3 mb-2">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 text-white flex items-center justify-center font-bold text-sm">
          {agent.initials || agent.name.split(" ").slice(0, 2).map(w => w[0]).join("")}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{agent.name}</h3>
          <p className="text-sm text-gray-600">{agent.role}</p>
        </div>
      </div>
      {justification && (
        <p className="text-xs text-slate-600 mb-2 italic">{justification}</p>
      )}
      <p className="text-sm text-gray-600 mb-3">{agent.description}</p>
      <button
        onClick={() => onAdd(agent)}
        className="w-full px-3 py-2 bg-purple-600 text-white rounded text-sm font-medium hover:bg-purple-700"
      >
        Add to Roster
      </button>
    </div>
  );
}

function AgentsPage() {
  const navigate = useNavigate();
  const agents = useStore((s) => s.agents);
  const loading = useStore((s) => s.loading);
  const setup = useStore((s) => s.setup);
  const setSetup = useStore((s) => s.setSetup);
  const startSession = useStore((s) => s.startSession);
  const loadAgents = useStore((s) => s.loadAgents);
  const suggestAgents = useStore((s) => s.suggestAgents);
  const createAgent = useStore((s) => s.createAgent);
  const findAgentByName = useStore((s) => s.findAgentByName);

  const [topic, setTopic] = useState(setup.topic || "");
  const [mood, setMood] = useState(setup.mood || "balanced");
  const [mode, setMode] = useState("roster"); // "roster", "generate", "specific"
  const [generationInstructions, setGenerationInstructions] = useState("");
  const [specificAgentName, setSpecificAgentName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDomain, setSelectedDomain] = useState("All");
  const [suggestedAgents, setSuggestedAgents] = useState([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [savedDrafts, setSavedDrafts] = useState([]);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  const filteredAgents = agents.filter((agent) => {
    const matchesDomain =
      selectedDomain === "All" || agent.domain === selectedDomain;
    const matchesSearch =
      !searchTerm ||
      agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.expertise.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesDomain && matchesSearch;
  });

  function toggleAgent(agentId) {
    setSetup((current) => {
      const exists = current.agentIds.includes(agentId);
      return {
        ...current,
        agentIds: exists
          ? current.agentIds.filter((id) => id !== agentId)
          : [...current.agentIds, agentId],
      };
    });
  }

  const handleSuggestAgents = async () => {
    if (!topic.trim()) {
      alert("Please enter a debate topic");
      return;
    }
    setIsSuggesting(true);
    try {
      const result = await suggestAgents({
        topic: topic.trim(),
        count: 4,
        instructions: generationInstructions.trim(),
      });
      const drafted = result.suggestions.map((item, idx) => ({
        ...item.draft,
        justification: item.justification,
        tempId: `draft-${Date.now()}-${idx}`,
      }));
      setSuggestedAgents(drafted);
    } catch (error) {
      alert("Failed to generate agents: " + error.message);
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleFindSpecific = async () => {
    if (!specificAgentName.trim()) {
      alert("Please enter an agent name");
      return;
    }
    setIsSuggesting(true);
    try {
      const result = await findAgentByName({
        name: specificAgentName.trim(),
        topic: topic.trim(),
        instructions: generationInstructions.trim(),
      });
      setSuggestedAgents([{ ...result.draft, tempId: `draft-${Date.now()}` }]);
    } catch (error) {
      alert("Failed to create agent: " + error.message);
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleAddDraft = async (draftAgent) => {
    try {
      const newAgent = await createAgent(draftAgent, { selectAfterCreate: true });
      setSavedDrafts([...savedDrafts, newAgent]);
      setSuggestedAgents(suggestedAgents.filter((s) => s.tempId !== draftAgent.tempId));
    } catch (error) {
      alert("Failed to save agent: " + error.message);
    }
  };

  const canStart = topic.trim() && setup.agentIds.length > 0;

  const handleStart = async () => {
    setSetup({ topic, mood, agentIds: setup.agentIds });
    try {
      await startSession();
      navigate("/debate");
    } catch (error) {
      alert("Failed to start debate: " + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 sm:p-6 lg:p-8 text-black">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Create Your Debate</h1>
          <p className="text-gray-600">Set your topic, mood, and select or generate expert agents</p>
        </div>

        {/* Setup Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Debate Configuration</h2>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Debate Topic *
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Should AI replace human teachers?"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Discussion Mood
              </label>
              <div className="flex gap-2 flex-wrap">
                {MOOD_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setMood(option.value)}
                    className={`px-3 py-1 rounded text-sm font-medium transition ${
                      mood === option.value
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
            <p><strong>Topic:</strong> {topic || "(Not set)"}</p>
            <p><strong>Mood:</strong> {mood} | <strong>Agents:</strong> {setup.agentIds.length}</p>
          </div>

          <button
            onClick={handleStart}
            disabled={!canStart || loading}
            className="mt-6 w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? "Starting..." : "Start Debate"}
          </button>
        </div>

        {/* Mode Selector */}
        <div className="mb-8 flex gap-2">
          {[
            { id: "roster", label: "Select from Roster" },
            { id: "generate", label: "Generate New Agents" },
            { id: "specific", label: "Create Specific Agent" },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`px-4 py-2 rounded-lg transition font-medium ${
                mode === m.id
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 border border-gray-300 hover:border-gray-400"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Roster Selection */}
        {mode === "roster" && (
          <div className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Filter & Select Agents</h3>

            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <input
                type="text"
                placeholder="Search agents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={selectedDomain}
                onChange={(e) => setSelectedDomain(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {DOMAIN_OPTIONS.map((domain) => (
                  <option key={domain} value={domain}>
                    Domain: {domain}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAgents.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  selected={setup.agentIds.includes(agent.id)}
                  onToggle={() => toggleAgent(agent.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Generate Agents */}
        {mode === "generate" && (
          <div className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Generate New Agents</h3>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Generation Instructions (optional)
                </label>
                <textarea
                  value={generationInstructions}
                  onChange={(e) => setGenerationInstructions(e.target.value)}
                  placeholder="e.g., Create agents with expertise in climate science, economics, and policy..."
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none"
                />
              </div>
              <button
                onClick={handleSuggestAgents}
                disabled={isSuggesting || !topic.trim()}
                className="w-full bg-purple-600 text-white py-2 rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50 transition"
              >
                {isSuggesting ? "Generating..." : "Generate 4 Agents"}
              </button>
            </div>

            {suggestedAgents.length > 0 && (
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Suggested Agents</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  {suggestedAgents.map((agent) => (
                    <SuggestedAgentCard
                      key={agent.tempId}
                      agent={agent}
                      justification={agent.justification}
                      onAdd={handleAddDraft}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Create Specific Agent */}
        {mode === "specific" && (
          <div className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Create Specific Agent</h3>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Agent Name
                </label>
                <input
                  type="text"
                  value={specificAgentName}
                  onChange={(e) => setSpecificAgentName(e.target.value)}
                  placeholder="e.g., Jane Smith"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Context Instructions (optional)
                </label>
                <textarea
                  value={generationInstructions}
                  onChange={(e) => setGenerationInstructions(e.target.value)}
                  placeholder="e.g., Climate scientist with 20 years of research in Arctic ice dynamics..."
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 h-20 resize-none"
                />
              </div>
              <button
                onClick={handleFindSpecific}
                disabled={isSuggesting || !specificAgentName.trim()}
                className="w-full bg-purple-600 text-white py-2 rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50 transition"
              >
                {isSuggesting ? "Creating..." : "Create Agent"}
              </button>
            </div>

            {suggestedAgents.length > 0 && (
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Created Agent</h4>
                <div className="max-w-md">
                  {suggestedAgents.map((agent) => (
                    <SuggestedAgentCard
                      key={agent.tempId}
                      agent={agent}
                      justification={agent.justification}
                      onAdd={handleAddDraft}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Saved Drafts */}
        {savedDrafts.length > 0 && (
          <div className="bg-white rounded-lg border border-green-200 p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">✓ Saved Agents</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedDrafts.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  selected={setup.agentIds.includes(agent.id)}
                  onToggle={() => toggleAgent(agent.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AgentsPage ;