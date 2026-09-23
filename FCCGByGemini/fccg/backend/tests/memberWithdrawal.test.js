const {
  withdrawMember,
  buildWithdrawalData,
  anonymizedEmail,
  MemberWithdrawalError,
} = require('../dist/services/memberWithdrawal');

// DB 없이 호출 내역만 기록하는 fake transaction client
function fakeTx({ member = { id: 7, role: 'MEMBER', status: 'ACTIVE' }, failOn } = {}) {
  const calls = [];
  const tx = new Proxy({}, {
    get: (_, model) => new Proxy({}, {
      get: (__, op) => async (args) => {
        const step = `${model}.${op}`;
        calls.push({ step, args });
        if (failOn === step) throw new Error(`boom:${step}`);
        if (step === 'user.findUnique') return member;
        return { count: 0 };
      },
    }),
  });
  return { tx, calls };
}

const run = (tx, overrides = {}) =>
  withdrawMember(tx, { memberId: 7, requesterId: 1, passwordHash: '$2b$10$hash', ...overrides });

describe('withdrawMember', () => {
  test('일반 회원 탈퇴: DELETED + MEMBER + 개인정보 익명화', async () => {
    const { tx, calls } = fakeTx();
    await run(tx);

    const update = calls.find(c => c.step === 'user.update').args;
    expect(update.where).toEqual({ id: 7 });
    expect(update.data).toMatchObject({
      status: 'DELETED',
      role: 'MEMBER',
      name: '탈퇴회원',
      email: 'deleted+7@invalid',
      password: '$2b$10$hash',
      phone: null,
      avatarUrl: null,
      address: null,
    });
  });

  test('팀 기록(경기·출석·사진·좋아요·댓글·태그 등)은 건드리지 않고, 미완료 세션의 본인 표만 지운다', async () => {
    const { tx, calls } = fakeTx();
    await run(tx);

    expect(calls.map(c => c.step)).toEqual(['user.findUnique', 'vote.deleteMany', 'user.update']);
    expect(calls[1].args).toEqual({ where: { userId: 7, voteSession: { isCompleted: false } } });
  });

  test('SUPER_ADMIN 탈퇴는 409로 거부하고 아무것도 변경하지 않는다', async () => {
    const { tx, calls } = fakeTx({ member: { id: 7, role: 'super_admin', status: 'ACTIVE' } });

    await expect(run(tx)).rejects.toMatchObject({ status: 409 });
    expect(calls.map(c => c.step)).toEqual(['user.findUnique']);
  });

  test('본인 계정 탈퇴는 409로 거부한다', async () => {
    const { tx, calls } = fakeTx();

    await expect(run(tx, { requesterId: 7 })).rejects.toBeInstanceOf(MemberWithdrawalError);
    await expect(run(fakeTx().tx, { requesterId: 7 })).rejects.toMatchObject({ status: 409 });
    expect(calls.map(c => c.step)).toEqual(['user.findUnique']);
  });

  test('없는 회원은 404, 이미 탈퇴한 회원은 409', async () => {
    await expect(run(fakeTx({ member: null }).tx)).rejects.toMatchObject({ status: 404 });
    await expect(run(fakeTx({ member: { id: 7, role: 'MEMBER', status: 'DELETED' } }).tx)).rejects.toMatchObject({ status: 409 });
  });

  test('익명화 update가 실패하면 오류를 그대로 throw 한다 (트랜잭션 rollback, 성공 응답 불가)', async () => {
    const { tx } = fakeTx({ failOn: 'user.update' });
    await expect(run(tx)).rejects.toThrow('boom:user.update');
    await expect(run(fakeTx({ failOn: 'vote.deleteMany' }).tx)).rejects.toThrow('boom:vote.deleteMany');
  });

  test('익명 이메일은 회원 id별로 결정적이고 서로 다르며, 가입 이메일 검증을 통과할 수 없다', () => {
    const signupEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    expect(anonymizedEmail(7)).toBe(anonymizedEmail(7));
    expect(anonymizedEmail(7)).not.toBe(anonymizedEmail(8));
    expect(signupEmailRegex.test(anonymizedEmail(7))).toBe(false);
    expect(JSON.stringify(buildWithdrawalData(7, 'h'))).not.toMatch(/@(?!invalid)/);
  });
});

const { filterVotesForResultsDisplay } = require('../dist/utils/voteUtils');

describe('filterVotesForResultsDisplay (탈퇴회원 표 집계 제외)', () => {
  const vote = (status) => ({ userId: status, selectedDays: '["MON"]', user: { name: status, status } });

  test('ACTIVE는 포함, INACTIVE/SUSPENDED/DELETED는 제외', () => {
    const votes = ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'DELETED'].map(vote);
    expect(filterVotesForResultsDisplay(votes).map(v => v.user.status)).toEqual(['ACTIVE']);
  });

  test('재개된 세션에 남아 있는 DELETED 회원의 과거 표 row는 입력에 있어도 집계되지 않고, 원본 배열은 변경되지 않는다', () => {
    const votes = [vote('ACTIVE'), vote('DELETED')];
    expect(filterVotesForResultsDisplay(votes)).toHaveLength(1);
    expect(votes).toHaveLength(2);
  });
});
