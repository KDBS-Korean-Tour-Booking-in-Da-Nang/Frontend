import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { getApiPath } from '../../../config/api';
import { Lock, UserRound } from 'lucide-react';

const StaffLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const { t } = useTranslation();
  const { login } = useAuth();
  const { showSuccess } = useToast();
  const navigate = useNavigate();

  // Handle staff login form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setUsernameError('');
    setPasswordError('');
    setError('');

    let hasErrors = false;

    if (!username.trim()) {
      setUsernameError('Username is required');
      hasErrors = true;
    }

    if (!password.trim()) {
      setPasswordError('Password is required');
      hasErrors = true;
    }

    if (hasErrors) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(getApiPath('/api/auth/login-username'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        let errorMessage = data.message || `HTTP Error: ${response.status}`;
        
        if (response.status === 401) {
          if (data.code === 1008) {
            errorMessage = 'Authentication failed. Please check your username and password.';
          } else {
            errorMessage = 'Incorrect username or password. Please try again.';
          }
        } else if (response.status === 400) {
          errorMessage = 'Invalid data. Please check your information.';
        }
        
        setError(errorMessage);
        return;
      }

      if ((data.code === 1000 || data.code === 0) && data.result) {
        const token = data.result.token;
        const userData = data.result.user;

        if (userData.role === 'STAFF') {
          const user = {
            id: userData.userId,
            role: userData.role,
            name: userData.username,
            email: userData.email,
            avatar: userData.avatar,
            balance: userData.balance,
            staffTask: userData.staffTask
          };

          login(user, token, false);
          showSuccess(t('toast.auth.login_success'));
          navigate('/staff/tasks');
        } else {
          setError(`This account does not have permission to access staff area. Current role: ${userData.role}. Only STAFF can log in to this page.`);
        }
      } else {
        const errorMessage = data.message || 'Login failed. Please check your credentials.';
        setError(errorMessage);
      }
    } catch (err) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        setError('Cannot connect to server. Please check if the backend is running.');
      } else {
        setError('An error occurred while logging in. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#f3f9ff] via-[#edf5ff] to-[#e5f2ff] flex items-center justify-center px-4 py-10 sm:px-8">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-16 left-12 w-28 h-28 rounded-[32px] bg-white/50 blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-32 h-32 rounded-[32px] bg-[#d2e7ff]/70 blur-2xl animate-pulse delay-200" />
      </div>

      <div className="relative w-full max-w-xl">
        <div className="bg-white/90 backdrop-blur-xl rounded-[28px] border border-white/80 shadow-[0px_20px_45px_rgba(103,140,255,0.16)] p-6 sm:p-10">
          <div className="flex flex-col items-center text-center text-[#2563eb] gap-2">
            <div className="w-12 h-12 rounded-2xl bg-[#e3efff] flex items-center justify-center">
              <Lock className="w-6 h-6" strokeWidth={1.4} />
            </div>
            <div className="leading-snug">
              <p className="text-sm font-semibold tracking-[0.2em] uppercase">Sign in</p>
              <p className="text-xs text-[#5f80c5]">Welcome, Staff Team</p>
            </div>
          </div>

          <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="username" className="text-xs uppercase tracking-[0.3em] text-[#5f80c5]">
                Username
              </label>
              <div className={`mt-2 rounded-3xl bg-[#f2f7ff] border ${usernameError ? 'border-[#7ba8ff]' : 'border-[#d7e6ff]'} px-4 py-3 focus-within:border-[#7ba8ff] focus-within:shadow-[0_0_0_2px_rgba(123,168,255,0.18)] transition-all`}>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setUsernameError('');
                  }}
                  className="w-full bg-transparent text-sm text-[#0f1a2b] placeholder:text-[#7f97c8] focus:outline-none"
                  placeholder="Staff username"
                />
              </div>
              {usernameError && (
                <div className="mt-1 text-xs text-[#0b5ed7] px-1">
                  {usernameError}
                </div>
              )}
            </div>

            <div>
              <label htmlFor="password" className="text-xs uppercase tracking-[0.3em] text-[#5f80c5]">
                Password
              </label>
              <div className={`mt-2 rounded-3xl bg-[#f2f7ff] border ${passwordError ? 'border-[#7ba8ff]' : 'border-[#d7e6ff]'} px-4 py-3 focus-within:border-[#7ba8ff] focus-within:shadow-[0_0_0_2px_rgba(123,168,255,0.18)] transition-all flex items-center gap-2`}>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setPasswordError('');
                  }}
                  className="flex-1 bg-transparent text-sm text-[#0f1a2b] placeholder:text-[#7f97c8] focus:outline-none"
                  placeholder="••••••••"
                />
              </div>
              {passwordError && (
                <div className="mt-1 text-xs text-[#0b5ed7] px-1">
                  {passwordError}
                </div>
              )}
            </div>

            {error && (
              <div className="rounded-2xl border border-[#d3e5ff] bg-[#eef5ff] px-4 py-3 text-xs text-[#0b5ed7]">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-3xl bg-gradient-to-r from-[#4f9bff] via-[#3c84ff] to-[#5daeff] py-3 text-sm font-semibold text-white shadow-[0px_12px_30px_rgba(66,119,255,0.35)] transition-all hover:shadow-[0px_16px_36px_rgba(66,119,255,0.45)] disabled:opacity-60"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-white/60 border-t-transparent animate-spin" />
                  <span>Signing in...</span>
                </div>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <div className="mt-6 border-t border-[#dfe9ff]" />

          <Link
            to="/login"
            className="mt-4 flex items-center justify-center gap-2 text-xs font-medium text-[#4d7ae6] hover:text-[#355dcc] transition-colors"
          >
            <UserRound className="w-4 h-4" strokeWidth={1.5} />
            Sign in as Customer / Company
          </Link>

          <div className="mt-6 h-6" />
        </div>
      </div>
    </div>
  );
};

export default StaffLogin; 