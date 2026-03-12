import jwt from 'jsonwebtoken';

process.env.JWT_SECRET = 'test-secret';

import { protect } from '../src/middleware/auth';
import { Request, Response, NextFunction } from 'express';

function makeReq(headers: Record<string, string> = {}): Request {
  return { headers } as unknown as Request;
}
function makeRes(): Response {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
}

describe('protect middleware', () => {
  const token = jwt.sign({ userId: 1, role: 'ADMIN' }, 'test-secret');

  it('passes with a valid Bearer token', () => {
    const req = makeReq({ authorization: `Bearer ${token}` });
    const next = jest.fn() as NextFunction;
    protect(req, makeRes(), next);
    expect(next).toHaveBeenCalled();
    expect((req as any).user).toEqual({ userId: 1, role: 'ADMIN' });
  });

  it('rejects missing Authorization header', () => {
    const res = makeRes();
    protect(makeReq(), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('rejects invalid token', () => {
    const res = makeRes();
    protect(makeReq({ authorization: 'Bearer badtoken' }), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('old cookie bypass no longer works', () => {
    const res = makeRes();
    protect(makeReq({ cookie: 'next-auth.session-token=anything' }), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
