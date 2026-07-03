import { useState, useEffect } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
  duration: number;
}

let toastId = 0;
let listeners: Array<(toasts: Toast[]) => void> = [];
let toasts: Toast[] = [];

function notifyListeners() {
  listeners.forEach((l) => l([...toasts]));
}

function addToast(message: string, type: ToastType, duration: number) {
  const id = ++toastId;
  const toast = { id, message, type, duration };
  toasts = [...toasts, toast];
  notifyListeners();
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    notifyListeners();
  }, duration);
  return id;
}

export const toast = {
  success: (message: string, duration = 3000) => addToast(message, 'success', duration),
  error: (message: string, duration = 4000) => addToast(message, 'error', duration),
  info: (message: string, duration = 3000) => addToast(message, 'info', duration),
  warning: (message: string, duration = 3500) => addToast(message, 'warning', duration),
};

const ICONS: Record<ToastType, string> = {
  success: 'check_circle',
  error: 'error',
  info: 'info',
  warning: 'warning',
};

const COLORS: Record<ToastType, { bg: string; fg: string; border: string }> = {
  success: { bg: 'var(--md-sys-color-primary-container)', fg: 'var(--md-sys-color-on-primary-container)', border: 'var(--md-sys-color-primary)' },
  error: { bg: 'var(--md-sys-color-error-container)', fg: 'var(--md-sys-color-on-error-container)', border: 'var(--md-sys-color-error)' },
  info: { bg: 'var(--md-sys-color-surface-container-high)', fg: 'var(--md-sys-color-on-surface)', border: 'var(--md-sys-color-outline)' },
  warning: { bg: 'var(--md-sys-color-tertiary-container)', fg: 'var(--md-sys-color-on-tertiary-container)', border: 'var(--md-sys-color-tertiary)' },
};

export function ToastContainer() {
  const [items, setItems] = useState<Toast[]>([]);

  useEffect(() => {
    listeners.push(setItems);
    return () => { listeners = listeners.filter((l) => l !== setItems); };
  }, []);

  if (items.length === 0) return null;

  return (
    <div style={{
      position: 'fixed', bottom: '20px', left: '50%',
      transform: 'translateX(-50%)', zIndex: 30000,
      display: 'flex', flexDirection: 'column-reverse', gap: '8px',
      pointerEvents: 'none', maxWidth: '400px', width: 'calc(100% - 40px)',
    }}>
      {items.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}

function ToastItem({ toast: t }: { toast: Toast }) {
  const [visible, setVisible] = useState(false);
  const colors = COLORS[t.type];

  useEffect(() => {
    const frame = requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: '12px 16px', borderRadius: '12px',
      backgroundColor: colors.bg, color: colors.fg,
      borderLeft: `3px solid ${colors.border}`,
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      fontSize: '13px', fontWeight: 500,
      pointerEvents: 'auto', cursor: 'pointer',
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0) scale(1)' : 'translateY(8px) scale(0.95)',
      transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
    }}
      onClick={() => {
        setVisible(false);
        setTimeout(() => {
          toasts = toasts.filter((tt) => tt.id !== t.id);
          notifyListeners();
        }, 200);
      }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: '18px', flexShrink: 0 }}>
        {ICONS[t.type]}
      </span>
      <span style={{ flex: 1 }}>{t.message}</span>
    </div>
  );
}
