const {
  buildVoteParticipationSummary,
} = require('../dist/services/voteParticipation');

describe('buildVoteParticipationSummary', () => {
  const members = [
    { id: 1, name: '정성인', role: 'SUPER_ADMIN', status: 'ACTIVE' },
    { id: 2, name: '강병우', role: 'ADMIN', status: 'ACTIVE' },
    { id: 3, name: '김주원', role: 'MEMBER', status: 'ACTIVE' },
    { id: 4, name: '박하림', role: 'MEMBER', status: 'INACTIVE' },
    { id: 5, name: '송건우', role: 'MEMBER', status: 'SUSPENDED' },
  ];

  test('ACTIVE 계정은 역할과 관계없이 모두 집계한다', () => {
    const summary = buildVoteParticipationSummary(members, [{ userId: 1 }]);

    expect(summary).toEqual({
      totalMembers: 3,
      uniqueVoters: 1,
      participationRate: 33,
      votedMembers: ['정성인'],
      nonVotedMembers: ['강병우', '김주원'],
    });
  });

  test('중복 투표 행은 한 명으로 계산한다', () => {
    const summary = buildVoteParticipationSummary(members, [
      { userId: 1 },
      { userId: '1' },
      { userId: 2 },
    ]);

    expect(summary.uniqueVoters).toBe(2);
    expect(summary.participationRate).toBe(67);
  });

  test('미참여 명단을 한글 가나다순으로 정렬한다', () => {
    const summary = buildVoteParticipationSummary(
      [
        { id: 1, name: '한기헌', status: 'ACTIVE' },
        { id: 2, name: '김종훈', status: 'ACTIVE' },
        { id: 3, name: '강의수', status: 'ACTIVE' },
        { id: 4, name: '박하림', status: 'ACTIVE' },
      ],
      []
    );

    expect(summary.nonVotedMembers).toEqual(['강의수', '김종훈', '박하림', '한기헌']);
  });
});
