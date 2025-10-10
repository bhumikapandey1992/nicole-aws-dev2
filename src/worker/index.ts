// src/worker/index.ts
/* eslint-disable @typescript-eslint/no-explicit-any */

import { Hono } from "hono";
import type { Context, Next } from "hono";
import type { MochaUser } from "@getmocha/users-service/shared";
import { cors } from "hono/cors";
import { zValidator } from "@hono/zod-validator";
import {
  exchangeCodeForSessionToken,
  getOAuthRedirectUrl,
  authMiddleware as realAuthMiddleware,
  deleteSession,
  MOCHA_SESSION_TOKEN_COOKIE_NAME,
} from "@getmocha/users-service/backend";
import { getCookie } from "hono/cookie";
import z from "zod";

// ---- Local shared types (adjust paths if yours differ) ----------------------
import {
  CreateParticipantSchema,
  LogProgressSchema,
  CreatePostSchema,
  CreateCustomChallengeTypeSchema,
} from "../shared/types";

// ---- Minimal Env/D1 types so TS always compiles -----------------------------
type D1Database = any;
type Env = {
  DB: D1Database;

  BUILD_ID?: string;

  // Users-service
  MOCHA_USERS_SERVICE_API_URL?: string;
  MOCHA_USERS_SERVICE_API_KEY?: string;

  // Dev-auth
  DEV_AUTH?: string;
  DEV_USER_EMAIL?: string;
  DEV_USER_NAME?: string;
  DEV_USER_ID?: string;

  // Email (SES)
  AWS_SES_REGION?: string;
  AWS_ACCESS_KEY_ID?: string;
  AWS_SECRET_ACCESS_KEY?: string;
  SENDER_FROM?: string;

  // Internal call auth for cron endpoints
  NOTIFICATION_API_KEY?: string;

  // KV for recent activity feed
  ACTIVITIES?: KVNamespace;
};

// ─────────────────────────────────────────────────────────────────────────────
// Small utils
// ─────────────────────────────────────────────────────────────────────────────

const isDevAuth = (env: Env) => {
  const v = (env as any).DEV_AUTH;
  if (typeof v === "string") {
    const s = v.toLowerCase().trim();
    return s === "true" || s === "1";
  }
  return !!v;
};

function isSchemaMissing(err: unknown) {
  return err instanceof Error && /no such table|no such column/i.test(err.message);
}

function emptyList(
    c: Context<{ Bindings: Env }>,
    reason: string = "empty",
): Response {
  c.header("X-Empty-Reason", reason);
  return c.json([] as unknown[], 200);
}

// Dev-auth wrapper: seeds a fake user when DEV_AUTH=true
const authMiddleware = async (
    c: Context<{ Bindings: Env }>,
    next: Next,
) => {
  if (isDevAuth(c.env)) {
    const now = new Date().toISOString();
    const devUser: MochaUser = {
      id: c.env.DEV_USER_ID || "1",
      email: c.env.DEV_USER_EMAIL || "dev@example.com",
      google_sub: "dev-sub",
      google_user_data: {
        email: c.env.DEV_USER_EMAIL || "dev@example.com",
        email_verified: true,
        family_name: null,
        given_name:
            (c.env.DEV_USER_NAME || "Dev User").split(" ").slice(-1)[0] || null,
        hd: null,
        name: c.env.DEV_USER_NAME || "Dev User",
        picture: null,
        sub: "dev-sub",
      },
      last_signed_in_at: now,
      created_at: now,
      updated_at: now,
    };
    c.set("user", devUser);
    return next();
  }
  return realAuthMiddleware(c, next);
};

const app = new Hono<{ Bindings: Env }>();

// Global friendly fallback for "schema missing" errors
app.onError((err, c) => {
  console.error(err);

  if (isSchemaMissing(err)) {
    const path = new URL(c.req.url).pathname;

    if (
        path.startsWith("/wapi/campaigns") ||
        path.startsWith("/api/campaigns") ||
        path.startsWith("/wapi/browse-campaigns") ||
        path.startsWith("/api/browse-campaigns") ||
        path.startsWith("/wapi/challenge-categories") ||
        path.startsWith("/wapi/challenge-types") ||
        path.startsWith("/wapi/my-participants") ||
        path.startsWith("/api/my-participants") ||
        path.startsWith("/wapi/progress")
    ) {
      return emptyList(c, "schema-missing");
    }

    if (path.startsWith("/wapi/user-notification-preferences")) {
      return c.json(
          { email_challenge_reminders: false, email_donor_updates: false },
          200,
      );
    }
    if (path.startsWith("/wapi/reminder-check")) {
      return c.json({ showReminder: false }, 200);
    }

    return c.json({ ok: true, empty: true, reason: "schema-missing" }, 200);
  }

  return c.json(
      { error: "Internal error", details: (err as Error).message },
      500,
  );
});

// ─────────────────────────────────────────────────────────────────────────────
/** Priority routes / basic infra */
// ─────────────────────────────────────────────────────────────────────────────

app.use(
    "*",
    cors({
      origin: "*",
      allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization"],
    }),
);

app.get("/health", (c) => {
  const build = c.env.BUILD_ID ?? "dev";
  const today = new Date().toISOString().slice(0, 10);
  return new Response(`alive build=${build} date=${today}`, {
    headers: { "content-type": "text/plain" },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
/** Auth routes (Option A short-circuit) */
// ─────────────────────────────────────────────────────────────────────────────

app.get("/wapi/oauth/google/redirect_url", async (c) => {
  try {
    if (isDevAuth(c.env)) return c.json({ redirectUrl: "/dev-login" }, 200);

    const stateParam = c.req.query("state");
    if (
        !c.env.MOCHA_USERS_SERVICE_API_URL ||
        !c.env.MOCHA_USERS_SERVICE_API_KEY
    ) {
      // Fallback to dev login when not configured, to avoid blocking local/staging
      return c.json(
          { redirectUrl: "/dev-login", debugInfo: "MISSING_AUTH_CONFIG_DEV_REDIRECT" },
          200,
      );
    }

    const redirectUrl = await getOAuthRedirectUrl("google", {
      apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
      apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
    });
    if (!redirectUrl) return c.json({ error: "Failed to generate login URL" }, 500);

    const url = new URL(redirectUrl);
    if (stateParam) url.searchParams.set("state", stateParam);
    return c.json({ redirectUrl: url.toString() }, 200);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return c.json({ error: `Failed to initiate login process: ${msg}` }, 500);
  }
});

app.post("/wapi/sessions", async (c) => {
  try {
    if (isDevAuth(c.env)) {
      const token = "dev-session-token";
      const isSecure = c.req.url.startsWith("https://");
      c.header(
          "Set-Cookie",
          `${MOCHA_SESSION_TOKEN_COOKIE_NAME}=${token}; Path=/; HttpOnly; ${isSecure ? "Secure; " : ""}SameSite=Lax; Max-Age=${60 * 24 * 60 * 60}`,
      );
      return c.json({ success: true, debugInfo: "DEV_AUTH_BYPASS" }, 200);
    }

    const body = (await c.req.json().catch(() => ({}))) as { code?: string };
    if (!body.code?.trim())
      return c.json(
          { error: "No authorization code provided", debugInfo: "CALLBACK_NO_CODE" },
          400,
      );

    if (
        !c.env.MOCHA_USERS_SERVICE_API_URL ||
        !c.env.MOCHA_USERS_SERVICE_API_KEY
    ) {
      return c.json(
          { error: "Authentication service configuration error", debugInfo: "CALLBACK_MISSING_ENV" },
          500,
      );
    }

    let sessionToken: string | null = null;
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        sessionToken = await exchangeCodeForSessionToken(body.code.trim(), {
          apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
          apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
        });
        if (sessionToken) break;
      } catch (e) {
        lastError = e;
        if (attempt < 3) await new Promise((r) => setTimeout(r, 1000));
      }
    }

    if (!sessionToken) {
      return c.json(
          {
            error:
                "Failed to create session token - authentication service may be temporarily unavailable",
            debugInfo: "TOKEN_EXCHANGE_EMPTY_RESPONSE",
            lastError: lastError instanceof Error ? lastError.message : String(lastError),
          },
          500,
      );
    }

    const isSecure = c.req.url.startsWith("https://");
    c.header(
        "Set-Cookie",
        `${MOCHA_SESSION_TOKEN_COOKIE_NAME}=${sessionToken}; Path=/; HttpOnly; ${isSecure ? "Secure; " : ""}SameSite=Lax; Max-Age=${60 * 24 * 60 * 60}`,
    );

    return c.json({ success: true }, 200);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return c.json(
        { error: `Authentication failed. ${msg}`, debugInfo: "CALLBACK_UNEXPECTED_ERROR" },
        500,
    );
  }
});

// Dev login page that immediately POSTs to /wapi/sessions and bounces to /dashboard
app.get("/dev-login", (c) => {
  if (!isDevAuth(c.env)) return c.text("DEV_AUTH is disabled", 403);
  const html = `<!doctype html><meta charset="utf-8" /><title>Dev Login</title>
  <body style="font-family:system-ui;padding:24px;">
  <h1>Signing you in (dev)…</h1>
  <script>
  (async () => {
    try {
      const res = await fetch('/wapi/sessions', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to create dev session');
      location.replace('/dashboard');
    } catch (e) {
      document.body.innerHTML = '<h1>Dev Login Failed</h1><pre>' + (e && e.message || e) + '</pre>';
    }
  })();
  </script></body>`;
  return new Response(html, { headers: { "content-type": "text/html" } });
});

// Current user
app.get("/wapi/users/me", authMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ authenticated: false, error: "Not authenticated" }, 401);
  return c.json({ ...user, authenticated: true });
});

// Alias for AuthProvider defaults
app.get("/api/users/me", authMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ authenticated: false, error: "Not authenticated" }, 401);
  return c.json({ ...user, authenticated: true });
});

// Logout
app.get("/wapi/logout", async (c) => {
  const sessionToken = getCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME);
  if (typeof sessionToken === "string") {
    try {
      if (c.env.MOCHA_USERS_SERVICE_API_KEY) {
        await deleteSession(sessionToken, {
          apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
          apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
        });
      }
    } catch (e) {
      console.warn("Failed to delete session on server:", e);
    }
  }
  c.header(
      "Set-Cookie",
      `${MOCHA_SESSION_TOKEN_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
  );
  return c.json({ success: true }, 200);
});

// ─────────────────────────────────────────────────────────────────────────────
/** Catalog endpoints used by UI */
// ─────────────────────────────────────────────────────────────────────────────

app.get("/wapi/challenge-categories", async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT cc.*, COUNT(ct.id) as challenge_count
      FROM challenge_categories cc
             LEFT JOIN challenge_types ct ON cc.id = ct.category_id
      GROUP BY cc.id
      ORDER BY cc.name
    `).all();

    c.header("Cache-Control", "public, max-age=300");
    return c.json(results);
  } catch (error) {
    console.error("Error fetching challenge categories:", error);
    if (isSchemaMissing(error)) return emptyList(c, "db-not-initialized");
    return emptyList(c, "query-failed");
  }
});

app.get("/wapi/challenge-types/:categoryId", async (c) => {
  const categoryId = c.req.param("categoryId");
  if (!categoryId || isNaN(Number(categoryId)))
    return c.json({ error: "Invalid category ID" }, 400);

  try {
    const { results } = await c.env.DB.prepare(
        `SELECT * FROM challenge_types WHERE category_id = ? ORDER BY is_custom ASC, name ASC`,
    )
        .bind(categoryId)
        .all();

    c.header("Cache-Control", "public, max-age=300");
    return c.json(results);
  } catch (error) {
    console.error("Error fetching challenge types:", error);
    if (isSchemaMissing(error)) return emptyList(c, "db-not-initialized");
    return emptyList(c, "query-failed");
  }
});

app.post(
    "/wapi/challenge-types",
    authMiddleware,
    zValidator("json", CreateCustomChallengeTypeSchema),
    async (c) => {
      const user = c.get("user");
      const { category_id, name, unit, suggested_min, suggested_max } =
          c.req.valid("json");

      const { success, meta } = await c.env.DB.prepare(
          `INSERT INTO challenge_types (category_id, name, unit, suggested_min, suggested_max, is_custom, created_by_user_id)
           VALUES (?, ?, ?, ?, ?, true, ?)`,
      )
          .bind(
              category_id,
              name,
              unit,
              suggested_min || null,
              suggested_max || null,
              user!.id,
          )
          .run();

      if (success) {
        const newRow = await c.env.DB.prepare(
            `SELECT * FROM challenge_types WHERE id = ?`,
        )
            .bind(meta.last_row_id)
            .first();
        return c.json(newRow, 201);
      }
      return c.json({ error: "Failed to create custom challenge type" }, 500);
    },
);

// Campaigns (summary for cards)
app.get("/wapi/campaigns", async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT c.*,
             COUNT(DISTINCT p.id) as participant_count,
             COALESCE(SUM(pl.amount_per_unit * p.current_progress), 0) as total_raised
      FROM campaigns c
             LEFT JOIN participants p ON c.id = p.campaign_id AND p.is_active = 1
             LEFT JOIN donors d ON p.id = d.participant_id
             LEFT JOIN pledges pl ON d.id = pl.donor_id
      WHERE c.status = 'active'
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `).all();

    c.header("Cache-Control", "public, max-age=60");
    return c.json(results);
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    if (isSchemaMissing(error)) return emptyList(c, "db-not-initialized");
    return emptyList(c, "query-failed");
  }
});

// Browse cards for public list
app.get("/wapi/browse-campaigns", async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT p.id,
             c.title as campaign_title,
             COALESCE(p.custom_challenge_name, ct.name) as challenge_name,
             COALESCE(p.custom_unit, ct.unit) as unit,
             p.goal_amount,
             p.current_progress,
             p.bio,
             CASE WHEN p.participant_name IS NOT NULL AND p.participant_name != '' 
                  THEN p.participant_name
                  ELSE 'Challenger #' || p.id END as participant_name,
             p.created_at,
             COUNT(DISTINCT d.id) as donor_count,
             COALESCE(SUM(
                          CASE
                            WHEN pl.pledge_type = 'flat_rate' THEN COALESCE(pl.flat_amount, 0)
                            WHEN pl.pledge_type = 'per_unit_capped' THEN
                              MIN(COALESCE(pl.amount_per_unit,0) * COALESCE(p.current_progress,0), COALESCE(pl.max_total_amount,0))
                            ELSE COALESCE(pl.amount_per_unit,0) * COALESCE(p.current_progress,0)
                            END
                      ), 0) as total_raised
      FROM participants p
             JOIN campaigns c ON p.campaign_id = c.id
             JOIN challenge_types ct ON p.challenge_type_id = ct.id
             LEFT JOIN donors d ON p.id = d.participant_id
             LEFT JOIN pledges pl ON d.id = pl.donor_id
      WHERE p.is_active = 1 AND c.status = 'active'
      GROUP BY p.id, c.id, ct.id
      ORDER BY p.created_at DESC
    `).all();

    c.header("Cache-Control", "public, max-age=60");
    return c.json(results);
  } catch (error) {
    console.error("Error fetching browse campaigns:", error);
    if (isSchemaMissing(error)) return emptyList(c, "db-not-initialized");
    return emptyList(c, "query-failed");
  }
});

// Spotlight (feature one participant with an optional banner image)
app.get("/wapi/spotlight", async (c) => {
  try {
    // Pick featured first, otherwise most recently updated active participant
    const spotlight = await c.env.DB.prepare(`
      WITH chosen AS (
        SELECT p.*
        FROM participants p
        WHERE p.is_active = 1
        ORDER BY p.is_featured DESC, p.updated_at DESC, p.created_at DESC
        LIMIT 1
        )
      SELECT
        ch.id,
        COALESCE(ch.participant_name, 'User') AS participant_name,
        COALESCE(ch.custom_challenge_name, ct.name) AS challenge_name,
        COALESCE(ch.custom_unit, ct.unit) AS unit,
        ch.current_progress,
        ch.goal_amount,
        ch.updated_at,
        c.title AS campaign_title,
        (
          SELECT pi.id FROM participant_images pi
          WHERE pi.participant_id = ch.id
          ORDER BY pi.created_at DESC, pi.id DESC
          LIMIT 1
        ) AS image_id
      FROM chosen ch
        JOIN challenge_types ct ON ch.challenge_type_id = ct.id
        JOIN campaigns c ON ch.campaign_id = c.id
    `).first();

    if (!spotlight) {
      return c.json({ empty: true });
    }

    const image_url = spotlight.image_id ? `/wapi/images/${spotlight.image_id}` : null;

    const progress = Number(spotlight.current_progress || 0);
    const goal = Number(spotlight.goal_amount || 0);
    const pct = goal > 0 ? Math.min(100, Math.round((progress / goal) * 100)) : 0;

    c.header("Cache-Control", "public, max-age=30");
    return c.json({
      id: spotlight.id,
      participant_name: spotlight.participant_name,
      campaign_title: spotlight.campaign_title,
      challenge_name: spotlight.challenge_name,
      unit: spotlight.unit,
      current_progress: progress,
      goal_amount: goal,
      progress_pct: pct,
      image_url,
    });
  } catch (e) {
    console.error("spotlight error", e);
    return c.json({ error: "Failed to load spotlight" }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
/** Activity feed (KV-backed) */
// ─────────────────────────────────────────────────────────────────────────────

type ActivityType = "donation" | "milestone" | "pledge" | "progress";
type Activity = {
  id: string;
  type: ActivityType;
  message: string;
  amount?: number;
  userName?: string;
  participantId?: string; // keep as string for client filter
  campaignId?: string;
  createdAt: string; // ISO
};

const activityKey = (ts: string, id: string) => `activity:${ts}:${id}`;

async function putActivity(
    env: Env,
    a: Omit<Activity, "id" | "createdAt"> &
        Partial<Pick<Activity, "id" | "createdAt">>,
) {
  if (!env.ACTIVITIES) return; // graceful no-op if KV not bound
  const createdAt =
      a.createdAt ?? new Date().toISOString();
  const id =
      a.id ??
      (globalThis.crypto?.randomUUID?.() ??
          `${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const rec: Activity = { ...a, id, createdAt } as Activity;
  await env.ACTIVITIES.put(activityKey(createdAt, id), JSON.stringify(rec), {
    expirationTtl: 60 * 60 * 24 * 7, // 7 days
  });
}

// Public: write activity (can be secured later)
app.post("/wapi/activity", async (c) => {
  try {
    const body = (await c.req.json()) as Partial<Activity>;
    if (!body?.type || !body?.message)
      return c.json({ error: "type and message required" }, 400);

    await putActivity(c.env, {
      type: body.type as ActivityType,
      message: body.message,
      amount: body.amount,
      userName: body.userName,
      participantId: body.participantId,
      campaignId: body.campaignId,
      id: body.id,
      createdAt: body.createdAt,
    });

    c.header("Cache-Control", "no-store");
    return c.json({ ok: true });
  } catch (e) {
    console.error("activity post error", e);
    return c.json({ error: "Failed to write activity" }, 500);
  }
});

// Public: read activities (near real-time polling)
app.get("/wapi/activities", async (c) => {
  try {
    const limit = Number(c.req.query("limit") ?? "50");
    const since = c.req.query("since"); // ISO string
    const list =
        (await c.env.ACTIVITIES?.list({ prefix: "activity:" })) ??
        { keys: [] as { name: string }[] };

    // Sort by key desc (ISO timestamp in key)
    const keys = list.keys
        .sort((a, b) => (a.name > b.name ? -1 : 1))
        .slice(0, 500);

    const items: Activity[] = [];
    for (const k of keys) {
      if (items.length >= limit) break;
      const raw = await c.env.ACTIVITIES!.get(k.name);
      if (!raw) continue;
      const rec = JSON.parse(raw) as Activity;
      if (since && rec.createdAt <= since) continue;
      items.push(rec);
    }
    c.header("Cache-Control", "no-store");
    return c.json({ ok: true, items });
  } catch (e) {
    console.error("activities list error", e);
    return c.json({ ok: true, items: [] });
  }
});
// --- Activity stats (pulse) --------------------------------------------------
// GET /wapi/activity-stats?window=24h   (supports: 1h | 24h | 7d ; default 24h)
app.get("/wapi/activity-stats", async (c) => {
  try {
    const win = (c.req.query("window") || "24h").toLowerCase();
    const ms =
        win === "1h" ? 1 * 60 * 60 * 1000 :
            win === "7d" ? 7 * 24 * 60 * 60 * 1000 :
                24 * 60 * 60 * 1000; // default 24h

    const since = new Date(Date.now() - ms).toISOString();

    const list =
        (await c.env.ACTIVITIES?.list({ prefix: "activity:" })) ??
        { keys: [] as { name: string }[] };

    let pledges = 0;
    let donations = 0;
    let progressUnits = 0; // parsed from message if available
    let raisedCents = 0;

    // simple sparkline: 12 buckets of event counts
    const buckets = 12;
    const bucketMs = ms / buckets;
    const spark = Array.from({ length: buckets }, () => 0);

    for (const k of list.keys) {
      const raw = await c.env.ACTIVITIES!.get(k.name);
      if (!raw) continue;

      const rec = JSON.parse(raw) as {
        type: "donation" | "milestone" | "pledge" | "progress";
        amount?: number;
        message?: string;
        createdAt: string;
      };

      if (!rec.createdAt || rec.createdAt < since) continue;

      switch (rec.type) {
        case "pledge":
          pledges += 1;
          break;
        case "donation":
          donations += 1;
          if (typeof rec.amount === "number") {
            raisedCents += Math.round(rec.amount * 100);
          }
          break;
        case "progress": {
          // Your progress activity message looks like:
          // "Completed {units_completed} {unit} on {date}"
          // We'll try to parse the first number for a units sum.
          const m = rec.message?.match(/(\d+(?:\.\d+)?)/);
          if (m) progressUnits += Number(m[1]) || 0;
          break;
        }
      }

      // bump sparkline bucket by time
      const t = new Date(rec.createdAt).getTime();
      const start = Date.now() - ms;
      const idx = Math.max(0, Math.min(buckets - 1, Math.floor((t - start) / bucketMs)));
      spark[idx] += 1;
    }

    return c.json({
      window: win,
      pledges,
      donations,
      progress_units: progressUnits,
      raised: raisedCents / 100, // dollars
      spark,                      // counts per bucket
    });
  } catch (e) {
    console.error("activity-stats error", e);
    return c.json({ window: "24h", pledges: 0, donations: 0, progress_units: 0, raised: 0, spark: [] }, 200);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
/** User-owned resources used by UI */
// ─────────────────────────────────────────────────────────────────────────────

app.get("/wapi/my-participants", authMiddleware, async (c) => {
  const user = c.get("user");
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT p.*, 
             COALESCE(p.custom_challenge_name, ct.name) as challenge_name, 
             COALESCE(p.custom_unit, ct.unit) as unit, 
             c.title as campaign_title
      FROM participants p
      JOIN challenge_types ct ON p.challenge_type_id = ct.id
      JOIN campaigns c ON p.campaign_id = c.id
      WHERE p.user_id = ? AND p.is_active = 1
      ORDER BY p.created_at DESC
    `)
        .bind(user!.id)
        .all();

    return c.json(results);
  } catch (error) {
    console.error("Error fetching user participants:", error);
    if (isSchemaMissing(error)) return emptyList(c, "db-not-initialized");
    return emptyList(c, "query-failed");
  }
});

// Preferences (get/update) + reminder banner check + dismiss
const UpdateNotificationPreferencesSchema = z.object({
  email_challenge_reminders: z.boolean().optional(),
  email_donor_updates: z.boolean().optional(),
});

app.get(
    "/wapi/user-notification-preferences",
    authMiddleware,
    async (c) => {
      const user = c.get("user");
      let preferences = await c.env.DB.prepare(
          `SELECT * FROM user_notification_preferences WHERE user_id = ?`,
      )
          .bind(user!.id)
          .first();

      if (!preferences) {
        const { success, meta } = await c.env.DB.prepare(
            `INSERT INTO user_notification_preferences (user_id, email_challenge_reminders, email_donor_updates)
       VALUES (?, false, false)`,
        )
            .bind(user!.id)
            .run();

        if (success) {
          preferences = await c.env.DB.prepare(
              `SELECT * FROM user_notification_preferences WHERE id = ?`,
          )
              .bind(meta.last_row_id)
              .first();
        }
      }

      return c.json(
          preferences || { email_challenge_reminders: false, email_donor_updates: false },
      );
    },
);

app.put(
    "/wapi/user-notification-preferences",
    authMiddleware,
    zValidator("json", UpdateNotificationPreferencesSchema),
    async (c) => {
      const user = c.get("user");
      const updates = c.req.valid("json");

      await c.env.DB.prepare(
          `INSERT OR IGNORE INTO user_notification_preferences (user_id, email_challenge_reminders, email_donor_updates)
       VALUES (?, false, false)`,
      )
          .bind(user!.id)
          .run();

      const setClause = Object.keys(updates)
          .map((k) => `${k} = ?`)
          .join(", ");
      const values = Object.values(updates);

      const { success } = await c.env.DB.prepare(
          `UPDATE user_notification_preferences
       SET ${setClause}, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ?`,
      )
          .bind(...values, user!.id)
          .run();

      if (success) return c.json({ success: true });
      return c.json({ error: "Failed to update preferences" }, 500);
    },
);

app.get("/wapi/reminder-check", authMiddleware, async (c) => {
  const user = c.get("user");
  try {
    const preferences = await c.env.DB.prepare(
        `SELECT last_banner_dismissed FROM user_notification_preferences WHERE user_id = ?`,
    )
        .bind(user!.id)
        .first();

    if (preferences?.last_banner_dismissed) {
      const lastDismissed = new Date(preferences.last_banner_dismissed as string);
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      if (lastDismissed > sevenDaysAgo) return c.json({ showReminder: false });
    }

    const staleParticipant = await c.env.DB.prepare(`
      SELECT p.id, COALESCE(p.custom_challenge_name, ct.name) as challenge_name
      FROM participants p
      JOIN challenge_types ct ON p.challenge_type_id = ct.id
      LEFT JOIN progress_logs pl ON p.id = pl.participant_id
      WHERE p.user_id = ? AND p.is_active = 1
      GROUP BY p.id
      HAVING MAX(pl.created_at) IS NULL OR MAX(pl.created_at) < datetime('now', '-7 days')
      ORDER BY p.created_at DESC
      LIMIT 1
    `)
        .bind(user!.id)
        .first();

    if (staleParticipant) {
      return c.json({
        showReminder: true,
        type: "participant",
        message: "Is your challenge progress up to date?",
        actionText: "Update Progress",
        actionUrl: `/participant/${staleParticipant.id}?action=progress`,
        participantId: staleParticipant.id,
      });
    }

    return c.json({ showReminder: false });
  } catch (e) {
    console.error("Error checking reminders:", e);
    return c.json({ showReminder: false });
  }
});

app.post("/wapi/dismiss-banner", authMiddleware, async (c) => {
  const user = c.get("user");
  try {
    const { success } = await c.env.DB.prepare(
        `INSERT OR REPLACE INTO user_notification_preferences 
       (user_id, email_challenge_reminders, email_donor_updates, last_banner_dismissed, updated_at)
       VALUES (
         ?, 
         COALESCE((SELECT email_challenge_reminders FROM user_notification_preferences WHERE user_id = ?), false),
         COALESCE((SELECT email_donor_updates FROM user_notification_preferences WHERE user_id = ?), false),
         CURRENT_TIMESTAMP,
         CURRENT_TIMESTAMP
       )`,
    )
        .bind(user!.id, user!.id, user!.id)
        .run();

    if (success) return c.json({ success: true });
    return c.json({ error: "Failed to dismiss banner" }, 500);
  } catch (e) {
    console.error("Dismiss banner error", e);
    return c.json({ error: "Failed to dismiss banner" }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
/** Minimal create/log endpoints used by UI */
// ─────────────────────────────────────────────────────────────────────────────

app.post(
    "/wapi/participants",
    authMiddleware,
    zValidator("json", CreateParticipantSchema),
    async (c) => {
      const user = c.get("user");
      const {
        campaign_id,
        challenge_type_id,
        goal_amount,
        custom_unit,
        custom_challenge_name,
        bio,
        participant_name,
      } = c.req.valid("json");

      if (!participant_name?.trim())
        return c.json({ error: "Participant name is required" }, 400);

      const { success, meta } = await c.env.DB.prepare(
          `INSERT INTO participants (campaign_id, user_id, challenge_type_id, goal_amount, custom_unit, custom_challenge_name, bio, participant_name)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
          .bind(
              campaign_id,
              user!.id,
              challenge_type_id,
              goal_amount,
              custom_unit || null,
              custom_challenge_name || null,
              bio || null,
              participant_name.trim(),
          )
          .run();

      if (success) return c.json({ id: meta.last_row_id, success: true }, 201);
      return c.json({ error: "Failed to create participant" }, 500);
    },
);

app.post(
    "/wapi/progress",
    authMiddleware,
    zValidator("json", LogProgressSchema),
    async (c) => {
      const user = c.get("user");
      const { participant_id, units_completed, log_date, notes, image_url } =
          c.req.valid("json");

      const participant = await c.env.DB.prepare(
          `SELECT * FROM participants WHERE id = ? AND user_id = ?`,
      )
          .bind(participant_id, user!.id)
          .first();
      if (!participant)
        return c.json({ error: "Participant not found or unauthorized" }, 404);

      try {
        const { success, meta } = await c.env.DB.prepare(
            `INSERT INTO progress_logs (participant_id, units_completed, log_date, notes)
       VALUES (?, ?, ?, ?)`,
        )
            .bind(participant_id, units_completed, log_date, notes || null)
            .run();

        if (!success) return c.json({ error: "Failed to log progress" }, 500);

        // Lightweight post
        const content =
            notes?.trim() || `Completed ${units_completed} units on ${log_date}`;
        await c.env.DB.prepare(
            `INSERT INTO participant_posts (participant_id, content, image_url, post_type)
       VALUES (?, ?, ?, 'progress_update')`,
        )
            .bind(participant_id, content, image_url || null)
            .run();

        // Update aggregate
        const total = await c.env.DB.prepare(
            `SELECT SUM(units_completed) as total FROM progress_logs WHERE participant_id = ?`,
        )
            .bind(participant_id)
            .first();
        await c.env.DB.prepare(
            `UPDATE participants SET current_progress = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        )
            .bind(total?.total || 0, participant_id)
            .run();

        // Announce to activity feed (non-blocking best-effort)
        try {
          await putActivity(c.env, {
            type: "progress",
            message: `Completed ${units_completed} ${participant.custom_unit ?? "units"} on ${log_date}`,
            participantId: String(participant_id),
          });
        } catch (e) {
          console.warn("putActivity(progress) failed", e);
        }

        return c.json(
            {
              success: true,
              progress_log_id: meta.last_row_id,
              new_total_progress: total?.total || 0,
            },
            201,
        );
      } catch (e) {
        console.error("Progress log error:", e);
        return c.json(
            { error: "Failed to log progress due to database error" },
            500,
        );
      }
    },
);

app.post(
    "/wapi/posts",
    authMiddleware,
    zValidator("json", CreatePostSchema),
    async (c) => {
      const user = c.get("user");
      const { participant_id, content, image_url, post_type } =
          c.req.valid("json");

      const participant = await c.env.DB.prepare(
          `SELECT * FROM participants WHERE id = ? AND user_id = ?`,
      )
          .bind(participant_id, user!.id)
          .first();
      if (!participant)
        return c.json({ error: "Participant not found or unauthorized" }, 404);

      const { success } = await c.env.DB.prepare(
          `INSERT INTO participant_posts (participant_id, content, image_url, post_type)
     VALUES (?, ?, ?, ?)`,
      )
          .bind(participant_id, content, image_url || null, post_type || "update")
          .run();

      if (success) return c.json({ success: true }, 201);
      return c.json({ error: "Failed to create post" }, 500);
    },
);

// ─────────────────────────────────────────────────────────────────────────────
/** Tiny debug/ping */
// ─────────────────────────────────────────────────────────────────────────────
app.get("/wapi/ping", (c) => {
  const enabled = isDevAuth(c.env);
  const email = c.env.DEV_USER_EMAIL || "dev@example.com";
  const name = c.env.DEV_USER_NAME || "Dev User";
  const id = c.env.DEV_USER_ID || "1";
  return c.json({ dev_auth: enabled, email, name, id });
});

// ─────────────────────────────────────────────────────────────────────────────
/** SPA fallback (keep as last) */
// ─────────────────────────────────────────────────────────────────────────────
app.get("*", async (c) => {
  const url = new URL(c.req.url);

  if (url.pathname.startsWith("/wapi/") || url.pathname.startsWith("/api/")) {
    return c.json({ error: "API endpoint not found" }, 404);
  }

  if (url.pathname === "/service-worker.js" || url.pathname === "/sw.js") {
    return new Response("Service worker not available", {
      status: 404,
      headers: { "content-type": "text/plain" },
    });
  }

  if (url.pathname === "/manifest.json") {
    return new Response("Manifest not available", {
      status: 404,
      headers: { "content-type": "text/plain" },
    });
  }

  // NOTE: In production you’d return your built index.html from R2/Assets.
  return new Response("SPA would be served here", {
    status: 200,
    headers: { "content-type": "text/html" },
  });
});

export default {
  fetch: (req: Request, env: Env, ctx: ExecutionContext) =>
      app.fetch(req, env, ctx),
};
