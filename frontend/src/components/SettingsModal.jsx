import { useStore } from "../libs/store.js";

function SettingsModal({ isOpen, onClose }) {
  const settings = useStore((s) => s.settings);
  const setSettings = useStore((s) => s.setSettings);

  if (!isOpen) return null;

  const renderBinaryToggleRow = ({
    title,
    leftLabel,
    rightLabel,
    isRightSelected,
    onSelectLeft,
    onSelectRight,
  }) => (
    <section className="space-y-3">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-white">{title}</h3>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onSelectLeft}
            className={`flex-1 rounded-xl border px-3 py-2 text-xs font-medium transition ${
              !isRightSelected
                ? "border-sky-400/50 bg-sky-400/15 text-sky-100"
                : "border-white/10 bg-white/[0.02] text-white/60 hover:border-white/20"
            }`}
          >
            {leftLabel}
          </button>

          <button
            type="button"
            role="switch"
            aria-checked={isRightSelected}
            aria-label={`${title} toggle`}
            onClick={() => (isRightSelected ? onSelectLeft() : onSelectRight())}
            className={`group relative h-7 w-12 shrink-0 rounded-full border transition ${
              isRightSelected
                ? "border-sky-300/60 bg-sky-400/65"
                : "border-white/25 bg-white/15"
            }`}
          >
            <span
              className={`absolute top-0.5 h-[22px] w-[22px] rounded-full bg-white shadow-sm transition-all ${
                isRightSelected ? "left-[24px]" : "left-[2px]"
              }`}
            />
          </button>

          <button
            type="button"
            onClick={onSelectRight}
            className={`flex-1 rounded-xl border px-3 py-2 text-xs font-medium transition ${
              isRightSelected
                ? "border-sky-400/50 bg-sky-400/15 text-sky-100"
                : "border-white/10 bg-white/[0.02] text-white/60 hover:border-white/20"
            }`}
          >
            {rightLabel}
          </button>
        </div>
      </div>
    </section>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] border border-white/10 bg-[#0c0c0f]/95 shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 border-b border-white/8 bg-[#0c0c0f] px-6 py-4 sm:px-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Debate Settings</h2>
            <button
              onClick={onClose}
              className="rounded-lg border border-white/10 bg-white/5 p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6 px-6 py-6 sm:px-8">
          {renderBinaryToggleRow({
            title: "Orchestration Mode",
            leftLabel: "Dynamic",
            rightLabel: "Round Robin",
            isRightSelected: settings.orchestrationMode === "round_robin",
            onSelectLeft: () =>
              setSettings({
                orchestrationMode: "dynamic",
              }),
            onSelectRight: () =>
              setSettings({
                orchestrationMode: "round_robin",
              }),
          })}

          {renderBinaryToggleRow({
            title: "Memory & Context",
            leftLabel: "Minimal",
            rightLabel: "Rich",
            isRightSelected: settings.memoryMode === "rich",
            onSelectLeft: () =>
              setSettings({
                memoryMode: "minimal",
              }),
            onSelectRight: () =>
              setSettings({
                memoryMode: "rich",
              }),
          })}

          {renderBinaryToggleRow({
            title: "Context Storage",
            leftLabel: "Simple",
            rightLabel: "Rich",
            isRightSelected: settings.contextMode === "rich",
            onSelectLeft: () =>
              setSettings({
                contextMode: "simple",
              }),
            onSelectRight: () =>
              setSettings({
                contextMode: "rich",
              }),
          })}

          <section className="space-y-3">
            <label className="text-sm font-semibold text-white">
              Response Language
            </label>
            <select
              value={settings.languageMode}
              onChange={(e) => setSettings({ languageMode: e.target.value })}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:border-sky-300/50 focus:outline-none focus:ring-1 focus:ring-sky-300/25"
            >
              <option value="english_in">English (IN)</option>
              <option value="english_us">English (US)</option>
              <option value="hinglish">Hinglish</option>
            </select>
            <p className="text-xs text-white/40">
              Choose the speaking style used for responses and audio input.
            </p>
          </section>

          {/* Max Arguments */}
          <section className="space-y-3">
            <label className="text-sm font-semibold text-white">
              Maximum AI Arguments
            </label>
            <input
              type="number"
              min="4"
              max="50"
              value={settings.maxArguments}
              onChange={(e) => setSettings({ maxArguments: Number(e.target.value) || 25 })}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:border-sky-300/50 focus:outline-none focus:ring-1 focus:ring-sky-300/25"
            />
            <p className="text-xs text-white/40">Debate will end after this many mentor arguments</p>
          </section>
        </div>

        {/* Footer */}
        <div className="border-t border-white/8 bg-white/[0.02] px-6 py-4 sm:px-8">
          <button
            onClick={onClose}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

export default SettingsModal;
