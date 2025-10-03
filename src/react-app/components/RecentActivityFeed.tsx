import { useEffect, useMemo, useRef, useState } from "react";
import {
    BellRing,
    HeartHandshake,
    Star,
    Trophy,
    Activity as ProgressIcon,
    Loader2,
    AlertCircle,
} from "lucide-react";

/** Types should mirror the worker response */
type ActivityType = "donation" | "milestone" | "pledge" | "progress";
type Activity = {
    id: string;
    type: ActivityType;
    message: string;
    createdAt: string; // ISO
    amount?: number;
    userName?: string;
    participantId?: string;
    campaignId?: string;
};

const FILTERS = [
    { key: "all", label: "All" },
    { key: "donation", label: "Donations" },
    { key: "pledge", label: "Pledges" },
    { key: "progress", label: "Progress" },
    { key: "milestone", label: "Milestones" },
] as const;

const STYLE: Record<
    ActivityType,
    {
        label: string;
        icon: React.ComponentType<{ className?: string }>;
        dot: string;
        iconColor: string;
        chip: string;
    }
> = {
    donation: {
        label: "Donations",
        icon: HeartHandshake,
        dot: "bg-rose-500",
        iconColor: "text-rose-600",
        chip: "bg-rose-50 text-rose-700 border-rose-200",
    },
    pledge: {
        label: "Pledges",
        icon: Star,
        dot: "bg-amber-500",
        iconColor: "text-amber-600",
        chip: "bg-amber-50 text-amber-700 border-amber-200",
    },
    progress: {
        label: "Progress",
        icon: ProgressIcon,
        dot: "bg-indigo-500",
        iconColor: "text-indigo-600",
        chip: "bg-indigo-50 text-indigo-700 border-indigo-200",
    },
    milestone: {
        label: "Milestones",
        icon: Trophy,
        dot: "bg-emerald-500",
        iconColor: "text-emerald-600",
        chip: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
};

function timeAgo(iso: string) {
    const then = new Date(iso).getTime();
    const now = Date.now();
    const diff = Math.max(0, now - then);
    const s = Math.floor(diff / 1000);
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return `${d}d ago`;
}

export default function RecentActivityFeed() {
    const [items, setItems] = useState<Activity[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all");
    const sinceRef = useRef<string | null>(null);

    useEffect(() => {
        let cancel = false;

        async function load(initial = false) {
            try {
                const params = new URLSearchParams();
                params.set("limit", "50");
                if (sinceRef.current) params.set("since", sinceRef.current);

                const res = await fetch(`/wapi/activities?${params.toString()}`, {
                    headers: { "cache-control": "no-cache" },
                });

                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = (await res.json()) as { ok: boolean; items: Activity[] };

                if (!cancel && data?.ok) {
                    setItems((prev) => {
                        const next = initial ? data.items : [...data.items, ...prev];
                        // de-dupe by id
                        const seen = new Set<string>();
                        return next.filter((x) => (seen.has(x.id) ? false : (seen.add(x.id), true)));
                    });
                    const newest = (data.items[0] ?? items[0])?.createdAt;
                    if (newest) sinceRef.current = newest;
                }
                setError(null);
            } catch (e) {
                if (!cancel) setError("Failed to load activities");
            } finally {
                if (!cancel) setLoading(false);
            }
        }

        // initial fetch
        load(true);

        // light polling
        const t = setInterval(load, 10_000);
        return () => {
            cancel = true;
            clearInterval(t);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const filtered = useMemo(() => {
        if (filter === "all") return items;
        return items.filter((i) => i.type === filter);
    }, [items, filter]);

    return (
        <section
            className="rounded-2xl border border-gray-200 shadow-sm overflow-hidden bg-white"
            aria-labelledby="recent-activity-heading"
        >
            {/* Header */}
            <div className="bg-gradient-to-r from-lime-50 to-emerald-50 border-b border-gray-200 px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-lime-400/90 text-black flex items-center justify-center shadow-sm">
                            <BellRing className="h-4 w-4" />
                        </div>
                        <div>
                            <h2 id="recent-activity-heading" className="text-sm font-semibold text-gray-900">
                                Recent Activity
                            </h2>
                            <p className="text-xs text-gray-600">
                <span className="inline-flex items-center gap-1">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  Live
                </span>{" "}
                                • {items.length} {items.length === 1 ? "update" : "updates"}
                            </p>
                        </div>
                    </div>

                    {/* Filter chips */}
                    <div className="flex gap-1 overflow-x-auto hide-scrollbar">
                        {FILTERS.map((f) => {
                            const active = filter === f.key;
                            return (
                                <button
                                    key={f.key}
                                    onClick={() => setFilter(f.key)}
                                    className={[
                                        "whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium transition",
                                        active
                                            ? "bg-black text-lime-300 border-black shadow-sm"
                                            : "bg-white text-gray-700 border-gray-200 hover:border-gray-300",
                                    ].join(" ")}
                                >
                                    {f.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Body */}
            <div className="p-4">
                {loading && (
                    <div className="flex items-center justify-center py-10 text-gray-600">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading activity…
                    </div>
                )}

                {!loading && error && (
                    <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                        <AlertCircle className="h-4 w-4" />
                        {error}
                    </div>
                )}

                {!loading && !error && filtered.length === 0 && (
                    <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-center text-sm text-gray-600">
                        No activity yet. Check back soon!
                    </div>
                )}

                {!loading && !error && filtered.length > 0 && (
                    <div className="relative">
                        {/* timeline spine */}
                        <span className="pointer-events-none absolute left-5 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-gray-200 to-transparent" />
                        <ul className="space-y-3">
                            {filtered.map((a) => {
                                const meta = STYLE[a.type];
                                const Icon = meta.icon;
                                return (
                                    <li key={a.id} className="relative pl-12">
                                        {/* dot */}
                                        <span
                                            className={[
                                                "absolute left-4 top-3 h-3 w-3 rounded-full ring-2 ring-white",
                                                meta.dot,
                                            ].join(" ")}
                                        />
                                        {/* card row */}
                                        <div className="group rounded-xl border border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm transition">
                                            <div className="p-3">
                                                <div className="flex items-center gap-2 text-[11px] text-gray-500">
                                                    <Icon className={`h-4 w-4 ${meta.iconColor}`} />
                                                    <span
                                                        className={[
                                                            "inline-flex items-center rounded-full border px-2 py-0.5 font-medium",
                                                            meta.chip,
                                                        ].join(" ")}
                                                    >
                            {meta.label}
                          </span>
                                                    <span className="text-gray-400">•</span>
                                                    <span>{timeAgo(a.createdAt)}</span>
                                                </div>
                                                <div className="mt-1 text-sm text-gray-900">{a.message}</div>
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                )}
            </div>
        </section>
    );
}

/* Optional: hide horizontal scrollbar for filter row (Tailwind-friendly) */
declare global {
    interface HTMLElementTagNameMap {
        "style": HTMLStyleElement;
    }
}
