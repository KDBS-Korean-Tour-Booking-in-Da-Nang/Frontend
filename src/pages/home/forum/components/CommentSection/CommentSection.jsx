import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../../../contexts/AuthContext';
import './CommentSection.css';

const CommentSection = ({ post, onCommentAdded, onCountChange }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [showAllComments, setShowAllComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [comments, setComments] = useState(post.comments || []); // top-level comments only
  const [commentReactions, setCommentReactions] = useState({}); // { [commentId]: { likeCount, dislikeCount, userReaction } }
  const [repliesMap, setRepliesMap] = useState({}); // { [commentId]: Reply[] }
  const [replyOpen, setReplyOpen] = useState({}); // { [commentId]: boolean }
  const [replyText, setReplyText] = useState({}); // { [commentId]: string }
  const [repliesExpanded, setRepliesExpanded] = useState({}); // { [commentId]: boolean }

  useEffect(() => {
    fetchComments();
  }, [post.forumPostId]);

  const fetchComments = async () => {
    try {
      const response = await fetch(`http://localhost:8080/api/comments/post/${post.forumPostId}`);
      if (response.ok) {
        const fetched = await response.json();
        // Build top-level and replies map from flat list
        const tops = [];
        const repliesByParent = {};
        for (const c of fetched) {
          if (c.parentCommentId) {
            if (!repliesByParent[c.parentCommentId]) repliesByParent[c.parentCommentId] = [];
            repliesByParent[c.parentCommentId].push(c);
          } else {
            tops.push(c);
          }
        }
        setComments(tops);
        setRepliesMap(repliesByParent);
        // default: collapse replies, do not open input
        const expanded = {};
        const open = {};
        for (const pid of Object.keys(repliesByParent)) { expanded[pid] = false; open[pid] = false; }
        setRepliesExpanded(expanded);
        setReplyOpen(open);
        // Update post comments for backward compatibility
        post.comments = fetched;
        if (onCountChange) {
          onCountChange(fetched.length);
        }

        // Fetch reaction summaries for each top-level comment
        const email = user?.email || localStorage.getItem('userEmail') || localStorage.getItem('email');
        const summaries = await Promise.all(
          tops.map(async (c) => {
            try {
              const r = await fetch(`http://localhost:8080/api/reactions/comment/${c.forumCommentId}/summary${email ? `?userEmail=${encodeURIComponent(email)}` : ''}`);
              if (!r.ok) return null;
              const data = await r.json();
              return [c.forumCommentId, {
                likeCount: data.likeCount || 0,
                dislikeCount: data.dislikeCount || 0,
                userReaction: data.userReaction || null
              }];
            } catch (_) { return null; }
          })
        );
        const next = {};
        for (const s of summaries) {
          if (s && s[0]) next[s[0]] = s[1];
        }
        setCommentReactions(next);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || !user) return;

    setIsSubmitting(true);
    try {
      const commentRequest = {
        userEmail: user.email,
        forumPostId: post.forumPostId,
        content: commentText.trim(),
        imgPath: null
      };

      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      const response = await fetch('http://localhost:8080/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(commentRequest),
      });

      if (response.ok) {
        const newComment = await response.json();
        
        // Add comment to local state
        setComments(prev => {
          const next = [newComment, ...prev];
          if (onCountChange) onCountChange(next.length);
          return next;
        });
        onCommentAdded(newComment);
        setCommentText('');
      } else {
        const text = await response.text().catch(() => '');
        console.error('Add comment failed:', response.status, text);
        alert(t('forum.comments.submitError'));
        return;
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      alert(t('forum.comments.submitError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return t('forum.post.justNow');
    if (diffInMinutes < 60) return `${diffInMinutes} ${t('forum.post.minutes')} ${t('forum.post.ago')}`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} ${t('forum.post.hours')} ${t('forum.post.ago')}`;
    return `${Math.floor(diffInMinutes / 1440)} ${t('forum.post.days')} ${t('forum.post.ago')}`;
  };

  const displayedComments = showAllComments 
    ? comments
    : comments.slice(0, 3);

  const hasMoreComments = comments.length > 3;

  const handleToggleReply = async (commentId) => {
    setReplyOpen(prev => ({ ...prev, [commentId]: !prev[commentId] }));
    // lazy load replies when opening first time
    if (!repliesMap[commentId]) {
      try {
        const r = await fetch(`http://localhost:8080/api/comments/${commentId}/replies`);
        if (r.ok) {
          const data = await r.json();
          setRepliesMap(prev => ({ ...prev, [commentId]: data }));
        }
      } catch (e) { /* ignore */ }
    }
  };

  const toggleRepliesExpanded = (commentId) => {
    setRepliesExpanded(prev => ({ ...prev, [commentId]: !prev[commentId] }));
  };

  const reactComment = async (commentId, type) => {
    const email = user?.email || localStorage.getItem('userEmail') || localStorage.getItem('email');
    const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
    if (!email) return alert(t('forum.errors.unauthorized'));

    const current = commentReactions[commentId] || { likeCount: 0, dislikeCount: 0, userReaction: null };
    const headers = {
      'Content-Type': 'application/json',
      'User-Email': email,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    // toggle off if same reaction
    if (current.userReaction === type) {
      const resp = await fetch(`http://localhost:8080/api/reactions/COMMENT/${commentId}`, { method: 'POST', headers });
      if (resp.ok) {
        const next = { ...current, userReaction: null };
        if (type === 'LIKE') next.likeCount = Math.max(0, next.likeCount - 1);
        if (type === 'DISLIKE') next.dislikeCount = Math.max(0, next.dislikeCount - 1);
        setCommentReactions(prev => ({ ...prev, [commentId]: next }));
      }
      return;
    }

    const body = { targetId: commentId, targetType: 'COMMENT', reactionType: type, userEmail: email };
    const res = await fetch('http://localhost:8080/api/reactions/add', { method: 'POST', headers, body: JSON.stringify(body) });
    if (res.ok) {
      // adjust counts and selection
      const next = { ...current, userReaction: type };
      if (type === 'LIKE') {
        next.likeCount = next.likeCount + 1;
        if (current.userReaction === 'DISLIKE') next.dislikeCount = Math.max(0, next.dislikeCount - 1);
      } else {
        next.dislikeCount = next.dislikeCount + 1;
        if (current.userReaction === 'LIKE') next.likeCount = Math.max(0, next.likeCount - 1);
      }
      setCommentReactions(prev => ({ ...prev, [commentId]: next }));
    }
  };

  const submitReply = async (parentId) => {
    const text = (replyText[parentId] || '').trim();
    if (!text) return;
    if (!user) return alert(t('forum.errors.unauthorized'));
    const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
    const body = {
      userEmail: user.email,
      forumPostId: post.forumPostId,
      content: text,
      imgPath: null,
      parentCommentId: parentId
    };
    const resp = await fetch('http://localhost:8080/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body)
    });
    if (resp.ok) {
      const reply = await resp.json();
      setRepliesMap(prev => ({ ...prev, [parentId]: [reply, ...(prev[parentId] || [])] }));
      setReplyText(prev => ({ ...prev, [parentId]: '' }));
      // increase total count
      setComments(prev => prev);
      if (onCountChange) onCountChange((comments?.length || 0) + 1);
    }
  };

  return (
    <div className="comment-section">
      {/* Comment Input */}
      {user && (
        <div className="comment-input-container">
          <img 
            src={user.avatar ? user.avatar : '/default-avatar.png'} 
            alt={user.username}
            className="comment-user-avatar"
          />
          <form onSubmit={handleSubmitComment} className="comment-form">
            <input
              type="text"
              placeholder={t('forum.comments.placeholder')}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="comment-input"
              disabled={isSubmitting}
            />
            <button 
              type="submit" 
              className="comment-submit-btn"
              disabled={isSubmitting || !commentText.trim()}
            >
              {isSubmitting ? t('forum.comments.submitting') : t('forum.comments.submit')}
            </button>
          </form>
        </div>
      )}

      {/* Comments List */}
      {displayedComments.length > 0 && (
        <div className="comments-list">
          {displayedComments.map((comment, index) => (
            <div key={comment.forumCommentId || index} className="comment-item">
              <img 
                src={(comment.userAvatar && (comment.userAvatar.startsWith('http') ? comment.userAvatar : `http://localhost:8080${comment.userAvatar.startsWith('/') ? '' : '/'}${comment.userAvatar}`)) || '/default-avatar.png'} 
                alt={comment.username}
                className="comment-avatar"
              />
              <div className="comment-content">
                <div className="comment-header">
                  <span className="comment-username">{comment.username}</span>
                  <span className="comment-time">{formatTime(comment.createdAt)}</span>
                </div>
                <div className="comment-text">{comment.content}</div>
                <div className="comment-actions">
                  <button 
                    className={`comment-action-btn ${commentReactions[comment.forumCommentId]?.userReaction === 'LIKE' ? 'active' : ''}`}
                    onClick={() => reactComment(comment.forumCommentId, 'LIKE')}
                  >
                    {t('forum.post.like')} ({commentReactions[comment.forumCommentId]?.likeCount || 0})
                  </button>
                  <button 
                    className={`comment-action-btn ${commentReactions[comment.forumCommentId]?.userReaction === 'DISLIKE' ? 'active' : ''}`}
                    onClick={() => reactComment(comment.forumCommentId, 'DISLIKE')}
                  >
                    {t('forum.post.unlike')} ({commentReactions[comment.forumCommentId]?.dislikeCount || 0})
                  </button>
                  <button className="comment-action-btn" onClick={() => handleToggleReply(comment.forumCommentId)}>{t('forum.post.reply')}</button>
                </div>

                {/* Replies toggle */}
                {!!(repliesMap[comment.forumCommentId] && repliesMap[comment.forumCommentId].length) && (
                  <div className="reply-toggle-row">
                    {!repliesExpanded[comment.forumCommentId] ? (
                      <button className="show-more-btn" onClick={() => toggleRepliesExpanded(comment.forumCommentId)}>
                        {t('forum.post.showReplies')} {repliesMap[comment.forumCommentId].length}
                      </button>
                    ) : (
                      <button className="show-more-btn" onClick={() => toggleRepliesExpanded(comment.forumCommentId)}>
                        {t('forum.post.hideReplies')}
                      </button>
                    )}
                  </div>
                )}

                {/* Show replies only when expanded */}
                {repliesExpanded[comment.forumCommentId] && (repliesMap[comment.forumCommentId] || []).map((rep) => (
                  <div key={rep.forumCommentId} className="comment-item reply-item">
                    <img 
                      src={(rep.userAvatar && (rep.userAvatar.startsWith('http') ? rep.userAvatar : `http://localhost:8080${rep.userAvatar.startsWith('/') ? '' : '/'}${rep.userAvatar}`)) || '/default-avatar.png'} 
                      alt={rep.username}
                      className="comment-avatar"
                    />
                    <div className="comment-content">
                      <div className="comment-header">
                        <span className="comment-username">{rep.username}</span>
                        <span className="comment-time">{formatTime(rep.createdAt)}</span>
                      </div>
                      <div className="comment-text">{rep.content}</div>
                    </div>
                  </div>
                ))}

                {/* Only show reply input when user clicks "Trả lời" */}
                {replyOpen[comment.forumCommentId] && (
                  <div className="reply-input-row">
                    <input
                      type="text"
                      value={replyText[comment.forumCommentId] || ''}
                      placeholder={t('forum.comments.replyPlaceholder')}
                      onChange={(e) => setReplyText(prev => ({ ...prev, [comment.forumCommentId]: e.target.value }))}
                      className="comment-input"
                    />
                    <button className="comment-submit-btn" onClick={() => submitReply(comment.forumCommentId)}>{t('forum.comments.submit')}</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Show More Comments */}
      {hasMoreComments && (
        <div className="show-more-comments">
          <button 
            onClick={() => setShowAllComments(!showAllComments)}
            className="show-more-btn"
          >
            {showAllComments 
              ? t('forum.comments.hideComments') 
              : `${t('forum.comments.showMore')} ${comments.length - 3} ${t('forum.post.comments')}`
            }
          </button>
        </div>
      )}

      {/* No Comments Message */}
      {comments.length === 0 && (
        <div className="no-comments">
          <p>{t('forum.comments.noComments')}</p>
        </div>
      )}
    </div>
  );
};

export default CommentSection;
