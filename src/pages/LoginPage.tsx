import { useState, type FormEvent } from 'react';
import { useAnimateOnMount } from '../utils/animations';
import { playSound } from '../utils/sounds';
import { useI18n } from '../i18n';
import arcwayLogo from '../assets/logo/arcway_logo.png';

interface LoginPageProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onSwitchToRegister: () => void;
  onSkip: () => void;
  loading: boolean;
  error: string | null;
  clearError: () => void;
}

export default function LoginPage({ onLogin, onSwitchToRegister, onSkip, loading, error, clearError }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const anim = useAnimateOnMount({ variant: 'scaleIn', duration: 400 });
  const { t } = useI18n();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    playSound('tap');
    try { await onLogin(email, password); playSound('success'); } catch { playSound('error'); }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', width: '100%', background: 'var(--md-sys-color-surface)', padding: '24px' }}>
      <div style={{
        width: '100%', maxWidth: '400px', backgroundColor: 'var(--md-sys-color-surface-container-low)',
        borderRadius: '24px', padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.08)', ...anim.style,
      }}>
        {/* Back button */}
        <div style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'flex-start' }}>
          <button onClick={() => { playSound('back'); onSkip(); }}
            style={{ width: '32px', height: '32px', borderRadius: '8px', border: 'none', background: 'transparent', color: 'var(--md-sys-color-on-surface-variant)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background-color 0.15s' }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--md-sys-color-surface-container)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>arrow_back</span>
          </button>
        </div>

        <img src={arcwayLogo} alt="Arcway" style={{ width: '56px', height: '56px', borderRadius: '16px', objectFit: 'contain' }} />

        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--md-sys-color-on-surface)', margin: 0 }}>
            {t('login.title')}
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--md-sys-color-on-surface-variant)', marginTop: '4px' }}>
            {t('login.subtitle')}
          </p>
        </div>

        {error && (
          <div style={{ padding: '12px 16px', borderRadius: '12px', backgroundColor: 'var(--md-sys-color-error-container)', color: 'var(--md-sys-color-on-error-container)', fontSize: '13px', width: '100%' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <input type="email" placeholder={t('login.email')} value={email}
            onChange={(e) => { setEmail(e.target.value); clearError(); }}
            style={{ height: '48px', padding: '0 16px', borderRadius: '12px', border: '1px solid var(--md-sys-color-outline)', backgroundColor: 'var(--md-sys-color-surface-container-lowest)', color: 'var(--md-sys-color-on-surface)', fontSize: '15px', outline: 'none', width: '100%', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--md-sys-color-primary)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--md-sys-color-outline)'; }}
          />
          <div style={{ position: 'relative' }}>
            <input type={showPassword ? 'text' : 'password'} placeholder={t('login.password')} value={password}
              onChange={(e) => { setPassword(e.target.value); clearError(); }}
              style={{ height: '48px', padding: '0 48px 0 16px', borderRadius: '12px', border: '1px solid var(--md-sys-color-outline)', backgroundColor: 'var(--md-sys-color-surface-container-lowest)', color: 'var(--md-sys-color-on-surface)', fontSize: '15px', outline: 'none', width: '100%', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--md-sys-color-primary)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--md-sys-color-outline)'; }}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              style={{ position: 'absolute', right: '8px', top: '8px', width: '32px', height: '32px', borderRadius: '8px', border: 'none', background: 'transparent', color: 'var(--md-sys-color-on-surface-variant)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{showPassword ? 'visibility_off' : 'visibility'}</span>
            </button>
          </div>
          <button type="submit" disabled={loading || !email.trim() || !password.trim()}
            style={{ height: '48px', borderRadius: '12px', border: 'none', backgroundColor: 'var(--md-sys-color-primary)', color: 'var(--md-sys-color-on-primary)', fontSize: '15px', fontWeight: 500, cursor: 'pointer', opacity: loading || !email.trim() || !password.trim() ? 0.6 : 1, transition: 'opacity 0.2s' }}>
            {loading ? t('login.submitting') : t('login.submit')}
          </button>
        </form>

        <p style={{ fontSize: '13px', color: 'var(--md-sys-color-on-surface-variant)', margin: 0 }}>
          {t('login.noAccount')}{' '}
          <button onClick={() => { playSound('tap'); onSwitchToRegister(); }} style={{ background: 'none', border: 'none', color: 'var(--md-sys-color-primary)', cursor: 'pointer', fontSize: '13px', fontWeight: 500, fontFamily: 'inherit' }}>
            {t('login.signup')}
          </button>
        </p>

        <button onClick={() => { playSound('tap'); onSkip(); }} style={{ background: 'none', border: 'none', color: 'var(--md-sys-color-outline)', cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit' }}>
          {t('login.skip')}
        </button>
      </div>
    </div>
  );
}
