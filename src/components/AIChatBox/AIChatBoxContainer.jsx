import React, { useState, useEffect } from 'react';
import { useChat } from '../../contexts/ChatContext';
import AIChatBox from './AIChatBox';
import AIChatBubble from './AIChatBubble';

const AIChatBoxContainer = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const { state: chatState } = useChat();

  // Calculate bottom position for AI bubble based on number of user chat bubbles
  // User bubbles start at bottom: 20px, each bubble is 80px apart (from ChatBox.jsx line 587)
  // AI bubble should be positioned above all user bubbles
  // If there are N user bubbles, AI bubble should be at: 20 + (N * 80)px
  const minimizedChatsCount = chatState?.minimizedChats?.length || 0;
  const aiBubbleBottom = 20 + (minimizedChatsCount * 80);

  const handleOpen = () => {
    setIsOpen(true);
    setIsMinimized(false);
  };

  const handleClose = () => {
    setIsOpen(false);
    setIsMinimized(true); // Return to bubble state when closed
  };

  const handleMinimize = () => {
    setIsOpen(false);
    setIsMinimized(true); // Return to bubble state when minimized
  };

  // When AI bubble is clicked, open the chatbox
  const handleBubbleClick = () => {
    handleOpen();
  };

  // Show bubble by default, hide when chatbox is open
  // Bubble should show when minimized OR when not opened yet (default state)
  // When closed or minimized, show the bubble
  const shouldShowBubble = !isOpen;

  return (
    <>
      <AIChatBubble
        onClick={handleBubbleClick}
        isHidden={!shouldShowBubble}
        bottom={aiBubbleBottom}
      />
      <AIChatBox
        isOpen={isOpen}
        onClose={handleClose}
        onMinimize={handleMinimize}
      />
    </>
  );
};

export default AIChatBoxContainer;
