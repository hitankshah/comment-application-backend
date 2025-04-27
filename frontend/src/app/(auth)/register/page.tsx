'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/app/contexts/AuthContext';
import api from '@/app/api/axios';
import ConnectionTest from '@/app/components/ConnectionTest';
import { runApiDiagnostics, testApiPost } from '@/app/utils/apiTest';

interface ValidationErrors {
  email: string;
  password: string;
  confirmPassword: string;
}

interface DiagnosticResult {
  status: 'idle' | 'running' | 'success' | 'error';
  message: string;
  details?: any;
}

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<ValidationErrors>({ email: '', password: '', confirmPassword: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [directApiMode, setDirectApiMode] = useState(false);
  const [showConnectionTest, setShowConnectionTest] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<DiagnosticResult>({
    status: 'idle',
    message: ''
  });
  const router = useRouter();
  const { register } = useAuth();

  // Existing validation functions...
  const validatePassword = (pass: string) => {
    // Relaxed validation for testing - only check length
    if (pass.length < 6) {
      return 'Password must be at least 6 characters long';
    }
    return '';
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'Please enter a valid email address';
    }
    return '';
  };

  useEffect(() => {
    // Only validate if values are not empty
    const newErrors = { ...errors };
    
    // Validate password
    if (password) {
      newErrors.password = validatePassword(password);
    }

    // Validate confirm password
    if (confirmPassword) {
      if (password !== confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      } else {
        newErrors.confirmPassword = '';
      }
    }

    // Validate email
    if (email) {
      newErrors.email = validateEmail(email);
    }

    setErrors(newErrors);
  }, [email, password, confirmPassword]);

  const runDiagnostics = async () => {
    setDiagnosticResult({ status: 'running', message: 'Running API diagnostics...' });
    
    try {
      const results = await runApiDiagnostics();
      
      // Check if any tests failed
      const hasHealthCheckFailed = !results.healthCheck.success;
      const hasAuthCheckFailed = !results.authCheck.success;
      const hasPostFailed = !results.asyncPost.success;
      
      if (hasHealthCheckFailed && hasAuthCheckFailed && hasPostFailed) {
        setDiagnosticResult({
          status: 'error', 
          message: 'All API tests failed. Backend server may be down or unreachable.',
          details: results
        });
      } else if (hasPostFailed) {
        setDiagnosticResult({
          status: 'error',
          message: 'API is reachable but registration endpoint failed. Likely a CORS or validation issue.',
          details: results
        });
      } else if (hasHealthCheckFailed || hasAuthCheckFailed) {
        setDiagnosticResult({
          status: 'error',
          message: 'Some API endpoints are unreachable. Check your network connection.',
          details: results
        });
      } else {
        setDiagnosticResult({
          status: 'success',
          message: 'All API tests passed. Your connection is working correctly.',
          details: results
        });
      }
    } catch (error) {
      setDiagnosticResult({
        status: 'error',
        message: 'Error running diagnostics: ' + (error instanceof Error ? error.message : String(error)),
        details: error
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccess('');
    setErrors({email: '', password: '', confirmPassword: ''});

    // Validate all fields
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);
    const confirmError = password !== confirmPassword ? 'Passwords do not match' : '';

    if (emailError || passwordError || confirmError) {
      setErrors({
        email: emailError,
        password: passwordError,
        confirmPassword: confirmError
      });
      setIsSubmitting(false);
      return;
    }

    try {
      if (directApiMode) {
        // Direct API call using our test utility instead of axios
        console.log('Using direct API mode with fetch API');
        
        const result = await testApiPost('/auth/register', { 
          email, 
          password 
        });
        
        console.log('Direct register test result:', result);
        
        if (result.success) {
          setSuccess('Registration successful! Redirecting to login page...');
          setTimeout(() => router.push('/login?registered=true'), 1500);
        } else {
          throw new Error(result.message || 'Registration failed with status: ' + result.responseStatus);
        }
      } else {
        // Normal registration through AuthContext
        console.log('Registering through AuthContext');
        await register(email, password);
        setSuccess('Registration successful! Redirecting to login page...');
        setTimeout(() => router.push('/login?registered=true'), 1500);
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      
      // Clear previous errors
      const newErrors = { email: '', password: '', confirmPassword: '' };
      
      // Get error message
      const errorMessage = err.message || 'Registration failed';
      
      if (errorMessage.includes('already registered') || 
          errorMessage.toLowerCase().includes('duplicate') ||
          errorMessage.toLowerCase().includes('exists')) {
        newErrors.email = 'This email is already registered';
      }
      else if (errorMessage.toLowerCase().includes('email')) {
        newErrors.email = errorMessage;
      } 
      else if (errorMessage.toLowerCase().includes('password')) {
        newErrors.password = errorMessage;
      } 
      else if (errorMessage.toLowerCase().includes('network') || 
               errorMessage.toLowerCase().includes('connection') ||
               errorMessage.toLowerCase().includes('cors') || 
               errorMessage.toLowerCase().includes('server')) {
        // Network/connection errors - show diagnostic options
        newErrors.email = errorMessage;
        newErrors.password = 'Please try diagnosing your connection below';
        setShowConnectionTest(true);
      } 
      else {
        // Fallback for other errors
        newErrors.password = errorMessage;
      }
      
      setErrors(newErrors);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInputClassName = (error: string) => `
    appearance-none relative block w-full px-3 py-2 border 
    ${error ? 'border-red-300' : 'border-gray-300'} 
    placeholder-gray-500 text-gray-900 focus:outline-none 
    focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm
  `;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Create your account</h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            API URL: <span className="font-medium">{process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}</span>
          </p>
        </div>

        {success && (
          <div className="rounded-md bg-green-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">{success}</p>
              </div>
            </div>
          </div>
        )}

        {showConnectionTest && <ConnectionTest endpoint="/health" />}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label htmlFor="email" className="sr-only">Email address</label>
              <input
                id="email"
                type="email"
                required
                className={getInputClassName(errors.email)}
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                type="password"
                required
                className={getInputClassName(errors.password)}
                placeholder="Password (min 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
            </div>
            <div>
              <label htmlFor="confirm-password" className="sr-only">Confirm password</label>
              <input
                id="confirm-password"
                type="password"
                required
                className={getInputClassName(errors.confirmPassword)}
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center">
              <input
                id="direct-api"
                name="direct-api"
                type="checkbox"
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                checked={directApiMode}
                onChange={() => setDirectApiMode(!directApiMode)}
              />
              <label htmlFor="direct-api" className="ml-2 block text-sm text-gray-900">
                Direct API mode
              </label>
            </div>
            <div className="flex space-x-2">
              <button 
                type="button"
                onClick={() => setShowConnectionTest(!showConnectionTest)}
                className="text-sm text-indigo-600 hover:text-indigo-500"
              >
                {showConnectionTest ? 'Hide connection test' : 'Test connection'}
              </button>
              <button
                type="button"
                onClick={runDiagnostics}
                className="text-sm text-indigo-600 hover:text-indigo-500"
              >
                Run diagnostics
              </button>
            </div>
          </div>

          {/* Diagnostics result display */}
          {diagnosticResult.status !== 'idle' && (
            <div className={`mt-4 p-3 rounded-md ${
              diagnosticResult.status === 'running' ? 'bg-yellow-50 border border-yellow-200' :
              diagnosticResult.status === 'success' ? 'bg-green-50 border border-green-200' :
              'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-center">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  diagnosticResult.status === 'running' ? 'bg-yellow-100 text-yellow-800' :
                  diagnosticResult.status === 'success' ? 'bg-green-100 text-green-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {diagnosticResult.status === 'running' ? 'Running' : 
                   diagnosticResult.status === 'success' ? 'Success' : 'Error'}
                </span>
                <span className="ml-2 text-sm text-gray-600">{diagnosticResult.message}</span>
              </div>
              {diagnosticResult.details && diagnosticResult.status !== 'running' && (
                <details className="mt-2">
                  <summary className="text-xs text-gray-500 cursor-pointer">View details</summary>
                  <pre className="mt-1 text-xs text-gray-500 overflow-auto max-h-40 bg-gray-100 p-2 rounded">
                    {JSON.stringify(diagnosticResult.details, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isSubmitting || Object.values(errors).some(error => error !== '')}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white 
                ${isSubmitting || Object.values(errors).some(error => error !== '') 
                  ? 'bg-indigo-400 cursor-not-allowed' 
                  : 'bg-indigo-600 hover:bg-indigo-700'} 
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
            >
              {isSubmitting ? 'Registering...' : 'Register'}
            </button>
          </div>
        </form>
        <div className="text-sm text-center">
          <span className="text-gray-500">Already have an account?</span>{' '}
          <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
            Login
          </Link>
        </div>
      </div>
    </div>
  );
}
