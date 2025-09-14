// Comprehensive error handling utilities

export interface AppError {
  message: string;
  code?: string;
  details?: string;
  userMessage: string;
  retryable: boolean;
}

// Convert any error to a safe string
export function safeStringify(error: unknown): string {
  try {
    if (error === null || error === undefined) {
      return 'Unknown error occurred';
    }
    
    if (typeof error === 'string') {
      return error;
    }
    
    if (error instanceof Error) {
      return error.message || 'Error occurred';
    }
    
    if (typeof error === 'object') {
      // Handle Response objects
      if (error.constructor && error.constructor.name === 'Response') {
        try {
          return `Network error: ${(error as Response).status} ${(error as Response).statusText}`;
        } catch {
          return 'Network error occurred';
        }
      }
      
      // Handle objects with message property
      if ('message' in error) {
        const message = (error as { message: unknown }).message;
        if (typeof message === 'string') {
          return message;
        }
      }
      
      // Try to stringify object safely
      try {
        const stringified = JSON.stringify(error);
        if (stringified && stringified !== '{}' && stringified !== 'null') {
          return stringified;
        }
      } catch {
        // JSON.stringify failed, fall through
      }
      
      // Try toString method
      try {
        return String(error);
      } catch {
        return 'Object error occurred';
      }
    }
    
    return String(error);
  } catch {
    return 'Unable to process error information';
  }
}

// Create user-friendly error messages
export function createAppError(error: unknown, context: string = 'application'): AppError {
  const message = safeStringify(error);
  const lowercaseMessage = typeof message === 'string' ? message.toLowerCase() : '';
  
  // Network errors
  if (lowercaseMessage.includes('fetch') || 
      lowercaseMessage.includes('network') || 
      lowercaseMessage.includes('connection') ||
      lowercaseMessage.includes('timeout')) {
    return {
      message,
      code: 'NETWORK_ERROR',
      userMessage: 'Network connection error. Please check your internet connection and try again.',
      retryable: true
    };
  }
  
  // Server errors (5xx)
  if (lowercaseMessage.includes('500') || 
      lowercaseMessage.includes('502') || 
      lowercaseMessage.includes('503') || 
      lowercaseMessage.includes('504') ||
      lowercaseMessage.includes('internal server error') ||
      lowercaseMessage.includes('bad gateway') ||
      lowercaseMessage.includes('service unavailable') ||
      lowercaseMessage.includes('gateway timeout')) {
    return {
      message,
      code: 'SERVER_ERROR',
      userMessage: 'Service temporarily unavailable. Please try again in a moment.',
      retryable: true
    };
  }
  
  // Authentication errors
  if (lowercaseMessage.includes('401') || 
      lowercaseMessage.includes('403') || 
      lowercaseMessage.includes('unauthorized') ||
      lowercaseMessage.includes('forbidden') ||
      lowercaseMessage.includes('authentication') ||
      lowercaseMessage.includes('session')) {
    return {
      message,
      code: 'AUTH_ERROR',
      userMessage: 'Authentication required. Please log in again.',
      retryable: false
    };
  }
  
  // Validation errors (4xx)
  if (lowercaseMessage.includes('400') || 
      lowercaseMessage.includes('422') ||
      lowercaseMessage.includes('bad request') ||
      lowercaseMessage.includes('invalid') ||
      lowercaseMessage.includes('validation')) {
    return {
      message,
      code: 'VALIDATION_ERROR',
      userMessage: 'Please check your input and try again.',
      retryable: false
    };
  }
  
  // Not found errors
  if (lowercaseMessage.includes('404') || 
      lowercaseMessage.includes('not found')) {
    return {
      message,
      code: 'NOT_FOUND',
      userMessage: 'The requested resource was not found.',
      retryable: false
    };
  }
  
  // File/upload errors
  if (lowercaseMessage.includes('file') || 
      lowercaseMessage.includes('upload') ||
      lowercaseMessage.includes('image') ||
      lowercaseMessage.includes('size') ||
      lowercaseMessage.includes('format')) {
    return {
      message,
      code: 'FILE_ERROR',
      userMessage: 'File upload error. Please check the file and try again.',
      retryable: true
    };
  }
  
  // Permission/security errors
  if (lowercaseMessage.includes('permission') || 
      lowercaseMessage.includes('security') ||
      lowercaseMessage.includes('blocked') ||
      lowercaseMessage.includes('cors')) {
    return {
      message,
      code: 'PERMISSION_ERROR',
      userMessage: 'Permission denied. This may be due to browser security settings.',
      retryable: false
    };
  }
  
  // Default error
  return {
    message,
    code: 'UNKNOWN_ERROR',
    userMessage: `An unexpected error occurred${context !== 'application' ? ` in ${context}` : ''}. Please try again.`,
    retryable: true
  };
}

// Async error wrapper for functions
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context: string = 'operation'
): Promise<{ result?: T; error?: AppError }> {
  try {
    const result = await operation();
    return { result };
  } catch (error) {
    return { error: createAppError(error, context) };
  }
}

// Error boundary fallback component data
export function getErrorBoundaryData(error: Error): {
  title: string;
  message: string;
  showDetails: boolean;
  details?: string;
} {
  // Filter out development/HMR errors
  if (error.message && (
    error.message.includes('WebSocket') ||
    error.message.includes('vite') ||
    error.message.includes('HMR') ||
    error.message.includes('localhost')
  )) {
    return {
      title: 'Development Error',
      message: 'This error is related to the development environment and can be ignored.',
      showDetails: false
    };
  }
  
  const appError = createAppError(error, 'component');
  
  return {
    title: 'Something went wrong',
    message: appError.userMessage,
    showDetails: process.env.NODE_ENV === 'development',
    details: process.env.NODE_ENV === 'development' ? 
      `${error.name}: ${error.message}\n\n${error.stack}` : undefined
  };
}

// Global error handler setup
export function setupGlobalErrorHandling(): void {
  // Comprehensive error message filtering
  const originalConsoleError = console.error;
  console.error = (...args) => {
    const message = args.join(' ');
    
    // Skip development/HMR errors
    if (message.includes('[vite]') || 
        message.includes('WebSocket') ||
        message.includes('HMR') ||
        message.includes('localhost') ||
        message.includes('sandbox.mocha.app') ||
        message.includes('(browser)') ||
        message.includes('(server)') ||
        message.includes('Your current setup') ||
        message.includes('Check out your Vite')) {
      return;
    }
    
    originalConsoleError.apply(console, args);
  };
  
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const error = safeStringify(event.reason);
    
    // Skip WebSocket and development errors
    if (error.includes('WebSocket') || 
        error.includes('vite') ||
        error.includes('HMR') ||
        error.includes('localhost')) {
      return;
    }
    
    console.error('Unhandled promise rejection:', error);
  });
  
  // Handle global errors
  window.addEventListener('error', (event) => {
    const error = safeStringify(event.error);
    
    // Skip development errors
    if (error.includes('WebSocket') || 
        error.includes('vite') ||
        error.includes('HMR') ||
        error.includes('localhost')) {
      return;
    }
    
    console.error('Global error:', error);
  });
}
