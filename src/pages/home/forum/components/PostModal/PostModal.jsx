import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../../../contexts/AuthContext';
import { useToast } from '../../../../../contexts/ToastContext';
import { API_ENDPOINTS, getImageUrl, createAuthFormHeaders } from '../../../../../config/api';
import './PostModal.css';

const PostModal = ({ isOpen, onClose, onPostCreated, editPost = null }) => {
  const { t } = useTranslation();
  const { user, getToken } = useAuth();
  const { showError, showSuccess } = useToast();
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
      // Show all errors at the same time
      errors.forEach((error) => {
        showError(error);
      });
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
      
      // Only append new image files when creating new post
      if (!editPost) {
        imageFiles.forEach(file => {
          formData.append('imageUrls', file);
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
        if (editPost) {
          // Call onPostCreated with the updated post for edit mode
          onPostCreated(result);
          showSuccess('Cập nhật bài viết thành công!');
        } else {
          // Call onPostCreated with the new post for create mode
          onPostCreated(result);
          showSuccess('Tạo bài viết thành công!');
        }
        onClose();
        resetForm();
      } else {
        throw new Error(editPost ? 'Failed to update post' : 'Failed to create post');
      }
    } catch (error) {
      console.error('Error creating/updating post:', error);
      showError(editPost ? 'Cập nhật bài viết thất bại. Vui lòng thử lại.' : 'Tạo bài viết thất bại. Vui lòng thử lại.');
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
  };

  if (!isOpen) return null;

  return (
    <div className="post-modal-overlay">
      <div className="post-modal">
        <div className="post-modal-header">
          <h2>{editPost ? t('forum.createPost.editTitle') : t('forum.createPost.title')}</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        
        <form onSubmit={handleSubmit} className="post-form">
          <div className="form-group">
            <input
              type="text"
              placeholder={t('forum.createPost.titlePlaceholder')}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="title-input"
            />
          </div>

          <div className="form-group">
            <textarea
              placeholder={t('forum.createPost.contentPlaceholder')}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="content-input"
              rows="4"
            />
          </div>

          <div className="form-group">
            <div className="hashtag-input-container">
              <input
                type="text"
                placeholder={t('forum.createPost.hashtagsPlaceholder')}
                value={hashtagInput}
                onChange={(e) => setHashtagInput(e.target.value)}
                onKeyDown={handleHashtagInput}
                onBlur={() => { if (!choosingTagRef.current) commitTag(hashtagInput); else choosingTagRef.current = false; }}
                className="hashtag-input"
                onFocus={() => tagSuggestions.length > 0 && setShowTagSuggest(true)}
              />
              {showTagSuggest && tagSuggestions.length > 0 && (
                <div className="tag-suggest">
                  {tagSuggestions.map((t, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="tag-suggest-item"
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
              <div className="hashtags-container">
                {hashtags.map((tag, index) => (
                  <span key={index} className="hashtag-chip">
                    #{tag}
                    <button
                      type="button"
                      onClick={() => removeHashtag(tag)}
                      className="remove-hashtag"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="form-group">
            {!editPost && (
              <div className="image-upload-section">
                <button
                  type="button"
                  onClick={() => fileInputRef.current.click()}
                  className="upload-btn"
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
            
            {editPost && images.length > 0 && (
              <div className="existing-images-section">
                <h4>{t('forum.createPost.imagesLabel')}:</h4>
                <div className="image-preview">
                  {images.map((image, index) => (
                    <div key={index} className="image-item">
                      <img src={image} alt={`Current image ${index + 1}`} />
                    </div>
                  ))}
                </div>
                <p className="image-note">* {t('forum.createPost.errors.imageEditNote')}</p>
              </div>
            )}
            
            {!editPost && images.length > 0 && (
              <div className="image-preview">
                {images.map((image, index) => (
                  <div key={index} className="image-item">
                    <img src={image} alt={`Preview ${index + 1}`} />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="remove-image"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={onClose}
              className="cancel-btn"
              disabled={isLoading}
            >
              {t('forum.createPost.cancel')}
            </button>
            <button
              type="submit"
              className="submit-btn"
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
