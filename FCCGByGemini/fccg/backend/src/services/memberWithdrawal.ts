import type { Prisma } from '@prisma/client';
import { hasAnyRole, USER_ROLES } from '../middlewares/authorization';

// 회원 "삭제" = 탈퇴 처리. 계정 식별정보만 익명화하고 팀 기록(경기·출석·사진·댓글·과거 투표 등)은 보존한다.
// User 행이 남으므로 모든 FK(RESTRICT)가 그대로 유효하다.

export class MemberWithdrawalError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// '@invalid'는 점 없는 도메인이라 가입/회원추가 이메일 검증(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)을 통과할 수 없어
// 실제 회원 이메일과 충돌하지 않고, memberId가 유일하므로 익명 이메일끼리도 충돌하지 않는다.
export function anonymizedEmail(memberId: number) {
  return `deleted+${memberId}@invalid`;
}

export function buildWithdrawalData(memberId: number, passwordHash: string, now = new Date()) {
  return {
    status: 'DELETED',
    role: USER_ROLES.MEMBER,
    name: '탈퇴회원',
    email: anonymizedEmail(memberId),
    password: passwordHash,
    phone: null,
    avatarUrl: null,
    address: null,
    statusChangeReason: '회원 탈퇴',
    statusChangedAt: now,
  };
}

// 반드시 $transaction 안에서 호출한다. 어떤 단계든 throw 하면 전체 rollback.
export async function withdrawMember(
  tx: Prisma.TransactionClient,
  { memberId, requesterId, passwordHash }: { memberId: number; requesterId: number; passwordHash: string }
) {
  const member = await tx.user.findUnique({ where: { id: memberId }, select: { id: true, role: true, status: true } });
  if (!member) throw new MemberWithdrawalError(404, '해당 회원을 찾을 수 없습니다.');
  if (memberId === requesterId) throw new MemberWithdrawalError(409, '본인 계정은 탈퇴 처리할 수 없습니다.');
  if (hasAnyRole(member.role, [USER_ROLES.SUPER_ADMIN])) {
    throw new MemberWithdrawalError(409, '슈퍼관리자 계정은 탈퇴 처리할 수 없습니다. 먼저 권한을 변경해주세요.');
  }
  if (member.status === 'DELETED') throw new MemberWithdrawalError(409, '이미 탈퇴 처리된 회원입니다.');

  // 집계 필터(filterVotesForResultsDisplay)가 DELETED 표를 항상 제외하고, 추가로
  // 아직 완료되지 않은 세션의 표는 row 자체를 지운다. 완료된 세션의 표는 역사 기록으로 보존.
  await tx.vote.deleteMany({ where: { userId: memberId, voteSession: { isCompleted: false } } });
  await tx.user.update({ where: { id: memberId }, data: buildWithdrawalData(memberId, passwordHash) });
}
