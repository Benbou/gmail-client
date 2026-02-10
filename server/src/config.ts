function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name: string, fallback: string): string {
  return process.env[name] || fallback;
}

export const config = {
  port: parseInt(optional('PORT', '8080'), 10),

  // EmailEngine
  emailengineUrl: required('EMAILENGINE_URL'),
  emailengineToken: required('EMAILENGINE_TOKEN'),
  emailengineGmailAppId: optional('EMAILENGINE_GMAIL_APP_ID', ''),

  // Supabase
  supabaseUrl: required('SUPABASE_URL'),
  supabaseServiceKey: required('SUPABASE_SERVICE_KEY'),

  // Google OAuth (for redirect URI construction)
  googleClientId: optional('GOOGLE_CLIENT_ID', ''),
  googleClientSecret: optional('GOOGLE_CLIENT_SECRET', ''),

  // Frontend
  frontendUrl: optional('FRONTEND_URL', 'http://localhost:5173'),

  // Webhook secret (optional, for verifying EE webhooks)
  webhookSecret: optional('WEBHOOK_SECRET', ''),
} as const;
