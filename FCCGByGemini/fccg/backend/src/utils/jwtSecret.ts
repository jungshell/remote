const DEVELOPMENT_JWT_SECRET = 'fc-chalggyeo-secret-development-only';

export function getJwtSecret(): string {
  const configuredSecret = process.env.JWT_SECRET?.trim();
  if (configuredSecret) return configuredSecret;

  if (process.env.NODE_ENV === 'production') {
    throw new Error('프로덕션 환경에는 JWT_SECRET 설정이 필요합니다.');
  }

  return DEVELOPMENT_JWT_SECRET;
}
