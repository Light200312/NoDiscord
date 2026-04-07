import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../libs/store.js";

const TEMPERATURE_OPTIONS = [
  { value: "hostile", label: "Hostile", emoji: "\u{1F525}" },
  { value: "adversarial", label: "Adversarial", emoji: "\u2694\uFE0F" },
  { value: "competitive", label: "Competitive", emoji: "\u{1F3AF}" },
  { value: "analytical", label: "Analytical", emoji: "\u{1F9E0}" },
  { value: "dialectical", label: "Dialectical", emoji: "\u{1F91D}" },
  { value: "collaborative", label: "Collaborative", emoji: "\u{1F4AC}" },
  { value: "reflective", label: "Reflective", emoji: "\u{1F33F}" },
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

const sectionLabelClass =
  "text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-white/40";

const panelClass =
  "rounded-[1.5rem] border border-white/10 bg-white/[0.04] shadow-[0_20px_50px_rgba(0,0,0,0.32)] backdrop-blur-sm";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-[#0c0c0f] px-4 py-3 text-sm text-white placeholder:text-white/30 transition focus:border-sky-300/35 focus:outline-none focus:ring-2 focus:ring-sky-300/15";

function AgentCard({ agent, selected, onToggle }) {
  return (
    <div
      className={`${panelClass} cursor-pointer p-4 transition duration-200 ${
        selected
          ? "border-amber-300/35 bg-amber-300/[0.08]"
          : "hover:border-white/18 hover:bg-white/[0.055]"
      }`}
      onClick={onToggle}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-sm font-bold ${
            selected
              ? "border-amber-300/20 bg-amber-300/15 text-amber-100"
              : "border-white/10 bg-white/[0.05] text-white/85"
          }`}
        >
          {agent.initials || agent.name.split(" ").slice(0, 2).map((w) => w[0]).join("")}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-base font-semibold text-white">{agent.name}</h3>
              <p className="mt-1 text-sm text-white/60">{agent.role}</p>
            </div>
            <span
              className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                selected ? "bg-amber-300" : "bg-white/15"
              }`}
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[0.65rem] font-medium uppercase tracking-[0.18em] text-white/45">
              {agent.domain}
            </span>
          </div>
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-white/62">{agent.description}</p>

      <button
        type="button"
        className={`mt-4 w-full rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
          selected
            ? "border-amber-300/25 bg-amber-300/12 text-amber-100"
            : "border-white/10 bg-white/[0.04] text-white/72"
        }`}
      >
        {selected ? "Selected" : "Select"}
      </button>
    </div>
  );
}

function SuggestedAgentCard({ agent, justification, onAdd }) {
  return (
    <div className={`${panelClass} p-4 transition duration-200 hover:border-white/16`}>
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-sky-300/15 bg-sky-300/10 text-sm font-bold text-sky-100">
          {agent.initials || agent.name.split(" ").slice(0, 2).map((w) => w[0]).join("")}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-base font-semibold text-white">{agent.name}</h3>
              <p className="mt-1 text-sm text-white/60">{agent.role}</p>
            </div>
            {agent.domain && (
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[0.65rem] font-medium uppercase tracking-[0.18em] text-white/45">
                {agent.domain}
              </span>
            )}
          </div>
        </div>
      </div>

      {justification && (
        <div className="mt-4 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3">
          <p className="text-xs leading-6 text-white/52">{justification}</p>
        </div>
      )}

      <p className="mt-4 text-sm leading-6 text-white/62">{agent.description}</p>

      <button
        onClick={() => onAdd(agent)}
        className="mt-4 w-full rounded-xl border border-sky-300/18 bg-sky-300/10 px-3 py-2.5 text-sm font-medium text-sky-50 transition hover:border-sky-300/30 hover:bg-sky-300/14"
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
  const settings = useStore((s) => s.settings);
  const setSetup = useStore((s) => s.setSetup);
  const startSession = useStore((s) => s.startSession);
  const loadAgents = useStore((s) => s.loadAgents);
  const suggestAgents = useStore((s) => s.suggestAgents);
  const createAgent = useStore((s) => s.createAgent);
  const findAgentByName = useStore((s) => s.findAgentByName);

  const [topic, setTopic] = useState(setup.topic || "");
  const [temperature, setTemperature] = useState(setup.temperature || setup.mood || "analytical");
  const [mode, setMode] = useState("roster");
  const [generationInstructions, setGenerationInstructions] = useState("");
  const [specificAgentName, setSpecificAgentName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDomain, setSelectedDomain] = useState("All");
  const [suggestedAgents, setSuggestedAgents] = useState([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [scopeMode, setScopeMode] = useState("global");
  const [scopeCountry, setScopeCountry] = useState("");
  const [userLocation, setUserLocation] = useState({
    country: "Your Country",
    state: "",
    city: "Your Location",
    loading: false,
  });

  const persistDraftsIfNeeded = async (drafts) => {
    if (!drafts.length) return drafts;
    const saved = [];
    for (const draft of drafts) {
      const agent = await createAgent(draft, { selectAfterCreate: true });
      saved.push(agent);
    }
    return [];
  };

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  useEffect(() => {
    const fetchUserLocation = async () => {
      setUserLocation((prev) => ({ ...prev, loading: true }));
      try {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              const { latitude, longitude } = position.coords;
              // Use Open-Meteo or similar free reverse geocoding service
              const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
              );
              const data = await response.json();
              
              const address = data.address || {};
              setUserLocation({
                country: address.country || "Your Country",
                state: address.state || "",
                city: address.city || address.town || address.village || "Your Location",
                loading: false,
              });
            },
            (error) => {
              console.log("Geolocation error:", error);
              setUserLocation((prev) => ({ ...prev, loading: false }));
            }
          );
        }
      } catch (error) {
        console.log("Location fetch error:", error);
        setUserLocation((prev) => ({ ...prev, loading: false }));
      }
    };

    fetchUserLocation();
  }, []);

  const filteredAgents = agents.filter((agent) => {
    const matchesDomain =
      selectedDomain === "All" || agent.domain === selectedDomain;
    const matchesSearch =
      !searchTerm ||
      agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(agent.expertise || "").toLowerCase().includes(searchTerm.toLowerCase());
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
      const payload = {
        topic: topic.trim(),
        count: 4,
        instructions: generationInstructions.trim(),
        scopeMode,
      };
      
      if (scopeMode === "country" && scopeCountry) {
        payload.scopeCountry = scopeCountry;
      } else if (scopeMode === "current_location") {
        payload.scopeCountry = userLocation.country;
        payload.scopeCity = userLocation.city;
        payload.scopeState = userLocation.state;
      }

      const result = await suggestAgents(payload);
      const drafted = (result.suggestions || []).map((item, idx) => ({
        ...item.draft,
        justification: item.justification,
        tempId: `draft-${Date.now()}-${idx}`,
      }));
      const unsavedDrafts = await persistDraftsIfNeeded(drafted);
      setSuggestedAgents(unsavedDrafts);
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
      const payload = {
        name: specificAgentName.trim(),
        topic: topic.trim(),
        instructions: generationInstructions.trim(),
        scopeMode,
      };

      if (scopeMode === "country" && scopeCountry) {
        payload.scopeCountry = scopeCountry;
      } else if (scopeMode === "current_location") {
        payload.scopeCountry = userLocation.country;
        payload.scopeCity = userLocation.city;
        payload.scopeState = userLocation.state;
      }

      const result = await findAgentByName(payload);
      const drafts = [{ ...result.draft, tempId: `draft-${Date.now()}` }];
      const unsavedDrafts = await persistDraftsIfNeeded(drafts);
      setSuggestedAgents(unsavedDrafts);
    } catch (error) {
      alert("Failed to create agent: " + error.message);
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleAddDraft = async (draftAgent) => {
    try {
      const newAgent = await createAgent(draftAgent, { selectAfterCreate: true });
      setSuggestedAgents(suggestedAgents.filter((s) => s.tempId !== draftAgent.tempId));
    } catch (error) {
      alert("Failed to save agent: " + error.message);
    }
  };

  const canStart = topic.trim() && setup.agentIds.length > 0;

  const handleStart = async () => {
    setSetup({
      topic,
      temperature,
      // Keep mood for backward compatibility with existing backend payloads.
      mood: temperature,
      agentIds: setup.agentIds,
    });
    try {
      await startSession();
      navigate("/debate");
    } catch (error) {
      alert("Failed to start debate: " + error.message);
    }
  };

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-[#050505] text-white"
      style={{ fontFamily: '"Aptos", "Segoe UI", sans-serif' }}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_24%),radial-gradient(circle_at_88%_0%,rgba(255,178,102,0.08),transparent_16%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[length:100%_140px] opacity-30" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className={sectionLabelClass}>Council Setup</p>
              <h1
                className="mt-3 text-3xl font-black tracking-[-0.05em] text-white sm:text-4xl"
                style={{ fontFamily: '"Bahnschrift", "Aptos", "Segoe UI", sans-serif' }}
              >
                Create Your Debate
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/64 sm:text-base">
                Set the topic, choose the temperature, and arrange the right mix of
                agents for the session.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 sm:max-w-md">
              <div className={`${panelClass} px-4 py-4`}>
                <p className="text-[0.65rem] font-medium uppercase tracking-[0.22em] text-white/35">
                  Mode
                </p>
                <p className="mt-2 text-base font-semibold text-white capitalize">
                  {mode}
                </p>
              </div>
              <div className={`${panelClass} px-4 py-4`}>
                <p className="text-[0.65rem] font-medium uppercase tracking-[0.22em] text-white/35">
                  Agents Selected
                </p>
                <p className="mt-2 text-base font-semibold text-white">
                  {setup.agentIds.length}
                </p>
              </div>
              <div className={`${panelClass} px-4 py-4`}>
                <p className="text-[0.65rem] font-medium uppercase tracking-[0.22em] text-white/35">
                  Library
                </p>
                <p className="mt-2 text-base font-semibold text-white">
                  {agents.length}
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[320px,minmax(0,1fr)]">
          <aside className="xl:sticky xl:top-6 xl:self-start">
            <div className={`${panelClass} p-5 sm:p-6`}>
              <div>
                <p className={sectionLabelClass}>Session Details</p>
                <h2
                  className="mt-3 text-2xl font-black tracking-[-0.04em] text-white"
                  style={{ fontFamily: '"Bahnschrift", "Aptos", "Segoe UI", sans-serif' }}
                >
                  Debate Configuration
                </h2>
              </div>

              <div className="mt-6 space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-white/70">
                    Debate Topic *
                  </label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g., Should AI replace human teachers?"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="mb-5 block text-sm font-medium text-white/70 ">
                    Debate Temperature
                  </label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {TEMPERATURE_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setTemperature(option.value)}
                        className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                          temperature === option.value
                            ? "border-amber-300/30 bg-amber-300/12 text-amber-100"
                            : "border-white/10 bg-white/3 text-white/70 hover:border-white/18"
                        }`}
                      >
                        <span className="mr-1.5">{option.emoji}</span>
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleStart}
                  disabled={!canStart || loading}
                  className="w-full rounded-xl border border-white/14 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:border-white/24 hover:bg-white/14 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {loading ? "Starting..." : "Start Debate"}
                </button>
              </div>
            </div>
          </aside>

          <main className="space-y-6">
            <section className={`${panelClass} p-4 sm:p-5`}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className={sectionLabelClass}>Add Agents</p>
                  <h2 className="mt-2 text-xl font-semibold text-white">
                    Choose where agents come from
                  </h2>
                </div>

                <div className="flex flex-wrap gap-2">
                  {[
                    { id: "roster", label: "Roster" },
                    { id: "generate", label: "Generate" },
                    { id: "specific", label: "Specific" },
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setMode(m.id)}
                      className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
                        mode === m.id
                          ? "border-sky-300/26 bg-sky-300/12 text-sky-100"
                          : "border-white/10 bg-white/[0.03] text-white/68 hover:border-white/18"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {mode === "roster" && (
              <section className={`${panelClass} p-5 sm:p-6`}>
                <div className="flex flex-col gap-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h3 className="text-xl font-semibold text-white">
                        Select from roster
                      </h3>
                      <p className="mt-1 text-sm text-white/58">
                        Search and filter the agents already available in your
                        library.
                      </p>
                    </div>
                    <span className="text-sm text-white/45">
                      {filteredAgents.length} result
                      {filteredAgents.length === 1 ? "" : "s"}
                    </span>
                  </div>

                  <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)]">
                    <input
                      type="text"
                      placeholder="Search by name, role, or expertise..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className={inputClass}
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {DOMAIN_OPTIONS.map((domain) => (
                      <button
                        key={domain}
                        type="button"
                        onClick={() => setSelectedDomain(domain)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                          selectedDomain === domain
                            ? "border-sky-300/40 bg-sky-300/15 text-sky-100"
                            : "border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:bg-white/8"
                        }`}
                      >
                        {domain}
                      </button>
                    ))}
                  </div>

                  {filteredAgents.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                      {filteredAgents.map((agent) => (
                        <AgentCard
                          key={agent.id}
                          agent={agent}
                          selected={setup.agentIds.includes(agent.id)}
                          onToggle={() => toggleAgent(agent.id)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-[1.25rem] border border-dashed border-white/10 bg-white/[0.02] px-4 py-10 text-center text-sm text-white/45">
                      No agents match the current search and domain filter.
                    </div>
                  )}
                </div>
              </section>
            )}

            {mode === "generate" && (
              <section className={`${panelClass} p-5 sm:p-6`}>
                <div className="flex flex-col gap-5">
                  <div>
                    <h3 className="text-xl font-semibold text-white">
                      Generate new agents
                    </h3>
                    <p className="mt-1 text-sm text-white/58">
                      Describe the kind of voices you want added to the debate.
                    </p>
                  </div>

                  <div className="rounded-[1.25rem] border border-white/8 bg-[#0b0b0d] p-4">
                    <label className="mb-3 block text-sm font-medium text-white/70">
                      Agent Region Scope
                    </label>
                    <div className="mb-4 inline-flex rounded-lg border border-white/10 bg-white/5 p-1">
                      {[
                        { id: "global", label: "Global - Worldwide experts" },
                        { id: "current_location", label: `Current Location${userLocation.loading ? " (loading...)" : userLocation.city ? ` - ${userLocation.city}${userLocation.state ? `, ${userLocation.state}` : ""}, ${userLocation.country}` : ""}` },
                        { id: "country", label: "Specific Country" },
                      ].map((option, index) => (
                        <button
                          key={option.id}
                          onClick={() => setScopeMode(option.id)}
                          className={`px-4 py-2 text-sm font-medium transition ${
                            index !== 0 ? "border-l border-white/10" : ""
                          } ${
                            scopeMode === option.id
                              ? "bg-sky-400/20 text-sky-100"
                              : "text-white/70 hover:text-white/90"
                          }`}
                        >
                          <span className="block leading-tight">{option.id === "current_location" ? (userLocation.loading ? "Loading..." : `${userLocation.city}, ${userLocation.country}`) : option.label.split(" - ")[0]}</span>
                          {scopeMode === option.id && (
                            <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.1em] text-sky-200">
                              Selected
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                    
                    {scopeMode === "country" && (
                      <input
                        type="text"
                        value={scopeCountry}
                        onChange={(e) => setScopeCountry(e.target.value)}
                        placeholder="e.g., India, Japan, USA"
                        className={`${inputClass} mb-4`}
                      />
                    )}

                    <label className="mb-2 block text-sm font-medium text-white/70">
                      Generation Instructions (optional)
                    </label>
                    <textarea
                      value={generationInstructions}
                      onChange={(e) => setGenerationInstructions(e.target.value)}
                      placeholder="e.g., Create agents with expertise in climate science, economics, and policy..."
                      className={`${inputClass} h-28 resize-none`}
                    />
                    <button
                      onClick={handleSuggestAgents}
                      disabled={isSuggesting || !topic.trim()}
                      className="mt-4 w-full rounded-xl border border-amber-300/22 bg-amber-300/12 px-4 py-3 text-sm font-medium text-amber-50 transition hover:border-amber-300/34 hover:bg-amber-300/16 disabled:opacity-45"
                    >
                      {isSuggesting ? "Generating..." : "Generate 4 Agents"}
                    </button>
                  </div>

                  {suggestedAgents.length > 0 && (
                    <div>
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <h4 className="text-base font-semibold text-white">
                          Suggested Agents
                        </h4>
                        <span className="text-sm text-white/45">
                          {suggestedAgents.length} ready
                        </span>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
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
              </section>
            )}

            {mode === "specific" && (
              <section className={`${panelClass} p-5 sm:p-6`}>
                <div className="flex flex-col gap-5">
                  <div>
                    <h3 className="text-xl font-semibold text-white">
                      Create a specific agent
                    </h3>
                    <p className="mt-1 text-sm text-white/58">
                      Name a person or persona and add optional context to shape
                      the result.
                    </p>
                  </div>

                  <div className="rounded-[1.25rem] border border-white/8 bg-[#0b0b0d] p-4">
                    <div className="space-y-4">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-white/70">
                          Agent Name
                        </label>
                        <input
                          type="text"
                          value={specificAgentName}
                          onChange={(e) => setSpecificAgentName(e.target.value)}
                          placeholder="e.g., Jane Smith"
                          className={inputClass}
                        />
                      </div>

                      <div>
                        <label className="mb-3 block text-sm font-medium text-white/70">
                          Agent Region Scope
                        </label>
                        <div className="mb-4 inline-flex rounded-lg border border-white/10 bg-white/5 p-1">
                          {[
                            { id: "global", label: "Global - Worldwide experts" },
                            { id: "current_location", label: `Current Location${userLocation.loading ? " (loading...)" : userLocation.city ? ` - ${userLocation.city}${userLocation.state ? `, ${userLocation.state}` : ""}, ${userLocation.country}` : ""}` },
                            { id: "country", label: "Specific Country" },
                          ].map((option, index) => (
                            <button
                              key={option.id}
                              onClick={() => setScopeMode(option.id)}
                              className={`px-4 py-2 text-sm font-medium transition ${
                                index !== 0 ? "border-l border-white/10" : ""
                              } ${
                                scopeMode === option.id
                                  ? "bg-sky-400/20 text-sky-100"
                                  : "text-white/70 hover:text-white/90"
                              }`}
                            >
                              <span className="block leading-tight">{option.id === "current_location" ? (userLocation.loading ? "Loading..." : `${userLocation.city}, ${userLocation.country}`) : option.label.split(" - ")[0]}</span>
                              {scopeMode === option.id && (
                                <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.1em] text-sky-200">
                                  Selected
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                        
                        {scopeMode === "country" && (
                          <input
                            type="text"
                            value={scopeCountry}
                            onChange={(e) => setScopeCountry(e.target.value)}
                            placeholder="e.g., India, Japan, USA"
                            className={`${inputClass} mb-4`}
                          />
                        )}
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-white/70">
                          Context Instructions (optional)
                        </label>
                        <textarea
                          value={generationInstructions}
                          onChange={(e) => setGenerationInstructions(e.target.value)}
                          placeholder="e.g., Climate scientist with 20 years of research in Arctic ice dynamics..."
                          className={`${inputClass} h-24 resize-none`}
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleFindSpecific}
                      disabled={isSuggesting || !specificAgentName.trim()}
                      className="mt-4 w-full rounded-xl border border-sky-300/20 bg-sky-300/10 px-4 py-3 text-sm font-medium text-sky-50 transition hover:border-sky-300/30 hover:bg-sky-300/14 disabled:opacity-45"
                    >
                      {isSuggesting ? "Creating..." : "Create Agent"}
                    </button>
                  </div>

                  {suggestedAgents.length > 0 && (
                    <div>
                      <h4 className="mb-4 text-base font-semibold text-white">
                        Created Agent
                      </h4>
                      <div className="max-w-xl">
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
              </section>
            )}

          </main>
        </div>
      </div>
    </div>
  );
}

export default AgentsPage;
