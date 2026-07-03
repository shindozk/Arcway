import { useEffect, useState } from 'react';
import { useInstallStore } from '../../stores/useInstallStore';
import { playSound } from '../../utils/sounds';

export function InstallProgressPopup() {
  const activeInstalls = useInstallStore((s) => s.activeInstalls);
  const [visible, setVisible] = useState(false);
  const [current, setCurrent] = useState<{ id: string; progress: number; message: string; status: string } | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  // Pick the most relevant install to show
  useEffect(() => {
    const entries = Array.from(activeInstalls.entries()).filter(([id]) => !dismissed.has(id));
    const running = entries.find(([, op]) => op.status === 'running' || op.status === 'pending');
    const errored = entries.find(([, op]) => op.status === 'error');
    const completed = entries.find(([, op]) => op.status === 'completed');

    const pick = running || errored || completed;
    if (pick) {
      const [id, op] = pick;
      setCurrent({ id, progress: op.progress, message: op.message, status: op.status });
      setVisible(true);

      // Play sound on completion
      if (op.status === 'completed') {
        playSound('success');
        setTimeout(() => {
          setVisible(false);
          setDismissed((prev) => new Set(prev).add(id));
        }, 3000);
      } else if (op.status === 'error') {
        playSound('error');
        setTimeout(() => {
          setVisible(false);
          setDismissed((prev) => new Set(prev).add(id));
        }, 4000);
      }
    } else {
      setVisible(false);
    }
  }, [activeInstalls, dismissed]);

  if (!visible || !current) return null;

  const isRunning = current.status === 'running' || current.status === 'pending';
  const isError = current.status === 'error';
  const isComplete = current.status === 'completed';

  const packageName = current.id.split('/').pop() || current.id;

  return (
    <div style={{
      position: 'fixed', bottom: '24px', left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 15000,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      animation: 'slideUp 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '14px',
        padding: '14px 20px', borderRadius: '16px',
        backgroundColor: isError
          ? 'var(--md-sys-color-error-container)'
          : isComplete
            ? 'var(--md-sys-color-primary-container)'
            : 'var(--md-sys-color-surface-container-high)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
        border: `1px solid ${isError ? 'var(--md-sys-color-error)' : isComplete ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-outline-variant)'}`,
        minWidth: '320px', maxWidth: '420px',
        backdropFilter: 'blur(12px)',
      }}>
        {/* Status icon */}
        <div style={{
          width: '36px', height: '36px', borderRadius: '10px',
          backgroundColor: isError
            ? 'var(--md-sys-color-error)'
            : isComplete
              ? 'var(--md-sys-color-primary)'
              : 'var(--md-sys-color-tertiary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {isRunning && (
            <span className="material-symbols-outlined" style={{
              fontSize: '20px', color: '#fff', animation: 'spin 1s linear infinite',
            }}>progress_activity</span>
          )}
          {isComplete && (
            <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#fff' }}>
              check_circle
            </span>
          )}
          {isError && (
            <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#fff' }}>
              error
            </span>
          )}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '13px', fontWeight: 600,
            color: isError ? 'var(--md-sys-color-on-error-container)' : 'var(--md-sys-color-on-surface)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {packageName}
          </div>
          <div style={{
            fontSize: '11px',
            color: isError ? 'var(--md-sys-color-on-error-container)' : 'var(--md-sys-color-outline)',
            marginTop: '2px',
          }}>
            {isError ? current.message : isComplete ? 'Installation complete' : current.message || 'Installing...'}
          </div>
        </div>

        {/* Progress percentage */}
        {isRunning && (
          <span style={{
            fontSize: '14px', fontWeight: 700, color: 'var(--md-sys-color-primary)',
            minWidth: '40px', textAlign: 'right',
          }}>
            {Math.round(current.progress)}%
          </span>
        )}
      </div>

      {/* Progress bar below the card */}
      {isRunning && (
        <div style={{
          width: '320px', maxWidth: '420px', height: '3px',
          backgroundColor: 'var(--md-sys-color-surface-variant)',
          borderRadius: '0 0 8px 8px', overflow: 'hidden', marginTop: '-1px',
        }}>
          <div style={{
            height: '100%',
            backgroundColor: 'var(--md-sys-color-primary)',
            width: `${current.progress}%`,
            transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          }} />
        </div>
      )}
    </div>
  );
}
