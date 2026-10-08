// 실제 DB 없이 Prisma를 모킹해 "매 요청 DB 상태 재조회"를 검증한다.
const mockFindUnique = jest.fn();
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => ({ user: { findUnique: mockFindUnique } })),
}));

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-for-middleware-0123456789';
const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../dist/utils/jwtSecret');
const { authenticateToken } = require('../dist/middlewares/authMiddleware');

const call = async () => {
  const token = jwt.sign({ userId: 7 }, getJwtSecret());
  const req = { headers: { authorization: `Bearer ${token}` } };
  const res = { statusCode: 200, body: null, status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; return this; } };
  const next = jest.fn();
  await authenticateToken(req, res, next);
  return { req, res, next };
};

test('TEST 3: 같은 토큰이라도 SUSPENDED → ACTIVE 복구 후 다음 요청부터 통과', async () => {
  mockFindUnique.mockResolvedValueOnce({ role: 'MEMBER', status: 'SUSPENDED' });
  const blocked = await call();
  expect(blocked.res.statusCode).toBe(403);
  expect(blocked.res.body.memberStatus).toBe('SUSPENDED');
  expect(blocked.next).not.toHaveBeenCalled();

  mockFindUnique.mockResolvedValueOnce({ role: 'MEMBER', status: 'ACTIVE' });
  const ok = await call();
  expect(ok.next).toHaveBeenCalled();
  expect(ok.req.user).toEqual({ userId: 7, role: 'MEMBER' });
});
