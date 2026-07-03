import { useState, useEffect } from 'react';
import { pickAndInstallAppImage, uninstallAppImage, listAppImages, getAppImageIcon, type AppImageInfo } from '../../api/appimage';
import { playSound } from '../../utils/sounds';
import { useSudoStore } from '../../hooks/useSudo';
import { useI18n } from '../../i18n';
import { createLogger } from '../../utils/logger';

const log = createLogger('appimage');

interface AppWithIcon extends AppImageInfo {
  iconData?: string;
}

export function AppImageManager() {
  const [apps, setApps] = useState<AppWithIcon[]>([]);
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState(false);
  const requestSudo = useSudoStore((s) => s.requestSudo);
  const { t } = useI18n();

  const loadApps = async () => {
    setLoading(true);
    try {
      const list = await listAppImages();
      // Fetch icons as base64
      const withIcons = await Promise.all(
        list.map(async (app) => {
          if (app.icon_path) {
            try {
              const iconData = await getAppImageIcon(app.icon_path);
              return { ...app, iconData };
            } catch {
              return app;
            }
          }
          return app;
        })
      );
      setApps(withIcons);
    } catch (err) {
      log.error(`Failed to list: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadApps(); }, []);

  const handleInstall = () => {
    if (installing) return;
    requestSudo(async () => {
      setInstalling(true);
      try {
        playSound('tap');
        const result = await pickAndInstallAppImage();
        if (result) {
          playSound('success');
          await loadApps();
        }
      } catch (err) {
        log.error(`Install failed: ${err}`);
        playSound('error');
      } finally {
        setInstalling(false);
      }
    }, 'AppImage');
  };

  const handleUpdate = (name: string) => {
    requestSudo(async () => {
      playSound('tap');
      try {
        const result = await pickAndInstallAppImage();
        if (result) {
          const { invoke } = await import('@tauri-apps/api/core');
          await invoke('update_appimage', { name, sourcePath: result.source_path });
          playSound('success');
          await loadApps();
        }
      } catch (err) {
        log.error(`Update failed: ${err}`);
        playSound('error');
      }
    }, name);
  };

  const handleUninstall = async (name: string) => {
    playSound('delete');
    try {
      await uninstallAppImage(name);
      setApps((prev) => prev.filter((a) => a.name !== name));
    } catch (err) {
      log.error(`Uninstall failed: ${err}`);
    }
  };

  return (
    <div style={{
      padding: '16px', borderRadius: '16px',
      backgroundColor: 'var(--md-sys-color-surface-container-low)',
      border: '1px solid var(--md-sys-color-outline-variant)',
      marginBottom: '24px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: 'linear-gradient(135deg, #f97316, #ef4444)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#fff' }}>package_2</span>
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--md-sys-color-on-surface)' }}>{t('installed.appimage')}</div>
            <div style={{ fontSize: '11px', color: 'var(--md-sys-color-outline)' }}>{t('installed.appimageDesc')}</div>
          </div>
        </div>
        <button
          onClick={handleInstall}
          disabled={installing}
          style={{
            height: '36px', padding: '0 20px', borderRadius: '18px',
            border: 'none', fontSize: '13px', fontWeight: 500,
            backgroundColor: installing ? 'var(--md-sys-color-surface-container-high)' : 'var(--md-sys-color-primary)',
            color: installing ? 'var(--md-sys-color-on-surface-variant)' : 'var(--md-sys-color-on-primary)',
            cursor: installing ? 'default' : 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            fontFamily: 'inherit', opacity: installing ? 0.8 : 1,
            minWidth: '140px', justifyContent: 'center',
            transition: 'background-color 0.2s, color 0.2s',
          }}
        >
          {installing ? (
            <span className="material-symbols-outlined" style={{ fontSize: '16px', animation: 'spin 1s linear infinite' }}>progress_activity</span>
          ) : (
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
          )}
          {installing ? t('installed.selecting') : t('installed.addAppImage')}
        </button>
      </div>

      {/* App list */}
      {loading ? (
        <div style={{ padding: '16px', textAlign: 'center', color: 'var(--md-sys-color-outline)', fontSize: '12px' }}>{t('loading')}</div>
      ) : apps.length === 0 ? (
        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--md-sys-color-outline)', fontSize: '12px', borderTop: '1px solid var(--md-sys-color-outline-variant)' }}>
          No AppImages installed. {t('installed.addAppImage')} to install one.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {apps.map((app) => (
            <div key={app.name} style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '10px 12px', borderRadius: '10px',
              backgroundColor: 'var(--md-sys-color-surface-container)',
              transition: 'background-color 0.15s',
            }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--md-sys-color-surface-container-high)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--md-sys-color-surface-container)'; }}
            >
              {/* Icon */}
              <div style={{
                width: '40px', height: '40px', borderRadius: '10px',
                backgroundColor: 'var(--md-sys-color-surface-container-high)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, overflow: 'hidden',
              }}>
                {app.iconData ? (
                  <img
                    src={app.iconData}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                ) : (
                  <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--md-sys-color-outline)' }}>
                    inventory_2
                  </span>
                )}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--md-sys-color-on-surface)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {app.name}
                </div>
                {app.description && (
                  <div style={{ fontSize: '11px', color: 'var(--md-sys-color-outline)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {app.description}
                  </div>
                )}
              </div>

              {/* Badge */}
              <span style={{
                fontSize: '10px', padding: '2px 8px', borderRadius: '6px',
                backgroundColor: '#f9731620', color: '#f97316',
                fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em',
              }}>
                AppImage
              </span>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                {/* Update */}
                <button
                  onClick={() => handleUpdate(app.name)}
                  title="Update AppImage"
                  style={{
                    width: '30px', height: '30px', borderRadius: '8px',
                    border: 'none', background: 'transparent',
                    color: 'var(--md-sys-color-primary)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background-color 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--md-sys-color-primary-container)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>system_update</span>
                </button>
                {/* Uninstall */}
                <button
                  onClick={() => handleUninstall(app.name)}
                  title="Uninstall AppImage"
                  style={{
                    width: '30px', height: '30px', borderRadius: '8px',
                    border: 'none', background: 'transparent',
                    color: 'var(--md-sys-color-error)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background-color 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--md-sys-color-error-container)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
