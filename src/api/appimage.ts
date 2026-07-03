import { invoke } from '@tauri-apps/api/core';
import { createLogger } from '../utils/logger';

const log = createLogger('appimage');

export interface AppImageInfo {
  name: string;
  version: string;
  description: string;
  icon_path: string | null;
  desktop_file_path: string | null;
  source_path: string;
  installed_path: string | null;
}

export async function pickAndInstallAppImage(): Promise<AppImageInfo | null> {
  log.info('Opening file picker...');
  const result = await invoke<AppImageInfo | null>('pick_and_install_appimage');
  if (result) log.info(`Installed: ${result.name}`);
  return result;
}

export async function updateAppImage(name: string): Promise<AppImageInfo | null> {
  log.info(`Updating AppImage: ${name}`);
  const result = await invoke<AppImageInfo | null>('pick_and_install_appimage');
  if (result) {
    // Remove old, install new
    await invoke('update_appimage', { name, sourcePath: result.source_path });
    log.info(`Updated: ${result.name}`);
  }
  return result;
}

export async function uninstallAppImage(name: string): Promise<void> {
  log.info(`Uninstalling AppImage: ${name}`);
  await invoke('uninstall_appimage', { name });
  log.info(`Uninstalled: ${name}`);
}

export async function listAppImages(): Promise<AppImageInfo[]> {
  const result = await invoke<AppImageInfo[]>('list_appimages');
  log.info(`Found ${result.length} AppImages`);
  return result;
}

export async function getAppImageIcon(path: string): Promise<string> {
  return invoke<string>('get_appimage_icon', { path });
}
