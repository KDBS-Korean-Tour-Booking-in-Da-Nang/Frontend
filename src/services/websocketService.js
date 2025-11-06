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
        const getWebSocketUrl = () => {
          if (import.meta.env.PROD) {
            return `${window.location.origin}/ws`;
          } else {
            return 'http://localhost:8080/ws';
          }
        };

        const wsUrl = getWebSocketUrl();
        const token = sessionStorage.getItem('token') || localStorage.getItem('token') || localStorage.getItem('accessToken');

        // Prefer native WebSocket to avoid CORS on SockJS XHR /info
        const createNativeWebSocket = () => {
          const wsProtocol = wsUrl.startsWith('https') ? 'wss' : 'ws';
          const nativeUrl = wsUrl.replace(/^https?:\/\//, `${wsProtocol}://`).replace('/ws', '/ws/websocket');
          return new WebSocket(nativeUrl);
        };

        // Create STOMP client
        this.stompClient = new Client({
          webSocketFactory: () => createNativeWebSocket(),
          debug: () => {},
          connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
          heartbeatIncoming: 15000,
          heartbeatOutgoing: 15000,
          reconnectDelay: 5000, // auto-reconnect
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
            // Do not reject after resolve; only reject if not yet connected
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

        // Add timeout for initial connection
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

  subscribeToGlobalNotifications(callback) {
    if (!this.isConnected || !this.stompClient) return null;
    const destination = '/topic/notifications';
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
    // Spring user destination: client should subscribe to '/user/queue/notifications'
    // Server routes to the authenticated user; no username segment is needed here.
    const destination = `/user/queue/notifications`;
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
