import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../../contexts/AuthContext';
import { useToast } from '../../../../contexts/ToastContext';
import { API_ENDPOINTS, getImageUrl, createAuthFormHeaders, createAuthHeaders, FrontendURL } from '../../../../config/api';
import styles from './PostModal.module.css';

const PostModal = ({ isOpen, onClose, onPostCreated, editPost = null }) => {
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

  // Load edit data when editPost changes
  useEffect(() => {
    if (editPost) {
      setTitle(editPost.title || '');
      setContent(editPost.content || '');
      setHashtags(editPost.hashtags?.map(h => h.content) || []);
      
      // Load existing images
      if (editPost.images && editPost.images.length > 0) {
        const existingImages = editPost.images.map(img => 
          getImageUrl(img.imgPath)
        );
        setImages(existingImages);
        setImageFiles([]); // No new files when editing
      } else {
        setImages([]);
        setImageFiles([]);
      }
    } else {
      // Reset form for new post
      setTitle('');
      setContent('');
      setHashtags([]);
      setImages([]);
      setImageFiles([]);
    }
    setHashtagInput('');
  }, [editPost]);

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
    
    // Check for tour links
    const tourRegex = new RegExp(`(?:${FrontendURL.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')})?/tour/(\\d+)`, 'i');
    const tourMatch = text.match(tourRegex);
    
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
            linkUrl: `${FrontendURL}/tour/${tourId}`
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
    const tourRegex = new RegExp(`(?:${FrontendURL.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')})?/tour/(\\d+)`, 'i');
    return tourRegex.test(text);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Collect all validation errors
    const errors = [];
    
    // Check if content contains only links (no other text)
    const hasOnlyLinks = content.trim().split(/\s+/).every(part => {
      const trimmed = part.trim();
      return !trimmed || /^https?:\/\/.+/.test(trimmed);
    });
    
    // If content has only links, title is not required
    if (!hasOnlyLinks && !title.trim()) {
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
        formData.append('metadata', JSON.stringify({
          linkType: linkPreview.type,
          linkRefId: linkPreview.id,
          title: linkPreview.title,
          summary: linkPreview.summary,
          thumbnailUrl: linkPreview.thumbnailUrl,
          linkUrl: linkPreview.linkUrl
        }));
      }
      
      // Only append new image files when creating new post and no links in content
      if (!editPost && !hasLinksInContent(content)) {
        imageFiles.forEach(file => {
          formData.append('images', file);
        });
      }

      const url = editPost 
        ? API_ENDPOINTS.POST_BY_ID(editPost.forumPostId)
        : API_ENDPOINTS.POSTS;
      
      const method = editPost ? 'PUT' : 'POST';

      const token = getToken();
      const headers = createAuthFormHeaders(token);

      const response = await fetch(url, {
        method: method,
        headers,
        body: formData,
      });

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
        if (!editPost && imageFiles.length > 0 && !hasLinksInContent(content) && (!result.images || result.images.length === 0)) {
          try {
            const token = getToken();
            const headers = createAuthHeaders(token);
            const fetchResponse = await fetch(API_ENDPOINTS.POST_BY_ID(result.forumPostId), {
              headers
            });
            if (fetchResponse.ok) {
              const fetchedPost = await fetchResponse.json();
              if (fetchedPost.images && fetchedPost.images.length > 0) {
                result.images = fetchedPost.images;
              }
            }
          } catch (fetchError) {
            console.error('Error fetching post after creation:', fetchError);
          }
        }

        if (editPost) {
          // Call onPostCreated with the updated post for edit mode
          onPostCreated(result);
          showSuccess('toast.forum.post_update_success');
        } else {
          // Call onPostCreated with the new post for create mode
          onPostCreated(result);
          showSuccess('toast.forum.post_create_success');
        }
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
        
        throw new Error(errorData.message || (editPost ? 'Failed to update post' : 'Failed to create post'));
      }
    } catch (error) {
      console.error('Error creating/updating post:', error);
      showError(editPost ? 'toast.forum.post_update_failed' : 'toast.forum.post_create_failed');
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

  if (!isOpen) return null;

  return (
    <div className={styles['post-modal-overlay']}>
      <div className={styles['post-modal']}>
        <div className={styles['post-modal-header']}>
          <h2>{editPost ? t('forum.createPost.editTitle') : t('forum.createPost.title')}</h2>
          <button className={styles['close-btn']} onClick={onClose}>&times;</button>
        </div>
        
        <form onSubmit={handleSubmit} className={styles['post-form']}>
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
                <div className={styles['loading-spinner']}></div>
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
                    ×
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
                      🏞️
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
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className={styles['form-group']}>
            {!editPost && !hasLinksInContent(content) && (
              <div className={styles['image-upload-section']}>
                <button
                  type="button"
                  onClick={() => fileInputRef.current.click()}
                  className={styles['upload-btn']}
                >
                  📷 {t('forum.createPost.addImages')}
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
            
            {!editPost && hasLinksInContent(content) && (
              <div className={styles['image-upload-disabled']}>
                <p className={styles['disabled-message']}>
                  📷 {t('forum.createPost.imageUploadDisabled')}
                </p>
                <p className={styles['disabled-reason']}>
                  {t('forum.createPost.imageUploadDisabledReason')}
                </p>
              </div>
            )}
            
            {editPost && images.length > 0 && (
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
            
            {!editPost && images.length > 0 && !hasLinksInContent(content) && (
              <div className={styles['image-preview']}>
                {images.map((image, index) => (
                  <div key={index} className={styles['image-item']}>
                    <img src={image} alt={`Preview ${index + 1}`} />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className={styles['remove-image']}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {!editPost && images.length > 0 && hasLinksInContent(content) && (
              <div className={styles['image-preview-disabled']}>
                <p className={styles['disabled-message']}>
                  🖼️ {t('forum.createPost.existingImagesRemoved')}
                </p>
                <p className={styles['disabled-reason']}>
                  {t('forum.createPost.existingImagesRemovedReason')}
                </p>
              </div>
            )}
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
              {isLoading ? (editPost ? t('forum.createPost.updating') : t('forum.createPost.submitting')) : (editPost ? t('forum.createPost.update') : t('forum.createPost.submit'))}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PostModal;
