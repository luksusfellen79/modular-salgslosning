import axios, { AxiosInstance } from 'axios';
import { getSalesforceToken } from './auth';
import { makeConnectorError } from '../base/connector.interface';
import { logger } from '../../gateway/logger';

// ── Salesforce REST API-klient ────────────────────────────────────────────────

function getSfClient(): AxiosInstance {
  const instance = axios.create({
    baseURL: `${process.env.SF_INSTANCE_URL}/services/data/${process.env.SF_API_VERSION || 'v62.0'}`,
  });

  // Inject auth-token på alle kall
  instance.interceptors.request.use(async (config) => {
    const token = await getSalesforceToken();
    config.headers['Authorization'] = `Bearer ${token}`;
    return config;
  });

  return instance;
}

export async function sfGet(path: string, correlationId: string) {
  const client = getSfClient();
  try {
    const res = await client.get(path);
    return res.data;
  } catch (err: any) {
    const status = err.response?.status;
    const sfError = err.response?.data?.[0];
    throw makeConnectorError(
      sfError?.errorCode || 'SF_ERROR',
      sfError?.message || err.message,
      'salesforce-connector',
      correlationId,
      status === 503 || status === 504
    );
  }
}

export async function sfPost(path: string, body: unknown, correlationId: string) {
  const client = getSfClient();
  try {
    const res = await client.post(path, body);
    return res.data;
  } catch (err: any) {
    const sfError = err.response?.data?.[0];
    throw makeConnectorError(
      sfError?.errorCode || 'SF_CREATE_ERROR',
      sfError?.message || err.message,
      'salesforce-connector',
      correlationId,
      false
    );
  }
}

export async function sfPatch(path: string, body: unknown, correlationId: string) {
  const client = getSfClient();
  try {
    await client.patch(path, body);
  } catch (err: any) {
    const sfError = err.response?.data?.[0];
    throw makeConnectorError(
      sfError?.errorCode || 'SF_UPDATE_ERROR',
      sfError?.message || err.message,
      'salesforce-connector',
      correlationId,
      false
    );
  }
}

export async function sfDelete(path: string, correlationId: string) {
  const client = getSfClient();
  try {
    await client.delete(path);
  } catch (err: any) {
    const sfError = err.response?.data?.[0];
    throw makeConnectorError(
      sfError?.errorCode || 'SF_DELETE_ERROR',
      sfError?.message || err.message,
      'salesforce-connector',
      correlationId,
      false
    );
  }
}

export async function sfQuery(soql: string, correlationId: string) {
  return sfGet(`/query?q=${encodeURIComponent(soql)}`, correlationId);
}
