import { createHmac } from 'node:crypto';

/**
 * Vercel function for the standalone (live) build: stands in for the WordPress
 * plugin's session-token route. Signs a short-lived session token for a demo user,
 * the same way the plugin and `npm run token:dev` do.
 *
 * Environment (Vercel → Settings → Environment Variables; never VITE_-prefixed):
 *   PZI_TOKEN_SECRET     the backend's APP_TOKEN_SECRET (required)
 *   PZI_DEMO_USER_ID     WordPress user whose pets are shown (default 31)
 *   PZI_DEMO_USER_NAME, PZI_DEMO_USER_EMAIL
 *   PZI_TOKEN_ISSUER, PZI_TOKEN_AUDIENCE   only if the backend overrides its defaults
 *
 * Anyone who can open the deployment acts as this demo user on the backend.
 */
const TOKEN_TTL_SECONDS = 15 * 60;

export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Use GET or POST' } });
    return;
  }

  const secret = process.env.PZI_TOKEN_SECRET;
  if (!secret) {
    res.status(500).json({ error: { code: 'NOT_CONFIGURED', message: 'PZI_TOKEN_SECRET is not set' } });
    return;
  }

  const user = {
    id: Number(process.env.PZI_DEMO_USER_ID || 31),
    name: process.env.PZI_DEMO_USER_NAME || 'Vivek Raj',
  };
  const now = Math.floor(Date.now() / 1000);
  const token = sign(
    {
      sub: String(user.id),
      name: user.name,
      email: process.env.PZI_DEMO_USER_EMAIL || 'test@example.com',
      iss: process.env.PZI_TOKEN_ISSUER || 'petzadore-wp',
      aud: process.env.PZI_TOKEN_AUDIENCE || 'petzadore-insurance-api',
      iat: now,
      exp: now + TOKEN_TTL_SECONDS,
    },
    secret,
  );

  // Same shape as the plugin's refresh route, plus the user for the first load.
  res.status(200).json({ token, expiresAt: (now + TOKEN_TTL_SECONDS) * 1000, user });
}

/** HS256 JWT. */
function sign(claims, secret) {
  const encode = (part) => Buffer.from(JSON.stringify(part)).toString('base64url');
  const unsigned = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(claims)}`;
  const signature = createHmac('sha256', secret).update(unsigned).digest('base64url');
  return `${unsigned}.${signature}`;
}
