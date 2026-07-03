import { invoke } from '@tauri-apps/api/core';
import type { AuthUser, AuthResponse } from '../types/auth';
import { createLogger } from '../utils/logger';

const log = createLogger('api.auth');

export async function register(email: string, password: string, username?: string): Promise<AuthResponse> {
  log.info(`register("${email}")`);
  const result = await invoke<AuthResponse>('register', { email, password, username: username || '' });
  log.info('register => OK');
  return result;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  log.info(`login("${email}")`);
  const result = await invoke<AuthResponse>('login', { email, password });
  log.info('login => OK');
  return result;
}

export async function logout(): Promise<void> {
  log.info('logout()');
  await invoke<void>('logout');
  log.info('logout => OK');
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  log.debug('getCurrentUser()');
  const result = await invoke<AuthUser | null>('get_current_user');
  log.debug(`getCurrentUser => ${result ? result.email : 'null'}`);
  return result;
}

export async function checkAuth(): Promise<boolean> {
  log.debug('checkAuth()');
  const result = await invoke<boolean>('check_auth');
  log.debug(`checkAuth => ${result}`);
  return result;
}

export async function updateProfile(data: {
  display_name?: string;
  avatar_url?: string;
  banner_url?: string;
}): Promise<AuthUser> {
  log.info(`update_profile(${Object.keys(data).join(', ')})`);
  const result = await invoke<AuthUser>('update_profile', {
    displayName: data.display_name,
    avatarUrl: data.avatar_url,
    bannerUrl: data.banner_url,
  });
  log.info('update_profile => OK');
  return result;
}
