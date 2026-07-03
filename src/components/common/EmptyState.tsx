import { useAnimateOnMount } from '../../utils/animations';

const styles: Record<string, React.CSSProperties> = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '64px 24px',
    gap: '16px',
    textAlign: 'center',
  },
  iconWrapper: {
    width: '80px',
    height: '80px',
    borderRadius: '40px',
    backgroundColor: 'var(--md-sys-color-surface-container-high)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '8px',
    animation: 'breathe 3s ease-in-out infinite',
  },
  icon: {
    fontSize: '40px',
    color: 'var(--md-sys-color-on-surface-variant)',
    fontFamily: 'Material Symbols Outlined',
  },
  title: {
    fontSize: '18px',
    fontWeight: 500,
    color: 'var(--md-sys-color-on-surface)',
    lineHeight: '24px',
  },
  description: {
    fontSize: '14px',
    color: 'var(--md-sys-color-on-surface-variant)',
    lineHeight: '20px',
    maxWidth: '320px',
  },
};

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
}

export function EmptyState({ icon, title, description }: EmptyStateProps) {
  const anim = useAnimateOnMount({ variant: 'scaleIn', duration: 350 });

  return (
    <div style={{ ...styles.root, ...anim.style }}>
      <div style={styles.iconWrapper}>
        <span className="material-symbols-outlined" style={styles.icon}>
          {icon}
        </span>
      </div>
      <h3 style={styles.title}>{title}</h3>
      <p style={styles.description}>{description}</p>
    </div>
  );
}
