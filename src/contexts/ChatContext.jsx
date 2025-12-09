import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import websocketService from '../services/websocketService';
import chatApiService from '../services/chatApiService';
import { useAuth } from './AuthContext';
import { CHAT_EVENTS } from '../components/chatAI/BubbleChatAI';

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
  hasUnreadMessages: false,

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
  SET_HAS_UNREAD_MESSAGES: 'SET_HAS_UNREAD_MESSAGES',

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

      // Stronger de-duplication: check by ID first, then by content + sender + time
      if (incoming.id) {
        const existsById = state.messages.some(existing => existing.id === incoming.id);
        if (existsById) {
          return state;
        }
      }

      // De-duplicate: skip if a very similar message already exists (same sender/ownership, same content, within 3s)
      const alreadyExists = state.messages.some(existing => {
        // Skip temp messages in comparison (they will be replaced)
        if (existing.id && typeof existing.id === 'string' && existing.id.startsWith('temp-')) {
          return false;
        }

        const sameOwnership = !!existing.isOwn === !!incoming.isOwn;
        const sameContent = (existing.content || '').trim() === (incoming.content || '').trim();
        if (!sameContent || !sameOwnership) {
          return false;
        }

        const existingTs = new Date(existing.timestamp).getTime();
        const incomingTs = new Date(incoming.timestamp).getTime();
        const closeInTime = Math.abs(existingTs - incomingTs) <= 3000; // 3 seconds window (reduced from 5s)

        if (!closeInTime) {
          return false;
        }

        const existingSenderId = existing.sender?.userId || existing.sender?.id || existing.senderId;
        const incomingSenderId = incoming.sender?.userId || incoming.sender?.id || incoming.senderId;
        const existingReceiverId = existing.receiver?.userId || existing.receiver?.id || existing.receiverId;
        const incomingReceiverId = incoming.receiver?.userId || incoming.receiver?.id || incoming.receiverId;

        // Check same direction (sender->receiver) using userId
        const sameDirection = existingSenderId === incomingSenderId && existingReceiverId === incomingReceiverId;

        return sameDirection;
      });

      if (alreadyExists) {
        return state;
      }

      const updatedMessages = [...state.messages, incoming];
      let shouldFlagUnread = state.hasUnreadMessages;

      if (!incoming.isOwn) {
        const incomingSenderId = incoming.sender?.userId || incoming.sender?.id || incoming.senderId;
        const activeChatUserId = state.activeChatUser?.userId || state.activeChatUser?.id;
        const isActiveChat = state.isChatBoxOpen && incomingSenderId && activeChatUserId && incomingSenderId === activeChatUserId;
        const isChatListOpen = state.isChatDropdownOpen;
        if (!isActiveChat && !isChatListOpen) {
          shouldFlagUnread = true;
        }
      }

      return {
        ...state,
        messages: updatedMessages,
        hasUnreadMessages: shouldFlagUnread
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
          const eSenderId = e.sender?.userId || e.sender?.id || e.senderId;
          const mSenderId = msg.sender?.userId || msg.sender?.id || msg.senderId;
          const eReceiverId = e.receiver?.userId || e.receiver?.id || e.receiverId;
          const mReceiverId = msg.receiver?.userId || msg.receiver?.id || msg.receiverId;
          const sameDirection = eSenderId === mSenderId && eReceiverId === mReceiverId;
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
      // Update cache when conversations are set
      const sortedConversations = (action.payload || []).sort((a, b) => new Date(b.lastMessage?.timestamp || 0) - new Date(a.lastMessage?.timestamp || 0));
      try {
        localStorage.setItem('chatConversations', JSON.stringify(sortedConversations));
        localStorage.setItem('chatConversationsTimestamp', String(Date.now()));
      } catch (cacheError) {
        // Ignore cache errors
      }

      return {
        ...state,
        conversations: sortedConversations,
        loadingConversations: false
      };

    case ActionTypes.UPDATE_CONVERSATION:
      return {
        ...state,
        conversations: state.conversations.map(conv => {
          const convUserId = conv.user.userId || conv.user.id;
          const payloadUserId = action.payload.user.userId || action.payload.user.id;
          return convUserId === payloadUserId ? action.payload : conv;
        })
      };

    case ActionTypes.UPSERT_CONVERSATION: {
      const payload = action.payload;
      const key = payload.user.userId || payload.user.id;
      const existingIndex = state.conversations.findIndex(c => {
        const cUserId = c.user.userId || c.user.id;
        return cUserId === key;
      });
      let updated = [];
      if (existingIndex >= 0) {
        updated = state.conversations.map((c, i) => i === existingIndex ? { ...c, ...payload } : c);
      } else {
        updated = [payload, ...state.conversations];
      }
      // sort by latest timestamp desc
      updated.sort((a, b) => new Date(b.lastMessage?.timestamp || 0) - new Date(a.lastMessage?.timestamp || 0));

      // Update cache immediately
      try {
        localStorage.setItem('chatConversations', JSON.stringify(updated));
        localStorage.setItem('chatConversationsTimestamp', String(Date.now()));
      } catch (cacheError) {
        // Ignore cache errors
      }

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

    case ActionTypes.SET_HAS_UNREAD_MESSAGES:
      return {
        ...state,
        hasUnreadMessages: action.payload
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
  // Load cached users and conversations immediately for instant display
  const getCachedUsers = () => {
    try {
      const cachedUsers = localStorage.getItem('chatAllUsers');
      const cacheTimestamp = localStorage.getItem('chatAllUsersTimestamp');
      const cacheAge = cacheTimestamp ? Date.now() - parseInt(cacheTimestamp) : Infinity;

      // Use cache if less than 5 minutes old
      if (cachedUsers && cacheAge < 5 * 60 * 1000) {
        return JSON.parse(cachedUsers);
      }
    } catch (error) {
      // Ignore cache errors
    }
    return [];
  };

  const getCachedConversations = () => {
    try {
      const cachedConversations = localStorage.getItem('chatConversations');
      const cacheTimestamp = localStorage.getItem('chatConversationsTimestamp');
      const cacheAge = cacheTimestamp ? Date.now() - parseInt(cacheTimestamp) : Infinity;

      // Use cache if less than 2 minutes old (conversations change more frequently)
      if (cachedConversations && cacheAge < 2 * 60 * 1000) {
        return JSON.parse(cachedConversations);
      }
    } catch (error) {
      // Ignore cache errors
    }
    return [];
  };

  const getCachedMinimizedChats = () => {
    try {
      const cachedMinimizedChats = localStorage.getItem('minimizedChats');
      if (cachedMinimizedChats) {
        const parsedChats = JSON.parse(cachedMinimizedChats) || [];
        if (parsedChats.length > 0) {
          // Restore minimized chats immediately from localStorage
          return parsedChats.map(c => ({
            userId: c.userId,
            user: c.user, // already minimal
            messages: [], // Messages will be loaded when bubble is clicked
            timestamp: c.timestamp || Date.now()
          }));
        }
      }
    } catch (error) {
      // Ignore cache errors
    }
    return [];
  };

  const initialStateWithCache = {
    ...initialState,
    allUsers: getCachedUsers(), // Load from cache immediately
    conversations: getCachedConversations(), // Load conversations from cache immediately
    minimizedChats: getCachedMinimizedChats() // Load minimized chats from cache immediately
  };

  const [state, dispatch] = useReducer(chatReducer, initialStateWithCache);
  const { user: authUser, getToken, refreshUser } = useAuth();

  // Use ref to store current user for WebSocket handlers
  const currentUserRef = useRef(null);
  const hasRequestedProfileRef = useRef(false);

  // Ensure we always have a username available for chat endpoints/websocket
  useEffect(() => {
    if (!authUser) {
      hasRequestedProfileRef.current = false;
      return;
    }

    const hasUsername = Boolean(authUser.username || authUser.userName);
    if (!hasUsername && typeof refreshUser === 'function' && !hasRequestedProfileRef.current) {
      hasRequestedProfileRef.current = true;
      refreshUser()
        .catch(() => {
          hasRequestedProfileRef.current = false;
        });
    }
  }, [authUser?.userId, authUser?.username, authUser?.userName, refreshUser]);

  // Initialize connection function
  const initializeConnection = async () => {
    try {
      dispatch({ type: ActionTypes.SET_CONNECTING });

      // Get current user from AuthContext (from login) - always get fresh
      const token = getToken() || sessionStorage.getItem('token') || localStorage.getItem('token') || localStorage.getItem('accessToken');

      if (token) {
        // Try to get user from authUser first, otherwise from storage
        let userData = authUser;
        if (!userData) {
          try {
            const savedUser = sessionStorage.getItem('user') || localStorage.getItem('user');
            if (savedUser) {
              userData = JSON.parse(savedUser);
            }
          } catch (e) {
            // Ignore parse errors
          }
        }

        if (userData && !(userData.username || userData.userName) && typeof refreshUser === 'function') {
          try {
            const refreshed = await refreshUser();
            if (refreshed) {
              userData = refreshed;
            }
          } catch (refreshError) {
            // Ignore refresh failures - we'll fallback to whatever data we have
          }
        }

        if (userData) {
          // Always create fresh currentUser from userData
          const currentUser = {
            userId: userData.userId || userData.id,
            userName: userData.username || userData.userName || userData.name,
            userEmail: userData.email || userData.userEmail,
            role: userData.role || 'USER'
          };

          // Always update currentUser to ensure it's the latest
          dispatch({ type: ActionTypes.SET_CURRENT_USER, payload: currentUser });
          // Update ref for WebSocket handlers
          currentUserRef.current = currentUser;

          try {
            // Connect to WebSocket with current user's userId
            const userId = currentUser.userId || currentUser.id;
            if (!userId) {
              throw new Error('User ID is required for WebSocket connection');
            }

            // Only connect if not already connected (to avoid duplicate connections)
            if (!websocketService.getConnectionStatus()) {
              await websocketService.connect(userId);
            }
            dispatch({ type: ActionTypes.SET_CONNECTED });
            // Set websocketAvailable to true when connection succeeds
            dispatch({ type: ActionTypes.SET_WEBSOCKET_AVAILABLE, payload: true });

            // Subscribe to user messages - use userId for subscription
            const subscriptionResult = websocketService.subscribeToUserMessages(userId, (message) => {
              // Get fresh currentUser from ref (updated when user changes)
              const freshCurrentUser = currentUserRef.current || currentUser;
              const currentUserId = freshCurrentUser.userId || freshCurrentUser.id;
              // Backend sends ChatMessageRequest with senderId field
              const messageSenderId = message.senderId || message.sender?.userId || message.sender?.id;

              // Filter out messages from current user to avoid duplicates
              if (messageSenderId !== currentUserId) {
                // Add isOwn field for display
                const messageWithOwnership = {
                  ...message,
                  isOwn: false,
                  id: message.id || `ws-${Date.now()}-${Math.random()}`
                };
                dispatch({ type: ActionTypes.ADD_MESSAGE, payload: messageWithOwnership });

                // Upsert conversation for sender - need to get username from allUsers
                const otherUserId = messageSenderId;
                // Get username from allUsers if available, otherwise use userId as fallback
                const otherUser = (state.allUsers || []).find(u => (u.userId || u.id) === otherUserId);
                const otherUsername = otherUser?.username || otherUser?.userName || otherUser?.name || String(otherUserId);
                const currentUsername = freshCurrentUser.userName || freshCurrentUser.username || freshCurrentUser.name || String(currentUserId);

                const conversation = {
                  user: {
                    userId: otherUserId,
                    id: otherUserId,
                    userName: otherUsername,
                    username: otherUsername,
                    avatar: messageWithOwnership.sender?.avatar || otherUser?.avatar || otherUser?.userAvatar,
                    userEmail: otherUser?.userEmail || otherUser?.email || null
                  },
                  lastMessage: {
                    content: messageWithOwnership.content,
                    timestamp: messageWithOwnership.timestamp,
                    senderId: otherUserId,
                    receiverId: currentUserId,
                    isOwn: false, // Message from other user
                    sender: messageWithOwnership.sender
                  },
                  unreadCount: 0
                };
                dispatch({ type: ActionTypes.UPSERT_CONVERSATION, payload: conversation });
              }
            });

            if (!subscriptionResult) {
              dispatch({ type: ActionTypes.SET_WEBSOCKET_AVAILABLE, payload: false });
            } else {
              dispatch({ type: ActionTypes.SET_WEBSOCKET_AVAILABLE, payload: true });
            }
          } catch (wsError) {
            // Set as connected anyway for UI purposes, but disable real-time features
            dispatch({ type: ActionTypes.SET_CONNECTED });
            // Set a flag to indicate WebSocket is not available
            dispatch({ type: ActionTypes.SET_WEBSOCKET_AVAILABLE, payload: false });
          }
        } else {
          // No user data available yet, but we have token - wait a bit and retry
          dispatch({ type: ActionTypes.SET_DISCONNECTED });
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
      userId: user.userId || user.id || null,
      id: user.id || user.userId || null,
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
    // Always get fresh from authUser, don't rely on cached state
    const mapped = authUser ? {
      userId: authUser.userId || authUser.id,
      userName: authUser.username || authUser.userName || authUser.name,
      userEmail: authUser.email || authUser.userEmail,
      role: authUser.role || 'USER'
    } : null;

    // Always update if mapped exists and is different from current
    if (mapped && mapped.userName) {
      const currentUserName = state.currentUser?.userName || '';
      const mappedUserName = mapped.userName || '';
      if (currentUserName !== mappedUserName ||
        state.currentUser?.userId !== mapped.userId ||
        state.currentUser?.role !== mapped.role) {
        dispatch({ type: ActionTypes.SET_CURRENT_USER, payload: mapped });
        currentUserRef.current = mapped;
      }
    }

    // Always return fresh mapped user if available, otherwise fallback to state
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
  // Connect WebSocket immediately when token is available, don't wait for authUser object
  useEffect(() => {
    const token = getToken() || sessionStorage.getItem('token') || localStorage.getItem('token') || localStorage.getItem('accessToken');

    // Check if user is logged in (by token, not just authUser object)
    if (token) {
      // Get userId from authUser if available, otherwise try to get from storage
      let userId = null;
      if (authUser) {
        userId = authUser.userId || authUser.id;
      } else {
        // Try to get userId from storage if authUser not yet loaded
        try {
          const savedUser = sessionStorage.getItem('user') || localStorage.getItem('user');
          if (savedUser) {
            const parsedUser = JSON.parse(savedUser);
            userId = parsedUser.userId || parsedUser.id;
          }
        } catch (e) {
          // Ignore parse errors
        }
      }

      // If we have token and userId, connect immediately
      if (userId) {
        // Small delay to ensure cleanup completes before re-initializing
        const timer = setTimeout(() => {
          initializeConnection();
        }, 100);
        return () => clearTimeout(timer);
      } else if (authUser) {
        // If we have authUser but no userId yet, wait a bit and retry
        const timer = setTimeout(() => {
          initializeConnection();
        }, 500);
        return () => clearTimeout(timer);
      }
    }

    // Cleanup on unmount or when user logs out
    if (!token) {
      websocketService.disconnect();
      dispatch({ type: ActionTypes.SET_CURRENT_USER, payload: null });
    }
  }, [authUser?.userId, authUser?.id, getToken]); // Re-initialize when user changes

  // Restore minimized chats when currentUser is set (backup restore in case initialState didn't work)
  // Note: minimizedChats should already be restored in initialState, but this is a safety net
  const hasRestoredMinimizedChatsRef = useRef(false);
  useEffect(() => {
    if (state.currentUser && !hasRestoredMinimizedChatsRef.current) {
      // Only restore if current state is empty (initialState should have already restored)
      if (!state.minimizedChats || state.minimizedChats.length === 0) {
        try {
          const savedMinimizedChats = localStorage.getItem('minimizedChats');
          if (savedMinimizedChats) {
            const parsedChats = JSON.parse(savedMinimizedChats) || [];
            if (parsedChats.length > 0) {
              // Restore from localStorage if initialState didn't work
              const minimizedChats = parsedChats.map(c => ({
                userId: c.userId,
                user: c.user, // already minimal
                messages: [], // Messages will be loaded when bubble is clicked
                timestamp: c.timestamp || Date.now()
              }));
              dispatch({ type: ActionTypes.SET_MINIMIZED_CHATS, payload: minimizedChats });
              hasRestoredMinimizedChatsRef.current = true;
            }
          }
        } catch (error) {
          // Silently handle error restoring minimized chats on mount
        }
      } else {
        // Already restored in initialState, mark as restored
        hasRestoredMinimizedChatsRef.current = true;
      }
    }
    // Reset flag when user logs out
    if (!state.currentUser) {
      hasRestoredMinimizedChatsRef.current = false;
    }
  }, [state.currentUser]);

  // Track previous state to detect actual logout (not just initial load)
  const previousAuthUserRef = useRef(authUser);
  const previousTokenRef = useRef(null);
  const isInitialMountRef = useRef(true);

  // Listen for auth changes (only handle logout, initialization is handled above)
  useEffect(() => {
    const token = getToken() || sessionStorage.getItem('token') || localStorage.getItem('token') || localStorage.getItem('accessToken');

    // Skip on initial mount to avoid false logout detection
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      previousAuthUserRef.current = authUser;
      previousTokenRef.current = token;
      return;
    }

    // Check if user actually logged out:
    // 1. Had user/token before
    // 2. Now has no token (real logout, not just loading)
    const hadTokenBefore = previousTokenRef.current !== null;
    const hasTokenNow = token !== null;
    const isRealLogout = hadTokenBefore && !hasTokenNow;

    // Also check if we had authUser before and now don't (additional check)
    const hadUserBefore = previousAuthUserRef.current !== null;
    const hasUserNow = authUser !== null;
    const userLoggedOut = hadUserBefore && !hasUserNow && !hasTokenNow;

    if (isRealLogout || userLoggedOut) {
      // User actually logged out - cleanup
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
      } catch {
        // Silently handle error removing localStorage items
      }
    }

    // Update refs for next comparison
    previousAuthUserRef.current = authUser;
    previousTokenRef.current = token;
  }, [authUser, getToken]);

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
        const userId = state.currentUser?.userId || state.currentUser?.id;
        if (!userId) {
          throw new Error('User ID is required');
        }
        await websocketService.connect(userId);
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
          const currentUserId = state.activeChatUser.userId || state.activeChatUser.id;

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

            // Update localStorage to persist minimized chats
            const updatedMinimizedChats = [...(state.minimizedChats || []), minimizedChat]
              .map(c => ({ userId: c.userId, user: pickMinimalUser(c.user), timestamp: c.timestamp }));
            localStorage.setItem('minimizedChats', JSON.stringify(updatedMinimizedChats));
          }
        }

        // Emit event to tell AI chat to minimize
        window.dispatchEvent(new CustomEvent(CHAT_EVENTS.REGULAR_CHAT_OPENED));

        // Set new active chat user - do this first for instant UI update
        dispatch({ type: ActionTypes.SET_ACTIVE_CHAT_USER, payload: user });
        dispatch({ type: ActionTypes.SET_CHAT_BOX_OPEN, payload: true });
        dispatch({ type: ActionTypes.SET_CHAT_BOX_MINIMIZED, payload: false }); // Ensure chatbox is visible
        dispatch({ type: ActionTypes.SET_CHAT_DROPDOWN_OPEN, payload: false });
        dispatch({ type: ActionTypes.SET_HAS_UNREAD_MESSAGES, payload: false });

        // Set empty messages immediately for instant UI render
        dispatch({ type: ActionTypes.SET_MESSAGES, payload: [] });
        dispatch({ type: ActionTypes.SET_CURRENT_PAGE, payload: 0 });
        dispatch({ type: ActionTypes.SET_HAS_MORE_MESSAGES, payload: true });

        // Save chat state to localStorage for persistence (defer to avoid blocking)
        setTimeout(() => {
          const minimalUser = pickMinimalUser(user);
          localStorage.setItem('chatBoxState', JSON.stringify({
            isOpen: true,
            activeChatUser: minimalUser
          }));
        }, 0);

        // Defer loading conversation to allow UI to render first (performance optimization)
        // This prevents lag when opening chatbox
        setTimeout(async () => {
          dispatch({ type: ActionTypes.SET_LOADING_MESSAGES, payload: true });

          const liveUser = getLiveCurrentUser();
          const senderId = liveUser.userId || liveUser.id;
          const receiverId = user.userId || user.id;

          if (!senderId || !receiverId) {
            // Still set messages to empty array so user can start chatting
            dispatch({ type: ActionTypes.SET_LOADING_MESSAGES, payload: false });
            return;
          }

          try {
            let messages = await chatApiService.getConversation(
              senderId,
              receiverId,
              0, // page 0 for latest messages
              25 // size 25 for initial load
            );

            // Ensure messages is an array
            if (!Array.isArray(messages)) {
              messages = [];
            }

            const formattedMessages = chatApiService.formatConversation(messages, liveUser, state.allUsers || []);

            // Sort messages by timestamp (oldest first for display - newest at bottom)
            const sortedMessages = formattedMessages.sort((a, b) =>
              new Date(a.timestamp) - new Date(b.timestamp)
            );

            dispatch({ type: ActionTypes.SET_MESSAGES, payload: sortedMessages });
            dispatch({ type: ActionTypes.SET_LOADING_MESSAGES, payload: false });
          } catch (error) {
            // One-shot retry with refreshed users in case receiver renamed mid-session
            try {
              await actions.loadAllUsers();
              const liveUser = getLiveCurrentUser();
              const senderId = liveUser.userId || liveUser.id;
              const receiverId = user.userId || user.id;

              if (!senderId || !receiverId) {
                throw new Error('User IDs are required');
              }

              const messages = await chatApiService.getConversation(
                senderId,
                receiverId,
                0,
                25
              );

              // Ensure messages is an array
              const messagesArray = Array.isArray(messages) ? messages : [];
              const formattedMessages = chatApiService.formatConversation(messagesArray, liveUser, state.allUsers || []);
              const sortedMessages = formattedMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
              dispatch({ type: ActionTypes.SET_MESSAGES, payload: sortedMessages });
              dispatch({ type: ActionTypes.SET_LOADING_MESSAGES, payload: false });
            } catch (e2) {
              // Even if loading conversation fails, allow user to start chatting
              // Set empty messages array so user can send first message
              dispatch({ type: ActionTypes.SET_MESSAGES, payload: [] });
              dispatch({ type: ActionTypes.SET_LOADING_MESSAGES, payload: false });
            }
          }
        }, 50); // Small delay to allow UI to render first
      } catch (error) {
        // If there's any error, still allow user to start chatting
        dispatch({ type: ActionTypes.SET_MESSAGES, payload: [] });
        dispatch({ type: ActionTypes.SET_LOADING_MESSAGES, payload: false });
      }
    },

    sendMessage: async (content) => {
      if (!state.activeChatUser || !content.trim()) {
        return;
      }

      try {
        const liveUser2 = getLiveCurrentUser();
        const senderId = liveUser2?.userId || liveUser2?.id;
        const receiverId = state.activeChatUser?.userId || state.activeChatUser?.id;

        if (!senderId || !receiverId) {
          throw new Error('User IDs are required. Please ensure both users have valid IDs.');
        }

        const senderUsername = liveUser2?.userName || liveUser2?.username || liveUser2?.name || String(senderId);
        const receiverUsername = state.activeChatUser?.userName || state.activeChatUser?.username || state.activeChatUser?.name || String(receiverId);

        // Add message to local state immediately (optimistic update)
        const tempMessage = {
          id: `temp-${Date.now()}`, // Temporary ID
          content: content.trim(),
          timestamp: new Date().toISOString(),
          sender: {
            userId: senderId,
            userName: senderUsername,
            username: senderUsername,
            userEmail: state.currentUser?.userEmail || liveUser2?.userEmail
          },
          receiver: {
            userId: receiverId,
            userName: receiverUsername,
            username: receiverUsername,
            userEmail: state.activeChatUser?.userEmail
          },
          isOwn: true
        };

        dispatch({ type: ActionTypes.ADD_MESSAGE, payload: tempMessage });

        // Get receiver username from allUsers if available for better display
        const receiverUser = (state.allUsers || []).find(u => (u.userId || u.id) === receiverId);
        const finalReceiverUsername = receiverUser?.username || receiverUser?.userName || receiverUser?.name || receiverUsername;
        const finalReceiverAvatar = receiverUser?.avatar || receiverUser?.userAvatar || state.activeChatUser?.avatar;

        // Update conversations immediately so dropdown shows latest preview and reorders to top
        const upsertForSelf = {
          user: {
            userId: receiverId,
            id: receiverId,
            userName: finalReceiverUsername,
            username: finalReceiverUsername,
            avatar: finalReceiverAvatar,
            userEmail: receiverUser?.userEmail || receiverUser?.email || state.activeChatUser?.userEmail
          },
          lastMessage: {
            content: tempMessage.content,
            timestamp: tempMessage.timestamp,
            senderId: senderId,
            receiverId: receiverId,
            isOwn: true, // Message from current user
            sender: tempMessage.sender
          },
          unreadCount: 0
        };
        dispatch({ type: ActionTypes.UPSERT_CONVERSATION, payload: upsertForSelf });

        const messageData = {
          senderId: parseInt(senderId),
          receiverId: parseInt(receiverId),
          content: content.trim()
        };

        // Try WebSocket first - check both flag and connection status
        const wsConnected = websocketService.getConnectionStatus();
        const wsAvailable = state.websocketAvailable !== false; // Default to true if not explicitly set to false

        if (wsConnected && wsAvailable) {
          const success = websocketService.sendMessage(messageData);

          if (success) {
            // Message already added to local state, WebSocket will handle delivery
            // Reload conversations to ensure new conversation appears in dropdown
            setTimeout(() => {
              actions.loadConversations();
            }, 500);
            return;
          }
        }

        // Fallback to API if WebSocket fails or not available
        try {
          await chatApiService.sendMessage(senderId, receiverId, content.trim());
          // Message already added to local state via optimistic update
          // Reload conversations to ensure new conversation appears in dropdown
          setTimeout(() => {
            actions.loadConversations();
          }, 500);
        } catch (apiError) {
          // Silently handle API send failed error
          // Remove the temporary message if API also fails
          dispatch({
            type: ActionTypes.UPDATE_MESSAGE,
            payload: { ...tempMessage, id: null, content: 'Failed to send' }
          });
        }

      } catch (error) {
        // Silently handle error in sendMessage
        dispatch({ type: ActionTypes.SET_ERROR, payload: error.message });
      }
    },

    // UI actions
    toggleChatDropdown: () => {
      const willOpen = !state.isChatDropdownOpen;
      dispatch({
        type: ActionTypes.SET_CHAT_DROPDOWN_OPEN,
        payload: willOpen
      });
      if (willOpen) {
        dispatch({ type: ActionTypes.SET_HAS_UNREAD_MESSAGES, payload: false });
      }
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
        const userId = state.activeChatUser.userId || state.activeChatUser.id;
        dispatch({ type: ActionTypes.REMOVE_MINIMIZED_CHAT, payload: userId });

        // Update localStorage - remove only this chat from minimizedChats
        const updatedMinimizedChats = (state.minimizedChats || []).filter(chat => chat.userId !== userId);
        if (updatedMinimizedChats.length > 0) {
          localStorage.setItem('minimizedChats', JSON.stringify(
            updatedMinimizedChats.map(c => ({ userId: c.userId, user: pickMinimalUser(c.user), timestamp: c.timestamp }))
          ));
        } else {
          localStorage.removeItem('minimizedChats');
        }
      }

      dispatch({ type: ActionTypes.SET_CHAT_BOX_OPEN, payload: false });
      dispatch({ type: ActionTypes.SET_ACTIVE_CHAT_USER, payload: null });
      dispatch({ type: ActionTypes.SET_MESSAGES, payload: [] });
      dispatch({ type: ActionTypes.SET_CHAT_BOX_MINIMIZED, payload: false });

      // Clear saved chat state from localStorage (but keep minimizedChats)
      localStorage.removeItem('chatBoxState');
    },

    minimizeChatBox: () => {
      if (state.activeChatUser) {
        const userId = state.activeChatUser.userId || state.activeChatUser.id;

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
        // Prepare the final minimized chats list
        let finalMinimizedChats = [...(state.minimizedChats || [])];

        // If there's already an active chat, minimize it first (same logic as openChatWithUser)
        if (state.activeChatUser && state.messages.length > 0) {
          const currentUserId = state.activeChatUser.userId || state.activeChatUser.id;

          // Check if this chat is already minimized
          const existingChat = finalMinimizedChats.find(chat => chat.userId === currentUserId);

          if (!existingChat) {
            // Add current chat to minimized chats
            const minimizedChatToAdd = {
              userId: currentUserId,
              user: state.activeChatUser,
              messages: state.messages,
              timestamp: Date.now()
            };
            finalMinimizedChats.push(minimizedChatToAdd);
            dispatch({ type: ActionTypes.ADD_MINIMIZED_CHAT, payload: minimizedChatToAdd });
          }
        }

        // Remove the restored chat from minimized chats
        finalMinimizedChats = finalMinimizedChats.filter(chat => chat.userId !== userId);
        dispatch({ type: ActionTypes.REMOVE_MINIMIZED_CHAT, payload: userId });

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
        dispatch({ type: ActionTypes.SET_HAS_UNREAD_MESSAGES, payload: false });

        // Save restored chat state to localStorage
        const minimalUser = pickMinimalUser(minimizedChat.user);
        localStorage.setItem('chatBoxState', JSON.stringify({
          isOpen: true,
          activeChatUser: minimalUser
        }));

        // Update minimized chats in localStorage
        const minimizedChatsForStorage = finalMinimizedChats
          .map(c => ({ userId: c.userId, user: pickMinimalUser(c.user), timestamp: c.timestamp }));

        if (minimizedChatsForStorage.length > 0) {
          localStorage.setItem('minimizedChats', JSON.stringify(minimizedChatsForStorage));
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
        // Check if we already have conversations (from cache initialization)
        // If yes, don't set loading state to avoid UI flicker
        const hasExistingConversations = state.conversations && state.conversations.length > 0;

        // First, try to load from cache for instant display (if not already loaded)
        let cacheLoaded = false;
        if (!hasExistingConversations) {
          try {
            const cachedConversations = localStorage.getItem('chatConversations');
            const cacheTimestamp = localStorage.getItem('chatConversationsTimestamp');
            const cacheAge = cacheTimestamp ? Date.now() - parseInt(cacheTimestamp) : Infinity;

            // Use cache if less than 2 minutes old
            if (cachedConversations && cacheAge < 2 * 60 * 1000) {
              const parsedConversations = JSON.parse(cachedConversations);
              dispatch({ type: ActionTypes.SET_CONVERSATIONS, payload: parsedConversations });
              dispatch({ type: ActionTypes.SET_LOADING_CONVERSATIONS, payload: false });
              cacheLoaded = true;
            }
          } catch (cacheError) {
            // Ignore cache errors
          }
        }

        // Only set loading if we don't have cache and don't have existing conversations
        if (!hasExistingConversations && !cacheLoaded) {
          dispatch({ type: ActionTypes.SET_LOADING_CONVERSATIONS, payload: true });
        }

        // Load fresh data from API in background
        const liveUser = getLiveCurrentUser();
        const userId = liveUser.userId || liveUser.id;

        if (!userId) {
          throw new Error('User ID is required');
        }

        const messages = await chatApiService.getAllMessagesFromUser(userId);
        const conversations = chatApiService.getConversationsList(messages, liveUser, state.allUsers || []);

        // Save to cache
        try {
          localStorage.setItem('chatConversations', JSON.stringify(conversations));
          localStorage.setItem('chatConversationsTimestamp', String(Date.now()));
        } catch (cacheError) {
          // Ignore cache errors
        }

        dispatch({ type: ActionTypes.SET_CONVERSATIONS, payload: conversations });
      } catch (error) {
        // If API fails, try to use cache even if old
        try {
          const cachedConversations = localStorage.getItem('chatConversations');
          if (cachedConversations) {
            const parsedConversations = JSON.parse(cachedConversations);
            dispatch({ type: ActionTypes.SET_CONVERSATIONS, payload: parsedConversations });
          } else {
            dispatch({ type: ActionTypes.SET_CONVERSATIONS, payload: [] });
          }
        } catch (cacheError) {
          dispatch({ type: ActionTypes.SET_CONVERSATIONS, payload: [] });
        }
      }
    },

    // Load conversation with a specific user
    loadConversation: async (user) => {
      if (!user || !getLiveCurrentUser()) return;

      try {
        dispatch({ type: ActionTypes.SET_LOADING_MESSAGES, payload: true });
        dispatch({ type: ActionTypes.SET_ACTIVE_CHAT_USER, payload: user });

        const liveUser = getLiveCurrentUser();
        const senderId = liveUser.userId || liveUser.id;
        const receiverId = user.userId || user.id;

        if (!senderId || !receiverId) {
          throw new Error('User IDs are required');
        }

        const messages = await chatApiService.getConversationLegacy(senderId, receiverId);
        const formattedMessages = chatApiService.formatConversation(messages, liveUser, state.allUsers || []);

        dispatch({ type: ActionTypes.SET_MESSAGES, payload: formattedMessages });

      } catch (error) {
        // Silently handle error loading conversation
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
        const senderId = liveUser.userId || liveUser.id;
        const receiverId = state.activeChatUser.userId || state.activeChatUser.id;

        if (!senderId || !receiverId) {
          throw new Error('User IDs are required');
        }

        const messages = await chatApiService.getConversation(
          senderId,
          receiverId,
          nextPage,
          25
        );

        if (!messages || messages.length === 0) {
          // No more messages
          dispatch({ type: ActionTypes.SET_HAS_MORE_MESSAGES, payload: false });
        } else {
          const formattedMessages = chatApiService.formatConversation(messages, state.currentUser, state.allUsers || []);

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
        // Silently handle error loading more messages
        dispatch({ type: ActionTypes.SET_ERROR, payload: error.message });
      } finally {
        dispatch({ type: ActionTypes.SET_LOADING_MORE_MESSAGES, payload: false });
      }
    },

    loadAllUsers: async () => {
      try {
        // First, try to load from cache for instant display
        try {
          const cachedUsers = localStorage.getItem('chatAllUsers');
          const cacheTimestamp = localStorage.getItem('chatAllUsersTimestamp');
          const cacheAge = cacheTimestamp ? Date.now() - parseInt(cacheTimestamp) : Infinity;

          // Use cache if less than 5 minutes old
          if (cachedUsers && cacheAge < 5 * 60 * 1000) {
            const parsedUsers = JSON.parse(cachedUsers);
            dispatch({ type: ActionTypes.SET_ALL_USERS, payload: parsedUsers });
            dispatch({ type: ActionTypes.SET_LOADING_USERS, payload: false });
          } else {
            dispatch({ type: ActionTypes.SET_LOADING_USERS, payload: true });
          }
        } catch (cacheError) {
          dispatch({ type: ActionTypes.SET_LOADING_USERS, payload: true });
        }

        // Load fresh data from API
        const users = await chatApiService.getAllUsers();
        // Filter out current user from the list
        const currentUserId = state.currentUser?.userId || state.currentUser?.id;
        const filteredUsers = (users || [])
          .filter(user => (user.userId || user.id) !== currentUserId);

        // Save to cache
        try {
          localStorage.setItem('chatAllUsers', JSON.stringify(filteredUsers));
          localStorage.setItem('chatAllUsersTimestamp', String(Date.now()));
        } catch (cacheError) {
          // Ignore cache errors
        }

        dispatch({ type: ActionTypes.SET_ALL_USERS, payload: filteredUsers });
      } catch (error) {
        // If API fails, try to use cache even if old
        try {
          const cachedUsers = localStorage.getItem('chatAllUsers');
          if (cachedUsers) {
            const parsedUsers = JSON.parse(cachedUsers);
            dispatch({ type: ActionTypes.SET_ALL_USERS, payload: parsedUsers });
          } else {
            dispatch({ type: ActionTypes.SET_ALL_USERS, payload: [] });
          }
        } catch (cacheError) {
          dispatch({ type: ActionTypes.SET_ALL_USERS, payload: [] });
        }
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
          const parsedChats = JSON.parse(savedMinimizedChats) || [];
          // Only restore if we have valid chats
          if (parsedChats.length > 0) {
            const minimizedChats = parsedChats.map(c => ({
              userId: c.userId,
              user: c.user, // already minimal
              messages: [], // Messages will be loaded when bubble is clicked
              timestamp: c.timestamp || Date.now()
            }));
            // Always restore if current state is empty or different
            const currentUserIds = (state.minimizedChats || []).map(c => c.userId).sort().join(',');
            const restoredUserIds = minimizedChats.map(c => c.userId).sort().join(',');
            // Restore if empty or different
            if (!state.minimizedChats || state.minimizedChats.length === 0 || currentUserIds !== restoredUserIds) {
              dispatch({ type: ActionTypes.SET_MINIMIZED_CHATS, payload: minimizedChats });
            }
          }
        }
      } catch (error) {
        // Silently handle error restoring minimized chats
        // Don't remove localStorage on error
        // localStorage.removeItem('minimizedChats');
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
        const userId = currentUser.userId || currentUser.id;
        if (!userId) {
          throw new Error('User ID is required');
        }
        await websocketService.connect(userId);
        dispatch({ type: ActionTypes.SET_CONNECTED });

        // Subscribe to user messages
        websocketService.subscribeToUserMessages(userId, (message) => {
          const formattedMessage = chatApiService.formatMessage(message, currentUser, state.allUsers || []);
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
    // Silently handle ChatContext not found
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

export default ChatContext;
