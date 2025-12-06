import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useChat } from '../../../contexts/ChatContext';
import { useAuth } from '../../../contexts/AuthContext';
import { getAvatarUrl } from '../../../config/api';
import {
  MagnifyingGlassIcon,
  PaperAirplaneIcon,
  PaperClipIcon,
  PhotoIcon,
  MapPinIcon,
  PhoneIcon,
  InformationCircleIcon,
  EllipsisVerticalIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';

const CustomerContact = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { state, actions } = useChat();
  const { user: authUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);
  const hasLoadedUsersRef = useRef(false);
  const retryCountRef = useRef(0);
  const hasOpenedChatFromUrlRef = useRef(false);

  // Resolve current user's ID
  const currentUserId = (() => {
    return state.currentUser?.userId || state.currentUser?.id || authUser?.userId || authUser?.id || null;
  })();

  // Load users with error handling and retry
  const loadUsersWithRetry = async (retryDelay = 500) => {
    if (hasLoadedUsersRef.current && state.allUsers?.length > 0) {
      return; // Already loaded
    }

    try {
      hasLoadedUsersRef.current = true;
      await actions.loadAllUsers();
      retryCountRef.current = 0;
      
      // Load conversations from API (cache already loaded in ChatContext)
      // Delay to avoid ERR_INSUFFICIENT_RESOURCES, but cache shows instantly
      setTimeout(async () => {
        try {
          await actions.loadConversations();
        } catch {
          // Don't show error, conversations are optional
        }
      }, retryDelay + 200);
    } catch {
      hasLoadedUsersRef.current = false;
      
      // Retry with exponential backoff (max 3 retries)
      if (retryCountRef.current < 3) {
        retryCountRef.current += 1;
        const delay = retryDelay * Math.pow(2, retryCountRef.current);
        setTimeout(() => {
          loadUsersWithRetry(delay);
        }, delay);
      } else {
        // After max retries, keep empty list but allow chat to work
      }
    }
  };

  useEffect(() => {
    // Conversations are already loaded from cache in ChatContext initialization
    // Load fresh data in background without blocking UI
    if (!hasLoadedUsersRef.current) {
      loadUsersWithRetry();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-open chat with user from URL query params
  useEffect(() => {
    const userIdFromUrl = searchParams.get('userId');
    if (userIdFromUrl && !hasOpenedChatFromUrlRef.current && state.allUsers?.length > 0) {
      const userId = parseInt(userIdFromUrl, 10);
      if (!isNaN(userId)) {
        // Find user by userId
        const targetUser = state.allUsers.find(u => (u.userId || u.id) === userId);
        if (targetUser) {
          hasOpenedChatFromUrlRef.current = true;
          actions.openChatWithUser(targetUser);
          // Remove userId from URL after opening chat
          searchParams.delete('userId');
          setSearchParams(searchParams, { replace: true });
        }
      }
    }
  }, [searchParams, state.allUsers, actions, setSearchParams]);
  
  // Re-subscribe to WebSocket messages when active chat changes
  useEffect(() => {
    if (state.activeChatUser && state.currentUser) {
      // ChatContext handles WebSocket subscription automatically
      // Messages will be received via WebSocket and added to state.messages
    }
  }, [state.activeChatUser, state.currentUser]);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    if (messagesContainerRef.current && state.messages.length > 0) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [state.messages]);

  // Focus input when active chat changes
  useEffect(() => {
    if (state.activeChatUser && inputRef.current) {
      inputRef.current.focus();
    }
  }, [state.activeChatUser]);

  const handleUserSelect = (user) => {
    actions.openChatWithUser(user);
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !state.activeChatUser) {
      return;
    }
    
    try {
      await actions.sendMessage(messageInput.trim());
      setMessageInput('');
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
    } catch (error) {
      // Silently handle error sending message
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit'
    }) + ' ' + date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Filter users - Staff only see USER role, exclude ADMIN, STAFF, COMPANY, and current user
  const filteredUsers = (state.allUsers || [])
    .filter(user => {
      // Only show USER role, exclude ADMIN, STAFF, COMPANY
      const role = (user.role || user.userRole || '').toUpperCase();
      if (role === 'ADMIN' || role === 'STAFF' || role === 'COMPANY') return false;
      return true;
    })
    .filter(user => {
      // Exclude current user (using userId)
      const userId = user.userId || user.id;
      return userId && userId !== currentUserId;
    })
    .filter(user => {
      // Apply search filter
      const userName = user.username || user.userName || '';
      const userEmail = user.email || user.userEmail || '';
      return userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
             userEmail.toLowerCase().includes(searchTerm.toLowerCase());
    });

  // Merge users with conversations
  const mergedUserList = (() => {
    const convMap = new Map();
    (state.conversations || []).forEach(conv => {
      const key = conv.user?.userId || conv.user?.id;
      if (!key || key === currentUserId) return;
      const existing = convMap.get(key);
      const currentTs = new Date(conv.lastMessage?.timestamp || 0).getTime();
      const existingTs = existing ? new Date(existing.lastMessage?.timestamp || 0).getTime() : -1;
      if (!existing || currentTs > existingTs) {
        convMap.set(key, conv);
      }
    });

    const list = filteredUsers.map(user => {
      const key = user.userId || user.id;
      const conv = convMap.get(key) || null;
      return { user, lastMessage: conv?.lastMessage || null };
    });

    // Sort by latest message
    list.sort((a, b) => {
      const aHas = !!a.lastMessage?.timestamp;
      const bHas = !!b.lastMessage?.timestamp;
      if (aHas && bHas) {
        return new Date(b.lastMessage.timestamp) - new Date(a.lastMessage.timestamp);
      }
      if (aHas) return -1;
      if (bHas) return 1;
      const an = (a.user?.username || a.user?.userName || '').toLowerCase();
      const bn = (b.user?.username || b.user?.userName || '').toLowerCase();
      return an.localeCompare(bn);
    });

    return list;
  })();

  const activeUser = state.activeChatUser;
  const activeUserName = activeUser?.username || activeUser?.userName || activeUser?.name || '';

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-white rounded-lg shadow-sm overflow-hidden">
      {/* Left Sidebar - Chat List - Fixed width and height */}
      <div className="w-1/3 border-r border-gray-200 flex flex-col h-full">
        {/* Header - Fixed height */}
        <div className="p-4 border-b border-gray-200 bg-white flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Chat Box</h2>
            {/* WebSocket Connection Status */}
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                state.isConnected ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
              <span className="text-xs text-gray-500">
                {state.isConnected ? 'Đang kết nối' : 'Mất kết nối'}
              </span>
            </div>
          </div>
          
          {/* Search */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Chat List - Scrollable with fixed container */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {state.loadingUsers && mergedUserList.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm">Đang tải danh sách...</p>
            </div>
          ) : mergedUserList.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <p className="text-sm">Không có người dùng nào</p>
              {state.error && (
                <p className="text-xs text-red-500 mt-2">
                  Lỗi tải danh sách. Chat vẫn hoạt động bình thường.
                </p>
              )}
            </div>
          ) : (
            mergedUserList.map((item) => {
              const user = item.user;
              const userId = user.userId || user.id;
              const userName = user.username || user.userName || user.name || 'N/A';
              const userAvatar = user.avatar || user.userAvatar;
              const lastMessage = item.lastMessage;
              const activeUserId = activeUser?.userId || activeUser?.id;
              const isActive = activeUserId === userId;

              return (
                 <div
                   key={userId || userName}
                   onClick={() => handleUserSelect(user)}
                   onKeyDown={(e) => {
                     if (e.key === 'Enter' || e.key === ' ') {
                       e.preventDefault();
                       handleUserSelect(user);
                     }
                   }}
                   role="button"
                   tabIndex={0}
                   className={`p-3 cursor-pointer transition-colors flex-shrink-0 ${
                     isActive 
                       ? 'bg-[#e9f2ff] border-l-4 border-[#4c9dff]' 
                       : 'hover:bg-gray-50'
                   }`}
                 >
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <img
                        src={getAvatarUrl(userAvatar) || '/default-avatar.png'}
                        alt={userName}
                        className="w-12 h-12 rounded-full object-cover"
                        onError={(e) => {
                          e.target.src = '/default-avatar.png';
                          e.target.onerror = null; // Prevent infinite loop
                        }}
                      />
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                    </div>

                    {/* User Info */}
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <p className="font-semibold text-gray-900 truncate">{userName}</p>
                      {lastMessage && (() => {
                        // Determine if message is from current user (using userId)
                        const lastMessageSenderId = lastMessage.senderId || lastMessage.sender?.userId || lastMessage.sender?.id;
                        const isFromMe = lastMessage.isOwn || (lastMessageSenderId === currentUserId);
                        const prefix = isFromMe ? 'Bạn: ' : 'Tôi: ';
                        return (
                          <p className="text-sm text-gray-500 truncate line-clamp-1">
                            {prefix}{lastMessage.content}
                          </p>
                        );
                      })()}
                    </div>

                    {/* Timestamp - Only one timestamp */}
                    {lastMessage?.timestamp && (
                      <div className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
                        {formatTime(lastMessage.timestamp)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Main Area - Chat */}
      <div className="flex-1 flex flex-col">
        {activeUser ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 bg-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={getAvatarUrl(activeUser.avatar || activeUser.userAvatar) || '/default-avatar.png'}
                  alt={activeUserName}
                  className="w-10 h-10 rounded-full object-cover"
                  onError={(e) => {
                    e.target.src = '/default-avatar.png';
                    e.target.onerror = null; // Prevent infinite loop
                  }}
                />
                <div>
                  <p className="font-semibold text-gray-900">{activeUserName}</p>
                  <p className="text-sm text-gray-500">Last seen a few minutes ago</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <PhoneIcon className="h-5 w-5 text-gray-600" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <InformationCircleIcon className="h-5 w-5 text-gray-600" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <EllipsisVerticalIcon className="h-5 w-5 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div 
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto bg-white min-h-0"
            >
              {state.loadingMessages ? (
                <div className="flex justify-center items-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : state.messages.length === 0 ? (
                <div className="flex justify-center items-center h-full text-gray-500">
                  <p>Chưa có tin nhắn nào. Bắt đầu cuộc trò chuyện!</p>
                </div>
              ) : (
                 <div className="px-4 py-4">
                   {/* Timestamp at top - like in the image */}
                   {state.messages.length > 0 && state.messages[0]?.timestamp && (
                     <div className="text-center text-sm text-gray-500 mb-4">
                       {formatTimestamp(state.messages[0].timestamp)}
                     </div>
                   )}
                   
                   {/* Helper functions for message grouping */}
                   {(() => {
                     const isSameSender = (a, b) => {
                       if (!a || !b) return false;
                       const aSenderId = a.sender?.userId || a.sender?.id || a.senderId;
                       const bSenderId = b.sender?.userId || b.sender?.id || b.senderId;
                       return a.isOwn === b.isOwn && aSenderId === bSenderId;
                     };

                     const isFirstInGroup = (msgs, i) => {
                       return i === 0 || !isSameSender(msgs[i], msgs[i - 1]);
                     };

                     const isLastInGroup = (msgs, i) => {
                       return i === msgs.length - 1 || !isSameSender(msgs[i], msgs[i + 1]);
                     };

                     const bubbleClasses = (msg, i, msgs) => {
                       const first = isFirstInGroup(msgs, i);
                       const last = isLastInGroup(msgs, i);

                       if (msg.isOwn) {
                         // Sender (phải) - nền xanh, chữ trắng
                         const baseClasses = [
                           "bg-[#4c9dff]",
                           "px-3 py-1.5 max-w-xs lg:max-w-md shadow-sm",
                           "rounded-2xl", // bo góc chung lớn
                           "rounded-br-lg", // góc dưới-phải nhỏ hơn để ra dáng bubble
                         ];

                         // Nối khối theo nhóm
                         if (first) {
                           baseClasses.push("rounded-tr-2xl");
                         } else {
                           baseClasses.push("rounded-tr-lg");
                         }

                         if (last) {
                           baseClasses.push("rounded-br-lg");
                         } else {
                           baseClasses.push("rounded-br-md");
                         }

                         return baseClasses.join(" ");
                       } else {
                         // Receiver (trái) - nền xám, chữ đen
                         const baseClasses = [
                           "bg-gray-200",
                           "px-3 py-1.5 max-w-xs lg:max-w-md shadow-sm",
                           "rounded-2xl", // bo góc chung lớn
                           "rounded-bl-lg", // góc dưới-trái nhỏ hơn
                         ];

                         // Nối khối theo nhóm
                         if (first) {
                           baseClasses.push("rounded-tl-2xl");
                         } else {
                           baseClasses.push("rounded-tl-lg");
                         }

                         if (last) {
                           baseClasses.push("rounded-bl-lg");
                         } else {
                           baseClasses.push("rounded-bl-md");
                         }

                         return baseClasses.join(" ");
                       }
                     };

                     return (
                       <div className="space-y-0.5">
                         {state.messages.map((message, index) => {
                           const isLastMessage = index === state.messages.length - 1;
                           const isLastOwnMessage = isLastMessage && message.isOwn;
                           
                           return (
                             <React.Fragment key={message.id || `msg-${index}-${message.timestamp}`}>
                               <div className={`flex ${message.isOwn ? 'justify-end' : 'justify-start'}`}>
                                 <div className={`flex flex-col ${message.isOwn ? 'items-end' : 'items-start'}`}>
                                   <div className={bubbleClasses(message, index, state.messages)}>
                                     <p className={`text-sm whitespace-pre-wrap leading-snug ${
                                       message.isOwn ? '!text-white' : '!text-black'
                                     }`}>
                                       {message.content}
                                     </p>
                                   </div>
                                   {/* Sent status only for last sent message */}
                                   {isLastOwnMessage && (
                                     <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                                       Sent <span className="text-gray-400">↓</span>
                                     </p>
                                   )}
                                 </div>
                               </div>
                             </React.Fragment>
                           );
                         })}
                       </div>
                     );
                   })()}
                   <div ref={messagesEndRef} />
                 </div>
              )}
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-200 bg-white">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Nhập tin nhắn..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <PaperClipIcon className="h-5 w-5 text-gray-600" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <PhotoIcon className="h-5 w-5 text-gray-600" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <MapPinIcon className="h-5 w-5 text-gray-600" />
                </button>
                <button
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim()}
                  className="p-2 bg-[#4c9dff] hover:bg-[#3f85d6] text-white rounded-full transition-all duration-200 shadow-[0_12px_30px_rgba(76,157,255,0.35)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <PaperAirplaneIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center text-gray-500">
              <ChatBubbleLeftRightIcon className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <p className="text-lg">Chọn một người dùng để bắt đầu trò chuyện</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerContact;

