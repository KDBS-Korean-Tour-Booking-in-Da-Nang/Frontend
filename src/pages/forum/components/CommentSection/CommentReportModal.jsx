import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './CommentReportModal.module.css';

const CommentReportModal = ({ isOpen, onClose, onReport, comment }) => {
  const { t } = useTranslation();
  const [selectedReasons, setSelectedReasons] = useState([]);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reportReasons = [
    { value: 'SPAM', label: t('forum.modals.report.reasons.spam'), description: t('forum.modals.report.reasons.spamDesc') },
    { value: 'INAPPROPRIATE', label: t('forum.modals.report.reasons.inappropriate'), description: t('forum.modals.report.reasons.inappropriateDesc') },
    { value: 'VIOLENCE', label: t('forum.modals.report.reasons.violence'), description: t('forum.modals.report.reasons.violenceDesc') },
    { value: 'HARASSMENT', label: t('forum.modals.report.reasons.harassment'), description: t('forum.modals.report.reasons.harassmentDesc') },
    { value: 'HATE_SPEECH', label: t('forum.modals.report.reasons.hateSpeech'), description: t('forum.modals.report.reasons.hateSpeechDesc') },
    { value: 'FALSE_INFO', label: t('forum.modals.report.reasons.falseInfo'), description: t('forum.modals.report.reasons.falseInfoDesc') },
    { value: 'COPYRIGHT', label: t('forum.modals.report.reasons.copyright'), description: t('forum.modals.report.reasons.copyrightDesc') },
    { value: 'OTHER', label: t('forum.modals.report.reasons.other'), description: t('forum.modals.report.reasons.otherDesc') }
  ];

  const handleReasonToggle = (reason) => {
    setSelectedReasons(prev => 
      prev.includes(reason) 
        ? prev.filter(r => r !== reason)
        : [...prev, reason]
    );
  };

  const handleSubmit = async () => {
    if (selectedReasons.length === 0) {
      alert(t('forum.modals.report.selectReasonError'));
      return;
    }

    setIsSubmitting(true);
    try {
      await onReport({
        targetType: 'COMMENT',
        targetId: comment.forumCommentId,
        reasons: selectedReasons,
        description: description.trim() || null
      });
      
      // Reset form
      setSelectedReasons([]);
      setDescription('');
      onClose();
    } catch (error) {
      console.error('Error reporting comment:', error);
      alert(t('forum.modals.report.submitError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setSelectedReasons([]);
      setDescription('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles['comment-report-modal-overlay']} onClick={handleClose}>
      <div className={styles['comment-report-modal']} onClick={(e) => e.stopPropagation()}>
        <div className={styles['comment-report-modal-header']}>
          <h3>{t('forum.modals.report.title')}</h3>
          <button 
            className={styles['close-btn']} 
            onClick={handleClose}
            disabled={isSubmitting}
          >
            ×
          </button>
        </div>

        <div className={styles['comment-report-modal-content']}>
          <div className={styles['comment-preview']}>
            <div className={styles['comment-author']}>
              <strong>{comment.username}</strong>
            </div>
            <div className={styles['comment-content-preview']}>
              {comment.content.length > 100 
                ? `${comment.content.substring(0, 100)}...` 
                : comment.content
              }
            </div>
          </div>

          <div className={styles['report-reasons']}>
            <h4>{t('forum.modals.report.selectReason')}</h4>
            <div className={styles['reasons-list']}>
              {reportReasons.map((reason) => (
                <div 
                  key={reason.value}
                  className={`reason-item ${selectedReasons.includes(reason.value) ? 'selected' : ''}`}
                  onClick={() => handleReasonToggle(reason.value)}
                >
                  <div className={styles['reason-checkbox']}>
                    <input 
                      type="checkbox" 
                      checked={selectedReasons.includes(reason.value)}
                      onChange={() => handleReasonToggle(reason.value)}
                      onClick={(e) => e.stopPropagation()} // Prevent event bubbling
                    />
                  </div>
                  <div className={styles['reason-content']}>
                    <div className={styles['reason-label']}>{reason.label}</div>
                    <div className={styles['reason-description']}>{reason.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={styles['report-description']}>
            <label htmlFor="description">{t('forum.modals.report.additionalDescription')}</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('forum.modals.report.descriptionPlaceholder')}
              maxLength={500}
              rows={3}
            />
            <div className={styles['char-count']}>{description.length}/500</div>
          </div>
        </div>

        <div className={styles['comment-report-modal-footer']}>
          <button 
            className={styles['cancel-btn']} 
            onClick={handleClose}
            disabled={isSubmitting}
          >
            {t('forum.modals.report.cancel')}
          </button>
          <button 
            className={styles['submit-btn']} 
            onClick={handleSubmit}
            disabled={isSubmitting || selectedReasons.length === 0}
          >
            {isSubmitting ? t('forum.modals.report.submitting') : t('forum.modals.report.submit')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CommentReportModal;
