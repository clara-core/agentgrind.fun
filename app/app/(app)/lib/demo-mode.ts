'use client';

import { useEffect, useState } from 'react';

const KEY = 'ag_demo_agent_mode';

export function getDemoAgentMode(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(KEY) === '1';
}

export function setDemoAgentMode(on: boolean) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(KEY, on ? '1' : '0');
  window.dispatchEvent(new CustomEvent('ag_demo_agent_mode_changed', { detail: { on } }));
}

export function useDemoAgentMode() {
  const [on, setOn] = useState(() => {
    if (typeof window === 'undefined') return false;
    return getDemoAgentMode();
  });

  useEffect(() => {
    const handler = (e: any) => {
      const next = typeof e?.detail?.on === 'boolean' ? e.detail.on : getDemoAgentMode();
      setOn(next);
    };

    window.addEventListener('ag_demo_agent_mode_changed', handler);
    return () => window.removeEventListener('ag_demo_agent_mode_changed', handler);
  }, []);

  const toggle = () => {
    const next = !on;
    setDemoAgentMode(next);
    setOn(next);
  };

  return { on, toggle, setOn };
}
