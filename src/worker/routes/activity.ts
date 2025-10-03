// src/worker/routes/activity.ts
import { Hono } from 'hono';
import { nanoid } from 'nanoid';

type ActivityType = 'donation' | 'milestone' | 'pledge' | 'progress';

export interface Activity {
    id: string;
    type: ActivityType;
    message: string;           // e.g. "Alex just donated $25"
    amount?: number;           // for donation/pledge
    userName?: string;         // "Alex"
    participantId?: string;    // tie back to /participant/:id
    campaignId?: string;       // if applicable
    createdAt: string;         // ISO8601
}

export const activity = new Hono<{ Bindings: { ACTIVITIES: KVNamespace } }>();

const KEY = (ts: string, id: string) => `activity:${ts}:${id}`;

// Write a new activity (secured — add your auth as needed)
activity.post('/wapi/activity', async (c) => {
    const body = await c.req.json<Activity>();
    const nowIso = new Date().toISOString();
    const id = body.id || nanoid();
    const rec: Activity = { ...body, id, createdAt: body.createdAt || nowIso };

    // KV: one key per item (sorted by ISO time)
    await c.env.ACTIVITIES.put(KEY(rec.createdAt, rec.id), JSON.stringify(rec), { expirationTtl: 60 * 60 * 24 * 7 }); // retain 7 days
    return c.json({ ok: true, id: rec.id });
});

// Read latest activities
activity.get('/wapi/activities', async (c) => {
    const limit = Number(new URL(c.req.url).searchParams.get('limit') || '50');
    const since = new URL(c.req.url).searchParams.get('since'); // ISO

    // List in reverse time (use prefix "activity:")
    const list = await c.env.ACTIVITIES.list({ prefix: 'activity:' });
    // KV returns unsorted; sort by key (includes ISO time) descending
    const keys = list.keys
        .sort((a, b) => (a.name > b.name ? -1 : 1))
        .slice(0, 500); // cap

    const items: Activity[] = [];
    for (const k of keys) {
        // early break if we already have enough
        if (items.length >= limit) break;
        const val = await c.env.ACTIVITIES.get(k.name);
        if (!val) continue;
        const rec: Activity = JSON.parse(val);
        if (since && rec.createdAt <= since) continue;
        items.push(rec);
    }

    // HTTP caching hints for polling
    c.header('Cache-Control', 'no-store');
    return c.json({ ok: true, items });
});

// (Optional later) SSE endpoint
// activity.get('/wapi/activities/stream', async (c) => { /* …Durable Object or periodic flush… */ });

export default activity;
