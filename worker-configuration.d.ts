/// <reference types="@cloudflare/workers-types" />

interface Env {
  // Database
  DB: D1Database;

  // Authentication
  MOCHA_USERS_SERVICE_API_URL: string;
  MOCHA_USERS_SERVICE_API_KEY: string;

  // AWS SES (new)
  AWS_ACCESS_KEY_ID: string;       // secret
  AWS_SECRET_ACCESS_KEY: string;   // secret
  AWS_SES_REGION: string;          // e.g. "us-east-1"
  SENDER_FROM: string;             // e.g. "Brain Fog <no-reply@yourdomain.com>"


  // Email service (optional)
  SENDGRID_API_KEY?: string;
  SENDER_FROM?: string;

  // Push notifications (optional)
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_SUBJECT?: string;

  // Storage (optional)
  BUCKET?: R2Bucket;
  R2_PUBLIC_DOMAIN?: string;

  // API security (optional)
  NOTIFICATION_API_KEY?: string;
}
