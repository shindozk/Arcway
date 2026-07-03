import { usePackageStore } from '../stores/usePackageStore';
import PackageDetail from '../components/packages/PackageDetail';
import { EmptyState } from '../components/common/EmptyState';
import { useAnimateOnMount } from '../utils/animations';
import { useI18n } from '../i18n';

const styles: Record<string, React.CSSProperties> = {
  root: {
    height: '100%',
    overflow: 'auto',
  },
};

export default function PackageDetailPage() {
  const selectedPackage = usePackageStore((s) => s.selectedPackage);
  const anim = useAnimateOnMount({ variant: 'slideRight', duration: 350 });
  const { t } = useI18n();

  if (!selectedPackage) {
    return (
      <div style={styles.root}>
        <EmptyState
          icon="inventory_2"
          title={t('detail.title')}
          description="Select a package to view its details"
        />
      </div>
    );
  }

  return (
    <div style={{ ...styles.root, ...anim.style }}>
      <PackageDetail pkg={selectedPackage} />
    </div>
  );
}
