import { useEffect } from 'react';
import { playSound } from '../../utils/sounds';
import { useAnimateOnMount } from '../../utils/animations';
import { useI18n } from '../../i18n';

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
    backgroundColor: 'var(--md-sys-color-error-container)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '8px',
    animation: 'shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) both',
  },
  icon: {
    fontSize: '40px',
    color: 'var(--md-sys-color-on-error-container)',
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
  retryBtn: {
    height: '40px',
    padding: '0 24px',
    borderRadius: '20px',
    border: 'none',
    backgroundColor: 'var(--md-sys-color-primary)',
    color: 'var(--md-sys-color-on-primary)',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '8px',
    fontFamily: 'inherit',
    transition: 'transform 0.15s ease',
  },
};

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title,
  description,
  onRetry,
}: ErrorStateProps) {
  const anim = useAnimateOnMount({ variant: 'scaleIn', duration: 350 });
  const { t } = useI18n();
  const finalTitle = title || t('error');
  const finalDesc = description || t('error');

  useEffect(() => {
    playSound('error');
  }, []);

  return (
    <div style={{ ...styles.root, ...anim.style }}>
      <div style={styles.iconWrapper}>
        <span className="material-symbols-outlined" style={styles.icon}>
          error
        </span>
      </div>
      <h3 style={styles.title}>{finalTitle}</h3>
      <p style={styles.description}>{finalDesc}</p>
      {onRetry && (
        <button
          style={styles.retryBtn}
          onClick={onRetry}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
            refresh
          </span>
          {t('retry')}
        </button>
      )}
    </div>
  );
}
