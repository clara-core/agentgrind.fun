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
}

export function useDemoAgentMode() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    setOn(getDemoAgentMode());
  }, []);

  const toggle = () => {
    const next = !on;
    setDemoAgentMode(next);
    setOn(next);
  };

  return { on, toggle, setOn };
}
