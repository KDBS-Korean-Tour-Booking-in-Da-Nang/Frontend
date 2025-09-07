import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BaseURL, API_ENDPOINTS } from '../../../../../config/api';
import './UserSidebar.css';

const UserSidebar = () => {
  const { t } = useTranslation();
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchSuggestedUsers();
  }, []);

  const fetchSuggestedUsers = async () => {
    try {
      const response = await fetch(`${API_ENDPOINTS.USERS_SUGGESTIONS}?limit=5`, {
        headers: {
          // Suggestions may need auth depending on BE; add token if available
          ...(localStorage.getItem('token') || localStorage.getItem('accessToken')
            ? { Authorization: `Bearer ${localStorage.getItem('token') || localStorage.getItem('accessToken')}` }
            : {})
        }
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
    <div className="user-sidebar">
      <div className="sidebar-header">
        <h3 className="sidebar-title">{t('forum.sidebar.userSuggestions')}</h3>
        <span className="user-count">{suggestedUsers.length} {t('forum.sidebar.people')}</span>
      </div>

      <div className="users-list">
        {suggestedUsers.map((user) => (
          <div key={user.id} className="user-item">
            <div className="user-info">
              <div className="avatar-container">
                <img 
                  src={user.avatar} 
                  alt={user.username}
                  className="user-avatar"
                />
                {user.isOnline && <div className="online-indicator"></div>}
              </div>
              
              <div className="user-details">
                <div className="username">{user.username}</div>
                <div className="mutual-friends">
                  {user.mutualFriends} {t('forum.sidebar.mutualFriends')}
                </div>
              </div>
            </div>

            <div className="user-actions">
              {user.isFollowed ? (
                <button
                  onClick={() => handleUnfollow(user.id)}
                  className="action-btn unfollow-btn"
                >
                  {t('forum.sidebar.unfollow')}
                </button>
              ) : (
                <button
                  onClick={() => handleFollow(user.id)}
                  className="action-btn follow-btn"
                >
                  {t('forum.sidebar.follow')}
                </button>
              )}
              
              <button
                onClick={() => handleMessage(user.id)}
                className="action-btn message-btn"
              >
                💬
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="sidebar-footer">
        <button className="see-all-btn">
          {t('forum.sidebar.seeAllSuggestions')}
        </button>
      </div>
    </div>
  );
};

export default UserSidebar;
