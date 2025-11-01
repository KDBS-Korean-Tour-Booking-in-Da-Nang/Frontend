import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import websocketService from '../services/websocketService';
import chatApiService from '../services/chatApiService';
import { useAuth } from './AuthContext';

const ChatContext = createContext();

// Initial state
const initialState = {
  // Connection status
  isConnected: false,
  isConnecting: false,
  
  // Current user
  currentUser: null,
  
  // Active chat
  activeChat: null,
  activeChatUser: null,
  
  // Messages
  messages: [],
  conversations: [],
  allUsers: [],
  
  // Pagination
  currentPage: 0,
  hasMoreMessages: true,
  isLoadingMoreMessages: false,
  
  // UI state
  isChatDropdownOpen: false,
  isChatBoxOpen: false,
  isChatBoxMinimized: false,
  
  // Multiple chat bubbles
  minimizedChats: [], // Array of minimized chat bubbles
  
  // Loading states
  loadingMessages: false,
  loadingConversations: false,
  loadingUsers: false,
  
  // Error states
  error: null,
  
  // WebSocket availability
  websocketAvailable: true
};

// Action types
const ActionTypes = {
  // Connection
  SET_CONNECTING: 'SET_CONNECTING',
  SET_CONNECTED: 'SET_CONNECTED',
  SET_DISCONNECTED: 'SET_DISCONNECTED',
  
  // User
  SET_CURRENT_USER: 'SET_CURRENT_USER',
  
  // Chat
  SET_ACTIVE_CHAT: 'SET_ACTIVE_CHAT',
  SET_ACTIVE_CHAT_USER: 'SET_ACTIVE_CHAT_USER',
  
  // Messages
  SET_MESSAGES: 'SET_MESSAGES',
  ADD_MESSAGE: 'ADD_MESSAGE',
  UPDATE_MESSAGE: 'UPDATE_MESSAGE',
  PREPEND_MESSAGES: 'PREPEND_MESSAGES',
  
  // Pagination
  SET_CURRENT_PAGE: 'SET_CURRENT_PAGE',
  SET_HAS_MORE_MESSAGES: 'SET_HAS_MORE_MESSAGES',
  SET_LOADING_MORE_MESSAGES: 'SET_LOADING_MORE_MESSAGES',
  
  // Message sorting
  SORT_MESSAGES: 'SORT_MESSAGES',
  
  // Conversations
  SET_CONVERSATIONS: 'SET_CONVERSATIONS',
  UPDATE_CONVERSATION: 'UPDATE_CONVERSATION',
  UPSERT_CONVERSATION: 'UPSERT_CONVERSATION',
  SORT_CONVERSATIONS_BY_LATEST: 'SORT_CONVERSATIONS_BY_LATEST',
  
  // Users
  SET_ALL_USERS: 'SET_ALL_USERS',
  
  // UI
  SET_CHAT_DROPDOWN_OPEN: 'SET_CHAT_DROPDOWN_OPEN',
  SET_CHAT_BOX_OPEN: 'SET_CHAT_BOX_OPEN',
  SET_CHAT_BOX_MINIMIZED: 'SET_CHAT_BOX_MINIMIZED',
  
  // Multiple chat bubbles
  ADD_MINIMIZED_CHAT: 'ADD_MINIMIZED_CHAT',
  REMOVE_MINIMIZED_CHAT: 'REMOVE_MINIMIZED_CHAT',
  SET_MINIMIZED_CHATS: 'SET_MINIMIZED_CHATS',
  
  // Loading
  SET_LOADING_MESSAGES: 'SET_LOADING_MESSAGES',
  SET_LOADING_CONVERSATIONS: 'SET_LOADING_CONVERSATIONS',
  SET_LOADING_USERS: 'SET_LOADING_USERS',
  
  // Error
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  
  // WebSocket availability
  SET_WEBSOCKET_AVAILABLE: 'SET_WEBSOCKET_AVAILABLE'
};

// Reducer
const chatReducer = (state, action) => {
  switch (action.type) {
    case ActionTypes.SET_CONNECTING:
      return {
        ...state,
        isConnecting: true,
        isConnected: false,
        error: null
      };
    
    case ActionTypes.SET_CONNECTED:
      return {
        ...state,
        isConnecting: false,
        isConnected: true,
        error: null
      };
    
    case ActionTypes.SET_DISCONNECTED:
      return {
        ...state,
        isConnecting: false,
        isConnected: false
      };
    
    case ActionTypes.SET_CURRENT_USER:
      return {
        ...state,
        currentUser: action.payload
      };
    
    case ActionTypes.SET_ACTIVE_CHAT:
      return {
        ...state,
        activeChat: action.payload
      };
    
    case ActionTypes.SET_ACTIVE_CHAT_USER:
      return {
        ...state,
        activeChatUser: action.payload
      };
    
    case ActionTypes.SET_MESSAGES:
      return {
        ...state,
        messages: action.payload,
        loadingMessages: false
      };
    
    case ActionTypes.ADD_MESSAGE: {
      const incoming = action.payload;
      // De-duplicate: skip if a very similar message already exists (same sender/ownership, same content, within 5s)
      const alreadyExists = state.messages.some(existing => {
        const sameOwnership = !!existing.isOwn === !!incoming.isOwn;
        const sameContent = (existing.content || '') === (incoming.content || '');
        const existingTs = new Date(existing.timestamp).getTime();
        const incomingTs = new Date(incoming.timestamp).getTime();
        const closeInTime = Math.abs(existingTs - incomingTs) <= 5000; // 5 seconds window
        const existingSender = existing.sender?.userName || existing.senderName || '';
        const incomingSender = incoming.sender?.userName || incoming.senderName || '';
        const existingReceiver = existing.receiver?.userName || existing.receiverName || '';
        const incomingReceiver = incoming.receiver?.userName || incoming.receiverName || '';
        const sameDirection = existingSender === incomingSender && existingReceiver === incomingReceiver;
        return sameOwnership && sameContent && closeInTime && sameDirection;
      });
      if (alreadyExists) {
        return state;
      }
      return {
        ...state,
        messages: [...state.messages, incoming]
      };
    }
    
    case ActionTypes.UPDATE_MESSAGE:
      return {
        ...state,
        messages: state.messages.map(msg => 
          msg.id === action.payload.id ? action.payload : msg
        )
      };
    
    case ActionTypes.PREPEND_MESSAGES: {
      // Filter out duplicate messages based on ID or near-identical signature
      const existing = state.messages;
      const existingIds = new Set(existing.map(msg => msg.id));
      const dedupedIncoming = (action.payload || []).filter(msg => {
        if (existingIds.has(msg.id)) return false;
        const existsSimilar = existing.some(e => {
          const sameOwnership = !!e.isOwn === !!msg.isOwn;
          const sameContent = (e.content || '') === (msg.content || '');
          const eTs = new Date(e.timestamp).getTime();
          const mTs = new Date(msg.timestamp).getTime();
          const closeInTime = Math.abs(eTs - mTs) <= 5000;
          const eSender = e.sender?.userName || e.senderName || '';
          const mSender = msg.sender?.userName || msg.senderName || '';
          const eReceiver = e.receiver?.userName || e.receiverName || '';
          const mReceiver = msg.receiver?.userName || msg.receiverName || '';
          const sameDirection = eSender === mSender && eReceiver === mReceiver;
          return sameOwnership && sameContent && closeInTime && sameDirection;
        });
        return !existsSimilar;
      });

      // Combine and sort all messages by timestamp
      const combinedMessages = [...dedupedIncoming, ...existing];
      const sortedMessages = combinedMessages.sort((a, b) => 
        new Date(a.timestamp) - new Date(b.timestamp)
      );
      
      return {
        ...state,
        messages: sortedMessages,
        isLoadingMoreMessages: false
      };
    }
    
    case ActionTypes.SET_CURRENT_PAGE:
      return {
        ...state,
        currentPage: action.payload
      };
    
    case ActionTypes.SET_HAS_MORE_MESSAGES:
      return {
        ...state,
        hasMoreMessages: action.payload
      };
    
    case ActionTypes.SET_LOADING_MORE_MESSAGES:
      return {
        ...state,
        isLoadingMoreMessages: action.payload
      };
    
    case ActionTypes.SORT_MESSAGES:
      return {
        ...state,
        messages: [...state.messages].sort((a, b) => 
          new Date(a.timestamp) - new Date(b.timestamp)
        )
      };
    
    case ActionTypes.SET_CONVERSATIONS:
      return {
        ...state,
        conversations: (action.payload || []).sort((a, b) => new Date(b.lastMessage?.timestamp || 0) - new Date(a.lastMessage?.timestamp || 0)),
        loadingConversations: false
      };
    
    case ActionTypes.UPDATE_CONVERSATION:
      return {
        ...state,
        conversations: state.conversations.map(conv => 
          conv.user.userName === action.payload.user.userName 
            ? action.payload 
            : conv
        )
      };

    case ActionTypes.UPSERT_CONVERSATION: {
      const payload = action.payload;
      const key = payload.user.userName;
      const existingIndex = state.conversations.findIndex(c => c.user.userName === key);
      let updated = [];
      if (existingIndex >= 0) {
        updated = state.conversations.map((c, i) => i === existingIndex ? { ...c, ...payload } : c);
      } else {
        updated = [payload, ...state.conversations];
      }
      // sort by latest timestamp desc
      updated.sort((a, b) => new Date(b.lastMessage?.timestamp || 0) - new Date(a.lastMessage?.timestamp || 0));
      return { ...state, conversations: updated };
    }

    case ActionTypes.SORT_CONVERSATIONS_BY_LATEST: {
      const sorted = [...state.conversations].sort((a, b) => new Date(b.lastMessage?.timestamp || 0) - new Date(a.lastMessage?.timestamp || 0));
      return { ...state, conversations: sorted };
    }
    
    case ActionTypes.SET_ALL_USERS:
      return {
        ...state,
        allUsers: action.payload,
        loadingUsers: false
      };
    
    case ActionTypes.SET_CHAT_DROPDOWN_OPEN:
      return {
        ...state,
        isChatDropdownOpen: action.payload
      };
    
    case ActionTypes.SET_CHAT_BOX_OPEN:
      return {
        ...state,
        isChatBoxOpen: action.payload
      };
    
    case ActionTypes.SET_CHAT_BOX_MINIMIZED:
      return {
        ...state,
        isChatBoxMinimized: action.payload
      };
    
    case ActionTypes.ADD_MINIMIZED_CHAT:
      return {
        ...state,
        minimizedChats: [...(state.minimizedChats || []), action.payload]
      };
    
    case ActionTypes.REMOVE_MINIMIZED_CHAT:
      return {
        ...state,
        minimizedChats: (state.minimizedChats || []).filter(chat => chat.userId !== action.payload)
      };
    
    case ActionTypes.SET_MINIMIZED_CHATS:
      return {
        ...state,
        minimizedChats: action.payload || []
      };
    
    case ActionTypes.SET_LOADING_MESSAGES:
      return {
        ...state,
        loadingMessages: action.payload
      };
    
    case ActionTypes.SET_LOADING_CONVERSATIONS:
      return {
        ...state,
        loadingConversations: action.payload
      };
    
    case ActionTypes.SET_LOADING_USERS:
      return {
        ...state,
        loadingUsers: action.payload
      };
    
    case ActionTypes.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        loadingMessages: false,
        loadingConversations: false,
        loadingUsers: false
      };
    
    case ActionTypes.CLEAR_ERROR:
      return {
        ...state,
        error: null
      };
    
    case ActionTypes.SET_WEBSOCKET_AVAILABLE:
      return {
        ...state,
        websocketAvailable: action.payload
      };
    
    default:
      return state;
  }
};

// Provider component
export const ChatProvider = ({ children }) => {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const { user: authUser, getToken } = useAuth();
  
  console.log('ChatProvider initialized with user:', authUser);
  
  // Use ref to store current user for WebSocket handlers
  const currentUserRef = useRef(null);

  // Initialize connection function
  const initializeConnection = async () => {
    try {
      dispatch({ type: ActionTypes.SET_CONNECTING });
      
      // Get current user from AuthContext (from login)
      const token = getToken();
      
      if (token && authUser) {
        let currentUser = null;
        
        // Use user data from AuthContext
        if (authUser) {
          currentUser = {
            userId: authUser.userId || authUser.id,
            userName: authUser.username || authUser.userName || authUser.name,
            userEmail: authUser.email || authUser.userEmail,
            role: authUser.role || 'USER'
          };
        } else {
          // Fallback to mock user if no auth user
          currentUser = {
            userId: 2,
            userName: 'ttinh2852',
            userEmail: 'ttinh2852@gmail.com',
            role: 'USER'
          };
        }
        
        dispatch({ type: ActionTypes.SET_CURRENT_USER, payload: currentUser });
        // Update ref for WebSocket handlers
        currentUserRef.current = currentUser;
        
        try {
          // Connect to WebSocket
          const username = currentUser.userName || currentUser.username || currentUser.name || 'unknown';
          await websocketService.connect(username);
          dispatch({ type: ActionTypes.SET_CONNECTED });
          
          // Subscribe to user messages
          websocketService.subscribeToUserMessages(username, (message) => {
            // Only add messages that are not from current user to avoid duplicates
            const currentUserName = currentUser.userName || currentUser.username || currentUser.name;
            // Backend sends ChatMessageRequest with senderName field directly
            const messageSenderName = message.senderName || message.sender?.userName || message.sender?.username || message.sender?.name;
            
            // Filter out messages from current user to avoid duplicates
            if (messageSenderName !== currentUserName) {
              // Add isOwn field for display
              const messageWithOwnership = {
                ...message,
                isOwn: false,
                id: message.id || `ws-${Date.now()}-${Math.random()}`
              };
              dispatch({ type: ActionTypes.ADD_MESSAGE, payload: messageWithOwnership });

              // Upsert conversation for sender
              const rawOther = messageWithOwnership.senderName || messageWithOwnership.sender?.userName || messageSenderName;
              const otherUserName = resolveLoginUsername(rawOther);
              const conversation = {
                user: { userName: otherUserName, username: otherUserName, avatar: messageWithOwnership.sender?.avatar },
                lastMessage: {
                  content: messageWithOwnership.content,
                  timestamp: messageWithOwnership.timestamp,
                  senderName: otherUserName,
                  receiverName: currentUserName
                },
                unreadCount: 0
              };
              dispatch({ type: ActionTypes.UPSERT_CONVERSATION, payload: conversation });
            }
          });
        } catch (wsError) {
          // Set as connected anyway for UI purposes, but disable real-time features
          dispatch({ type: ActionTypes.SET_CONNECTED });
          // Set a flag to indicate WebSocket is not available
          dispatch({ type: ActionTypes.SET_WEBSOCKET_AVAILABLE, payload: false });
        }
      } else {
        // No user logged in
        dispatch({ type: ActionTypes.SET_DISCONNECTED });
      }
      
    } catch (error) {
      dispatch({ type: ActionTypes.SET_ERROR, payload: error.message });
      dispatch({ type: ActionTypes.SET_DISCONNECTED });
    }
  };
  // Keep only minimal safe fields when persisting to storage
  const pickMinimalUser = (user) => {
    if (!user) return null;
    const minimal = {
      userName: user.userName || user.username || user.name || '',
      username: user.username || user.userName || '',
      avatar: user.avatar || null,
      email: user.email || user.userEmail || null,
      userEmail: user.userEmail || user.email || null
    };
    return minimal;
  };

  // Get freshest current user immediately after profile update (no F5)
  const getLiveCurrentUser = () => {
    const mapped = authUser ? {
      userId: authUser.userId || authUser.id,
      userName: authUser.username || authUser.userName || authUser.name,
      userEmail: authUser.email || authUser.userEmail,
      role: authUser.role || 'USER'
    } : null;
    if (mapped && mapped.userName && state.currentUser?.userName !== mapped.userName) {
      dispatch({ type: ActionTypes.SET_CURRENT_USER, payload: mapped });
      currentUserRef.current = mapped;
    }
    return mapped || state.currentUser;
  };


  // Resolve a safe login username from user object or name string
  const resolveLoginUsername = (input) => {
    if (!input) return '';
    // If object with potential fields
    if (typeof input === 'object') {
      const direct = input.userName || input.username || input.name || '';
      if (typeof direct === 'string' && direct.trim() && !direct.includes(' ')) return direct.trim();
      const display = direct || input.fullName || input.userFullName || input.email || input.userEmail || '';
      const match = (state.allUsers || []).find(u => (
        u.userName === direct || u.username === direct || u.fullName === display || u.name === display
      ));
      if (match) return (match.userName || match.username || '').trim();
      return (direct || '').trim();
    }
    // If plain string
    if (typeof input === 'string') {
      if (input.trim() && !input.includes(' ')) return input.trim();
      const match = (state.allUsers || []).find(u => (
        u.userName === input || u.username === input || u.fullName === input || u.name === input
      ));
      if (match) return (match.userName || match.username || '').trim();
      return input.trim();
    }
    return '';
  };

  // Initialize chat system using existing chat API
  useEffect(() => {
    // Check if user is logged in
    if (authUser && getToken()) {
      initializeConnection();
    }

    // Cleanup on unmount
    return () => {
      websocketService.disconnect();
    };
  }, []);

  // Listen for auth changes
  useEffect(() => {
    const handleAuthChange = () => {
      if (authUser && getToken() && !state.isConnected) {
        initializeConnection();
      } else if (!authUser) {
        websocketService.disconnect();
        dispatch({ type: ActionTypes.SET_DISCONNECTED });
        dispatch({ type: ActionTypes.SET_CURRENT_USER, payload: null });
        // Clear ref when user logs out
        currentUserRef.current = null;
        // Close chat UI and clear state when logging out
        dispatch({ type: ActionTypes.SET_CHAT_BOX_OPEN, payload: false });
        dispatch({ type: ActionTypes.SET_CHAT_BOX_MINIMIZED, payload: false });
        dispatch({ type: ActionTypes.SET_CHAT_DROPDOWN_OPEN, payload: false });
        dispatch({ type: ActionTypes.SET_ACTIVE_CHAT_USER, payload: null });
        dispatch({ type: ActionTypes.SET_MESSAGES, payload: [] });
        dispatch({ type: ActionTypes.SET_MINIMIZED_CHATS, payload: [] });
        try {
          localStorage.removeItem('chatBoxState');
          localStorage.removeItem('minimizedChats');
        } catch {}
      }
    };

    handleAuthChange();
  }, [authUser]);

  // WebSocket event handlers - Only for connection status
  useEffect(() => {
    const handleConnection = () => {
      dispatch({ type: ActionTypes.SET_CONNECTED });
    };

    const handleDisconnection = () => {
      dispatch({ type: ActionTypes.SET_DISCONNECTED });
    };

    // Subscribe to WebSocket events - Only connection status, not messages
    const unsubscribeConnection = websocketService.onConnection(handleConnection);
    const unsubscribeDisconnection = websocketService.onDisconnection(handleDisconnection);
    // Remove message handler to avoid duplicate with subscription handler

    return () => {
      unsubscribeConnection();
      unsubscribeDisconnection();
    };
  }, []);

  // Actions
  const actions = {
    // Connection
    connect: async () => {
      try {
        dispatch({ type: ActionTypes.SET_CONNECTING });
        await websocketService.connect(state.currentUser?.userName);
        dispatch({ type: ActionTypes.SET_CONNECTED });
      } catch (error) {
        dispatch({ type: ActionTypes.SET_ERROR, payload: error.message });
      }
    },

    disconnect: () => {
      websocketService.disconnect();
      dispatch({ type: ActionTypes.SET_DISCONNECTED });
    },

    // Chat actions
    openChatWithUser: async (user) => {
      try {
        // If there's already an active chat, minimize it first
        if (state.activeChatUser && state.messages.length > 0) {
          const currentUserId = state.activeChatUser.userName || state.activeChatUser.username;
          
          // Check if this chat is already minimized
          const existingChat = (state.minimizedChats || []).find(chat => chat.userId === currentUserId);
          
          if (!existingChat) {
            // Add current chat to minimized chats
            const minimizedChat = {
              userId: currentUserId,
              user: state.activeChatUser,
              messages: state.messages,
              timestamp: Date.now()
            };
            dispatch({ type: ActionTypes.ADD_MINIMIZED_CHAT, payload: minimizedChat });
          }
        }
        
        // Set new active chat user
        dispatch({ type: ActionTypes.SET_ACTIVE_CHAT_USER, payload: user });
        dispatch({ type: ActionTypes.SET_CHAT_BOX_OPEN, payload: true });
        dispatch({ type: ActionTypes.SET_CHAT_BOX_MINIMIZED, payload: false }); // Ensure chatbox is visible
        dispatch({ type: ActionTypes.SET_CHAT_DROPDOWN_OPEN, payload: false });
        
        // Save chat state to localStorage for persistence
        const minimalUser = pickMinimalUser(user);
        localStorage.setItem('chatBoxState', JSON.stringify({
          isOpen: true,
          activeChatUser: minimalUser
        }));
        
        // Load conversation from API with pagination (latest messages first)
        dispatch({ type: ActionTypes.SET_LOADING_MESSAGES, payload: true });
        dispatch({ type: ActionTypes.SET_CURRENT_PAGE, payload: 0 });
        dispatch({ type: ActionTypes.SET_HAS_MORE_MESSAGES, payload: true });
        
        const liveUser = getLiveCurrentUser();
        let receiver = resolveLoginUsername(user);
        let messages = await chatApiService.getConversation(
          liveUser.userName, 
          receiver,
          0, // page 0 for latest messages
          25 // size 25 for initial load
        );
        // Defensive: if other user just renamed and backend rejects old name → reload users and retry once
        if (!Array.isArray(messages)) {
          // no-op; typical backend returns array. Keep as-is.
        }
        const formattedMessages = chatApiService.formatConversation(messages, liveUser);
        
        // Sort messages by timestamp (oldest first for display - newest at bottom)
        const sortedMessages = formattedMessages.sort((a, b) => 
          new Date(a.timestamp) - new Date(b.timestamp)
        );
        
        dispatch({ type: ActionTypes.SET_MESSAGES, payload: sortedMessages });
        
      } catch (error) {
        // One-shot retry with refreshed users in case receiver renamed mid-session
        try {
          await actions.loadAllUsers();
          const liveUser = getLiveCurrentUser();
          const receiver = resolveLoginUsername(user);
          const messages = await chatApiService.getConversation(
            liveUser.userName,
            receiver,
            0,
            25
          );
          const formattedMessages = chatApiService.formatConversation(messages, liveUser);
          const sortedMessages = formattedMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
          dispatch({ type: ActionTypes.SET_MESSAGES, payload: sortedMessages });
        } catch (e2) {
          console.error('Error opening chat with user:', e2);
          dispatch({ type: ActionTypes.SET_MESSAGES, payload: [] });
          dispatch({ type: ActionTypes.SET_LOADING_MESSAGES, payload: false });
        }
      }
    },

    sendMessage: async (content) => {
      if (!state.activeChatUser || !content.trim()) return;

      try {
        const liveUser2 = getLiveCurrentUser();
        const senderName = liveUser2?.userName || liveUser2?.username || liveUser2?.name || 'unknown';
        const receiverName = state.activeChatUser?.userName || state.activeChatUser?.username || state.activeChatUser?.name || 'unknown';
        
        // Add message to local state immediately (optimistic update)
        const tempMessage = {
          id: `temp-${Date.now()}`, // Temporary ID
          content: content.trim(),
          timestamp: new Date().toISOString(),
          sender: {
            userId: state.currentUser?.userId,
            userName: senderName,
            userEmail: state.currentUser?.userEmail
          },
          receiver: {
            userId: state.activeChatUser?.userId,
            userName: receiverName,
            userEmail: state.activeChatUser?.userEmail
          },
          isOwn: true
        };
        
        dispatch({ type: ActionTypes.ADD_MESSAGE, payload: tempMessage });

        // Update conversations immediately so dropdown shows latest preview and reorders to top
        const upsertForSelf = {
          user: { userName: receiverName, username: receiverName, avatar: state.activeChatUser?.avatar },
          lastMessage: {
            content: tempMessage.content,
            timestamp: tempMessage.timestamp,
            senderName: senderName,
            receiverName: receiverName
          },
          unreadCount: 0
        };
        dispatch({ type: ActionTypes.UPSERT_CONVERSATION, payload: upsertForSelf });
        
        const messageData = {
          senderName: senderName,
          receiverName: receiverName,
          content: content.trim()
        };

        // Only use WebSocket - no API fallback to avoid duplicates
        if (state.websocketAvailable) {
          const success = websocketService.sendMessage(messageData);
          
          if (success) {
            // Message already added to local state, WebSocket will handle delivery
            return;
          } else {
            // Remove the temporary message if WebSocket fails
            dispatch({ 
              type: ActionTypes.UPDATE_MESSAGE, 
              payload: { ...tempMessage, id: null, content: 'Failed to send' }
            });
          }
        } else {
          // Remove the temporary message if WebSocket is not available
          dispatch({ 
            type: ActionTypes.UPDATE_MESSAGE, 
            payload: { ...tempMessage, id: null, content: 'WebSocket not available' }
          });
        }
        
      } catch (error) {
        dispatch({ type: ActionTypes.SET_ERROR, payload: error.message });
      }
    },

    // UI actions
    toggleChatDropdown: () => {
      dispatch({ 
        type: ActionTypes.SET_CHAT_DROPDOWN_OPEN, 
        payload: !state.isChatDropdownOpen 
      });
    },

    closeChatDropdown: () => {
      dispatch({ type: ActionTypes.SET_CHAT_DROPDOWN_OPEN, payload: false });
    },

    toggleChatBox: () => {
      dispatch({ 
        type: ActionTypes.SET_CHAT_BOX_OPEN, 
        payload: !state.isChatBoxOpen 
      });
    },

    openChatBox: () => {
      dispatch({ type: ActionTypes.SET_CHAT_BOX_OPEN, payload: true });
    },

    closeChatBox: () => {
      // Close the corresponding minimized chat bubble if exists
      if (state.activeChatUser) {
        const userId = state.activeChatUser.userName || state.activeChatUser.username;
        dispatch({ type: ActionTypes.REMOVE_MINIMIZED_CHAT, payload: userId });
      }
      
      dispatch({ type: ActionTypes.SET_CHAT_BOX_OPEN, payload: false });
      dispatch({ type: ActionTypes.SET_ACTIVE_CHAT_USER, payload: null });
      dispatch({ type: ActionTypes.SET_MESSAGES, payload: [] });
      dispatch({ type: ActionTypes.SET_CHAT_BOX_MINIMIZED, payload: false });
      
      // Clear saved chat state from localStorage
      localStorage.removeItem('chatBoxState');
      localStorage.removeItem('minimizedChats');
    },

    minimizeChatBox: () => {
      if (state.activeChatUser) {
        const userId = state.activeChatUser.userName || state.activeChatUser.username;
        
        // Check if this chat is already minimized
        const existingChat = (state.minimizedChats || []).find(chat => chat.userId === userId);
        
        if (!existingChat) {
          // Add current chat to minimized chats only if not already minimized
          const minimizedChat = {
            userId: userId,
            user: state.activeChatUser,
            messages: state.messages,
            timestamp: Date.now()
          };
          dispatch({ type: ActionTypes.ADD_MINIMIZED_CHAT, payload: minimizedChat });
          
          // Save minimized chats to localStorage with minimal user fields only (no messages)
          const updatedMinimizedChats = [...(state.minimizedChats || []), minimizedChat]
            .map(c => ({ userId: c.userId, user: pickMinimalUser(c.user), timestamp: c.timestamp }));
          localStorage.setItem('minimizedChats', JSON.stringify(updatedMinimizedChats));
        }
      }
      dispatch({ type: ActionTypes.SET_CHAT_BOX_MINIMIZED, payload: true });
      dispatch({ type: ActionTypes.SET_CHAT_BOX_OPEN, payload: false });
      
      // Update saved chat state to reflect minimized state
      const minimalUser = pickMinimalUser(state.activeChatUser);
      localStorage.setItem('chatBoxState', JSON.stringify({
        isOpen: false,
        activeChatUser: minimalUser,
        isMinimized: true
      }));
    },

    restoreChatBox: () => {
      dispatch({ type: ActionTypes.SET_CHAT_BOX_MINIMIZED, payload: false });
    },

    restoreChatFromBubble: (userId) => {
      // Find the minimized chat
      const minimizedChat = state.minimizedChats.find(chat => chat.userId === userId);
      if (minimizedChat) {
        // Set as active chat
        dispatch({ type: ActionTypes.SET_ACTIVE_CHAT_USER, payload: minimizedChat.user });
        // If we don't have messages (because we don't persist them), load from API; else restore
        if (Array.isArray(minimizedChat.messages) && minimizedChat.messages.length > 0) {
          dispatch({ type: ActionTypes.SET_MESSAGES, payload: minimizedChat.messages });
        } else {
          dispatch({ type: ActionTypes.SET_MESSAGES, payload: [] });
          // Fire and forget load
          actions.loadConversation(minimizedChat.user);
        }
        dispatch({ type: ActionTypes.SET_CHAT_BOX_OPEN, payload: true });
        dispatch({ type: ActionTypes.SET_CHAT_BOX_MINIMIZED, payload: false });
        // Remove from minimized chats
        dispatch({ type: ActionTypes.REMOVE_MINIMIZED_CHAT, payload: userId });
        
        // Save restored chat state to localStorage
        const minimalUser = pickMinimalUser(minimizedChat.user);
        localStorage.setItem('chatBoxState', JSON.stringify({
          isOpen: true,
          activeChatUser: minimalUser
        }));
        
        // Update minimized chats in localStorage
        const updatedMinimizedChats = state.minimizedChats
          .filter(chat => chat.userId !== userId)
          .map(c => ({ userId: c.userId, user: pickMinimalUser(c.user), timestamp: c.timestamp }));
        if (updatedMinimizedChats.length > 0) {
          localStorage.setItem('minimizedChats', JSON.stringify(updatedMinimizedChats));
        } else {
          localStorage.removeItem('minimizedChats');
        }
      }
    },

    closeMinimizedChat: (userId) => {
      dispatch({ type: ActionTypes.REMOVE_MINIMIZED_CHAT, payload: userId });
      
      // Update localStorage
      const updatedMinimizedChats = (state.minimizedChats || []).filter(chat => chat.userId !== userId);
      if (updatedMinimizedChats.length > 0) {
        localStorage.setItem('minimizedChats', JSON.stringify(updatedMinimizedChats));
      } else {
        localStorage.removeItem('minimizedChats');
      }
    },

    // Data loading
    loadConversations: async () => {
      try {
        dispatch({ type: ActionTypes.SET_LOADING_CONVERSATIONS, payload: true });
        const liveUser = getLiveCurrentUser();
        const messages = await chatApiService.getAllMessagesFromUser(liveUser.userName);
        const conversations = chatApiService.getConversationsList(messages, liveUser);
        dispatch({ type: ActionTypes.SET_CONVERSATIONS, payload: conversations });
      } catch (error) {
        dispatch({ type: ActionTypes.SET_CONVERSATIONS, payload: [] });
      }
    },

    // Load conversation with a specific user
    loadConversation: async (user) => {
      if (!user || !getLiveCurrentUser()) return;

      try {
        dispatch({ type: ActionTypes.SET_LOADING_MESSAGES, payload: true });
        dispatch({ type: ActionTypes.SET_ACTIVE_CHAT_USER, payload: user });
        
        const liveUser = getLiveCurrentUser();
        const senderName = liveUser.userName || liveUser.username || liveUser.name;
        const receiverName = resolveLoginUsername(user);
        
        const messages = await chatApiService.getConversationLegacy(senderName, receiverName);
        const formattedMessages = chatApiService.formatConversation(messages, liveUser);
        
        dispatch({ type: ActionTypes.SET_MESSAGES, payload: formattedMessages });
        
      } catch (error) {
        console.error('Error loading conversation:', error);
        dispatch({ type: ActionTypes.SET_ERROR, payload: error.message });
        dispatch({ type: ActionTypes.SET_MESSAGES, payload: [] });
      } finally {
        dispatch({ type: ActionTypes.SET_LOADING_MESSAGES, payload: false });
      }
    },

    // Load more messages for infinite scroll
    loadMoreMessages: async () => {
      if (!state.activeChatUser || !getLiveCurrentUser() || state.isLoadingMoreMessages || !state.hasMoreMessages) {
        return;
      }

      try {
        dispatch({ type: ActionTypes.SET_LOADING_MORE_MESSAGES, payload: true });
        
        const nextPage = state.currentPage + 1;
        const liveUser = getLiveCurrentUser();
        const senderName = liveUser.userName || liveUser.username || liveUser.name;
        const receiverName = resolveLoginUsername(state.activeChatUser);
        
        const messages = await chatApiService.getConversation(
          senderName, 
          receiverName,
          nextPage,
          25
        );
        
        if (!messages || messages.length === 0) {
          // No more messages
          dispatch({ type: ActionTypes.SET_HAS_MORE_MESSAGES, payload: false });
        } else {
          const formattedMessages = chatApiService.formatConversation(messages, state.currentUser);
          
          // Sort older messages by timestamp (oldest first for prepending)
          const sortedOlderMessages = formattedMessages.sort((a, b) => 
            new Date(a.timestamp) - new Date(b.timestamp)
          );
          
          // Check if we actually have new messages to add
          if (sortedOlderMessages.length > 0) {
            dispatch({ type: ActionTypes.PREPEND_MESSAGES, payload: sortedOlderMessages });
            dispatch({ type: ActionTypes.SET_CURRENT_PAGE, payload: nextPage });
          } else {
            // No new messages, set hasMore to false
            dispatch({ type: ActionTypes.SET_HAS_MORE_MESSAGES, payload: false });
          }
        }
        
      } catch (error) {
        console.error('Error loading more messages:', error);
        dispatch({ type: ActionTypes.SET_ERROR, payload: error.message });
      } finally {
        dispatch({ type: ActionTypes.SET_LOADING_MORE_MESSAGES, payload: false });
      }
    },

    loadAllUsers: async () => {
      try {
        dispatch({ type: ActionTypes.SET_LOADING_USERS, payload: true });
        const users = await chatApiService.getAllUsers();
        // Filter out current user from the list and limit to reasonable number
        const filteredUsers = (users || [])
          .filter(user => user.username !== state.currentUser?.userName)
          .slice(0, 50); // Limit to 50 users for performance
        dispatch({ type: ActionTypes.SET_ALL_USERS, payload: filteredUsers });
      } catch (error) {
        dispatch({ type: ActionTypes.SET_ALL_USERS, payload: [] });
      }
    },

    loadMockUsers: () => {
      // Mock users for testing
      const mockUsers = [
        {
          userId: 2,
          userName: 'alice',
          userEmail: 'alice@example.com'
        },
        {
          userId: 3,
          userName: 'bob',
          userEmail: 'bob@example.com'
        },
        {
          userId: 4,
          userName: 'charlie',
          userEmail: 'charlie@example.com'
        }
      ];
      dispatch({ type: ActionTypes.SET_ALL_USERS, payload: mockUsers });
    },

    // Error handling
    clearError: () => {
      dispatch({ type: ActionTypes.CLEAR_ERROR });
    },

    // Restore minimized chats from localStorage
    restoreMinimizedChats: () => {
      try {
        const savedMinimizedChats = localStorage.getItem('minimizedChats');
        if (savedMinimizedChats) {
          const minimizedChats = (JSON.parse(savedMinimizedChats) || []).map(c => ({
            userId: c.userId,
            user: c.user, // already minimal
            messages: [],
            timestamp: c.timestamp || Date.now()
          }));
          dispatch({ type: ActionTypes.SET_MINIMIZED_CHATS, payload: minimizedChats });
        }
      } catch (error) {
        console.error('Error restoring minimized chats:', error);
        localStorage.removeItem('minimizedChats');
      }
    },

    // Initialize chat when user logs in
    initializeChat: async () => {
      try {
        dispatch({ type: ActionTypes.SET_CONNECTING });
        
        // Get current user first
        const currentUser = await chatApiService.getCurrentUser();
        dispatch({ type: ActionTypes.SET_CURRENT_USER, payload: currentUser });
        
        // Connect to WebSocket
        await websocketService.connect(currentUser.userName);
        dispatch({ type: ActionTypes.SET_CONNECTED });
        
        // Subscribe to user messages
        websocketService.subscribeToUserMessages(currentUser.userName, (message) => {
          const formattedMessage = chatApiService.formatMessage(message, currentUser);
          dispatch({ type: ActionTypes.ADD_MESSAGE, payload: formattedMessage });
        });
        
      } catch (error) {
        dispatch({ type: ActionTypes.SET_ERROR, payload: error.message });
        dispatch({ type: ActionTypes.SET_DISCONNECTED });
      }
    }
  };

  return (
    <ChatContext.Provider value={{ state, actions }}>
      {children}
    </ChatContext.Provider>
  );
};

// Hook to use chat context
export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    console.error('ChatContext not found. Make sure ChatProvider is properly wrapped around the component.');
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

export default ChatContext;
