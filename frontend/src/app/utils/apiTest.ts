/**
 * Utility for testing API connectivity and diagnosing problems
 */

interface ApiTestResult {
  success: boolean;
  endpoint: string;
  message: string;
  responseStatus?: number;
  responseData?: any;
  error?: any;
  duration: number;
  cors?: {
    hasOriginHeader: boolean;
    requestOrigin: string;
  };
}

/**
 * Tests API connectivity using the Fetch API rather than axios
 * This helps isolate if the issue is with axios or the network/CORS itself
 */
export async function testApiConnection(
  endpoint: string = '/health',
  timeout: number = 5000
): Promise<ApiTestResult> {
  const startTime = performance.now();
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  const url = `${baseUrl}${endpoint}`;
  
  console.log(`🔍 Testing API connection to ${url}`);
  
  try {
    // Use a timeout to avoid hanging forever
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const origin = typeof window !== 'undefined' ? window.location.origin : 'unknown';
    
    // Make the request with specific headers to help diagnose CORS issues
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-Test-Client': 'APITestUtility',
      },
      signal: controller.signal,
      // Include credentials to test CORS with credentials
      credentials: 'include',
    });
    
    // Clear the timeout since we got a response
    clearTimeout(timeoutId);
    
    const duration = Math.round(performance.now() - startTime);
    
    // Try to parse the response as JSON
    let responseData;
    try {
      responseData = await response.json();
    } catch (e) {
      responseData = { error: 'Failed to parse response as JSON' };
    }
    
    // Check if the response contains CORS headers
    const corsHeaders = {
      'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
      'access-control-allow-credentials': response.headers.get('access-control-allow-credentials'),
      'access-control-allow-methods': response.headers.get('access-control-allow-methods'),
    };
    
    return {
      success: response.ok,
      endpoint,
      message: response.ok 
        ? `Successfully connected in ${duration}ms` 
        : `Server responded with status ${response.status}`,
      responseStatus: response.status,
      responseData,
      duration,
      cors: {
        hasOriginHeader: !!corsHeaders['access-control-allow-origin'],
        requestOrigin: origin,
      },
    };
  } catch (error: any) {
    const duration = Math.round(performance.now() - startTime);
    const errorMessage = error.message || 'Unknown error';
    
    console.error(`❌ API test failed: ${errorMessage}`, error);
    
    return {
      success: false,
      endpoint,
      message: errorMessage.includes('aborted') 
        ? `Request timed out after ${timeout}ms` 
        : `Connection error: ${errorMessage}`,
      error,
      duration,
      cors: {
        hasOriginHeader: false,
        requestOrigin: typeof window !== 'undefined' ? window.location.origin : 'unknown',
      },
    };
  }
}

/**
 * Tests a POST request to the API with the given payload
 */
export async function testApiPost(
  endpoint: string,
  data: any,
  timeout: number = 5000
): Promise<ApiTestResult> {
  const startTime = performance.now();
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  const url = `${baseUrl}${endpoint}`;
  
  console.log(`🔍 Testing API POST to ${url}`, data);
  
  try {
    // Use a timeout to avoid hanging forever
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    // Make the request
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-Test-Client': 'APITestUtility',
      },
      signal: controller.signal,
      // Don't include credentials for this test
      credentials: 'omit',
      body: JSON.stringify(data),
    });
    
    // Clear the timeout
    clearTimeout(timeoutId);
    
    const duration = Math.round(performance.now() - startTime);
    
    // Try to parse the response
    let responseData;
    try {
      responseData = await response.json();
    } catch (e) {
      responseData = { error: 'Failed to parse response as JSON' };
    }
    
    return {
      success: response.ok,
      endpoint,
      message: response.ok 
        ? `POST successful in ${duration}ms` 
        : `Server responded with status ${response.status}`,
      responseStatus: response.status,
      responseData,
      duration,
    };
  } catch (error: any) {
    const duration = Math.round(performance.now() - startTime);
    
    return {
      success: false,
      endpoint,
      message: error.message || 'Unknown error during POST request',
      error,
      duration,
    };
  }
}

/**
 * Runs a comprehensive set of API connectivity tests
 */
export async function runApiDiagnostics() {
  const results = {
    healthCheck: await testApiConnection('/health'),
    authCheck: await testApiConnection('/auth'),
    asyncPost: await testApiPost('/auth/register', { 
      email: `test_${Date.now()}@example.com`, 
      password: 'Testing123!' 
    }),
  };
  
  console.log('📊 API Diagnostics Results:', results);
  return results;
}