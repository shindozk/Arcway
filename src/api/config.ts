import { invoke } from '@tauri-apps/api/core';
import type { Settings } from '../types/package';
import { createLogger } from '../utils/logger';

const log = createLogger('api.config');

export async function getSettings(): Promise<Settings> {
  log.debug('getSettings()');
  const result = await invoke<Settings>('get_config');
  log.debug(`getSettings => OK`);
  return result;
}

export async function saveSettings(settings: Settings): Promise<void> {
  log.debug('saveSettings()');
  await invoke('update_config', { settings });
}
