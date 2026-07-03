import type { PackageSource } from '../../types/package';
import { SOURCE_COLORS, SOURCE_LABELS } from '../../utils/constants';
import { useAnimateOnMount } from '../../utils/animations';

const styles: Record<string, React.CSSProperties> = {
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 8px',
    borderRadius: '9999px',
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.02em',
    lineHeight: '16px',
    whiteSpace: 'nowrap',
    transition: 'background-color 0.2s ease, color 0.2s ease, transform 0.15s ease',
  },
};

export function SourceBadge({ source }: { source: PackageSource }) {
  const color = SOURCE_COLORS[source];
  const label = SOURCE_LABELS[source];
  const anim = useAnimateOnMount({ variant: 'popIn', duration: 200 });

  return (
    <span
      style={{
        ...styles.badge,
        backgroundColor: `${color}20`,
        color: color,
        ...anim.style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = `${color}35`;
        e.currentTarget.style.transform = 'scale(1.05)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = `${color}20`;
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      {label}
    </span>
  );
}
