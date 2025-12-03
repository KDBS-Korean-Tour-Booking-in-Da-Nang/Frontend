import React from 'react';
import { useChat } from '../../contexts/ChatContext';
import { 
  WifiIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon 
} from '@heroicons/react/24/outline';
import styles from './WebSocketStatus.module.css';

const WebSocketStatus = () => {
  const { state } = useChat();

  const getStatusIcon = () => {
    if (state.isConnected) {
      return <CheckCircleIcon className={styles.connected} />;
    } else if (state.isConnecting) {
      return <WifiIcon className={styles.connecting} />;
    } else {
      return <ExclamationTriangleIcon className={styles.disconnected} />;
    }
  };

  const getStatusText = () => {
    if (state.isConnected) {
      if (state.websocketAvailable) {
        return 'Chat sẵn sàng';
      } else {
        return 'Chat (REST)';
      }
    } else if (state.isConnecting) {
      return 'Đang kết nối...';
    } else {
      return 'Chat offline';
    }
  };

  const getStatusClass = () => {
    if (state.isConnected) {
      return styles.connected;
    } else if (state.isConnecting) {
      return styles.connecting;
    } else {
      return styles.disconnected;
    }
  };

  return (
    <div className={`${styles.statusContainer} ${getStatusClass()}`}>
      {getStatusIcon()}
      <span className={styles.statusText} style={{ display: 'none' }}>{getStatusText()}</span>
    </div>
  );
};

export default WebSocketStatus;
