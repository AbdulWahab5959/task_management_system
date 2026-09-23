import { useEffect } from 'react';

/**
 * Opens the task editor with Todoist-style quick add behavior.
 * Form controls and an already-open dialog retain keyboard ownership.
 */
export function useTaskShortcut(onCreate: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (event.key.toLowerCase() !== 'q') return;

      const target = event.target instanceof HTMLElement ? event.target : null;
      if (target?.closest('input, textarea, select, button, [contenteditable="true"], dialog[open]')) return;

      event.preventDefault();
      onCreate();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled, onCreate]);
}
