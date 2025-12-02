import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { X, Share2, Hash } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { API_ENDPOINTS, createAuthFormHeaders, getTourImageUrl, FrontendURL } from '../../../config/api';
import styles from './ShareTourModal.module.css';

const ShareTourModal = ({ isOpen, onClose, tourId, onShared }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, getToken } = useAuth();
  // Removed showError - errors will be handled in UI

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
          setPreview({
            title: data.tourName || '',
            summary: data.tourDescription || '',
            thumbnailUrl: getTourImageUrl(data.tourImgPath || data.thumbnailUrl),
            linkUrl: `${FrontendURL}/tour/detail?id=${tourId}`
          });
        }
      } catch (e) {
        // Error creating post - handled silently or in UI
      }
    })();
    
    return () => {
      isMounted = false;
    };
  }, [isOpen, tourId]);

  // Hashtag suggestions (debounced) like PostModal
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
      } catch (e) {
        setTagSuggestions([]);
        setShowTagSuggest(false);
      }
    }, 250);
    return () => suggestTimerRef.current && clearTimeout(suggestTimerRef.current);
  }, [hashtagInput, hashtags]);

  // Resolve portal container once on mount
  useEffect(() => {
    if (!modalContainerRef.current) {
      const root = typeof document !== 'undefined' ? document.getElementById('modal-root') : null;
      modalContainerRef.current = root || (typeof document !== 'undefined' ? document.body : null);
    }
  }, []);

  // Lock body scroll while open
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
      // User not logged in - handled by LoginRequiredModal
      return;
    }
    try {
      setLoading(true);
      const token = getToken();
      const formData = new FormData();
      formData.append('userEmail', user.email);
      // Body: caption + linkUrl (để FE nhận diện và render preview), FE sẽ ẩn dòng link khi hiển thị
      formData.append('title', '');
      const parts = [];
      if ((caption || '').trim()) parts.push((caption || '').trim());
      if ((preview?.linkUrl || '').trim()) parts.push(preview.linkUrl.trim());
      const content = parts.join('\n');
      formData.append('content', content || ' ');
      // Append hashtags like Post modal
      hashtags.forEach(tag => {
        formData.append('hashtags', tag);
      });
      // Embed link metadata into content fields so backend stores them as normal post
      formData.append('metadata', JSON.stringify({
        linkType: 'TOUR',
        linkRefId: String(tourId),
        title: preview?.title || '',
        summary: preview?.summary || '',
        thumbnailUrl: preview?.thumbnailUrl || '',
        linkUrl: preview?.linkUrl || ''
      }));

      // Download thumbnail and append as file if available
      if (preview?.thumbnailUrl) {
        try {
          const imgRes = await fetch(preview.thumbnailUrl);
          const blob = await imgRes.blob();
          const file = new File([blob], 'thumbnail.jpg', { type: blob.type || 'image/jpeg' });
          formData.append('imageUrls', file);
        } catch (e) {
          // Failed to fetch thumbnail, continue without image
        }
      }

      const headers = createAuthFormHeaders(token);
      const res = await fetch(API_ENDPOINTS.POSTS, { method: 'POST', headers, body: formData });
      if (!res.ok) throw new Error('create post failed');
      const post = await res.json();
      
      // Call onShared callback if provided
      onShared && onShared(post);
      
      // Close modal
      onClose && onClose();
      
      // Navigate to forum after a short delay to ensure modal closes smoothly
      setTimeout(() => {
        navigate('/forum');
      }, 100);
    } catch (e) {
      // Error creating post - handled silently or in UI
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
                    src={preview.thumbnailUrl} 
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
            className={styles['caption']}
            rows={4}
            placeholder={t('forum.shareTour.captionPlaceholder') || 'Viết cảm nghĩ của bạn...'}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />
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
                    const cleaned = (raw || '').replace(/^#+/, '').replace(/[\,\s]+/g, ' ').trim().toLowerCase();
                    if (cleaned && !hashtags.includes(cleaned)) {
                      setHashtags([...hashtags, cleaned]);
                    }
                    setHashtagInput('');
                    setShowTagSuggest(false);
                  }
                }}
                onBlur={() => { if (!choosingTagRef.current) {
                  const raw = hashtagInput;
                  const cleaned = (raw || '').replace(/^#+/, '').replace(/[\,\s]+/g, ' ').trim().toLowerCase();
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


