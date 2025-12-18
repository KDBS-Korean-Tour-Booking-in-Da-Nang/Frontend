import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

// Service quản lý kết nối WebSocket sử dụng STOMP protocol
// Hỗ trợ subscribe/unsubscribe, gửi/nhận message, quản lý connection state
class WebSocketService {
  constructor() {
    this.stompClient = null;
    this.isConnected = false;
    this.subscriptions = new Map(); // Lưu các subscription đang active
    this.messageCallbacks = new Map(); // Lưu callback hiện tại cho mỗi subscription (để tránh gọi callback cũ)
    this.messageHandlers = new Set(); // Global message handlers
    this.connectionHandlers = new Set(); // Handlers khi kết nối thành công
    this.disconnectionHandlers = new Set(); // Handlers khi mất kết nối
  }

  // Kết nối WebSocket với server
  // Tự động ngắt kết nối cũ nếu đang kết nối để đảm bảo kết nối sạch
  connect(userId) {
    if (this.isConnected && this.stompClient) {
      this.disconnect();
    }

    if (this.isConnected) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      try {
        // Xác định URL WebSocket dựa trên môi trường
        // Ưu tiên VITE_WS_URL từ env, sau đó tự động detect trong production
        const getWebSocketUrl = () => {
          if (import.meta.env.VITE_WS_URL) {
            return import.meta.env.VITE_WS_URL;
          }
          
          // Production: tự động detect protocol (wss:// cho HTTPS, ws:// cho HTTP)
          if (import.meta.env.PROD) {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            return `${protocol}//${window.location.host}/ws`;
          } 
          
          // Development: mặc định localhost
          return 'http://localhost:8080/ws';
        };

        const wsUrl = getWebSocketUrl();
        const token = sessionStorage.getItem('token') || localStorage.getItem('token') || localStorage.getItem('accessToken');

        // Tạo native WebSocket connection
        // Chuyển đổi URL từ http/https sang ws/wss và thêm path /ws/websocket
        const createNativeWebSocket = () => {
          let nativeUrl;
          
          // Chuyển đổi http:// sang ws://
          if (wsUrl.startsWith('http://')) {
            nativeUrl = wsUrl.replace(/^http:\/\//, 'ws://').replace('/ws', '/ws/websocket');
          } 
          // Chuyển đổi https:// sang wss://
          else if (wsUrl.startsWith('https://')) {
            nativeUrl = wsUrl.replace(/^https:\/\//, 'wss://').replace('/ws', '/ws/websocket');
          } 
          // Nếu đã là ws:// hoặc wss://, chỉ cần thay đổi path
          else if (wsUrl.startsWith('ws://') || wsUrl.startsWith('wss://')) {
            nativeUrl = wsUrl.replace('/ws', '/ws/websocket');
          } 
          // Fallback: giả định ws protocol
          else {
            nativeUrl = `ws://${wsUrl.replace(/^\/+/, '')}`.replace('/ws', '/ws/websocket');
          }
          
          return new WebSocket(nativeUrl);
        };

        // Tạo STOMP client với các cấu hình
        this.stompClient = new Client({
          webSocketFactory: () => createNativeWebSocket(),
          debug: () => {},
          connectHeaders: token ? { Authorization: `Bearer ${token}` } : {}, // Gửi token trong headers
          heartbeatIncoming: 15000, // Nhận heartbeat mỗi 15s
          heartbeatOutgoing: 15000, // Gửi heartbeat mỗi 15s
          reconnectDelay: 5000, // Tự động reconnect sau 5s nếu mất kết nối
          onConnect: () => {
            this.isConnected = true;
            this.notifyConnectionHandlers();
            resolve();
          },
          onDisconnect: () => {
            this.isConnected = false;
            this.notifyDisconnectionHandlers();
          },
          onStompError: (frame) => {
            this.isConnected = false;
            this.notifyDisconnectionHandlers();
            // Chỉ reject nếu chưa kết nối thành công (tránh reject sau khi đã resolve)
            if (!this.isConnected) {
              reject(new Error('STOMP Error: ' + (frame.headers?.message || 'Unknown error')));
            }
          },
          onWebSocketClose: () => {
            this.isConnected = false;
            this.notifyDisconnectionHandlers();
          },
          onWebSocketError: (error) => {
            this.isConnected = false;
            this.notifyDisconnectionHandlers();
            if (!this.isConnected) {
              reject(new Error('WebSocket Error: ' + error.message));
            }
          }
        });

        this.stompClient.activate();

        // Timeout: nếu không kết nối được trong 10s thì reject
        setTimeout(() => {
          if (!this.isConnected) {
            reject(new Error('WebSocket connection timeout'));
          }
        }, 10000);
      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect() {
    if (this.stompClient && this.isConnected) {
      this.subscriptions.forEach((subscription) => {
        subscription.unsubscribe();
      });
      this.subscriptions.clear();
      this.messageCallbacks.clear();

      this.stompClient.deactivate();
      this.stompClient = null;
      this.isConnected = false;
      this.notifyDisconnectionHandlers();
    }
  }

  // Subscribe vào tin nhắn của một user cụ thể
  // Backend sử dụng userId dạng string để routing
  subscribeToUserMessages(userId, callback) {
    if (!this.isConnected || !this.stompClient) {
      return null;
    }

    const userIdStr = String(userId);
    const destination = `/user/${userIdStr}/queue/messages`;
    
    // Hủy subscription cũ nếu đã tồn tại để tránh duplicate
    const existingSubscription = this.subscriptions.get(destination);
    if (existingSubscription) {
      existingSubscription.unsubscribe();
      this.subscriptions.delete(destination);
      this.messageCallbacks.delete(destination);
    }
    
    // Lưu callback hiện tại (callback mới nhất) để tránh gọi callback cũ
    this.messageCallbacks.set(destination, callback);
    
    const subscription = this.stompClient.subscribe(destination, (message) => {
      try {
        const messageData = JSON.parse(message.body);
        // Lấy callback hiện tại (mới nhất) để đảm bảo gọi đúng callback
        const currentCallback = this.messageCallbacks.get(destination);
        if (currentCallback) {
          currentCallback(messageData);
        }
        // Không gọi notifyMessageHandlers để tránh xử lý trùng lặp
        // notifyMessageHandlers dành cho global message handlers, không phải user-specific subscriptions
      } catch (error) {
      }
    });

    this.subscriptions.set(destination, subscription);
    return subscription;
  }

  subscribeToGlobalNotifications(callback) {
    if (!this.isConnected || !this.stompClient) return null;
    const destination = '/topic/notifications';
    
    const existingSubscription = this.subscriptions.get(destination);
    if (existingSubscription) {
      existingSubscription.unsubscribe();
      this.subscriptions.delete(destination);
    }
    
    const subscription = this.stompClient.subscribe(destination, (message) => {
      try {
        const data = JSON.parse(message.body);
        if (callback) callback(data);
      } catch {}
    });
    this.subscriptions.set(destination, subscription);
    return subscription;
  }

  subscribeToUserNotifications(usernameOrId, callback) {
    if (!this.isConnected || !this.stompClient) return null;
    const destination = `/user/queue/notifications`;
    
    const existingSubscription = this.subscriptions.get(destination);
    if (existingSubscription) {
      existingSubscription.unsubscribe();
      this.subscriptions.delete(destination);
    }
    
    const subscription = this.stompClient.subscribe(destination, (message) => {
      try {
        const data = JSON.parse(message.body);
        if (callback) callback(data);
      } catch {}
    });
    this.subscriptions.set(destination, subscription);
    return subscription;
  }

  sendMessage(messageData) {
    if (!this.isConnected || !this.stompClient) {
      return false;
    }

    try {
      this.stompClient.publish({
        destination: '/app/chat.send',
        body: JSON.stringify(messageData)
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  onMessage(callback) {
    this.messageHandlers.add(callback);
    return () => this.messageHandlers.delete(callback);
  }

  onConnection(callback) {
    this.connectionHandlers.add(callback);
    return () => this.connectionHandlers.delete(callback);
  }

  onDisconnection(callback) {
    this.disconnectionHandlers.add(callback);
    return () => this.disconnectionHandlers.delete(callback);
  }

  notifyMessageHandlers(message) {
    this.messageHandlers.forEach(handler => {
      try {
        handler(message);
      } catch (error) {
      }
    });
  }

  notifyConnectionHandlers() {
    this.connectionHandlers.forEach(handler => {
      try {
        handler();
      } catch (error) {
      }
    });
  }

  notifyDisconnectionHandlers() {
    this.disconnectionHandlers.forEach(handler => {
      try {
        handler();
      } catch (error) {
      }
    });
  }

  getConnectionStatus() {
    return this.isConnected;
  }
}

const websocketService = new WebSocketService();
export default websocketService;
