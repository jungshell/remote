const {
  filterVotesForResultsDisplay,
  aggregateVotesByWeekday,
  convertKoreanDateToDayCode,
} = require('../dist/utils/voteUtils');

const vote = (userId, status, createdAt, statusChangedAt, selectedDays = '["MON","WED"]') => ({
  userId,
  selectedDays,
  createdAt: new Date(createdAt),
  user: { name: `회원${userId}`, status, statusChangedAt: statusChangedAt ? new Date(statusChangedAt) : null },
});

describe('filterVotesForResultsDisplay', () => {
  test('TEST 6: ACTIVE 시점에 행사한 표는 이후 SUSPENDED/INACTIVE 되어도 유지', () => {
    const votes = [
      vote(1, 'SUSPENDED', '2026-10-01', '2026-10-03'),
      vote(2, 'INACTIVE', '2026-10-01', '2026-10-03'),
    ];
    expect(filterVotesForResultsDisplay(votes).map((v) => v.userId)).toEqual([1, 2]);
  });

  test('상태 변경 이후 표·변경시각 없는 레거시·DELETED 표는 기존대로 제외', () => {
    const votes = [
      vote(1, 'SUSPENDED', '2026-10-05', '2026-10-03'),
      vote(2, 'INACTIVE', '2026-10-01', null),
      vote(3, 'DELETED', '2026-10-01', '2026-10-03'),
      vote(4, 'ACTIVE', '2026-10-01', null),
    ];
    expect(filterVotesForResultsDisplay(votes).map((v) => v.userId)).toEqual([4]);
  });
});

describe('aggregateVotesByWeekday', () => {
  test('TEST 8: 투표 후 정지된 회원의 지난 표가 집계에서 사라지지 않는다', () => {
    const { counts, participantsByDay } = aggregateVotesByWeekday([
      vote(1, 'ACTIVE', '2026-10-01', null),
      vote(2, 'SUSPENDED', '2026-10-01', '2026-10-03'),
    ]);
    expect(counts.MON).toBe(2);
    expect(counts.WED).toBe(2);
    expect(participantsByDay.MON).toEqual(['회원1', '회원2']);
  });

  test('TEST 7: 한글 날짜·영문 코드 혼용 요일 매핑', () => {
    expect(convertKoreanDateToDayCode('10월 6일(월)')).toBe('MON');
    expect(convertKoreanDateToDayCode('10월 10일(금)')).toBe('FRI');
    expect(convertKoreanDateToDayCode('TUE')).toBe('TUE');
    const { counts } = aggregateVotesByWeekday([
      vote(1, 'ACTIVE', '2026-10-01', null, '["10월 7일(화)","THU"]'),
      vote(2, 'ACTIVE', '2026-10-01', null, '["불참"]'),
    ]);
    expect(counts).toMatchObject({ MON: 0, TUE: 1, WED: 0, THU: 1, FRI: 0 });
  });
});
