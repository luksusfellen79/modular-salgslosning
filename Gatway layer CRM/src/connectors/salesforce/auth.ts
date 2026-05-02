import axios from 'axios';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import { logger } from '../../gateway/logger';

// ── Salesforce OAuth 2.0 JWT Bearer Flow ──────────────────────────────────────
// Server-til-server auth. Ingen brukerinteraksjon.
// Private key fra Telenors secret store (aldri i kode).

interface TokenCache {
  accessToken: string;
  expiresAt: number; // ms epoch
}

let tokenCache: TokenCache | null = null;

export async function getSalesforceToken(): Promise<string> {
  // Bruk cachet token hvis det er gyldig (med 60s buffer)
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) {
    return tokenCache.accessToken;
  }

  const instanceUrl = process.env.SF_INSTANCE_URL!;
  const clientId = process.env.SF_CLIENT_ID!;
  const username = process.env.SF_USERNAME!;
  const privateKeyPath = process.env.SF_PRIVATE_KEY_PATH!;

  const privateKey = fs.readFileSync(privateKeyPath, 'utf8');

  // Bygg JWT
  const claim = {
    iss: clientId,
    sub: username,
    aud: instanceUrl,
    exp: Math.floor(Date.now() / 1000) + 300, // 5 min
  };

  const signedJwt = jwt.sign(claim, privateKey, { algorithm: 'RS256' });

  // Veksle JWT mot access token
  const params = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: signedJwt,
  });

  const response = await axios.post(`${instanceUrl}/services/oauth2/token`, params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  const { access_token, issued_at } = response.data;

  // SF tokens er gyldige i ca. 1-2 timer — cache dem
  tokenCache = {
    accessToken: access_token,
    expiresAt: parseInt(issued_at) + 3600_000, // 1 time fra utstedelse
  };

  logger.info('sf_token_refreshed');
  return access_token;
}
