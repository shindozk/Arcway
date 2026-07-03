import { useStaggeredAnimation } from '../../utils/animations';

function Shimmer({ style }: { style?: React.CSSProperties }) {
  return (
    <div style={{
      background: 'linear-gradient(90deg, var(--md-sys-color-surface-container) 25%, var(--md-sys-color-surface-container-high) 50%, var(--md-sys-color-surface-container) 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s infinite',
      borderRadius: '8px',
      ...style,
    }} />
  );
}

function CardSkeleton({ index, animStyle }: { index: number; animStyle: React.CSSProperties }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', padding: '16px',
      borderRadius: '12px', backgroundColor: 'var(--md-sys-color-surface-container-low)',
      border: '1px solid var(--md-sys-color-outline-variant)', gap: '12px',
      height: '180px', ...animStyle,
    }}>
      <div style={{ display: 'flex', gap: '12px' }}>
        <Shimmer style={{ width: '48px', height: '48px', borderRadius: '12px', flexShrink: 0 }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Shimmer style={{ height: '14px', width: `${55 + (index % 3) * 10}%` }} />
          <Shimmer style={{ height: '12px', width: '85%' }} />
        </div>
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <Shimmer style={{ height: '18px', width: '52px', borderRadius: '9px' }} />
        <Shimmer style={{ height: '12px', width: '36px' }} />
      </div>
    </div>
  );
}

function ListItemSkeleton({ animStyle }: { animStyle: React.CSSProperties }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', padding: '12px 16px',
      borderRadius: '12px', backgroundColor: 'var(--md-sys-color-surface-container-low)',
      gap: '14px', height: '60px', ...animStyle,
    }}>
      <Shimmer style={{ width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <Shimmer style={{ height: '13px', width: '50%' }} />
        <Shimmer style={{ height: '11px', width: '70%' }} />
      </div>
      <Shimmer style={{ height: '32px', width: '90px', borderRadius: '16px' }} />
    </div>
  );
}

interface LoadingSkeletonProps {
  viewMode: 'grid' | 'list';
  count?: number;
}

export function LoadingSkeleton({ viewMode, count = 8 }: LoadingSkeletonProps) {
  const { getItemStyle } = useStaggeredAnimation(count, { variant: 'fadeIn', stagger: 60, delay: 0 });

  if (viewMode === 'grid') {
    return (
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: '12px', padding: '24px',
      }}>
        {Array.from({ length: count }).map((_, i) => (
          <CardSkeleton key={i} index={i} animStyle={getItemStyle(i)} />
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', padding: '8px 24px', gap: '4px' }}>
      {Array.from({ length: count }).map((_, i) => (
        <ListItemSkeleton key={i} animStyle={getItemStyle(i)} />
      ))}
    </div>
  );
}

export function HeroSkeleton() {
  return (
    <div style={{
      width: '100%', height: '340px', position: 'relative', overflow: 'hidden',
      backgroundColor: 'var(--md-sys-color-surface-container)',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(90deg, var(--md-sys-color-surface-container) 25%, var(--md-sys-color-surface-container-high) 50%, var(--md-sys-color-surface-container) 75%)',
        backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite',
      }} />
    </div>
  );
}

export function CompactCardSkeleton() {
  return (
    <div style={{
      flexShrink: 0, width: '200px', padding: '14px', borderRadius: '14px',
      backgroundColor: 'var(--md-sys-color-surface-container-low)',
      border: '1px solid var(--md-sys-color-outline-variant)', gap: '10px',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Shimmer style={{ width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0 }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <Shimmer style={{ height: '13px', width: '70%' }} />
          <Shimmer style={{ height: '11px', width: '90%' }} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: '6px' }}>
        <Shimmer style={{ height: '16px', width: '50px', borderRadius: '6px' }} />
        <Shimmer style={{ height: '16px', width: '32px' }} />
      </div>
    </div>
  );
}
