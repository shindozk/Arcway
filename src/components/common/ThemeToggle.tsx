import { useTheme } from '../../hooks/useTheme';
import { playSound } from '../../utils/sounds';

const styles: Record<string, React.CSSProperties> = {
  toggle: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    cursor: 'pointer',
    userSelect: 'none',
  },
  track: {
    width: '52px',
    height: '32px',
    borderRadius: '16px',
    backgroundColor: 'var(--md-sys-color-surface-container-highest)',
    border: '2px solid var(--md-sys-color-outline)',
    position: 'relative',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    flexShrink: 0,
  },
  trackActive: {
    backgroundColor: 'var(--md-sys-color-primary)',
    borderColor: 'var(--md-sys-color-primary)',
  },
  thumb: {
    width: '16px',
    height: '16px',
    borderRadius: '8px',
    backgroundColor: 'var(--md-sys-color-outline)',
    position: 'absolute',
    top: '50%',
    left: '6px',
    transform: 'translateY(-50%)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  thumbActive: {
    width: '24px',
    height: '24px',
    borderRadius: '12px',
    backgroundColor: 'var(--md-sys-color-on-primary)',
    left: 'calc(100% - 28px)',
  },
  label: {
    fontSize: '14px',
    color: 'var(--md-sys-color-on-surface)',
    fontWeight: 500,
    transition: 'color 0.2s ease',
  },
  icon: {
    fontSize: '20px',
    fontFamily: 'Material Symbols Outlined',
    color: 'var(--md-sys-color-on-surface-variant)',
    transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  },
};

export function ThemeToggle() {
  const { darkMode, toggleDarkMode } = useTheme();

  const handleToggle = () => {
    playSound('toggle');
    toggleDarkMode();
  };

  return (
    <div style={styles.toggle} onClick={handleToggle} role="button" tabIndex={0}>
      <span
        className="material-symbols-outlined"
        style={{
          ...styles.icon,
          transform: darkMode ? 'rotate(180deg)' : 'rotate(0deg)',
        }}
      >
        {darkMode ? 'dark_mode' : 'light_mode'}
      </span>
      <div
        style={{
          ...styles.track,
          ...(darkMode ? styles.trackActive : {}),
        }}
      >
        <div
          style={{
            ...styles.thumb,
            ...(darkMode ? styles.thumbActive : {}),
          }}
        />
      </div>
      <span style={styles.label}>{darkMode ? 'Dark' : 'Light'}</span>
    </div>
  );
}
