import { create } from 'zustand';
import type { Settings } from '../types/package';
import { PackageSource } from '../types/package';
import { getSettings, saveSettings } from '../api/config';
import { DEFAULT_SEED_COLOR } from '../utils/constants';
import { createLogger } from '../utils/logger';

const log = createLogger('settings');

interface SettingsState {
  settings: Settings;
  loaded: boolean;
  loadSettings: () => Promise<void>;
  updateSettings: (partial: Partial<Settings>) => Promise<void>;
  toggleSource: (source: PackageSource) => Promise<void>;
  setSeedColor: (color: string) => Promise<void>;
  toggleDarkMode: () => Promise<void>;
}

const defaultSettings: Settings = {
  theme_seed_color: DEFAULT_SEED_COLOR,
  dark_mode: true,
  enabled_sources: [PackageSource.Flatpak, PackageSource.Yay, PackageSource.Paru],
  cache_duration_minutes: 30,
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: defaultSettings,
  loaded: false,

  loadSettings: async () => {
    log.debug('loadSettings()');
    try {
      const settings = await getSettings();
      log.info(`loadSettings => OK (dark=${settings.dark_mode}, color=${settings.theme_seed_color})`);
      set({ settings, loaded: true });
    } catch (err) {
      log.warn(`loadSettings failed, using defaults`);
      set({ settings: defaultSettings, loaded: true });
    }
  },

  updateSettings: async (partial: Partial<Settings>) => {
    const newSettings = { ...get().settings, ...partial };
    set({ settings: newSettings });
    try {
      await saveSettings(newSettings);
      log.debug('settings saved');
    } catch {
      log.warn('settings save failed');
    }
  },

  toggleSource: async (source: PackageSource) => {
    const { settings } = get();
    const sources = settings.enabled_sources.includes(source)
      ? settings.enabled_sources.filter((s) => s !== source)
      : [...settings.enabled_sources, source];
    log.debug(`toggleSource("${source}") => [${sources.join(',')}]`);
    await get().updateSettings({ enabled_sources: sources });
  },

  setSeedColor: async (color: string) => {
    log.debug(`setSeedColor("${color}")`);
    await get().updateSettings({ theme_seed_color: color });
  },

  toggleDarkMode: async () => {
    const next = !get().settings.dark_mode;
    log.debug(`toggleDarkMode => ${next ? 'dark' : 'light'}`);
    await get().updateSettings({ dark_mode: next });
  },
}));
