import type { ReactNode } from 'react';
import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import LoginPage from '../../pages/LoginPage';
import RegisterPage from '../../pages/RegisterPage';
import { useAnimateOnMount } from '../../utils/animations';
import { useI18n } from '../../i18n';
import { useAuthStore } from '../../stores/useAuthStore';

const STORAGE_KEY = 'arcway_auth_skipped';

export function AuthGuard({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, loading, error, login, register, clearError } = useAuth();
  const forceShowRegister = useAuthStore((s) => s.forceShowRegister);
  const skipReset = useAuthStore((s) => s.skipReset);
  const { t } = useI18n();
  const [showRegister, setShowRegister] = useState(forceShowRegister);
  const [skipped, setSkipped] = useState(() => localStorage.getItem(STORAGE_KEY) === 'true');
  const fadeAnim = useAnimateOnMount({ variant: 'fadeIn', duration: 300 });

  // Sync with store
  useEffect(() => {
    if (forceShowRegister) {
      setShowRegister(true);
      useAuthStore.getState().setShowRegister(false);
    }
  }, [forceShowRegister]);

  useEffect(() => {
    if (skipReset) {
      setSkipped(false);
      useAuthStore.getState().resetSkip();
    }
  }, [skipReset]);

  const handleSkip = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setSkipped(true);
  }, []);

  // Show loading only during initial auth check (not during login/register actions)
  if (loading && !skipped && !isAuthenticated) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        height: '100vh', width: '100%', background: 'var(--md-sys-color-surface)', gap: '16px',
      }}>
        <div style={{
          width: '40px', height: '40px',
          border: '3px solid var(--md-sys-color-outline)',
          borderTopColor: 'var(--md-sys-color-primary)',
          borderRadius: '50%', animation: 'spin 0.8s linear infinite',
        }} />
        <span style={{ fontSize: '14px', color: 'var(--md-sys-color-on-surface-variant)' }}>
          {t('loading')}
        </span>
      </div>
    );
  }

  if (skipped || (isAuthenticated && user)) {
    return <>{children}</>;
  }

  if (showRegister) {
    return (
      <div style={fadeAnim.style}>
        <RegisterPage
          onRegister={(email, password, username) => register(email, password, username)}
          onSwitchToLogin={() => { clearError(); setShowRegister(false); }}
          onSkip={handleSkip}
          loading={loading}
          error={error}
          clearError={clearError}
        />
      </div>
    );
  }

  return (
    <div style={fadeAnim.style}>
      <LoginPage
        onLogin={login}
        onSwitchToRegister={() => { clearError(); setShowRegister(true); }}
        onSkip={handleSkip}
        loading={loading}
        error={error}
        clearError={clearError}
      />
    </div>
  );
}
