import { useInstalled } from '../hooks/useInstalled';
import { PackageGrid } from '../components/packages/PackageGrid';
import { EmptyState } from '../components/common/EmptyState';
import { AppImageManager } from '../components/appimage/AppImageManager';
import { useAnimateOnMount } from '../utils/animations';
import { useI18n } from '../i18n';

export default function InstalledPage() {
  const { packages, loading } = useInstalled();
  const anim = useAnimateOnMount({ variant: 'fadeIn', duration: 300 });
  const { t } = useI18n();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '64px', color: 'var(--md-sys-color-on-surface-variant)', gap: '8px' }}>
        <span className="material-symbols-outlined" style={{ animation: 'spin 1s linear infinite' }}>progress_activity</span>
        {t('installed.title')}...
      </div>
    );
  }

  return (
    <div style={{ height: '100%', overflow: 'auto', padding: '24px', ...anim.style }}>
      <AppImageManager />
      {packages.length > 0 ? (
        <>
          <span style={{ fontSize: '14px', color: 'var(--md-sys-color-on-surface-variant)', marginBottom: '16px', display: 'block' }}>
            {t('installed.count', { count: String(packages.length) })}
          </span>
          <PackageGrid packages={packages} />
        </>
      ) : (
        <EmptyState icon="download_done" title={t('installed.empty')} description={t('installed.emptyDesc')} />
      )}
    </div>
  );
}
