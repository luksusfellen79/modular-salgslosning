import { parseHubSession, requireSuperadmin, superadminSessionToken } from '../src/auth';
import { Request, Response, NextFunction } from 'express';

describe('parseHubSession', () => {
  it('parser gyldig superadmin-token', () => {
    const user = parseHubSession(superadminSessionToken());
    expect(user?.role).toBe('superadmin');
  });

  it('returnerer null ved ugyldig JSON', () => {
    expect(parseHubSession('not-json')).toBeNull();
  });

  it('returnerer null uten role', () => {
    expect(parseHubSession(encodeURIComponent(JSON.stringify({ name: 'x' })))).toBeNull();
  });
});

describe('requireSuperadmin', () => {
  const next = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('blokkerer ikke-superadmin', () => {
    const res = { status: jest.fn().mockReturnThis(), send: jest.fn() } as unknown as Response;
    const req = {
      query: { hub_session: encodeURIComponent(JSON.stringify({ role: 'selger_sdu' })) },
      headers: {},
    } as unknown as Request;

    requireSuperadmin(req, res, next as NextFunction);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('slipper gjennom superadmin og setter cookie', () => {
    const res = { status: jest.fn().mockReturnThis(), send: jest.fn(), setHeader: jest.fn() } as unknown as Response;
    const token = superadminSessionToken();
    const req = { query: { hub_session: token }, headers: {} } as unknown as Request;

    requireSuperadmin(req, res, next as NextFunction);
    expect(next).toHaveBeenCalled();
    expect(res.setHeader).toHaveBeenCalledWith('Set-Cookie', expect.stringContaining('devcenter_hub_session='));
  });
});
