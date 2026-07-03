import { create } from 'zustand';
import type { AuthUser } from '../types/auth';
import * as authApi from '../api/auth';
import { createLogger } from '../utils/logger';

const log = createLogger('auth');

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  forceShowRegister: boolean;
  skipReset: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, username?: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
  setUser: (user: AuthUser) => void;
  setShowRegister: (show: boolean) => void;
  resetSkip: () => void;
}

// Track whether initial auth check has been done
let authChecked = false;

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  loading: true,
  error: null,
  forceShowRegister: false,
  skipReset: false,

  register: async (email: string, password: string, username?: string) => {
    log.info(`register("${email}")`);
    set({ loading: true, error: null });
    try {
      const response = await authApi.register(email, password, username);
      log.info(`register => OK user=${response.user?.id ?? '?'}`);
      set({ user: response.user, isAuthenticated: true, loading: false, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      log.error(`register failed: ${message}`);
      // Map common Supabase errors to friendly messages
      let friendlyMsg = message;
      const lowerMsg = message.toLowerCase();
      if (lowerMsg.includes('rate limit')) {
        friendlyMsg = 'Too many attempts. Please wait a moment and try again.';
      } else if (lowerMsg.includes('already') && lowerMsg.includes('register')) {
        friendlyMsg = 'An account with this email already exists. Try logging in instead.';
      } else if (lowerMsg.includes('valid email') || lowerMsg.includes('invalid email')) {
        friendlyMsg = 'Please enter a valid email address.';
      } else if (lowerMsg.includes('signups are disabled') || lowerMsg.includes('signup is disabled')) {
        friendlyMsg = 'Registration is temporarily unavailable. Please try again later.';
      } else if (lowerMsg.includes('email not confirmed') || lowerMsg.includes('email_not_confirmed')) {
        friendlyMsg = 'Please confirm your email address first. Check your inbox for the confirmation link.';
      } else if (lowerMsg.includes('password') && lowerMsg.includes('at least')) {
        friendlyMsg = 'Password must be at least 6 characters.';
      }
      set({ loading: false, error: friendlyMsg });
    }
  },

  login: async (email: string, password: string) => {
    log.info(`login("${email}")`);
    set({ loading: true, error: null });
    try {
      const response = await authApi.login(email, password);
      log.info(`login => OK user=${response.user?.id ?? '?'}`);
      set({ user: response.user, isAuthenticated: true, loading: false, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      log.error(`login failed: ${message}`);
      let friendlyMsg = message;
      const lowerMsg = message.toLowerCase();
      if (lowerMsg.includes('rate limit')) {
        friendlyMsg = 'Too many attempts. Please wait a moment and try again.';
      } else if (lowerMsg.includes('invalid login credentials') || lowerMsg.includes('invalid_grant')) {
        friendlyMsg = 'Invalid email or password.';
      } else if (lowerMsg.includes('email not confirmed') || lowerMsg.includes('email_not_confirmed')) {
        friendlyMsg = 'Please confirm your email address first. Check your inbox for the confirmation link.';
      } else if (lowerMsg.includes('user not found') || lowerMsg.includes('identity not found')) {
        friendlyMsg = 'No account found with this email.';
      } else if (lowerMsg.includes('password')) {
        friendlyMsg = 'Invalid email or password.';
      }
      set({ loading: false, error: friendlyMsg });
    }
  },

  logout: async () => {
    log.info('logout()');
    authChecked = false;
    set({ loading: true, error: null });
    try {
      await authApi.logout();
    } catch {
      log.warn('logout backend call failed, proceeding locally');
    }
    set({ user: null, isAuthenticated: false, loading: false, error: null });
  },

  checkAuth: async () => {
    if (authChecked) return;
    authChecked = true;
    log.debug('checkAuth()');
    try {
      const user = await authApi.getCurrentUser();
      log.info(`checkAuth => ${user ? 'authenticated' : 'not authenticated'}`);
      set({ user, isAuthenticated: !!user, loading: false });
    } catch {
      log.debug('checkAuth => no session');
      set({ user: null, isAuthenticated: false, loading: false });
    }
  },

  clearError: () => set({ error: null }),
  setUser: (user: AuthUser) => set({ user }),
  setShowRegister: (show: boolean) => set({ forceShowRegister: show }),
  resetSkip: () => set({ skipReset: true }),
}));
