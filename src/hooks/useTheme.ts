import { useCallback, useEffect } from 'react';
import { useSettingsStore } from '../stores/useSettingsStore';
import { applyDynamicTokens } from '../theme/m3-tokens';
import { createLogger } from '../utils/logger';

const log = createLogger('theme');

export function useTheme() {
  const settings = useSettingsStore((s) => s.settings);
  const setSeedColor = useSettingsStore((s) => s.setSeedColor);
  const toggleDarkMode = useSettingsStore((s) => s.toggleDarkMode);

  const applyTheme = useCallback(
    (seedColor: string, dark: boolean) => {
      log.debug(`applyTheme(color=${seedColor}, dark=${dark})`);
      applyDynamicTokens(seedColor, dark);
      document.documentElement.classList.toggle('dark', dark);
      document.documentElement.classList.toggle('light', !dark);
    },
    []
  );

  useEffect(() => {
    applyTheme(settings.theme_seed_color, settings.dark_mode);
  }, [settings.theme_seed_color, settings.dark_mode, applyTheme]);

  return {
    seedColor: settings.theme_seed_color,
    setSeedColor,
    darkMode: settings.dark_mode,
    toggleDarkMode,
  };
}
