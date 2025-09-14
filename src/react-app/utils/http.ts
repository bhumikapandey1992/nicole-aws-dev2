// src/react-app/utils/http.ts
import { toast } from "sonner";

export type ApiResult<T> = {
  data: T;
  emptyReason: string | null;
  response: Response;
  ok: boolean;
  status: number;
};

export const EMPTY_MESSAGES: Record<string, string> = {
  "db-not-initialized": "We’re setting things up. Check back in a moment.",
  "schema-missing": "We’re updating the app behind the scenes.",
  empty: "Nothing here yet — create your first item!",
};

function messageFor(reason: string | null): string {
  if (!reason) return EMPTY_MESSAGES.empty;
  return EMPTY_MESSAGES[reason] ?? EMPTY_MESSAGES.empty;
}

function isEmptyPayload(v: unknown): boolean {
  if (Array.isArray(v)) return v.length === 0;
  if (v && typeof v === "object") return Object.keys(v as object).length === 0;
  return false;
}

// prevent duplicate toasts spam when a page triggers multiple requests
const seenToastKeys = new Set<string>();
const DEDUPE_MS = 3000;
function oncePerKey(key: string, fn: () => void) {
  if (seenToastKeys.has(key)) return;
  seenToastKeys.add(key);
  try {
    fn();
  } finally {
    setTimeout(() => seenToastKeys.delete(key), DEDUPE_MS);
  }
}

export type FetchJSONOptions = RequestInit & {
  /** Show the friendly toast when empty (default true) */
  showToast?: boolean;
  /** Custom check to decide if this response should be considered "empty" */
  toastIf?: (data: any, res: Response) => boolean;
  /** Force a custom toast message */
  customMessage?: string;
  /** Callback when an empty result is detected */
  onEmpty?: (reason: string) => void;
};

/**
 * Fetch JSON with friendly empty-state handling.
 * - If server sets X-Empty-Reason and payload is empty, shows a friendly toast.
 * - Never throws on non-2xx; you still get { ok, status } to handle in the UI.
 */
export async function fetchJSON<T>(
  url: string,
  opts: FetchJSONOptions = {}
): Promise<ApiResult<T>> {
  const { showToast = true, toastIf, customMessage, onEmpty, ...init } = opts;

  let res: Response;
  try {
    res = await fetch(url, { credentials: "include", ...init });
  } catch {
    // Network-level failure
    toast.error("Network error", {
      description: "Please check your connection and try again.",
    });
    // Re-throw so callers can decide what to do
    throw new Error("Network error");
  }

  // Try to parse JSON; if not JSON, fall back to text
  const contentType = res.headers.get("content-type") || "";
  let parsed: any = null;
  if (contentType.includes("application/json")) {
    parsed = await res.json().catch(() => null);
  } else {
    parsed = await res.text().catch(() => "");
  }

  const emptyReason = res.headers.get("x-empty-reason");
  const result: ApiResult<T> = {
    data: parsed as T,
    emptyReason,
    response: res,
    ok: res.ok,
    status: res.status,
  };

  // Friendly empty-state toast
  const emptyDetected =
    typeof toastIf === "function" ? toastIf(parsed, res) : isEmptyPayload(parsed);

  if (showToast && emptyDetected && emptyReason) {
    const msg = customMessage || messageFor(emptyReason);
    const key = `${emptyReason}:${url}`;
    oncePerKey(key, () => {
      toast(msg, {
        description:
          emptyReason === "db-not-initialized"
            ? "This is normal in local/dev with a fresh database."
            : undefined,
      });
    });
    onEmpty?.(emptyReason);
  }

  // Soft error toast for non-OK responses (unless server already marked it empty)
  if (showToast && !res.ok && !emptyReason) {
    oncePerKey(`err:${res.status}:${url}`, () => {
      toast.error(`Request failed (${res.status})`, {
        description:
          typeof parsed === "object" && parsed && "error" in parsed
            ? String((parsed as any).error)
            : undefined,
      });
    });
  }

  return result;
}

// Back-compat helper (same as fetchJSON)
export async function getJson<T>(
  url: string,
  init?: RequestInit
): Promise<ApiResult<T>> {
  return fetchJSON<T>(url, init);
}
