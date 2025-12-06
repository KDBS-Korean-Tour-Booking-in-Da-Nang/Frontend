import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../../contexts/AuthContext';
import { useToast } from '../../../../contexts/ToastContext';
import { API_ENDPOINTS, getImageUrl, createAuthFormHeaders, FrontendURL, normalizeToRelativePath } from '../../../../config/api';
import { checkAndHandle401 } from '../../../../utils/apiErrorHandler';
import { X, Image, Loader2 } from 'lucide-react';
import styles from './EditPostModal.module.css';

const EditPostModal = ({ isOpen, onClose, onPostUpdated, post }) => {
  const { t } = useTranslation();
  const { user, getToken } = useAuth();
  const { showSuccess, showBatch } = useToast();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [hashtags, setHashtags] = useState([]);
  const [hashtagInput, setHashtagInput] = useState('');
  const [tagSuggestions, setTagSuggestions] = useState([]);
  const [showTagSuggest, setShowTagSuggest] = useState(false);
  const suggestTimerRef = useRef(null);
  const [images, setImages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const choosingTagRef = useRef(false);
  const [linkPreview, setLinkPreview] = useState(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // Load edit data when post changes or modal opens
  useEffect(() => {
    if (isOpen && post) {
      setTitle(post.title || '');
      setContent(post.content || '');
      setHashtags(post.hashtags?.map(h => h.content) || []);
      
      // Load existing images
      if (post.images && post.images.length > 0) {
        const existingImages = post.images.map(img => 
          getImageUrl(img.imgPath)
        );
        setImages(existingImages);
      } else {
        setImages([]);
      }
      
      // Load existing preview from metadata if available
      // Always check and load preview when modal opens with a post
      if (post.metadata && post.metadata.linkType === 'TOUR') {
        setLinkPreview({
          type: post.metadata.linkType,
          id: post.metadata.linkRefId,
          title: post.metadata.title,
          summary: post.metadata.summary,
          thumbnailUrl: post.metadata.thumbnailUrl,
          linkUrl: post.metadata.linkUrl
        });
        previewFromMetadataRef.current = true; // Mark that preview came from metadata
      } else {
        setLinkPreview(null);
        previewFromMetadataRef.current = false;
      }
      setHashtagInput('');
    }
  }, [post, isOpen]);

  const commitTag = (raw) => {
    const cleaned = (raw || '')
      .replace(/^#+/, '') // remove leading #
      .replace(/[,\s]+/g, ' ') // collapse delimiters
      .trim()
      .toLowerCase();
    if (!cleaned) return;
    if (!hashtags.includes(cleaned)) setHashtags([...hashtags, cleaned]);
    setHashtagInput('');
    setShowTagSuggest(false);
  };

  const handleHashtagInput = (e) => {
    const keys = ['Enter', ' ', 'Spacebar', ','];
    if (keys.includes(e.key)) {
      e.preventDefault();
      commitTag(hashtagInput);
    }
  };

  const removeHashtag = (tagToRemove) => {
    setHashtags(hashtags.filter(tag => tag !== tagToRemove));
  };

  // fetch hashtag suggestions (debounced)
  useEffect(() => {
    const q = hashtagInput.trim();
    if (!q) {
      setTagSuggestions([]);
      setShowTagSuggest(false);
      return;
    }
    if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current);
    suggestTimerRef.current = setTimeout(async () => {
      try {
        let res = await fetch(`${API_ENDPOINTS.HASHTAGS_SEARCH}?keyword=${encodeURIComponent(q)}&limit=8`);
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
        // fallback: hide suggestions
        setTagSuggestions([]);
        setShowTagSuggest(false);
      }
    }, 250);
    return () => suggestTimerRef.current && clearTimeout(suggestTimerRef.current);
  }, [hashtagInput, hashtags]);

  const chooseTag = (t) => {
    const tag = (t || '').toLowerCase();
    if (tag && !hashtags.includes(tag)) setHashtags([...hashtags, tag]);
    setHashtagInput('');
    setShowTagSuggest(false);
    choosingTagRef.current = false;
  };

  // Function to detect and fetch link preview
  const detectAndFetchPreview = async (text) => {
    if (!text) return;
    
    // Check for tour links - support both old format /tour/123 and new format /tour/detail?id=123
    // Supports: full URL (with domain), relative path, or just the path part
    const escapedBase = FrontendURL.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    // Match format 1: /tour/123 or http://domain/tour/123
    const tourRegexOld = new RegExp(`(?:https?://[^\\s/]+)?(?:${escapedBase})?/tour/(\\d+)(?:[\\s\\?&#]|$)`, 'i');
    // Match format 2: /tour/detail?id=123 or http://domain/tour/detail?id=123
    const tourRegexNew = new RegExp(`(?:https?://[^\\s/]+)?(?:${escapedBase})?/tour/detail[?&]id=(\\d+)(?:[\\s&#]|$)`, 'i');
    const tourMatchOld = text.match(tourRegexOld);
    const tourMatchNew = text.match(tourRegexNew);
    const tourMatch = tourMatchNew || tourMatchOld;
    
    if (tourMatch) {
      const tourId = tourMatch[1];
      setIsLoadingPreview(true);
      try {
        const response = await fetch(API_ENDPOINTS.TOUR_PREVIEW_BY_ID(tourId));
        if (response.ok) {
          const preview = await response.json();
          // Normalize thumbnailUrl về relative path để không lưu BaseURL vào metadata
          const rawThumbnail = preview.thumbnailUrl || preview.tourImgPath;
          setLinkPreview({
            type: 'TOUR',
            id: tourId,
            title: preview.title || preview.tourName,
            summary: preview.summary || preview.tourDescription,
            thumbnailUrl: normalizeToRelativePath(rawThumbnail),
            linkUrl: `${FrontendURL}/tour/detail?id=${tourId}`
          });
          previewFromMetadataRef.current = false; // This preview is from content detection, not metadata
        } else {
          setLinkPreview(null);
          previewFromMetadataRef.current = false;
        }
      } catch (error) {
        // Silently handle error fetching tour preview
        setLinkPreview(null);
        previewFromMetadataRef.current = false;
      } finally {
        setIsLoadingPreview(false);
      }
    } else {
      setLinkPreview(null);
      previewFromMetadataRef.current = false;
    }
  };

  // Function to check if content contains any links
  const hasLinksInContent = (text) => {
    if (!text) return false;
    // Check for any HTTP/HTTPS links
    const urlRegex = /https?:\/\/[^\s]+/gi;
    return urlRegex.test(text);
  };

  // Track if preview was loaded from metadata to prevent override
  const previewFromMetadataRef = useRef(false);

  // Debounced preview detection
  useEffect(() => {
    if (!isOpen) return;
    
    const timer = setTimeout(() => {
      // If preview was loaded from metadata and content hasn't changed significantly,
      // don't override it. Only detect new preview if content actually changed.
      if (previewFromMetadataRef.current && linkPreview) {
        // Check if content still contains the tour link
        const escapedBase = FrontendURL.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
        const tourRegexOld = new RegExp(`(?:https?://[^\\s/]+)?(?:${escapedBase})?/tour/(\\d+)(?:[\\s\\?&#]|$)`, 'i');
        const tourRegexNew = new RegExp(`(?:https?://[^\\s/]+)?(?:${escapedBase})?/tour/detail[?&]id=(\\d+)(?:[\\s&#]|$)`, 'i');
        const hasTourLink = tourRegexOld.test(content) || tourRegexNew.test(content);
        
        if (!hasTourLink) {
          setLinkPreview(null);
          previewFromMetadataRef.current = false;
        }
        // If link still exists, keep the metadata preview
      } else {
        // No preview from metadata, detect from content
        detectAndFetchPreview(content);
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [content, isOpen]);

  const removeLinkPreview = () => {
    setLinkPreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Collect all validation errors
    const errors = [];
    
    if (!title.trim()) {
      errors.push('Tiêu đề bài viết là bắt buộc');
    }
    
    if (!content.trim()) {
      errors.push('Nội dung bài viết là bắt buộc');
    }
    
    // Show all errors if any
    if (errors.length > 0) {
      showBatch(errors, 'error', 5000);
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('userEmail', user.email);
      formData.append('title', title.trim());
      formData.append('content', content.trim());
      
      hashtags.forEach(tag => {
        formData.append('hashtags', tag);
      });

      // Add link preview metadata if available
      if (linkPreview) {
        // Normalize thumbnailUrl để đảm bảo không lưu BaseURL vào database
        formData.append('metadata', JSON.stringify({
          linkType: linkPreview.type,
          linkRefId: linkPreview.id,
          title: linkPreview.title,
          summary: linkPreview.summary,
          thumbnailUrl: normalizeToRelativePath(linkPreview.thumbnailUrl),
          linkUrl: linkPreview.linkUrl
        }));
      }

      const url = API_ENDPOINTS.POST_BY_ID(post.forumPostId);
      const token = getToken();
      const headers = createAuthFormHeaders(token);

      const response = await fetch(url, {
        method: 'PUT',
        headers,
        body: formData,
      });

      // Handle 401 if token expired
      if (!response.ok && response.status === 401) {
        await checkAndHandle401(response);
        return;
      }

      if (response.ok) {
        const result = await response.json();
        
        // Ensure metadata is properly set if we had a link preview
        if (linkPreview && !result.metadata) {
          // Normalize thumbnailUrl để đảm bảo không lưu BaseURL vào database
          result.metadata = {
            linkType: linkPreview.type,
            linkRefId: linkPreview.id,
            title: linkPreview.title,
            summary: linkPreview.summary,
            thumbnailUrl: normalizeToRelativePath(linkPreview.thumbnailUrl),
            linkUrl: linkPreview.linkUrl
          };
        }
        
        // Call onPostUpdated with the updated post
        onPostUpdated(result);
        showSuccess('toast.forum.post_update_success');
        onClose();
        resetForm();
      } else {
        const errorText = await response.text();
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
        }
        
        throw new Error(errorData.message || 'Failed to update post');
      }
    } catch (error) {
      // Error updating post - handled in UI or silently
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setContent('');
    setHashtags([]);
    setImages([]);
    setHashtagInput('');
    setLinkPreview(null);
  };

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setLinkPreview(null);
      previewFromMetadataRef.current = false;
    }
  }, [isOpen]);

  if (!isOpen || !post) return null;

  return (
    <div className={styles['edit-post-modal-overlay']}>
      <div className={styles['edit-post-modal']}>
        <div className={styles['edit-post-modal-header']}>
          <h2>{t('forum.createPost.editTitle')}</h2>
          <button className={styles['close-btn']} onClick={onClose}>
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className={styles['edit-post-form']}>
          <div className={styles['form-content-wrapper']}>
          <div className={styles['form-group']}>
            <input
              type="text"
              placeholder={t('forum.createPost.titlePlaceholder')}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={styles['title-input']}
            />
          </div>

          <div className={styles['form-group']}>
            <textarea
              placeholder={t('forum.createPost.contentPlaceholder')}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className={styles['content-input']}
              rows="4"
            />
            
            {/* Render content with clickable links */}
            {content && (
              <div className={styles['content-preview']}>
                {content.split(/(\s+)/).map((part, index) => {
                  const isUrl = /^https?:\/\/.+/.test(part.trim());
                  if (isUrl) {
                    return (
                      <a 
                        key={index}
                        href={part.trim()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles['content-link']}
                      >
                        {part}
                      </a>
                    );
                  }
                  return <span key={index}>{part}</span>;
                })}
              </div>
            )}
            
            {/* Link Preview */}
            {isLoadingPreview && (
              <div className={styles['preview-loading']}>
                <Loader2 size={16} strokeWidth={1.5} className={styles['loading-icon']} />
                <span>Đang tải preview...</span>
              </div>
            )}
            
            {linkPreview && (
              <div className={styles['link-preview']}>
                <div className={styles['preview-header']}>
                  <span className={styles['preview-label']}>Preview:</span>
                  <button
                    type="button"
                    onClick={removeLinkPreview}
                    className={styles['remove-preview-btn']}
                  >
                    <X size={16} strokeWidth={1.5} />
                  </button>
                </div>
                <div 
                  className={styles['preview-card']}
                  onClick={() => window.open(linkPreview.linkUrl, '_blank')}
                >
                  <div className={styles['preview-thumb']}>
                    <img 
                      src={getImageUrl(linkPreview.thumbnailUrl)} 
                      alt={linkPreview.title}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                    <div className={styles['preview-thumb-placeholder']} style={{ display: 'none' }}>
                      <Image size={40} strokeWidth={1.5} />
                    </div>
                  </div>
                  <div className={styles['preview-meta']}>
                    <div className={styles['preview-title']}>{linkPreview.title}</div>
                    <div className={styles['preview-desc']}>{linkPreview.summary}</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className={styles['form-group']}>
            <div className={styles['hashtag-input-container']}>
              <input
                type="text"
                placeholder={t('forum.createPost.hashtagsPlaceholder')}
                value={hashtagInput}
                onChange={(e) => setHashtagInput(e.target.value)}
                onKeyDown={handleHashtagInput}
                onBlur={() => { if (!choosingTagRef.current) commitTag(hashtagInput); else choosingTagRef.current = false; }}
                className={styles['hashtag-input']}
                onFocus={() => tagSuggestions.length > 0 && setShowTagSuggest(true)}
              />
              {showTagSuggest && tagSuggestions.length > 0 && (
                <div className={styles['tag-suggest']}>
                  {tagSuggestions.map((t, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className={styles['tag-suggest-item']}
                      onMouseDown={() => { choosingTagRef.current = true; }}
                      onClick={() => chooseTag(t)}
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
                      onClick={() => removeHashtag(tag)}
                      className={styles['remove-hashtag']}
                    >
                      <X size={12} strokeWidth={2} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className={styles['form-group']}>
            {images.length > 0 && (
              <div className={styles['existing-images-section']}>
                <h4>{t('forum.createPost.imagesLabel')}:</h4>
                <div className={styles['image-preview']}>
                  {images.map((image, index) => (
                    <div key={index} className={styles['image-item']}>
                      <img src={image} alt={`Current image ${index + 1}`} />
                    </div>
                  ))}
                </div>
                <p className={styles['image-note']}>* {t('forum.createPost.errors.imageEditNote')}</p>
              </div>
            )}
          </div>
          </div>

          <div className={styles['form-actions']}>
            <button
              type="button"
              onClick={onClose}
              className={styles['cancel-btn']}
              disabled={isLoading}
            >
              {t('forum.createPost.cancel')}
            </button>
            <button
              type="submit"
              className={styles['submit-btn']}
              disabled={isLoading}
            >
              {isLoading ? t('forum.createPost.updating') : t('forum.createPost.update')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditPostModal;

