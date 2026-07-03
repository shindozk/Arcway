const styles: Record<string, React.CSSProperties> = {
  linear: {
    width: '100%',
    height: '4px',
    backgroundColor: 'var(--md-sys-color-surface-container-highest)',
    borderRadius: '2px',
    overflow: 'hidden',
  },
  linearBar: {
    height: '100%',
    backgroundColor: 'var(--md-sys-color-primary)',
    borderRadius: '2px',
    transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  linearIndeterminate: {
    height: '100%',
    backgroundColor: 'var(--md-sys-color-primary)',
    borderRadius: '2px',
    width: '40%',
    animation: 'indeterminate 1.5s infinite ease-in-out',
  },
  circular: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};

interface ProgressIndicatorProps {
  value?: number;
  indeterminate?: boolean;
  type?: 'linear' | 'circular';
  size?: number;
}

export function ProgressIndicator({
  value,
  indeterminate = false,
  type = 'linear',
  size = 48,
}: ProgressIndicatorProps) {
  if (type === 'circular') {
    const progress = indeterminate ? 0 : (value ?? 0);
    return (
      <div style={{ ...styles.circular, width: size, height: size }}>
        <svg width={size} height={size} viewBox="0 0 48 48">
          <circle
            cx="24"
            cy="24"
            r="20"
            fill="none"
            stroke="var(--md-sys-color-surface-container-highest)"
            strokeWidth="4"
          />
          <circle
            cx="24"
            cy="24"
            r="20"
            fill="none"
            stroke="var(--md-sys-color-primary)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={`${progress * 1.256} ${125.6 - progress * 1.256}`}
            transform="rotate(-90 24 24)"
            style={{ transition: 'stroke-dasharray 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
          />
          {indeterminate && (
            <circle
              cx="24"
              cy="24"
              r="20"
              fill="none"
              stroke="var(--md-sys-color-primary)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray="31.4 94.2"
              style={{ animation: 'spin 1.5s linear infinite' }}
            />
          )}
        </svg>
      </div>
    );
  }

  return (
    <div style={styles.linear}>
      {indeterminate ? (
        <div style={{ ...styles.linearIndeterminate, animation: 'indeterminate 1.5s infinite ease-in-out, pulseGlow 2s infinite' }} />
      ) : (
        <div
          style={{
            ...styles.linearBar,
            width: `${value ?? 0}%`,
          }}
        />
      )}
    </div>
  );
}
