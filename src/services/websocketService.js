import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

class WebSocketService {
  constructor() {
    this.stompClient = null;
    this.isConnected = false;
    this.subscriptions = new Map();
    this.messageHandlers = new Set();
    this.connectionHandlers = new Set();
    this.disconnectionHandlers = new Set();
  }

  connect(username) {
    // Always disconnect first if connected to ensure clean reconnection
    if (this.isConnected && this.stompClient) {
      this.disconnect();
    }
    
    if (this.isConnected) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      try {
        // Create SockJS connection
        const getWebSocketUrl = () => {
          if (import.meta.env.PROD) {
            // Production: sử dụng current domain
            return `${window.location.origin}/ws`;
          } else {
            // Development: kết nối trực tiếp đến backend
            // Force http protocol for SockJS
            return 'http://localhost:8080/ws';
          }
        };
        
        const wsUrl = getWebSocketUrl();
        
        // Create SockJS connection
        const token = localStorage.getItem('accessToken');
        
        // Try native WebSocket first to avoid CORS issues
        let socket;
        try {
          // Try native WebSocket first
          const wsProtocol = wsUrl.startsWith('https') ? 'wss' : 'ws';
          const wsUrl_native = wsUrl.replace(/^https?:\/\//, `${wsProtocol}://`).replace('/ws', '/ws/websocket');
          socket = new WebSocket(wsUrl_native);
        } catch (error) {
          // Fallback to SockJS with CORS workaround
          socket = new SockJS(wsUrl, null, {
            transports: ['websocket', 'xhr-streaming', 'xhr-polling'],
            withCredentials: false
          });
        }
        
        // Create STOMP client
        this.stompClient = new Client({
          webSocketFactory: () => socket,
          debug: (str) => {
            // STOMP debug disabled
          },
          onConnect: (frame) => {
            this.isConnected = true;
            this.notifyConnectionHandlers();
            resolve();
          },
          onStompError: (frame) => {
            this.isConnected = false;
            this.notifyDisconnectionHandlers();
            reject(new Error('STOMP Error: ' + (frame.headers?.message || 'Unknown error')));
          },
          onWebSocketError: (error) => {
            this.isConnected = false;
            this.notifyDisconnectionHandlers();
            reject(new Error('WebSocket Error: ' + error.message));
          }
        });

        // Activate the STOMP client
        this.stompClient.activate();
        
        // Add timeout for connection
        setTimeout(() => {
          if (!this.isConnected) {
            reject(new Error('WebSocket connection timeout'));
          }
        }, 10000); // 10 seconds timeout
      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect() {
    if (this.stompClient && this.isConnected) {
      // Unsubscribe from all subscriptions
      this.subscriptions.forEach((subscription) => {
        subscription.unsubscribe();
      });
      this.subscriptions.clear();

      // Disconnect
      this.stompClient.deactivate();
      this.stompClient = null;
      this.isConnected = false;
      this.notifyDisconnectionHandlers();
    }
  }

  subscribeToUserMessages(username, callback) {
    if (!this.isConnected || !this.stompClient) {
      return null;
    }

    const subscription = this.stompClient.subscribe(`/user/${username}/queue/messages`, (message) => {
      try {
        const messageData = JSON.parse(message.body);
        this.notifyMessageHandlers(messageData);
        if (callback) {
          callback(messageData);
        }
      } catch (error) {
        // Error parsing message
      }
    });

    this.subscriptions.set(`/user/${username}/queue/messages`, subscription);
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

  // Event handlers
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
        // Error in message handler
      }
    });
  }

  notifyConnectionHandlers() {
    this.connectionHandlers.forEach(handler => {
      try {
        handler();
      } catch (error) {
        // Error in connection handler
      }
    });
  }

  notifyDisconnectionHandlers() {
    this.disconnectionHandlers.forEach(handler => {
      try {
        handler();
      } catch (error) {
        // Error in disconnection handler
      }
    });
  }

  getConnectionStatus() {
    return this.isConnected;
  }
}

// Create singleton instance
const websocketService = new WebSocketService();
export default websocketService;
