import { useUpdates } from '../../hooks/useUpdates';
import { UpdateItem } from './UpdateItem';
import { EmptyState } from '../common/EmptyState';
import { playSound } from '../../utils/sounds';
import { useI18n } from '../../i18n';

export function UpdateList() {
  const { updates, loading, updateAll } = useUpdates();
  const { t } = useI18n();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '64px', color: 'var(--md-sys-color-on-surface-variant)', gap: '8px' }}>
        <span className="material-symbols-outlined" style={{ animation: 'spin 1s linear infinite' }}>progress_activity</span>
        {t('updates.checking')}
      </div>
    );
  }

  if (updates.length === 0) {
    return <EmptyState icon="check_circle" title={t('updates.empty')} description={t('updates.emptyDesc')} />;
  }

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', overflow: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '14px', color: 'var(--md-sys-color-on-surface-variant)' }}>
          {t('updates.available', { count: String(updates.length) })}
        </span>
        <button onClick={() => { playSound('install'); updateAll(); }}
          style={{ height: '40px', padding: '0 24px', borderRadius: '20px', border: 'none', backgroundColor: 'var(--md-sys-color-primary)', color: 'var(--md-sys-color-on-primary)', fontSize: '14px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'inherit' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>system_update</span>
          {t('updates.updateAll')}
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {updates.map((update) => (
          <UpdateItem key={`${update.source}-${update.package_id}`} packageId={update.package_id} name={update.name} source={update.source} currentVersion={update.current_version} newVersion={update.new_version} />
        ))}
      </div>
    </div>
  );
}
