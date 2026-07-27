const {
  USER_ROLES,
  canCreateRole,
  canUpdateMemberRole,
  hasAnyRole,
  requireAdmin,
  requireSuperAdmin,
} = require('../dist/middlewares/authorization');

function invoke(middleware, role) {
  const req = { user: { userId: 1, role } };
  const result = { statusCode: null, body: null, nextCalled: false };
  const res = {
    status(code) {
      result.statusCode = code;
      return this;
    },
    json(body) {
      result.body = body;
      return this;
    },
  };
  middleware(req, res, () => {
    result.nextCalled = true;
  });
  return result;
}

describe('authorization middleware', () => {
  test('역할 문자열을 대소문자와 공백에 안전하게 비교한다', () => {
    expect(hasAnyRole(' admin ', [USER_ROLES.ADMIN])).toBe(true);
    expect(hasAnyRole('member', [USER_ROLES.ADMIN])).toBe(false);
  });

  test('관리자 기능은 ADMIN과 SUPER_ADMIN만 허용한다', () => {
    expect(invoke(requireAdmin, USER_ROLES.ADMIN).nextCalled).toBe(true);
    expect(invoke(requireAdmin, USER_ROLES.SUPER_ADMIN).nextCalled).toBe(true);
    expect(invoke(requireAdmin, USER_ROLES.MEMBER).statusCode).toBe(403);
  });

  test('위험한 회원 관리 기능은 SUPER_ADMIN만 허용한다', () => {
    expect(invoke(requireSuperAdmin, USER_ROLES.SUPER_ADMIN).nextCalled).toBe(true);
    expect(invoke(requireSuperAdmin, USER_ROLES.ADMIN).statusCode).toBe(403);
  });

  test('일반 관리자는 일반회원만 생성·수정하고 역할을 올릴 수 없다', () => {
    expect(canCreateRole(USER_ROLES.ADMIN, USER_ROLES.MEMBER)).toBe(true);
    expect(canCreateRole(USER_ROLES.ADMIN, USER_ROLES.ADMIN)).toBe(false);
    expect(
      canUpdateMemberRole(USER_ROLES.ADMIN, USER_ROLES.MEMBER, USER_ROLES.MEMBER)
    ).toBe(true);
    expect(
      canUpdateMemberRole(USER_ROLES.ADMIN, USER_ROLES.ADMIN, USER_ROLES.ADMIN)
    ).toBe(false);
    expect(
      canUpdateMemberRole(USER_ROLES.ADMIN, USER_ROLES.MEMBER, USER_ROLES.ADMIN)
    ).toBe(false);
  });

  test('슈퍼관리자는 유효한 역할을 생성·변경할 수 있다', () => {
    expect(canCreateRole(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN)).toBe(true);
    expect(
      canUpdateMemberRole(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MEMBER)
    ).toBe(true);
  });
});
