import { useEffect } from 'react';

const COZE_SDK_URL =
  'https://sf-cdn.coze.com/obj/unpkg-va/flow-platform/chat-app-sdk/1.2.0-beta.10/libs/oversea/index.js';

// Function để apply custom styles vào Coze widget
const applyCustomStyles = () => {
  // Tìm tất cả các element liên quan đến Coze
  const cozeElements = document.querySelectorAll('[class*="coze"], [id*="coze"]');
  const cozeIframes = document.querySelectorAll('iframe[src*="coze"], iframe[class*="coze"]');

  cozeElements.forEach((el) => {
    if (el.style) {
      // Apply styles cho chat window
      if (el.className && (el.className.includes('chat-window') || el.className.includes('webchat'))) {
        el.style.maxHeight = '600px';
        el.style.height = '600px';
        el.style.borderRadius = '20px';
        el.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.1), 0 4px 16px rgba(255, 182, 193, 0.15)';
        el.style.border = '1px solid rgba(255, 240, 245, 0.6)';
        el.style.background = '#fffefb';
      }
      // Apply styles cho chat button
      if (el.className && (el.className.includes('button') || el.className.includes('launcher'))) {
        el.style.width = '56px';
        el.style.height = '56px';
        el.style.borderRadius = '28px';
        el.style.background = 'linear-gradient(135deg, #ffeef5 0%, #fff5f0 100%)';
        el.style.boxShadow = '0 4px 16px rgba(255, 182, 193, 0.25), 0 2px 8px rgba(255, 182, 193, 0.15)';
        el.style.border = '1px solid rgba(255, 240, 245, 0.8)';
      }
    }
  });

  cozeIframes.forEach((iframe) => {
    iframe.style.maxHeight = '600px';
    iframe.style.height = '600px';
    iframe.style.borderRadius = '20px';
    iframe.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.08)';
    iframe.style.border = '1px solid rgba(255, 240, 245, 0.6)';
  });
};

const CozeChat = () => {
  // Inject custom styles vào DOM
  useEffect(() => {
    const styleId = 'coze-chat-custom-styles';
    if (document.getElementById(styleId)) {
      return;
    }

    // Import CSS content và inject vào head
    const styleElement = document.createElement('style');
    styleElement.id = styleId;
    styleElement.textContent = `
      /* Coze Chat Widget - Minimal Soft Korea Style */
      [class*="coze-chat"], [id*="coze-chat"], [class*="coze-webchat"], [id*="coze-webchat"] {
        max-height: 600px !important;
        height: 600px !important;
      }
      iframe[class*="coze"], iframe[id*="coze"] {
        max-height: 600px !important;
        height: 600px !important;
        border-radius: 20px !important;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08) !important;
        border: 1px solid rgba(255, 240, 245, 0.6) !important;
      }
      [class*="coze-chat-button"], [id*="coze-chat-button"], [class*="coze-launcher"], [id*="coze-launcher"] {
        width: 56px !important;
        height: 56px !important;
        border-radius: 28px !important;
        background: linear-gradient(135deg, #ffeef5 0%, #fff5f0 100%) !important;
        box-shadow: 0 4px 16px rgba(255, 182, 193, 0.25), 0 2px 8px rgba(255, 182, 193, 0.15) !important;
        border: 1px solid rgba(255, 240, 245, 0.8) !important;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
      }
      [class*="coze-chat-button"]:hover, [id*="coze-chat-button"]:hover, [class*="coze-launcher"]:hover, [id*="coze-launcher"]:hover {
        transform: translateY(-2px) scale(1.05) !important;
        box-shadow: 0 6px 24px rgba(255, 182, 193, 0.35), 0 4px 12px rgba(255, 182, 193, 0.2) !important;
        background: linear-gradient(135deg, #fff0f5 0%, #fff8f0 100%) !important;
      }
      [class*="coze-chat-window"], [id*="coze-chat-window"], [class*="coze-webchat-window"] {
        border-radius: 20px !important;
        overflow: hidden !important;
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.1), 0 4px 16px rgba(255, 182, 193, 0.15) !important;
        border: 1px solid rgba(255, 240, 245, 0.6) !important;
        background: #fffefb !important;
        max-height: 600px !important;
        height: 600px !important;
      }
      [class*="coze"] *, [id*="coze"] * {
        font-family: -apple-system, BlinkMacSystemFont, "Noto Sans KR", "Segoe UI", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif !important;
        letter-spacing: -0.01em !important;
      }
      @media (max-width: 768px) {
        [class*="coze-chat-window"], [id*="coze-chat-window"] {
          max-height: 420px !important;
          height: 420px !important;
        }
        iframe[class*="coze"], iframe[id*="coze"] {
          max-height: 420px !important;
          height: 420px !important;
        }
      }
    `;
    document.head.appendChild(styleElement);

    return () => {
      const existingStyle = document.getElementById(styleId);
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, []);

  useEffect(() => {
    // Nếu SDK đã được load trước đó thì không load lại
    if (window.CozeWebSDK) {
      // Đảm bảo client chỉ khởi tạo một lần
      if (!window.__kdbsCozeClient) {
        initCozeClient();
      }
      return;
    }

    const existingScript = document.querySelector(`script[src="${COZE_SDK_URL}"]`);
    if (existingScript) {
      // Nếu script đã có nhưng SDK chưa sẵn sàng, chờ onload
      existingScript.addEventListener('load', () => {
        if (!window.__kdbsCozeClient) {
          initCozeClient();
        }
      });
      return;
    }

    const script = document.createElement('script');
    script.src = COZE_SDK_URL;
    script.async = true;

    script.onload = () => {
      initCozeClient();
    };

    script.onerror = () => {
      console.error('Failed to load Coze Web SDK script');
    };

    document.body.appendChild(script);

    // Không remove script để có thể tái sử dụng toàn app
  }, []);

  const initCozeClient = () => {
    try {
      const botId = import.meta.env.VITE_COZE_BOT_ID;
      const token = import.meta.env.VITE_COZE_TOKEN;
      const title = import.meta.env.VITE_COZE_TITLE || 'KDBS Travel Assistant';

      if (!botId || !token) {
        console.error('Coze bot config missing. Please set VITE_COZE_BOT_ID and VITE_COZE_TOKEN in .env');
        return;
      }

      // Tránh khởi tạo nhiều lần
      if (window.__kdbsCozeClient) {
        return;
      }

      const client = new window.CozeWebSDK.WebChatClient({
        config: {
          bot_id: botId,
        },
        componentProps: {
          title,
          // Minimal soft Korea style props
          style: {
            height: '600px',
            maxHeight: '600px',
            borderRadius: '20px',
          },
        },
        auth: {
          type: 'token',
          token,
          // Luôn trả về token hiện tại từ biến môi trường
          onRefreshToken: async () => {
            const refreshedToken = import.meta.env.VITE_COZE_TOKEN;
            return refreshedToken;
          },
        },
        ui: {
          base: {
            // Icon cho bubble button và header chat
            icon: '/logoKDBScircle.png',
            layout: 'pc',
            zIndex: 1000,
          },
          chatBot: {
            // Tiêu đề và độ rộng của chat window
            title: title,
            width: 390,
          },
        },
      });

      window.__kdbsCozeClient = client;

      // Apply styles sau khi client được tạo
      setTimeout(() => {
        applyCustomStyles();
      }, 500);

      // Observer để apply styles khi widget được render
      const observer = new MutationObserver(() => {
        applyCustomStyles();
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });

      // Cleanup observer sau 10 giây
      setTimeout(() => {
        observer.disconnect();
      }, 10000);
    } catch (error) {
      console.error('Failed to init Coze WebChatClient', error);
    }
  };

  // Cleanup: Ẩn Coze widget khi component unmount
  useEffect(() => {
    return () => {
      // Ẩn tất cả các element Coze khi component unmount
      const cozeElements = document.querySelectorAll('[class*="coze"], [id*="coze"]');
      cozeElements.forEach((el) => {
        if (el.style) {
          el.style.display = 'none';
        }
      });
    };
  }, []);

  // Component không render gì, chỉ có tác dụng inject/chat global
  return null;
};

export default CozeChat;