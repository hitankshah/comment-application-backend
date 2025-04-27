'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/app/contexts/AuthContext';
import api from '@/app/api/axios';

// Component to show network error help
function NetworkErrorHelp({ baseUrl }: { baseUrl: string }) {
  return (
    <div className="mt-4 p-4 rounded bg-blue-50 border border-blue-200">
      <h4 className="font-bold text-blue-800">Connection Troubleshooting</h4>
      <ol className="list-decimal pl-5 mt-2 text-sm space-y-1">
        <li>Make sure your backend server is running at <code className="bg-blue-100 px-1">{baseUrl}</code></li>
        <li>Check if the backend health endpoint is accessible: <code className="bg-blue-100 px-1">{baseUrl}/health</code></li>
        <li>Ensure there are no CORS issues in your browser console</li>
        <li>If using Docker, verify your network settings in docker-compose.yml</li>
      </ol>
    </div>
  );
}

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [directApiMode, setDirectApiMode] = useState(false);
  const [apiBaseUrl, setApiBaseUrl] = useState('');
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    setApiBaseUrl(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000');
  }, []);

  useEffect(() => {
    const registeredParam = searchParams?.get('registered');
    if (registeredParam === 'true') {
      setSuccess('Registration successful! Please log in with your credentials.');
    }
  }, [searchParams]);

  const testBackendConnection = async () => {
    setNetworkError(null);
    setError('');
    setSuccess('Testing connection to backend...');
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${apiBaseUrl}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        setSuccess(`Backend connection successful! Status: ${data.status || 'OK'}. You can now try to login.`);
      } else {
        setNetworkError(`Backend server returned status ${response.status}`);
      }
    } catch (error: any) {
      console.error('Connection test failed:', error);
      setNetworkError(`Failed to connect to backend: ${error.message || 'Unknown error'}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNetworkError(null);
    setSuccess('');
    setIsSubmitting(true);

    try {
      if (directApiMode) {
        const response = await api.post('/auth/login', { email, password });
        if (response.data?.access_token) {
          localStorage.setItem('token', response.data.access_token);
          localStorage.setItem('refreshToken', response.data.refresh_token);
          setSuccess('Login successful via direct API call! Redirecting...');
          setTimeout(() => router.push('/comments'), 1500);
        } else {
          setError('Received response from server but missing access token');
        }
      } else {
        await login(email, password);
        setSuccess('Login successful! Redirecting...');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.message?.includes('network') || err.code === 'NETWORK_ERROR') {
        setNetworkError(err.message);
      } else {
        setError(err.message || 'Login failed');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <h1 className="text-2xl font-bold mb-6 text-center">Log in to your account</h1>
      
      {success && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
          {success}
        </div>
      )}
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {networkError && (
        <div className="mb-4">
          <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            <strong>Network Error:</strong> {networkError}
          </div>
          <NetworkErrorHelp baseUrl={apiBaseUrl} />
          <button
            type="button"
            onClick={testBackendConnection}
            className="mt-2 w-full py-2 px-4 bg-blue-500 text-white rounded hover:bg-blue-600 transition duration-200"
          >
            Test Backend Connection
          </button>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
            Email
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="email"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
            Password
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline"
            id="password"
            type="password"
            placeholder="******************"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div className="flex items-center justify-between mb-4">
          <button
            className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${
              isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Logging in...' : 'Log In'}
          </button>
          <Link href="/register" className="inline-block align-baseline font-bold text-sm text-blue-500 hover:text-blue-800">
            Need an account?
          </Link>
        </div>
        
        <div className="mt-4">
          <label className="flex items-center">
            <input 
              type="checkbox" 
              checked={directApiMode}
              onChange={(e) => setDirectApiMode(e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm text-gray-600">Direct API mode (troubleshooting)</span>
          </label>
        </div>
      </form>
    </div>
  );
}