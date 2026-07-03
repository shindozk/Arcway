import { useState, memo } from 'react';
import type { Package } from '../../types/package';
import { InstallButton } from './InstallButton';
import { useUIStore } from '../../stores/useUIStore';
import { usePackageStore } from '../../stores/usePackageStore';
import { truncate } from '../../utils/format';
import { playSound } from '../../utils/sounds';

export const PackageCard = memo(function PackageCard({ pkg }: { pkg: Package }) {
  const navigate = useUIStore((s) => s.navigate);
  const selectPackage = usePackageStore((s) => s.selectPackage);
  const [hovered, setHovered] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  const hasScreenshot = Boolean(pkg.screenshot_url);

  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column', borderRadius: '14px',
        backgroundColor: 'var(--md-sys-color-surface-container-low)',
        border: `1px solid ${hovered ? 'var(--md-sys-color-outline)' : 'var(--md-sys-color-outline-variant)'}`,
        cursor: 'pointer', height: '100%', overflow: 'hidden',
        transition: 'border-color 0.2s, transform 0.2s, box-shadow 0.2s',
        transform: hovered ? 'translateY(-3px)' : 'none',
        boxShadow: hovered ? '0 8px 24px rgba(0,0,0,0.12)' : 'none',
      }}
      onClick={() => { playSound('click'); selectPackage(pkg); navigate('detail'); }}
      onMouseEnter={() => { playSound('hover'); setHovered(true); }}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Visual area */}
      <div style={{
        position: 'relative', height: '160px', overflow: 'hidden',
        backgroundColor: 'var(--md-sys-color-surface-container)',
      }}>
        {hasScreenshot ? (
          <>
            {!imgLoaded && (
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(90deg, var(--md-sys-color-surface-container) 25%, var(--md-sys-color-surface-container-high) 50%, var(--md-sys-color-surface-container) 75%)',
                backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite',
              }} />
            )}
            <img src={pkg.screenshot_url!} alt="" loading="lazy" decoding="async"
              onLoad={() => setImgLoaded(true)}
              style={{
                width: '100%', height: '100%',
                objectFit: 'cover', objectPosition: 'center top',
                opacity: imgLoaded ? 1 : 0,
                transition: 'opacity 0.3s ease',
              }} />
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, height: '50px',
              background: 'linear-gradient(to bottom, transparent, var(--md-sys-color-surface-container-low))',
              pointerEvents: 'none',
            }} />
          </>
        ) : (
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {pkg.icon_url ? (
              <img src={pkg.icon_url} alt="" loading="lazy" decoding="async"
                style={{
                  width: '64px', height: '64px', objectFit: 'contain',
                  transition: 'transform 0.3s',
                  transform: hovered ? 'scale(1.08)' : 'scale(1)',
                }} />
            ) : (
              <span className="material-symbols-outlined" style={{ fontSize: '36px', color: 'var(--md-sys-color-outline)', opacity: 0.3 }}>
                inventory_2
              </span>
            )}
          </div>
        )}
        <span style={{
          position: 'absolute', top: '8px', right: '8px',
          padding: '2px 7px', borderRadius: '5px',
          backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)',
          fontSize: '9px', fontWeight: 600, color: '#fff',
          textTransform: 'uppercase', letterSpacing: '0.04em',
        }}>
          {pkg.source}
        </span>
      </div>

      {/* Content */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '10px 14px 12px', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {pkg.icon_url && (
            <img src={pkg.icon_url} alt="" loading="lazy" decoding="async"
              style={{ width: '20px', height: '20px', borderRadius: '4px', objectFit: 'contain', flexShrink: 0 }} />
          )}
          <div style={{
            fontSize: '14px', fontWeight: 600, lineHeight: '19px',
            color: 'var(--md-sys-color-on-surface)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0,
          }}>
            {pkg.name}
          </div>
        </div>
        <div style={{
          fontSize: '12px', lineHeight: '16px',
          color: 'var(--md-sys-color-on-surface-variant)',
          display: '-webkit-box', WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical', overflow: 'hidden', flex: 1,
        }}>
          {truncate(pkg.description, 90)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
          {pkg.version && (
            <span style={{ fontSize: '11px', color: 'var(--md-sys-color-outline)' }}>v{pkg.version}</span>
          )}
          <div onClick={(e) => e.stopPropagation()}>
            <InstallButton pkg={pkg} />
          </div>
        </div>
      </div>
    </div>
  );
});
