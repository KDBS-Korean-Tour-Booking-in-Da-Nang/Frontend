import { checkAndHandleApiError } from '../utils/apiErrorHandler';
import { BaseURL as API_BASE_URL } from '../config/api';

// Service quản lý API chat, sử dụng userId để xác định người dùng
class ChatApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Encode giá trị để an toàn khi dùng trong URL path segments
  encodePath(value) {
    if (value === undefined || value === null) return '';
    return encodeURIComponent(String(value));
  }

  // Lấy headers xác thực với Bearer token
  getAuthHeaders() {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token') || sessionStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  }

  // Lấy cuộc trò chuyện giữa hai user với phân trang (sử dụng userId)
  async getConversation(userId1, userId2, page = 0, size = 25) {
    try {
      const u1 = this.encodePath(userId1);
      const u2 = this.encodePath(userId2);
      const response = await fetch(
        `${this.baseURL}/api/chat/conversation/${u1}/${u2}?page=${page}&size=${size}`,
        {
          method: 'GET',
          headers: this.getAuthHeaders()
        }
      );

      if (!response.ok) {
        const wasHandled = await checkAndHandleApiError(response, true);
        if (wasHandled) {
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      throw error;
    }
  }

  // Lấy cuộc trò chuyện giữa hai user (legacy - để tương thích ngược, sử dụng userId)
  async getConversationLegacy(userId1, userId2) {
    try {
      const u1 = this.encodePath(userId1);
      const u2 = this.encodePath(userId2);
      const response = await fetch(
        `${this.baseURL}/api/chat/conversation/${u1}/${u2}`,
        {
          method: 'GET',
          headers: this.getAuthHeaders()
        }
      );

      if (!response.ok) {
        const wasHandled = await checkAndHandleApiError(response, true);
        if (wasHandled) {
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      throw error;
    }
  }

  async getAllMessagesFromUser(userId) {
    try {
      const response = await fetch(
        `${this.baseURL}/api/chat/all/${userId}`,
        {
          method: 'GET',
          headers: this.getAuthHeaders()
        }
      );

      if (!response.ok) {
        const wasHandled = await checkAndHandleApiError(response, true);
        if (wasHandled) {
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      throw error;
    }
  }

  async sendMessage(senderId, receiverId, content) {
    try {
      const response = await fetch(
        `${this.baseURL}/api/chat/send`,
        {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify({
            senderId: parseInt(senderId),
            receiverId: parseInt(receiverId),
            content
          })
        }
      );

      if (!response.ok) {
        const wasHandled = await checkAndHandleApiError(response, true);
        if (wasHandled) {
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      throw error;
    }
  }

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
        const wasHandled = await checkAndHandleApiError(response, true);
        if (wasHandled) {
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.result || data;
    } catch (error) {
      throw error;
    }
  }

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
        const wasHandled = await checkAndHandleApiError(response, true);
        if (wasHandled) {
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      throw error;
    }
  }

  async getUserByEmail(email) {
    try {
      const encodedEmail = encodeURIComponent(email);
      const response = await fetch(
        `${this.baseURL}/api/users/${encodedEmail}`,
        {
          method: 'GET',
          headers: this.getAuthHeaders()
        }
      );

      if (!response.ok) {
        const wasHandled = await checkAndHandleApiError(response, true);
        if (wasHandled) {
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      throw error;
    }
  }

  getUsernameFromUserId(userId, allUsers = []) {
    if (!userId) return '';
    const user = allUsers.find(u => (u.userId || u.id) === parseInt(userId));
    return user?.username || user?.userName || user?.name || '';
  }

  formatMessage(message, currentUser, allUsers = []) {
    const currentUserId = currentUser?.userId || currentUser?.id;
    const isOwn = message.senderId === currentUserId;
    
    const senderUsername = this.getUsernameFromUserId(message.senderId, allUsers);
    const receiverUsername = this.getUsernameFromUserId(message.receiverId, allUsers);
    
    return {
      id: message.messageId,
      content: message.content,
      timestamp: message.timestamp,
      sender: {
        userId: message.senderId,
        userName: senderUsername,
        username: senderUsername
      },
      receiver: {
        userId: message.receiverId,
        userName: receiverUsername,
        username: receiverUsername
      },
      isOwn: isOwn
    };
  }

  formatConversation(messages, currentUser, allUsers = []) {
    if (!messages || !Array.isArray(messages)) {
      return [];
    }
    
    const currentUserId = currentUser?.userId || currentUser?.id;
    
    return messages.map((message, index) => {
      const isOwn = message.senderId === currentUserId;
      
      const senderUsername = this.getUsernameFromUserId(message.senderId, allUsers);
      const receiverUsername = this.getUsernameFromUserId(message.receiverId, allUsers);
      
      const formattedMessage = {
        id: message.messageId || `msg-${index}-${Date.now()}`,
        content: message.content || '',
        timestamp: message.timestamp || new Date().toISOString(),
        sender: {
          userId: message.senderId,
          userName: senderUsername,
          username: senderUsername
        },
        receiver: {
          userId: message.receiverId,
          userName: receiverUsername,
          username: receiverUsername
        },
        isOwn: isOwn
      };
      
      return formattedMessage;
    });
  }

  getConversationsList(messages, currentUser, allUsers = []) {
    const conversationsMap = new Map();
    const currentUserId = currentUser?.userId || currentUser?.id;

    messages.forEach(message => {
      const otherUserId = message.senderId === currentUserId 
        ? message.receiverId 
        : message.senderId;
      
      const conversationKey = otherUserId;
      
      if (!conversationsMap.has(conversationKey)) {
        const otherUsername = this.getUsernameFromUserId(otherUserId, allUsers);
        conversationsMap.set(conversationKey, {
          user: {
            userId: otherUserId,
            userName: otherUsername,
            username: otherUsername
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

const chatApiService = new ChatApiService();
export default chatApiService;
