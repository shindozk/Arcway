import { useState, useEffect, useRef, useCallback } from 'react';
import { useAnimateOnMount, useStaggeredAnimation } from '../../utils/animations';
import { useAuthStore } from '../../stores/useAuthStore';
import { useI18n } from '../../i18n';
import { createLogger } from '../../utils/logger';
import { playSound } from '../../utils/sounds';
import * as supabaseApi from '../../api/supabase';
import type { Comment } from '../../api/supabase';
import { toast } from './Toast';

const log = createLogger('comments');

interface CommentsSystemProps {
  packageId: string;
}

export function CommentsSystem({ packageId }: CommentsSystemProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [serviceUnavailable, setServiceUnavailable] = useState(false);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
  const { user, isAuthenticated } = useAuthStore();
  const { t } = useI18n();
  const headerAnim = useAnimateOnMount({ variant: 'fadeIn', duration: 400 });
  const formAnim = useAnimateOnMount({ variant: 'slideUp', duration: 500, delay: 100 });
  const { getItemStyle } = useStaggeredAnimation(comments.length, { variant: 'fadeIn', stagger: 60, delay: 200 });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const loadComments = useCallback(async () => {
    try {
      const data = await supabaseApi.getComments(packageId);
      setComments(data);
      setServiceUnavailable(false);
    } catch (err) {
      log.warn(`Failed to load comments: ${err}`);
      if (supabaseApi.isTableNotFoundError(err)) {
        setServiceUnavailable(true);
      }
    } finally {
      setLoading(false);
    }
  }, [packageId]);

  useEffect(() => {
    loadComments();
    const interval = setInterval(loadComments, 30000);
    return () => clearInterval(interval);
  }, [packageId, loadComments]);

  const handleSubmit = async () => {
    if (!content.trim() || submitting || !user) return;

    setSubmitting(true);
    try {
      const newComment = await supabaseApi.addComment(packageId, content.trim());
      playSound('success');
      toast.success(t('comments.posted'));
      setContent('');
      setComments((prev) => [newComment, ...prev]);
      log.info(`Comment added: ${newComment.id}`);
    } catch (err) {
      log.error(`Failed to add comment: ${err}`);
      playSound('error');
      if (supabaseApi.isTableNotFoundError(err)) {
        toast.error(t('serviceUnavailable.title'));
      } else {
        toast.error(t('comments.failed'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (commentId: string) => {
    if (!editContent.trim() || !user) return;

    try {
      const updated = await supabaseApi.updateComment(commentId, editContent.trim());
      playSound('success');
      toast.success(t('comments.updated'));
      setComments((prev) => prev.map((c) => (c.id === commentId ? updated : c)));
      setEditingId(null);
      setEditContent('');
    } catch (err) {
      log.error(`Failed to update comment: ${err}`);
      toast.error(t('comments.updateFailed'));
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!user) return;

    try {
      await supabaseApi.deleteComment(commentId);
      playSound('success');
      toast.success(t('comments.deleted'));
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err) {
      log.error(`Failed to delete comment: ${err}`);
      toast.error(t('comments.deleteFailed'));
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return t('comments.justNow');
      if (diffMins < 60) return t('comments.minutesAgo', { count: String(diffMins) });
      if (diffHours < 24) return t('comments.hoursAgo', { count: String(diffHours) });
      if (diffDays < 7) return t('comments.daysAgo', { count: String(diffDays) });

      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const sortedComments = [...comments].sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: '20px',
    }}>
      {/* Header */}
      <div style={{ ...headerAnim.style, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--md-sys-color-primary)' }}>
            chat_bubble
          </span>
          <span style={{
            fontSize: '15px', fontWeight: 600, color: 'var(--md-sys-color-on-surface)',
            letterSpacing: '-0.01em',
          }}>
            {t('comments.title')} <span style={{ color: 'var(--md-sys-color-outline)', fontWeight: 400 }}>({comments.length})</span>
          </span>
        </div>
        <div style={{ display: 'flex', gap: '4px', padding: '3px', borderRadius: '12px', backgroundColor: 'var(--md-sys-color-surface-container)' }}>
          {(['newest', 'oldest'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setSortBy(mode)}
              style={{
                padding: '6px 14px', borderRadius: '10px', border: 'none',
                fontSize: '12px', fontWeight: 500, cursor: 'pointer',
                backgroundColor: sortBy === mode ? 'var(--md-sys-color-primary)' : 'transparent',
                color: sortBy === mode ? 'var(--md-sys-color-on-primary)' : 'var(--md-sys-color-on-surface-variant)',
                transition: 'all 0.2s ease',
              }}
            >
              {mode === 'newest' ? t('comments.newest') : t('comments.oldest')}
            </button>
          ))}
        </div>
      </div>

      {/* Comment Form */}
      {isAuthenticated ? (
        <div style={{ ...formAnim.style }}>
          <div style={{
            position: 'relative', borderRadius: '16px', overflow: 'hidden',
            border: '1px solid var(--md-sys-color-outline-variant)',
            backgroundColor: 'var(--md-sys-color-surface-container-low)',
            transition: 'border-color 0.2s, box-shadow 0.2s',
          }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--md-sys-color-primary)';
              e.currentTarget.style.boxShadow = '0 0 0 1px var(--md-sys-color-primary-container)';
            }}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                e.currentTarget.style.borderColor = 'var(--md-sys-color-outline-variant)';
                e.currentTarget.style.boxShadow = 'none';
              }
            }}
          >
            {/* User banner inside the form */}
            {user?.banner_url && (
              <div style={{
                height: '48px',
                backgroundImage: `url(${user.banner_url})`,
                backgroundSize: 'cover', backgroundPosition: 'center',
              }} />
            )}

            <div style={{ padding: '16px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              {/* Avatar */}
              <div style={{
                width: '36px', height: '36px', borderRadius: '50%',
                backgroundColor: 'var(--md-sys-color-primary-container)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, overflow: 'hidden', marginTop: '2px',
              }}>
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--md-sys-color-on-primary-container)' }}>
                    {(user?.display_name || user?.username || user?.email?.[0] || '?').charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              {/* Textarea + Button */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={t('comments.writeComment')}
                  rows={2}
                  style={{
                    width: '100%', padding: '0', border: 'none', outline: 'none',
                    backgroundColor: 'transparent',
                    color: 'var(--md-sys-color-on-surface)',
                    fontSize: '14px', fontFamily: 'inherit', lineHeight: '20px',
                    resize: 'none', minHeight: '40px',
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  {content.trim() && (
                    <button
                      onClick={() => { setContent(''); textareaRef.current?.focus(); }}
                      style={{
                        height: '32px', padding: '0 14px', borderRadius: '16px',
                        border: '1px solid var(--md-sys-color-outline-variant)',
                        backgroundColor: 'transparent',
                        color: 'var(--md-sys-color-on-surface-variant)',
                        fontSize: '12px', fontWeight: 500, cursor: 'pointer',
                        fontFamily: 'inherit', transition: 'all 0.15s',
                      }}
                    >
                      {t('comments.cancel')}
                    </button>
                  )}
                  <button
                    onClick={handleSubmit}
                    disabled={!content.trim() || submitting}
                    style={{
                      height: '32px', padding: '0 18px', borderRadius: '16px',
                      border: 'none', fontSize: '12px', fontWeight: 600,
                      backgroundColor: content.trim() ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-surface-container-high)',
                      color: content.trim() ? 'var(--md-sys-color-on-primary)' : 'var(--md-sys-color-outline)',
                      cursor: content.trim() ? 'pointer' : 'default',
                      fontFamily: 'inherit', transition: 'all 0.2s',
                      display: 'flex', alignItems: 'center', gap: '6px',
                      opacity: submitting ? 0.7 : 1,
                    }}
                  >
                    {submitting ? (
                      <span className="material-symbols-outlined" style={{ fontSize: '15px', animation: 'spin 1s linear infinite' }}>
                        progress_activity
                      </span>
                    ) : (
                      <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>send</span>
                    )}
                    {submitting ? t('comments.posting') : t('comments.post')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{
          padding: '24px', borderRadius: '16px',
          backgroundColor: 'var(--md-sys-color-surface-container)',
          textAlign: 'center',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '28px', color: 'var(--md-sys-color-outline)', marginBottom: '8px', display: 'block' }}>
            lock
          </span>
          <p style={{ fontSize: '13px', color: 'var(--md-sys-color-on-surface-variant)', margin: 0 }}>
            {t('comments.loginRequired')}
          </p>
        </div>
      )}

      {/* Service Unavailable */}
      {serviceUnavailable && (
        <div style={{
          padding: '24px', borderRadius: '16px',
          backgroundColor: 'var(--md-sys-color-error-container)',
          display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '22px', color: 'var(--md-sys-color-on-error-container)' }}>
            error
          </span>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--md-sys-color-on-error-container)', margin: 0 }}>
              {t('serviceUnavailable.title')}
            </p>
            <p style={{ fontSize: '12px', color: 'var(--md-sys-color-on-error-container)', margin: '2px 0 0', opacity: 0.8 }}>
              {t('serviceUnavailable.description')}
            </p>
          </div>
          <button
            onClick={() => { setLoading(true); loadComments(); }}
            style={{
              height: '32px', padding: '0 14px', borderRadius: '16px',
              border: '1px solid var(--md-sys-color-on-error-container)',
              backgroundColor: 'transparent',
              color: 'var(--md-sys-color-on-error-container)',
              fontSize: '12px', fontWeight: 500, cursor: 'pointer',
              fontFamily: 'inherit', flexShrink: 0,
            }}
          >
            {t('serviceUnavailable.retry')}
          </button>
        </div>
      )}

      {/* Comments List */}
      {!serviceUnavailable && loading ? (
        <div style={{ padding: '32px', textAlign: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '24px', color: 'var(--md-sys-color-outline)', animation: 'spin 1s linear infinite' }}>
            progress_activity
          </span>
        </div>
      ) : !serviceUnavailable && sortedComments.length === 0 ? (
        <div style={{
          padding: '40px', textAlign: 'center',
          borderRadius: '16px',
          backgroundColor: 'var(--md-sys-color-surface-container)',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '40px', color: 'var(--md-sys-color-outline)', marginBottom: '12px', display: 'block', opacity: 0.5 }}>
            forum
          </span>
          <p style={{ fontSize: '13px', color: 'var(--md-sys-color-outline)', margin: 0 }}>
            {t('comments.noComments')}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {sortedComments.map((comment, index) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              isOwner={user?.id === comment.user_id}
              animStyle={getItemStyle(index)}
              onEdit={(content) => {
                setEditingId(comment.id);
                setEditContent(content);
              }}
              onDelete={() => handleDelete(comment.id)}
              onSaveEdit={() => handleEdit(comment.id)}
              onCancelEdit={() => {
                setEditingId(null);
                setEditContent('');
              }}
              editContent={editContent}
              setEditContent={setEditContent}
              isEditing={editingId === comment.id}
              formatDate={formatDate}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface CommentItemProps {
  comment: Comment;
  isOwner: boolean;
  animStyle: React.CSSProperties;
  onEdit: (content: string) => void;
  onDelete: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  editContent: string;
  setEditContent: (content: string) => void;
  isEditing: boolean;
  formatDate: (dateStr: string) => string;
  t: (key: string, params?: Record<string, string>) => string;
}

function CommentItem({
  comment,
  isOwner,
  animStyle,
  onEdit,
  onDelete,
  onSaveEdit,
  onCancelEdit,
  editContent,
  setEditContent,
  isEditing,
  formatDate,
  t,
}: CommentItemProps) {
  const [showActions, setShowActions] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div
      style={{
        ...animStyle,
        position: 'relative',
        borderRadius: '16px',
        overflow: 'hidden',
        backgroundColor: 'var(--md-sys-color-surface-container-low)',
        border: '1px solid var(--md-sys-color-outline-variant)',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false);
        setConfirmDelete(false);
      }}
    >
      {/* Banner Background */}
      {comment.user_banner_url && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '100%',
          backgroundImage: `url(${comment.user_banner_url})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
          opacity: 0.12,
          filter: 'blur(1px)',
          pointerEvents: 'none',
        }} />
      )}

      {/* Content Overlay */}
      <div style={{ position: 'relative', padding: '16px 18px' }}>
        {/* User Info Row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
          {/* Avatar */}
          <div style={{
            width: '34px', height: '34px', borderRadius: '50%',
            backgroundColor: 'var(--md-sys-color-primary-container)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, overflow: 'hidden',
            border: comment.user_avatar_url ? '2px solid var(--md-sys-color-primary)' : 'none',
          }}>
            {comment.user_avatar_url ? (
              <img src={comment.user_avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--md-sys-color-on-primary-container)' }}>
                {(comment.user_name || '?').charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                fontSize: '13px', fontWeight: 600,
                color: 'var(--md-sys-color-on-surface)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {comment.user_name}
              </span>
              <span style={{
                fontSize: '11px', color: 'var(--md-sys-color-outline)',
                flexShrink: 0,
              }}>
                {formatDate(comment.created_at)}
              </span>
            </div>
          </div>

          {/* Actions */}
          {isOwner && showActions && !isEditing && (
            <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
              <button
                onClick={() => onEdit(comment.content)}
                style={{
                  width: '28px', height: '28px', borderRadius: '8px',
                  border: 'none', cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  backgroundColor: 'var(--md-sys-color-surface-container-high)',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--md-sys-color-primary-container)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--md-sys-color-surface-container-high)'; }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '15px', color: 'var(--md-sys-color-on-surface-variant)' }}>
                  edit
                </span>
              </button>
              <button
                onClick={() => confirmDelete ? onDelete() : setConfirmDelete(true)}
                style={{
                  width: '28px', height: '28px', borderRadius: '8px',
                  border: 'none', cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  backgroundColor: confirmDelete ? 'var(--md-sys-color-error)' : 'var(--md-sys-color-surface-container-high)',
                  transition: 'all 0.15s',
                }}
              >
                <span className="material-symbols-outlined" style={{
                  fontSize: '15px',
                  color: confirmDelete ? 'var(--md-sys-color-on-error)' : 'var(--md-sys-color-on-surface-variant)',
                }}>
                  {confirmDelete ? 'check' : 'delete'}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Comment Text */}
        {isEditing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={3}
              autoFocus
              style={{
                width: '100%', padding: '10px 14px', borderRadius: '10px',
                border: '1px solid var(--md-sys-color-primary)',
                backgroundColor: 'var(--md-sys-color-surface)',
                color: 'var(--md-sys-color-on-surface)',
                fontSize: '13px', fontFamily: 'inherit', outline: 'none',
                resize: 'vertical', minHeight: '60px',
              }}
            />
            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
              <button
                onClick={onCancelEdit}
                style={{
                  height: '28px', padding: '0 12px', borderRadius: '14px',
                  border: '1px solid var(--md-sys-color-outline-variant)',
                  backgroundColor: 'transparent',
                  color: 'var(--md-sys-color-on-surface-variant)',
                  fontSize: '12px', fontWeight: 500, cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {t('comments.cancel')}
              </button>
              <button
                onClick={onSaveEdit}
                disabled={!editContent.trim()}
                style={{
                  height: '28px', padding: '0 12px', borderRadius: '14px',
                  border: 'none',
                  backgroundColor: editContent.trim() ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-surface-container-high)',
                  color: editContent.trim() ? 'var(--md-sys-color-on-primary)' : 'var(--md-sys-color-outline)',
                  fontSize: '12px', fontWeight: 500, cursor: editContent.trim() ? 'pointer' : 'default',
                  fontFamily: 'inherit',
                }}
              >
                {t('comments.save')}
              </button>
            </div>
          </div>
        ) : (
          <p style={{
            fontSize: '14px', color: 'var(--md-sys-color-on-surface-variant)',
            lineHeight: '22px', margin: 0,
          }}>
            {comment.content}
          </p>
        )}
      </div>
    </div>
  );
}
