import { useState, useEffect } from 'react';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useUIStore } from '../stores/useUIStore';
import { useTheme } from '../hooks/useTheme';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { PackageSource } from '../types/package';
import { SOURCE_LABELS } from '../utils/constants';
import { clearCache } from '../api/system';
import { playSound, isSoundEnabled, setSoundEnabled } from '../utils/sounds';
import { useAnimateOnMount, useStaggeredAnimation } from '../utils/animations';
import { invoke } from '@tauri-apps/api/core';
import { useI18n, LANGUAGES } from '../i18n';

export default function SettingsPage() {
  const settings = useSettingsStore((s) => s.settings);
  const toggleSource = useSettingsStore((s) => s.toggleSource);
  const setSeedColor = useSettingsStore((s) => s.setSeedColor);
  const navigate = useUIStore((s) => s.navigate);
  const { darkMode } = useTheme();
  const { t } = useI18n();
  const [clearingCache, setClearingCache] = useState(false);
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const rootAnim = useAnimateOnMount({ variant: 'fadeIn', duration: 350 });
  const { getItemStyle: getSectionStyle } = useStaggeredAnimation(5, {
    variant: 'slideUp', stagger: 80, delay: 100,
  });

  const handleClearCache = async () => {
    playSound('delete');
    setClearingCache(true);
    try { await clearCache(); } catch {} finally { setClearingCache(false); }
  };

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '32px', maxWidth: '600px', margin: '0 auto', overflow: 'auto', height: '100%', ...rootAnim.style }}>

      {/* Appearance */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', ...getSectionStyle(0) }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--md-sys-color-on-surface)', margin: 0 }}>{t('settings.appearance')}</h3>
        <SettingRow label={t('settings.darkMode')} description={darkMode ? 'Dark mode' : 'Light mode'}>
          <ThemeToggle />
        </SettingRow>
        <SettingRow label={t('settings.seedColor')} description="Primary color for theming">
          <input type="color" value={settings.theme_seed_color}
            onChange={(e) => setSeedColor(e.target.value)}
            style={{ width: '48px', height: '48px', borderRadius: '12px', border: '2px solid var(--md-sys-color-outline-variant)', cursor: 'pointer', padding: '2px', backgroundColor: 'transparent' }} />
        </SettingRow>
        <SettingRow label="Sound Effects" description="Play sounds on interactions">
          <ToggleSwitch value={soundOn} onChange={(v) => { setSoundOn(v); setSoundEnabled(v); }} />
        </SettingRow>
      </div>

      {/* Language */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', ...getSectionStyle(0.5) }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--md-sys-color-on-surface)', margin: 0 }}>{t('settings.language')}</h3>
        <LanguageSelector />
      </div>

      {/* Package Sources */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', ...getSectionStyle(1) }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--md-sys-color-on-surface)', margin: 0 }}>{t('settings.sources')}</h3>
        {[
          { source: PackageSource.Flatpak, desc: t('settings.flatpakDesc') },
          { source: PackageSource.Yay, desc: t('settings.aurDesc') },
          { source: PackageSource.Paru, desc: 'AUR helper (Rust)' },
        ].map(({ source, desc }) => {
          const isEnabled = settings.enabled_sources.includes(source);
          return (
            <div key={source} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 16px', borderRadius: '12px',
              backgroundColor: 'var(--md-sys-color-surface-container)',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--md-sys-color-on-surface)' }}>{SOURCE_LABELS[source]}</div>
                <div style={{ fontSize: '11px', color: 'var(--md-sys-color-outline)' }}>{desc}</div>
              </div>
              <ToggleSwitch value={isEnabled} onChange={() => { playSound('toggle'); toggleSource(source); }} />
            </div>
          );
        })}
      </div>

      {/* Cache */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', ...getSectionStyle(2) }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--md-sys-color-on-surface)', margin: 0 }}>{t('settings.cache')}</h3>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: '12px', backgroundColor: 'var(--md-sys-color-surface-container)' }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--md-sys-color-on-surface)' }}>{t('settings.clearCache')}</div>
            <div style={{ fontSize: '11px', color: 'var(--md-sys-color-outline)' }}>{t('settings.clearCacheDesc')}</div>
          </div>
          <button onClick={handleClearCache} disabled={clearingCache} style={{ height: '32px', padding: '0 16px', borderRadius: '16px', border: 'none', backgroundColor: 'var(--md-sys-color-error-container)', color: 'var(--md-sys-color-on-error-container)', fontSize: '12px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px', opacity: clearingCache ? 0.5 : 1 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete_sweep</span>
            {clearingCache ? t('settings.clearing') : t('settings.clearCacheBtn')}
          </button>
        </div>
      </div>

      {/* About */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', ...getSectionStyle(2.5) }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--md-sys-color-on-surface)', margin: 0 }}>{t('settings.debug') ? 'About' : 'About'}</h3>
        <div onClick={() => { playSound('tap'); navigate('about'); }}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: '12px', backgroundColor: 'var(--md-sys-color-surface-container)', cursor: 'pointer', transition: 'background-color 0.15s' }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--md-sys-color-surface-container-high)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--md-sys-color-surface-container)'; }}
        >
          <div>
            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--md-sys-color-on-surface)' }}>Arcway v0.1.0</div>
            <div style={{ fontSize: '11px', color: 'var(--md-sys-color-outline)' }}>Arch Linux App Store · MIT License</div>
          </div>
          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--md-sys-color-outline)' }}>chevron_right</span>
        </div>
      </div>

      {/* Debug / Logs */}
      <DebugSection t={t} />
    </div>
  );
}

function SettingRow({ label, description, children }: { label: string; description: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: '12px', backgroundColor: 'var(--md-sys-color-surface-container)' }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--md-sys-color-on-surface)' }}>{label}</div>
        <div style={{ fontSize: '11px', color: 'var(--md-sys-color-outline)' }}>{description}</div>
      </div>
      {children}
    </div>
  );
}

function ToggleSwitch({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div onClick={() => onChange(!value)} role="switch" aria-checked={value} style={{
      width: '44px', height: '24px', borderRadius: '12px', cursor: 'pointer',
      backgroundColor: value ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-surface-variant)',
      padding: '2px', transition: 'background-color 0.2s',
      display: 'flex', alignItems: value ? 'center' : 'center',
      justifyContent: value ? 'flex-end' : 'flex-start',
    }}>
      <div style={{
        width: '20px', height: '20px', borderRadius: '50%',
        backgroundColor: value ? 'var(--md-sys-color-on-primary)' : 'var(--md-sys-color-outline)',
        transition: 'transform 0.2s',
        transform: value ? 'translateX(0)' : 'translateX(0)',
      }} />
    </div>
  );
}

function LanguageSelector() {
  const { locale, setLocale } = useI18n();
  const [search, setSearch] = useState('');

  const filtered = LANGUAGES.filter((l) =>
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    l.native.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <input type="text" placeholder="Search languages..." value={search} onChange={(e) => setSearch(e.target.value)}
        style={{
          height: '36px', padding: '0 12px', borderRadius: '10px',
          border: '1px solid var(--md-sys-color-outline-variant)',
          backgroundColor: 'var(--md-sys-color-surface-container)',
          color: 'var(--md-sys-color-on-surface)', fontSize: '13px',
          fontFamily: 'inherit', outline: 'none', width: '100%',
          boxSizing: 'border-box',
        }} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {filtered.map((lang) => {
          const isActive = locale === lang.code;
          return (
            <button key={lang.code} onClick={() => { playSound('tap'); setLocale(lang.code); }}
              style={{
                padding: '8px 12px', borderRadius: '8px', border: 'none',
                cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px',
                fontWeight: isActive ? 600 : 400,
                backgroundColor: isActive ? 'var(--md-sys-color-primary-container)' : 'var(--md-sys-color-surface-container)',
                color: isActive ? 'var(--md-sys-color-on-primary-container)' : 'var(--md-sys-color-on-surface)',
                transition: 'all 0.15s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px',
              }}
              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = 'var(--md-sys-color-surface-container-high)'; }}
              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = 'var(--md-sys-color-surface-container)'; }}
            >
              <span style={{ fontSize: '13px' }}>{lang.native}</span>
              <span style={{ fontSize: '10px', color: 'var(--md-sys-color-outline)' }}>{lang.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DebugSection({ t }: { t: (key: string) => string }) {
  const [logFiles, setLogFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [logContent, setLogContent] = useState<string | null>(null);
  const [showLogs, setShowLogs] = useState(false);

  useEffect(() => {
    invoke<string[]>('list_log_files').then((f) => setLogFiles(f)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleDownload = async () => {
    try {
      const content = await invoke<string>('get_log_content');
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'arcway.log'; a.click();
      URL.revokeObjectURL(url);
      playSound('success');
    } catch { playSound('error'); }
  };

  const handleViewLog = async () => {
    try {
      const content = await invoke<string>('get_log_content');
      setLogContent(logContent ? null : content);
    } catch { playSound('error'); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--md-sys-color-on-surface)', margin: 0 }}>{t('settings.debug')}</h3>

      {/* View current log */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: '12px', backgroundColor: 'var(--md-sys-color-surface-container)' }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--md-sys-color-on-surface)' }}>{t('settings.viewLog')}</div>
          <div style={{ fontSize: '11px', color: 'var(--md-sys-color-outline)' }}>{t('settings.viewLogDesc')}</div>
        </div>
        <button onClick={handleViewLog} style={{ height: '32px', padding: '0 16px', borderRadius: '16px', border: 'none', backgroundColor: logContent ? 'var(--md-sys-color-error-container)' : 'var(--md-sys-color-primary-container)', color: logContent ? 'var(--md-sys-color-on-error-container)' : 'var(--md-sys-color-on-primary-container)', fontSize: '12px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
          {logContent ? t('close') : t('settings.view')}
        </button>
      </div>

      {logContent && (
        <div style={{ maxHeight: '200px', overflow: 'auto', padding: '12px', borderRadius: '8px', backgroundColor: '#1a1a1a', fontSize: '11px', fontFamily: 'monospace', color: '#a0a0a0', lineHeight: '1.6' }}>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{logContent}</pre>
        </div>
      )}

      {/* Download */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: '12px', backgroundColor: 'var(--md-sys-color-surface-container)' }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--md-sys-color-on-surface)' }}>{t('settings.downloadLog')}</div>
          <div style={{ fontSize: '11px', color: 'var(--md-sys-color-outline)' }}>{t('settings.downloadLogDesc')}</div>
        </div>
        <button onClick={handleDownload} style={{ height: '32px', padding: '0 16px', borderRadius: '16px', border: 'none', backgroundColor: 'var(--md-sys-color-primary)', color: 'var(--md-sys-color-on-primary)', fontSize: '12px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>download</span>
          {t('settings.download')}
        </button>
      </div>

      {/* Session logs — collapsible menu */}
      {!loading && logFiles.length > 0 && (
        <div style={{ borderRadius: '12px', backgroundColor: 'var(--md-sys-color-surface-container)', overflow: 'hidden' }}>
          <div
            onClick={() => setShowLogs(!showLogs)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 16px', cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--md-sys-color-on-surface)' }}>
              {t('settings.sessionLogs').replace('{count}', String(logFiles.length))}
            </span>
            <span className="material-symbols-outlined" style={{
              fontSize: '18px', color: 'var(--md-sys-color-outline)',
              transition: 'transform 0.2s',
              transform: showLogs ? 'rotate(180deg)' : 'rotate(0)',
            }}>
              expand_more
            </span>
          </div>
          {showLogs && (
            <div style={{
              borderTop: '1px solid var(--md-sys-color-outline-variant)',
              maxHeight: '200px', overflow: 'auto',
            }}>
              {logFiles.map((file) => (
                <div key={file} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 16px',
                  borderBottom: '1px solid var(--md-sys-color-outline-variant)',
                  fontSize: '11px',
                }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--md-sys-color-surface-container-high)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <span style={{ color: 'var(--md-sys-color-on-surface)', fontFamily: 'monospace' }}>
                    {file.split('/').pop()}
                  </span>
                  <button onClick={handleDownload} style={{ width: '28px', height: '28px', borderRadius: '6px', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--md-sys-color-primary)' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>download</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
