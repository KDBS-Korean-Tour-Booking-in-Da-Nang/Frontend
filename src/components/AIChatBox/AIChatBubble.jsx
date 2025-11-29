import React from 'react';
import { SparklesIcon } from '@heroicons/react/24/outline';
import styles from './AIChatBox.module.css';

const AIChatBubble = ({ onClick, isHidden, bottom = 20 }) => {
  if (isHidden) return null;

  return (
    <div 
      className={styles.aiChatBubble}
      onClick={onClick}
      style={{ bottom: `${bottom}px` }}
    >
      <div className={styles.bubbleIcon}>
        <SparklesIcon className="w-6 h-6" />
      </div>
      <div className={styles.bubbleTooltip}>
        <span>Chat with AI</span>
      </div>
    </div>
  );
};

export default AIChatBubble;
