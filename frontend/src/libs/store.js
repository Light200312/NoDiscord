import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from "./api";

function normalizeLanguageMode(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "hinglish") return "hinglish";
  if (normalized === "english_us") return "english_us";
  return "english_us";
}

const initialSetup = {
  topic: "",
  temperature: "analytical",
  mood: "analytical",
  agentIds: [],
};

const initialSettings = {
  orchestrationMode: "dynamic",
  memoryMode: "minimal",
  contextMode: "simple",
  audioAutoSpeak: true,
  autoLoopEnabled: false,
  languageMode: "english_us",
  maxArguments: 25,
};

const useStore = create(
  persist(
    (set, get) => ({
      agents: [],
      session: null,
      setup: initialSetup,
      settings: initialSettings,
      loading: false,
      error: "",
      history: [],
      historyLoading: false,
      isSettingsModalOpen: false,

      setSetup: (updater) =>
        set((state) => ({
          setup: typeof updater === "function" ? updater(state.setup) : { ...state.setup, ...(updater || {}) },
        })),

      setSettings: (updater) =>
        set((state) => ({
          settings: (() => {
            const nextSettings =
              typeof updater === "function"
                ? updater(state.settings)
                : { ...state.settings, ...(updater || {}) };

            return {
              ...nextSettings,
              languageMode: normalizeLanguageMode(nextSettings?.languageMode),
            };
          })(),
        })),

      clearError: () => set({ error: "" }),

      openSettingsModal: () => set({ isSettingsModalOpen: true }),

      closeSettingsModal: () => set({ isSettingsModalOpen: false }),

      loadAgents: async () => {
        try {
          const data = await api.listAgents();
          const nextAgents = data.agents || [];
          const nextAgentIdSet = new Set(nextAgents.map((agent) => agent.id));
          set((state) => ({
            agents: nextAgents,
            error: "",
            setup: {
              ...state.setup,
              agentIds: (state.setup.agentIds || []).filter((id) => nextAgentIdSet.has(id)),
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
            set((state) => ({
              setup: {
                ...state.setup,
                agentIds: state.setup.agentIds.includes(agent.id)
                  ? state.setup.agentIds
                  : [...state.setup.agentIds, agent.id],
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

      loadHistory: async () => {
        set({ historyLoading: true, error: "" });
        try {
          const data = await api.getHistory();
          set({ history: data.discussions || [] });
        } catch (err) {
          set({ error: err.message, history: [] });
        } finally {
          set({ historyLoading: false });
        }
      },

      startSession: async (overrides = {}) => {
        const { setup, settings } = get();
        set({ error: "", loading: true });
        try {
          const mergedSetup = { ...setup, ...(overrides || {}) };
          const requestPayload = { ...mergedSetup };

          // Feature pages pass generated `agents`; in that flow we must not also
          // send stale persisted `agentIds` from a previous debate setup.
          if (Array.isArray(overrides?.agents) && !Array.isArray(overrides?.agentIds)) {
            delete requestPayload.agentIds;
          }

          const mergedSettings = {
            ...settings,
            ...((overrides && overrides.settings) || {}),
          };
          const normalizedLanguageMode = normalizeLanguageMode(
            mergedSettings.languageMode || mergedSetup.languageMode
          );
          const effectiveTemperature = String(mergedSetup.temperature || mergedSetup.mood || "analytical").trim();
          const data = await api.startSession({
            ...requestPayload,
            temperature: effectiveTemperature,
            mood: mergedSetup.mood || effectiveTemperature,
            settings: {
              ...mergedSettings,
              languageMode: normalizedLanguageMode,
            },
            maxArguments: mergedSettings.maxArguments,
            orchestrationMode: mergedSettings.orchestrationMode,
            memoryMode: mergedSettings.memoryMode,
            contextMode: mergedSettings.contextMode,
            languageMode: normalizedLanguageMode,
          });
          set({
            session: data.session,
            setup: {
              ...setup,
              topic: mergedSetup.topic || setup.topic,
              mood: mergedSetup.mood || setup.mood,
              temperature: effectiveTemperature,
              agentIds: Array.isArray(data.session?.agentIds) ? data.session.agentIds : setup.agentIds,
            },
          });
          await get().loadHistory();
          return data.session;
        } catch (err) {
          set({ error: err.message });
          throw err;
        } finally {
          set({ loading: false });
        }
      },

      stopSession: async () => {
        const { session } = get();
        if (!session?.id) return null;
        set({ error: "", loading: true });
        try {
          const data = await api.stopSession(session.id);
          set({ session: data.session });
          await get().loadHistory();
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
          set({ session: data.session, error: "" });
          return data.session;
        } catch (err) {
          set({ error: err.message });
          throw err;
        }
      },

      openHistorySession: async (sessionId) => {
        set({ loading: true, error: "" });
        try {
          const data = await api.getSession(sessionId);
          const session = data.session;
          set({
            session,
            setup: {
              topic: session.topic || "",
              mood: session.mood || "balanced",
              agentIds: session.agentIds || [],
            },
            settings: {
              ...get().settings,
              ...(session.settings || {}),
              orchestrationMode: session.orchestrationMode || session.settings?.orchestrationMode || "dynamic",
              memoryMode: session.memoryMode || session.settings?.memoryMode || "minimal",
              contextMode: session.contextMode || session.settings?.contextMode || "simple",
              languageMode: normalizeLanguageMode(session.languageMode || session.settings?.languageMode),
              maxArguments: session.maxArguments || get().settings.maxArguments,
            },
          });
          return session;
        } catch (err) {
          set({ error: err.message });
          throw err;
        } finally {
          set({ loading: false });
        }
      },

      sendMessage: async (text) => {
        const { session } = get();
        if (!session?.id) return null;
        set({ error: "", loading: true });
        try {
          const data = await api.sendMessage(session.id, text);
          set({ session: data.session });
          await get().loadHistory();
          return data;
        } catch (err) {
          set({ error: err.message });
          throw err;
        } finally {
          set({ loading: false });
        }
      },

      autoStep: async () => {
        const { session } = get();
        if (!session?.id) return null;
        set({ error: "", loading: true });
        try {
          const data = await api.autoStep(session.id);
          set({ session: data.session });
          await get().loadHistory();
          return data;
        } catch (err) {
          set({ error: err.message });
          throw err;
        } finally {
          set({ loading: false });
        }
      },

      restartSession: async () => {
        const { session } = get();
        if (session?.id && !session.closed) {
          await get().stopSession().catch(() => null);
        }
        return get().startSession();
      },
    }),
    {
      name: "no-discord-store",
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...(persistedState || {}),
        settings: {
          ...currentState.settings,
          ...((persistedState && persistedState.settings) || {}),
          languageMode: normalizeLanguageMode(
            persistedState?.settings?.languageMode || currentState.settings.languageMode
          ),
        },
      }),
      partialize: (state) => ({
        setup: state.setup,
        settings: state.settings,
      }),
    }
  )
);

export { initialSettings, initialSetup, useStore };
