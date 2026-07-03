import { useState, useRef, useCallback } from 'react';
import { useUIStore } from '../stores/useUIStore';
import { useAuth } from '../hooks/useAuth';
import { useAuthStore } from '../stores/useAuthStore';
import { uploadImage, fileToBase64 } from '../api/images';
import { updateProfile } from '../api/auth';
import { playSound } from '../utils/sounds';
import { useAnimateOnMount, useStaggeredAnimation } from '../utils/animations';
import { useI18n } from '../i18n';

export default function ProfilePage() {
  const navigate = useUIStore((s) => s.navigate);
  const { logout, user, isAuthenticated } = useAuth();
  const { t } = useI18n();
  const heroAnim = useAnimateOnMount({ variant: 'slideUp', duration: 500 });
  const headerAnim = useAnimateOnMount({ variant: 'fadeIn', duration: 400, delay: 200 });
  const loggedOutAnim = useAnimateOnMount({ variant: 'scaleIn', duration: 400 });
  const { getItemStyle: getSectionStyle } = useStaggeredAnimation(4, {
    variant: 'slideUp', stagger: 80, delay: 300,
  });

  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Avatar/banner state
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [bannerUrl, setBannerUrl] = useState(user?.banner_url || '');
  const [bannerHovered, setBannerHovered] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // Get display name from user
  const currentDisplayName = user?.display_name || user?.username || user?.email?.split('@')[0] || 'User';
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
    : '';
  const userIdShort = user?.id ? user.id.substring(0, 8) : '';

  // Start editing
  const startEditing = useCallback(() => {
    setDisplayName(user?.display_name || user?.username || '');
    setIsEditing(true);
    setSaveSuccess(false);
    setSaveError('');
    playSound('tap');
  }, [user]);

  // Cancel editing
  const cancelEditing = useCallback(() => {
    setIsEditing(false);
    setSaveError('');
    playSound('back');
  }, []);

  // Save profile
  const saveProfile = useCallback(async () => {
    if (!displayName.trim()) return;
    setSaving(true);
    setSaveError('');
    try {
      const updated = await updateProfile({ display_name: displayName.trim() });
      useAuthStore.getState().setUser(updated);
      setSaveSuccess(true);
      setIsEditing(false);
      playSound('success');
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save');
      playSound('error');
    } finally {
      setSaving(false);
    }
  }, [displayName]);

  // Upload image handler
  const handleUpload = useCallback(async (file: File, type: 'avatar' | 'banner') => {
    const setUploading = type === 'avatar' ? setUploadingAvatar : setUploadingBanner;
    const setUrl = type === 'avatar' ? setAvatarUrl : setBannerUrl;

    setUploading(true);
    playSound('install');
    try {
      const base64 = await fileToBase64(file);
      const url = await uploadImage(base64, `arcway_${type}_${Date.now()}.${file.name.split('.').pop()}`);
      setUrl(url);
      const field = type === 'avatar' ? 'avatar_url' : 'banner_url';
      const updated = await updateProfile({ [field]: url });
      useAuthStore.getState().setUser(updated);
      playSound('success');
    } catch (err) {
      playSound('error');
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { playSound('error'); return; }
      handleUpload(file, type);
    }
    e.target.value = '';
  }, [handleUpload]);

  // --- Logged-out state ---
  if (!isAuthenticated) {
    return (
      <div style={{ height: '100%', overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: '100%', padding: '40px 24px', gap: '24px',
          ...loggedOutAnim.style,
        }}>
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%',
            backgroundColor: 'var(--md-sys-color-surface-container-high)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '40px', color: 'var(--md-sys-color-on-surface-variant)' }}>
              person_off
            </span>
          </div>

          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 600, color: 'var(--md-sys-color-on-surface)', margin: 0 }}>
              {t('profile.title')}
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--md-sys-color-on-surface-variant)', margin: '8px 0 0', lineHeight: '20px' }}>
              {t('profile.signInHint')}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '260px' }}>
            <button
              style={{
                width: '100%', height: '46px', borderRadius: '23px', border: 'none',
                backgroundColor: 'var(--md-sys-color-primary)', color: 'var(--md-sys-color-on-primary)',
                fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                transition: 'all 0.2s ease',
              }}
              onClick={() => {
                playSound('click');
                localStorage.removeItem('arcway_auth_skipped');
                useAuthStore.getState().resetSkip();
                logout();
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>login</span>
              {t('login.submit')}
            </button>

            <button
              style={{
                width: '100%', height: '46px', borderRadius: '23px',
                border: '1px solid var(--md-sys-color-outline)',
                backgroundColor: 'transparent', color: 'var(--md-sys-color-primary)',
                fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                transition: 'all 0.2s ease',
              }}
              onClick={() => {
                playSound('click');
                localStorage.removeItem('arcway_auth_skipped');
                useAuthStore.getState().resetSkip();
                logout();
                useAuthStore.getState().setShowRegister(true);
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--md-sys-color-surface-container-highest)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>person_add</span>
              {t('register.submit')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Logged-in state ---
  return (
    <div style={{ height: '100%', overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes bannerShimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
      `}</style>

      <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={(e) => handleFileSelect(e, 'avatar')} />
      <input ref={bannerInputRef} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={(e) => handleFileSelect(e, 'banner')} />

      {/* Hero Banner with layered gradients */}
      <div style={{ position: 'relative', ...heroAnim.style }}>
        <div
          style={{
            width: '100%', height: '180px',
            background: bannerUrl
              ? `url(${bannerUrl}) center/cover no-repeat`
              : 'linear-gradient(135deg, var(--md-sys-color-primary-container) 0%, var(--md-sys-color-tertiary-container) 50%, var(--md-sys-color-secondary-container) 100%)',
            position: 'relative', cursor: 'pointer', flexShrink: 0,
            transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          onClick={() => bannerInputRef.current?.click()}
          onMouseEnter={() => setBannerHovered(true)}
          onMouseLeave={() => setBannerHovered(false)}
        >
          {/* Layer 1: Bottom gradient fading to surface */}
          <div style={{
            position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
            background: 'linear-gradient(to bottom, transparent 0%, transparent 40%, rgba(0,0,0,0.25) 75%, var(--md-sys-color-surface) 100%)',
          }} />
          {/* Layer 2: Top shimmer overlay */}
          <div style={{
            position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
            background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.06) 45%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.06) 55%, transparent 60%)',
            backgroundSize: '200% 100%',
            animation: 'bannerShimmer 8s ease-in-out infinite',
          }} />
          {/* Layer 3: Vignette */}
          <div style={{
            position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none',
            boxShadow: 'inset 0 0 80px rgba(0,0,0,0.15)',
          }} />
          {/* Edit overlay on hover */}
          <div style={{
            position: 'absolute', inset: 0, zIndex: 4,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.3)', opacity: bannerHovered ? 1 : 0,
            transition: 'opacity 0.25s ease', gap: '8px', color: '#fff', fontSize: '14px', fontWeight: 500,
          }}>
            {uploadingBanner ? (
              <div style={{ width: '24px', height: '24px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
            ) : (                <>
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>photo_camera</span>
                {t('profile.changeBanner') || 'Change banner'}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Avatar + Header Info */}
      <div style={{ ...headerAnim.style, display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '-48px', padding: '0 24px', position: 'relative', zIndex: 5 }}>
        {/* Avatar */}
        <div style={{ position: 'relative' }}>
          <div
            style={{
              width: '96px', height: '96px', borderRadius: '50%',
              border: '4px solid var(--md-sys-color-surface)',
              backgroundColor: 'var(--md-sys-color-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
              overflow: 'hidden', cursor: 'pointer',
              transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease',
              ...(avatarUrl ? { backgroundImage: `url(${avatarUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: 'transparent' } : {}),
            }}
            onClick={() => avatarInputRef.current?.click()}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.25)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.2)'; }}
          >
            {!avatarUrl && (
              <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#fff', fontVariationSettings: "'FILL' 1" }}>
                person
              </span>
            )}
            {uploadingAvatar && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: '50%' }}>
                <div style={{ width: '24px', height: '24px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
              </div>
            )}
          </div>
          <div
            style={{
              position: 'absolute', bottom: '2px', right: '2px',
              width: '28px', height: '28px', borderRadius: '50%',
              backgroundColor: 'var(--md-sys-color-primary)',
              border: '2px solid var(--md-sys-color-surface)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
            onClick={(e) => { e.stopPropagation(); playSound('tap'); avatarInputRef.current?.click(); }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.15)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--md-sys-color-on-primary)' }}>edit</span>
          </div>
        </div>

        {/* Name + Email + ID */}
        <div style={{ marginTop: '14px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 600, color: 'var(--md-sys-color-on-surface)', margin: 0, lineHeight: '28px' }}>
            {currentDisplayName}
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--md-sys-color-on-surface-variant)', margin: '4px 0 0' }}>
            {user?.email}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginTop: '8px', flexWrap: 'wrap' }}>
            {userIdShort && (
              <span style={{
                fontSize: '11px', color: 'var(--md-sys-color-outline)',
                backgroundColor: 'var(--md-sys-color-surface-container)',
                padding: '3px 10px', borderRadius: '12px', fontFamily: 'monospace',
                letterSpacing: '0.5px',
              }}>
                ID: {userIdShort}...
              </span>
            )}
            {memberSince && (
              <span style={{
                fontSize: '11px', color: 'var(--md-sys-color-outline)',
                backgroundColor: 'var(--md-sys-color-surface-container)',
                padding: '3px 10px', borderRadius: '12px',
              }}>
                {t('profile.memberSince', { date: memberSince })}
              </span>
            )}
          </div>
        </div>

        {/* Save success indicator */}
        {saveSuccess && (
          <div style={{
            marginTop: '12px', padding: '6px 16px', borderRadius: '20px',
            backgroundColor: 'var(--md-sys-color-primary-container)',
            color: 'var(--md-sys-color-on-primary-container)',
            fontSize: '12px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px',
            animation: 'fadeIn 0.3s ease',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>check_circle</span>
            {t('profile.saved')}
          </div>
        )}
      </div>

      {/* Content sections with staggered animation */}
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Profile Info Section */}
        <div style={{
          ...getSectionStyle(0),
          backgroundColor: 'var(--md-sys-color-surface-container-low)',
          borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--md-sys-color-on-surface)' }}>
              {t('profile.profileInfo')}
            </span>
            {!isEditing ? (
              <button
                onClick={startEditing}
                style={{
                  border: 'none', background: 'transparent', color: 'var(--md-sys-color-primary)',
                  fontSize: '13px', fontWeight: 500, cursor: 'pointer', padding: '4px 10px',
                  borderRadius: '8px', transition: 'background-color 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--md-sys-color-primary-container)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                {t('profile.edit')}
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={cancelEditing}
                  style={{
                    border: 'none', background: 'transparent', color: 'var(--md-sys-color-on-surface-variant)',
                    fontSize: '13px', fontWeight: 500, cursor: 'pointer', padding: '4px 10px',
                    borderRadius: '8px',
                  }}
                >
                  {t('profile.cancel')}
                </button>
                <button
                  onClick={saveProfile}
                  disabled={saving || !displayName.trim()}
                  style={{
                    border: 'none', backgroundColor: 'var(--md-sys-color-primary)',
                    color: 'var(--md-sys-color-on-primary)',
                    fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                    padding: '4px 14px', borderRadius: '8px',
                    opacity: saving || !displayName.trim() ? 0.6 : 1,
                    transition: 'opacity 0.2s',
                  }}
                >
                  {saving ? t('profile.saving') : t('profile.save')}
                </button>
              </div>
            )}
          </div>

          {isEditing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--md-sys-color-on-surface-variant)', marginBottom: '6px', display: 'block' }}>
                  {t('profile.displayName')}
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={t('profile.displayNamePlaceholder')}
                  style={{
                    width: '100%', height: '42px', padding: '0 14px',
                    borderRadius: '10px', border: '1px solid var(--md-sys-color-outline)',
                    backgroundColor: 'var(--md-sys-color-surface-container-lowest)',
                    color: 'var(--md-sys-color-on-surface)', fontSize: '14px',
                    outline: 'none', boxSizing: 'border-box',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--md-sys-color-primary)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--md-sys-color-outline)'; }}
                  autoFocus
                />
              </div>
              {saveError && (
                <div style={{
                  padding: '10px 14px', borderRadius: '10px',
                  backgroundColor: 'var(--md-sys-color-error-container)',
                  color: 'var(--md-sys-color-on-error-container)', fontSize: '12px',
                }}>
                  {saveError}
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <InfoRow label={t('profile.displayName')} value={currentDisplayName} />
              <InfoRow label={t('profile.email')} value={user?.email || '—'} />
              {user?.id && <InfoRow label={t('profile.userId')} value={user.id} mono />}
            </div>
          )}
        </div>

        {/* Navigation Links */}
        <div style={{
          ...getSectionStyle(1),
          backgroundColor: 'var(--md-sys-color-surface-container-low)',
          borderRadius: '16px', overflow: 'hidden',
        }}>
          <NavRow
            icon="settings"
            label={t('profile.settings')}
            desc={t('profile.settingsDesc')}
            onClick={() => { playSound('navigate'); navigate('settings'); }}
          />
          <NavRow
            icon="inventory_2"
            label={t('profile.installed')}
            desc={t('profile.installedDesc')}
            onClick={() => { playSound('navigate'); navigate('installed'); }}
            noBorder
          />
        </div>

        {/* Logout */}
        <div style={getSectionStyle(2)}>
          <button
            onClick={() => { playSound('delete'); logout(); }}
            style={{
              width: '100%', height: '46px', borderRadius: '12px',
              border: '1px solid var(--md-sys-color-error)',
              backgroundColor: 'transparent', color: 'var(--md-sys-color-error)',
              fontSize: '14px', fontWeight: 500, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--md-sys-color-error-container)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>logout</span>
            {t('profile.signOut')}
          </button>
        </div>

        <span style={{ textAlign: 'center', fontSize: '11px', color: 'var(--md-sys-color-outline)', padding: '8px 0 20px' }}>
          {t('profile.version')}
        </span>
      </div>
    </div>
  );
}

// --- Sub-components ---

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 0' }}>
      <span style={{ fontSize: '13px', color: 'var(--md-sys-color-on-surface-variant)' }}>{label}</span>
      <span style={{
        fontSize: '13px', fontWeight: 500, color: 'var(--md-sys-color-on-surface)',
        fontFamily: mono ? 'monospace' : 'inherit',
        wordBreak: 'break-all', textAlign: 'right', maxWidth: '60%',
      }}>{value}</span>
    </div>
  );
}

function NavRow({ icon, label, desc, onClick, noBorder }: { icon: string; label: string; desc: string; onClick: () => void; noBorder?: boolean }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '14px',
        padding: '14px 20px', cursor: 'pointer',
        borderBottom: noBorder ? 'none' : '1px solid var(--md-sys-color-outline-variant)',
        transition: 'background-color 0.15s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--md-sys-color-surface-container)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--md-sys-color-on-surface-variant)' }}>
        {icon}
      </span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--md-sys-color-on-surface)' }}>{label}</div>
        <div style={{ fontSize: '12px', color: 'var(--md-sys-color-on-surface-variant)', marginTop: '1px' }}>{desc}</div>
      </div>
      <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--md-sys-color-outline)' }}>chevron_right</span>
    </div>
  );
}
