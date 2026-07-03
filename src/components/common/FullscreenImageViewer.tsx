import { useState, useEffect } from 'react';
import { playSound } from '../../utils/sounds';

interface FullscreenImageViewerProps {
  images: string[];
  initialIndex?: number;
  onClose: () => void;
}

export function FullscreenImageViewer({ images, initialIndex = 0, onClose }: FullscreenImageViewerProps) {
  const [current, setCurrent] = useState(initialIndex);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && current > 0) { setCurrent(current - 1); setLoaded(false); playSound('back'); }
      if (e.key === 'ArrowRight' && current < images.length - 1) { setCurrent(current + 1); setLoaded(false); playSound('open'); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [current, images.length, onClose]);

  if (images.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 30000,
        backgroundColor: 'rgba(0, 0, 0, 0.92)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(8px)',
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={(e) => { e.stopPropagation(); playSound('close'); onClose(); }}
        style={{
          position: 'absolute', top: '16px', right: '16px',
          width: '40px', height: '40px', borderRadius: '50%',
          border: 'none', backgroundColor: 'rgba(255,255,255,0.1)',
          color: '#fff', cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          transition: 'background-color 0.2s', zIndex: 1,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'; }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
      </button>

      {/* Image */}
      <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <img
          src={images[current]}
          alt={`Screenshot ${current + 1}`}
          onLoad={() => setLoaded(true)}
          style={{
            maxWidth: '90vw', maxHeight: '80vh', objectFit: 'contain',
            borderRadius: '8px',
            opacity: loaded ? 1 : 0,
            transition: 'opacity 0.3s ease',
          }}
        />
      </div>

      {/* Navigation */}
      {images.length > 1 && (
        <div style={{
          position: 'absolute', bottom: '24px',
          display: 'flex', alignItems: 'center', gap: '16px',
        }}>
          {current > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); setCurrent(current - 1); setLoaded(false); playSound('back'); }}
              style={{
                width: '40px', height: '40px', borderRadius: '50%',
                border: 'none', backgroundColor: 'rgba(255,255,255,0.1)',
                color: '#fff', cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
          )}
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: 500 }}>
            {current + 1} / {images.length}
          </span>
          {current < images.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); setCurrent(current + 1); setLoaded(false); playSound('open'); }}
              style={{
                width: '40px', height: '40px', borderRadius: '50%',
                border: 'none', backgroundColor: 'rgba(255,255,255,0.1)',
                color: '#fff', cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          )}
        </div>
      )}

      {/* Dots */}
      {images.length > 1 && images.length <= 20 && (
        <div style={{
          position: 'absolute', bottom: '64px',
          display: 'flex', gap: '6px',
        }}>
          {images.map((_, i) => (
            <div
              key={i}
              onClick={(e) => { e.stopPropagation(); setCurrent(i); setLoaded(false); playSound('tap'); }}
              style={{
                width: i === current ? '20px' : '6px',
                height: '6px', borderRadius: '3px',
                backgroundColor: i === current ? '#fff' : 'rgba(255,255,255,0.3)',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
