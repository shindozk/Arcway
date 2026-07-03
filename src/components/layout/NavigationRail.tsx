import { memo } from 'react';
import { useUIStore } from '../../stores/useUIStore';
import { useInstallStore } from '../../stores/useInstallStore';
import { useAuth } from '../../hooks/useAuth';
import { playSound } from '../../utils/sounds';
import { useStaggeredAnimation } from '../../utils/animations';
import { useI18n } from '../../i18n';
import arcwayLogo from '../../assets/logo/arcway_logo.png';

const NAV_KEYS = ['nav.home', 'nav.search', 'nav.installed', 'nav.updates', 'nav.settings'];
const NAV_ICONS = ['home', 'search', 'download_done', 'system_update', 'settings'];
const NAV_IDS = ['home', 'search', 'installed', 'updates', 'settings'] as const;

const NavButton = memo(function NavButton({ label, icon, id, isActive, hasInstalls, animStyle }: {
  label: string; icon: string; id: string; isActive: boolean; hasInstalls: boolean; animStyle: React.CSSProperties;
}) {
  const navigate = useUIStore((s) => s.navigate);

  return (
    <button
      style={{
        ...animStyle,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: '4px', padding: '10px 0', border: 'none',
        background: 'transparent', cursor: 'pointer',
        position: 'relative', width: '100%',
      }}
      onClick={() => { playSound('tap'); navigate(id as any); }}
    >
      <div style={{
        position: 'absolute', top: '6px',
        width: isActive ? '36px' : '0px',
        height: '32px', borderRadius: '10px',
        backgroundColor: isActive ? 'var(--md-sys-color-secondary-container)' : 'transparent',
        transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
        zIndex: 0,
      }} />
      <span className="material-symbols-outlined" style={{
        fontSize: '22px', position: 'relative', zIndex: 1,
        color: isActive ? 'var(--md-sys-color-on-secondary-container)' : 'var(--md-sys-color-on-surface-variant)',
        fontVariationSettings: isActive ? "'FILL' 1, 'wght' 600" : "'FILL' 0, 'wght' 400",
        transition: 'color 0.25s, font-variation-settings 0.3s, transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
        transform: isActive ? 'scale(1.1)' : 'scale(1)',
      }}>
        {icon}
      </span>
      <span style={{
        fontSize: '10px', fontWeight: isActive ? 600 : 400, lineHeight: 1,
        color: isActive ? 'var(--md-sys-color-on-surface)' : 'var(--md-sys-color-on-surface-variant)',
        transition: 'color 0.2s, font-weight 0.2s',
        position: 'relative', zIndex: 1,
      }}>
        {label}
      </span>
      {hasInstalls && (
        <span style={{ position: 'absolute', top: '6px', right: '16px', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--md-sys-color-error)', animation: 'glowPulse 2s ease-in-out infinite', zIndex: 2 }} />
      )}
    </button>
  );
});

const ProfileAvatar = memo(function ProfileAvatar({ onClick }: { onClick: () => void }) {
  const { user, isAuthenticated } = useAuth();
  const avatarUrl = user?.avatar_url;
  const initials = user?.display_name?.[0] || user?.username?.[0] || user?.email?.[0] || '?';

  return (
    <div
      style={{
        width: '36px', height: '36px', borderRadius: '50%',
        border: '1.5px solid var(--md-sys-color-outline-variant)',
        backgroundColor: isAuthenticated && avatarUrl ? 'transparent' : 'var(--md-sys-color-surface-container)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', marginTop: 'auto',
        overflow: 'hidden',
        backgroundSize: 'cover', backgroundPosition: 'center',
        transition: 'border-color 0.25s, transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
        ...(isAuthenticated && avatarUrl ? { backgroundImage: `url(${avatarUrl})` } : {}),
      }}
      onClick={onClick}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--md-sys-color-primary)'; e.currentTarget.style.transform = 'scale(1.08)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--md-sys-color-outline-variant)'; e.currentTarget.style.transform = 'scale(1)'; }}
    >
      {isAuthenticated && avatarUrl ? null : (
        isAuthenticated ? (
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--md-sys-color-on-surface-variant)' }}>
            {initials.toUpperCase()}
          </span>
        ) : (
          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--md-sys-color-on-surface-variant)', fontVariationSettings: "'FILL' 1" }}>
            person
          </span>
        )
      )}
    </div>
  );
});

export function NavigationRail() {
  const activePage = useUIStore((s) => s.activePage);
  const navigate = useUIStore((s) => s.navigate);
  const activeInstalls = useInstallStore((s) => s.activeInstalls);
  const { getItemStyle } = useStaggeredAnimation(NAV_IDS.length, { variant: 'fadeIn', stagger: 60, delay: 100 });
  const { t } = useI18n();

  const hasActiveInstalls = activeInstalls.size > 0;

  return (
    <nav style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      height: '100%', width: '72px',
      backgroundColor: 'var(--md-sys-color-surface)',
      padding: '16px 0', gap: '2px',
    }}>
      <div style={{
        width: '40px', height: '40px', borderRadius: '10px',
        overflow: 'hidden', marginBottom: '20px', cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
        transition: 'transform 0.2s, box-shadow 0.2s',
      }}
        onClick={() => { playSound('tap'); navigate('home'); }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.18)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.12)'; }}
      >
        <img src={arcwayLogo} alt="Arcway" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
        {NAV_IDS.map((id, index) => (
          <NavButton
            key={id}
            label={t(NAV_KEYS[index])}
            icon={NAV_ICONS[index]}
            id={id}
            isActive={activePage === id}
            hasInstalls={id === 'updates' && hasActiveInstalls}
            animStyle={getItemStyle(index)}
          />
        ))}
      </div>

      <ProfileAvatar onClick={() => { playSound('tap'); navigate('profile'); }} />
    </nav>
  );
}
