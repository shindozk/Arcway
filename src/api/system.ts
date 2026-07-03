import { invoke } from '@tauri-apps/api/core';
import { PackageSource } from '../types/package';
import { createLogger } from '../utils/logger';

const log = createLogger('api.system');

export async function installPackage(
  id: string,
  source: PackageSource
): Promise<void> {
  log.info(`install("${id}", ${source})`);
  await invoke('install_package', { id, source });
  log.info(`install => OK`);
}

export async function uninstallPackage(
  id: string,
  source: PackageSource
): Promise<void> {
  log.info(`uninstall("${id}", ${source})`);
  await invoke('uninstall_package', { id, source });
  log.info(`uninstall => OK`);
}

export async function updatePackage(id: string): Promise<void> {
  log.info(`update("${id}")`);
  await invoke('update_package', { id });
  log.info(`update => OK`);
}

export async function updateAll(): Promise<void> {
  log.info('updateAll()');
  await invoke('update_all');
  log.info('updateAll => OK');
}

export async function clearCache(): Promise<void> {
  log.info('clearCache()');
  await invoke('clear_cache');
  log.info('clearCache => OK');
}

export async function setSudoPassword(password: string): Promise<boolean> {
  log.info('setSudoPassword()');
  const result = await invoke<boolean>('set_sudo_password', { password });
  log.info(`setSudoPassword => ${result}`);
  return result;
}

export async function hasSudoPassword(): Promise<boolean> {
  const result = await invoke<boolean>('has_sudo_password');
  return result;
}
