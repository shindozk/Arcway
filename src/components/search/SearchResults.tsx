import type { Package } from '../../types/package';
import { PackageGrid } from '../packages/PackageGrid';
import { PackageListItem } from '../packages/PackageListItem';
import { EmptyState } from '../common/EmptyState';
import { LoadingSkeleton } from '../common/LoadingSkeleton';
import { useUIStore } from '../../stores/useUIStore';
import { useAnimateOnMount } from '../../utils/animations';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';
import { useI18n } from '../../i18n';

interface SearchResultsProps {
  results: Package[];
  loading: boolean;
  query: string;
}

export function SearchResults({ results, loading, query }: SearchResultsProps) {
  const viewMode = useUIStore((s) => s.viewMode);
  const anim = useAnimateOnMount({ variant: 'fadeIn', duration: 300 });
  const { t } = useI18n();

  const {
    visibleItems,
    hasMore,
    isLoadingMore,
    sentinelRef,
  } = useInfiniteScroll(results, { batchSize: 30, threshold: 300 });

  if (loading) {
    return <LoadingSkeleton viewMode={viewMode} />;
  }

  if (!query.trim()) {
    return (
      <EmptyState
        icon="search"
        title={t('search.placeholder').replace('...', '')}
        description="Type to search across Flatpak, AUR, and Paru"
      />
    );
  }

  if (results.length === 0) {
    return (
      <EmptyState
        icon="search_off"
        title={t('search.noResults')}
        description={`${t('search.noResults')} "${query}"`}
      />
    );
  }

  return (
    <div style={anim.style}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 24px 0' }}>
        <span style={{ fontSize: '14px', color: 'var(--md-sys-color-on-surface-variant)' }}>
          {t('search.results', { count: String(results.length) })}
        </span>
      </div>

      {viewMode === 'grid' ? (
        <PackageGrid packages={visibleItems} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', padding: '8px 24px', gap: '4px' }} className="stagger-children">
          {visibleItems.map((pkg) => (
            <PackageListItem key={`${pkg.source}-${pkg.id}`} pkg={pkg} />
          ))}
        </div>
      )}

      <div ref={sentinelRef} style={{ height: '1px' }} />

      {isLoadingMore && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '16px', color: 'var(--md-sys-color-outline)', fontSize: '13px', gap: '8px', alignItems: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '16px', animation: 'spin 1s linear infinite' }}>progress_activity</span>
          {t('home.loadingMore')}
        </div>
      )}

      {!hasMore && results.length > 0 && (
        <div style={{ textAlign: 'center', padding: '12px', fontSize: '12px', color: 'var(--md-sys-color-outline)' }}>
          {t('home.allLoaded', { count: String(results.length) })}
        </div>
      )}
    </div>
  );
}
