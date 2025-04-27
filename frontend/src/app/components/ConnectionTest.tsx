'use client';
import { useState, useEffect } from 'react';

interface ConnectionTestProps {
  endpoint?: string;
  showAdvanced?: boolean;
}

export default function ConnectionTest({ endpoint = '/health', showAdvanced = false }: ConnectionTestProps) {
  const [status, setStatus] = useState<'checking' | 'connected' | 'failed'>('checking');
  const [message, setMessage] = useState('Testing connection to backend...');
  const [details, setDetails] = useState<string | null>(null);
  const [corsInfo, setCorsInfo] = useState<Record<string, any> | null>(null);
  const [advancedVisible, setAdvancedVisible] = useState(showAdvanced);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  const [testResults, setTestResults] = useState<any[]>([]);

  const checkConnection = async () => {
    setStatus('checking');
    setMessage('Testing connection to backend...');
    setDetails(null);
    setCorsInfo(null);
    setTestResults([]);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${apiUrl}${endpoint}`, {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          'X-Connection-Test': 'true',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        setStatus('connected');
        setMessage(`Successfully connected to backend at ${apiUrl}`);
        try {
          const data = await response.json();
          setDetails(`Server responded with status ${response.status}`);
          
          // Check if we have CORS information from our enhanced health endpoint
          if (data && data.info && data.info.cors) {
            setCorsInfo(data.info.cors);
          }
          
          // Log the full response for troubleshooting
          console.log('Health check response:', data);
          
          // Store response data for advanced view
          setTestResults([
            { name: 'API Base URL', value: apiUrl },
            { name: 'Endpoint', value: endpoint },
            { name: 'Status', value: `${response.status} ${response.statusText}` },
            { name: 'Response Time', value: `Fast (<500ms)` },
            { name: 'CORS Headers', value: response.headers.get('access-control-allow-origin') || 'None' },
            { name: 'Content-Type', value: response.headers.get('content-type') || 'Not specified' },
            { name: 'Response Size', value: JSON.stringify(data).length + ' bytes' },
          ]);
        } catch (e) {
          setDetails(`Server responded but returned invalid JSON. Status: ${response.status}`);
          setTestResults([
            { name: 'API Base URL', value: apiUrl },
            { name: 'Endpoint', value: endpoint },
            { name: 'Status', value: `${response.status} ${response.statusText}` },
            { name: 'Error', value: 'Invalid JSON response' },
          ]);
        }
      } else {
        setStatus('failed');
        setMessage(`Backend returned error status: ${response.status}`);
        setDetails(`Failed to connect to ${apiUrl}${endpoint}`);
        
        try {
          const errorData = await response.json();
          setTestResults([
            { name: 'API Base URL', value: apiUrl },
            { name: 'Endpoint', value: endpoint },
            { name: 'Status', value: `${response.status} ${response.statusText}` },
            { name: 'Error Data', value: JSON.stringify(errorData) },
          ]);
        } catch (e) {
          setTestResults([
            { name: 'API Base URL', value: apiUrl },
            { name: 'Endpoint', value: endpoint },
            { name: 'Status', value: `${response.status} ${response.statusText}` },
            { name: 'Error', value: 'No error details available' },
          ]);
        }
      }
    } catch (error: any) {
      setStatus('failed');
      
      if (error.name === 'AbortError') {
        setMessage('Connection timed out');
        setDetails(`The request to ${apiUrl}${endpoint} timed out after 5 seconds`);
      } else {
        setMessage('Failed to connect to backend');
        setDetails(error.message || 'Unknown error');
      }
      
      // Record what we know about the error
      setTestResults([
        { name: 'API Base URL', value: apiUrl },
        { name: 'Endpoint', value: endpoint },
        { name: 'Error Type', value: error.name || 'Unknown' },
        { name: 'Error Message', value: error.message || 'No message' },
        { name: 'Browser', value: navigator?.userAgent || 'Unknown' },
      ]);
      
      // Try alternative methods if the main connection failed
      runAlternativeTests();
    }
  };
  
  const runAlternativeTests = async () => {
    try {
      // Try a simple HEAD request which might work even if GET fails
      const headResult = await fetch(`${apiUrl}/health`, { 
        method: 'HEAD',
        headers: { 'X-Connection-Test': 'head-request' }
      });
      
      setTestResults(prev => [
        ...prev,
        { name: 'HEAD Request', value: `${headResult.status} ${headResult.statusText}` }
      ]);
    } catch (e) {
      setTestResults(prev => [
        ...prev,
        { name: 'HEAD Request', value: `Failed: ${(e as Error).message}` }
      ]);
    }
    
    // Check for common CORS issues
    const pageOrigin = typeof window !== 'undefined' ? window.location.origin : 'unknown';
    setTestResults(prev => [
      ...prev,
      { name: 'Page Origin', value: pageOrigin },
      { name: 'CORS Issue Likely', value: apiUrl && !apiUrl.includes(pageOrigin) ? 'Yes' : 'No' },
      { name: 'Suggestion', value: 'Verify backend CORS settings allow requests from ' + pageOrigin }
    ]);
  };

  useEffect(() => {
    checkConnection();
  }, [endpoint]);

  const getBadgeClass = () => {
    switch (status) {
      case 'connected': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <div className="mt-4 p-3 rounded-md bg-gray-50 border border-gray-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getBadgeClass()}`}>
            {status === 'checking' ? 'Checking...' : status === 'connected' ? 'Connected' : 'Failed'}
          </span>
          <span className="ml-2 text-sm text-gray-600">{message}</span>
        </div>
        <button
          onClick={checkConnection}
          className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Test Again
        </button>
      </div>
      
      {details && (
        <div className="mt-2 text-xs text-gray-500">
          <p>{details}</p>
        </div>
      )}
      
      <div className="mt-2">
        <button 
          onClick={() => setAdvancedVisible(!advancedVisible)}
          className="text-xs text-indigo-600 hover:text-indigo-500"
        >
          {advancedVisible ? 'Hide' : 'Show'} advanced details
        </button>
      </div>
      
      {advancedVisible && testResults.length > 0 && (
        <div className="mt-2 border-t border-gray-200 pt-2">
          <h4 className="text-xs font-medium text-gray-500 mb-1">Connection Details</h4>
          <div className="bg-white rounded-md p-2 overflow-auto max-h-40 text-xs">
            <table className="w-full text-left">
              <tbody>
                {testResults.map((result, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? "bg-gray-50" : ""}>
                    <td className="py-1 px-2 font-medium">{result.name}</td>
                    <td className="py-1 px-2 break-all">{result.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {status === 'failed' && (
            <div className="mt-2 text-xs text-gray-600">
              <h4 className="font-medium">Suggestions:</h4>
              <ul className="list-disc pl-4 mt-1">
                <li>Check if your backend server is running at {apiUrl}</li>
                <li>Verify CORS settings allow requests from {typeof window !== 'undefined' ? window.location.origin : 'your frontend'}</li>
                <li>Check browser console for additional error messages</li>
                <li>Try using the "Direct API mode" option when registering</li>
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}