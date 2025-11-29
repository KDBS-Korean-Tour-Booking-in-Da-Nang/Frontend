import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../../contexts/AuthContext';
import { useToast } from '../../../../contexts/ToastContext';
import { API_ENDPOINTS, getImageUrl, createAuthFormHeaders, createAuthHeaders, FrontendURL } from '../../../../config/api';
import { checkAndHandle401 } from '../../../../utils/apiErrorHandler';
import { X, Image, Hash, Loader2, Link2, XCircle } from 'lucide-react';
import styles from './PostModal.module.css';

const PostModal = ({ isOpen, onClose, onPostCreated }) => {
  const { t } = useTranslation();
  const { user, getToken } = useAuth();
  const { showError, showSuccess, showBatch } = useToast();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [hashtags, setHashtags] = useState([]);
  const [hashtagInput, setHashtagInput] = useState('');
  const [tagSuggestions, setTagSuggestions] = useState([]);
  const [showTagSuggest, setShowTagSuggest] = useState(false);
  const suggestTimerRef = useRef(null);
  const [images, setImages] = useState([]);
  const [imageFiles, setImageFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef(null);
  const choosingTagRef = useRef(false);
  const [linkPreview, setLinkPreview] = useState(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setContent('');
      setHashtags([]);
      setImages([]);
      setImageFiles([]);
      setLinkPreview(null);
      setHashtagInput('');
    }
  }, [isOpen]);

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

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    const newImages = [];
    const newImageFiles = [];

    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          newImages.push(e.target.result);
          newImageFiles.push(file);
          if (newImages.length === files.length) {
            setImages(prev => [...prev, ...newImages]);
            setImageFiles(prev => [...prev, ...newImageFiles]);
          }
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const removeImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
    setImageFiles(imageFiles.filter((_, i) => i !== index));
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
          setLinkPreview({
            type: 'TOUR',
            id: tourId,
            title: preview.title || preview.tourName,
            summary: preview.summary || preview.tourDescription,
            thumbnailUrl: preview.thumbnailUrl || preview.tourImgPath,
            linkUrl: `${FrontendURL}/tour/detail?id=${tourId}`
          });
        } else {
          setLinkPreview(null);
        }
      } catch (error) {
        console.error('Error fetching tour preview:', error);
        setLinkPreview(null);
      } finally {
        setIsLoadingPreview(false);
      }
    } else {
      setLinkPreview(null);
    }
  };

  // Function to check if content contains any links
  const hasLinksInContent = (text) => {
    if (!text) return false;
    // Check for any HTTP/HTTPS links
    const urlRegex = /https?:\/\/[^\s]+/gi;
    return urlRegex.test(text);
  };

  // Function to check if content contains tour links
  const hasTourLinksInContent = (text) => {
    if (!text) return false;
    const escapedBase = FrontendURL.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    // Match format 1: /tour/123 or http://domain/tour/123
    const tourRegexOld = new RegExp(`(?:https?://[^\\s/]+)?(?:${escapedBase})?/tour/(\\d+)(?:[\\s\\?&#]|$)`, 'i');
    // Match format 2: /tour/detail?id=123 or http://domain/tour/detail?id=123
    const tourRegexNew = new RegExp(`(?:https?://[^\\s/]+)?(?:${escapedBase})?/tour/detail[?&]id=(\\d+)(?:[\\s&#]|$)`, 'i');
    return tourRegexOld.test(text) || tourRegexNew.test(text);
  };

  // Debounced preview detection
  useEffect(() => {
    const timer = setTimeout(() => {
      detectAndFetchPreview(content);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [content]);

  // Auto-remove images when links are detected
  useEffect(() => {
    if (hasLinksInContent(content) && images.length > 0) {
      setImages([]);
      setImageFiles([]);
    }
  }, [content, images.length]);

  const removeLinkPreview = () => {
    setLinkPreview(null);
  };

  const trimmedTitle = title.trim();
  const trimmedContent = content.trim();
  const hasTitle = trimmedTitle.length > 0;
  const hasContent = trimmedContent.length > 0;
  const isSubmitDisabled = isLoading || (!hasTitle && !hasContent);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!hasTitle && !hasContent) {
      showBatch(['Nội dung hoặc tiêu đề không được để trống'], 'error', 5000);
      return;
    }
    
    // Collect all validation errors
    const errors = [];
    
    // Check if content contains only links (no other text)
    const hasOnlyLinks = hasContent && trimmedContent.split(/\s+/).every(part => {
      const trimmed = part.trim();
      return !trimmed || /^https?:\/\/.+/.test(trimmed);
    });
    
    // If content has only links, title is not required
    if (!hasOnlyLinks && !trimmedTitle) {
      errors.push('Tiêu đề bài viết là bắt buộc');
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
    formData.append('title', trimmedTitle);
    formData.append('content', hasContent ? trimmedContent : trimmedTitle);
      
      hashtags.forEach(tag => {
        formData.append('hashtags', tag);
      });

      // Add link preview metadata if available
      if (linkPreview) {
        formData.append('metadata', JSON.stringify({
          linkType: linkPreview.type,
          linkRefId: linkPreview.id,
          title: linkPreview.title,
          summary: linkPreview.summary,
          thumbnailUrl: linkPreview.thumbnailUrl,
          linkUrl: linkPreview.linkUrl
        }));
      }
      
      // Only append new image files when no links in content
      if (!hasLinksInContent(content)) {
        imageFiles.forEach(file => {
          formData.append('images', file);
        });
      }

      const token = getToken();
      const headers = createAuthFormHeaders(token);

      const response = await fetch(API_ENDPOINTS.POSTS, {
        method: 'POST',
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
        
        // Ensure images array exists and is properly formatted (only if no links in content)
        if (!result.images && imageFiles.length > 0 && !hasLinksInContent(content)) {
          // If backend didn't return images but we sent some, create a fallback
          result.images = imageFiles.map((file, index) => ({
            imgPath: `/uploads/posts/images/${Date.now()}_${index}_${file.name}`,
            // This is a fallback - in reality, backend should return the correct path
          }));
        }
        
        // Ensure metadata is properly set if we had a link preview
        if (linkPreview && !result.metadata) {
          result.metadata = {
            linkType: linkPreview.type,
            linkRefId: linkPreview.id,
            title: linkPreview.title,
            summary: linkPreview.summary,
            thumbnailUrl: linkPreview.thumbnailUrl,
            linkUrl: linkPreview.linkUrl
          };
        }
        
        // If we sent images but backend didn't return them, try to fetch the post again
        if (imageFiles.length > 0 && !hasLinksInContent(content) && (!result.images || result.images.length === 0)) {
          try {
            const token = getToken();
            const headers = createAuthHeaders(token);
            const fetchResponse = await fetch(API_ENDPOINTS.POST_BY_ID(result.forumPostId), {
              headers
            });
            
            // Handle 401 if token expired
            if (!fetchResponse.ok && fetchResponse.status === 401) {
              await checkAndHandle401(fetchResponse);
            } else if (fetchResponse.ok) {
              const fetchedPost = await fetchResponse.json();
              if (fetchedPost.images && fetchedPost.images.length > 0) {
                result.images = fetchedPost.images;
              }
            }
          } catch (fetchError) {
            console.error('Error fetching post after creation:', fetchError);
          }
        }

        // Call onPostCreated with the new post
          onPostCreated(result);
          showSuccess('toast.forum.post_create_success');
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
        
        throw new Error(errorData.message || 'Failed to create post');
      }
    } catch (error) {
      console.error('Error creating post:', error);
      showError('toast.forum.post_create_failed');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setContent('');
    setHashtags([]);
    setImages([]);
    setImageFiles([]);
    setHashtagInput('');
    setLinkPreview(null);
  };

  // Clear link preview when modal closes
  useEffect(() => {
    if (!isOpen) {
      setLinkPreview(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className={styles['post-modal-overlay']}>
      <div className={styles['post-modal']}>
        <div className={styles['post-modal-header']}>
          <h2>{t('forum.createPost.title')}</h2>
          <button className={styles['close-btn']} onClick={onClose}>
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className={styles['post-form']}>
          <div className={styles['form-content-wrapper']}>
          <div className={styles['form-group']}>
            <input
              type="text"
              placeholder={
                content.trim().split(/\s+/).every(part => {
                  const trimmed = part.trim();
                  return !trimmed || /^https?:\/\/.+/.test(trimmed);
                }) 
                  ? "Tiêu đề (không bắt buộc khi chỉ đăng link)" 
                  : t('forum.createPost.titlePlaceholder')
              }
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
            {!hasLinksInContent(content) && (
              <div className={styles['image-upload-section']}>
                <button
                  type="button"
                  onClick={() => fileInputRef.current.click()}
                  className={styles['upload-btn']}
                >
                  <Image size={18} strokeWidth={1.5} />
                  <span>{t('forum.createPost.addImages')}</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  style={{ display: 'none' }}
                />
              </div>
            )}
            
            {hasLinksInContent(content) && (
              <div className={styles['image-upload-disabled']}>
                <div className={styles['disabled-message']}>
                  <Image size={18} strokeWidth={1.5} />
                  <span>{t('forum.createPost.imageUploadDisabled')}</span>
                </div>
                <p className={styles['disabled-reason']}>
                  {t('forum.createPost.imageUploadDisabledReason')}
                </p>
              </div>
            )}
            
            {images.length > 0 && !hasLinksInContent(content) && (
              <div className={styles['image-preview']}>
                {images.map((image, index) => (
                  <div key={index} className={styles['image-item']}>
                    <img src={image} alt={`Preview ${index + 1}`} />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className={styles['remove-image']}
                    >
                      <X size={14} strokeWidth={2} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {images.length > 0 && hasLinksInContent(content) && (
              <div className={styles['image-preview-disabled']}>
                <div className={styles['disabled-message']}>
                  <Image size={18} strokeWidth={1.5} />
                  <span>{t('forum.createPost.existingImagesRemoved')}</span>
                </div>
                <p className={styles['disabled-reason']}>
                  {t('forum.createPost.existingImagesRemovedReason')}
                </p>
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
              disabled={isSubmitDisabled}
            >
              {isLoading ? t('forum.createPost.submitting') : t('forum.createPost.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PostModal;
