import { useEffect, useState, useMemo } from "react";
import { Plus, Check, Loader2, Bell, AlertTriangle } from "lucide-react";

type Props = {
    participantId: number;
    className?: string;
    compact?: boolean;
};

export default function FollowButton({ participantId, className = "", compact }: Props) {
    const [loading, setLoading] = useState(true);
    const [following, setFollowing] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const res = await fetch(`/wapi/follows/${participantId}`, {
                    headers: { "cache-control": "no-cache" },
                    credentials: "include",              // IMPORTANT
                });
                if (!res.ok) throw new Error(`init ${res.status}`);
                const j = await res.json();
                if (mounted) setFollowing(!!j.following);
            } catch (e) {
                if (mounted) setErr("Unable to check follow status");
                console.warn(e);
            } finally {
                if (mounted) setLoading(false);
            }
        })();
        return () => { mounted = false; };
    }, [participantId]);

    const size = useMemo(() => (compact ? "h-8 px-3 text-sm" : "h-10 px-4 text-sm sm:text-base"), [compact]);

    const toggle = async () => {
        if (loading) return;
        setErr(null);

        // optimistic UI
        const prev = following;
        setFollowing(!prev);
        setLoading(true);

        try {
            if (prev) {
                const res = await fetch(`/wapi/follows/${participantId}`, {
                    method: "DELETE",
                    credentials: "include",              // IMPORTANT
                });
                if (!res.ok) throw new Error(`unfollow ${res.status}`);
            } else {
                const res = await fetch(`/wapi/follows`, {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ participant_id: participantId }),
                    credentials: "include",              // IMPORTANT
                });
                if (!res.ok) throw new Error(`follow ${res.status}`);
            }
        } catch (e) {
            // roll back optimistic change
            setFollowing(prev);
            const msg = e instanceof Error ? e.message : "Request failed";
            if (String(msg).includes("401")) {
                setErr("Please sign in to follow.");
            } else {
                setErr("Could not update follow status.");
            }
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`relative ${className}`}>
            <button
                onClick={toggle}
                disabled={loading}
                aria-pressed={following}
                className={[
                    "group relative inline-flex items-center justify-center gap-2 rounded-full border transition-all",
                    "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-bfrs-electric",
                    "shadow-sm hover:shadow",
                    size,
                    following
                        ? "bg-black text-bfrs-electric border-black hover:bg-gray-900"
                        : "bg-white text-gray-900 border-gray-300 hover:bg-gray-50",
                    loading ? "opacity-80 cursor-wait" : "cursor-pointer",
                ].join(" ")}
            >
                <span className="pointer-events-none absolute -inset-0.5 rounded-full bg-bfrs-electric/0 blur-xl transition group-hover:bg-bfrs-electric/10" />
                {loading ? (
                    <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Loading</span>
                    </>
                ) : following ? (
                    <>
                        <Check className="h-4 w-4" />
                        <span className="transition group-hover:opacity-0">Following</span>
                        <span className="pointer-events-none absolute opacity-0 transition group-hover:opacity-100" aria-hidden="true">
              Unfollow
            </span>
                    </>
                ) : (
                    <>
            <span className="relative">
              <Plus className="h-4 w-4 transition group-hover:opacity-0" />
              <Bell className="h-4 w-4 absolute inset-0 opacity-0 -translate-y-1 scale-75 transition
                               group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100" />
            </span>
                        <span>Follow</span>
                    </>
                )}
            </button>

            {err && (
                <div className="absolute mt-1 left-0 text-xs text-red-600 flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {err}
                </div>
            )}
        </div>
    );
}
