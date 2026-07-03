import { useI18n } from '../i18n';
import { useAnimateOnMount, useStaggeredAnimation } from '../utils/animations';
import { useUIStore } from '../stores/useUIStore';
import arcwayLogo from '../assets/logo/arcway_logo.png';

const APP_VERSION = '0.1.0';

const dependencies = [
  { name: 'Tauri', version: '2.x', license: 'MIT/Apache-2.0', url: 'https://tauri.app', desc: 'Desktop app framework' },
  { name: 'React', version: '19.x', license: 'MIT', url: 'https://react.dev', desc: 'UI library' },
  { name: 'Vite', version: '5.x', license: 'MIT', url: 'https://vitejs.dev', desc: 'Build tool' },
  { name: 'Zustand', version: '5.x', license: 'MIT', url: 'https://github.com/pmndrs/zustand', desc: 'State management' },
  { name: 'Material Design 3', version: '—', license: 'Apache-2.0', url: 'https://m3.material.io', desc: 'Design system' },
  { name: 'rusqlite', version: '0.31', license: 'MIT', url: 'https://github.com/rusqlite/rusqlite', desc: 'SQLite bindings' },
  { name: 'reqwest', version: '0.12', license: 'MIT', url: 'https://github.com/seanmonstar/reqwest', desc: 'HTTP client' },
  { name: 'tokio', version: '1.x', license: 'MIT', url: 'https://tokio.rs', desc: 'Async runtime' },
  { name: 'serde', version: '1.x', license: 'MIT', url: 'https://serde.rs', desc: 'Serialization' },
  { name: 'Flatpak', version: '—', license: 'LGPL-2.1+', url: 'https://flatpak.org', desc: 'Linux app sandboxing' },
  { name: 'AUR', version: '—', license: '—', url: 'https://aur.archlinux.org', desc: 'Arch User Repository' },
];

const links = [
  { labelKey: 'about.github', url: 'https://github.com/arcway-app/arcway', icon: 'code' },
  { labelKey: 'about.reportIssue', url: 'https://github.com/arcway-app/arcway/issues', icon: 'bug_report' },
  { labelKey: 'about.flatpak', url: 'https://flathub.org', icon: 'inventory_2' },
  { labelKey: 'about.aur', url: 'https://aur.archlinux.org', icon: 'package_2' },
  { labelKey: 'about.archLinux', url: 'https://archlinux.org', icon: 'computer' },
];

export default function AboutPage() {
  const { t } = useI18n();
  const navigate = useUIStore((s) => s.navigate);
  const anim = useAnimateOnMount({ variant: 'fadeIn', duration: 300 });
  const { getItemStyle } = useStaggeredAnimation(dependencies.length + 1, {
    variant: 'slideUp', stagger: 40, delay: 150,
  });

  return (
    <div style={{
      height: '100%', overflow: 'auto',
      padding: '32px', maxWidth: '720px', margin: '0 auto',
    }}>
      {/* Hero */}
      <div style={{ ...anim.style, textAlign: 'center', marginBottom: '40px' }}>
        <div style={{
          width: '80px', height: '80px', borderRadius: '20px', margin: '0 auto 16px',
          overflow: 'hidden',
          boxShadow: '0 8px 24px rgba(103, 80, 164, 0.25)',
        }}>
          <img src={arcwayLogo} alt="Arcway" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
        <h1 style={{
          fontSize: '32px', fontWeight: 700, margin: '0 0 4px',
          color: 'var(--md-sys-color-on-surface)',
        }}>
          Arcway
        </h1>
        <p style={{
          fontSize: '14px', color: 'var(--md-sys-color-outline)',
          margin: 0,
        }}>
          {t('about.version', { version: APP_VERSION })}
        </p>
      </div>

      {/* About */}
      <Section title={t('about.title')}>
        <p style={textStyle}>
          {t('about.description')}
        </p>
        <p style={textStyle}>
          {t('about.appimageManager')}
        </p>
      </Section>

      {/* Links */}
      <Section title={t('about.links')}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {links.map((link) => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '12px 16px', borderRadius: '10px',
                backgroundColor: 'var(--md-sys-color-surface-container)',
                textDecoration: 'none',
                color: 'var(--md-sys-color-on-surface)',
                transition: 'background-color 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--md-sys-color-surface-container-high)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--md-sys-color-surface-container)'; }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--md-sys-color-primary)' }}>
                {link.icon}
              </span>
              <span style={{ fontSize: '14px', flex: 1 }}>{t(link.labelKey)}</span>
              <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--md-sys-color-outline)' }}>
                open_in_new
              </span>
            </a>
          ))}
        </div>
      </Section>

      {/* Dependencies */}
      <Section title={t('about.dependencies')}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {dependencies.map((dep, i) => (
            <div key={dep.name} style={{
              ...getItemStyle(i),
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '10px 14px', borderRadius: '10px',
              backgroundColor: 'var(--md-sys-color-surface-container)',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--md-sys-color-on-surface)' }}>
                  {dep.name}
                  {dep.version !== '—' && (
                    <span style={{ fontSize: '11px', color: 'var(--md-sys-color-outline)', marginLeft: '6px' }}>
                      v{dep.version}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--md-sys-color-outline)' }}>
                  {dep.desc}
                </div>
              </div>
              <span style={{
                fontSize: '10px', padding: '2px 8px', borderRadius: '6px',
                backgroundColor: 'var(--md-sys-color-surface-container-high)',
                color: 'var(--md-sys-color-outline)', fontWeight: 500,
              }}>
                {dep.license}
              </span>
            </div>
          ))}
        </div>
      </Section>

      {/* License */}
      <Section title={t('about.license')}>
        <div style={{
          padding: '16px', borderRadius: '12px',
          backgroundColor: 'var(--md-sys-color-surface-container)',
          fontSize: '13px', lineHeight: '20px',
          color: 'var(--md-sys-color-on-surface-variant)',
        }}>
          <p style={{ margin: 0 }}>
            {t('about.licenseText')}
          </p>
        </div>
      </Section>

      {/* Back */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
        <button
          onClick={() => navigate('settings')}
          style={{
            padding: '10px 24px', borderRadius: '20px', border: 'none',
            backgroundColor: 'var(--md-sys-color-surface-container)',
            color: 'var(--md-sys-color-on-surface)',
            fontSize: '13px', fontWeight: 500, cursor: 'pointer',
            fontFamily: 'inherit', transition: 'background-color 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--md-sys-color-surface-container-high)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--md-sys-color-surface-container)'; }}
        >
          {t('about.backToSettings')}
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '28px' }}>
      <h2 style={{
        fontSize: '13px', fontWeight: 600, textTransform: 'uppercase',
        letterSpacing: '0.08em', color: 'var(--md-sys-color-outline)',
        margin: '0 0 12px',
      }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

const textStyle: React.CSSProperties = {
  fontSize: '14px', lineHeight: '22px',
  color: 'var(--md-sys-color-on-surface-variant)',
  margin: '0 0 8px',
};
