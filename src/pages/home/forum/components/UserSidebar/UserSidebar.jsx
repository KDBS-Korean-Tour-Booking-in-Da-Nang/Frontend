import React, { useState, useEffect } from 'react';
import './UserSidebar.css';

const UserSidebar = () => {
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchSuggestedUsers();
  }, []);

  const fetchSuggestedUsers = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/users/suggestions?limit=5', {
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
            username: 'Nguyễn Văn A',
            avatar: '/default-avatar.png',
            mutualFriends: 12,
            isOnline: true
          },
          {
            id: 2,
            username: 'Trần Thị B',
            avatar: '/default-avatar.png',
            mutualFriends: 8,
            isOnline: false
          },
          {
            id: 3,
            username: 'Lê Văn C',
            avatar: '/default-avatar.png',
            mutualFriends: 15,
            isOnline: true
          },
          {
            id: 4,
            username: 'Phạm Thị D',
            avatar: '/default-avatar.png',
            mutualFriends: 6,
            isOnline: false
          },
          {
            id: 5,
            username: 'Hoàng Văn E',
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
          username: 'Nguyễn Văn A',
          avatar: '/default-avatar.png',
          mutualFriends: 12,
          isOnline: true
        },
        {
          id: 2,
          username: 'Trần Thị B',
          avatar: '/default-avatar.png',
          mutualFriends: 8,
          isOnline: false
        },
        {
          id: 3,
          username: 'Lê Văn C',
          avatar: '/default-avatar.png',
          mutualFriends: 15,
          isOnline: true
        },
        {
          id: 4,
          username: 'Phạm Thị D',
          avatar: '/default-avatar.png',
          mutualFriends: 6,
          isOnline: false
        },
        {
          id: 5,
          username: 'Hoàng Văn E',
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
        <h3 className="sidebar-title">Gợi ý kết bạn</h3>
        <span className="user-count">{suggestedUsers.length} người</span>
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
                  {user.mutualFriends} bạn chung
                </div>
              </div>
            </div>

            <div className="user-actions">
              {user.isFollowed ? (
                <button
                  onClick={() => handleUnfollow(user.id)}
                  className="action-btn unfollow-btn"
                >
                  Bỏ theo dõi
                </button>
              ) : (
                <button
                  onClick={() => handleFollow(user.id)}
                  className="action-btn follow-btn"
                >
                  Theo dõi
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
          Xem tất cả gợi ý
        </button>
      </div>
    </div>
  );
};

export default UserSidebar;
