import { useEffect, useRef, useCallback } from 'react';
import type { Package } from '../../types/package';
import { useInstall } from '../../hooks/useInstall';
import { playSound } from '../../utils/sounds';
import { useSudoStore } from '../../hooks/useSudo';
import { useI18n } from '../../i18n';

export function InstallButton({ pkg }: { pkg: Package }) {
  const { install, uninstall, getProgress } = useInstall();
  const op = getProgress(pkg.id);
  const prevState = useRef<string>('');
  const requestSudo = useSudoStore((s) => s.requestSudo);
  const { t } = useI18n();

  const isInstalling = op?.status === 'running' || op?.status === 'pending';
  const isCompleted = op?.status === 'completed';
  const isError = op?.status === 'error';
  const isInstalled = Boolean(pkg.installed_version) || isCompleted;
  const currentState = isInstalling ? 'installing' : isError ? 'error' : isInstalled ? 'installed' : 'available';

  useEffect(() => {
    if (prevState.current !== currentState) {
      if (isInstalling) playSound('install');
      else if (isCompleted && prevState.current === 'installing') playSound('success');
      else if (isError) playSound('error');
      prevState.current = currentState;
    }
  }, [currentState, isInstalling, isCompleted, isError]);

  const handleInstall = useCallback(() => {
    requestSudo(() => install(pkg.id, pkg.source), pkg.name);
  }, [pkg.id, pkg.source, pkg.name, requestSudo, install]);

  const handleUninstall = useCallback(() => {
    requestSudo(() => uninstall(pkg.id, pkg.source), pkg.name);
  }, [pkg.id, pkg.source, pkg.name, requestSudo, uninstall]);

  const progress = op?.progress ?? 0;
  const isUninstalling = op?.action === 'uninstall';

  if (isInstalling) {
    const bgColor = isUninstalling ? '#fca5a5' : '#86efac';
    const fillColor = isUninstalling ? '#ef4444' : '#22c55e';
    const textColor = isUninstalling ? '#7f1d1d' : '#14532d';
    return (
      <div style={{ position: 'relative', height: '36px', minWidth: '120px', borderRadius: '18px', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: '18px', backgroundColor: bgColor, overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundColor: fillColor, opacity: 0.3, width: `${progress}%`, transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }} />
        </div>
        <div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '0 20px', color: textColor }}>
          <span className="material-symbols-outlined" style={{ fontSize: '16px', animation: 'spin 1s linear infinite' }}>
            {isUninstalling ? 'delete' : 'download'}
          </span>
          <span style={{ fontSize: '13px', fontWeight: 500 }}>
            {isUninstalling ? t('install.uninstalling') : t('install.progress')} {Math.round(progress)}%
          </span>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <button onClick={handleInstall} style={{ height: '36px', padding: '0 20px', borderRadius: '18px', border: 'none', backgroundColor: 'var(--md-sys-color-error-container)', color: 'var(--md-sys-color-on-error-container)', fontSize: '13px', fontWeight: 500, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', fontFamily: 'inherit' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>refresh</span>
        {t('updates.retry')}
      </button>
    );
  }

  if (isInstalled) {
    return (
      <button onClick={handleUninstall} style={{ height: '36px', padding: '0 20px', borderRadius: '18px', border: 'none', backgroundColor: 'var(--md-sys-color-error-container)', color: 'var(--md-sys-color-on-error-container)', fontSize: '13px', fontWeight: 500, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', fontFamily: 'inherit' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
        {t('updates.remove')}
      </button>
    );
  }

  return (
    <button onClick={handleInstall} style={{ height: '36px', padding: '0 20px', borderRadius: '18px', border: 'none', backgroundColor: 'var(--md-sys-color-primary)', color: 'var(--md-sys-color-on-primary)', fontSize: '13px', fontWeight: 500, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', fontFamily: 'inherit' }}>
      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>download</span>
      {t('install.btn')}
    </button>
  );
}
