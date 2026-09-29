import type { Prisma } from '@prisma/client';

// 경기 수정 시 Attendance 동기화. 참가자 모델이 이름 기반이라 "확실히 특정되는 회원"에게만 쓴다.
// - 참가자 집합이 그대로면 Attendance write 0 (장소·시간만 수정하는 경우)
// - 바뀌었으면 빠진/추가된 이름만 처리, 전체 삭제 후 재생성하지 않음
// - 이름이 0명·2명 이상·DELETED 회원에 매칭되면 아무것도 하지 않음 (탈퇴회원 기록 보존, fail safe)
// ponytail: 이름 기반 식별의 한계 — 동명이인/개명은 ID 기반 참가자 모델로 전환해야 근본 해결

// 저장된 JSON 문자열 또는 배열을 이름 배열로 (live route의 기존 파싱 규칙 그대로)
export function parseNames(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  return value ? JSON.parse(value as string) : [];
}

export function participantSet(selectedMembers: unknown, memberNames: unknown): Set<string> {
  return new Set(
    [...parseNames(selectedMembers), ...parseNames(memberNames)]
      .filter((name): name is string => typeof name === 'string' && !!name.trim())
      .map(name => name.trim())
  );
}

const has = (obj: unknown, key: string) => !!obj && Object.prototype.hasOwnProperty.call(obj, key);

// 요청 body의 참가자 필드. 필드 누락 = "수정 안 함", [] = "명단 비움" — 둘을 구분한다.
// 둘 다 누락이면 null (참가자·Attendance 모두 건드리지 않음). 요청 JSON 오류는 그대로 throw.
export function requestedParticipants(body: unknown) {
  const b = body as Record<string, unknown>;
  if (!has(b, 'selectedMembers') && !has(b, 'memberNames')) return null;
  return {
    selectedMembers: has(b, 'selectedMembers') ? parseNames(b.selectedMembers) : undefined,
    memberNames: has(b, 'memberNames') ? parseNames(b.memberNames) : undefined,
  };
}

const parseStored = (value: unknown) => {
  try {
    return parseNames(value);
  } catch {
    return null;
  }
};

// 기존 경기 + 요청 → game.update에 넣을 참가자 data, 동기화용 old/new 집합.
// 누락된 필드는 data에 넣지 않아 기존 DB 값이 보존되고, new 집합 계산에는 기존 값을 쓴다.
// 저장된 JSON이 손상됐으면 old 집합은 빈 집합 → 삭제 없이 추가만 (fail safe).
export function planParticipantUpdate(
  requested: NonNullable<ReturnType<typeof requestedParticipants>>,
  existing: { selectedMembers: unknown; memberNames: unknown }
) {
  const storedSelected = parseStored(existing.selectedMembers);
  const storedNames = parseStored(existing.memberNames);
  const oldSet = storedSelected && storedNames ? participantSet(storedSelected, storedNames) : new Set<string>();

  const data: { selectedMembers?: string; memberNames?: string } = {};
  if (requested.selectedMembers) data.selectedMembers = JSON.stringify(requested.selectedMembers);
  if (requested.memberNames) data.memberNames = JSON.stringify(requested.memberNames);

  const newSet = participantSet(
    requested.selectedMembers ?? storedSelected ?? [],
    requested.memberNames ?? storedNames ?? []
  );
  return { data, oldSet, newSet };
}

export function diffParticipants(oldSet: Set<string>, newSet: Set<string>) {
  return {
    added: [...newSet].filter(name => !oldSet.has(name)),
    removed: [...oldSet].filter(name => !newSet.has(name)),
  };
}

// 반드시 $transaction 안에서 호출한다.
export async function syncGameAttendance(
  tx: Prisma.TransactionClient,
  gameId: number,
  oldSet: Set<string>,
  newSet: Set<string>
) {
  const { added, removed } = diffParticipants(oldSet, newSet);
  const result = { added: [] as number[], removed: [] as number[], skipped: [] as string[] };
  if (added.length === 0 && removed.length === 0) return result;

  const users = await tx.user.findMany({
    where: { name: { in: [...added, ...removed] } },
    select: { id: true, name: true, status: true },
  });

  // 정확히 1명이고 탈퇴회원이 아닐 때만 userId, 아니면 null
  const resolve = (name: string) => {
    const matches = users.filter(u => u.name === name);
    if (matches.length !== 1 || matches[0].status === 'DELETED') {
      result.skipped.push(name);
      return null;
    }
    return matches[0].id;
  };

  const removeIds = removed.map(resolve).filter((id): id is number => id !== null);
  const addIds = added.map(resolve).filter((id): id is number => id !== null);

  if (removeIds.length > 0) {
    await tx.attendance.deleteMany({ where: { gameId, userId: { in: removeIds } } });
    result.removed = removeIds;
  }

  if (addIds.length > 0) {
    // (gameId, userId) unique 제약이 없으므로 기존 row를 먼저 확인
    const existing = await tx.attendance.findMany({
      where: { gameId, userId: { in: addIds } },
      select: { userId: true },
    });
    const existingIds = new Set(existing.map(a => a.userId));
    const createIds = addIds.filter(id => !existingIds.has(id));
    if (createIds.length > 0) {
      await tx.attendance.createMany({ data: createIds.map(userId => ({ gameId, userId, status: 'YES' })) });
      result.added = createIds;
    }
  }

  return result;
}
