import { useState, useEffect, useRef, useMemo, memo, useCallback } from 'react';
import { PackageCard } from '../components/packages/PackageCard';
import { useSearch } from '../hooks/useSearch';
import { useUIStore } from '../stores/useUIStore';
import { usePackageStore } from '../stores/usePackageStore';
import type { Package } from '../types/package';
import { playSound } from '../utils/sounds';
import {
  getFeaturedPackages,
  getTrendingPackages,
  getRecentlyUpdatedPackages,
  getRecentlyAddedPackages,
} from '../api/packages';
import { useI18n } from '../i18n';

const BATCH_SIZE = 18;

type TabId = 'trending' | 'popular' | 'new' | 'updated';

// Fisher-Yates shuffle for randomizing app order
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

const CategoryButton = memo(function CategoryButton({ cat, animStyle }: { cat: { name: string; icon: string; color: string }; animStyle: React.CSSProperties }) {
  const { search } = useSearch();
  const navigate = useUIStore((s) => s.navigate);

  return (
    <button
      style={{
        ...animStyle,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: '8px', padding: '16px 8px', borderRadius: '14px',
        border: '1px solid var(--md-sys-color-outline-variant)',
        backgroundColor: 'var(--md-sys-color-surface-container-low)',
        cursor: 'pointer', fontFamily: 'inherit',
        transition: 'background-color 0.15s, border-color 0.15s, transform 0.15s',
      }}
      onClick={() => { playSound('tap'); search(cat.name); navigate('search'); }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = `${cat.color}12`;
        e.currentTarget.style.borderColor = cat.color;
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--md-sys-color-surface-container-low)';
        e.currentTarget.style.borderColor = 'var(--md-sys-color-outline-variant)';
        e.currentTarget.style.transform = 'none';
      }}
    >
      <div style={{
        width: '40px', height: '40px', borderRadius: '12px',
        backgroundColor: `${cat.color}15`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: '22px', color: cat.color }}>
          {cat.icon}
        </span>
      </div>
      <span style={{
        fontSize: '12px', fontWeight: 500, lineHeight: '16px',
        color: 'var(--md-sys-color-on-surface)', textAlign: 'center',
      }}>
        {cat.name}
      </span>
    </button>
  );
});

const CompactCard = memo(function CompactCard({ pkg }: { pkg: Package }) {
  const navigate = useUIStore((s) => s.navigate);
  const selectPackage = usePackageStore((s) => s.selectPackage);

  return (
    <div
      onClick={() => { playSound('click'); selectPackage(pkg); navigate('detail'); }}
      style={{
        display: 'flex', flexDirection: 'column', gap: '10px',
        padding: '14px', borderRadius: '14px',
        backgroundColor: 'var(--md-sys-color-surface-container-low)',
        border: '1px solid var(--md-sys-color-outline-variant)',
        cursor: 'pointer', height: '100%',
        transition: 'background-color 0.15s, transform 0.15s, box-shadow 0.15s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--md-sys-color-surface-container)';
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--md-sys-color-surface-container-low)';
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '10px',
          backgroundColor: 'var(--md-sys-color-surface-container-high)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, overflow: 'hidden',
        }}>
          {pkg.icon_url ? (
            <img src={pkg.icon_url} alt="" loading="lazy" decoding="async"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          ) : (
            <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--md-sys-color-on-surface-variant)' }}>
              inventory_2
            </span>
          )}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{
            fontSize: '13px', fontWeight: 500, color: 'var(--md-sys-color-on-surface)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {pkg.name}
          </div>
          <div style={{
            fontSize: '11px', color: 'var(--md-sys-color-outline)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {pkg.description.slice(0, 50)}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{
          fontSize: '10px', padding: '2px 8px', borderRadius: '6px',
          backgroundColor: 'var(--md-sys-color-secondary-container)',
          color: 'var(--md-sys-color-on-secondary-container)',
          fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em',
        }}>
          {pkg.source}
        </span>
        {pkg.version && (
          <span style={{ fontSize: '11px', color: 'var(--md-sys-color-outline)' }}>v{pkg.version}</span>
        )}
      </div>
    </div>
  );
});

const CATEGORY_ICONS: Record<string, { icon: string; color: string }> = {
  'Development': { icon: 'code', color: '#6366f1' },
  'System': { icon: 'computer', color: '#8b5cf6' },
  'Graphics': { icon: 'palette', color: '#ec4899' },
  'Audio & Video': { icon: 'music_note', color: '#f43f5e' },
  'Office': { icon: 'description', color: '#f97316' },
  'Internet': { icon: 'language', color: '#3b82f6' },
  'Games': { icon: 'sports_esports', color: '#10b981' },
  'Education': { icon: 'school', color: '#14b8a6' },
  'Science': { icon: 'science', color: '#06b6d4' },
  'Utilities': { icon: 'build', color: '#64748b' },
  'Network': { icon: 'wifi', color: '#0ea5e9' },
  'Security': { icon: 'security', color: '#ef4444' },
};

const CATEGORY_KEYS = [
  'cat.development', 'cat.system', 'cat.graphics', 'cat.audio',
  'cat.office', 'cat.internet', 'cat.games', 'cat.education',
  'cat.science', 'cat.utilities', 'cat.network', 'cat.security',
];

const TABS: { id: TabId; labelKey: string }[] = [
  { id: 'trending', labelKey: 'home.tabTrending' },
  { id: 'popular', labelKey: 'home.tabPopular' },
  { id: 'new', labelKey: 'home.tabNew' },
  { id: 'updated', labelKey: 'home.tabUpdated' },
];

export default function HomePage() {
  const [apps, setApps] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const [activeTab, setActiveTab] = useState<TabId>('trending');
  const [tabLoading, setTabLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const { t } = useI18n();

  const fetchTabData = useCallback(async (tabId: TabId) => {
    setTabLoading(true);
    try {
      let data: Package[];
      switch (tabId) {
        case 'trending':
          data = await getTrendingPackages(60);
          break;
        case 'popular':
          data = await getFeaturedPackages(60);
          break;
        case 'new':
          data = await getRecentlyAddedPackages(60);
          break;
        case 'updated':
          data = await getRecentlyUpdatedPackages(60);
          break;
        default:
          data = await getFeaturedPackages(60);
      }
      // Shuffle the data for randomized positions
      setApps(shuffleArray(data));
      setVisibleCount(BATCH_SIZE);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('home.failed'));
    } finally {
      setTabLoading(false);
      setLoading(false);
    }
  }, [t]);

  // Initial load
  useEffect(() => {
    fetchTabData('trending');
  }, [fetchTabData]);

  // Tab change - only set tabLoading, not full loading to avoid hiding all apps
  const handleTabChange = useCallback((tabId: TabId) => {
    if (tabId === activeTab) return;
    playSound('tap');
    setActiveTab(tabId);
    setTabLoading(true);
    setError(null);
    fetchTabData(tabId);
  }, [activeTab, fetchTabData]);

  // Infinite scroll observer
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || apps.length === 0) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisibleCount((v) => Math.min(v + BATCH_SIZE, apps.length)); },
      { rootMargin: '300px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [apps.length]);

  const topApps = useMemo(() => apps.slice(0, 8), [apps]);
  const visibleApps = useMemo(() => apps.slice(0, visibleCount), [apps, visibleCount]);

  return (
    <div style={{ height: '100%', overflow: 'auto' }}>
      {/* Hero */}
      <div style={{
        position: 'relative', padding: '48px 32px 40px', overflow: 'hidden',
        background: 'linear-gradient(135deg, var(--md-sys-color-primary-container) 0%, var(--md-sys-color-tertiary-container) 50%, var(--md-sys-color-secondary-container) 100%)',
      }}>
        <div style={{ position: 'absolute', top: '-60px', right: '-40px', width: '200px', height: '200px', borderRadius: '50%', backgroundColor: 'var(--md-sys-color-primary)', opacity: 0.08 }} />
        <div style={{ position: 'absolute', bottom: '-40px', left: '10%', width: '120px', height: '120px', borderRadius: '50%', backgroundColor: 'var(--md-sys-color-tertiary)', opacity: 0.06 }} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: '600px' }}>
          <h1 style={{ fontSize: '36px', fontWeight: 700, lineHeight: '42px', color: 'var(--md-sys-color-on-primary-container)', margin: 0, letterSpacing: '-0.5px' }}>
            {t('app.welcome')}<br />{t('app.welcome.line2')}
          </h1>
          <p style={{ fontSize: '15px', lineHeight: '22px', marginTop: '12px', color: 'var(--md-sys-color-on-primary-container)', opacity: 0.7, maxWidth: '400px' }}>
            {t('app.description')}
          </p>
        </div>
      </div>

      {/* Categories */}
      <div style={{ padding: '28px 32px 0' }}>
        <h2 style={{ fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--md-sys-color-outline)', margin: '0 0 16px' }}>
          {t('home.categories')}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px' }}>
          {CATEGORY_KEYS.map((key) => {
            const cat = CATEGORY_ICONS[key.replace('cat.', '')] || { icon: 'category', color: '#666' };
            return <CategoryButton key={key} cat={{ name: t(key), icon: cat.icon, color: cat.color }} animStyle={{}} />;
          })}
        </div>
      </div>

      {/* Featured Apps with Tabs */}
      <div style={{ padding: '32px 32px 0' }}>
        {/* Tab Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', overflowX: 'auto', padding: '4px 0' }}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              style={{
                flexShrink: 0,
                padding: '10px 24px', borderRadius: '12px',
                border: 'none', fontFamily: 'inherit', fontWeight: 600, fontSize: '13px',
                cursor: 'pointer',
                backgroundColor: activeTab === tab.id
                  ? 'var(--md-sys-color-primary)'
                  : 'var(--md-sys-color-surface-container-high)',
                color: activeTab === tab.id
                  ? 'var(--md-sys-color-on-primary)'
                  : 'var(--md-sys-color-on-surface-variant)',
                transition: 'all 0.2s',
                boxShadow: activeTab === tab.id ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
              }}
            >
              {t(tab.labelKey)}
            </button>
          ))}
        </div>

        {/* Featured Apps Grid */}
        {loading || tabLoading ? (
          <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', padding: '4px 0 12px', scrollSnapType: 'x mandatory' }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={{
                flexShrink: 0, width: '200px', scrollSnapAlign: 'start',
                borderRadius: '14px', overflow: 'hidden',
                backgroundColor: 'var(--md-sys-color-surface-container-low)',
                border: '1px solid var(--md-sys-color-outline-variant)',
                animation: 'fadeInUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
                animationDelay: `${i * 80}ms`, opacity: 0,
              }}>
                <div style={{
                  height: '80px',
                  background: 'linear-gradient(90deg, var(--md-sys-color-surface-container) 25%, var(--md-sys-color-surface-container-high) 50%, var(--md-sys-color-surface-container) 75%)',
                  backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite',
                  animationDelay: `${i * 0.1}s`,
                }} />
                <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{
                    height: '13px', borderRadius: '4px', width: '65%',
                    background: 'linear-gradient(90deg, var(--md-sys-color-surface-container) 25%, var(--md-sys-color-surface-container-high) 50%, var(--md-sys-color-surface-container) 75%)',
                    backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite', animationDelay: `${i * 0.1 + 0.1}s`,
                  }} />
                  <div style={{
                    height: '11px', borderRadius: '3px', width: '85%',
                    background: 'linear-gradient(90deg, var(--md-sys-color-surface-container) 25%, var(--md-sys-color-surface-container-high) 50%, var(--md-sys-color-surface-container) 75%)',
                    backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite', animationDelay: `${i * 0.1 + 0.15}s`,
                  }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', padding: '4px 0 12px', scrollSnapType: 'x mandatory' }}>
            {topApps.map((pkg, i) => (
              <div key={pkg.id} style={{
                flexShrink: 0, width: '200px', scrollSnapAlign: 'start',
                animation: 'fadeInUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
                animationDelay: `${i * 60}ms`, opacity: 0,
              }}>
                <CompactCard pkg={pkg} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* All Apps */}
      <div style={{ padding: '24px 32px 32px' }}>
        <h2 style={{ fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--md-sys-color-outline)', margin: '0 0 16px' }}>
          {t('home.allApps')}
        </h2>
        {error ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '48px' }}>
            <span style={{ color: 'var(--md-sys-color-error)', fontSize: '14px' }}>{error}</span>
            <button onClick={() => window.location.reload()} style={{ padding: '8px 24px', borderRadius: '20px', border: 'none', backgroundColor: 'var(--md-sys-color-primary)', color: 'var(--md-sys-color-on-primary)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '14px' }}>
              {t('home.retry')}
            </button>
          </div>
        ) : loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ borderRadius: '14px', overflow: 'hidden', backgroundColor: 'var(--md-sys-color-surface-container-low)', border: '1px solid var(--md-sys-color-outline-variant)' }}>
                <div style={{ height: '100px', animation: 'pulse 1.5s ease-in-out infinite', animationDelay: `${i * 0.08}s`, background: 'linear-gradient(90deg, var(--md-sys-color-surface-container) 25%, var(--md-sys-color-surface-container-high) 50%, var(--md-sys-color-surface-container) 75%)', backgroundSize: '200% 100%' }} />
                <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ height: '14px', borderRadius: '4px', width: '60%', background: 'linear-gradient(90deg, var(--md-sys-color-surface-container) 25%, var(--md-sys-color-surface-container-high) 50%, var(--md-sys-color-surface-container) 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
                  <div style={{ height: '12px', borderRadius: '3px', width: '80%', background: 'linear-gradient(90deg, var(--md-sys-color-surface-container) 25%, var(--md-sys-color-surface-container-high) 50%, var(--md-sys-color-surface-container) 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite', animationDelay: '0.1s' }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
              {visibleApps.map((pkg) => (
                <PackageCard key={`${pkg.source}-${pkg.id}`} pkg={pkg} />
              ))}
            </div>
            <div ref={sentinelRef} style={{ height: '1px' }} />
            {visibleCount < apps.length && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '24px', color: 'var(--md-sys-color-outline)', fontSize: '13px', gap: '8px', alignItems: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px', animation: 'spin 1s linear infinite' }}>progress_activity</span>
                {t('home.loadingMore')}
              </div>
            )}
            {visibleCount >= apps.length && apps.length > 0 && (
              <div style={{ textAlign: 'center', padding: '16px', fontSize: '12px', color: 'var(--md-sys-color-outline)' }}>
                {t('home.allLoaded', { count: String(apps.length) })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
