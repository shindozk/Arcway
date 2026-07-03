import { useState } from 'react';
import { setSudoPassword } from '../../api/system';
import { useI18n } from '../../i18n';
import { createLogger } from '../../utils/logger';

const log = createLogger('sudo');

interface SudoModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  packageName?: string;
}

export function SudoModal({ open, onClose, onSuccess, packageName }: SudoModalProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { t } = useI18n();

  if (!open) return null;

  const handleSubmit = async () => {
    if (!password.trim()) { setError(t('sudo.placeholder')); return; }
    setLoading(true);
    setError('');
    try {
      await setSudoPassword(password);
      log.info('Sudo password set successfully');
      setPassword('');
      onSuccess();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed';
      log.error(`setSudoPassword failed: ${msg}`);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 20000, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)', animation: 'fadeIn 0.2s ease' }} onClick={onClose}>
      <div style={{ width: '400px', maxWidth: '90vw', backgroundColor: 'var(--md-sys-color-surface-container-high)', borderRadius: '20px', border: '1px solid var(--md-sys-color-outline-variant)', boxShadow: '0 16px 48px rgba(0,0,0,0.4)', overflow: 'hidden', animation: 'scaleIn 0.25s cubic-bezier(0.4, 0, 0.2, 1)' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '20px 24px 0' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: 'var(--md-sys-color-primary-container)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '24px', color: 'var(--md-sys-color-on-primary-container)' }}>lock</span>
          </div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--md-sys-color-on-surface)' }}>{t('sudo.title')}</div>
            <div style={{ fontSize: '13px', color: 'var(--md-sys-color-on-surface-variant)' }}>
              {packageName ? t('sudo.subtitle') + ` - ${packageName}` : t('sudo.subtitle')}
            </div>
          </div>
        </div>
        <div style={{ padding: '16px 24px' }}>
          <p style={{ fontSize: '14px', color: 'var(--md-sys-color-on-surface-variant)', lineHeight: '20px', marginBottom: '16px' }}>
            {t('sudo.description')}
          </p>
          <div style={{ position: 'relative' }}>
            <input type={showPassword ? 'text' : 'password'} value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); if (e.key === 'Escape') onClose(); }}
              placeholder={t('sudo.placeholder')} autoFocus
              style={{ width: '100%', height: '48px', padding: '0 48px 0 16px', fontSize: '15px', fontFamily: "'SF Mono', monospace", backgroundColor: 'var(--md-sys-color-surface-container-lowest)', color: 'var(--md-sys-color-on-surface)', border: `1px solid ${error ? 'var(--md-sys-color-error)' : 'var(--md-sys-color-outline)'}`, borderRadius: '12px', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box', letterSpacing: '2px' }} />
            <button onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '8px', width: '32px', height: '32px', borderRadius: '8px', border: 'none', background: 'transparent', color: 'var(--md-sys-color-on-surface-variant)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontFamily: 'Material Symbols Outlined' }}>
              {showPassword ? 'visibility_off' : 'visibility'}
            </button>
          </div>
          {error && <div style={{ fontSize: '12px', color: 'var(--md-sys-color-error)', marginTop: '8px' }}>{error}</div>}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '8px 24px 20px' }}>
          <button onClick={onClose} disabled={loading} style={{ height: '40px', padding: '0 24px', borderRadius: '20px', border: 'none', backgroundColor: 'transparent', color: 'var(--md-sys-color-on-surface-variant)', fontSize: '14px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
            {t('sudo.cancel')}
          </button>
          <button onClick={handleSubmit} disabled={loading} style={{ height: '40px', padding: '0 24px', borderRadius: '20px', border: 'none', backgroundColor: 'var(--md-sys-color-primary)', color: 'var(--md-sys-color-on-primary)', fontSize: '14px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', opacity: loading ? 0.7 : 1 }}>
            {loading ? t('sudo.authenticating') : t('sudo.authenticate')}
          </button>
        </div>
      </div>
    </div>
  );
}
