import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';

// 1. Extend AxiosInstance to add `clearCache`
interface CustomAxiosInstance extends AxiosInstance {
  clearCache?: (url?: string) => void;
}

// 2. Create a cache
const cache = new Map<string, { data: any, timestamp: number }>();
const CACHE_DURATION = 60000; // 1 minute in milliseconds

// Create base API instance
const api: CustomAxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for API calls
api.interceptors.request.use(
  (config) => {
    // Check if the request should be cached
    if (config.method?.toLowerCase() === 'get' && !config.headers['Cache-Control']) {
      config.headers['Cache-Control'] = 'max-age=60';
    }

    // Add authorization header if token exists
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for API calls
api.interceptors.response.use(
  (response) => {
    // Cache GET responses
    if (response.config.method?.toLowerCase() === 'get' && response.config.url) {
      cache.set(response.config.url, { 
        data: response.data,
        timestamp: Date.now()
      });
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };
    
    if (!originalRequest) {
      return Promise.reject(error);
    }
    
    // Handle network errors
    if (error.code === 'ERR_NETWORK') {
      const customError = new Error('Unable to connect to the server. Please check your network connection or ensure the backend is running.');
      (customError as any).code = 'SERVER_UNREACHABLE';
      return Promise.reject(customError);
    }

    // Handle CORS errors
    if (error.message?.includes('CORS')) {
      const customError = new Error('CORS error: Your browser prevented the request. This typically happens when the frontend and backend are on different origins.');
      (customError as any).code = 'CORS_ERROR';
      return Promise.reject(customError);
    }
    
    // Attempt to refresh token if we get 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          // No refresh token, clear auth and reject
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          return Promise.reject(error);
        }
        
        // Get new token
        const response = await axios.post(
          `${api.defaults.baseURL}/auth/refresh`,
          { refreshToken },
          { headers: { 'Content-Type': 'application/json' } }
        );
        
        if (response.data && response.data.access_token) {
          // Save the new tokens
          localStorage.setItem('token', response.data.access_token);
          localStorage.setItem('refreshToken', response.data.refresh_token);
          
          // Update authorization header and retry request
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${response.data.access_token}`;
          } else {
            originalRequest.headers = { Authorization: `Bearer ${response.data.access_token}` };
          }
          
          return api(originalRequest);
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        
        // Clear authentication and reject
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
      }
    }
    
    return Promise.reject(error);
  }
);

// Add cache clearing method
api.clearCache = (url?: string) => {
  if (url) {
    cache.delete(url);
  } else {
    cache.clear();
  }
};

export default api;
