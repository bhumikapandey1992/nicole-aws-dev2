// src/react-app/lib/activity.ts
export type ActivityType = 'donation' | 'milestone' | 'pledge' | 'progress';

export interface Activity {
    id: string;
    type: ActivityType;
    message: string;
    amount?: number;
    userName?: string;
    participantId?: string;
    campaignId?: string;
    createdAt: string; // ISO
}

export async function fetchActivities(opts?: { since?: string; limit?: number }) {
    const params = new URLSearchParams();
    if (opts?.since) params.set('since', opts.since);
    if (opts?.limit) params.set('limit', String(opts.limit));
    const res = await fetch(`/wapi/activities?${params.toString()}`, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) throw new Error('Failed to load activities');
    const data = await res.json();
    return data.items as Activity[];
}
