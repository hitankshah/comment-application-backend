// Utility functions to test API endpoints directly
import axios from 'axios';

// Allow directly testing API endpoints
export const testApiEndpoint = async (
  endpoint: string, 
  method: 'GET' | 'POST' = 'GET',
  data?: any
) => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  const url = `${baseUrl}${endpoint}`;
  
  console.log(`Testing API endpoint: ${method} ${url}`);
  
  try {
    let response;
    if (method === 'GET') {
      response = await axios.get(url);
    } else {
      response = await axios.post(url, data);
    }
    
    console.log(`Response from ${endpoint}:`, response.data);
    return {
      success: true,
      data: response.data,
      status: response.status
    };
  } catch (error: any) {
    console.error(`Error calling ${endpoint}:`, error);
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status
    };
  }
};

// Test authentication endpoints
export const testAuthEndpoints = async () => {
  // Test health endpoint first
  const healthResult = await testApiEndpoint('/health');
  
  // Test registration with a test user
  const testEmail = `test${Date.now()}@example.com`;
  const testPassword = 'Test123456';
  
  const registerResult = await testApiEndpoint(
    '/auth/register', 
    'POST', 
    { email: testEmail, password: testPassword }
  );
  
  // Test login with the test user
  const loginResult = await testApiEndpoint(
    '/auth/login', 
    'POST', 
    { email: testEmail, password: testPassword }
  );
  
  return {
    health: healthResult,
    register: registerResult,
    login: loginResult
  };
};