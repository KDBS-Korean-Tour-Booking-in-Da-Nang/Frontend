import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { API_ENDPOINTS, createAuthHeaders } from '../../../../../config/api';
import styles from './UserSidebar.module.css';

const UserSidebar = () => {
  const { t } = useTranslation();
  const [suggestedUsers, setSuggestedUsers] = useState([]);

  useEffect(() => {
    fetchSuggestedUsers();
  }, []);

  const fetchSuggestedUsers = async () => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      const response = await fetch(`${API_ENDPOINTS.USERS_SUGGESTIONS}?limit=5`, {
        headers: createAuthHeaders(token)
      });
      if (response.ok) {
        const data = await response.json();
        const users = data.result || [];
        setSuggestedUsers(users.map(user => ({
          id: user.userId,
          username: user.username,
          avatar: user.avatar || '/default-avatar.png',
          mutualFriends: user.mutualFriends || 0,
          isOnline: user.isOnline || false
        })));
      } else {
        // Fallback to mock data
        const mockUsers = [
          {
            id: 1,
            username: t('forum.sidebar.mockUsers.user1'),
            avatar: '/default-avatar.png',
            mutualFriends: 12,
            isOnline: true
          },
          {
            id: 2,
            username: t('forum.sidebar.mockUsers.user2'),
            avatar: '/default-avatar.png',
            mutualFriends: 8,
            isOnline: false
          },
          {
            id: 3,
            username: t('forum.sidebar.mockUsers.user3'),
            avatar: '/default-avatar.png',
            mutualFriends: 15,
            isOnline: true
          },
          {
            id: 4,
            username: t('forum.sidebar.mockUsers.user4'),
            avatar: '/default-avatar.png',
            mutualFriends: 6,
            isOnline: false
          },
          {
            id: 5,
            username: t('forum.sidebar.mockUsers.user5'),
            avatar: '/default-avatar.png',
            mutualFriends: 9,
            isOnline: true
          }
        ];
        setSuggestedUsers(mockUsers);
      }
    } catch (error) {
      console.error('Error fetching suggested users:', error);
      // Fallback to mock data
      const mockUsers = [
        {
          id: 1,
          username: t('forum.sidebar.mockUsers.user1'),
          avatar: '/default-avatar.png',
          mutualFriends: 12,
          isOnline: true
        },
        {
          id: 2,
          username: t('forum.sidebar.mockUsers.user2'),
          avatar: '/default-avatar.png',
          mutualFriends: 8,
          isOnline: false
        },
        {
          id: 3,
          username: t('forum.sidebar.mockUsers.user3'),
          avatar: '/default-avatar.png',
          mutualFriends: 15,
          isOnline: true
        },
        {
          id: 4,
          username: t('forum.sidebar.mockUsers.user4'),
          avatar: '/default-avatar.png',
          mutualFriends: 6,
          isOnline: false
        },
        {
          id: 5,
          username: t('forum.sidebar.mockUsers.user5'),
          avatar: '/default-avatar.png',
          mutualFriends: 9,
          isOnline: true
        }
      ];
      setSuggestedUsers(mockUsers);
    }
  };

  const handleFollow = async (userId) => {
    try {
      // TODO: Implement follow API call
      console.log('Following user:', userId);
      // Update UI to show followed state
      setSuggestedUsers(prev => 
        prev.map(user => 
          user.id === userId 
            ? { ...user, isFollowed: true }
            : user
        )
      );
    } catch (error) {
      console.error('Error following user:', error);
    }
  };

  const handleUnfollow = async (userId) => {
    try {
      // TODO: Implement unfollow API call
      console.log('Unfollowing user:', userId);
      // Update UI to show unfollowed state
      setSuggestedUsers(prev => 
        prev.map(user => 
          user.id === userId 
            ? { ...user, isFollowed: false }
            : user
        )
      );
    } catch (error) {
      console.error('Error unfollowing user:', error);
    }
  };

  const handleMessage = (userId) => {
    // TODO: Implement messaging functionality
    console.log('Opening chat with user:', userId);
  };

  return (
    <div className={styles['user-sidebar']}>
      <div className={styles['sidebar-header']}>
        <h3 className={styles['sidebar-title']}>{t('forum.sidebar.userSuggestions')}</h3>
        <span className={styles['user-count']}>{suggestedUsers.length} {t('forum.sidebar.people')}</span>
      </div>

      <div className={styles['users-list']}>
        {suggestedUsers.map((user) => (
          <div key={user.id} className={styles['user-item']}>
            <div className={styles['user-info']}>
              <div className={styles['avatar-container']}>
                <img 
                  src={user.avatar} 
                  alt={user.username}
                  className={styles['user-avatar']}
                />
                {user.isOnline && <div className={styles['online-indicator']}></div>}
              </div>
              
              <div className={styles['user-details']}>
                <div className={styles['username']}>{user.username}</div>
                <div className={styles['mutual-friends']}>
                  {user.mutualFriends} {t('forum.sidebar.mutualFriends')}
                </div>
              </div>
            </div>

            <div className={styles['user-actions']}>
              {user.isFollowed ? (
                <button
                  onClick={() => handleUnfollow(user.id)}
                  className={`${styles['action-btn']} ${styles['unfollow-btn']}`}
                >
                  {t('forum.sidebar.unfollow')}
                </button>
              ) : (
                <button
                  onClick={() => handleFollow(user.id)}
                  className={`${styles['action-btn']} ${styles['follow-btn']}`}
                >
                  {t('forum.sidebar.follow')}
                </button>
              )}
              
              <button
                onClick={() => handleMessage(user.id)}
                className={`${styles['action-btn']} ${styles['message-btn']}`}
              >
                💬
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className={styles['sidebar-footer']}>
        <button className={styles['see-all-btn']}>
          {t('forum.sidebar.seeAllSuggestions')}
        </button>
      </div>
    </div>
  );
};

export default UserSidebar;
