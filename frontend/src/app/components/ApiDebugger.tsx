'use client';
import { useState, useEffect } from 'react';
import { testApiEndpoint, testAuthEndpoints } from '../utils/apiDebug';

export default function ApiDebugger() {
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [customUrl, setCustomUrl] = useState('/health');
  const [customMethod, setCustomMethod] = useState<'GET' | 'POST'>('GET');
  const [customData, setCustomData] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<'testing' | 'success' | 'failed' | null>(null);

  // Test backend connectivity on component mount
  useEffect(() => {
    testConnection();
  }, []);

  const testConnection = async () => {
    setConnectionStatus('testing');
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        // Use a short timeout to quickly identify connectivity issues
        signal: AbortSignal.timeout(5000)
      });
      
      if (response.ok) {
        console.log('Backend connection successful!');
        setConnectionStatus('success');
      } else {
        console.error('Backend returned error status:', response.status);
        setConnectionStatus('failed');
      }
    } catch (error) {
      console.error('Failed to connect to backend:', error);
      setConnectionStatus('failed');
    }
  };

  const runAllTests = async () => {
    setLoading(true);
    try {
      const results = await testAuthEndpoints();
      setResults(results);
    } catch (error) {
      console.error("Test failed:", error);
      setResults({ error });
    } finally {
      setLoading(false);
    }
  };

  const runCustomTest = async () => {
    setLoading(true);
    try {
      let data = undefined;
      if (customMethod === 'POST' && customData) {
        try {
          data = JSON.parse(customData);
        } catch (e) {
          console.error("Invalid JSON:", e);
          setResults({ error: "Invalid JSON data" });
          setLoading(false);
          return;
        }
      }
      
      const result = await testApiEndpoint(customUrl, customMethod, data);
      setResults({ custom: result });
    } catch (error) {
      console.error("Test failed:", error);
      setResults({ error });
    } finally {
      setLoading(false);
    }
  };

  // Get a status badge based on connection status
  const getConnectionStatusBadge = () => {
    switch (connectionStatus) {
      case 'testing':
        return <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-sm font-medium">Testing connection...</span>;
      case 'success':
        return <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm font-medium">Connected ✓</span>;
      case 'failed':
        return <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm font-medium">Connection failed ✗</span>;
      default:
        return null;
    }
  };

  return (
    <div className="p-4 bg-gray-100 rounded shadow">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">API Debugger</h2>
        {getConnectionStatusBadge()}
      </div>
      
      <div className="mb-4">
        <div className="flex space-x-2">
          <button
            onClick={testConnection}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Test Connection
          </button>
          
          <button
            onClick={runAllTests}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test Auth Endpoints'}
          </button>
        </div>
      </div>

      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">Custom API Test</h3>
        <div className="flex flex-col space-y-2">
          <div className="flex items-center space-x-2">
            <select
              value={customMethod}
              onChange={(e) => setCustomMethod(e.target.value as 'GET' | 'POST')}
              className="border p-2 rounded"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
            </select>
            <input
              type="text"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="/endpoint"
              className="border p-2 rounded flex-1"
            />
          </div>
          
          {customMethod === 'POST' && (
            <textarea
              value={customData}
              onChange={(e) => setCustomData(e.target.value)}
              placeholder='{"key": "value"}'
              className="border p-2 rounded h-24 font-mono"
            />
          )}
          
          <button
            onClick={runCustomTest}
            disabled={loading}
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
          >
            Test Custom Endpoint
          </button>
        </div>
      </div>

      {results && (
        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-2">Results</h3>
          <pre className="bg-gray-800 text-green-400 p-4 rounded overflow-auto max-h-96">
            {JSON.stringify(results, null, 2)}
          </pre>
        </div>
      )}

      <div className="mt-4">
        <h3 className="text-lg font-semibold mb-2">API Configuration</h3>
        <p><strong>API URL:</strong> {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}</p>
        <p><strong>WebSocket URL:</strong> {process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000'}</p>
        
        <div className="mt-2 p-2 bg-gray-200 rounded text-sm">
          <p className="font-semibold">Connection Troubleshooting:</p>
          <ul className="list-disc pl-5 mt-1">
            <li>Ensure your backend is running on the correct port</li>
            <li>Check for CORS issues in the browser console</li>
            <li>Verify firewall settings aren't blocking connections</li>
            <li>If using Docker, ensure proper network configuration</li>
          </ul>
        </div>
      </div>
    </div>
  );
}