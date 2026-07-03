import { useState, useEffect, useCallback } from 'react';
import { useAnimateOnMount } from '../../utils/animations';
import { useAuthStore } from '../../stores/useAuthStore';
import { useI18n } from '../../i18n';
import { createLogger } from '../../utils/logger';
import { playSound } from '../../utils/sounds';
import * as supabaseApi from '../../api/supabase';
import type { Rating, RatingStats } from '../../api/supabase';
import { toast } from './Toast';

const log = createLogger('rating');

interface RatingSystemProps {
  packageId: string;
}

export function RatingSystem({ packageId }: RatingSystemProps) {
  const [userRating, setUserRating] = useState<Rating | null>(null);
  const [stats, setStats] = useState<RatingStats>({ average: 0, count: 0, distribution: [0, 0, 0, 0, 0] });
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const { user, isAuthenticated } = useAuthStore();
  const { t } = useI18n();
  const anim = useAnimateOnMount({ variant: 'fadeIn', duration: 400 });

  const loadRating = useCallback(async () => {
    try {
      const [ratingData, statsData] = await Promise.all([
        user ? supabaseApi.getUserRating(packageId) : Promise.resolve(null),
        supabaseApi.getRatingStats(packageId),
      ]);
      setUserRating(ratingData);
      setStats(statsData);
    } catch (err) {
      log.warn(`Failed to load rating: ${err}`);
    }
  }, [packageId, user?.id]);

  useEffect(() => {
    loadRating();
    // Poll for updates every 30s (replaces real-time subscription)
    const interval = setInterval(loadRating, 30000);
    return () => clearInterval(interval);
  }, [packageId, loadRating]);

  const handleRate = async (score: number) => {
    if (saving || !user) return;

    setSaving(true);
    try {
      await supabaseApi.setRating(packageId, score);
      playSound('select');
      toast.success(t('rating.thanks'));
      log.info(`Rated ${packageId}: ${score}/5`);
    } catch (err) {
      log.error(`Failed to rate: ${err}`);
      toast.error(t('rating.failed'));
    } finally {
      setSaving(false);
    }
  };

  const displayStar = hoveredStar ?? userRating?.score ?? 0;
  const maxStars = 5;

  return (
    <div style={{
      ...anim.style,
      display: 'flex', flexDirection: 'column', gap: '16px',
      padding: '20px', borderRadius: '16px',
      backgroundColor: 'var(--md-sys-color-surface-container-low)',
      border: '1px solid var(--md-sys-color-outline-variant)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--md-sys-color-primary)' }}>
          star
        </span>
        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--md-sys-color-on-surface)' }}>
          {t('rating.title')}
        </span>
      </div>

      {/* Main Content */}
      <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Average Score */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <span style={{
            fontSize: '48px', fontWeight: 700,
            color: stats.average > 0 ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-outline)',
            lineHeight: 1,
          }}>
            {stats.average > 0 ? stats.average.toFixed(1) : '—'}
          </span>
          <span style={{ fontSize: '12px', color: 'var(--md-sys-color-outline)' }}>
            {stats.count} {stats.count === 1 ? t('rating.rating') : t('rating.ratings')}
          </span>
        </div>

        {/* Distribution Bar */}
        <div style={{ flex: 1, minWidth: '200px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {[5, 4, 3, 2, 1].map((star) => {
            const count = stats.distribution[star - 1];
            const percentage = stats.count > 0 ? (count / stats.count) * 100 : 0;

            return (
              <div key={star} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--md-sys-color-outline)', minWidth: '12px' }}>
                  {star}
                </span>
                <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--md-sys-color-primary)' }}>
                  star
                </span>
                <div style={{
                  flex: 1, height: '8px', borderRadius: '4px',
                  backgroundColor: 'var(--md-sys-color-surface-container-high)',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    width: `${percentage}%`, height: '100%',
                    backgroundColor: 'var(--md-sys-color-primary)',
                    borderRadius: '4px',
                    transition: 'width 0.3s ease',
                  }} />
                </div>
                <span style={{ fontSize: '11px', color: 'var(--md-sys-color-outline)', minWidth: '24px', textAlign: 'right' }}>
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* User Rating */}
      {isAuthenticated ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '13px', color: 'var(--md-sys-color-on-surface-variant)' }}>
            {userRating ? t('rating.yourRating') : t('rating.rateThis')}
          </span>
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            {Array.from({ length: maxStars }, (_, i) => i + 1).map((star) => (
              <button
                key={star}
                onClick={() => handleRate(star)}
                onMouseEnter={() => setHoveredStar(star)}
                onMouseLeave={() => setHoveredStar(null)}
                disabled={saving}
                style={{
                  width: '40px', height: '40px', borderRadius: '8px',
                  border: 'none', cursor: 'pointer',
                  backgroundColor: star <= displayStar ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-surface-container-high)',
                  color: star <= displayStar ? 'var(--md-sys-color-on-primary)' : 'var(--md-sys-color-outline)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s ease',
                  transform: hoveredStar === star ? 'scale(1.1)' : 'scale(1)',
                }}
              >
                <span className="material-symbols-outlined" style={{
                  fontSize: '24px',
                  fontVariationSettings: star <= displayStar ? "'FILL' 1" : "'FILL' 0",
                }}>
                  star
                </span>
              </button>
            ))}
            <span style={{
              marginLeft: '12px', fontSize: '14px', fontWeight: 600,
              color: displayStar > 0 ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-outline)',
            }}>
              {displayStar > 0 ? `${displayStar}/5` : ''}
            </span>
          </div>
        </div>
      ) : (
        <div style={{
          padding: '16px', borderRadius: '12px',
          backgroundColor: 'var(--md-sys-color-surface-container)',
          textAlign: 'center',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '24px', color: 'var(--md-sys-color-outline)', marginBottom: '8px', display: 'block' }}>
            lock
          </span>
          <p style={{ fontSize: '14px', color: 'var(--md-sys-color-on-surface-variant)', margin: 0 }}>
            {t('rating.loginRequired')}
          </p>
        </div>
      )}
    </div>
  );
}
