import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
// Build an absolute URL for the default banner so it works on any route/base
function getDefaultBannerUrl() {
  const base = (import.meta.env.BASE_URL ?? "/");
  const basePath = base.endsWith("/") ? base : base + "/";
  if (typeof window !== "undefined") {
    return new URL(basePath + "default-spotlight.png", window.location.origin).toString();
  }
  return basePath + "default-spotlight.png";
}

type SpotlightData = {
    id: number;
    participant_name: string;
    campaign_title: string;
    image_url?: string | null;
    spotlight_image_url?: string | null;
    profile_image_url?: string | null;
    current_progress: number;
    goal_amount: number;
    unit: string;
    progress_pct: number;
    challenge_name?: string; // optional
};

export default function SpotlightCard({ data }: { data: SpotlightData }) {
    const DEFAULT_BANNER_URL = getDefaultBannerUrl();

    // Determine candidate url from known fields or fallback to default
    const firstNonEmpty = (...vals: Array<string | null | undefined>) => vals.find(v => typeof v === 'string' && v.trim()) as string | undefined;
    const candidate = firstNonEmpty(
        data.image_url,
        data.spotlight_image_url,
        data.profile_image_url
    ) || DEFAULT_BANNER_URL;

    const [imageUrl, setImageUrl] = useState<string>(candidate);

    // Preload and ensure fallback to default on error
    useEffect(() => {
        let cancelled = false;
        const img = new Image();
        img.src = candidate;
        img.onload = () => { if (!cancelled) setImageUrl(candidate); };
        img.onerror = () => { if (!cancelled) setImageUrl(DEFAULT_BANNER_URL); };
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [candidate, DEFAULT_BANNER_URL]);

    return (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            {/* Banner */}
            <img
                src={imageUrl}
                alt={data.participant_name ? `${data.participant_name} banner` : 'Spotlight banner'}
                className="h-40 sm:h-48 w-full object-cover block"
                loading="lazy"
                onError={() => { if (imageUrl !== DEFAULT_BANNER_URL) setImageUrl(DEFAULT_BANNER_URL); }}
            />

            {/* Body */}
            <div className="p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <p className="text-xs font-semibold tracking-widest text-gray-500">PARTICIPANT SPOTLIGHT</p>
                        <h2 className="mt-1 text-2xl font-bold text-black">{data.participant_name}</h2>
                        <p className="mt-1 text-gray-600">
                            A featured campaign raising funds for psychiatric recovery access.
                        </p>
                    </div>
                    <Link
                        to={`/participant/${data.id}`}
                        className="inline-flex items-center px-5 py-3 bg-bfrs-electric text-black font-semibold rounded-lg hover:bg-bfrs-electric-dark transition"
                    >
                        View Campaign
                        <svg className="ml-2 h-4 w-4" viewBox="0 0 24 24" fill="none">
                            <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </Link>
                </div>

                {/* Stats */}
                <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="rounded-xl border border-gray-200 p-4">
                        <p className="text-xs text-gray-500">Progress</p>
                        <p className="text-lg font-semibold text-black">
                            {data.current_progress} {data.unit}
                        </p>
                        <div className="mt-2 h-2 rounded-full bg-gray-100" aria-hidden>
                            <div
                                className="h-2 rounded-full bg-bfrs-electric"
                                style={{ width: `${Math.max(0, Math.min(100, data.progress_pct || 0))}%` }}
                                role="progressbar"
                                aria-valuenow={Math.max(0, Math.min(100, data.progress_pct || 0))}
                                aria-valuemin={0}
                                aria-valuemax={100}
                            />
                        </div>
                    </div>

                    <div className="rounded-xl border border-gray-200 p-4">
                        <p className="text-xs text-gray-500">Goal</p>
                        <p className="text-lg font-semibold text-black">
                            {data.goal_amount} {data.unit}
                        </p>
                    </div>

                    <div className="rounded-xl border border-gray-200 p-4">
                        <p className="text-xs text-gray-500">Challenge</p>
                        <p className="text-lg font-semibold text-black">{data.campaign_title}</p>
                    </div>

                    <div className="rounded-xl border border-gray-200 p-4">
                        <p className="text-xs text-gray-500">Type</p>
                        <p className="text-lg font-semibold text-black">
                            {data.challenge_name ?? "—"}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
