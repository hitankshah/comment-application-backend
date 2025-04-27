'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

interface HealthCheck {
  status: string;
  backendUrl: string;
  corsOrigin: string;
  connectionSuccess: boolean;
  error?: string;
  responseTime?: number;
}

export default function HealthCheckPage() {
  const [health, setHealth] = useState<HealthCheck | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  const checkHealth = async () => {
    setIsLoading(true);
    const startTime = performance.now();
    
    try {
      // Try to connect to the backend health endpoint
      const response = await fetch(`${backendUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);
      
      if (response.ok) {
        const data = await response.json();
        setHealth({
          status: 'OK',
          backendUrl,
          corsOrigin: 'Connection successful',
          connectionSuccess: true,
          responseTime
        });
      } else {
        setHealth({
          status: 'Error',
          backendUrl,
          corsOrigin: 'Server returned error',
          connectionSuccess: false,
          error: `Server responded with status: ${response.status}`,
          responseTime
        });
      }
    } catch (error: any) {
      setHealth({
        status: 'Failed',
        backendUrl,
        corsOrigin: 'Connection failed',
        connectionSuccess: false,
        error: error.message || 'Unknown error'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900">Backend Connection Health Check</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Checking connectivity to backend server
              </p>
            </div>
            <button
              onClick={checkHealth}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              disabled={isLoading}
            >
              {isLoading ? 'Checking...' : 'Recheck Connection'}
            </button>
          </div>
          
          {isLoading ? (
            <div className="px-4 py-5 sm:p-6 flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
          ) : health ? (
            <div className="border-t border-gray-200">
              <dl>
                <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Status</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      health.connectionSuccess ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {health.status}
                    </span>
                  </dd>
                </div>
                <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Backend URL</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{health.backendUrl}</dd>
                </div>
                <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Connection Result</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{health.corsOrigin}</dd>
                </div>
                {health.responseTime && (
                  <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Response Time</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{health.responseTime}ms</dd>
                  </div>
                )}
                {health.error && (
                  <div className="bg-red-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-red-500">Error Details</dt>
                    <dd className="mt-1 text-sm text-red-900 sm:mt-0 sm:col-span-2">{health.error}</dd>
                  </div>
                )}
              </dl>
            </div>
          ) : (
            <div className="px-4 py-5 sm:p-6">
              <p className="text-red-500">Failed to check backend health</p>
            </div>
          )}
        </div>
        
        <div className="mt-6 bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Troubleshooting Steps</h3>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
            <ol className="list-decimal pl-5 space-y-2">
              <li>Make sure your backend server is running on <code className="bg-gray-100 px-1">{backendUrl}</code></li>
              <li>Verify that your backend's CORS settings allow requests from this frontend origin</li>
              <li>Check if the backend's <code className="bg-gray-100 px-1">.env</code> file has <code className="bg-gray-100 px-1">CORS_ORIGIN</code> set correctly</li>
              <li>Ensure there are no firewall or network issues blocking the connection</li>
              <li>Check your browser console for specific CORS errors</li>
            </ol>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link 
            href="/"
            className="text-indigo-600 hover:text-indigo-500"
          >
            Return to Home Page
          </Link>
        </div>
      </div>
    </div>
  );
}