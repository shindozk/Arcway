import type { Package } from '../../types/package';
import { SourceBadge } from './SourceBadge';
import { InstallButton } from './InstallButton';
import { useUIStore } from '../../stores/useUIStore';
import { usePackageStore } from '../../stores/usePackageStore';
import { playSound } from '../../utils/sounds';
import { useAnimateOnMount } from '../../utils/animations';

const styles: Record<string, React.CSSProperties> = {
  item: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    borderRadius: '12px',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
    gap: '16px',
  },
  iconWrapper: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    backgroundColor: 'var(--md-sys-color-surface-container-high)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    overflow: 'hidden',
    transition: 'transform 0.2s ease',
  },
  icon: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
  fallbackIcon: {
    fontSize: '20px',
    color: 'var(--md-sys-color-on-surface-variant)',
    fontFamily: 'Material Symbols Outlined',
  },
  info: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  topRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  name: {
    fontSize: '14px',
    fontWeight: 500,
    color: 'var(--md-sys-color-on-surface)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  description: {
    fontSize: '13px',
    color: 'var(--md-sys-color-on-surface-variant)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexShrink: 0,
  },
  version: {
    fontSize: '12px',
    color: 'var(--md-sys-color-outline)',
  },
};

export function PackageListItem({ pkg, animStyle }: { pkg: Package; animStyle?: React.CSSProperties }) {
  const navigate = useUIStore((s) => s.navigate);
  const selectPackage = usePackageStore((s) => s.selectPackage);
  const mountAnim = useAnimateOnMount({ variant: 'slideLeft', duration: 300 });

  const handleClick = () => {
    playSound('click');
    selectPackage(pkg);
    navigate('detail');
  };

  return (
    <div
      className="hover-lift"
      style={{ ...styles.item, ...mountAnim.style, ...animStyle }}
      onClick={handleClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--md-sys-color-surface-container)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      <div style={styles.iconWrapper}>
        {pkg.icon_url ? (
          <img src={pkg.icon_url} alt="" style={styles.icon} />
        ) : (
          <span className="material-symbols-outlined" style={styles.fallbackIcon}>
            inventory_2
          </span>
        )}
      </div>

      <div style={styles.info}>
        <div style={styles.topRow}>
          <span style={styles.name}>{pkg.name}</span>
          <SourceBadge source={pkg.source} />
        </div>
        <div style={styles.description}>{pkg.description}</div>
      </div>

      <div style={styles.right}>
        <span style={styles.version}>v{pkg.version}</span>
        <div onClick={(e) => e.stopPropagation()}>
          <InstallButton pkg={pkg} />
        </div>
      </div>
    </div>
  );
}
