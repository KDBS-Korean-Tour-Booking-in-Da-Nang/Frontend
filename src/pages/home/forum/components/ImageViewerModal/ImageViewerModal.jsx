import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../../../contexts/AuthContext';
import './ImageViewerModal.css';

const ImageViewerModal = ({ open, onClose, post, initialIndex = 0 }) => {
  const { user } = useAuth();
  const [current, setCurrent] = useState(0);

  // apply index when opening
  useEffect(() => {
    if (open) {
      setCurrent(typeof initialIndex === 'number' ? initialIndex : 0);
    }
  }, [open, initialIndex]);

  const imgs = ((post && post.images) ? post.images : []).map(i => {
    const p = i.imgPath || '';
    if (p.startsWith('http')) return p;
    return `http://localhost:8080${p.startsWith('/') ? '' : '/'}${p}`;
  });
  const imageIds = ((post && post.images) ? post.images : []).map(i => i.postImgId);
  const imgCount = imgs.length;

  useEffect(() => {
    const onKey = (e) => {
      if (!open) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') setCurrent(c => Math.max(0, c - 1));
      if (e.key === 'ArrowRight') setCurrent(c => Math.min(imgs.length - 1, c + 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Preview-only: remove reaction logic

  if (!open || !post) return null;

  return (
    <div className="ivm-backdrop" onClick={onClose}>
      <div className="ivm-modal" onClick={e => e.stopPropagation()}>
        <div className="ivm-header">
          <div className="ivm-user">
            <img src={post.userAvatar ? (post.userAvatar.startsWith('http') ? post.userAvatar : `http://localhost:8080${post.userAvatar}`) : '/default-avatar.png'} alt={post.username} />
            <div className="ivm-user-name">{post.username}</div>
          </div>
          <button className="ivm-close" onClick={onClose}>✕</button>
        </div>
        <div className="ivm-body">
          {imgs.length > 0 && (
            <>
              <img className="ivm-image" src={imgs[current]} alt={`image ${current + 1}`} />
              {imgs.length > 1 && (
                <>
                  <button className="ivm-nav ivm-prev" disabled={current===0} onClick={() => setCurrent(c => Math.max(0, c-1))}>‹</button>
                  <button className="ivm-nav ivm-next" disabled={current===imgs.length-1} onClick={() => setCurrent(c => Math.min(imgs.length-1, c+1))}>›</button>
                  <div className="ivm-counter">{current + 1}/{imgs.length}</div>
                </>
              )}
            </>
          )}
        </div>
        {/* Preview-only: no per-image reaction actions */}
      </div>
    </div>
  );
};

export default ImageViewerModal;


