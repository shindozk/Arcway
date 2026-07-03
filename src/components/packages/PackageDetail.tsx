import { useState, useEffect } from 'react';
import type { Package } from '../../types/package';
import { PackageSource } from '../../types/package';
import { SourceBadge } from './SourceBadge';
import { InstallButton } from './InstallButton';
import { FullscreenImageViewer } from '../common/FullscreenImageViewer';
import { RatingSystem } from '../common/RatingSystem';
import { CommentsSystem } from '../common/CommentsSystem';
import { useAnimateOnMount, useStaggeredAnimation } from '../../utils/animations';
import { getFlathubDetail } from '../../api/packages';
import { useI18n } from '../../i18n';
import { createLogger } from '../../utils/logger';
import { playSound } from '../../utils/sounds';

const log = createLogger('detail');

function getScreenshotSrc(s: { sizes?: Array<{ src: string; width: string }> } | undefined): string | null {
  const sizes = s?.sizes;
  if (!sizes || sizes.length === 0) return null;
  const sorted = [...sizes].sort((a, b) => parseInt(b.width) - parseInt(a.width));
  return sorted[0]?.src || null;
}

function getSmallScreenshotSrc(s: { sizes?: Array<{ src: string; width: string }> } | undefined): string | null {
  const sizes = s?.sizes;
  if (!sizes || sizes.length === 0) return null;
  const sorted = [...sizes].sort((a, b) => parseInt(a.width) - parseInt(b.width));
  return sorted[0]?.src || null;
}

interface FlathubDetail {
  name?: string; summary?: string; description?: string; icon?: string;
  developer_name?: string; homepage?: string; project_license?: string;
  categories?: string[]; keywords?: string[]; type?: string; isMobileFriendly?: boolean;
  screenshots?: Array<{ caption?: string; sizes?: Array<{ src: string; width: string }> }>;
  releases?: Array<{ version?: string }>;
  urls?: { homepage?: string; bugtracker?: string };
}

export default function PackageDetail({ pkg }: { pkg: Package }) {
  const [flathubDetail, setFlathubDetail] = useState<FlathubDetail | null>(null);
  const [_loadingDetail, setLoadingDetail] = useState(true);
  const [selectedSource, setSelectedSource] = useState<PackageSource>(pkg.source);
  const [heroLoaded, setHeroLoaded] = useState(false);
  const [fullscreenIndex, setFullscreenIndex] = useState<number | null>(null);
  const headerAnim = useAnimateOnMount({ variant: 'fadeIn', duration: 500, delay: 200 });
  const detailsAnim = useAnimateOnMount({ variant: 'slideUp', duration: 400, delay: 300 });
  const { getItemStyle } = useStaggeredAnimation(8, { variant: 'fadeIn', stagger: 50, delay: 350 });
  const { t } = useI18n();

  const appId = pkg.id.replace(/^(flatpak|yay|paru)\//, '');

  useEffect(() => {
    const loadDetail = async () => {
      setLoadingDetail(true);
      try {
        const data = await getFlathubDetail(appId);
        setFlathubDetail(data as unknown as FlathubDetail);
      } catch (err) { log.warn(`Flathub detail failed: ${err}`); } finally { setLoadingDetail(false); }
    };
    loadDetail();
  }, [appId]);

  const detail = flathubDetail;
  const screenshots = detail?.screenshots || [];
  const allScreenshotSrcs = screenshots.map((s) => getScreenshotSrc(s)).filter((s): s is string => s !== null);
  const remainingScreenshots = screenshots.slice(1);
  const version = detail?.releases?.[0]?.version || pkg.version;
  const homepage = detail?.urls?.homepage || pkg.homepage;
  const developer = detail?.developer_name;
  const license_ = detail?.project_license || pkg.license;
  const categories = detail?.categories || [];
  const keywords = detail?.keywords || [];
  const description = detail?.description || pkg.description;
  const iconUrl = detail?.icon || pkg.icon_url;
  const heroSrc = getScreenshotSrc(screenshots[0]);

  return (
    <div style={{ height: '100%', overflow: 'auto' }}>
      {/* Hero */}
      <div style={{ position: 'relative', width: '100vw', marginLeft: 'calc(-50vw + 50%)', height: heroLoaded ? '320px' : '260px', overflow: 'hidden', backgroundColor: 'var(--md-sys-color-surface)', transition: 'height 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}>
        {heroSrc && (
          <img src={heroSrc} alt={`${pkg.name} screenshot`} onLoad={() => setHeroLoaded(true)}
            onClick={() => { playSound('open'); setFullscreenIndex(0); }}
            style={{ position: 'absolute', top: heroLoaded ? '-50%' : '0%', left: '0', width: '100%', objectFit: 'cover', objectPosition: 'center top', cursor: 'pointer', opacity: heroLoaded ? 1 : 0, transform: heroLoaded ? 'none' : 'scale(0.9)', transition: 'all 1s cubic-bezier(0.4, 0, 0.2, 1)' }} />
        )}
        <div style={{ position: 'absolute', inset: 0, zIndex: 1, background: 'linear-gradient(to bottom, transparent 0%, transparent 30%, rgba(0,0,0,0.3) 70%, var(--md-sys-color-surface) 100%)', pointerEvents: 'none' }} />
        {!heroSrc && <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ width: '100px', height: '100px', borderRadius: '22px', backgroundColor: 'var(--md-sys-color-surface-container-high)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--md-sys-color-outline-variant)' }}>{iconUrl ? <img src={iconUrl} alt={pkg.name} style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '22px' }} /> : <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--md-sys-color-on-surface-variant)' }}>inventory_2</span>}</div></div>}
      </div>

      {/* Content */}
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '0 32px 32px', display: 'flex', flexDirection: 'column', gap: '28px', marginTop: '-40px', position: 'relative', zIndex: 3 }}>
        {/* Header */}
        <div style={{ ...headerAnim.style, display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '18px', backgroundColor: 'var(--md-sys-color-surface-container-high)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden', border: '2px solid var(--md-sys-color-surface)', boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}>
            {iconUrl ? <img src={iconUrl} alt={pkg.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <span className="material-symbols-outlined" style={{ fontSize: '40px', color: 'var(--md-sys-color-on-surface-variant)' }}>inventory_2</span>}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: '26px', fontWeight: 600, lineHeight: '32px', color: 'var(--md-sys-color-on-surface)', margin: 0 }}>{pkg.name}</h1>
            {developer && <span style={{ fontSize: '13px', color: 'var(--md-sys-color-outline)' }}>{developer}</span>}
            <p style={{ fontSize: '14px', color: 'var(--md-sys-color-on-surface-variant)', lineHeight: '20px', margin: '6px 0 0' }}>{detail?.summary || pkg.description}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px', fontSize: '12px', color: 'var(--md-sys-color-outline)', flexWrap: 'wrap' }}>
              {version && <span>v{version}</span>}
              {license_ && <span>{license_}</span>}
              {categories.length > 0 && <span>{categories.join(' · ')}</span>}
            </div>
          </div>
        </div>

        {/* Install bar */}
        <div style={{ ...detailsAnim.style, display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', padding: '8px 0' }}>
          <SourceSelector selected={selectedSource} onSelect={setSelectedSource} />
          <InstallButton pkg={{ ...pkg, source: selectedSource }} />
          {homepage && <a href={homepage} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--md-sys-color-primary)', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}><span className="material-symbols-outlined" style={{ fontSize: '16px' }}>open_in_new</span>{t('detail.homepage')}</a>}
          {detail?.urls?.bugtracker && <a href={detail.urls.bugtracker} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--md-sys-color-primary)', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}><span className="material-symbols-outlined" style={{ fontSize: '16px' }}>bug_report</span>{t('detail.reportIssue')}</a>}
        </div>

        {/* Screenshots */}
        {remainingScreenshots.length > 0 && (
          <>
            <div style={{ height: '1px', backgroundColor: 'var(--md-sys-color-outline-variant)', width: '100%' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--md-sys-color-on-surface)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>{t('detail.screenshots')}</h3>
              <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', padding: '4px 0', scrollSnapType: 'x mandatory' }}>
                {remainingScreenshots.map((s, i) => {
                  const src = getSmallScreenshotSrc(s);
                  if (!src) return null;
                  return (
                    <div key={i} style={{ flexShrink: 0, borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--md-sys-color-outline-variant)', scrollSnapAlign: 'start', backgroundColor: 'var(--md-sys-color-surface-container)', cursor: 'pointer' }}
                      onClick={() => { playSound('open'); setFullscreenIndex(i + 1); }}>
                      <img src={src} alt={s.caption || ''} style={{ display: 'block', height: '200px', width: 'auto', objectFit: 'contain' }} loading="lazy" />
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* About */}
        {description && (
          <>
            <div style={{ height: '1px', backgroundColor: 'var(--md-sys-color-outline-variant)', width: '100%' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--md-sys-color-on-surface)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>{t('detail.about')}</h3>
              <p style={{ fontSize: '14px', color: 'var(--md-sys-color-on-surface-variant)', lineHeight: '22px', whiteSpace: 'pre-wrap', margin: 0 }}>{description}</p>
            </div>
          </>
        )}

        {/* Information */}
        <div style={{ height: '1px', backgroundColor: 'var(--md-sys-color-outline-variant)', width: '100%' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--md-sys-color-on-surface)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>{t('detail.information')}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
            <InfoItem label={t('detail.source')} value={<SourceBadge source={selectedSource} />} anim={getItemStyle(0)} />
            <InfoItem label={t('detail.version')} value={version || '—'} anim={getItemStyle(1)} />
            <InfoItem label={t('detail.license')} value={license_ || '—'} anim={getItemStyle(2)} />
            {developer && <InfoItem label={t('detail.developer')} value={developer} anim={getItemStyle(3)} />}
            <InfoItem label={t('detail.packageId')} value={pkg.id} anim={getItemStyle(4)} mono />
            {detail?.type && <InfoItem label={t('detail.type')} value={detail.type} anim={getItemStyle(5)} />}
            {detail?.isMobileFriendly !== undefined && <InfoItem label={t('detail.mobile')} value={detail.isMobileFriendly ? 'Yes' : 'No'} anim={getItemStyle(6)} />}
          </div>
        </div>

        {/* Keywords */}
        {keywords.length > 0 && (
          <>
            <div style={{ height: '1px', backgroundColor: 'var(--md-sys-color-outline-variant)', width: '100%' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--md-sys-color-on-surface)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>{t('detail.keywords')}</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {keywords.map((kw) => <span key={kw} style={{ padding: '4px 12px', borderRadius: '9999px', fontSize: '12px', fontWeight: 500, backgroundColor: 'var(--md-sys-color-surface-container-high)', color: 'var(--md-sys-color-on-surface-variant)' }}>{kw}</span>)}
              </div>
            </div>
          </>
        )}

        {/* Rating */}
        <div style={{ height: '1px', backgroundColor: 'var(--md-sys-color-outline-variant)', width: '100%' }} />
        <RatingSystem packageId={pkg.id} />

        {/* Comments */}
        <CommentsSystem packageId={pkg.id} />
      </div>

      {/* Fullscreen viewer */}
      {fullscreenIndex !== null && <FullscreenImageViewer images={allScreenshotSrcs} initialIndex={fullscreenIndex} onClose={() => setFullscreenIndex(null)} />}
    </div>
  );
}

function SourceSelector({ selected, onSelect }: { selected: PackageSource; onSelect: (s: PackageSource) => void }) {
  const { t } = useI18n();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ fontSize: '13px', color: 'var(--md-sys-color-on-surface-variant)', fontWeight: 500 }}>{t('detail.installVia')}</span>
      <select value={selected} onChange={(e) => onSelect(e.target.value as PackageSource)} style={{ height: '40px', padding: '0 32px 0 12px', borderRadius: '10px', border: '1px solid var(--md-sys-color-outline)', backgroundColor: 'var(--md-sys-color-surface-container)', color: 'var(--md-sys-color-on-surface)', fontSize: '13px', fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer', outline: 'none', appearance: 'none' as const, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='%23737373'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', transition: 'border-color 0.2s' }} onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--md-sys-color-primary)'; }} onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--md-sys-color-outline)'; }}>
        <option value={PackageSource.Flatpak}>Flatpak</option>
        <option value={PackageSource.Yay}>AUR (yay)</option>
        <option value={PackageSource.Paru}>AUR (paru)</option>
      </select>
    </div>
  );
}

function InfoItem({ label, value, anim, mono }: { label: string; value: React.ReactNode; anim?: React.CSSProperties; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', ...anim }}>
      <span style={{ fontSize: '11px', color: 'var(--md-sys-color-outline)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
      <span style={{ fontSize: '13px', color: 'var(--md-sys-color-on-surface)', fontFamily: mono ? 'monospace' : 'inherit', wordBreak: 'break-all' }}>{value}</span>
    </div>
  );
}
