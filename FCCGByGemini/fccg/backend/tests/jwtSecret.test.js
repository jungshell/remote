const { getJwtSecret } = require('../dist/utils/jwtSecret');

describe('getJwtSecret', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalJwtSecret = process.env.JWT_SECRET;

  afterEach(() => {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    if (originalJwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalJwtSecret;
  });

  test('설정된 운영 비밀키를 사용한다', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'configured-production-secret';
    expect(getJwtSecret()).toBe('configured-production-secret');
  });

  test('프로덕션에서 비밀키가 없으면 서버 시작을 거부한다', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.JWT_SECRET;
    expect(() => getJwtSecret()).toThrow('JWT_SECRET');
  });

  test('개발 환경에서만 개발용 키를 허용한다', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.JWT_SECRET;
    expect(getJwtSecret()).toContain('development-only');
  });
});
