import { useState } from 'react';

interface ImageLoaderProps {
  src: string;
  alt: string;
  style?: React.CSSProperties;
  fallbackIcon?: string;
}

export function ImageLoader({ src, alt, style, fallbackIcon = 'inventory_2' }: ImageLoaderProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  if (error || !src) {
    return (
      <div style={{
        width: '100%', height: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'var(--md-sys-color-surface-container)',
        ...style,
      }}>
        <span className="material-symbols-outlined" style={{
          fontSize: '24px', color: 'var(--md-sys-color-on-surface-variant)',
        }}>
          {fallbackIcon}
        </span>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', ...style }}>
      {/* Shimmer placeholder */}
      {!loaded && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(90deg, var(--md-sys-color-surface-container) 25%, var(--md-sys-color-surface-container-high) 50%, var(--md-sys-color-surface-container) 75%)',
          backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite',
        }} />
      )}
      <img
        src={src}
        alt={alt}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        style={{
          width: '100%', height: '100%', objectFit: 'contain',
          opacity: loaded ? 1 : 0,
          transition: 'opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'block',
        }}
      />
    </div>
  );
}
