import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../gateway/logger';

// ── BFF — Backend for Frontend ────────────────────────────────────────────────
// Håndterer brukerinnlogging via OAuth 2.0 PKCE mot Telenors SSO/IDP.
// Holder access tokens server-side — nettleseren ser kun session-cookie.
// Videresender autoriserte kall til intern gateway med API-nøkkel.

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(
  session({
    secret: process.env.BFF_SESSION_SECRET || 'change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.GATEWAY_ENV === 'production',
      sameSite: 'strict',
      maxAge: 8 * 60 * 60 * 1000, // 8 timer
    },
  })
);

const GATEWAY_URL = process.env.BFF_GATEWAY_URL || 'http://localhost:3000';
const BFF_API_KEY = process.env.BFF_API_KEY || 'key-crm-ui-bff';

// ── Typed session ─────────────────────────────────────────────────────────────
declare module 'express-session' {
  interface SessionData {
    userId?: string;
    accessToken?: string;
    state?: string;
  }
}

// ── OAuth: start innlogging ───────────────────────────────────────────────────
app.get('/auth/login', (req, res) => {
  const state = uuidv4();
  req.session.state = state;

  const params = new URLSearchParams({
    client_id: process.env.BFF_OAUTH_CLIENT_ID || '',
    response_type: 'code',
    redirect_uri: process.env.BFF_OAUTH_REDIRECT_URI || '',
    scope: 'openid profile email',
    state,
    response_mode: 'query',
  });

  res.redirect(`${process.env.BFF_OAUTH_ISSUER}/oauth2/v2.0/authorize?${params}`);
});

// ── OAuth: callback ───────────────────────────────────────────────────────────
app.get('/auth/callback', async (req, res) => {
  const { code, state } = req.query as Record<string, string>;

  if (!state || state !== req.session.state) {
    return res.status(400).json({ error: 'Ugyldig state-parameter' });
  }

  try {
    const tokenRes = await axios.post(
      `${process.env.BFF_OAUTH_ISSUER}/oauth2/v2.0/token`,
      new URLSearchParams({
        client_id: process.env.BFF_OAUTH_CLIENT_ID || '',
        client_secret: process.env.BFF_OAUTH_CLIENT_SECRET || '',
        code,
        grant_type: 'authorization_code',
        redirect_uri: process.env.BFF_OAUTH_REDIRECT_URI || '',
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    // Token lagres server-side i session — aldri eksponert til nettleseren
    req.session.accessToken = tokenRes.data.access_token;
    req.session.userId = parseUserId(tokenRes.data.id_token);
    delete req.session.state;

    res.redirect('/');
  } catch (err: any) {
    logger.error('bff_oauth_callback_failed', { error: err.message });
    res.status(500).json({ error: 'Innlogging feilet' });
  }
});

// ── Logout ────────────────────────────────────────────────────────────────────
app.post('/auth/logout', (req, res) => {
  req.session.destroy(() => res.json({ loggedOut: true }));
});

// ── Proxy til gateway — kun for innloggede brukere ────────────────────────────
function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!req.session.accessToken) {
    return res.status(401).json({ error: 'Ikke innlogget' });
  }
  next();
}

async function proxyToGateway(path: string, req: express.Request, res: express.Response) {
  try {
    const response = await axios({
      method: req.method,
      url: `${GATEWAY_URL}${path}`,
      headers: {
        'x-api-key': BFF_API_KEY,
        'x-correlation-id': uuidv4(),
        'x-user-id': req.session.userId || 'unknown', // For audit logging i gateway
        'content-type': 'application/json',
      },
      data: req.body,
      params: req.query,
    });
    res.status(response.status).json(response.data);
  } catch (err: any) {
    const status = err.response?.status || 502;
    res.status(status).json(err.response?.data || { error: err.message });
  }
}

// ── BFF API-endepunkter mot Salesforce ────────────────────────────────────────
app.get('/api/sf/query', requireAuth, (req, res) => proxyToGateway('/v1/sf/query', req, res));
app.get('/api/sf/objects/:sobject/:id', requireAuth, (req, res) => proxyToGateway(`/v1/sf/objects/${req.params.sobject}/${req.params.id}`, req, res));
app.post('/api/sf/objects/:sobject', requireAuth, (req, res) => proxyToGateway(`/v1/sf/objects/${req.params.sobject}`, req, res));
app.patch('/api/sf/objects/:sobject/:id', requireAuth, (req, res) => proxyToGateway(`/v1/sf/objects/${req.params.sobject}/${req.params.id}`, req, res));

// ── Hjelpefunksjon: hent bruker-ID fra ID-token ───────────────────────────────
function parseUserId(idToken: string): string {
  try {
    const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString());
    return payload.sub || payload.oid || 'unknown';
  } catch {
    return 'unknown';
  }
}

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.BFF_PORT || '3001', 10);
app.listen(PORT, () => {
  logger.info('bff_started', { port: PORT });
});

export default app;
