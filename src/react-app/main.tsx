import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { setupGlobalErrorHandling } from './utils/errorHandling';

// Setup global error handling first
setupGlobalErrorHandling();

// Service worker registration removed - no longer using PWA features

// Global error handling with enhanced filtering and safe string checking
window.addEventListener('error', (event) => {
  // Filter out WebSocket and development-only errors
  try {
    if (event.error && event.error.message) {
      const errorMessage = typeof event.error.message === 'string' ? event.error.message : String(event.error.message || '');
      if (errorMessage.includes('WebSocket') ||
          errorMessage.includes('vite') ||
          errorMessage.includes('localhost') ||
          errorMessage.includes('HMR')) {
        return; // Silently ignore these errors
      }
    }
    console.error('Global error:', event.error);
  } catch (errorProcessingError) {
    console.error('Error processing global error:', errorProcessingError);
  }
});

window.addEventListener('unhandledrejection', (event) => {
  // Filter out WebSocket promise rejections with safe checking
  try {
    if (event.reason && typeof event.reason === 'object' && event.reason.message) {
      const message = typeof event.reason.message === 'string' ? event.reason.message : String(event.reason.message || '');
      if (message.includes('WebSocket') || message.includes('fetch')) {
        return; // Silently ignore these rejections
      }
    }
    console.error('Unhandled promise rejection:', event.reason);
  } catch (rejectionProcessingError) {
    console.error('Error processing unhandled rejection:', rejectionProcessingError);
  }
});

// Global console filtering for all environments
// Apply comprehensive error message filtering that catches all variants
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleLog = console.log;
const originalConsoleInfo = console.info;
  
  console.error = (...args) => {
  try {
    // Ultra-safe string conversion with comprehensive null/undefined checks
    const safeArgs = args.filter(arg => arg !== null && arg !== undefined);
    const message = safeArgs.length > 0 ? safeArgs.join(' ') : '';
    const singleArg = args.length > 0 ? args[0] : '';
    
    // Ensure we always have strings before calling includes()
    let messageStr = '';
    let singleArgStr = '';
    
    try {
      messageStr = typeof message === 'string' ? message : String(message || '');
    } catch {
      messageStr = '';
    }
    
    try {
      singleArgStr = typeof singleArg === 'string' ? singleArg : String(singleArg || '');
    } catch {
      singleArgStr = '';
    }
    
    // Only proceed with includes() calls if we have valid strings
    if (typeof messageStr === 'string' && typeof singleArgStr === 'string') {
      // Ultra-comprehensive pattern matching for Vite errors - catch ALL variations
      if (messageStr.includes('[vite] failed to connect to websocket') || 
          messageStr.includes('WebSocket connection to') ||
          messageStr.includes('your current setup:') ||
          messageStr.includes('Check out your Vite') ||
          messageStr.includes('network configuration') ||
          messageStr.includes('server-options.html') ||
          messageStr.includes('vite.dev/config/server-options') ||
          messageStr.includes('HMR') ||
          messageStr.includes('localhost:5173') ||
          messageStr.includes('(browser)') ||
          messageStr.includes('(server)') ||
          messageStr.includes('<--[HTTP]-->') ||
          messageStr.includes('<--[WebSocket (failing)]-->') ||
          messageStr.includes('sandbox.mocha.app') ||
          messageStr.includes('failed to connect') ||
          messageStr.includes('websocket') ||
          messageStr.includes('WebSocket') ||
          messageStr.includes('[vite]') ||
          singleArgStr.includes('[vite] failed to connect to websocket') ||
          singleArgStr.includes('your current setup:') ||
          singleArgStr.includes('Check out your Vite') ||
          singleArgStr.includes('sandbox.mocha.app') ||
          singleArgStr.includes('localhost:5173') ||
          singleArgStr.includes('<--[HTTP]-->') ||
          singleArgStr.includes('<--[WebSocket (failing)]-->') ||
          singleArgStr.includes('(browser)') ||
          singleArgStr.includes('(server)') ||
          /vite.*websocket/i.test(messageStr) ||
          /websocket.*failed/i.test(messageStr) ||
          /localhost:\d+.*server/i.test(messageStr) ||
          /browser.*server/i.test(messageStr) ||
          /HTTP.*WebSocket/i.test(messageStr) ||
          /setup:.*browser.*server/i.test(messageStr) ||
          /\[vite\].*failed.*connect.*websocket/i.test(messageStr) ||
          /current.*setup.*browser.*server/i.test(messageStr) ||
          /Check.*out.*Vite.*network/i.test(messageStr)) {
        return; // Suppress these specific errors
      }
    }
    originalConsoleError.apply(console, args);
  } catch (consoleErrorProcessingError) {
    // If there's an error in our error processing, just call the original console.error
    originalConsoleError.apply(console, args);
  }
};
  
  console.warn = (...args) => {
  try {
    // Ultra-safe string conversion with comprehensive null/undefined checks
    const safeArgs = args.filter(arg => arg !== null && arg !== undefined);
    const message = safeArgs.length > 0 ? safeArgs.join(' ') : '';
    
    let messageStr = '';
    try {
      messageStr = typeof message === 'string' ? message : String(message || '');
    } catch {
      messageStr = '';
    }
    
    // Only proceed with includes() if we have a valid string
    if (typeof messageStr === 'string' && messageStr.includes) {
      if (messageStr.includes('WebSocket') || 
          messageStr.includes('vite') || 
          messageStr.includes('HMR') ||
          messageStr.includes('localhost')) {
        return; // Suppress WebSocket warnings
      }
    }
    originalConsoleWarn.apply(console, args);
  } catch (consoleWarnProcessingError) {
    originalConsoleWarn.apply(console, args);
  }
};

console.log = (...args) => {
  try {
    // Ultra-safe string conversion with comprehensive null/undefined checks
    const safeArgs = args.filter(arg => arg !== null && arg !== undefined);
    const message = safeArgs.length > 0 ? safeArgs.join(' ') : '';
    const singleArg = args.length > 0 ? args[0] : '';
    
    let messageStr = '';
    let singleArgStr = '';
    
    try {
      messageStr = typeof message === 'string' ? message : String(message || '');
    } catch {
      messageStr = '';
    }
    
    try {
      singleArgStr = typeof singleArg === 'string' ? singleArg : String(singleArg || '');
    } catch {
      singleArgStr = '';
    }
    
    // Only proceed with includes() calls if we have valid strings
    if (typeof messageStr === 'string' && typeof singleArgStr === 'string' && 
        messageStr.includes && singleArgStr.includes) {
      // Suppress log messages that might slip through - ultra-comprehensive TSS filtering
      if (messageStr.includes('TSS: Counted history') || 
          messageStr.includes('TSS: Caught history') ||
          messageStr.includes('TSS: Checking if repeated') ||
          messageStr.includes('TSS: hosted page injected') ||
          messageStr.includes('MBTSS:') ||
          messageStr.includes('injection-tss') ||
          messageStr.includes('Service Worker registered') ||
          messageStr.includes('SW registered') ||
          messageStr.includes('hosted page injected') ||
          messageStr.includes('TSS:') ||
          messageStr.includes('Nonce:') ||
          singleArgStr.includes('injection-tss') ||
          singleArgStr.includes('MBTSS:') ||
          singleArgStr.includes('hosted page injected') ||
          singleArgStr.includes('TSS:') ||
          singleArgStr.includes('Nonce:') ||
          /injection-tss/i.test(messageStr) ||
          /injection-tss/i.test(singleArgStr) ||
          /TSS:/i.test(messageStr) ||
          /TSS:/i.test(singleArgStr) ||
          /MBTSS:/i.test(messageStr) ||
          /MBTSS:/i.test(singleArgStr) ||
          /hosted.*page.*injected/i.test(messageStr) ||
          /hosted.*page.*injected/i.test(singleArgStr) ||
          /Nonce:/i.test(messageStr) ||
          /Nonce:/i.test(singleArgStr) ||
          /injection-tss.*TSS:/i.test(messageStr) ||
          /injection-tss.*MBTSS:/i.test(messageStr) ||
          /TSS:.*hosted.*page.*injected/i.test(messageStr) ||
          /MBTSS:.*Nonce:/i.test(messageStr)) {
        return;
      }
    }
    originalConsoleLog.apply(console, args);
  } catch (consoleLogProcessingError) {
    originalConsoleLog.apply(console, args);
  }
};

console.info = (...args) => {
  try {
    // Ultra-safe string conversion with comprehensive null/undefined checks
    const safeArgs = args.filter(arg => arg !== null && arg !== undefined);
    const message = safeArgs.length > 0 ? safeArgs.join(' ') : '';
    const singleArg = args.length > 0 ? args[0] : '';
    
    let messageStr = '';
    let singleArgStr = '';
    
    try {
      messageStr = typeof message === 'string' ? message : String(message || '');
    } catch {
      messageStr = '';
    }
    
    try {
      singleArgStr = typeof singleArg === 'string' ? singleArg : String(singleArg || '');
    } catch {
      singleArgStr = '';
    }
    
    // Only proceed with includes() calls if we have valid strings
    if (typeof messageStr === 'string' && typeof singleArgStr === 'string' && 
        messageStr.includes && singleArgStr.includes) {
      if (messageStr.includes('Service Worker registered') || 
          messageStr.includes('SW registered') ||
          messageStr.includes('injection-tss') ||
          messageStr.includes('MBTSS:') ||
          messageStr.includes('hosted page injected') ||
          messageStr.includes('TSS:') ||
          messageStr.includes('Nonce:') ||
          singleArgStr.includes('injection-tss') ||
          singleArgStr.includes('MBTSS:') ||
          singleArgStr.includes('hosted page injected') ||
          singleArgStr.includes('TSS:') ||
          singleArgStr.includes('Nonce:') ||
          /injection-tss/i.test(messageStr) ||
          /injection-tss/i.test(singleArgStr) ||
          /TSS:/i.test(messageStr) ||
          /TSS:/i.test(singleArgStr) ||
          /MBTSS:/i.test(messageStr) ||
          /MBTSS:/i.test(singleArgStr) ||
          /hosted.*page.*injected/i.test(messageStr) ||
          /hosted.*page.*injected/i.test(singleArgStr) ||
          /Nonce:/i.test(messageStr) ||
          /Nonce:/i.test(singleArgStr) ||
          /injection-tss.*TSS:/i.test(messageStr) ||
          /injection-tss.*MBTSS:/i.test(messageStr) ||
          /TSS:.*hosted.*page.*injected/i.test(messageStr) ||
          /MBTSS:.*Nonce:/i.test(messageStr)) {
        return; // Suppress service worker and TSS info logs
      }
    }
    originalConsoleInfo.apply(console, args);
  } catch (consoleInfoProcessingError) {
    originalConsoleInfo.apply(console, args);
  }
};

  // Handle various HMR events gracefully with more event types
if (import.meta.hot) {
  try {
    import.meta.hot.on('vite:ws:disconnect', () => {
      // Silently handle disconnect - expected in sandbox
    });
    
    import.meta.hot.on('vite:ws:connect', () => {
      // Silently handle connect attempts
    });
    
    import.meta.hot.on('vite:error', () => {
      // Silently handle Vite errors
    });

    import.meta.hot.on('vite:beforeUpdate', () => {
      // Silently handle before update
    });

    import.meta.hot.on('vite:afterUpdate', () => {
      // Silently handle after update
    });
  } catch {
    // Ignore HMR setup errors
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);
