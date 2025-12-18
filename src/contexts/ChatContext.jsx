import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import websocketService from '../services/websocketService';
import chatApiService from '../services/chatApiService';
import { useAuth } from './AuthContext';
import { CHAT_EVENTS } from '../components/chatAI/BubbleChatAI';

const ChatContext = createContext();

// Initial state: connection status (isConnected, isConnecting), current user, active chat (activeChat, activeChatUser), messages/conversations/allUsers arrays, pagination (currentPage, hasMoreMessages, isLoadingMoreMessages), UI state (isChatDropdownOpen, isChatBoxOpen, isChatBoxMinimized, hasUnreadMessages), minimizedChats array cho multiple chat bubbles, loading states (loadingMessages, loadingConversations, loadingUsers), error state, websocketAvailable flag
const initialState = {
  isConnected: false,
  isConnecting: false,
  currentUser: null,
  activeChat: null,
  activeChatUser: null,
  messages: [],
  conversations: [],
  allUsers: [],
  currentPage: 0,
  hasMoreMessages: true,
  isLoadingMoreMessages: false,
  isChatDropdownOpen: false,
  isChatBoxOpen: false,
  isChatBoxMinimized: false,
  hasUnreadMessages: false,
  minimizedChats: [],
  loadingMessages: false,
  loadingConversations: false,
  loadingUsers: false,
  error: null,
  websocketAvailable: true
};

// Action types: Connection (SET_CONNECTING, SET_CONNECTED, SET_DISCONNECTED), User (SET_CURRENT_USER), Chat (SET_ACTIVE_CHAT, SET_ACTIVE_CHAT_USER), Messages (SET_MESSAGES, ADD_MESSAGE, UPDATE_MESSAGE, PREPEND_MESSAGES, SET_HAS_UNREAD_MESSAGES), Pagination (SET_CURRENT_PAGE, SET_HAS_MORE_MESSAGES, SET_LOADING_MORE_MESSAGES), Message sorting (SORT_MESSAGES), Conversations (SET_CONVERSATIONS, UPDATE_CONVERSATION, UPSERT_CONVERSATION, SORT_CONVERSATIONS_BY_LATEST), Users (SET_ALL_USERS), UI (SET_CHAT_DROPDOWN_OPEN, SET_CHAT_BOX_OPEN, SET_CHAT_BOX_MINIMIZED), Multiple chat bubbles (ADD_MINIMIZED_CHAT, REMOVE_MINIMIZED_CHAT, SET_MINIMIZED_CHATS), Loading (SET_LOADING_MESSAGES, SET_LOADING_CONVERSATIONS, SET_LOADING_USERS), Error (SET_ERROR, CLEAR_ERROR), WebSocket availability (SET_WEBSOCKET_AVAILABLE)
const ActionTypes = {
  SET_CONNECTING: 'SET_CONNECTING',
  SET_CONNECTED: 'SET_CONNECTED',
  SET_DISCONNECTED: 'SET_DISCONNECTED',
  SET_CURRENT_USER: 'SET_CURRENT_USER',
  SET_ACTIVE_CHAT: 'SET_ACTIVE_CHAT',
  SET_ACTIVE_CHAT_USER: 'SET_ACTIVE_CHAT_USER',
  SET_MESSAGES: 'SET_MESSAGES',
  ADD_MESSAGE: 'ADD_MESSAGE',
  UPDATE_MESSAGE: 'UPDATE_MESSAGE',
  PREPEND_MESSAGES: 'PREPEND_MESSAGES',
  SET_HAS_UNREAD_MESSAGES: 'SET_HAS_UNREAD_MESSAGES',
  SET_CURRENT_PAGE: 'SET_CURRENT_PAGE',
  SET_HAS_MORE_MESSAGES: 'SET_HAS_MORE_MESSAGES',
  SET_LOADING_MORE_MESSAGES: 'SET_LOADING_MORE_MESSAGES',
  SORT_MESSAGES: 'SORT_MESSAGES',
  SET_CONVERSATIONS: 'SET_CONVERSATIONS',
  UPDATE_CONVERSATION: 'UPDATE_CONVERSATION',
  UPSERT_CONVERSATION: 'UPSERT_CONVERSATION',
  SORT_CONVERSATIONS_BY_LATEST: 'SORT_CONVERSATIONS_BY_LATEST',
  SET_ALL_USERS: 'SET_ALL_USERS',
  SET_CHAT_DROPDOWN_OPEN: 'SET_CHAT_DROPDOWN_OPEN',
  SET_CHAT_BOX_OPEN: 'SET_CHAT_BOX_OPEN',
  SET_CHAT_BOX_MINIMIZED: 'SET_CHAT_BOX_MINIMIZED',
  ADD_MINIMIZED_CHAT: 'ADD_MINIMIZED_CHAT',
  REMOVE_MINIMIZED_CHAT: 'REMOVE_MINIMIZED_CHAT',
  SET_MINIMIZED_CHATS: 'SET_MINIMIZED_CHATS',
  SET_LOADING_MESSAGES: 'SET_LOADING_MESSAGES',
  SET_LOADING_CONVERSATIONS: 'SET_LOADING_CONVERSATIONS',
  SET_LOADING_USERS: 'SET_LOADING_USERS',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  SET_WEBSOCKET_AVAILABLE: 'SET_WEBSOCKET_AVAILABLE'
};

// Reducer: xử lý tất cả các action types để cập nhật state, bao gồm connection status, user, messages, conversations, pagination, UI state, loading states, error states
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

    // Thêm message mới: de-duplication mạnh mẽ kiểm tra ID trước, sau đó kiểm tra content + sender + time, bỏ qua temp messages (sẽ được thay thế), normalize sender/receiver IDs để so sánh, kiểm tra cùng direction (sender->receiver) và timestamp (cho phép 5 giây chênh lệch để xử lý network delays)
    case ActionTypes.ADD_MESSAGE: {
      const incoming = action.payload;

      if (incoming.id) {
        const existsById = state.messages.some(existing => existing.id === incoming.id);
        if (existsById) {
          return state;
        }
      }

      const alreadyExists = state.messages.some(existing => {
        if (existing.id && typeof existing.id === 'string' && existing.id.startsWith('temp-')) {
          return false;
        }

        const sameOwnership = !!existing.isOwn === !!incoming.isOwn;
        const sameContent = (existing.content || '').trim() === (incoming.content || '').trim();
        if (!sameContent || !sameOwnership) {
          return false;
        }

        const existingSenderId = String(existing.sender?.userId || existing.sender?.id || existing.senderId || '');
        const incomingSenderId = String(incoming.sender?.userId || incoming.sender?.id || incoming.senderId || '');
        const existingReceiverId = String(existing.receiver?.userId || existing.receiver?.id || existing.receiverId || '');
        const incomingReceiverId = String(incoming.receiver?.userId || incoming.receiver?.id || incoming.receiverId || '');

        const sameDirection = existingSenderId === incomingSenderId && existingReceiverId === incomingReceiverId;
        if (!sameDirection) {
          return false;
        }

        const existingTs = new Date(existing.timestamp).getTime();
        const incomingTs = new Date(incoming.timestamp).getTime();
        const closeInTime = Math.abs(existingTs - incomingTs) <= 5000;

        return closeInTime;
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

    // Prepend messages cho infinite scroll: lọc duplicate messages dựa trên ID hoặc near-identical signature (same ownership, content, direction, timestamp trong 5 giây), kết hợp và sort tất cả messages theo timestamp (oldest first)
    case ActionTypes.PREPEND_MESSAGES: {
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

    // Set conversations: sort theo latest timestamp desc, cập nhật cache vào localStorage với timestamp để sử dụng cho instant display
    case ActionTypes.SET_CONVERSATIONS:
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
      updated.sort((a, b) => new Date(b.lastMessage?.timestamp || 0) - new Date(a.lastMessage?.timestamp || 0));

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

// Provider component: quản lý chat state, WebSocket connection, messages, conversations, và multiple chat bubbles
export const ChatProvider = ({ children }) => {
  // Load cached users từ localStorage nếu cache < 5 phút để instant display, ignore cache errors
  const getCachedUsers = () => {
    try {
      const cachedUsers = localStorage.getItem('chatAllUsers');
      const cacheTimestamp = localStorage.getItem('chatAllUsersTimestamp');
      const cacheAge = cacheTimestamp ? Date.now() - parseInt(cacheTimestamp) : Infinity;

      if (cachedUsers && cacheAge < 5 * 60 * 1000) {
        return JSON.parse(cachedUsers);
      }
    } catch (error) {
      // Ignore cache errors
    }
    return [];
  };

  // Load cached conversations từ localStorage nếu cache < 2 phút (conversations thay đổi thường xuyên hơn), ignore cache errors
  const getCachedConversations = () => {
    try {
      const cachedConversations = localStorage.getItem('chatConversations');
      const cacheTimestamp = localStorage.getItem('chatConversationsTimestamp');
      const cacheAge = cacheTimestamp ? Date.now() - parseInt(cacheTimestamp) : Infinity;

      if (cachedConversations && cacheAge < 2 * 60 * 1000) {
        return JSON.parse(cachedConversations);
      }
    } catch (error) {
      // Ignore cache errors
    }
    return [];
  };

  // Load cached minimized chats từ localStorage, restore ngay lập tức với messages rỗng (sẽ load khi bubble được click), ignore cache errors
  const getCachedMinimizedChats = () => {
    try {
      const cachedMinimizedChats = localStorage.getItem('minimizedChats');
      if (cachedMinimizedChats) {
        const parsedChats = JSON.parse(cachedMinimizedChats) || [];
        if (parsedChats.length > 0) {
          return parsedChats.map(c => ({
            userId: c.userId,
            user: c.user,
            messages: [],
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

  // Sử dụng ref để lưu current user cho WebSocket handlers, đảm bảo luôn có username available cho chat endpoints/websocket
  const currentUserRef = useRef(null);
  const hasRequestedProfileRef = useRef(false);

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

  // Khởi tạo kết nối WebSocket: lấy current user từ AuthContext (luôn lấy fresh), thử lấy từ authUser trước rồi mới từ storage, refresh user nếu thiếu username, tạo currentUser object, connect WebSocket với userId, subscribe to user messages, filter messages từ current user để tránh duplicates, upsert conversation cho sender
  const initializeConnection = async () => {
    try {
      dispatch({ type: ActionTypes.SET_CONNECTING });

      const token = getToken() || sessionStorage.getItem('token') || localStorage.getItem('token') || localStorage.getItem('accessToken');

      if (token) {
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
            // Ignore refresh failures
          }
        }

        if (userData) {
          const currentUser = {
            userId: userData.userId || userData.id,
            userName: userData.username || userData.userName || userData.name,
            userEmail: userData.email || userData.userEmail,
            role: userData.role || 'USER'
          };

          dispatch({ type: ActionTypes.SET_CURRENT_USER, payload: currentUser });
          currentUserRef.current = currentUser;

          try {
            const userId = currentUser.userId || currentUser.id;
            if (!userId) {
              throw new Error('User ID is required for WebSocket connection');
            }

            if (!websocketService.getConnectionStatus()) {
              await websocketService.connect(userId);
            }
            dispatch({ type: ActionTypes.SET_CONNECTED });
            dispatch({ type: ActionTypes.SET_WEBSOCKET_AVAILABLE, payload: true });

            const subscriptionResult = websocketService.subscribeToUserMessages(userId, (message) => {
              const freshCurrentUser = currentUserRef.current || currentUser;
              const currentUserId = freshCurrentUser.userId || freshCurrentUser.id;
              const messageSenderId = message.senderId || message.sender?.userId || message.sender?.id;

              if (messageSenderId !== currentUserId) {
                const messageWithOwnership = {
                  ...message,
                  isOwn: false,
                  id: message.id || `ws-${Date.now()}-${Math.random()}`
                };
                dispatch({ type: ActionTypes.ADD_MESSAGE, payload: messageWithOwnership });

                const otherUserId = messageSenderId;
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
            dispatch({ type: ActionTypes.SET_CONNECTED });
            dispatch({ type: ActionTypes.SET_WEBSOCKET_AVAILABLE, payload: false });
          }
        } else {
          dispatch({ type: ActionTypes.SET_DISCONNECTED });
        }
      } else {
        dispatch({ type: ActionTypes.SET_DISCONNECTED });
      }

    } catch (error) {
      dispatch({ type: ActionTypes.SET_ERROR, payload: error.message });
      dispatch({ type: ActionTypes.SET_DISCONNECTED });
    }
  };
  // Chỉ giữ các field tối thiểu và an toàn khi persist vào storage để tránh lưu quá nhiều dữ liệu không cần thiết
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

  // Lấy current user mới nhất ngay sau profile update (không cần F5): luôn lấy fresh từ authUser không dựa vào cached state, update nếu mapped khác với current, trả về fresh mapped user nếu có hoặc fallback về state
  const getLiveCurrentUser = () => {
    const mapped = authUser ? {
      userId: authUser.userId || authUser.id,
      userName: authUser.username || authUser.userName || authUser.name,
      userEmail: authUser.email || authUser.userEmail,
      role: authUser.role || 'USER'
    } : null;

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

    return mapped || state.currentUser;
  };

  // Resolve safe login username từ user object hoặc name string: nếu là object tìm trong userName/username/name, nếu là string kiểm tra trong allUsers để match, trả về trimmed string không có khoảng trắng
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

  // Khởi tạo chat system: connect WebSocket ngay khi token available không đợi authUser object, kiểm tra user logged in bằng token, lấy userId từ authUser hoặc storage, delay nhỏ để cleanup hoàn tất trước khi re-initialize, cleanup khi unmount hoặc user logout
  useEffect(() => {
    const token = getToken() || sessionStorage.getItem('token') || localStorage.getItem('token') || localStorage.getItem('accessToken');

    if (token) {
      let userId = null;
      if (authUser) {
        userId = authUser.userId || authUser.id;
      } else {
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

      if (userId) {
        const timer = setTimeout(() => {
          initializeConnection();
        }, 100);
        return () => clearTimeout(timer);
      } else if (authUser) {
        const timer = setTimeout(() => {
          initializeConnection();
        }, 500);
        return () => clearTimeout(timer);
      }
    }

    if (!token) {
      websocketService.disconnect();
      dispatch({ type: ActionTypes.SET_CURRENT_USER, payload: null });
    }
  }, [authUser?.userId, authUser?.id, getToken]);

  // Restore minimized chats khi currentUser được set (backup restore nếu initialState không work), chỉ restore nếu state hiện tại rỗng, reset flag khi user logout
  const hasRestoredMinimizedChatsRef = useRef(false);
  useEffect(() => {
    if (state.currentUser && !hasRestoredMinimizedChatsRef.current) {
      if (!state.minimizedChats || state.minimizedChats.length === 0) {
        try {
          const savedMinimizedChats = localStorage.getItem('minimizedChats');
          if (savedMinimizedChats) {
            const parsedChats = JSON.parse(savedMinimizedChats) || [];
            if (parsedChats.length > 0) {
              const minimizedChats = parsedChats.map(c => ({
                userId: c.userId,
                user: c.user,
                messages: [],
                timestamp: c.timestamp || Date.now()
              }));
              dispatch({ type: ActionTypes.SET_MINIMIZED_CHATS, payload: minimizedChats });
              hasRestoredMinimizedChatsRef.current = true;
            }
          }
        } catch (error) {
          // Silently handle error
        }
      } else {
        hasRestoredMinimizedChatsRef.current = true;
      }
    }
    if (!state.currentUser) {
      hasRestoredMinimizedChatsRef.current = false;
    }
  }, [state.currentUser]);

  // Track previous state để detect actual logout (không phải initial load), skip initial mount để tránh false logout detection, kiểm tra hadTokenBefore và hasTokenNow để xác định real logout
  const previousAuthUserRef = useRef(authUser);
  const previousTokenRef = useRef(null);
  const isInitialMountRef = useRef(true);

  useEffect(() => {
    const token = getToken() || sessionStorage.getItem('token') || localStorage.getItem('token') || localStorage.getItem('accessToken');

    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      previousAuthUserRef.current = authUser;
      previousTokenRef.current = token;
      return;
    }

    const hadTokenBefore = previousTokenRef.current !== null;
    const hasTokenNow = token !== null;
    const isRealLogout = hadTokenBefore && !hasTokenNow;

    const hadUserBefore = previousAuthUserRef.current !== null;
    const hasUserNow = authUser !== null;
    const userLoggedOut = hadUserBefore && !hasUserNow && !hasTokenNow;

    if (isRealLogout || userLoggedOut) {
      websocketService.disconnect();
      dispatch({ type: ActionTypes.SET_DISCONNECTED });
      dispatch({ type: ActionTypes.SET_CURRENT_USER, payload: null });
      currentUserRef.current = null;
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
        // Silently handle error
      }
    }

    previousAuthUserRef.current = authUser;
    previousTokenRef.current = token;
  }, [authUser, getToken]);

  // WebSocket event handlers chỉ cho connection status (không xử lý messages vì đã có subscription handler), subscribe onConnection và onDisconnection events
  useEffect(() => {
    const handleConnection = () => {
      dispatch({ type: ActionTypes.SET_CONNECTED });
    };

    const handleDisconnection = () => {
      dispatch({ type: ActionTypes.SET_DISCONNECTED });
    };

    const unsubscribeConnection = websocketService.onConnection(handleConnection);
    const unsubscribeDisconnection = websocketService.onDisconnection(handleDisconnection);

    return () => {
      unsubscribeConnection();
      unsubscribeDisconnection();
    };
  }, []);

  // Actions: các hàm để thao tác với chat state, connection, messages, conversations, UI state
  const actions = {
    // Kết nối WebSocket: lấy userId từ currentUser, connect nếu chưa connected, dispatch SET_CONNECTED khi thành công
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

    // Mở chat với user: nếu đã có active chat thì minimize trước (kiểm tra đã minimized chưa), emit event để AI chat minimize, set active chat user và UI state ngay lập tức, set empty messages để instant UI render, save chat state vào localStorage, defer load conversation để UI render trước (performance optimization), sort messages theo timestamp (oldest first), one-shot retry với refreshed users nếu receiver renamed mid-session
    openChatWithUser: async (user) => {
      try {
        if (state.activeChatUser && state.messages.length > 0) {
          const currentUserId = state.activeChatUser.userId || state.activeChatUser.id;

          const existingChat = (state.minimizedChats || []).find(chat => chat.userId === currentUserId);

          if (!existingChat) {
            const minimizedChat = {
              userId: currentUserId,
              user: state.activeChatUser,
              messages: state.messages,
              timestamp: Date.now()
            };
            dispatch({ type: ActionTypes.ADD_MINIMIZED_CHAT, payload: minimizedChat });

            const updatedMinimizedChats = [...(state.minimizedChats || []), minimizedChat]
              .map(c => ({ userId: c.userId, user: pickMinimalUser(c.user), timestamp: c.timestamp }));
            localStorage.setItem('minimizedChats', JSON.stringify(updatedMinimizedChats));
          }
        }

        window.dispatchEvent(new CustomEvent(CHAT_EVENTS.REGULAR_CHAT_OPENED));

        dispatch({ type: ActionTypes.SET_ACTIVE_CHAT_USER, payload: user });
        dispatch({ type: ActionTypes.SET_CHAT_BOX_OPEN, payload: true });
        dispatch({ type: ActionTypes.SET_CHAT_BOX_MINIMIZED, payload: false });
        dispatch({ type: ActionTypes.SET_CHAT_DROPDOWN_OPEN, payload: false });
        dispatch({ type: ActionTypes.SET_HAS_UNREAD_MESSAGES, payload: false });

        dispatch({ type: ActionTypes.SET_MESSAGES, payload: [] });
        dispatch({ type: ActionTypes.SET_CURRENT_PAGE, payload: 0 });
        dispatch({ type: ActionTypes.SET_HAS_MORE_MESSAGES, payload: true });

        setTimeout(() => {
          const minimalUser = pickMinimalUser(user);
          localStorage.setItem('chatBoxState', JSON.stringify({
            isOpen: true,
            activeChatUser: minimalUser
          }));
        }, 0);

        setTimeout(async () => {
          dispatch({ type: ActionTypes.SET_LOADING_MESSAGES, payload: true });

          const liveUser = getLiveCurrentUser();
          const senderId = liveUser.userId || liveUser.id;
          const receiverId = user.userId || user.id;

          if (!senderId || !receiverId) {
            dispatch({ type: ActionTypes.SET_LOADING_MESSAGES, payload: false });
            return;
          }

          try {
            let messages = await chatApiService.getConversation(
              senderId,
              receiverId,
              0,
              25
            );

            if (!Array.isArray(messages)) {
              messages = [];
            }

            const formattedMessages = chatApiService.formatConversation(messages, liveUser, state.allUsers || []);

            const sortedMessages = formattedMessages.sort((a, b) =>
              new Date(a.timestamp) - new Date(b.timestamp)
            );

            dispatch({ type: ActionTypes.SET_MESSAGES, payload: sortedMessages });
            dispatch({ type: ActionTypes.SET_LOADING_MESSAGES, payload: false });
          } catch (error) {
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

              const messagesArray = Array.isArray(messages) ? messages : [];
              const formattedMessages = chatApiService.formatConversation(messagesArray, liveUser, state.allUsers || []);
              const sortedMessages = formattedMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
              dispatch({ type: ActionTypes.SET_MESSAGES, payload: sortedMessages });
              dispatch({ type: ActionTypes.SET_LOADING_MESSAGES, payload: false });
            } catch (e2) {
              dispatch({ type: ActionTypes.SET_MESSAGES, payload: [] });
              dispatch({ type: ActionTypes.SET_LOADING_MESSAGES, payload: false });
            }
          }
        }, 50);
      } catch (error) {
        dispatch({ type: ActionTypes.SET_MESSAGES, payload: [] });
        dispatch({ type: ActionTypes.SET_LOADING_MESSAGES, payload: false });
      }
    },

    // Gửi message: thêm message vào local state ngay lập tức (optimistic update) với temp ID, lấy receiver username từ allUsers nếu có, update conversations ngay để dropdown hiển thị preview mới nhất và reorder lên top, thử WebSocket trước (kiểm tra flag và connection status), fallback về API nếu WebSocket fail, reload conversations sau 500ms để đảm bảo conversation mới xuất hiện trong dropdown
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

        const tempMessage = {
          id: `temp-${Date.now()}`,
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

        const receiverUser = (state.allUsers || []).find(u => (u.userId || u.id) === receiverId);
        const finalReceiverUsername = receiverUser?.username || receiverUser?.userName || receiverUser?.name || receiverUsername;
        const finalReceiverAvatar = receiverUser?.avatar || receiverUser?.userAvatar || state.activeChatUser?.avatar;

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
            isOwn: true,
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

        const wsConnected = websocketService.getConnectionStatus();
        const wsAvailable = state.websocketAvailable !== false;

        if (wsConnected && wsAvailable) {
          const success = websocketService.sendMessage(messageData);

          if (success) {
            setTimeout(() => {
              actions.loadConversations();
            }, 500);
            return;
          }
        }

        try {
          await chatApiService.sendMessage(senderId, receiverId, content.trim());
          setTimeout(() => {
            actions.loadConversations();
          }, 500);
        } catch (apiError) {
          dispatch({
            type: ActionTypes.UPDATE_MESSAGE,
            payload: { ...tempMessage, id: null, content: 'Failed to send' }
          });
        }

      } catch (error) {
        dispatch({ type: ActionTypes.SET_ERROR, payload: error.message });
      }
    },

    // UI actions: toggle/close/open chat dropdown và chat box, minimize/restore chat box, close minimized chat
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

    // Đóng chat box: đóng minimized chat bubble tương ứng nếu có, update localStorage (remove chat này khỏi minimizedChats), clear saved chat state từ localStorage (nhưng giữ minimizedChats), clear active chat user và messages
    closeChatBox: () => {
      if (state.activeChatUser) {
        const userId = state.activeChatUser.userId || state.activeChatUser.id;
        dispatch({ type: ActionTypes.REMOVE_MINIMIZED_CHAT, payload: userId });

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

      localStorage.removeItem('chatBoxState');
    },

    // Minimize chat box: kiểm tra chat đã minimized chưa, thêm vào minimizedChats nếu chưa có, lưu vào localStorage với minimal user fields (không lưu messages), update saved chat state để reflect minimized state
    minimizeChatBox: () => {
      if (state.activeChatUser) {
        const userId = state.activeChatUser.userId || state.activeChatUser.id;

        const existingChat = (state.minimizedChats || []).find(chat => chat.userId === userId);

        if (!existingChat) {
          const minimizedChat = {
            userId: userId,
            user: state.activeChatUser,
            messages: state.messages,
            timestamp: Date.now()
          };
          dispatch({ type: ActionTypes.ADD_MINIMIZED_CHAT, payload: minimizedChat });

          const updatedMinimizedChats = [...(state.minimizedChats || []), minimizedChat]
            .map(c => ({ userId: c.userId, user: pickMinimalUser(c.user), timestamp: c.timestamp }));
          localStorage.setItem('minimizedChats', JSON.stringify(updatedMinimizedChats));
        }
      }
      dispatch({ type: ActionTypes.SET_CHAT_BOX_MINIMIZED, payload: true });
      dispatch({ type: ActionTypes.SET_CHAT_BOX_OPEN, payload: false });

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

    // Restore chat từ bubble: tìm minimized chat, nếu đã có active chat thì minimize trước (giống logic openChatWithUser), remove restored chat khỏi minimizedChats, set làm active chat, nếu không có messages (vì không persist) thì load từ API, save restored chat state và update minimizedChats trong localStorage
    restoreChatFromBubble: (userId) => {
      const minimizedChat = state.minimizedChats.find(chat => chat.userId === userId);
      if (minimizedChat) {
        let finalMinimizedChats = [...(state.minimizedChats || [])];

        if (state.activeChatUser && state.messages.length > 0) {
          const currentUserId = state.activeChatUser.userId || state.activeChatUser.id;

          const existingChat = finalMinimizedChats.find(chat => chat.userId === currentUserId);

          if (!existingChat) {
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

        finalMinimizedChats = finalMinimizedChats.filter(chat => chat.userId !== userId);
        dispatch({ type: ActionTypes.REMOVE_MINIMIZED_CHAT, payload: userId });

        dispatch({ type: ActionTypes.SET_ACTIVE_CHAT_USER, payload: minimizedChat.user });
        if (Array.isArray(minimizedChat.messages) && minimizedChat.messages.length > 0) {
          dispatch({ type: ActionTypes.SET_MESSAGES, payload: minimizedChat.messages });
        } else {
          dispatch({ type: ActionTypes.SET_MESSAGES, payload: [] });
          actions.loadConversation(minimizedChat.user);
        }
        dispatch({ type: ActionTypes.SET_CHAT_BOX_OPEN, payload: true });
        dispatch({ type: ActionTypes.SET_CHAT_BOX_MINIMIZED, payload: false });
        dispatch({ type: ActionTypes.SET_HAS_UNREAD_MESSAGES, payload: false });

        const minimalUser = pickMinimalUser(minimizedChat.user);
        localStorage.setItem('chatBoxState', JSON.stringify({
          isOpen: true,
          activeChatUser: minimalUser
        }));

        const minimizedChatsForStorage = finalMinimizedChats
          .map(c => ({ userId: c.userId, user: pickMinimalUser(c.user), timestamp: c.timestamp }));

        if (minimizedChatsForStorage.length > 0) {
          localStorage.setItem('minimizedChats', JSON.stringify(minimizedChatsForStorage));
        } else {
          localStorage.removeItem('minimizedChats');
        }
      }
    },

    // Đóng minimized chat: remove khỏi minimizedChats, update localStorage (remove chat này)
    closeMinimizedChat: (userId) => {
      dispatch({ type: ActionTypes.REMOVE_MINIMIZED_CHAT, payload: userId });

      const updatedMinimizedChats = (state.minimizedChats || []).filter(chat => chat.userId !== userId);
      if (updatedMinimizedChats.length > 0) {
        localStorage.setItem('minimizedChats', JSON.stringify(updatedMinimizedChats));
      } else {
        localStorage.removeItem('minimizedChats');
      }
    },

    // Load conversations: kiểm tra đã có conversations chưa (từ cache initialization), nếu có thì không set loading để tránh UI flicker, thử load từ cache trước (< 2 phút) cho instant display, load fresh data từ API trong background, save vào cache, nếu API fail thì dùng cache dù cũ
    loadConversations: async () => {
      try {
        const hasExistingConversations = state.conversations && state.conversations.length > 0;

        let cacheLoaded = false;
        if (!hasExistingConversations) {
          try {
            const cachedConversations = localStorage.getItem('chatConversations');
            const cacheTimestamp = localStorage.getItem('chatConversationsTimestamp');
            const cacheAge = cacheTimestamp ? Date.now() - parseInt(cacheTimestamp) : Infinity;

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

        if (!hasExistingConversations && !cacheLoaded) {
          dispatch({ type: ActionTypes.SET_LOADING_CONVERSATIONS, payload: true });
        }

        const liveUser = getLiveCurrentUser();
        const userId = liveUser.userId || liveUser.id;

        if (!userId) {
          throw new Error('User ID is required');
        }

        const messages = await chatApiService.getAllMessagesFromUser(userId);
        const conversations = chatApiService.getConversationsList(messages, liveUser, state.allUsers || []);

        try {
          localStorage.setItem('chatConversations', JSON.stringify(conversations));
          localStorage.setItem('chatConversationsTimestamp', String(Date.now()));
        } catch (cacheError) {
          // Ignore cache errors
        }

        dispatch({ type: ActionTypes.SET_CONVERSATIONS, payload: conversations });
      } catch (error) {
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

    // Load conversation với user cụ thể: set loading state, set active chat user, gọi API getConversationLegacy, format messages, set messages vào state
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
        dispatch({ type: ActionTypes.SET_ERROR, payload: error.message });
        dispatch({ type: ActionTypes.SET_MESSAGES, payload: [] });
      } finally {
        dispatch({ type: ActionTypes.SET_LOADING_MESSAGES, payload: false });
      }
    },

    // Load more messages cho infinite scroll: kiểm tra điều kiện (activeChatUser, currentUser, isLoadingMoreMessages, hasMoreMessages), load page tiếp theo với size 25, sort older messages theo timestamp (oldest first) để prepend, kiểm tra có new messages để add không
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
          dispatch({ type: ActionTypes.SET_HAS_MORE_MESSAGES, payload: false });
        } else {
          const formattedMessages = chatApiService.formatConversation(messages, state.currentUser, state.allUsers || []);

          const sortedOlderMessages = formattedMessages.sort((a, b) =>
            new Date(a.timestamp) - new Date(b.timestamp)
          );

          if (sortedOlderMessages.length > 0) {
            dispatch({ type: ActionTypes.PREPEND_MESSAGES, payload: sortedOlderMessages });
            dispatch({ type: ActionTypes.SET_CURRENT_PAGE, payload: nextPage });
          } else {
            dispatch({ type: ActionTypes.SET_HAS_MORE_MESSAGES, payload: false });
          }
        }

      } catch (error) {
        dispatch({ type: ActionTypes.SET_ERROR, payload: error.message });
      } finally {
        dispatch({ type: ActionTypes.SET_LOADING_MORE_MESSAGES, payload: false });
      }
    },

    // Load all users: thử load từ cache trước (< 5 phút) cho instant display, load fresh data từ API, filter out current user khỏi list, save vào cache, nếu API fail thì dùng cache dù cũ
    loadAllUsers: async () => {
      try {
        try {
          const cachedUsers = localStorage.getItem('chatAllUsers');
          const cacheTimestamp = localStorage.getItem('chatAllUsersTimestamp');
          const cacheAge = cacheTimestamp ? Date.now() - parseInt(cacheTimestamp) : Infinity;

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

        const users = await chatApiService.getAllUsers();
        const currentUserId = state.currentUser?.userId || state.currentUser?.id;
        const filteredUsers = (users || [])
          .filter(user => (user.userId || user.id) !== currentUserId);

        try {
          localStorage.setItem('chatAllUsers', JSON.stringify(filteredUsers));
          localStorage.setItem('chatAllUsersTimestamp', String(Date.now()));
        } catch (cacheError) {
          // Ignore cache errors
        }

        dispatch({ type: ActionTypes.SET_ALL_USERS, payload: filteredUsers });
      } catch (error) {
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

    // Mock users cho testing
    loadMockUsers: () => {
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

    // Clear error state
    clearError: () => {
      dispatch({ type: ActionTypes.CLEAR_ERROR });
    },

    // Restore minimized chats từ localStorage: chỉ restore nếu có valid chats, luôn restore nếu current state rỗng hoặc khác, restore với messages rỗng (sẽ load khi bubble được click)
    restoreMinimizedChats: () => {
      try {
        const savedMinimizedChats = localStorage.getItem('minimizedChats');
        if (savedMinimizedChats) {
          const parsedChats = JSON.parse(savedMinimizedChats) || [];
          if (parsedChats.length > 0) {
            const minimizedChats = parsedChats.map(c => ({
              userId: c.userId,
              user: c.user,
              messages: [],
              timestamp: c.timestamp || Date.now()
            }));
            const currentUserIds = (state.minimizedChats || []).map(c => c.userId).sort().join(',');
            const restoredUserIds = minimizedChats.map(c => c.userId).sort().join(',');
            if (!state.minimizedChats || state.minimizedChats.length === 0 || currentUserIds !== restoredUserIds) {
              dispatch({ type: ActionTypes.SET_MINIMIZED_CHATS, payload: minimizedChats });
            }
          }
        }
      } catch (error) {
        // Silently handle error
      }
    },

    // Khởi tạo chat khi user login: lấy current user, connect WebSocket, subscribe to user messages
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

// Hook để sử dụng chat context: throw error nếu không tìm thấy ChatContext (không được dùng ngoài ChatProvider)
export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

export default ChatContext;
