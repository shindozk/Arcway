import { useState } from 'react';
import { SourceBadge } from '../packages/SourceBadge';
import { updatePackage as apiUpdatePackage } from '../../api/system';
import { playSound } from '../../utils/sounds';
import { useSudoStore } from '../../hooks/useSudo';
import { useI18n } from '../../i18n';

interface UpdateItemProps {
  packageId: string;
  name: string;
  source: import('../../types/package').PackageSource;
  currentVersion: string;
  newVersion: string;
}

export function UpdateItem({ packageId, name, source, currentVersion, newVersion }: UpdateItemProps) {
  const [status, setStatus] = useState<'idle' | 'updating' | 'done' | 'error'>('idle');
  const requestSudo = useSudoStore((s) => s.requestSudo);
  const { t } = useI18n();

  const handleUpdate = () => {
    if (status === 'updating') return;
    setStatus('updating');
    playSound('install');
    requestSudo(async () => {
      try {
        await apiUpdatePackage(packageId);
        playSound('success');
        setStatus('done');
      } catch {
        playSound('error');
        setStatus('error');
      }
    }, name);
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', padding: '12px 16px', borderRadius: '12px',
      backgroundColor: status === 'done' ? 'rgba(34, 197, 94, 0.08)' : status === 'error' ? 'rgba(239, 68, 68, 0.08)' : 'var(--md-sys-color-surface-container-low)',
      gap: '12px', transition: 'background-color 0.3s',
      border: `1px solid ${status === 'done' ? 'rgba(34, 197, 94, 0.2)' : status === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'var(--md-sys-color-outline-variant)'}`,
    }}>
      <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: status === 'done' ? 'rgba(34, 197, 94, 0.15)' : status === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'var(--md-sys-color-surface-container-high)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {status === 'updating' ? <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--md-sys-color-primary)', animation: 'spin 1s linear infinite' }}>progress_activity</span>
          : status === 'done' ? <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#22c55e' }}>check_circle</span>
          : status === 'error' ? <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#ef4444' }}>error</span>
          : <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--md-sys-color-primary)' }}>system_update</span>}
      </div>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <span style={{ fontSize: '14px', fontWeight: 500, color: status === 'done' ? '#22c55e' : status === 'error' ? '#ef4444' : 'var(--md-sys-color-on-surface)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {status === 'done' ? `${name} updated` : name}
        </span>
        <div style={{ fontSize: '13px', color: 'var(--md-sys-color-on-surface-variant)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>{currentVersion}</span>
          <span style={{ color: 'var(--md-sys-color-primary)', fontWeight: 500 }}>&rarr;</span>
          <span style={{ fontWeight: 500 }}>{newVersion}</span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        <SourceBadge source={source} />
        {status === 'idle' && <button onClick={handleUpdate} style={{ height: '36px', padding: '0 20px', borderRadius: '18px', border: 'none', backgroundColor: 'var(--md-sys-color-primary)', color: 'var(--md-sys-color-on-primary)', fontSize: '13px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'inherit' }}><span className="material-symbols-outlined" style={{ fontSize: '16px' }}>download</span>{t('updates.update')}</button>}
        {status === 'error' && <button onClick={handleUpdate} style={{ height: '36px', padding: '0 16px', borderRadius: '18px', border: 'none', backgroundColor: 'var(--md-sys-color-error-container)', color: 'var(--md-sys-color-on-error-container)', fontSize: '13px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'inherit' }}><span className="material-symbols-outlined" style={{ fontSize: '16px' }}>refresh</span>{t('updates.retry')}</button>}
        {status === 'done' && <span style={{ fontSize: '12px', color: '#22c55e', fontWeight: 500 }}>{t('updates.done')}</span>}
      </div>
    </div>
  );
}
