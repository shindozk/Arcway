import { useState, useEffect, useRef, useCallback } from 'react';

interface UseInfiniteScrollOptions {
  batchSize?: number;
  threshold?: number;
}

export function useInfiniteScroll<T>(
  allItems: T[],
  options: UseInfiniteScrollOptions = {}
) {
  const { batchSize = 60, threshold = 200 } = options;
  const [visibleCount, setVisibleCount] = useState(batchSize);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const visibleItems = allItems.slice(0, visibleCount);
  const hasMore = visibleCount < allItems.length;

  const loadMore = useCallback(() => {
    if (!hasMore || isLoadingMore) return;

    setIsLoadingMore(true);
    // Simulate small delay for smooth UX
    setTimeout(() => {
      setVisibleCount((prev) => Math.min(prev + batchSize, allItems.length));
      setIsLoadingMore(false);
    }, 50);
  }, [hasMore, isLoadingMore, batchSize, allItems.length]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    const container = containerRef.current;
    if (!sentinel || !container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          loadMore();
        }
      },
      {
        root: container,
        rootMargin: `${threshold}px`,
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, loadMore, threshold]);

  // Reset when items change (e.g., search filter)
  useEffect(() => {
    setVisibleCount(batchSize);
  }, [allItems, batchSize]);

  return {
    visibleItems,
    hasMore,
    isLoadingMore,
    sentinelRef,
    containerRef,
    loadMore,
  };
}
