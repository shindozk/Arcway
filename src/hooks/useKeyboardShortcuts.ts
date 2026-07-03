import { useEffect, useCallback, useMemo } from 'react';
import { useUIStore } from '../stores/useUIStore';

interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  action: () => void;
  description: string;
}

export function useKeyboardShortcuts(extraShortcuts?: ShortcutConfig[]) {
  const goBack = useUIStore((s) => s.goBack);

  const defaultShortcuts = useMemo<ShortcutConfig[]>(() => [
    { key: 'k', ctrl: true, action: () => useUIStore.getState().navigate('search'), description: 'Open search' },
    { key: 'Escape', action: () => goBack(), description: 'Go back' },
    { key: '1', ctrl: true, action: () => useUIStore.getState().navigate('home'), description: 'Home' },
    { key: '2', ctrl: true, action: () => useUIStore.getState().navigate('search'), description: 'Search' },
    { key: '3', ctrl: true, action: () => useUIStore.getState().navigate('installed'), description: 'Installed' },
    { key: '4', ctrl: true, action: () => useUIStore.getState().navigate('updates'), description: 'Updates' },
    { key: '5', ctrl: true, action: () => useUIStore.getState().navigate('settings'), description: 'Settings' },
  ], [goBack]);

  const allShortcuts = useMemo(() => [...defaultShortcuts, ...(extraShortcuts || [])], [defaultShortcuts, extraShortcuts]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in inputs
    const target = e.target as HTMLElement;
    const inInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable;
    if (inInput && e.key !== 'Escape') return;

    const match = allShortcuts.find((s) => {
      const keyMatch = e.key.toLowerCase() === s.key.toLowerCase();
      const ctrlMatch = s.ctrl ? (e.ctrlKey || e.metaKey) : !(e.ctrlKey || e.metaKey);
      const shiftMatch = s.shift ? e.shiftKey : !e.shiftKey;
      return keyMatch && ctrlMatch && shiftMatch;
    });

    if (match) {
      e.preventDefault();
      match.action();
    }
  }, [allShortcuts]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
