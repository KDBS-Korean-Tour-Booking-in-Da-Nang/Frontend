import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';

const OAuthCallback = () => {
  const { login } = useAuth();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Get URL parameters
    const error = searchParams.get('error');
    const token = searchParams.get('token');
    const userId = searchParams.get('userId');
    const email = searchParams.get('email');
    const username = searchParams.get('username');
    const role = searchParams.get('role');
    const avatar = searchParams.get('avatar');
    const isPremium = searchParams.get('isPremium');
    const balance = searchParams.get('balance');

    // If there's an error, redirect to login with error
    if (error) {
      window.location.replace('/login?error=' + encodeURIComponent(error));
      return;
    }

    // If missing required parameters, redirect to login with error
    if (!token || !userId || !email) {
      window.location.replace('/login?error=' + encodeURIComponent('Không nhận được thông tin xác thực đầy đủ'));
      return;
    }

    try {
      // Store token
      localStorage.setItem('token', decodeURIComponent(token));
      
      // Create user object from URL parameters
      const user = {
        id: parseInt(userId),
        email: decodeURIComponent(email),
        role: role ? decodeURIComponent(role) : 'USER',
        name: username ? decodeURIComponent(username) : decodeURIComponent(email).split('@')[0],
        avatar: avatar ? decodeURIComponent(avatar) : null,
        isPremium: isPremium === 'true',
        balance: balance ? parseFloat(balance) : 0
      };

      // Login user
      login(user);
      
      // Store success message in localStorage
      localStorage.setItem('oauth_success_message', 'Đăng nhập thành công!');
      
      // Immediately redirect to home page
      window.location.replace('/');
      
    } catch (err) {
      // If there's an error, redirect to login with error
      window.location.replace('/login?error=' + encodeURIComponent('Xác thực OAuth thất bại: ' + err.message));
    }
  }, [searchParams, login]);

  // Return null to prevent any rendering
  return null;
};

export default OAuthCallback;
