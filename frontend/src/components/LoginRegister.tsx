import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getErrorMessage } from '../api/client';
import { toast } from '../utils/notify';
import bankLogo from '../assets/imgs/B_Trust_logo_blue.png';

interface LoginData {
  username: string;
  password: string;
}

interface LoginRegisterProps {
  onLoginSuccess: () => void;
}

interface FormErrors {
  [key: string]: string;
}

const LoginRegister: React.FC<LoginRegisterProps> = ({ onLoginSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [authError, setAuthError] = useState<string>('');
  const [loginData, setLoginData] = useState<LoginData>({
    username: '',
    password: ''
  });

  const navigate = useNavigate();

  useEffect(() => {
    if (sessionStorage.getItem('sessionExpired')) {
      sessionStorage.removeItem('sessionExpired');
      toast.info('Your session has expired. Please sign in again.');
    }
  }, []);

  const validateLoginForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    if (!loginData.username.trim()) {
      newErrors.loginUsername = 'Username is required';
    }
    
    if (!loginData.password) {
      newErrors.loginPassword = 'Password is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateLoginForm()) return;
    
    setIsLoading(true);
    try {
      const response = await axios.post('/api/auth/login', {
        username: loginData.username,
        password: loginData.password
      });
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      // Clear saved dashboard tabs so role defaults apply
      ['adminDashboard.activeSection', 'agentDashboard.activeSection', 'managerDashboard.activeSection',
        'transactionProcessing.activeTab', 'fixedDepositCreation.activeTab'].forEach((key) => localStorage.removeItem(key));

      setAuthError('');
      onLoginSuccess();
      navigate('/dashboard');
    } catch (error) {
      setAuthError(getErrorMessage(error, 'Invalid username or password'));
      setErrors(prev => ({
        ...prev,
        loginUsername: prev.loginUsername || '',
        loginPassword: prev.loginPassword || ''
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLoginData({
      ...loginData,
      [name]: value
    });
    const errorKey = `login${name.charAt(0).toUpperCase() + name.slice(1)}`;
    if (errors[errorKey]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[errorKey];
        return newErrors;
      });
    }
    if (authError) setAuthError('');
  };

  return (
    <div className="login-page-split">
      <div className="login-right-panel">
        <div className="login-form-card">
          {isLoading && (
            <div className="loading-overlay">
              <div className="loading-spinner"></div>
              <p>Authenticating...</p>
            </div>
          )}
          
          <form className="login-form-split" onSubmit={handleLogin}>
            <img src={bankLogo} alt='Bank Trust Logo'/>
            <h2>Welcome Back</h2>
            <p className="form-description">Sign in to access your dashboard</p>
            
            <div className="form-group">
              <label>Username</label>
              <div className="input-with-icon">
                <svg className="input-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <input
                  type="text"
                  name="username"
                  value={loginData.username}
                  onChange={handleLoginChange}
                  placeholder="Enter your username"
                  required
                  className={errors.loginUsername || authError ? 'error' : ''}
                />
              </div>
              {errors.loginUsername && <span className="error-text">{errors.loginUsername}</span>}
            </div>

            <div className="form-group">
              <label>Password</label>
              <div className="input-with-icon">
                <svg className="input-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <input
                  type="password"
                  name="password"
                  value={loginData.password}
                  onChange={handleLoginChange}
                  placeholder="Enter your password"
                  required
                  className={errors.loginPassword || authError ? 'error' : ''}
                />
              </div>
              {errors.loginPassword && <span className="error-text">{errors.loginPassword}</span>}
              {/* Reserve space so the error message doesn't shift the layout */}
              <span className="error-text auth-error-slot">{authError || ' '}</span>
            </div>

            <button type="submit" className="btn-login-split" disabled={isLoading}>
              {isLoading ? (
                <>
                  <div className="loading-spinner small"></div>
                  Logging in...
                </>
              ) : (
                <>
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  Sign In
                </>
              )}
            </button>
          </form>

          <div className="login-info-split">
            <div className="info-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="info-title">Authorized Access Only</p>
              <p className="info-text">Contact your administrator for account assistance.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginRegister;
