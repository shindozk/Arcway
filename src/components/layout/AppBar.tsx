import { useUIStore } from '../../stores/useUIStore';
import { playSound } from '../../utils/sounds';
import { useI18n } from '../../i18n';

const PAGE_KEYS: Record<string, string> = {
  home: 'app.name',
  search: 'nav.search',
  installed: 'nav.installed',
  updates: 'nav.updates',
  settings: 'nav.settings',
  detail: 'detail.title',
  profile: 'nav.profile',
  about: 'app.name',
};

const BACKABLE_PAGES = ['detail', 'settings', 'about', 'profile'];

export function AppBar() {
  const activePage = useUIStore((s) => s.activePage);
  const goBack = useUIStore((s) => s.goBack);

  const { t } = useI18n();
  const showBack = BACKABLE_PAGES.includes(activePage);

  return (
    <header style={{
      display: 'flex', alignItems: 'center', height: '52px',
      padding: '0 24px', gap: '12px',
      backgroundColor: 'var(--md-sys-color-surface)',
      borderBottom: '1px solid var(--md-sys-color-outline-variant)',
    }}>
      {showBack && (
        <button
          aria-label="Go back"
          style={{
            width: '32px', height: '32px', borderRadius: '8px',
            border: 'none', background: 'transparent',
            color: 'var(--md-sys-color-on-surface-variant)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0,
          }}
          onClick={() => { playSound('back'); goBack(); }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--md-sys-color-surface-container)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>arrow_back</span>
        </button>
      )}
      <h1 style={{
        fontSize: '15px', fontWeight: 600, margin: 0,
        color: 'var(--md-sys-color-on-surface)', letterSpacing: '-0.2px',
        flex: 1, minWidth: 0,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {t(PAGE_KEYS[activePage] || 'app.name')}
      </h1>
      {/* Right side: keyboard shortcut hint on search */}
      {activePage === 'search' && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '4px',
          fontSize: '11px', color: 'var(--md-sys-color-outline)',
          padding: '3px 8px', borderRadius: '6px',
          backgroundColor: 'var(--md-sys-color-surface-container)',
          flexShrink: 0,
        }}>
          <kbd style={{ fontSize: '10px', fontFamily: 'inherit' }}>Ctrl+K</kbd>
        </div>
      )}

    </header>
  );
}
