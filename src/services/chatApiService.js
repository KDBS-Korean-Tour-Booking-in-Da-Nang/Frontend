import { checkAndHandleApiError } from '../utils/apiErrorHandler';

const getApiBaseUrl = () => {
  if (import.meta.env.PROD) {
    // Production: sử dụng current domain
    return window.location.origin;
  } else {
    // Development: sử dụng environment variable hoặc localhost
    return import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
  }
};

const API_BASE_URL = getApiBaseUrl();

class ChatApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Encode a value for safe URL path segments
  encodePath(value) {
    if (value === undefined || value === null) return '';
    return encodeURIComponent(String(value));
  }

  // Get authorization headers
  getAuthHeaders() {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token') || sessionStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  }

  // Get conversation between two users with pagination
  async getConversation(user1, user2, page = 0, size = 25) {
    try {
      const u1 = this.encodePath(user1);
      const u2 = this.encodePath(user2);
      const response = await fetch(
        `${this.baseURL}/api/chat/conversation/${u1}/${u2}?page=${page}&size=${size}`,
        {
          method: 'GET',
          headers: this.getAuthHeaders()
        }
      );

      if (!response.ok) {
        // Handle 401, 403, 404, 500 with global error handler (auto redirect)
        const wasHandled = await checkAndHandleApiError(response, true);
        if (wasHandled) {
          return; // Đã redirect, không cần xử lý tiếp
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching conversation:', error);
      throw error;
    }
  }

  // Get conversation between two users (legacy - for backward compatibility)
  async getConversationLegacy(user1, user2) {
    try {
      const u1 = this.encodePath(user1);
      const u2 = this.encodePath(user2);
      const response = await fetch(
        `${this.baseURL}/api/chat/conversation/${u1}/${u2}`,
        {
          method: 'GET',
          headers: this.getAuthHeaders()
        }
      );

      if (!response.ok) {
        // Handle 401, 403, 404, 500 with global error handler (auto redirect)
        const wasHandled = await checkAndHandleApiError(response, true);
        if (wasHandled) {
          return; // Đã redirect, không cần xử lý tiếp
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching conversation:', error);
      throw error;
    }
  }

  // Get all messages from a user
  async getAllMessagesFromUser(username) {
    try {
      const response = await fetch(
        `${this.baseURL}/api/chat/all/${username}`,
        {
          method: 'GET',
          headers: this.getAuthHeaders()
        }
      );

      if (!response.ok) {
        // Handle 401, 403, 404, 500 with global error handler (auto redirect)
        const wasHandled = await checkAndHandleApiError(response, true);
        if (wasHandled) {
          return; // Đã redirect, không cần xử lý tiếp
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching all messages from user:', error);
      throw error;
    }
  }

  // Send message (Test API only)
  async sendMessage(senderName, receiverName, content) {
    try {
      const response = await fetch(
        `${this.baseURL}/api/chat/send`,
        {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify({
            senderName,
            receiverName,
            content
          })
        }
      );

      if (!response.ok) {
        // Handle 401, 403, 404, 500 with global error handler (auto redirect)
        const wasHandled = await checkAndHandleApiError(response, true);
        if (wasHandled) {
          return; // Đã redirect, không cần xử lý tiếp
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  // Get all users (for chat dropdown)
  async getAllUsers() {
    try {
      const response = await fetch(
        `${this.baseURL}/api/users`,
        {
          method: 'GET',
          headers: this.getAuthHeaders()
        }
      );

      if (!response.ok) {
        // Handle 401, 403, 404, 500 with global error handler (auto redirect)
        const wasHandled = await checkAndHandleApiError(response, true);
        if (wasHandled) {
          return; // Đã redirect, không cần xử lý tiếp
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      // Backend returns data in format: { result: [...users] }
      return data.result || data;
    } catch (error) {
      console.error('Error fetching all users:', error);
      throw error;
    }
  }

  // Get current user info
  async getCurrentUser() {
    try {
      const response = await fetch(
        `${this.baseURL}/api/user/profile`,
        {
          method: 'GET',
          headers: this.getAuthHeaders()
        }
      );

      if (!response.ok) {
        // Handle 401, 403, 404, 500 with global error handler (auto redirect)
        const wasHandled = await checkAndHandleApiError(response, true);
        if (wasHandled) {
          return; // Đã redirect, không cần xử lý tiếp
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching current user:', error);
      throw error;
    }
  }

  // Format message for display
  formatMessage(message, currentUser) {
    const currentUserName = currentUser?.userName || currentUser?.username || currentUser?.name;
    const isOwn = message.senderName === currentUserName;
    
    return {
      id: message.messageId,
      content: message.content,
      timestamp: message.timestamp,
      sender: {
        userName: message.senderName,
        username: message.senderName
      },
      receiver: {
        userName: message.receiverName,
        username: message.receiverName
      },
      isOwn: isOwn
    };
  }

  // Format conversation for display
  formatConversation(messages, currentUser) {
    if (!messages || !Array.isArray(messages)) {
      return [];
    }
    
    return messages.map((message, index) => {
      const currentUserName = currentUser?.userName || currentUser?.username || currentUser?.name;
      const isOwn = message.senderName === currentUserName;
      
      // Ensure we have proper content and timestamp
      const formattedMessage = {
        id: message.messageId || `msg-${index}-${Date.now()}`,
        content: message.content || '',
        timestamp: message.timestamp || new Date().toISOString(),
        sender: {
          userName: message.senderName,
          username: message.senderName
        },
        receiver: {
          userName: message.receiverName,
          username: message.receiverName
        },
        isOwn: isOwn
      };
      
      return formattedMessage;
    });
  }

  // Get conversations list (grouped by other user)
  getConversationsList(messages, currentUser) {
    const conversationsMap = new Map();
    const currentUserName = currentUser?.userName || currentUser?.username || currentUser?.name;

    messages.forEach(message => {
      const otherUserName = message.senderName === currentUserName 
        ? message.receiverName 
        : message.senderName;
      
      const conversationKey = otherUserName;
      
      if (!conversationsMap.has(conversationKey)) {
        conversationsMap.set(conversationKey, {
          user: {
            userName: otherUserName,
            username: otherUserName
          },
          lastMessage: message,
          unreadCount: 0
        });
      } else {
        const existing = conversationsMap.get(conversationKey);
        if (new Date(message.timestamp) > new Date(existing.lastMessage.timestamp)) {
          existing.lastMessage = message;
        }
      }
    });

    return Array.from(conversationsMap.values());
  }
}

// Create singleton instance
const chatApiService = new ChatApiService();
export default chatApiService;
