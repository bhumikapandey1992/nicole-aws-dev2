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

type EmptyCtx = { message: string | null; setMessage: (m: string | null) => void };
const EmptyReasonContext = createContext<EmptyCtx>({ message: null, setMessage: () => {} });

function EmptyReasonProvider({ children }: PropsWithChildren<{}>) {
  const [message, setMessage] = useState<string | null>(null);
  return (
    <EmptyReasonContext.Provider value={{ message, setMessage }}>
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
  const lastReasonRef = useRef<string | null>(null);

  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const res = await originalFetch(input as any, init);
      const reason = res.headers.get("x-empty-reason");
      if (reason && reason !== lastReasonRef.current) {
        lastReasonRef.current = reason;
        setMessage(EMPTY_MESSAGES[reason] ?? "We’re getting things ready. Try again shortly.");
      }
      return res;
    };
    return () => {
      window.fetch = originalFetch;
    };
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
