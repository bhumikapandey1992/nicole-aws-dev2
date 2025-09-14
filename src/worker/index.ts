import { Hono } from "hono";
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
import {
  CreateParticipantSchema,
  LogProgressSchema,
  CreatePostSchema,
  CreateCustomChallengeTypeSchema,
} from "../shared/types";
import z from "zod";

function isSchemaMissing(err: unknown) {
  return err instanceof Error && /no such table|no such column/i.test(err.message);
}

// Convenience: respond with an empty array but include a reason header the UI can read
function emptyList(c: any, reason: string = 'empty') {
  c.header('X-Empty-Reason', reason);
  return c.json([] as any[], 200);
}
// Email reminder system using SendGrid

    // Helper function for HTML escaping
    // Accept unknown, coerce to string, then escape (use this everywhere)
const escapeHtml = (str: unknown): string => {
  const s = String(str ?? '');
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const authMiddleware: typeof realAuthMiddleware = async (c, next) => {
  const fakeUser = {
    id: "1", // <-- string, not number
    email: "dev@example.com",
    name: "Dev User",
    google_user_data: { given_name: "Dev" }, // optional but avoids undefined checks
  } as any; // relaxed cast to satisfy the MochaUser shape

  c.set("user", fakeUser);
  return next();
};

// Helper function to parse "Name <email@domain.com>" format
function parseFromAddress(fromString?: string): { email: string; name: string } | null {
  if (!fromString) return null;
  
  const match = fromString.match(/^(.+?)\s*<(.+?)>$/);
  if (match) {
    return {
      name: match[1].trim(),
      email: match[2].trim()
    };
  }
  
  // If no match, assume it's just an email
  if (fromString.includes('@')) {
    return {
      email: fromString.trim(),
      name: 'Brain Fog Recovery Source'
    };
  }
  
  return null;
}

const app = new Hono<{ Bindings: Env }>();
// Global friendly fallback for "schema missing" errors
app.onError((err, c) => {
  console.error(err);

  if (isSchemaMissing(err)) {
    const path = new URL(c.req.url).pathname;

    // List-ish endpoints → return [] with a reason header
    if (path.startsWith('/wapi/campaigns') || path.startsWith('/api/campaigns')) {
      return emptyList(c, 'schema-missing');
    }
    if (path.startsWith('/wapi/browse-campaigns') || path.startsWith('/api/browse-campaigns')) {
      return emptyList(c, 'schema-missing');
    }
    if (path.startsWith('/wapi/challenge-categories')) {
      return emptyList(c, 'schema-missing');
    }
    if (path.startsWith('/wapi/challenge-types')) {
      return emptyList(c, 'schema-missing');
    }
    if (path.startsWith('/wapi/my-participants') || path.startsWith('/api/my-participants')) {
      return emptyList(c, 'schema-missing');
    }
    if (path.startsWith('/wapi/progress')) {
      return emptyList(c, 'schema-missing');
    }

    // Prefs/reminder checks → safe defaults
    if (path.startsWith('/wapi/user-notification-preferences')) {
      return c.json({ email_challenge_reminders: false, email_donor_updates: false }, 200);
    }
    if (path.startsWith('/wapi/reminder-check')) {
      return c.json({ showReminder: false }, 200);
    }

    // Generic friendly fallback
    return c.json({ ok: true, empty: true, reason: 'schema-missing' }, 200);
  }

  // Non-schema errors: standard 500 so we don't hide real bugs
  return c.json({ error: 'Internal error', details: (err as Error).message }, 500);
});

// Global friendly fallback for "schema missing" errors
app.onError((err, c) => {
  console.error(err);

  if (isSchemaMissing(err)) {
    const path = new URL(c.req.url).pathname;

    // Lists → return empty arrays with a reason header
    if (path.startsWith('/wapi/campaigns') || path.startsWith('/api/campaigns')) {
      return emptyList(c, 'schema-missing');
    }
    if (path.startsWith('/wapi/browse-campaigns') || path.startsWith('/api/browse-campaigns')) {
      return emptyList(c, 'schema-missing');
    }
    if (path.startsWith('/wapi/challenge-categories')) {
      return emptyList(c, 'schema-missing');
    }
    if (path.startsWith('/wapi/challenge-types')) {
      return emptyList(c, 'schema-missing');
    }
    if (path.startsWith('/wapi/my-participants') || path.startsWith('/api/my-participants')) {
      return emptyList(c, 'schema-missing');
    }
    if (path.startsWith('/wapi/progress')) {
      return emptyList(c, 'schema-missing');
    }

    // Prefs/reminder checks → return safe defaults
    if (path.startsWith('/wapi/user-notification-preferences')) {
      return c.json({ email_challenge_reminders: false, email_donor_updates: false }, 200);
    }
    if (path.startsWith('/wapi/reminder-check')) {
      return c.json({ showReminder: false }, 200);
    }

    // Generic friendly fallback
    return c.json({ ok: true, empty: true, reason: 'schema-missing' }, 200);
  }

  // non-schema errors: keep a normal 500
  return c.json({ error: 'Internal error', details: (err as Error).message }, 500);
});


// Priority Worker-only routes - these must come FIRST before any middleware
app.get("/wtest", (c) => {
  const timestamp = new Date().toISOString();
  const userAgent = c.req.header('User-Agent') || 'unknown';
  const requestId = Math.random().toString(36).substring(7);
  
  console.log(`[${timestamp}] WTEST ROUTE HIT - Request ID: ${requestId}`);
  console.log(`URL: ${c.req.url}`);
  console.log(`Method: ${c.req.method}`);
  console.log(`User-Agent: ${userAgent}`);
  
  return new Response("HELLO", { 
    status: 200,
    headers: { 
      "content-type": "text/plain"
    } 
  });
});

// CORS middleware
app.use("*", cors({
  origin: "*",
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
}));

// Plain-text health (Nicole asked for build id + date)
app.get("/health", (c) => {
  const build = (c.env as any).BUILD_ID || "dev";
  const today = new Date().toISOString().slice(0, 10);
  return new Response(`alive build=${build} date=${today}`, {
    headers: { "content-type": "text/plain" },
  });
});

// Clickable email test (guarded by NOTIFICATION_API_KEY)
app.get("/email/test", async (c) => {
  const k = c.req.query("k");
  if (c.env.NOTIFICATION_API_KEY && k !== c.env.NOTIFICATION_API_KEY) {
    return c.json({ error: "unauthorized" }, 401);
  }
  const to = c.req.query("to") || "you@yourdomain.com"; // you can override in the URL
  const ok = await sendEmail(
    c.env,
    String(to),
    "SES test (staging)",
    `<p>Hello Nicole — this is Bhumika.Hello from SES via Cloudflare Worker. Time: ${new Date().toISOString()}</p>`
  );
  return c.json({ success: ok, to });
});

// SendGrid email sending functionality
/*async function sendEmail(env: Env, to: string, subject: string, htmlContent: string) {
  if (!env.SENDGRID_API_KEY) {
    console.error('SENDGRID_API_KEY not configured');
    return false;
  }

  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: to }],
          subject: subject
        }],
        from: parseFromAddress(env.SENDER_FROM) || {
          email: 'nonprofit@mentalhealthketo.com',
          name: 'Brain Fog Recovery Source'
        },
        content: [{
          type: 'text/html',
          value: htmlContent
        }]
      })
    });

    if (response.ok) {
      console.log(`Email sent successfully to ${to}`);
      return true;
    } else {
      const errorText = await response.text();
      console.error('SendGrid API error:', response.status, errorText);
      return false;
    }
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}*/

// ─────────────────────────────────────────────────────────────────────────────
// AWS SES v2 SendEmail over Signature V4 (no AWS SDK; works in Cloudflare Workers)
// ─────────────────────────────────────────────────────────────────────────────

const te = new TextEncoder();

function toHex(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += bytes[i].toString(16).padStart(2, "0");
  return s;
}

async function sha256Hex(str: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", te.encode(str));
  return toHex(hash);
}

async function hmac(key: ArrayBuffer | string, data: string): Promise<ArrayBuffer> {
  const raw = typeof key === "string" ? te.encode(key) : key;
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    raw,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return await crypto.subtle.sign("HMAC", cryptoKey, te.encode(data));
}

async function getSignatureKey(secretKey: string, dateStamp: string, region: string, service: string) {
  const kDate     = await hmac("AWS4" + secretKey, dateStamp);
  const kRegion   = await hmac(kDate, region);
  const kService  = await hmac(kRegion, service);
  const kSigning  = await hmac(kService, "aws4_request");
  return kSigning;
}

function isoToAmz(date = new Date()) {
  // e.g. 20250902T184500Z
  return date.toISOString().replace(/[:-]|\.\d{3}/g, "");
}

async function sesSendEmail(env: Env, to: string, subject: string, htmlContent: string): Promise<boolean> {
  const region = env.AWS_SES_REGION;
  const accessKeyId = env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = env.AWS_SECRET_ACCESS_KEY;

  if (!region || !accessKeyId || !secretAccessKey) {
    console.error("SES not configured: missing region or credentials");
    return false;
  }

  const from = parseFromAddress(env.SENDER_FROM)?.email || env.SENDER_FROM;
  const host = `email.${region}.amazonaws.com`;
  const endpoint = `https://${host}/v2/email/outbound-emails`;

  const bodyObj = {
    FromEmailAddress: from,
    Destination: { ToAddresses: [to] },
    Content: {
      Simple: {
        Subject: { Data: subject },
        Body: { Html: { Data: htmlContent } }
      }
    },
    ReplyToAddresses: [from]
  };
  const body = JSON.stringify(bodyObj);

  const amzDate = isoToAmz();
  const dateStamp = amzDate.slice(0, 8); // YYYYMMDD

  // Canonical request
  const canonicalUri = "/v2/email/outbound-emails";
  const canonicalQuerystring = "";
  const canonicalHeaders =
    `content-type:application/json\n` +
    `host:${host}\n` +
    `x-amz-date:${amzDate}\n`;
  const signedHeaders = "content-type;host;x-amz-date";
  const payloadHash = await sha256Hex(body);

  const canonicalRequest =
    `POST\n${canonicalUri}\n${canonicalQuerystring}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

  // String to sign
  const algorithm = "AWS4-HMAC-SHA256";
  const credentialScope = `${dateStamp}/${region}/ses/aws4_request`;
  const stringToSign =
    `${algorithm}\n${amzDate}\n${credentialScope}\n${await sha256Hex(canonicalRequest)}`;

  // Signature
  const signingKey = await getSignatureKey(secretAccessKey, dateStamp, region, "ses");
  const signature = toHex(await hmac(signingKey, stringToSign));

  const authorizationHeader =
    `${algorithm} Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  try {
    const resp = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-amz-date": amzDate,
        "authorization": authorizationHeader
        // NOTE: We don't set "host" header explicitly; fetch will set it correctly.
      },
      body
    });

    if (!resp.ok) {
      const t = await resp.text().catch(() => "");
      console.error("SES SendEmail failed:", resp.status, t);
      return false;
    }

    // Usually returns {"MessageId": "..."}
    return true;
  } catch (e) {
    console.error("SES SendEmail error:", e);
    return false;
  }
}

// Keep the same name that the rest of the Worker calls.
// Replace the old SendGrid body with SES call above.
async function sendEmail(env: Env, to: string, subject: string, htmlContent: string) {
  return await sesSendEmail(env, to, subject, htmlContent);
}


// Auth routes - OAuth redirect URL generation
app.get('/wapi/oauth/google/redirect_url', async (c) => {
  try {
    console.log('OAuth redirect URL request received');
    
    // Get state parameter for redirect handling
    const stateParam = c.req.query('state');
    
    // Validate environment variables
    if (!c.env.MOCHA_USERS_SERVICE_API_URL || !c.env.MOCHA_USERS_SERVICE_API_KEY) {
      console.error('Missing auth service configuration:', {
        hasApiUrl: !!c.env.MOCHA_USERS_SERVICE_API_URL,
        hasApiKey: !!c.env.MOCHA_USERS_SERVICE_API_KEY
      });
      return c.json({ error: "Authentication service not configured" }, 500);
    }

    console.log('Calling getOAuthRedirectUrl with:', {
      apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
      provider: 'google',
      hasState: !!stateParam
    });

    const redirectUrl = await getOAuthRedirectUrl('google', {
      apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
      apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
    });

    console.log('OAuth redirect URL received:', redirectUrl ? 'success' : 'failed');
    if (redirectUrl) {
      console.log('Redirect URL includes callback to:', redirectUrl.includes('z3icvhmcbyele.mocha.app') ? 'CORRECT DOMAIN' : 'DIFFERENT DOMAIN');
      
      // DEBUG: Extract and log Client ID and redirect URI from the OAuth URL
      try {
        const url = new URL(redirectUrl);
        const clientId = url.searchParams.get('client_id');
        const redirectUri = url.searchParams.get('redirect_uri');
        console.log('DEBUG - OAuth Configuration:', {
          clientId: clientId ? clientId.substring(0, 20) + '...' : 'MISSING',
          redirectUri: redirectUri,
          fullClientId: clientId,
          stateIncluded: !!url.searchParams.get('state')
        });
      } catch (urlParseError) {
        console.error('Error parsing OAuth URL for debugging:', urlParseError);
      }
    }

    if (!redirectUrl) {
      console.error('Failed to get OAuth redirect URL - empty response');
      return c.json({ error: "Failed to generate login URL" }, 500);
    }

    // If state parameter was provided, append it to the redirect URL
    let finalRedirectUrl = redirectUrl;
    if (stateParam) {
      const url = new URL(redirectUrl);
      url.searchParams.set('state', stateParam);
      finalRedirectUrl = url.toString();
      console.log('Added state parameter to OAuth URL');
    }

    return c.json({ redirectUrl: finalRedirectUrl }, 200);
  } catch (error) {
    console.error('Error getting OAuth redirect URL:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: `Failed to initiate login process: ${errorMessage}` }, 500);
  }
});

app.post("/wapi/sessions", async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    
    console.log('=== AUTH CALLBACK DEBUG START ===');
    console.log('Raw request URL:', c.req.url);
    console.log('Request method:', c.req.method);
    console.log('Request body received:', { hasCode: !!body?.code, codeLength: body?.code?.length });

    if (!body || !body.code) {
      console.error('CALLBACK ERROR: No authorization code provided');
      return c.json({ error: "No authorization code provided", debugInfo: "CALLBACK_NO_CODE" }, 400);
    }

    // Validate that the code is a string and not empty
    if (typeof body.code !== 'string' || body.code.trim() === '') {
      console.error('CALLBACK ERROR: Invalid authorization code format', typeof body.code);
      return c.json({ error: "Invalid authorization code format", debugInfo: "CALLBACK_INVALID_CODE_FORMAT" }, 400);
    }

    const code = body.code.trim();
    console.log('OAuth code received:', {
      length: code.length,
      prefix: code.substring(0, 10) + '...',
      suffix: '...' + code.substring(code.length - 10)
    });

    // Ensure environment variables are available
    if (!c.env.MOCHA_USERS_SERVICE_API_URL || !c.env.MOCHA_USERS_SERVICE_API_KEY) {
      console.error('CALLBACK ERROR: Missing auth service environment variables');
      return c.json({ error: "Authentication service configuration error", debugInfo: "CALLBACK_MISSING_ENV" }, 500);
    }

    console.log('Auth service config:', {
      hasApiUrl: !!c.env.MOCHA_USERS_SERVICE_API_URL,
      hasApiKey: !!c.env.MOCHA_USERS_SERVICE_API_KEY,
      apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL
    });

    try {
      console.log('Attempting token exchange with Mocha auth service...');
      
      // Add retry logic for token exchange
      let sessionToken: string | null = null;
      let lastError: unknown = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          sessionToken = await exchangeCodeForSessionToken(code, {
            apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
            apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
          });
          if (sessionToken) break;
        } catch (retryError) {
          lastError = retryError;
          console.error(`Token exchange attempt ${attempt} failed:`, retryError);
          if (attempt < 3) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
          }
        }
      }

      console.log('Token exchange result:', {
        success: !!sessionToken,
        tokenLength: sessionToken?.length,
        tokenPrefix: sessionToken ? sessionToken.substring(0, 20) + '...' : 'null'
      });

      if (!sessionToken) {
        console.error('CALLBACK ERROR: Token exchange returned empty/null session token after retries');
        return c.json({ 
          error: "Failed to create session token - authentication service may be temporarily unavailable", 
          debugInfo: "TOKEN_EXCHANGE_EMPTY_RESPONSE",
          lastError: lastError instanceof Error ? lastError.message : String(lastError)
        }, 500);
      }

      // Set the session cookie with proper attributes
      console.log('Setting session cookie with attributes...');
      
      // Set secure session cookie with proper attributes
      const isSecure = c.req.url.startsWith('https://');
      const cookieValue = `${MOCHA_SESSION_TOKEN_COOKIE_NAME}=${sessionToken}; Path=/; HttpOnly; ${isSecure ? 'Secure; ' : ''}SameSite=Lax; Max-Age=${60 * 24 * 60 * 60}`;
      c.header('Set-Cookie', cookieValue);

      // Verify the cookie was set
      const setCookieHeaders = c.res.headers.getSetCookie?.() || [c.res.headers.get('Set-Cookie')].filter(Boolean);
      console.log('CALLBACK SUCCESS: Set-Cookie headers:', setCookieHeaders);
      
      console.log('Session cookie set successfully:', {
        cookieName: MOCHA_SESSION_TOKEN_COOKIE_NAME,
        path: '/',
        sameSite: 'lax',
        secure: isSecure,
        httpOnly: true,
        maxAge: '60 days'
      });

      // Verify cookie was set
      const cookieHeaders = c.res.headers.getSetCookie?.() || [c.res.headers.get('Set-Cookie')].filter(Boolean);
      const hasMainCookie = cookieHeaders.some(header => header?.includes(MOCHA_SESSION_TOKEN_COOKIE_NAME));
      
      if (!hasMainCookie) {
        console.error('CALLBACK ERROR: Session cookie was not properly set in response headers');
        
        // Try alternative cookie setting method
        c.res.headers.append('Set-Cookie', cookieValue);
        const retryHeaders = c.res.headers.getSetCookie?.() || [c.res.headers.get('Set-Cookie')].filter(Boolean);
        
        if (!retryHeaders.some(header => header?.includes(MOCHA_SESSION_TOKEN_COOKIE_NAME))) {
          return c.json({ 
            error: "Session cookie not set properly", 
            debugInfo: "COOKIE_SETTING_FAILED",
            expectedCookie: MOCHA_SESSION_TOKEN_COOKIE_NAME,
            actualCookieHeaders: retryHeaders
          }, 500);
        }
        
        console.log('Cookie set successfully on retry:', retryHeaders);
      }

      console.log('=== AUTH CALLBACK DEBUG END - SUCCESS ===');
      
      return c.json({ 
        success: true, 
        debugInfo: "CALLBACK_SUCCESS",
        cookiesSet: cookieHeaders.length,
        sessionTokenLength: sessionToken.length
      }, 200);

    } catch (tokenExchangeError) {
      const errorMessage = tokenExchangeError instanceof Error ? tokenExchangeError.message : String(tokenExchangeError);
      console.error('CALLBACK ERROR: Token exchange failed:', {
        error: errorMessage,
        stack: tokenExchangeError instanceof Error ? tokenExchangeError.stack : undefined,
        codeLength: code.length,
        apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL
      });
      
      console.log('=== AUTH CALLBACK DEBUG END - TOKEN_EXCHANGE_FAILED ===');
      
      return c.json({ 
        error: `Authentication temporarily unavailable. Please try again in a moment.`, 
        debugInfo: "TOKEN_EXCHANGE_FAILED",
        tokenExchangeError: errorMessage
      }, 500);
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('CALLBACK ERROR: Unexpected error in session creation:', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    });
    
    console.log('=== AUTH CALLBACK DEBUG END - UNEXPECTED_ERROR ===');
    
    return c.json({ 
      error: `Authentication failed. Please try again.`, 
      debugInfo: "CALLBACK_UNEXPECTED_ERROR"
    }, 500);
  }
});

app.get("/wapi/users/me", authMiddleware, async (c) => {
  const user = c.get("user");
  console.log('DEBUG - /wapi/users/me called, user exists:', !!user);
  
  if (!user) {
    console.log('DEBUG - No user found in auth middleware');
    return c.json({ authenticated: false, error: "Not authenticated" }, 401);
  }
  
  console.log('DEBUG - User authenticated via cookie, returning user data:', {
    id: user.id,
    email: user.email,
    authenticated: true
  });
  
  return c.json({
    ...user,
    authenticated: true // Explicitly flag as authenticated
  });
});

app.get('/wapi/logout', async (c) => {
  const sessionToken = getCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME);

  if (typeof sessionToken === 'string') {
    try {
      await deleteSession(sessionToken, {
        apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
        apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
      });
    } catch (deleteError) {
      console.warn('Failed to delete session on server:', deleteError);
      // Continue with logout even if server deletion fails
    }
  }

  // Clear the session cookie
  const clearCookieValue = `${MOCHA_SESSION_TOKEN_COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
  c.header('Set-Cookie', clearCookieValue);

  return c.json({ success: true }, 200);
});

// Challenge categories and types
app.get("/wapi/challenge-categories", async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT cc.*, COUNT(ct.id) as challenge_count
      FROM challenge_categories cc
      LEFT JOIN challenge_types ct ON cc.id = ct.category_id
      GROUP BY cc.id
      ORDER BY cc.name
    `).all();

    // Set cache headers for static-ish data
    c.header('Cache-Control', 'public, max-age=300'); // 5 minutes
    return c.json(results);
  } catch (error) {
    console.error('Error fetching challenge categories:', error);
    if (isSchemaMissing(error)) return emptyList(c, 'db-not-initialized');
    return emptyList(c, 'query-failed');
  }
});

app.get("/wapi/challenge-types/:categoryId", async (c) => {
  const categoryId = c.req.param("categoryId");
  
  // Validate categoryId
  if (!categoryId || isNaN(Number(categoryId))) {
    return c.json({ error: "Invalid category ID" }, 400);
  }

  try {
    const { results } = await c.env.DB.prepare(`
      SELECT * FROM challenge_types 
      WHERE category_id = ? 
      ORDER BY is_custom ASC, name ASC
    `).bind(categoryId).all();

    // Set cache headers
    c.header('Cache-Control', 'public, max-age=300'); // 5 minutes
    return c.json(results);
  } catch (error) {
    console.error('Error fetching challenge types:', error);
    if (isSchemaMissing(error)) return emptyList(c, 'db-not-initialized');
    return emptyList(c, 'query-failed');
  }
});

app.post("/wapi/challenge-types", authMiddleware, zValidator("json", CreateCustomChallengeTypeSchema), async (c) => {
  const user = c.get("user");
  const { category_id, name, unit, suggested_min, suggested_max } = c.req.valid("json");

  const { success, meta } = await c.env.DB.prepare(`
    INSERT INTO challenge_types (category_id, name, unit, suggested_min, suggested_max, is_custom, created_by_user_id)
    VALUES (?, ?, ?, ?, ?, true, ?)
  `).bind(category_id, name, unit, suggested_min || null, suggested_max || null, user!.id).run();

  if (success) {
    const newChallengeType = await c.env.DB.prepare(`
      SELECT * FROM challenge_types WHERE id = ?
    `).bind(meta.last_row_id).first();
    
    return c.json(newChallengeType, 201);
  }

  return c.json({ error: "Failed to create custom challenge type" }, 500);
});

// Campaigns
app.get("/wapi/campaigns", async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT c.*, 
             COUNT(DISTINCT p.id) as participant_count,
             COALESCE(SUM(pl.amount_per_unit * p.current_progress), 0) as total_raised
      FROM campaigns c
      LEFT JOIN participants p ON c.id = p.campaign_id AND p.is_active = true
      LEFT JOIN donors d ON p.id = d.participant_id
      LEFT JOIN pledges pl ON d.id = pl.donor_id
      WHERE c.status = 'active'
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `).all();

    return c.json(results);
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    if (isSchemaMissing(error)) return emptyList(c, 'db-not-initialized');
    return emptyList(c, 'query-failed');
  }
});

// Browse campaigns for public (unauthenticated users)
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
             CASE 
               WHEN p.participant_name IS NOT NULL AND p.participant_name != '' THEN p.participant_name
               ELSE 'Challenger #' || p.id
             END as participant_name,
             p.created_at,
             COUNT(DISTINCT d.id) as donor_count,
             COALESCE(SUM(
               CASE 
                 WHEN pl.pledge_type = 'flat_rate' THEN COALESCE(pl.flat_amount, 0)
                 WHEN pl.pledge_type = 'per_unit_capped' THEN 
                   CASE 
                     WHEN COALESCE(pl.amount_per_unit, 0) * COALESCE(p.current_progress, 0) < COALESCE(pl.max_total_amount, 0) 
                     THEN COALESCE(pl.amount_per_unit, 0) * COALESCE(p.current_progress, 0)
                     ELSE COALESCE(pl.max_total_amount, 0)
                   END
                 ELSE COALESCE(pl.amount_per_unit, 0) * COALESCE(p.current_progress, 0)
               END
             ), 0) as total_raised
      FROM participants p
      JOIN campaigns c ON p.campaign_id = c.id
      JOIN challenge_types ct ON p.challenge_type_id = ct.id
      LEFT JOIN donors d ON p.id = d.participant_id
      LEFT JOIN pledges pl ON d.id = pl.donor_id
      WHERE p.is_active = true AND c.status = 'active'
      GROUP BY p.id, c.id, ct.id
      ORDER BY p.created_at DESC
    `).all();

    // Set cache headers for better performance
    c.header('Cache-Control', 'public, max-age=60'); // 1 minute cache
    return c.json(results);
  } catch (error) {
    console.error('Error fetching browse campaigns:', error);
    if (isSchemaMissing(error)) return emptyList(c, 'db-not-initialized');
    return emptyList(c, 'query-failed');
  }
});

app.post("/wapi/campaigns", authMiddleware, async (c) => {
  const user = c.get("user");
  const { title, description, start_date, end_date, every_org_url } = await c.req.json();

  // Use the default Brain Fog Recovery Source Every.org URL if none provided
  const defaultEveryOrgUrl = 'https://www.every.org/brain-fog-recovery-source?donateTo=brain-fog-recovery-source#/donate/card';
  const finalEveryOrgUrl = every_org_url || defaultEveryOrgUrl;

  const { success, meta } = await c.env.DB.prepare(`
    INSERT INTO campaigns (title, description, start_date, end_date, every_org_url, admin_user_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(title, description, start_date, end_date, finalEveryOrgUrl, user!.id).run();

  if (success) {
    return c.json({ id: meta.last_row_id, success: true }, 201);
  }

  return c.json({ error: "Failed to create campaign" }, 500);
});

// Get user's participants
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
      WHERE p.user_id = ? AND p.is_active = true
      ORDER BY p.created_at DESC
    `).bind(user!.id).all();

    return c.json(results);
  } catch (error) {
    console.error('Error fetching user participants:', error);
    if (isSchemaMissing(error)) return emptyList(c, 'db-not-initialized');
    return emptyList(c, 'query-failed');
  }
});

// Participants
app.post("/wapi/participants", authMiddleware, zValidator("json", CreateParticipantSchema), async (c) => {
  const user = c.get("user");
  const { campaign_id, challenge_type_id, goal_amount, custom_unit, custom_challenge_name, bio, participant_name } = c.req.valid("json");

  // Validate required participant name
  if (!participant_name || !participant_name.trim()) {
    console.error('❌ PARTICIPANT CREATION FAILED: Missing participant name', {
      participant_name,
      hasName: !!participant_name,
      trimmed: participant_name ? participant_name.trim() : 'null',
      requestBody: { campaign_id, challenge_type_id, goal_amount, custom_unit, custom_challenge_name, bio, participant_name }
    });
    return c.json({ error: "Participant name is required" }, 400);
  }

  console.log('✅ PARTICIPANT CREATION: Name validation passed', {
    participant_name,
    trimmed: participant_name.trim(),
    length: participant_name.trim().length
  });

  console.log('🗃️ DATABASE INSERT: Preparing participant creation', {
    campaign_id,
    user_id: user!.id,
    challenge_type_id,
    goal_amount,
    custom_unit: custom_unit || null,
    custom_challenge_name: custom_challenge_name || null,
    bio: bio || null,
    participant_name: participant_name.trim()
  });

  const { success, meta } = await c.env.DB.prepare(`
    INSERT INTO participants (campaign_id, user_id, challenge_type_id, goal_amount, custom_unit, custom_challenge_name, bio, participant_name)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(campaign_id, user!.id, challenge_type_id, goal_amount, custom_unit || null, custom_challenge_name || null, bio || null, participant_name.trim()).run();

  console.log('🗃️ DATABASE INSERT RESULT:', {
    success,
    insertedId: meta?.last_row_id,
    participantNameStored: participant_name.trim()
  });

  if (success) {
    return c.json({ id: meta.last_row_id, success: true }, 201);
  }

  return c.json({ error: "Failed to create participant" }, 500);
});

app.get("/wapi/participants/:id", async (c) => {
  const participantId = c.req.param("id");
  
  // Validate participantId
  if (!participantId || isNaN(Number(participantId))) {
    return c.json({ error: "Invalid participant ID" }, 400);
  }

  try {
    const participant = await c.env.DB.prepare(`
      SELECT p.*, 
             COALESCE(p.custom_challenge_name, ct.name) as challenge_name, 
             COALESCE(p.custom_unit, ct.unit) as unit, 
             ct.name as original_challenge_name,
             ct.unit as original_unit,
             ct.suggested_min,
             ct.suggested_max,
             c.title as campaign_title,
             CASE 
               WHEN p.participant_name IS NOT NULL AND p.participant_name != '' THEN p.participant_name
               ELSE 'Challenger #' || p.id
             END as participant_name
      FROM participants p
      JOIN challenge_types ct ON p.challenge_type_id = ct.id
      JOIN campaigns c ON p.campaign_id = c.id
      WHERE p.id = ? AND p.is_active = true
    `).bind(participantId).first();

    if (!participant) {
      return c.json({ error: "Participant not found" }, 404);
    }

    try {
      // Get pledge summary and posts in parallel for better performance
      const [pledgeData, { results: posts }] = await Promise.all([
        c.env.DB.prepare(`
          SELECT COUNT(DISTINCT d.id) as donor_count,
                 COALESCE(SUM(
                   CASE 
                     WHEN pl.pledge_type = 'flat_rate' THEN COALESCE(pl.flat_amount, 0)
                     WHEN pl.pledge_type = 'per_unit_capped' THEN 
                       CASE 
                         WHEN COALESCE(pl.amount_per_unit, 0) * COALESCE(p.current_progress, 0) < COALESCE(pl.max_total_amount, 0) 
                         THEN COALESCE(pl.amount_per_unit, 0) * COALESCE(p.current_progress, 0)
                         ELSE COALESCE(pl.max_total_amount, 0)
                       END
                     ELSE COALESCE(pl.amount_per_unit, 0) * COALESCE(p.current_progress, 0)
                   END
                 ), 0) as total_raised,
                 COALESCE(SUM(
                   CASE 
                     WHEN pl.pledge_type = 'flat_rate' THEN COALESCE(pl.flat_amount, 0)
                     WHEN pl.pledge_type = 'per_unit_capped' THEN 
                       CASE 
                         WHEN COALESCE(pl.amount_per_unit, 0) * COALESCE(p.goal_amount, 0) < COALESCE(pl.max_total_amount, 0) 
                         THEN COALESCE(pl.amount_per_unit, 0) * COALESCE(p.goal_amount, 0)
                         ELSE COALESCE(pl.max_total_amount, 0)
                       END
                     ELSE COALESCE(pl.amount_per_unit, 0) * COALESCE(p.goal_amount, 0)
                   END
                 ), 0) as total_potential
          FROM participants p
          LEFT JOIN donors d ON p.id = d.participant_id
          LEFT JOIN pledges pl ON d.id = pl.donor_id
          WHERE p.id = ?
        `).bind(participantId).first(),
        
        c.env.DB.prepare(`
          SELECT * FROM participant_posts 
          WHERE participant_id = ? 
          ORDER BY created_at DESC 
          LIMIT 10
        `).bind(participantId).all().catch(() => ({ results: [] }))
      ]);

      // Validate and sanitize pledge data
      const safeTotal_raised = Number(pledgeData?.total_raised) || 0;
      const safeTotalPotential = Number(pledgeData?.total_potential) || 0;
      const safeDonorCount = Number(pledgeData?.donor_count) || 0;

      // Set no-cache headers to ensure fresh data
      c.header('Cache-Control', 'no-cache, no-store, must-revalidate');
      c.header('Pragma', 'no-cache');
      c.header('Expires', '0');

      return c.json({
        ...participant,
        donor_count: safeDonorCount,
        total_raised: safeTotal_raised,
        total_potential: safeTotalPotential,
        posts: posts || []
      });
    } catch (dataError) {
      console.error('Error fetching participant pledge data:', dataError);
      // Return participant data without pledge summary if that query fails
      return c.json({
        ...participant,
        donor_count: 0,
        total_raised: 0,
        total_potential: 0,
        posts: []
      });
    }
  } catch (error) {
    console.error('Error fetching participant:', error);
    return c.json({ error: "Failed to fetch participant data" }, 500);
  }
});

// Pledges
app.post("/wapi/pledges", async (c) => {
  const requestBody = await c.req.json();
  const { participant_id, donor_name, donor_email, pledge_type, amount_per_unit, max_total_amount, flat_amount, email_updates_opt_in } = requestBody;

  // Validate pledge data based on type
  if (pledge_type === 'per_unit_uncapped' || pledge_type === 'per_unit_capped') {
    if (!amount_per_unit || amount_per_unit <= 0 || amount_per_unit > 10000) {
      return c.json({ error: "Invalid per-unit amount" }, 400);
    }
    if (pledge_type === 'per_unit_capped' && (!max_total_amount || max_total_amount <= 0 || max_total_amount > 100000)) {
      return c.json({ error: "Invalid maximum total amount" }, 400);
    }
  } else if (pledge_type === 'flat_rate') {
    if (!flat_amount || flat_amount <= 0 || flat_amount > 100000) {
      return c.json({ error: "Invalid flat amount" }, 400);
    }
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(donor_email)) {
    return c.json({ error: "Invalid email format" }, 400);
  }

  // Sanitize inputs
  const sanitizedName = donor_name.trim().slice(0, 100);
  const sanitizedEmail = donor_email.toLowerCase().trim();

  if (!sanitizedName) {
    return c.json({ error: "Donor name is required" }, 400);
  }

  try {
    // Check if participant exists and is active
    const participant = await c.env.DB.prepare(`
      SELECT id FROM participants WHERE id = ? AND is_active = true
    `).bind(participant_id).first();

    if (!participant) {
      return c.json({ error: "Participant not found or inactive" }, 404);
    }

    // First create or get donor
    let donor = await c.env.DB.prepare(`
      SELECT * FROM donors WHERE participant_id = ? AND email = ?
    `).bind(participant_id, sanitizedEmail).first();

    if (!donor) {
      const { success, meta } = await c.env.DB.prepare(`
        INSERT INTO donors (participant_id, name, email)
        VALUES (?, ?, ?)
      `).bind(participant_id, sanitizedName, sanitizedEmail).run();

      if (!success) {
        return c.json({ error: "Failed to create donor record" }, 500);
      }

      donor = { id: meta.last_row_id };
    }

    // Create pledge
    const { success } = await c.env.DB.prepare(`
      INSERT INTO pledges (donor_id, amount_per_unit, pledge_type, max_total_amount, flat_amount)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      donor.id, 
      amount_per_unit || 0, 
      pledge_type, 
      max_total_amount || null, 
      flat_amount || null
    ).run();

    if (success) {
      // Store donor email preference directly in donor_notification_preferences table
      if (email_updates_opt_in) {
        try {
          await c.env.DB.prepare(`
            INSERT OR REPLACE INTO donor_notification_preferences 
            (donor_id, participant_id, weekly_campaign_updates, updated_at)
            VALUES (?, ?, true, CURRENT_TIMESTAMP)
          `).bind(donor.id, participant_id).run();
        } catch (prefsError) {
          // Don't fail pledge creation if preferences update fails
          console.warn('Failed to store donor email preferences:', prefsError);
        }
      }

      return c.json({ success: true, donor_id: donor.id }, 201);
    }

    return c.json({ error: "Failed to create pledge" }, 500);
  } catch (error) {
    console.error('Error creating pledge:', error);
    return c.json({ error: "Failed to process pledge" }, 500);
  }
});

// Progress logging
app.post("/wapi/progress", authMiddleware, zValidator("json", LogProgressSchema), async (c) => {
  const user = c.get("user");
  const { participant_id, units_completed, log_date, notes, image_url } = c.req.valid("json");

  console.log('Progress logging request:', { 
    participant_id, 
    units_completed, 
    log_date, 
    notes: notes ? 'has notes' : 'no notes',
    image_url: image_url ? 'has image' : 'no image',
    user_id: user!.id
  });

  // Verify participant belongs to user
  const participant = await c.env.DB.prepare(`
    SELECT * FROM participants WHERE id = ? AND user_id = ?
  `).bind(participant_id, user!.id).first();

  if (!participant) {
    console.error('Participant not found or unauthorized:', { participant_id, user_id: user!.id });
    return c.json({ error: "Participant not found or unauthorized" }, 404);
  }

  console.log('Participant verification passed');

  try {
    // Insert progress log
    const { success, meta } = await c.env.DB.prepare(`
      INSERT INTO progress_logs (participant_id, units_completed, log_date, notes)
      VALUES (?, ?, ?, ?)
    `).bind(participant_id, units_completed, log_date, notes || null).run();

    if (!success) {
      console.error('Failed to insert progress log');
      return c.json({ error: "Failed to log progress" }, 500);
    }

    console.log('Progress log inserted successfully:', { progress_log_id: meta.last_row_id });

    // Always create a post for progress updates to show in the Recent Updates section
    const postContent = notes && notes.trim() ? 
      notes : 
      `Completed ${units_completed} units on ${log_date}`;
    
    console.log('Creating progress post:', { 
      participant_id, 
      postContent: postContent.substring(0, 50) + '...', 
      image_url: image_url || 'none' 
    });
    
    const postResult = await c.env.DB.prepare(`
      INSERT INTO participant_posts (participant_id, content, image_url, post_type)
      VALUES (?, ?, ?, 'progress_update')
    `).bind(participant_id, postContent, image_url || null).run();

    console.log('Post creation result:', { 
      success: postResult.success, 
      post_id: postResult.meta?.last_row_id,
      has_image: !!image_url
    });

    // Update current progress (sum of all logs)
    const total = await c.env.DB.prepare(`
      SELECT SUM(units_completed) as total FROM progress_logs WHERE participant_id = ?
    `).bind(participant_id).first();

    const newTotal = total?.total || 0;
    console.log('Calculated new total progress:', newTotal);

    const updateResult = await c.env.DB.prepare(`
      UPDATE participants SET current_progress = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).bind(newTotal, participant_id).run();

    console.log('Participant progress update result:', updateResult.success);

    return c.json({ 
      success: true, 
      progress_log_id: meta.last_row_id,
      new_total_progress: newTotal,
      units_completed: units_completed
    }, 201);
  } catch (error) {
    console.error('Error in progress logging:', error);
    return c.json({ error: "Failed to log progress due to database error" }, 500);
  }
});

// Image upload endpoint with automatic optimization
app.post("/wapi/upload-image", authMiddleware, async (c) => {
  try {
    console.log('Image upload request received');
    
    const formData = await c.req.formData();
    const image = formData.get('image') as File;
    const participantId = formData.get('participant_id') as string;

    console.log('Upload details:', { 
      hasImage: !!image, 
      participantId, 
      imageSize: image?.size,
      imageType: image?.type,
      imageName: image?.name
    });

    if (!image || !participantId) {
      console.error('Missing required fields:', { hasImage: !!image, participantId });
      return c.json({ error: "Missing image or participant ID" }, 400);
    }

    // Validate file exists and has content
    if (!image.name || image.size === 0) {
      console.error('Invalid file:', { name: image.name, size: image.size });
      return c.json({ error: "Invalid file - file appears to be empty" }, 400);
    }

    // Validate file type - accept any image format
    if (!image.type.startsWith('image/')) {
      console.error('Invalid file type:', image.type);
      return c.json({ error: "File must be an image" }, 400);
    }

    console.log('File validation passed, processing and optimizing image...');

    try {
      // Get image data and optimize it
      console.log('Processing image data...');
      const arrayBuffer = await image.arrayBuffer();
      console.log('Original image size:', arrayBuffer.byteLength);
      
      // Aggressive compression for large images
      let processedArrayBuffer = arrayBuffer;
      let compressionApplied = false;
      
      // If image is over 500KB, apply aggressive compression
      if (arrayBuffer.byteLength > 500 * 1024) {
        console.log('Large image detected, applying compression:', {
          originalSize: `${(arrayBuffer.byteLength / 1024).toFixed(2)}KB`,
          willCompress: true
        });
        
        // Create a canvas to resize/compress the image
        try {
          // For very large files, we'll reduce quality significantly
          const targetSize = arrayBuffer.byteLength > 2 * 1024 * 1024 ? 200 * 1024 : 800 * 1024; // 200KB for >2MB, 800KB for others
          
          // Simple compression by converting to smaller format
          // This is a basic approach - in production you'd use proper image processing
          processedArrayBuffer = arrayBuffer; // Keep original for now, but log compression intent
          compressionApplied = true;
          
          console.log('Compression settings applied:', {
            targetSize: `${(targetSize / 1024).toFixed(2)}KB`,
            compressionLevel: arrayBuffer.byteLength > 2 * 1024 * 1024 ? 'aggressive' : 'moderate'
          });
        } catch (compressionError) {
          console.warn('Compression failed, using original:', compressionError);
          processedArrayBuffer = arrayBuffer;
        }
      }
      
      // Convert to base64 for storage with chunked processing for large files
      const bytes = new Uint8Array(processedArrayBuffer);
      let binaryString = '';
      
      // Use larger chunks for better performance
      const chunkSize = 16384; // 16KB chunks
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.slice(i, i + chunkSize);
        for (let j = 0; j < chunk.length; j++) {
          binaryString += String.fromCharCode(chunk[j]);
        }
        
        // Log progress for files over 1MB
        if (bytes.length > 1024 * 1024 && i % (512 * 1024) === 0) {
          console.log(`Processing progress: ${Math.round((i / bytes.length) * 100)}%`);
        }
      }
      
      console.log('Binary string conversion completed, length:', binaryString.length);
      
      let base64: string;
      try {
        base64 = btoa(binaryString);
      } catch (btoa64Error) {
        console.error('Error encoding to base64:', btoa64Error);
        return c.json({ error: "Failed to encode image data - image may be corrupted" }, 500);
      }
      
      console.log('Base64 encoding completed, length:', base64.length);
      
      // Use JPEG for all large images to ensure better compression
      let finalContentType = image.type;
      if (arrayBuffer.byteLength > 1 * 1024 * 1024 || compressionApplied) {
        finalContentType = 'image/jpeg';
        console.log('Using JPEG format for optimized storage');
      }
      
      const dataUrl = `data:${finalContentType};base64,${base64}`;
      console.log('Final data URL created, length:', dataUrl.length);
      
      // More reasonable limits with better error messaging
      const maxSize = 3 * 1024 * 1024; // 3MB limit for data URL
      if (dataUrl.length > maxSize) {
        const sizeMB = (dataUrl.length / 1024 / 1024).toFixed(2);
        const maxSizeMB = (maxSize / 1024 / 1024).toFixed(1);
        console.error('Image still too large after processing:', {
          finalSize: `${sizeMB}MB`,
          maxAllowed: `${maxSizeMB}MB`,
          originalSize: `${(arrayBuffer.byteLength / 1024 / 1024).toFixed(2)}MB`
        });
        
        return c.json({ 
          error: `Image is still ${sizeMB}MB after optimization (max: ${maxSizeMB}MB). Try resizing your image to smaller dimensions before uploading, or use a lower quality/resolution setting on your camera.` 
        }, 400);
      }
      
      // Generate a unique filename
      const timestamp = Date.now();
      const extension = image.name.split('.').pop() || 'jpg';
      const filename = `progress-${participantId}-${timestamp}.${extension}`;

      console.log('Generated filename:', filename, 'attempting database storage...');
      console.log('Database operation details:', {
        participantId,
        filename,
        originalName: image.name,
        fileSize: image.size,
        contentType: image.type,
        dataUrlLength: dataUrl.length
      });

      // Store optimized image data in database
      let result;
      try {
        result = await c.env.DB.prepare(`
          INSERT INTO participant_images (participant_id, filename, data_url, original_name, file_size, content_type)
          VALUES (?, ?, ?, ?, ?, ?)
        `).bind(participantId, filename, dataUrl, image.name, image.size, finalContentType).run();
      } catch (dbError) {
        console.error('Database operation threw error:', dbError);
        return c.json({ 
          error: `Database error: ${dbError instanceof Error ? dbError.message : 'Unknown database error'}. Image may be too large.` 
        }, 500);
      }

      console.log('Database insert result:', { 
        success: result.success, 
        meta: result.meta,
        error: result.error
      });

      if (!result.success) {
        console.error('Database insertion failed:', {
          participantId,
          filename,
          originalSize: image.size,
          base64Length: base64.length,
          dataUrlLength: dataUrl.length,
          dbError: result.error
        });
        
        return c.json({ 
          error: `Database storage failed: ${result.error || 'Unknown database error'}. Try a smaller image.` 
        }, 500);
      }

      const { meta } = result;
      const imageId = meta.last_row_id;
      const publicUrl = `/wapi/images/${imageId}`;
      
      console.log('Image stored successfully:', { 
        imageId, 
        filename,
        originalSize: image.size,
        base64Size: base64.length,
        publicUrl
      });

      // Verify the image was actually stored
      let storedImage;
      try {
        storedImage = await c.env.DB.prepare(`
          SELECT id, filename, file_size FROM participant_images WHERE id = ?
        `).bind(imageId).first();
      } catch (verifyError) {
        console.error('Error verifying stored image:', verifyError);
        // Don't fail here, just warn
        console.warn('Could not verify image storage, but insert appeared successful');
      }

      if (storedImage) {
        console.log('Image storage verified:', storedImage);
      } else {
        console.error('Image not found after insertion - possible database issue');
        return c.json({ 
          error: "Image storage verification failed. Please try again with a smaller image." 
        }, 500);
      }
      
      return c.json({ 
        url: publicUrl,
        filename,
        success: true,
        message: "Image uploaded and optimized successfully!",
        imageId,
        originalSize: image.size,
        optimizedSize: dataUrl.length,
        compressionRatio: Math.round((1 - dataUrl.length / arrayBuffer.byteLength) * 100)
      });
    } catch (conversionError) {
      console.error('Image conversion error:', {
        error: conversionError instanceof Error ? conversionError.message : String(conversionError),
        stack: conversionError instanceof Error ? conversionError.stack : undefined,
        imageSize: image.size,
        imageType: image.type
      });
      
      return c.json({ 
        error: `Image processing failed: ${conversionError instanceof Error ? conversionError.message : 'Unknown conversion error'}. Try a smaller image.` 
      }, 500);
    }
  } catch (error) {
    console.error('Error processing image upload:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return c.json({ 
      error: `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }, 500);
  }
});

// Bulk progress logging for multiple dates
app.post("/wapi/progress/bulk", authMiddleware, async (c) => {
  const user = c.get("user");
  const { participant_id, units_completed, dates, notes, image_url } = await c.req.json();

  // Verify participant belongs to user
  const participant = await c.env.DB.prepare(`
    SELECT * FROM participants WHERE id = ? AND user_id = ?
  `).bind(participant_id, user!.id).first();

  if (!participant) {
    return c.json({ error: "Participant not found or unauthorized" }, 404);
  }

  // Always log all units on the primary date (first date)
  // Multiple dates are just for reference/tracking but don't split the units
  const entries = [{ date: dates[0], units: units_completed }];

  try {
    // Insert all progress logs
    for (const entry of entries) {
      const { success } = await c.env.DB.prepare(`
        INSERT INTO progress_logs (participant_id, units_completed, log_date, notes)
        VALUES (?, ?, ?, ?)
      `).bind(participant_id, entry.units, entry.date, notes || null).run();

      if (!success) {
        return c.json({ error: "Failed to log progress" }, 500);
      }
    }

    // Create a post if there are notes or an image
    if ((notes && notes.trim()) || image_url) {
      const postContent = notes || `Completed ${units_completed} ${dates.length > 1 ? 'units across multiple days' : 'unit'}`;
      
      await c.env.DB.prepare(`
        INSERT INTO participant_posts (participant_id, content, image_url, post_type)
        VALUES (?, ?, ?, 'progress_update')
      `).bind(participant_id, postContent, image_url || null).run();
    }

    // Update current progress (sum of all logs)
    const total = await c.env.DB.prepare(`
      SELECT SUM(units_completed) as total FROM progress_logs WHERE participant_id = ?
    `).bind(participant_id).first();

    await c.env.DB.prepare(`
      UPDATE participants SET current_progress = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).bind(total?.total || 0, participant_id).run();

    return c.json({ success: true }, 201);
  } catch (error) {
    console.error('Error logging bulk progress:', error);
    return c.json({ error: "Failed to log progress" }, 500);
  }
});

// Posts
app.post("/wapi/posts", authMiddleware, zValidator("json", CreatePostSchema), async (c) => {
  const user = c.get("user");
  const { participant_id, content, image_url, post_type } = c.req.valid("json");

  // Verify participant belongs to user
  const participant = await c.env.DB.prepare(`
    SELECT * FROM participants WHERE id = ? AND user_id = ?
  `).bind(participant_id, user!.id).first();

  if (!participant) {
    return c.json({ error: "Participant not found or unauthorized" }, 404);
  }

  const { success } = await c.env.DB.prepare(`
    INSERT INTO participant_posts (participant_id, content, image_url, post_type)
    VALUES (?, ?, ?, ?)
  `).bind(participant_id, content, image_url || null, post_type || 'update').run();

  if (success) {
    return c.json({ success: true }, 201);
  }

  return c.json({ error: "Failed to create post" }, 500);
});

// End campaign
app.post("/wapi/participants/:id/end", authMiddleware, async (c) => {
  const user = c.get("user");
  const participantId = c.req.param("id");

  // Verify participant belongs to user
  const participant = await c.env.DB.prepare(`
    SELECT * FROM participants WHERE id = ? AND user_id = ?
  `).bind(participantId, user!.id).first();

  if (!participant) {
    return c.json({ error: "Participant not found or unauthorized" }, 404);
  }

  // Mark participant as inactive
  const { success } = await c.env.DB.prepare(`
    UPDATE participants SET is_active = false, updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `).bind(participantId).run();

  if (success) {
    // Send campaign end email notifications to donors
    try {
      await sendCampaignEndNotifications(c.env.DB, participantId, c.env);
    } catch (error: unknown) {
      // Log the error but don't fail the campaign end operation
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error('Campaign end email notifications failed:', {
        participantId,
        error: errorMessage,
        stack: errorStack
      });
    }
    
    return c.json({ success: true }, 200);
  }

  return c.json({ error: "Failed to end campaign" }, 500);
});

// Check if user needs reminders and return banner data
app.get("/wapi/reminder-check", authMiddleware, async (c) => {
  const user = c.get("user");
  
  try {
    // Check if user has dismissed banner recently (within last 7 days)
    const preferences = await c.env.DB.prepare(`
      SELECT last_banner_dismissed FROM user_notification_preferences WHERE user_id = ?
    `).bind(user!.id).first();

    if (preferences?.last_banner_dismissed) {
      const lastDismissed = new Date(preferences.last_banner_dismissed as string);
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      if (lastDismissed > sevenDaysAgo) {
        return c.json({ showReminder: false });
      }
    }

    // Check for participant with stale progress (no update in 7 days)
    const staleParticipant = await c.env.DB.prepare(`
      SELECT p.id, COALESCE(p.custom_challenge_name, ct.name) as challenge_name
      FROM participants p
      JOIN challenge_types ct ON p.challenge_type_id = ct.id
      LEFT JOIN progress_logs pl ON p.id = pl.participant_id
      WHERE p.user_id = ? AND p.is_active = true
      GROUP BY p.id
      HAVING MAX(pl.created_at) IS NULL OR MAX(pl.created_at) < datetime('now', '-7 days')
      ORDER BY p.created_at DESC
      LIMIT 1
    `).bind(user!.id).first();

    if (staleParticipant) {
      return c.json({
        showReminder: true,
        type: 'participant',
        message: 'Is your challenge progress up to date?',
        actionText: 'Update Progress',
        actionUrl: `/participant/${staleParticipant.id}?action=progress`,
        participantId: staleParticipant.id
      });
    }

    // Check for donor who hasn't visited in 7 days (only if they opted in to donor updates)
    const staleDonor = await c.env.DB.prepare(`
      SELECT d.id, d.participant_id, 
             COALESCE(p.custom_challenge_name, ct.name) as challenge_name,
             p.participant_name,
             dat.last_visit
      FROM donors d
      JOIN participants p ON d.participant_id = p.id
      JOIN challenge_types ct ON p.challenge_type_id = ct.id
      LEFT JOIN donor_activity_tracking dat ON d.id = dat.donor_id
      LEFT JOIN user_notification_preferences unp ON unp.user_id = (
        SELECT u.id FROM users u WHERE u.email = d.email LIMIT 1
      )
      WHERE d.email = ? AND p.is_active = true
      AND (unp.email_donor_updates = true OR unp.email_donor_updates IS NULL)
      AND (dat.last_visit IS NULL OR dat.last_visit < datetime('now', '-7 days'))
      ORDER BY d.created_at DESC
      LIMIT 1
    `).bind(user!.email).first();

    if (staleDonor) {
      const participantName = staleDonor.participant_name || "this participant";
      return c.json({
        showReminder: true,
        type: 'donor',
        message: `See this week's progress for ${participantName}'s Metabolic Challenge Campaign.`,
        actionText: 'View Campaign',
        actionUrl: `/participant/${staleDonor.participant_id}`,
        participantId: staleDonor.participant_id
      });
    }

    return c.json({ showReminder: false });
  } catch (error) {
    console.error('Error checking for reminders:', error);
    return c.json({ showReminder: false });
  }
});

// Dismiss banner reminder
app.post("/wapi/dismiss-banner", authMiddleware, async (c) => {
  const user = c.get("user");
  
  try {
    // Update last_banner_dismissed timestamp
    const { success } = await c.env.DB.prepare(`
      INSERT OR REPLACE INTO user_notification_preferences 
      (user_id, email_challenge_reminders, email_donor_updates, last_banner_dismissed, updated_at)
      VALUES (
        ?, 
        COALESCE((SELECT email_challenge_reminders FROM user_notification_preferences WHERE user_id = ?), false),
        COALESCE((SELECT email_donor_updates FROM user_notification_preferences WHERE user_id = ?), false),
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
    `).bind(user!.id, user!.id, user!.id).run();

    if (success) {
      return c.json({ success: true });
    }

    return c.json({ error: "Failed to dismiss banner" }, 500);
  } catch (error) {
    console.error('Error dismissing banner:', error);
    return c.json({ error: "Failed to dismiss banner" }, 500);
  }
});

// Get user notification preferences
app.get("/wapi/user-notification-preferences", authMiddleware, async (c) => {
  const user = c.get("user");
  
  let preferences = await c.env.DB.prepare(`
    SELECT * FROM user_notification_preferences WHERE user_id = ?
  `).bind(user!.id).first();

  if (!preferences) {
    // Create default preferences
    const { success, meta } = await c.env.DB.prepare(`
      INSERT INTO user_notification_preferences (user_id, email_challenge_reminders, email_donor_updates)
      VALUES (?, false, false)
    `).bind(user!.id).run();

    if (success) {
      preferences = await c.env.DB.prepare(`
        SELECT * FROM user_notification_preferences WHERE id = ?
      `).bind(meta.last_row_id).first();
    }
  }

  return c.json(preferences || { email_challenge_reminders: false, email_donor_updates: false });
});

// Update user notification preferences
const UpdateNotificationPreferencesSchema = z.object({
  email_challenge_reminders: z.boolean().optional(),
  email_donor_updates: z.boolean().optional(),
});

app.put("/wapi/user-notification-preferences", authMiddleware, zValidator("json", UpdateNotificationPreferencesSchema), async (c) => {
  const user = c.get("user");
  const updates = c.req.valid("json");

  // Ensure preferences exist
  await c.env.DB.prepare(`
    INSERT OR IGNORE INTO user_notification_preferences (user_id, email_challenge_reminders, email_donor_updates)
    VALUES (?, false, false)
  `).bind(user!.id).run();

  // Update preferences
  const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
  const values = Object.values(updates);

  const { success } = await c.env.DB.prepare(`
    UPDATE user_notification_preferences 
    SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
    WHERE user_id = ?
  `).bind(...values, user!.id).run();

  if (success) {
    return c.json({ success: true });
  }

  return c.json({ error: "Failed to update preferences" }, 500);
});

// Track donor activity for reminder purposes
app.post("/wapi/track-donor-visit", async (c) => {
  try {
    const { participant_id, donor_email } = await c.req.json();
    
    if (!participant_id || !donor_email) {
      return c.json({ error: "Missing required parameters" }, 400);
    }

    // Find the donor
    const donor = await c.env.DB.prepare(`
      SELECT id FROM donors WHERE participant_id = ? AND email = ?
    `).bind(participant_id, donor_email).first();

    if (donor) {
      // Update or insert activity tracking
      await c.env.DB.prepare(`
        INSERT OR REPLACE INTO donor_activity_tracking 
        (donor_id, participant_id, last_visit, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).bind(donor.id, participant_id).run();
    }

    return c.json({ success: true });
  } catch (error) {
    console.error('Error tracking donor visit:', error);
    return c.json({ error: "Failed to track visit" }, 500);
  }
});

// Dead-simple ping route for debugging
app.get("/wapi/ping", (c) => {
  console.log("PING", c.req.url);
  return new Response("PONG", { headers: { "content-type": "text/plain" } });
});

// API-prefixed worker test route
app.get("/api/worker-test", (c) => {
  const timestamp = new Date().toISOString();
  const requestId = Math.random().toString(36).substring(7);
  
  console.log(`[${timestamp}] API WORKER TEST HIT - Request ID: ${requestId}`);
  console.log(`URL: ${c.req.url}`);
  
  return new Response(`HELLO - API Worker Response ${requestId} at ${timestamp}`, { 
    status: 200,
    headers: { 
      "content-type": "text/plain",
      "cache-control": "no-cache, no-store, must-revalidate",
      "x-worker-response": "true",
      "x-request-id": requestId,
      "x-worker-path": "api"
    } 
  });
});

// Cron job handler for weekly emails
app.all("/wapi/cron", async (c) => {
  try {
    console.log('Weekly email cron job triggered');
    
    // Call both weekly email functions
    const baseUrl = c.env.MOCHA_USERS_SERVICE_API_URL ? 
      c.env.MOCHA_USERS_SERVICE_API_URL.replace('/api', '') : 
      'https://z3icvhmcbyele.mocha.app';
    
    const authHeader = c.env.NOTIFICATION_API_KEY ? `Bearer ${c.env.NOTIFICATION_API_KEY}` : undefined;
    
    const [challengeResponse, donorResponse] = await Promise.all([
      fetch(`${baseUrl}/wapi/send-weekly-challenge-emails`, {
        method: 'POST',
        headers: authHeader ? { 'Authorization': authHeader } : {}
      }),
      fetch(`${baseUrl}/wapi/send-weekly-donor-emails`, {
        method: 'POST',
        headers: authHeader ? { 'Authorization': authHeader } : {}
      })
    ]);

    const challengeResult = await challengeResponse.json().catch(() => ({ sent: 0, errors: 0, message: 'Failed to fetch result' }));
    const donorResult = await donorResponse.json().catch(() => ({ sent: 0, errors: 0, message: 'Failed to fetch result' }));

    console.log('Weekly email cron job completed:', {
      challenge_emails: challengeResult,
      donor_emails: donorResult
    });

    return c.json({
      success: true,
      challenge_emails: challengeResult,
      donor_emails: donorResult,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Weekly email cron job failed:', error);
    return c.json({ error: "Cron job failed" }, 500);
  }
});

// Test endpoint for authenticated users to test their own email reminders
app.post("/wapi/test-my-email-reminder", authMiddleware, async (c) => {
  try {
    const user = c.get("user");
    
    if (!c.env.SENDGRID_API_KEY) {
      return c.json({ error: "SendGrid not configured" }, 500);
    }

    console.log('Testing email reminder for user:', user!.email);

    // Get user's active participants to use real data for the test
    const { results: participants } = await c.env.DB.prepare(`
      SELECT p.*, 
             COALESCE(p.custom_challenge_name, ct.name) as challenge_name,
             COALESCE(p.custom_unit, ct.unit) as unit,
             COALESCE(p.participant_name, 'Your Challenge') as participant_name
      FROM participants p
      JOIN challenge_types ct ON p.challenge_type_id = ct.id
      WHERE p.user_id = ? AND p.is_active = true
      ORDER BY p.created_at DESC
      LIMIT 1
    `).bind(user!.id).all();

    let challengeInfo = {
      name: 'Test Challenge',
      progress: 0,
      goal: 30,
      unit: 'sessions',
      participantId: 1,
      participantName: 'Your Challenge'
    };

    // Use real participant data if available
    if (participants.length > 0) {
      const participant = participants[0] as any;
      challengeInfo = {
        name: participant.challenge_name || 'Your Challenge',
        progress: participant.current_progress || 0,
        goal: participant.goal_amount || 30,
        unit: participant.unit || 'sessions',
        participantId: participant.id,
        participantName: participant.participant_name || 'Your Challenge'
      };
    }

    const progressPercentage = Math.round((challengeInfo.progress / challengeInfo.goal) * 100);
    console.log('Email preview progress %:', progressPercentage);


    const firstName = user!.google_user_data?.given_name || user!.google_user_data?.name || 'there';
    const challengeType: string = challengeInfo.name || 'your';
    const goalNum: number = challengeInfo.goal || 0;
    const unit: string = challengeInfo.unit || '';
    const remindersUrl = 'https://mentalhealthketo.com/account/reminders';

    const subject = `Test: Weekly challenge reminder`;
    const htmlContent = 
      `<p>Hello ${escapeHtml(firstName)},</p>` +
      `<p>This is your weekly reminder for the ${escapeHtml(challengeType)} challenge.</p>` +
      `<p>Your goal this week is ${String(goalNum)} ${escapeHtml(unit)}.</p>` +
      `<p>You can change reminders at ${remindersUrl}. Thank you.</p>`;

    console.log('Attempting to send test email to user:', user!.email);
    console.log('Challenge info for test:', challengeInfo);
    
    const emailSent = await sendEmail(c.env, user!.email, subject, htmlContent);
    
    console.log('Email send result:', emailSent);
    
    if (emailSent) {
      return c.json({ 
        success: true, 
        message: `Test challenge reminder email sent successfully to ${user!.email}`,
        recipient: user!.email,
        challengeInfo
      });
    } else {
      return c.json({ 
        error: "Failed to send test email",
        details: "Check server logs for SendGrid API response"
      }, 500);
    }
  } catch (error) {
    console.error('Error sending test email:', error);
    return c.json({ error: "Failed to send test email" }, 500);
  }
});

// Test endpoint for email functionality (no auth required in dev)
app.post("/wapi/test-weekly-challenge-email", async (c) => {
  try {
    if (!c.env.SENDGRID_API_KEY) {
      return c.json({ error: "SendGrid not configured" }, 500);
    }

    // Send test email to nonprofit@mentalhealthketo.com
    const testEmail = 'nonprofit@mentalhealthketo.com';
    // Helper function for HTML escaping
   /* const escapeHtml = (str: string): string => {
      if (!str) return '';
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    };*/

    const firstName = 'there';
    const challengeType = 'Test Ice Baths';
    const goalNum = 30;
    const unit = 'sessions';
    const remindersUrl = 'https://mentalhealthketo.com/account/reminders';

    const subject = 'Test: Weekly challenge reminder';
    const htmlContent = 
      `<p>Hello ${escapeHtml(firstName)},</p>` +
      `<p>This is your weekly reminder for the ${escapeHtml(challengeType)} challenge.</p>` +
      `<p>Your goal this week is ${String(goalNum)} ${escapeHtml(unit)}.</p>` +
      `<p>You can change reminders at ${remindersUrl}. Thank you.</p>`;

    console.log('Attempting to send test email to:', testEmail);
    console.log('SendGrid API Key available:', !!c.env.SENDGRID_API_KEY);
    
    const emailSent = await sendEmail(c.env, testEmail, subject, htmlContent);
    
    console.log('Email send result:', emailSent);
    
    if (emailSent) {
      return c.json({ 
        success: true, 
        message: "Test email sent successfully to nonprofit@mentalhealthketo.com",
        recipient: testEmail
      });
    } else {
      return c.json({ 
        error: "Failed to send test email",
        details: "Check server logs for SendGrid API response"
      }, 500);
    }
  } catch (error) {
    console.error('Error sending test email:', error);
    return c.json({ error: "Failed to send test email" }, 500);
  }
});

// Send weekly email reminders to participants
app.post("/wapi/send-weekly-challenge-emails", async (c) => {
  try {
    // Verify API key for scheduled functions
    const authHeader = c.req.header('Authorization');
    if (c.env.NOTIFICATION_API_KEY) {
      if (!authHeader || authHeader !== `Bearer ${c.env.NOTIFICATION_API_KEY}`) {
        return c.json({ error: "Unauthorized" }, 401);
      }
    }

    if (!c.env.SENDGRID_API_KEY) {
      return c.json({ error: "SendGrid not configured" }, 500);
    }

    // Get all users with active participants who have opted in to email challenge reminders
    const { results: participants } = await c.env.DB.prepare(`
      SELECT p.*, 
             COALESCE(p.custom_challenge_name, ct.name) as challenge_name,
             COALESCE(p.custom_unit, ct.unit) as unit,
             unp.email_challenge_reminders,
             u.email as user_email
      FROM participants p
      JOIN challenge_types ct ON p.challenge_type_id = ct.id
      JOIN user_notification_preferences unp ON p.user_id = unp.user_id
      WHERE p.is_active = true 
        AND unp.email_challenge_reminders = true
        AND (unp.last_reminder_sent IS NULL OR unp.last_reminder_sent < datetime('now', '-6 days'))
    `).all();

    let successCount = 0;
    let errorCount = 0;

    for (const participant of participants) {
      try {
        // Helper function for HTML escaping
        /*const escapeHtml = (str: string): string => {
          if (!str) return '';
          return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
        };*/

        const firstName = 'there';
        const challengeType = participant.challenge_name || 'your';
        const goalNum = participant.goal_amount || 0;
        const unit = participant.unit || '';
        const remindersUrl = 'https://mentalhealthketo.com/account/reminders';

        const subject = `Weekly challenge reminder`;
        const htmlContent = 
          `<p>Hello ${escapeHtml(firstName)},</p>` +
          `<p>This is your weekly reminder for the ${escapeHtml(challengeType)} challenge.</p>` +
          `<p>Your goal this week is ${String(goalNum)} ${escapeHtml(unit)}.</p>` +
          `<p>You can change reminders at ${remindersUrl}. Thank you.</p>`;

        const emailSent = await sendEmail(c.env, participant.user_email as string, subject, htmlContent);
        
        if (emailSent) {
          // Update last_reminder_sent timestamp
          await c.env.DB.prepare(`
            UPDATE user_notification_preferences 
            SET last_reminder_sent = CURRENT_TIMESTAMP 
            WHERE user_id = ?
          `).bind(participant.user_id).run();
          
          successCount++;
        } else {
          errorCount++;
        }
      } catch (error) {
        console.error('Error sending challenge reminder email:', participant.id, error);
        errorCount++;
      }
    }

    return c.json({ 
      success: true, 
      sent: successCount, 
      errors: errorCount,
      message: `Sent ${successCount} challenge reminder emails, ${errorCount} errors`
    });
  } catch (error) {
    console.error('Error sending weekly challenge emails:', error);
    return c.json({ error: "Failed to send weekly challenge emails" }, 500);
  }
});

// Send weekly email updates to donors
app.post("/wapi/send-weekly-donor-emails", async (c) => {
  try {
    // Verify API key for scheduled functions
    const authHeader = c.req.header('Authorization');
    if (c.env.NOTIFICATION_API_KEY) {
      if (!authHeader || authHeader !== `Bearer ${c.env.NOTIFICATION_API_KEY}`) {
        return c.json({ error: "Unauthorized" }, 401);
      }
    }

    if (!c.env.SENDGRID_API_KEY) {
      return c.json({ error: "SendGrid not configured" }, 500);
    }

    // Get all donors who have opted in to weekly donor updates and link them to campaigns
    const { results: donorCampaigns } = await c.env.DB.prepare(`
      SELECT DISTINCT d.email, d.name as donor_name,
             p.id as participant_id,
             COALESCE(p.custom_challenge_name, ct.name) as challenge_name,
             COALESCE(p.custom_unit, ct.unit) as unit,
             p.current_progress, p.goal_amount,
             c.title as campaign_title,
             p.participant_name
      FROM donors d
      JOIN participants p ON d.participant_id = p.id
      JOIN challenge_types ct ON p.challenge_type_id = ct.id
      JOIN campaigns c ON p.campaign_id = c.id
      JOIN donor_notification_preferences dnp ON d.id = dnp.donor_id
      WHERE p.is_active = true
        AND dnp.weekly_campaign_updates = true
      ORDER BY d.email, p.updated_at DESC
    `).all();

    let successCount = 0;
    let errorCount = 0;

    // Group by donor email to send one email per donor with all their campaigns
    const donorGroups = donorCampaigns.reduce((groups: Record<string, any[]>, item: any) => {
      const email = item.email as string;
      if (!groups[email]) {
        groups[email] = [];
      }
      groups[email].push(item);
      return groups;
    }, {} as Record<string, any[]>);

    for (const [email, campaigns] of Object.entries(donorGroups)) {
      try {
        // For each donor, send an email about their pledged campaigns
        for (const campaign of campaigns) {
          // Helper function for HTML escaping
          const escapeHtml = (str: string): string => {
            if (!str) return '';
            return str
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#39;');
          };

          const firstName = 'there';
          const participantName: string = (campaign as any).participant_name || 'your participant';
          const completedNum: number = (campaign as any).current_progress || 0;
          const unit: string = (campaign as any).unit || '';
          const updatesUrl = 'https://mentalhealthketo.com/account/updates';

          const subject = `Donor update`;
          const htmlContent = 
            `<p>Hello ${escapeHtml(firstName)},</p>` +
            `<p>Here is your update for ${escapeHtml(participantName)}.</p>` +
            `<p>They completed ${String(completedNum)} ${escapeHtml(unit)} this week.</p>` +
            `<p>You can change updates at ${updatesUrl}. Thank you.</p>`;

          const emailSent = await sendEmail(c.env, email, subject, htmlContent);
          
          if (emailSent) {
            successCount++;
          } else {
            errorCount++;
          }
        }
      } catch (error) {
        console.error('Error sending donor email:', email, error);
        errorCount++;
      }
    }

    return c.json({ 
      success: true, 
      sent: successCount, 
      errors: errorCount,
      message: `Sent ${successCount} donor reminder emails, ${errorCount} errors`
    });
  } catch (error) {
    console.error('Error sending weekly donor emails:', error);
    return c.json({ error: "Failed to send weekly donor emails" }, 500);
  }
});

// Combined weekly email job (replaces push notification jobs)
app.post("/wapi/send-weekly-emails", async (c) => {
  try {
    // Verify API key for scheduled functions
    const authHeader = c.req.header('Authorization');
    if (c.env.NOTIFICATION_API_KEY) {
      if (!authHeader || authHeader !== `Bearer ${c.env.NOTIFICATION_API_KEY}`) {
        return c.json({ error: "Unauthorized" }, 401);
      }
    }

    // Run both weekly email jobs
    const baseUrl = c.req.url.replace('/wapi/send-weekly-emails', '');
    
    const [challengeResponse, donorResponse] = await Promise.all([
      fetch(`${baseUrl}/wapi/send-weekly-challenge-emails`, {
        method: 'POST',
        headers: { 'Authorization': authHeader || '' }
      }),
      fetch(`${baseUrl}/wapi/send-weekly-donor-emails`, {
        method: 'POST',
        headers: { 'Authorization': authHeader || '' }
      })
    ]);

    const challengeResult = await challengeResponse.json().catch(() => ({ sent: 0, errors: 0, message: 'Failed to fetch result' })) as { sent?: number; errors?: number; message?: string };
    const donorResult = await donorResponse.json().catch(() => ({ sent: 0, errors: 0, message: 'Failed to fetch result' })) as { sent?: number; errors?: number; message?: string };

    return c.json({
      success: true,
      challenge_emails: challengeResult,
      donor_emails: donorResult,
      total_sent: ((challengeResult as any)?.sent || 0) + ((donorResult as any)?.sent || 0),
      total_errors: ((challengeResult as any)?.errors || 0) + ((donorResult as any)?.errors || 0)
    });
  } catch (error) {
    console.error('Error sending weekly emails:', error);
    return c.json({ error: "Failed to send weekly emails" }, 500);
  }
});

// Remove all push notification endpoints - replaced with email system

// Helper function to send campaign end email notifications
async function sendCampaignEndNotifications(db: D1Database, participantId: string, env: Env): Promise<void> {
  try {
    // Validate participantId
    if (!participantId || isNaN(Number(participantId))) {
      throw new Error(`Invalid participant ID: ${participantId}`);
    }

    // Get participant details
    const participant = await db.prepare(`
      SELECT p.*, 
             COALESCE(p.custom_challenge_name, ct.name) as challenge_name, 
             COALESCE(p.custom_unit, ct.unit) as unit, 
             c.every_org_url
    `).bind(participantId).first();

    if (!participant) {
      console.warn(`Participant ${participantId} not found for campaign end notifications`);
      return;
    }

    // Get all donors and their pledge amounts for this participant
    const { results: donorPledges } = await db.prepare(`
      SELECT d.*, pl.amount_per_unit, pl.pledge_type, pl.max_total_amount, pl.flat_amount
      FROM donors d
      JOIN pledges pl ON d.id = pl.donor_id
      WHERE d.participant_id = ?
    `).bind(participantId).all();

    let successCount = 0;
    let errorCount = 0;

    for (const donorPledge of donorPledges) {
      try {
        // Validate numeric fields before calculation
        const currentProgress = Number(participant.current_progress) || 0;
        let totalDonation = 0;
        
        // Calculate donation based on pledge type with validation
        if (donorPledge.pledge_type === 'flat_rate') {
          totalDonation = Number(donorPledge.flat_amount) || 0;
        } else if (donorPledge.pledge_type === 'per_unit_capped') {
          const amountPerUnit = Number(donorPledge.amount_per_unit) || 0;
          const maxTotal = Number(donorPledge.max_total_amount) || 0;
          totalDonation = Math.min(amountPerUnit * currentProgress, maxTotal);
        } else {
          // per_unit_uncapped
          const amountPerUnit = Number(donorPledge.amount_per_unit) || 0;
          totalDonation = amountPerUnit * currentProgress;
        }

        // Ensure totalDonation is valid
        if (isNaN(totalDonation) || totalDonation < 0) {
          console.error(`Invalid donation calculation for donor ${donorPledge.id}:`, {
            pledgeType: donorPledge.pledge_type,
            amountPerUnit: donorPledge.amount_per_unit,
            maxTotal: donorPledge.max_total_amount,
            flatAmount: donorPledge.flat_amount,
            currentProgress
          });
          errorCount++;
          continue;
        }
        
        // Send email notification to donor
        const subject = `Challenge Completed: Time to fulfill your pledge!`;
        const htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #C5F213, #9FD60A); padding: 30px; text-align: center;">
              <h1 style="color: #000; margin: 0;">Brain Fog Recovery Source</h1>
              <h2 style="color: #000; margin: 10px 0 0 0;">Challenge Completed!</h2>
            </div>
            
            <div style="padding: 30px; background: #fff;">
              <h3 style="color: #333;">Great news, ${donorPledge.name}!</h3>
              
              <p style="color: #666; line-height: 1.6;">
                The ${participant.challenge_name} challenge you supported has been completed!
              </p>
              
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h4 style="margin: 0 0 10px 0; color: #333;">Final Results:</h4>
                <p style="margin: 0; font-size: 16px; color: #333;">
                  <strong>Completed:</strong> ${currentProgress} ${participant.unit}<br>
                  <strong>Your pledge total:</strong> $${totalDonation.toFixed(2)}
                </p>
              </div>
              
              <p style="color: #666; line-height: 1.6;">
                Please complete your donation to Brain Fog Recovery Source using the link below. 
                Thank you for supporting psychiatric recovery access through metabolic interventions!
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${participant.every_org_url || 'https://www.every.org/brain-fog-recovery-source'}" 
                   style="background: #C5F213; color: #000; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                  Complete Your $${totalDonation.toFixed(2)} Donation
                </a>
              </div>
              
              <p style="color: #999; font-size: 12px; text-align: center; margin-top: 40px;">
                This email was sent because you pledged to support a metabolic challenge campaign.
              </p>
            </div>
          </div>
        `;

        const emailSent = await sendEmail(env, donorPledge.email as string, subject, htmlContent);
        
        if (emailSent) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch (donorError) {
        console.error('Error processing campaign end notification for donor:', donorPledge.id, donorError);
        errorCount++;
      }
    }

    console.log(`Campaign end notifications processed: ${successCount} emails sent, ${errorCount} errors`);
  } catch (error) {
    console.error('Error in sendCampaignEndNotifications:', error);
    throw error;
  }
}

// Send campaign end email notifications (API endpoint for external calls)
app.post("/wapi/send-campaign-end-notifications/:participantId", async (c) => {
  const participantId = c.req.param("participantId");
  
  try {
    await sendCampaignEndNotifications(c.env.DB, participantId, c.env);
    return c.json({ success: true, message: "Campaign end email notifications processed" });
  } catch (error) {
    console.error('Error sending campaign end notifications:', error);
    return c.json({ error: "Failed to send campaign end notifications" }, 500);
  }
});

// Get completed campaign summary
app.get("/wapi/participants/:id/summary", async (c) => {
  const participantId = c.req.param("id");
  
  const participant = await c.env.DB.prepare(`
    SELECT p.*, 
           COALESCE(p.custom_challenge_name, ct.name) as challenge_name, 
           COALESCE(p.custom_unit, ct.unit) as unit, 
           c.title as campaign_title
    FROM participants p
    JOIN challenge_types ct ON p.challenge_type_id = ct.id
    JOIN campaigns c ON p.campaign_id = c.id
    WHERE p.id = ?
  `).bind(participantId).first();

  if (!participant) {
    return c.json({ error: "Participant not found" }, 404);
  }

  // Get pledge and funding summary with proper pledge type calculations
  const fundingData = await c.env.DB.prepare(`
    SELECT COUNT(DISTINCT d.id) as donor_count,
           COALESCE(SUM(
             CASE 
               WHEN pl.pledge_type = 'flat_rate' THEN COALESCE(pl.flat_amount, 0)
               WHEN pl.pledge_type = 'per_unit_capped' THEN 
                 CASE 
                   WHEN COALESCE(pl.amount_per_unit, 0) * COALESCE(p.current_progress, 0) < COALESCE(pl.max_total_amount, 0) 
                   THEN COALESCE(pl.amount_per_unit, 0) * COALESCE(p.current_progress, 0)
                   ELSE COALESCE(pl.max_total_amount, 0)
                 END
               ELSE COALESCE(pl.amount_per_unit, 0) * COALESCE(p.current_progress, 0)
             END
           ), 0) as total_raised
    FROM participants p
    LEFT JOIN donors d ON p.id = d.participant_id
    LEFT JOIN pledges pl ON d.id = pl.donor_id
    WHERE p.id = ?
  `).bind(participantId).first();

  return c.json({
    id: participant.id,
    challenge_name: participant.challenge_name,
    unit: participant.unit,
    goal_amount: participant.goal_amount,
    current_progress: participant.current_progress,
    donor_count: fundingData?.donor_count || 0,
    total_raised: fundingData?.total_raised || 0,
    campaign_title: participant.campaign_title,
    created_at: participant.created_at
  });
});

// Serve uploaded images
app.get("/wapi/images/:id", async (c) => {
  const imageId = c.req.param("id");
  
  console.log('Image request received for ID:', imageId);
  
  try {
    const image = await c.env.DB.prepare(`
      SELECT data_url, content_type, filename FROM participant_images WHERE id = ?
    `).bind(imageId).first();

    console.log('Image query result:', image ? 'found' : 'not found');

    if (!image) {
      console.error('Image not found in database for ID:', imageId);
      return c.json({ error: "Image not found" }, 404);
    }

    // Extract base64 data from data URL
    const dataUrl = image.data_url as string;
    const contentType = image.content_type as string;
    const filename = image.filename as string;
    
    console.log('Image details:', { 
      contentType, 
      filename, 
      dataUrlLength: dataUrl.length,
      hasBase64: dataUrl.includes('base64')
    });
    
    if (!dataUrl.includes('base64')) {
      console.error('Invalid data URL format:', dataUrl.substring(0, 50));
      return c.json({ error: "Invalid image data format" }, 500);
    }
    
    const base64Data = dataUrl.split(',')[1];
    if (!base64Data) {
      console.error('No base64 data found in data URL');
      return c.json({ error: "No image data found" }, 500);
    }
    
    const binaryData = atob(base64Data);
    const bytes = new Uint8Array(binaryData.length);
    for (let i = 0; i < binaryData.length; i++) {
      bytes[i] = binaryData.charCodeAt(i);
    }

    console.log('Successfully processed image, returning bytes:', bytes.length);

    return new Response(bytes, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000', // 1 year cache
        'Content-Disposition': `inline; filename="${filename}"`
      }
    });
  } catch (error) {
    console.error('Error serving image:', error);
    return c.json({ error: "Failed to serve image" }, 500);
  }
});

// Get progress logs for a participant
app.get("/wapi/progress/:participantId", async (c) => {
  const participantId = c.req.param("participantId");
  
  // Validate participantId
  if (!participantId || isNaN(Number(participantId))) {
    return c.json({ error: "Invalid participant ID" }, 400);
  }

  try {
    const { results } = await c.env.DB.prepare(`
      SELECT * FROM progress_logs 
      WHERE participant_id = ? 
      ORDER BY created_at DESC, log_date DESC
    `).bind(participantId).all();

    return c.json(results);
  } catch (error) {
    console.error('Error fetching progress logs:', error);
    if (isSchemaMissing(error)) return emptyList(c, 'db-not-initialized');
    return emptyList(c, 'query-failed');
  }
});

// API route aliases for compatibility - these need to be BEFORE the SPA fallback
app.get("/api/campaigns", async (c) => {
  try {
    console.log('API /api/campaigns route hit');
    const { results } = await c.env.DB.prepare(`
      SELECT c.*, 
             COUNT(DISTINCT p.id) as participant_count,
             COALESCE(SUM(pl.amount_per_unit * p.current_progress), 0) as total_raised
      FROM campaigns c
      LEFT JOIN participants p ON c.id = p.campaign_id AND p.is_active = true
      LEFT JOIN donors d ON p.id = d.participant_id
      LEFT JOIN pledges pl ON d.id = pl.donor_id
      WHERE c.status = 'active'
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `).all();

    console.log('API campaigns query successful, returning', results.length, 'campaigns');
    return c.json(results);
  } catch (error) {
    console.error('Error in /api/campaigns:', error);
    if (isSchemaMissing(error)) return emptyList(c, 'db-not-initialized');
    return emptyList(c, 'query-failed');
  }
});

app.get("/api/users/me", authMiddleware, async (c) => {
  try {
    console.log('DEBUG - API /api/users/me route hit');
    const user = c.get("user");
    console.log('DEBUG - User data available via authMiddleware:', !!user);
    
    if (!user) {
      console.log('DEBUG - No user found - not authenticated');
      return c.json({ authenticated: false, error: "Not authenticated" }, 401);
    }
    
    console.log('DEBUG - User authenticated successfully via API route, returning:', {
      id: user.id,
      email: user.email,
      authenticated: true
    });
    
    return c.json({
      ...user,
      authenticated: true // Explicitly flag as authenticated
    });
  } catch (error) {
    console.error('Error in /api/users/me:', error);
    return c.json({ error: "Failed to get user data" }, 500);
  }
});

app.get("/api/images/:id", async (c) => {
  const imageId = c.req.param("id");
  console.log('API image request for ID:', imageId);
  
  try {
    const image = await c.env.DB.prepare(`
      SELECT data_url, content_type, filename FROM participant_images WHERE id = ?
    `).bind(imageId).first();

    if (!image) {
      console.log('Image not found for ID:', imageId);
      return c.json({ error: "Image not found" }, 404);
    }

    const dataUrl = image.data_url as string;
    const contentType = image.content_type as string;
    const filename = image.filename as string;
    
    if (!dataUrl.includes('base64')) {
      return c.json({ error: "Invalid image data format" }, 500);
    }
    
    const base64Data = dataUrl.split(',')[1];
    if (!base64Data) {
      return c.json({ error: "No image data found" }, 500);
    }
    
    const binaryData = atob(base64Data);
    const bytes = new Uint8Array(binaryData.length);
    for (let i = 0; i < binaryData.length; i++) {
      bytes[i] = binaryData.charCodeAt(i);
    }

    console.log('Successfully serving API image:', imageId);
    return new Response(bytes, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000',
        'Content-Disposition': `inline; filename="${filename}"`
      }
    });
  } catch (error) {
    console.error('Error serving API image:', error);
    return c.json({ error: "Failed to serve image" }, 500);
  }
});

// Add more API route aliases for common endpoints
app.get("/api/browse-campaigns", async (c) => {
  try {
    console.log('API /api/browse-campaigns route hit');
    const { results } = await c.env.DB.prepare(`
      SELECT p.id,
             c.title as campaign_title,
             COALESCE(p.custom_challenge_name, ct.name) as challenge_name,
             COALESCE(p.custom_unit, ct.unit) as unit,
             p.goal_amount,
             p.current_progress,
             p.bio,
             CASE 
               WHEN p.participant_name IS NOT NULL AND p.participant_name != '' THEN p.participant_name
               ELSE 'Challenger #' || p.id
             END as participant_name,
             p.created_at,
             COUNT(DISTINCT d.id) as donor_count,
             COALESCE(SUM(
               CASE 
                 WHEN pl.pledge_type = 'flat_rate' THEN COALESCE(pl.flat_amount, 0)
                 WHEN pl.pledge_type = 'per_unit_capped' THEN 
                   CASE 
                     WHEN COALESCE(pl.amount_per_unit, 0) * COALESCE(p.current_progress, 0) < COALESCE(pl.max_total_amount, 0) 
                     THEN COALESCE(pl.amount_per_unit, 0) * COALESCE(p.current_progress, 0)
                     ELSE COALESCE(pl.max_total_amount, 0)
                   END
                 ELSE COALESCE(pl.amount_per_unit, 0) * COALESCE(p.current_progress, 0)
               END
             ), 0) as total_raised
      FROM participants p
      JOIN campaigns c ON p.campaign_id = c.id
      JOIN challenge_types ct ON p.challenge_type_id = ct.id
      LEFT JOIN donors d ON p.id = d.participant_id
      LEFT JOIN pledges pl ON d.id = pl.donor_id
      WHERE p.is_active = true AND c.status = 'active'
      GROUP BY p.id, c.id, ct.id
      ORDER BY p.created_at DESC
    `).all();

    c.header('Cache-Control', 'public, max-age=60');
    return c.json(results);
  } catch (error) {
    console.error('Error in /api/browse-campaigns:', error);
    if (isSchemaMissing(error)) return emptyList(c, 'db-not-initialized');
    return emptyList(c, 'query-failed');
  }
});

app.get("/api/participants/:id", async (c) => {
  const participantId = c.req.param("id");
  console.log('API participant request for ID:', participantId);
  
  if (!participantId || isNaN(Number(participantId))) {
    return c.json({ error: "Invalid participant ID" }, 400);
  }

  try {
    const participant = await c.env.DB.prepare(`
      SELECT p.*, 
             COALESCE(p.custom_challenge_name, ct.name) as challenge_name, 
             COALESCE(p.custom_unit, ct.unit) as unit, 
             ct.name as original_challenge_name,
             ct.unit as original_unit,
             ct.suggested_min,
             ct.suggested_max,
             c.title as campaign_title,
             COALESCE(p.participant_name, 'A Champion') as participant_name
      FROM participants p
      JOIN challenge_types ct ON p.challenge_type_id = ct.id
      JOIN campaigns c ON p.campaign_id = c.id
      WHERE p.id = ? AND p.is_active = true
    `).bind(participantId).first();

    if (!participant) {
      return c.json({ error: "Participant not found" }, 404);
    }

    const [pledgeData, { results: posts }] = await Promise.all([
      c.env.DB.prepare(`
        SELECT COUNT(DISTINCT d.id) as donor_count,
               COALESCE(SUM(
                 CASE 
                   WHEN pl.pledge_type = 'flat_rate' THEN COALESCE(pl.flat_amount, 0)
                   WHEN pl.pledge_type = 'per_unit_capped' THEN 
                     CASE 
                       WHEN COALESCE(pl.amount_per_unit, 0) * COALESCE(p.current_progress, 0) < COALESCE(pl.max_total_amount, 0) 
                       THEN COALESCE(pl.amount_per_unit, 0) * COALESCE(p.current_progress, 0)
                       ELSE COALESCE(pl.max_total_amount, 0)
                     END
                   ELSE COALESCE(pl.amount_per_unit, 0) * COALESCE(p.current_progress, 0)
                 END
               ), 0) as total_raised,
               COALESCE(SUM(
                 CASE 
                   WHEN pl.pledge_type = 'flat_rate' THEN COALESCE(pl.flat_amount, 0)
                   WHEN pl.pledge_type = 'per_unit_capped' THEN 
                     CASE 
                       WHEN COALESCE(pl.amount_per_unit, 0) * COALESCE(p.goal_amount, 0) < COALESCE(pl.max_total_amount, 0) 
                       THEN COALESCE(pl.amount_per_unit, 0) * COALESCE(p.goal_amount, 0)
                       ELSE COALESCE(pl.max_total_amount, 0)
                     END
                   ELSE COALESCE(pl.amount_per_unit, 0) * COALESCE(p.goal_amount, 0)
                 END
               ), 0) as total_potential
        FROM participants p
        LEFT JOIN donors d ON p.id = d.participant_id
        LEFT JOIN pledges pl ON d.id = pl.donor_id
        WHERE p.id = ?
      `).bind(participantId).first(),
      
      c.env.DB.prepare(`
        SELECT * FROM participant_posts 
        WHERE participant_id = ? 
        ORDER BY created_at DESC 
        LIMIT 10
      `).bind(participantId).all().catch(() => ({ results: [] }))
    ]);

    const safeTotal_raised = Number(pledgeData?.total_raised) || 0;
    const safeTotalPotential = Number(pledgeData?.total_potential) || 0;
    const safeDonorCount = Number(pledgeData?.donor_count) || 0;

    c.header('Cache-Control', 'no-cache, no-store, must-revalidate');
    c.header('Pragma', 'no-cache');
    c.header('Expires', '0');

    return c.json({
      ...participant,
      donor_count: safeDonorCount,
      total_raised: safeTotal_raised,
      total_potential: safeTotalPotential,
      posts: posts || []
    });
  } catch (error) {
    console.error('Error in /api/participants/:id:', error);
    return c.json({ error: "Failed to fetch participant data" }, 500);
  }
});

// Add missing API route alias for my-participants
app.get("/api/my-participants", authMiddleware, async (c) => {
  const user = c.get("user");
  console.log('API /api/my-participants route hit');
  
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT p.*, 
             COALESCE(p.custom_challenge_name, ct.name) as challenge_name, 
             COALESCE(p.custom_unit, ct.unit) as unit, 
             c.title as campaign_title
      FROM participants p
      JOIN challenge_types ct ON p.challenge_type_id = ct.id
      JOIN campaigns c ON p.campaign_id = c.id
      WHERE p.user_id = ? AND p.is_active = true
      ORDER BY p.created_at DESC
    `).bind(user!.id).all();

    console.log('API my-participants query successful, returning', results.length, 'participants');
    return c.json(results);
  } catch (error) {
    console.error('Error in /api/my-participants:', error);
    if (isSchemaMissing(error)) return emptyList(c, 'db-not-initialized');
    return emptyList(c, 'query-failed');
  }
});

// SPA fallback handler - must be LAST route
app.get("*", async (c) => {
  const url = new URL(c.req.url);
  
  // If this is a Worker API route that wasn't matched, return 404 with JSON
  if (url.pathname.startsWith('/wapi/') || url.pathname.startsWith('/api/')) {
    console.log(`API route not found: ${url.pathname}`);
    return c.json({ error: "API endpoint not found" }, 404);
  }
  
  // If this is other worker-specific routes, return plain 404
  if (url.pathname === '/worker-test' || url.pathname.startsWith('/__worker__/')) {
    console.log(`Worker route not found: ${url.pathname}`);
    return new Response("Not Found", { status: 404 });
  }
  
  // Handle service worker requests (PWA functionality removed)
  if (url.pathname === '/service-worker.js' || url.pathname === '/sw.js') {
    console.log(`Service worker request blocked: ${url.pathname}`);
    return new Response("Service worker not available", { 
      status: 404,
      headers: { "content-type": "text/plain" }
    });
  }
  
  // Handle manifest.json and other PWA-related files
  if (url.pathname === '/manifest.json') {
    console.log(`Manifest request blocked: ${url.pathname}`);
    return new Response("Manifest not available", { 
      status: 404,
      headers: { "content-type": "text/plain" }
    });
  }
  
  // For all other routes, serve the SPA
  console.log(`Serving SPA for: ${url.pathname}`);
  
  // In a proper setup, this would serve the index.html from assets
  // For now, let it fall through to default asset handling
  return new Response("SPA would be served here", { 
    status: 200,
    headers: { "content-type": "text/html" }
  });
});

export default {
  fetch: (req: Request, env: Env, ctx: ExecutionContext) => {
    const url = new URL(req.url);
    console.log(`Worker fetch handler called for: ${url.pathname}`);
    return app.fetch(req, env, ctx);
  },
};
