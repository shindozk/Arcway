import type { Package } from '../../types/package';
import { PackageCard } from './PackageCard';

const styles: Record<string, React.CSSProperties> = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: '16px',
  },
};

export function PackageGrid({ packages }: { packages: Package[] }) {
  return (
    <div style={styles.grid} className="stagger-children">
      {packages.map((pkg) => (
        <PackageCard key={`${pkg.source}-${pkg.id}`} pkg={pkg} />
      ))}
    </div>
  );
}
