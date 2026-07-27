import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { getJwtSecret } from '../utils/jwtSecret';

const prisma = new PrismaClient();

/**
 * JWT 토큰을 검증하고 req.user에 userId/role을 주입하는 미들웨어
 */
export async function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: '토큰이 필요합니다.' });
  }
  
  try {
    const payload = jwt.verify(token, getJwtSecret()) as { id?: number; userId?: number; role?: string };
    const userId = payload.userId || payload.id;
    let role = payload.role;

    if (!role && userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }
      });
      role = user?.role || 'MEMBER';
    }

    req.user = { userId, role: role || 'USER' };
    next();
  } catch (e) {
    return res.status(401).json({ message: '유효하지 않은 토큰입니다.' });
  }
}

/**
 * 공개 조회 API에서 토큰이 있으면 사용자 역할을 주입하고,
 * 토큰이 없거나 유효하지 않으면 익명 요청으로 계속 진행한다.
 */
export async function optionalAuthenticateToken(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return next();

  try {
    const payload = jwt.verify(token, getJwtSecret()) as { id?: number; userId?: number; role?: string };
    const userId = payload.userId || payload.id;
    let role = payload.role;
    if (!role && userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }
      });
      role = user?.role;
    }
    req.user = { userId, role: role || 'USER' };
  } catch {
    // 공개 조회는 익명으로 계속하되, 민감 필드는 반환하지 않는다.
  }
  next();
}
