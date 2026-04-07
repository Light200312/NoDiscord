import { create } from "zustand";
import { api } from "./api";

const initialSetup = {
  topic: "",
  mood: "balanced",
  agentIds: [],
};

const useStore = create((set, get) => ({
  agents: [],
  session: null,
  setup: initialSetup,
  loading: false,
  error: "",

  setSetup: (updater) =>
    set((s) => {
      const nextSetup = typeof updater === "function" ? updater(s.setup) : updater;
      return { setup: { ...s.setup, ...(nextSetup || {}) } };
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
      set({ session: data.session });
      return data.session;
    } catch (err) {
      set({ error: err.message });
      throw err;
    } finally {
      set({ loading: false });
    }
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

  stopSession: async () => {
    const { session } = get();
    if (!session?.id) return;
    set({ error: "", loading: true });
    try {
      const data = await api.stopSession(session.id);
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
        console.error("Error : ",error)
      }
    }
    try {
      const data = await api.startSession(setup);
      set({ session: data.session });
      return data.session;
    } catch (err) {
      set({ error: err.message });
      throw err;
    } finally {
      set({ loading: false });
    }
  },
}));

export { useStore };