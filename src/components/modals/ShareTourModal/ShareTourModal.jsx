import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { X, Share2, Hash } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { API_ENDPOINTS, createAuthFormHeaders, getTourImageUrl, FrontendURL, normalizeToRelativePath } from '../../../config/api';
import styles from './ShareTourModal.module.css';

const ShareTourModal = ({ isOpen, onClose, tourId, onShared }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, getToken } = useAuth();
  const [errorMessage, setErrorMessage] = useState('');

  const [caption, setCaption] = useState('');
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hashtags, setHashtags] = useState([]);
  const [hashtagInput, setHashtagInput] = useState('');
  const [tagSuggestions, setTagSuggestions] = useState([]);
  const [showTagSuggest, setShowTagSuggest] = useState(false);
  const suggestTimerRef = useRef(null);
  const choosingTagRef = useRef(false);
  const modalContainerRef = useRef(null);
  const bodyOverflowRef = useRef('');

  useEffect(() => {
    if (!isOpen || !tourId) {
      setPreview(null);
      setHashtags([]);
      setHashtagInput('');
      setTagSuggestions([]);
      setShowTagSuggest(false);
      return;
    }
    
    let isMounted = true;
    (async () => {
      try {
        const res = await fetch(API_ENDPOINTS.TOUR_PREVIEW_BY_ID(tourId));
        if (!res.ok) throw new Error('Failed to load tour preview');
        const data = await res.json();
        
        if (isMounted) {
          const rawThumbnail = data.tourImgPath || data.thumbnailUrl;
          setPreview({
            title: data.tourName || '',
            summary: data.tourDescription || '',
            thumbnailUrl: normalizeToRelativePath(rawThumbnail),
            linkUrl: `${FrontendURL}/tour/detail?id=${tourId}`
          });
        }
      } catch {
        // Error handled silently
      }
    })();
    
    return () => {
      isMounted = false;
    };
  }, [isOpen, tourId]);

  // Gợi ý hashtag (debounced)
  useEffect(() => {
    const q = (hashtagInput || '').trim();
    if (!q) {
      setTagSuggestions([]);
      setShowTagSuggest(false);
      return;
    }
    if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current);
    suggestTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API_ENDPOINTS.HASHTAGS_SEARCH}?keyword=${encodeURIComponent(q)}&limit=8`);
        if (!res.ok) throw new Error('search fail');
        const data = await res.json();
        const items = (data || []).map(h => h.content || h);
        const filtered = items
          .map(s => (s || '').toLowerCase())
          .filter(s => s && s.startsWith(q.toLowerCase()))
          .filter(s => !hashtags.includes(s));
        setTagSuggestions(filtered);
        setShowTagSuggest(true);
      } catch {
        setTagSuggestions([]);
        setShowTagSuggest(false);
      }
    }, 250);
    return () => suggestTimerRef.current && clearTimeout(suggestTimerRef.current);
  }, [hashtagInput, hashtags]);

  // Xác định portal container khi component mount
  useEffect(() => {
    if (!modalContainerRef.current) {
      const root = typeof document !== 'undefined' ? document.getElementById('modal-root') : null;
      modalContainerRef.current = root || (typeof document !== 'undefined' ? document.body : null);
    }
  }, []);

  // Khóa scroll của body khi modal mở
  useEffect(() => {
    if (!modalContainerRef.current || typeof document === 'undefined') return;
    if (isOpen) {
      bodyOverflowRef.current = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = bodyOverflowRef.current || '';
      };
    }
  }, [isOpen]);

  const createPost = async () => {
    if (!user) {
      return;
    }
    try {
      setLoading(true);
      const token = getToken();
      const formData = new FormData();
      formData.append('userEmail', user.email);
      
      const title = preview?.title || t('forum.shareTour.title') || 'Chia sẻ tour';
      formData.append('title', title);
      
      const parts = [];
      if ((caption || '').trim()) parts.push((caption || '').trim());
      if ((preview?.linkUrl || '').trim()) parts.push(preview.linkUrl.trim());
      const content = parts.join('\n');
      formData.append('content', content.trim() || title);
      
      hashtags.forEach(tag => {
        formData.append('hashtags', tag);
      });
      
      formData.append('metadata', JSON.stringify({
        linkType: 'TOUR',
        linkRefId: String(tourId),
        title: preview?.title || '',
        summary: preview?.summary || '',
        thumbnailUrl: normalizeToRelativePath(preview?.thumbnailUrl || ''),
        linkUrl: preview?.linkUrl || ''
      }));

      if (preview?.thumbnailUrl) {
        try {
          const imageUrl = getTourImageUrl(preview.thumbnailUrl);
          const imgRes = await fetch(imageUrl);
          if (!imgRes.ok) throw new Error(`Failed to fetch image: ${imgRes.status}`);
          const blob = await imgRes.blob();
          const file = new File([blob], 'thumbnail.jpg', { type: blob.type || 'image/jpeg' });
          formData.append('images', file);
        } catch {
          // Failed to fetch thumbnail
        }
      }

      const headers = createAuthFormHeaders(token);
      const res = await fetch(API_ENDPOINTS.POSTS, { method: 'POST', headers, body: formData });
      
      if (!res.ok) {
        const errorText = await res.text();
        let errorMessage = t('toast.post.create_error') || 'Không thể chia sẻ tour. Vui lòng thử lại.';
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.message) {
            errorMessage = errorJson.message;
          }
        } catch {
          // If errorText is not JSON, use default message
        }
        setErrorMessage(errorMessage);
        throw new Error(`Failed to create post: ${res.status}`);
      }
      
      const post = await res.json();
      
      onShared && onShared(post);
      onClose && onClose();
      
      setTimeout(() => {
        navigate('/forum');
      }, 100);
    } catch (e) {
      if (!e.message || !e.message.includes('Failed to create post:')) {
        setErrorMessage(t('toast.post.create_error') || 'Không thể chia sẻ tour. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const modalNode = (
    <div className={styles['overlay']} onClick={onClose}>
      <div className={styles['modal']} onClick={(e) => e.stopPropagation()}> 
        <button className={styles['close']} onClick={onClose} aria-label="Close">
          <X size={20} strokeWidth={2} />
        </button>
        <div className={styles['header']}>
          <div className={styles['header-icon']}>
            <Share2 size={24} strokeWidth={1.5} />
          </div>
          <h3>{t('forum.shareTour.title') || 'Chia sẻ tour lên diễn đàn'}</h3>
        </div>
        <div className={styles['body']}>
          {preview ? (
            <div className={styles['preview-card']}>
              <div className={styles['thumb-wrap']}>
                {preview.thumbnailUrl ? (
                  <img 
                    src={getTourImageUrl(preview.thumbnailUrl)} 
                    alt={preview.title}
                    onError={(e) => {
                      e.target.src = '/default-Tour.jpg';
                    }}
                  />
                ) : (
                  <div className={styles['thumb-placeholder']}>No image</div>
                )}
              </div>
              <div className={styles['meta']}>
                <div className={styles['title']}>{preview.title}</div>
                <div className={styles['summary']}>{preview.summary}</div>
                <div className={styles['link']}>{preview.linkUrl}</div>
              </div>
            </div>
          ) : (
            <div className={styles['loading']}>Loading...</div>
          )}

          <textarea
            className={`${styles['caption']} ${errorMessage ? styles['caption-error'] : ''}`}
            rows={4}
            placeholder={t('forum.shareTour.captionPlaceholder') || 'Viết cảm nghĩ của bạn...'}
            value={caption}
            onChange={(e) => {
              setCaption(e.target.value);
              if (errorMessage) setErrorMessage('');
            }}
          />
          {errorMessage && (
            <span className={styles['error-message']}>{errorMessage}</span>
          )}
          {/* Hashtag input (below content) */}
          <div className={styles['hashtag-input-container']}>
            <div className={styles['hashtag-input-wrapper']}>
              <Hash size={18} strokeWidth={1.5} className={styles['hashtag-icon']} />
              <input
                type="text"
                placeholder={t('forum.createPost.hashtagsPlaceholder') || 'Thêm hashtag, nhấn Enter để thêm'}
                value={hashtagInput}
                onChange={(e) => setHashtagInput(e.target.value)}
                onKeyDown={(e) => {
                  const keys = ['Enter', ' ', 'Spacebar', ','];
                  if (keys.includes(e.key)) {
                    e.preventDefault();
                    const raw = hashtagInput;
                    const cleaned = (raw || '').replace(/^#+/, '').replace(/[, ]+/g, ' ').trim().toLowerCase();
                    if (cleaned && !hashtags.includes(cleaned)) {
                      setHashtags([...hashtags, cleaned]);
                    }
                    setHashtagInput('');
                    setShowTagSuggest(false);
                  }
                }}
                onBlur={() => { if (!choosingTagRef.current) {
                  const raw = hashtagInput;
                  const cleaned = (raw || '').replace(/^#+/, '').replace(/[, ]+/g, ' ').trim().toLowerCase();
                  if (cleaned && !hashtags.includes(cleaned)) setHashtags([...hashtags, cleaned]);
                  setHashtagInput('');
                  setShowTagSuggest(false);
                } else choosingTagRef.current = false; }}
                className={styles['hashtag-input']}
                onFocus={() => tagSuggestions.length > 0 && setShowTagSuggest(true)}
              />
            </div>
            {showTagSuggest && tagSuggestions.length > 0 && (
              <div className={styles['tag-suggest']}>
                {tagSuggestions.map((t, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={styles['tag-suggest-item']}
                    onMouseDown={() => { choosingTagRef.current = true; }}
                    onClick={() => {
                      const tag = (t || '').toLowerCase();
                      if (tag && !hashtags.includes(tag)) setHashtags([...hashtags, tag]);
                      setHashtagInput('');
                      setShowTagSuggest(false);
                      choosingTagRef.current = false;
                    }}
                  >
                    #{t}
                  </button>
                ))}
              </div>
            )}
          </div>
          {hashtags.length > 0 && (
            <div className={styles['hashtags-container']}>
              {hashtags.map((tag, index) => (
                <span key={index} className={styles['hashtag-chip']}>
                  #{tag}
                  <button
                    type="button"
                    onClick={() => setHashtags(hashtags.filter(h => h !== tag))}
                    className={styles['remove-hashtag']}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
        <div className={styles['footer']}>
          <button className={styles['cancel']} onClick={onClose} disabled={loading}>{t('common.cancel') || 'Hủy'}</button>
          <button className={styles['share']} onClick={createPost} disabled={loading || !preview}>{t('forum.shareTour.shareNow') || 'Chia sẻ'}</button>
        </div>
      </div>
    </div>
  );

  if (!modalContainerRef.current) return modalNode;
  return createPortal(modalNode, modalContainerRef.current);
};

export default ShareTourModal;


