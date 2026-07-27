export type VoteParticipationMember = {
  id: number | string;
  name: string;
  status?: string | null;
};

export type VoteParticipationEntry = {
  userId?: number | string | null;
  id?: number | string | null;
};

export type VoteParticipationSummary = {
  totalMembers: number;
  uniqueVoters: number;
  participationRate: number;
  votedMembers: string[];
  nonVotedMembers: string[];
};

const koreanNameCollator = new Intl.Collator('ko-KR');

function normalizeId(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'string' && value.trim()) return value.trim();
  return null;
}

/**
 * 투표 참여 현황의 서버 단일 기준.
 * - 역할과 관계없이 ACTIVE 계정은 모두 대상
 * - INACTIVE/SUSPENDED 등 비활성 상태는 분모·명단에서 제외
 * - 같은 사용자의 중복 투표 행은 한 명으로 계산
 */
export function buildVoteParticipationSummary(
  members: VoteParticipationMember[] | null | undefined,
  votes: VoteParticipationEntry[] | null | undefined
): VoteParticipationSummary {
  const eligibleMembers = (members || []).filter((member) => member?.status === 'ACTIVE');
  const votedIds = new Set(
    (votes || [])
      .map((vote) => normalizeId(vote?.userId ?? vote?.id))
      .filter((id): id is string => id !== null)
  );

  const votedMembers = eligibleMembers
    .filter((member) => {
      const id = normalizeId(member.id);
      return id !== null && votedIds.has(id);
    })
    .map((member) => member.name)
    .sort(koreanNameCollator.compare);

  const nonVotedMembers = eligibleMembers
    .filter((member) => {
      const id = normalizeId(member.id);
      return id === null || !votedIds.has(id);
    })
    .map((member) => member.name)
    .sort(koreanNameCollator.compare);

  const totalMembers = eligibleMembers.length;
  const uniqueVoters = votedMembers.length;

  return {
    totalMembers,
    uniqueVoters,
    participationRate:
      totalMembers > 0 ? Math.round((uniqueVoters / totalMembers) * 100) : 0,
    votedMembers,
    nonVotedMembers
  };
}
