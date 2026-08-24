'use client';

import { useEffect, useState } from 'react';
import { useStrings } from '@/components/providers/StringsProvider';

interface ThemeToggleProps {
  className?: string;
}

/**
 * Switches between light and dark, and reports which is on.
 *
 * The `dark` class itself is put on `<html>` by the inline script in the root
 * layout, before anything paints; this only reads it. It keeps reading it
 * because two toggles are mounted at once — the phone header's and the
 * sidebar's, one hidden by the viewport — and each holding its own idea of
 * the theme meant the hidden one woke up after a resize announcing the wrong
 * state and needing two presses to change it.
 */
export function ThemeToggle({ className = 'w-5 h-5' }: ThemeToggleProps) {
  const [isDark, setIsDark] = useState(false);
  const t = useStrings();

  useEffect(() => {
    const root = document.documentElement;
    const read = () => setIsDark(root.classList.contains('dark'));

    read();
    const observer = new MutationObserver(read);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });

    return () => observer.disconnect();
  }, []);

  const toggleTheme = () => {
    const next = isDark ? 'light' : 'dark';
    localStorage.setItem('theme', next);
    document.documentElement.classList.toggle('dark', next === 'dark');
  };

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-md text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
      aria-label={isDark ? t.switchToLight : t.switchToDark}
      title={isDark ? t.switchToLight : t.switchToDark}
    >
      {isDark ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
        >
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}
