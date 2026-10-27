'use client';

import { useSyncExternalStore } from 'react';
import { Moon, Sun } from 'lucide-react';

export const THEME_KEY = 'aumTheme';
/** Runs before paint (inlined in <head>) so the saved theme never flashes. */
export const themeBootScript = `try{var t=localStorage.getItem('${THEME_KEY}');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`;

const listeners = new Set<() => void>();
const isDark = () => document.documentElement.classList.contains('dark');

export function ThemeToggle() {
  const dark = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    isDark,
    () => false,
  );
  return (
    <button
      type="button"
      onClick={() => {
        const next = !isDark();
        document.documentElement.classList.toggle('dark', next);
        try {
          localStorage.setItem(THEME_KEY, next ? 'dark' : 'light');
        } catch {
          /* ignore */
        }
        listeners.forEach((l) => l());
      }}
      aria-pressed={dark}
      aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
      className="grid size-11 place-items-center rounded-full border border-line text-ink-soft hover:text-ink"
    >
      {dark ? <Sun aria-hidden className="size-5" /> : <Moon aria-hidden className="size-5" />}
    </button>
  );
}
