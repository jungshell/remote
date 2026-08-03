import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { getJwtSecret } from '../utils/jwtSecret';

const prisma = new PrismaClient();

type AuthTokenPayload = {
  id?: number;
  userId?: number;
};

/**
 * JWT 서명과 현재 회원 상태/권한을 함께 검증한다.
 * 토큰은 장기간 유지하되 정지, 비활성화, 권한 변경은 즉시 반영한다.
 */
export async function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

  if (!token) {
    return res.status(401).json({ message: '인증 토큰이 필요합니다.' });
  }

  try {
    const payload = jwt.verify(token, getJwtSecret()) as AuthTokenPayload;
    const userId = payload.userId || payload.id;

    if (!userId) {
      return res.status(401).json({ message: '사용자 정보가 없는 토큰입니다.' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, status: true }
    });

    if (!user) {
      return res.status(401).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({
        message: '현재 이용할 수 없는 계정입니다. 관리자에게 확인해주세요.',
        memberStatus: user.status
      });
    }

    req.user = { userId, role: user.role || 'MEMBER' };
    return next();
  } catch {
    return res.status(401).json({ message: '유효하지 않은 토큰입니다.' });
  }
}

/**
 * 공개 조회 API에서 유효한 활성 회원 토큰이 있을 때만 req.user를 주입한다.
 */
export async function optionalAuthenticateToken(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  if (!token) return next();

  try {
    const payload = jwt.verify(token, getJwtSecret()) as AuthTokenPayload;
    const userId = payload.userId || payload.id;
    if (!userId) return next();

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, status: true }
    });

    if (user?.status === 'ACTIVE') {
      req.user = { userId, role: user.role || 'MEMBER' };
    }
  } catch {
    // 공개 조회는 익명으로 계속하되 민감 필드는 반환하지 않는다.
  }

  return next();
}
