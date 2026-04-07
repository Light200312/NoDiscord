import { create } from "zustand";
import { api } from "./api";

const initialSetup = {
  topic: "",
  mood: "balanced",
  agentIds: [],
};

// Persistence keys
const STORAGE_KEYS = {
  SETUP: "debate-setup",
  RECENT_DEBATES: "recent-debates",
  USER_PREFERENCES: "user-preferences",
};

// Load from localStorage
const loadFromStorage = (key, defaultValue) => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch (error) {
    console.error(`Failed to load ${key} from storage:`, error);
    return defaultValue;
  }
};

// Save to localStorage
const saveToStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Failed to save ${key} to storage:`, error);
  }
};

// Add debate to recent list
const addToRecentDebates = (debate) => {
  const recent = loadFromStorage(STORAGE_KEYS.RECENT_DEBATES, []);
  const filtered = recent.filter((d) => d.id !== debate.id);
  const updated = [debate, ...filtered].slice(0, 10); // Keep last 10
  saveToStorage(STORAGE_KEYS.RECENT_DEBATES, updated);
  return updated;
};

const useStore = create((set, get) => {
  // Load persisted setup on initialization
  const savedSetup = loadFromStorage(STORAGE_KEYS.SETUP, initialSetup);
  const recentDebates = loadFromStorage(STORAGE_KEYS.RECENT_DEBATES, []);

  return {
    agents: [],
    session: null,
    setup: savedSetup,
    loading: false,
    error: "",
    recentDebates,

    setSetup: (updater) =>
      set((s) => {
        const nextSetup = typeof updater === "function" ? updater(s.setup) : updater;
        const merged = { ...s.setup, ...(nextSetup || {}) };
        saveToStorage(STORAGE_KEYS.SETUP, merged);
        return { setup: merged };
      }),

    clearError: () => set({ error: "" }),

    loadAgents: async () => {
      try {
        const data = await api.listAgents();
        const nextAgents = data.agents || [];
        const nextAgentIdSet = new Set(nextAgents.map((agent) => agent.id));
        set((s) => ({
          agents: nextAgents,
          error: "",
          setup: {
            ...s.setup,
            agentIds: (s.setup.agentIds || [])
              .filter((id) => nextAgentIdSet.has(id))
              .length
              ? (s.setup.agentIds || []).filter((id) => nextAgentIdSet.has(id))
              : nextAgents.slice(0, 3).map((a) => a.id),
          },
        }));
      } catch (err) {
        set({ error: err.message });
      }
    },

    createAgent: async (payload, { selectAfterCreate = true } = {}) => {
      set({ error: "", loading: true });
      try {
        const { agent } = await api.createAgent(payload);
        await get().loadAgents();
        if (selectAfterCreate) {
          set((s) => ({
            setup: {
              ...s.setup,
              agentIds: s.setup.agentIds.includes(agent.id) ? s.setup.agentIds : [...s.setup.agentIds, agent.id],
            },
          }));
        }
        return agent;
      } catch (err) {
        set({ error: err.message });
        throw err;
      } finally {
        set({ loading: false });
      }
    },

  findAgentByName: async (payload) => {
    set({ error: "", loading: true });
    try {
      return await api.findAgentByName(payload);
    } catch (err) {
      set({ error: err.message });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  suggestAgents: async (payload) => {
    set({ error: "", loading: true });
    try {
      return await api.suggestAgents(payload);
    } catch (err) {
      set({ error: err.message });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  startSession: async () => {
    const { setup } = get();
    set({ error: "", loading: true });
    try {
      const data = await api.startSession(setup);
        const session = data.session;
        set({ session });
        
        // Save debate to recent debates
        const debateRecord = {
          id: session.id,
          topic: setup.topic,
          mood: setup.mood,
          agentIds: setup.agentIds,
          createdAt: new Date().toISOString(),
          status: "active",
        };
        
        const updated = addToRecentDebates(debateRecord);
        set({ recentDebates: updated });
        
        return session;
      } catch (err) {
        set({ error: err.message });
        throw err;
      } finally {
        set({ loading: false });
      }
    },

    stopSession: async () => {
      const { session } = get();
      if (!session?.id) return;
      set({ error: "", loading: true });
      try {
        const data = await api.stopSession(session.id);
        const updatedSession = data.session;
        set({ session: updatedSession });
        
        // Update recent debates
        set((s) => ({
          recentDebates: s.recentDebates.map((d) =>
            d.id === session.id ? { ...d, status: "ended" } : d
          ),
        }));
        
        return data;
      } catch (err) {
        set({ error: err.message });
        throw err;
      } finally {
        set({ loading: false });
      }
    },

    getRecentDebates: () => get().recentDebates,

    clearRecentDebates: () => {
      saveToStorage(STORAGE_KEYS.RECENT_DEBATES, []);
      set({ recentDebates: [] });
    },

    resumeDebate: (debateId) => {
      const debate = get().recentDebates.find((d) => d.id === debateId);
      if (!debate) return null;
      
      set((s) => ({
        setup: {
          topic: debate.topic,
          mood: debate.mood,
          agentIds: debate.agentIds,
        },
      }));
      
      return debate;
    },

    refreshSession: async (sessionId) => {
      try {
        const data = await api.getSession(sessionId);
        set({ session: data.session });
      } catch (err) {
        set({ error: err.message });
      }
    },

    sendMessage: async (text) => {
      const { session } = get();
      if (!session?.id) return;
      set({ error: "", loading: true });
      try {
        const data = await api.sendMessage(session.id, text);
        set({ session: data.session });
      } catch (err) {
        set({ error: err.message });
        throw err;
      } finally {
        set({ loading: false });
      }
    },

    autoStep: async () => {
      const { session } = get();
      if (!session?.id) return;
      set({ error: "", loading: true });
      try {
        const data = await api.autoStep(session.id);
        set({ session: data.session });
        return data;
      } catch (err) {
        set({ error: err.message });
        throw err;
      } finally {
        set({ loading: false });
      }
    },

    restartSession: async () => {
      const { session, setup } = get();
      set({ error: "", loading: true });
      if (session?.id && !session.closed) {
        try {
          await api.stopSession(session.id);
        } catch (error) {
          console.error("Error stopping session:", error);
        }
      }
      try {
        const data = await api.startSession(setup);
        const newSession = data.session;
        set({ session: newSession });
        
        // Save to recent debates
        const debateRecord = {
          id: newSession.id,
          topic: setup.topic,
          mood: setup.mood,
          agentIds: setup.agentIds,
          createdAt: new Date().toISOString(),
          status: "active",
        };
        
        const updated = addToRecentDebates(debateRecord);
        set({ recentDebates: updated });
        
        return newSession;
      } catch (err) {
        set({ error: err.message });
        throw err;
      } finally {
        set({ loading: false });
      }
    },
  }
});

export { useStore };