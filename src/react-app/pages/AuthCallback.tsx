import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { useAuth } from '@getmocha/users-service/react';
import { Loader2 } from 'lucide-react';

export default function AuthCallback() {
  const { exchangeCodeForSessionToken, user } = useAuth();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('Auth callback initiated, current URL:', window.location.href);
        
        // Get the authorization code from URL params
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const error = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');
        
        // Ensure all values are strings before logging or using
        const codeStr = code ? String(code) : null;
        const stateStr = state ? String(state) : null;
        const errorStr = error ? String(error) : null;
        const errorDescStr = errorDescription ? String(errorDescription) : null;
        
        console.log('URL params:', { 
          code: codeStr ? 'present' : 'missing', 
          state: stateStr ? 'present' : 'missing',
          error: errorStr, 
          errorDescription: errorDescStr 
        });
        
        if (errorStr) {
          const errorMessage = `OAuth error: ${errorStr}${errorDescStr ? ` - ${errorDescStr}` : ''}`;
          console.error('OAuth error received:', errorMessage);
          setError(errorMessage);
          setIsProcessing(false);
          return;
        }
        
        if (!codeStr) {
          const missingCodeError = 'No authorization code received. Please try logging in again.';
          console.error('Missing authorization code');
          setError(missingCodeError);
          setIsProcessing(false);
          return;
        }

        console.log('Authorization code received, exchanging for session token...');

        // Call our backend session endpoint directly instead of using SDK in browser
        console.log('=== FRONTEND AUTH CALLBACK DEBUG ===');
        console.log('Making session request to /wapi/sessions with code length:', codeStr.length);
        
        const sessionResponse = await fetch('/wapi/sessions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({ code: codeStr })
        });

        console.log('Session response status:', sessionResponse.status, sessionResponse.statusText);
        console.log('Session response headers:', Object.fromEntries(sessionResponse.headers.entries()));
        
        const sessionData = await sessionResponse.json();
        console.log('Session response data:', sessionData);
        
        if (!sessionResponse.ok) {
          const errorMessage = sessionData.error || `Session creation failed with status ${sessionResponse.status}`;
          console.error('Session creation failed:', {
            status: sessionResponse.status,
            statusText: sessionResponse.statusText,
            error: errorMessage,
            debugInfo: sessionData.debugInfo,
            tokenExchangeError: sessionData.tokenExchangeError
          });
          
          // Show the actual error to the user for debugging
          setError(`Authentication failed: ${errorMessage}${sessionData.tokenExchangeError ? ` (Token exchange: ${sessionData.tokenExchangeError})` : ''}`);
          setIsProcessing(false);
          return;
        }

        console.log('Session creation successful:', sessionData);
        
        // Verify session by calling /wapi/me to confirm it's live
        console.log('Verifying session with /wapi/me...');
        const userResponse = await fetch('/wapi/users/me', {
          credentials: 'include'
        });

        console.log('User verification response:', userResponse.status, userResponse.statusText);
        
        if (userResponse.ok) {
          const userData = await userResponse.json();
          console.log('User verification successful:', {
            authenticated: userData.authenticated,
            hasUser: !!userData.id,
            userId: userData.id
          });
          
          // Read state parameter for redirect
          const urlParams = new URLSearchParams(window.location.search);
          const stateParam = urlParams.get('state');
          let redirectPath = '/dashboard';
          
          if (stateParam) {
            try {
              const stateData = JSON.parse(stateParam);
              if (stateData.redirect && typeof stateData.redirect === 'string' && stateData.redirect.startsWith('/')) {
                redirectPath = stateData.redirect;
                console.log('Redirecting to intended path from state:', redirectPath);
              }
            } catch (parseError) {
              console.warn('Failed to parse state parameter:', parseError);
            }
          }
          
          // Navigate to the appropriate path
          navigate(redirectPath, { replace: true });
          return;
        } else {
          console.warn('Session verification failed - got 401, showing error');
          setError('Authentication failed. Please try again.');
          setIsProcessing(false);
          return;
        }
      } catch (err: unknown) {
        console.error('Auth callback error:', err);
        
        // Provide more specific error messages based on the error
        let errorMessage = 'Authentication failed';
        try {
          if (err instanceof Error) {
            errorMessage = err.message || 'Authentication failed';
          } else if (typeof err === 'string') {
            errorMessage = err;
          } else if (err && typeof err === 'object' && 'message' in err) {
            const msg = (err as { message: unknown }).message;
            errorMessage = typeof msg === 'string' ? msg : 'Authentication failed';
          } else {
            errorMessage = String(err || 'Authentication failed');
          }
          
          // Ensure errorMessage is definitely a string
          if (typeof errorMessage !== 'string') {
            errorMessage = 'Authentication failed';
          }
        } catch (stringifyError) {
          console.error('Error processing auth error:', stringifyError);
          errorMessage = 'Authentication failed';
        }
        
        // Safe string checking before calling includes()
        const safeErrorMessage = typeof errorMessage === 'string' ? errorMessage : 'Authentication failed';
        
        if (typeof safeErrorMessage === 'string' && 
           (safeErrorMessage.includes('502') || safeErrorMessage.includes('Bad Gateway') || safeErrorMessage.includes('temporarily unavailable'))) {
          setError('Authentication service is temporarily unavailable. Please wait a moment and try again.');
        } else if (typeof safeErrorMessage === 'string' && 
                  (safeErrorMessage.includes('400') || safeErrorMessage.includes('Invalid authorization code'))) {
          setError('Invalid authorization code. Please try logging in again.');
        } else if (typeof safeErrorMessage === 'string' && 
                  (safeErrorMessage.includes('network') || safeErrorMessage.includes('fetch') || safeErrorMessage.includes('Unable to connect'))) {
          setError('Network connection error. Please check your internet connection and try again.');
        } else if (typeof safeErrorMessage === 'string' && safeErrorMessage.includes('timeout')) {
          setError('Connection timeout. Please check your internet connection and try again.');
        } else {
          setError('Authentication failed. Please try logging in again.');
        }
      } finally {
        setIsProcessing(false);
      }
    };

    handleCallback();
  }, [exchangeCodeForSessionToken]);

  if (isProcessing) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin mb-4">
            <Loader2 className="w-10 h-10 text-bfrs-electric mx-auto" />
          </div>
          <h2 className="text-xl font-semibold text-black mb-2">Completing your login...</h2>
          <p className="text-gray-600">Please wait while we set up your account.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-600 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.502 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-black mb-2">Authentication Failed</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="space-y-3">
            <a 
              href="/" 
              className="block w-full px-4 py-2 bg-bfrs-electric text-black rounded-lg hover:bg-bfrs-electric-dark transition-colors text-center"
            >
              Try Again
            </a>
            <button
              onClick={() => window.location.reload()}
              className="block w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Refresh Page
            </button>
          </div>
          {(typeof error === 'string' && (error.includes('service is temporarily unavailable') || error.includes('temporarily unavailable'))) && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Tip:</strong> If this persists, wait a few minutes and try again. Our authentication service may be experiencing high traffic.
              </p>
            </div>
          )}
          {(typeof error === 'string' && (error.includes('Network connection error') || error.includes('Connection timeout'))) && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Network Issue:</strong> Please check your internet connection. If you're on a slow connection, try again in a moment.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (user) {
    // Navigate immediately without setTimeout to prevent double login issues
    return <Navigate to="/dashboard" replace />;
  }

  return <Navigate to="/" replace />;
}
