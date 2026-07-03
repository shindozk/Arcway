import { useEffect, useRef } from 'react';
import { useAuthStore } from '../stores/useAuthStore';

export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const loading = useAuthStore((s) => s.loading);
  const error = useAuthStore((s) => s.error);
  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);
  const logout = useAuthStore((s) => s.logout);
  const clearError = useAuthStore((s) => s.clearError);

  const initialized = useRef(false);

  // Only call checkAuth once on mount — never re-run.
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    useAuthStore.getState().checkAuth();
  }, []);

  return { user, isAuthenticated, loading, error, login, register, logout, clearError };
}
