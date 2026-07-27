import type { NextFunction, Request, RequestHandler, Response } from 'express';

export const USER_ROLES = {
  MEMBER: 'MEMBER',
  ADMIN: 'ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN'
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export function normalizeRole(role: unknown): string {
  return String(role || '').trim().toUpperCase();
}

export function hasAnyRole(role: unknown, allowedRoles: readonly UserRole[]): boolean {
  return allowedRoles.includes(normalizeRole(role) as UserRole);
}

export function canCreateRole(actorRole: unknown, requestedRole: unknown): boolean {
  const actor = normalizeRole(actorRole);
  const requested = normalizeRole(requestedRole);
  if (actor === USER_ROLES.SUPER_ADMIN) {
    return hasAnyRole(requested, Object.values(USER_ROLES));
  }
  return actor === USER_ROLES.ADMIN && requested === USER_ROLES.MEMBER;
}

export function canUpdateMemberRole(
  actorRole: unknown,
  targetRole: unknown,
  requestedRole: unknown
): boolean {
  const actor = normalizeRole(actorRole);
  const target = normalizeRole(targetRole);
  const requested = normalizeRole(requestedRole);
  if (actor === USER_ROLES.SUPER_ADMIN) {
    return hasAnyRole(requested, Object.values(USER_ROLES));
  }
  return (
    actor === USER_ROLES.ADMIN &&
    target === USER_ROLES.MEMBER &&
    requested === USER_ROLES.MEMBER
  );
}

export function requireRoles(...allowedRoles: UserRole[]): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!hasAnyRole((req as any).user?.role, allowedRoles)) {
      return res.status(403).json({
        success: false,
        message: '요청을 처리할 권한이 없습니다.'
      });
    }
    next();
  };
}

export const requireAdmin = requireRoles(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN);
export const requireSuperAdmin = requireRoles(USER_ROLES.SUPER_ADMIN);
