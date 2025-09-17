import { useEffect, useRef, useState, createContext, useContext, PropsWithChildren } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router";
import { AuthProvider } from "@getmocha/users-service/react";
import HomePage from "@/react-app/pages/Home";
import AuthCallbackPage from "@/react-app/pages/AuthCallback";
import DashboardPage from "@/react-app/pages/Dashboard";
import ParticipantPage from "./pages/Participant";
import CreateParticipantPage from "@/react-app/pages/CreateParticipant";
import ThankYouPage from "@/react-app/pages/ThankYou";
import BrowsePage from "@/react-app/pages/Browse";
import ReminderBanner from "@/react-app/components/ReminderBanner";
import ErrorBoundary from "@/react-app/components/ErrorBoundary";
import AuthErrorBoundary from "@/react-app/components/AuthErrorBoundary";
import { Toaster } from "sonner";

// ---------- Friendly empty-reason plumbing (global) ----------
const EMPTY_MESSAGES: Record<string, string> = {
  "db-not-initialized": "We’re setting things up. Check back in a moment.",
  "schema-missing": "We’re updating the app behind the scenes.",
  "empty": "Nothing here yet — create your first item!",
};

type EmptyCtx = {
  message: string | null;
  setMessage: (m: string | null) => void;
  allowGlobal: boolean;
  setAllowGlobal: (v: boolean) => void;
};

const EmptyReasonContext = createContext<EmptyCtx>({
  message: null, setMessage: () => {},
  allowGlobal: false, setAllowGlobal: () => {}
});

function EmptyReasonProvider({ children }: PropsWithChildren<{}>) {
  const [message, setMessage] = useState<string | null>(null);
  const [allowGlobal, setAllowGlobal] = useState(false);
  return (
    <EmptyReasonContext.Provider value={{ message, setMessage, allowGlobal, setAllowGlobal }}>
      {children}
      <FriendlyEmptyToast />
    </EmptyReasonContext.Provider>
  );
}

function useEmptyReason() {
  return useContext(EmptyReasonContext);
}

/**
 * Intercepts window.fetch to read "x-empty-reason" and surface a friendly message.
 * This is a safety net so pages don’t have to remember to check headers.
 * (It does NOT mutate/consume the response body.)
 */
function FetchHeaderInterceptor() {
  const { setMessage } = useEmptyReason();
  const { setAllowGlobal } = useEmptyReason();
  useEffect(() => { setAllowGlobal(true); return () => setAllowGlobal(false); }, [setAllowGlobal]);
  const lastReasonRef = useRef<string | null>(null);

  useEffect(() => {
    const originalFetch = window.fetch;

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const res = await originalFetch(input as any, init);

      try {
        // Normalize URL
        const url = typeof input === "string" ? new URL(input, window.location.origin)
                 : input instanceof URL ? input
                 : new URL((input as Request).url, window.location.origin);

        const isApi = url.origin === window.location.origin &&
                      (url.pathname.startsWith("/wapi/") || url.pathname.startsWith("/api/"));
        const isGet = (init?.method ?? (input as any)?.method ?? "GET").toUpperCase() === "GET";
        const ok = res.status >= 200 && res.status < 300;

        const reason = res.headers.get("x-empty-reason");
        const display = res.headers.get("x-empty-display"); // "global" | "inline" | null

        // Only show global toast for explicit requests
        if (isApi && isGet && ok && reason && display === "global" && reason !== lastReasonRef.current) {
          lastReasonRef.current = reason;
          setMessage(EMPTY_MESSAGES[reason] ?? "We’re getting things ready. Try again shortly.");
        }
      } catch {
        // ignore parsing issues
      }

      return res;
    };

    return () => { window.fetch = originalFetch; };
  }, [setMessage]);

  return null;
}


function FriendlyEmptyToast() {
  const { message, setMessage } = useEmptyReason();

  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        top: 12,
        right: 12,
        zIndex: 9999,
        background: "#111",
        color: "#fff",
        padding: "12px 14px",
        borderRadius: 10,
        boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
        maxWidth: 360,
        lineHeight: 1.3,
      }}
    >
      <div style={{ marginRight: 28 }}>{message}</div>
      <button
        onClick={() => setMessage(null)}
        aria-label="Dismiss message"
        style={{
          position: "absolute",
          top: 6,
          right: 6,
          border: "none",
          background: "transparent",
          color: "#fff",
          cursor: "pointer",
          fontSize: 18,
        }}
      >
        ×
      </button>
    </div>
  );
}
// -------------------------------------------------------------

export default function App() {
  return (
    <ErrorBoundary>
      <AuthErrorBoundary>
        <AuthProvider>
          <EmptyReasonProvider>
            <FetchHeaderInterceptor />
            <Router>
              <Toaster richColors closeButton position="top-right" />
              <ReminderBanner />
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/browse" element={<BrowsePage />} />
                <Route path="/auth/callback" element={<AuthCallbackPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/participant/:id" element={<ParticipantPage />} />
                <Route path="/create-participant" element={<CreateParticipantPage />} />
                <Route path="/thank-you" element={<ThankYouPage />} />
              </Routes>
            </Router>
          </EmptyReasonProvider>
        </AuthProvider>
      </AuthErrorBoundary>
    </ErrorBoundary>
  );
}
