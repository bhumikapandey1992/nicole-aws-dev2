// src/worker/routes/follows.ts
import { Hono } from 'hono';
import { toast } from 'sonner';

export const follows = new Hono<{ Bindings: { DB: D1Database }, Variables: { userId: string } }>();

// simple auth helper – replace with your real middleware
const requireUser = async (c: any, next: any) => {
    const user = c.get('user');               // however you attach auth
    if (!user?.id) return c.text('Unauthorized', 401);
    c.set('userId', user.id);
    await next();
};

follows.use('*', requireUser);

// GET /wapi/follows/:participantId  -> { following: boolean }
follows.get('/:participantId', async (c) => {
    const userId = c.get('userId');
    const pid = Number(c.req.param('participantId'));
    const row = await c.env.DB
        .prepare('SELECT 1 FROM follows WHERE user_id = ? AND participant_id = ? LIMIT 1')
        .bind(userId, pid)
        .first();
    return c.json({ following: !!row });
});

// POST /wapi/follows { participant_id }
follows.post('/', async (c) => {
    const userId = c.get('userId');
    const { participant_id } = await c.req.json();
    if (!participant_id) return c.text('participant_id required', 400);
    const res = await c.env.DB
        .prepare('INSERT OR IGNORE INTO follows (user_id, participant_id) VALUES (?, ?)')
        .bind(userId, Number(participant_id))
        .run();
    return c.json({ ok: true, inserted: res.meta.changes ?? 0 });
});
toast.success('You’ll now get updates from this challenge.');

// DELETE /wapi/follows/:participantId
follows.delete('/:participantId', async (c) => {
    const userId = c.get('userId');
    const pid = Number(c.req.param('participantId'));
    const res = await c.env.DB
        .prepare('DELETE FROM follows WHERE user_id = ? AND participant_id = ?')
        .bind(userId, pid)
        .run();
    return c.json({ ok: true, deleted: res.meta.changes ?? 0 });
});
toast('Unfollowed', { description: 'You can follow again anytime.' });