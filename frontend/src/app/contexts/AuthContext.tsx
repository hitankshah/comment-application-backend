'use client';
import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import api from '../api/axios';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';

interface User {
  id: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  refreshSession: () => Promise<boolean>;
  getTokens: () => { token: string | null; refreshToken: string | null };
  tokenExpiresIn: number | null; // Added token expiration time
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tokenExpiresIn, setTokenExpiresIn] = useState<number | null>(null);
  const router = useRouter();

  // Helper function to safely decode JWT without throwing errors
  const safelyDecodeToken = (token: string) => {
    try {
      return jwtDecode(token);
    } catch (error) {
      console.error('Failed to decode token:', error);
      return null;
    }
  };

  // Helper to calculate token expiration time in seconds
  const calculateTokenExpiresIn = useCallback((token: string | null): number | null => {
    if (!token) return null;
    
    const decoded = safelyDecodeToken(token);
    if (!decoded || !decoded.exp) return null;
    
    const expiryTime = decoded.exp;
    const currentTime = Math.floor(Date.now() / 1000);
    return Math.max(0, expiryTime - currentTime);
  }, []);

  const getTokens = useCallback(() => {
    const token = localStorage.getItem('token');
    const refreshToken = localStorage.getItem('refreshToken');
    return { token, refreshToken };
  }, []);

  // Function to refresh the authentication session
  const refreshSession = useCallback(async (): Promise<boolean> => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        console.log('No refresh token available');
        return false;
      }

      const response = await api.post('/auth/refresh', { refreshToken });
      if (response.data && response.data.access_token) {
        localStorage.setItem('token', response.data.access_token);
        localStorage.setItem('refreshToken', response.data.refresh_token);
        
        // Update token expiration time
        setTokenExpiresIn(calculateTokenExpiresIn(response.data.access_token));
        
        // Update user state if needed
        if (response.data.user) {
          setUser(response.data.user);
        } else {
          // Fetch user profile if not included
          try {
            const profileResponse = await api.get('/auth/profile');
            setUser(profileResponse.data);
          } catch (profileError) {
            console.error('Failed to fetch profile after token refresh:', profileError);
            return false;
          }
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  }, [calculateTokenExpiresIn]);

  // Periodically check token expiration and refresh if needed
  useEffect(() => {
    const { token } = getTokens();
    const expiresIn = calculateTokenExpiresIn(token);
    setTokenExpiresIn(expiresIn);
    
    // If token exists and is valid
    if (token && expiresIn) {
      // Set up automatic refresh before token expires
      // Refresh when token has less than 5 minutes left (300s)
      const refreshThreshold = 300;
      const refreshTimeInMs = (expiresIn - refreshThreshold) * 1000;
      
      // Only schedule refresh if we're within the window where it makes sense
      // (token is valid for more than 6 minutes)
      let refreshTimer: NodeJS.Timeout | null = null;
      
      if (expiresIn > refreshThreshold + 60) {
        console.log(`Token expires in ${expiresIn}s, scheduling refresh in ${expiresIn - refreshThreshold}s`);
        refreshTimer = setTimeout(() => {
          console.log('Performing scheduled token refresh');
          refreshSession();
        }, refreshTimeInMs);
      } else if (expiresIn < refreshThreshold) {
        // Token is close to expiration, refresh now
        console.log('Token close to expiration, refreshing now');
        refreshSession();
      }
      
      return () => {
        if (refreshTimer) {
          clearTimeout(refreshTimer);
        }
      };
    }
  }, [user, getTokens, calculateTokenExpiresIn, refreshSession]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          // Check if token is valid or about to expire
          const decoded = safelyDecodeToken(token);
          const currentTime = Date.now() / 1000;
          
          // Calculate and set token expiration time
          const expiresIn = calculateTokenExpiresIn(token);
          setTokenExpiresIn(expiresIn);
          
          // If token is expired or about to expire in the next 60 seconds
          if (decoded && decoded.exp && decoded.exp - currentTime < 60) {
            console.log('Token is expired or about to expire, attempting refresh');
            const refreshSuccessful = await refreshSession();
            
            if (!refreshSuccessful) {
              console.log('Token refresh failed, logging out');
              await logout();
              setIsLoading(false);
              return;
            }
          }
          
          // Attempt to get user profile with the token
          try {
            const response = await api.get('/auth/profile');
            setUser(response.data);
          } catch (profileError) {
            console.error('Auth check failed:', profileError);
            // Try to refresh the token once if profile fetch fails
            const refreshSuccessful = await refreshSession();
            if (!refreshSuccessful) {
              await logout();
            }
          }
        }
      } catch (error) {
        console.error('Auth check error:', error);
        await logout();
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [calculateTokenExpiresIn, refreshSession]);

  const login = async (email: string, password: string) => {
    try {
      console.log(`Attempting login with: ${email}`);      
      const response = await api.post('/auth/login', { email, password });
      console.log('Login response received:', !!response.data);
      
      if (!response.data) {
        throw new Error('Empty response received from server');
      }
      
      if (!response.data.access_token) {
        throw new Error('No access token received from server');
      }
      
      // Store tokens in localStorage
      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem('refreshToken', response.data.refresh_token);
      
      // Update token expiration time
      setTokenExpiresIn(calculateTokenExpiresIn(response.data.access_token));
      
      // Set user data from response or fetch it
      if (response.data.user) {
        setUser(response.data.user);
      } else {
        // If user data is missing, fetch it from profile endpoint
        try {
          const profileResponse = await api.get('/auth/profile');
          setUser(profileResponse.data);
        } catch (profileError) {
          console.error('Failed to fetch profile after login:', profileError);
          throw new Error('Failed to retrieve user profile');
        }
      }
      
      // Clear any cached API data
      if (typeof api.clearCache === 'function') {
        api.clearCache();
      }
      
      // Navigate to comments page
      router.push('/comments');
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Handle different error scenarios
      if (error.response) {
        if (error.response.status === 401) {
          throw new Error('Invalid email or password');
        } else if (error.response.data?.message) {
          if (Array.isArray(error.response.data.message)) {
            throw new Error(error.response.data.message[0]);
          } else {
            throw new Error(error.response.data.message);
          }
        } else {
          throw new Error(`Server error: ${error.response.status}`);
        }
      } else if (error.code === 'SERVER_UNREACHABLE') {
        throw new Error('Unable to connect to the server. Please check your network connection or ensure the backend is running.');
      } else if (error.code === 'CORS_ERROR') {
        throw new Error('CORS error: Your browser prevented the request. This typically happens when the frontend and backend are on different origins.');
      } else {
        throw error;
      }
    }
  };

  const register = async (email: string, password: string) => {
    try {
      // Validate email and password
      if (!email || !password) {
        throw new Error('Email and password are required');
      }
      
      // Check if password meets minimum requirements (must match backend requirements)
      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }
      
      if (!/[A-Z]/.test(password)) {
        throw new Error('Password must contain at least one uppercase letter');
      }
      
      if (!/[a-z]/.test(password)) {
        throw new Error('Password must contain at least one lowercase letter');
      }
      
      if (!/[0-9]/.test(password)) {
        throw new Error('Password must contain at least one number');
      }
      
      const response = await api.post('/auth/register', { email, password });
      
      if (response.data) {
        router.push('/login?registered=true');
        return;
      } else {
        throw new Error('Registration failed - empty response data');
      }
    } catch (error: any) {
      // Enhanced error handling
      if (error.response) {
        if (error.response.status === 409) {
          throw new Error('Email is already registered');
        } else if (error.response.data?.message) {
          if (Array.isArray(error.response.data.message)) {
            throw new Error(error.response.data.message[0]);
          } else {
            throw new Error(error.response.data.message);
          }
        }
      } else if (error.code === 'SERVER_UNREACHABLE') {
        throw new Error('Unable to connect to the server. Please check your network connection or ensure the backend is running.');
      } else if (error.code === 'CORS_ERROR') {
        throw new Error('CORS error: Your browser prevented the request.');
      }
      
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Clear local storage
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      
      // Reset user state
      setUser(null);
      setTokenExpiresIn(null);
      
      // Clear any cached API data
      if (typeof api.clearCache === 'function') {
        api.clearCache();
      }
      
      // Redirect to login page
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        logout,
        isAuthenticated: !!user,
        refreshSession,
        getTokens,
        tokenExpiresIn
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
