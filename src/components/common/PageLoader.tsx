import { useAnimateOnMount } from '../../utils/animations';

export function PageLoader() {
  const anim = useAnimateOnMount({ variant: 'fadeIn', duration: 300 });

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      gap: '20px', padding: '24px', ...anim.style,
    }}>
      {/* Title skeleton */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{
          width: '40%', height: '24px', borderRadius: '6px',
          background: 'linear-gradient(90deg, var(--md-sys-color-surface-container) 25%, var(--md-sys-color-surface-container-high) 50%, var(--md-sys-color-surface-container) 75%)',
          backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite',
        }} />
        <div style={{
          width: '60%', height: '14px', borderRadius: '4px',
          background: 'linear-gradient(90deg, var(--md-sys-color-surface-container) 25%, var(--md-sys-color-surface-container-high) 50%, var(--md-sys-color-surface-container) 75%)',
          backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite',
          animationDelay: '0.1s',
        }} />
      </div>

      {/* Content skeleton — cards grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: '12px', flex: 1,
      }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{
            borderRadius: '14px', overflow: 'hidden',
            backgroundColor: 'var(--md-sys-color-surface-container-low)',
            border: '1px solid var(--md-sys-color-outline-variant)',
          }}>
            {/* Image area */}
            <div style={{
              height: '160px',
              background: 'linear-gradient(90deg, var(--md-sys-color-surface-container) 25%, var(--md-sys-color-surface-container-high) 50%, var(--md-sys-color-surface-container) 75%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.5s infinite',
              animationDelay: `${i * 0.08}s`,
            }} />
            {/* Text lines */}
            <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{
                width: `${50 + (i % 3) * 15}%`, height: '16px', borderRadius: '4px',
                background: 'linear-gradient(90deg, var(--md-sys-color-surface-container) 25%, var(--md-sys-color-surface-container-high) 50%, var(--md-sys-color-surface-container) 75%)',
                backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite',
                animationDelay: `${i * 0.08 + 0.15}s`,
              }} />
              <div style={{
                width: '80%', height: '12px', borderRadius: '3px',
                background: 'linear-gradient(90deg, var(--md-sys-color-surface-container) 25%, var(--md-sys-color-surface-container-high) 50%, var(--md-sys-color-surface-container) 75%)',
                backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite',
                animationDelay: `${i * 0.08 + 0.2}s`,
              }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <div style={{
                  width: '50px', height: '14px', borderRadius: '4px',
                  background: 'linear-gradient(90deg, var(--md-sys-color-surface-container) 25%, var(--md-sys-color-surface-container-high) 50%, var(--md-sys-color-surface-container) 75%)',
                  backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite',
                  animationDelay: `${i * 0.08 + 0.25}s`,
                }} />
                <div style={{
                  width: '80px', height: '32px', borderRadius: '16px',
                  background: 'linear-gradient(90deg, var(--md-sys-color-surface-container) 25%, var(--md-sys-color-surface-container-high) 50%, var(--md-sys-color-surface-container) 75%)',
                  backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite',
                  animationDelay: `${i * 0.08 + 0.3}s`,
                }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
