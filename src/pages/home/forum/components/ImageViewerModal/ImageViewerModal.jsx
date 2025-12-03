import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../../../contexts/AuthContext';
import { getImageUrl, getAvatarUrl } from '../../../../../config/api';
import styles from './ImageViewerModal.module.css';

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
    return getImageUrl(p);
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
    <div className={styles['ivm-backdrop']} onClick={onClose}>
      <div className={styles['ivm-modal']} onClick={e => e.stopPropagation()}>
        <div className={styles['ivm-header']}>
          <div className={styles['ivm-user']}>
            <img src={getAvatarUrl(post.userAvatar)} alt={post.username} />
            <div className={styles['ivm-user-name']}>{post.username}</div>
          </div>
          <button className={styles['ivm-close']} onClick={onClose}>✕</button>
        </div>
        <div className={styles['ivm-body']}>
          {imgs.length > 0 && (
            <>
              <img className={styles['ivm-image']} src={imgs[current]} alt={`image ${current + 1}`} />
              {imgs.length > 1 && (
                <>
                  <button className={`${styles['ivm-nav']} ${styles['ivm-prev']}`} disabled={current === 0} onClick={() => setCurrent(c => Math.max(0, c - 1))}>‹</button>
                  <button className={`${styles['ivm-nav']} ${styles['ivm-next']}`} disabled={current === imgs.length - 1} onClick={() => setCurrent(c => Math.min(imgs.length - 1, c + 1))}>›</button>
                  <div className={styles['ivm-counter']}>{current + 1}/{imgs.length}</div>
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


