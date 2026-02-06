'use client';

import { useDemoAgentMode } from './lib/demo-mode';

export function AgentDemoFab() {
  const { on, toggle } = useDemoAgentMode();

  return (
    <div className="fixed bottom-5 right-5 z-50">
      <button
        type="button"
        onClick={toggle}
        className={`flex items-center gap-3 rounded-2xl border px-4 py-3 backdrop-blur shadow-lg transition-colors ${
          on
            ? 'border-brand-green/60 bg-brand-card/80'
            : 'border-brand-border bg-brand-card/60'
        }`}
        title="Toggle agent demo actions in UI"
      >
        <span className="text-lg">🤖</span>
        <div className="flex flex-col items-start leading-tight">
          <span className="text-xs text-brand-textMuted">Agent demo</span>
          <span className={`text-sm font-semibold ${on ? 'text-brand-green' : 'text-brand-text'}`}>
            {on ? 'ON' : 'OFF'}
          </span>
        </div>

        <span
          className={`relative inline-flex h-6 w-11 items-center rounded-full border transition-colors ${
            on ? 'bg-brand-green/20 border-brand-green' : 'bg-transparent border-brand-border'
          }`}
          aria-hidden
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full transition-transform ${
              on ? 'translate-x-5 bg-brand-green' : 'translate-x-1 bg-brand-textMuted'
            }`}
          />
        </span>
      </button>
    </div>
  );
}
