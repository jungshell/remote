import jwt from 'jsonwebtoken';
import { getJwtSecret } from './jwtSecret';

export interface JwtPayload {
  userId: number;
  role: string;
}

/**
 * JWT 토큰을 발급합니다.
 */
export function signJwt(payload: JwtPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '7d' });
}

/**
 * JWT 토큰을 검증합니다.
 */
export function verifyJwt(token: string): JwtPayload {
  return jwt.verify(token, getJwtSecret()) as JwtPayload;
}
