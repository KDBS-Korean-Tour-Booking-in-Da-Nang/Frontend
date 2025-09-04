import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import './PostModal.css';

const PostModal = ({ isOpen, onClose, onPostCreated, editPost = null }) => {
  const { user } = useAuth();
  const [title, setTitle] = useState(editPost?.title || '');
  const [content, setContent] = useState(editPost?.content || '');
  const [hashtags, setHashtags] = useState(editPost?.hashtags?.map(h => h.content) || []);
  const [hashtagInput, setHashtagInput] = useState('');
  const [tagSuggestions, setTagSuggestions] = useState([]);
  const [showTagSuggest, setShowTagSuggest] = useState(false);
  const suggestTimerRef = useRef(null);
  const [images, setImages] = useState([]);
  const [imageFiles, setImageFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef(null);
  const choosingTagRef = useRef(false);

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
        let res = await fetch(`http://localhost:8080/api/hashtags/search?keyword=${encodeURIComponent(q)}&limit=8`);
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
    if (!title.trim() || !content.trim()) {
      alert('Vui lòng nhập title và content');
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
      
      imageFiles.forEach(file => {
        formData.append('imageUrls', file);
      });

      const url = editPost 
        ? `http://localhost:8080/api/posts/${editPost.forumPostId}`
        : 'http://localhost:8080/api/posts';
      
      const method = editPost ? 'PUT' : 'POST';

      const headers = {};
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(url, {
        method: method,
        headers,
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        onPostCreated(result);
        onClose();
        resetForm();
      } else {
        throw new Error('Failed to create post');
      }
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Có lỗi xảy ra khi đăng bài');
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
          <h2>{editPost ? 'Chỉnh sửa bài viết' : 'Tạo bài viết mới'}</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        
        <form onSubmit={handleSubmit} className="post-form">
          <div className="form-group">
            <input
              type="text"
              placeholder="Tiêu đề bài viết..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="title-input"
              required
            />
          </div>

          <div className="form-group">
            <textarea
              placeholder="Bạn đang nghĩ gì?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="content-input"
              rows="4"
              required
            />
          </div>

          <div className="form-group">
            <div className="hashtag-input-container">
              <input
                type="text"
                placeholder="Nhập hashtag và nhấn Enter..."
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
            <div className="image-upload-section">
              <button
                type="button"
                onClick={() => fileInputRef.current.click()}
                className="upload-btn"
              >
                📷 Thêm ảnh
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
            
            {images.length > 0 && (
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
              Hủy
            </button>
            <button
              type="submit"
              className="submit-btn"
              disabled={isLoading}
            >
              {isLoading ? 'Đang xử lý...' : (editPost ? 'Cập nhật' : 'Đăng bài')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PostModal;
