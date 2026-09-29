const {
  parseNames,
  participantSet,
  diffParticipants,
  syncGameAttendance,
  requestedParticipants,
  planParticipantUpdate,
} = require('../dist/services/gameAttendanceSync');

// DB 없이 동작하는 fake transaction client: users/attendances 메모리 테이블 + 호출 기록
function fakeTx({ users = [], attendances = [], failOn } = {}) {
  const calls = [];
  const rows = attendances.map(a => ({ ...a }));
  const inList = (v, list) => (list && list.in ? list.in.includes(v) : v === list);
  const handlers = {
    'user.findMany': ({ where }) => users.filter(u => where.name.in.includes(u.name)),
    'attendance.findMany': ({ where }) =>
      rows.filter(a => a.gameId === where.gameId && inList(a.userId, where.userId)),
    'attendance.deleteMany': ({ where }) => {
      const before = rows.length;
      for (let i = rows.length - 1; i >= 0; i--) {
        if (rows[i].gameId === where.gameId && inList(rows[i].userId, where.userId)) rows.splice(i, 1);
      }
      return { count: before - rows.length };
    },
    'attendance.createMany': ({ data }) => {
      rows.push(...data);
      return { count: data.length };
    },
  };
  const tx = new Proxy({}, {
    get: (_, model) => new Proxy({}, {
      get: (__, op) => async (args) => {
        const step = `${model}.${op}`;
        calls.push({ step, args });
        if (failOn === step) throw new Error(`boom:${step}`);
        if (!handlers[step]) throw new Error(`unexpected call ${step}`);
        return handlers[step](args);
      },
    }),
  });
  const writes = () => calls.filter(c => /^attendance\.(create|delete|update|upsert)/.test(c.step));
  return { tx, calls, rows, writes };
}

const GAME = 100;
const 홍길동_탈퇴 = { id: 7, name: '탈퇴회원', status: 'DELETED' };
const 김철수 = { id: 1, name: '김철수', status: 'ACTIVE' };
const 이영희 = { id: 2, name: '이영희', status: 'ACTIVE' };
const 박민수 = { id: 3, name: '박민수', status: 'ACTIVE' };
const users = [홍길동_탈퇴, 김철수, 이영희, 박민수];
const att = (...ids) => ids.map(userId => ({ gameId: GAME, userId, status: 'YES' }));
const set = (selected, manual = []) => participantSet(selected, manual);
const sync = (tx, oldSel, newSel, oldManual = [], newManual = []) =>
  syncGameAttendance(tx, GAME, set(oldSel, oldManual), set(newSel, newManual));

describe('participantSet / diffParticipants', () => {
  test('JSON 문자열·배열 모두 수용, trim·빈값·중복 제거, 순서 무시', () => {
    expect(parseNames('["a"]')).toEqual(['a']);
    expect(parseNames(undefined)).toEqual([]);
    expect([...set('[" 김철수 ", "", "김철수", 3]', ['이영희'])].sort()).toEqual(['김철수', '이영희']);
    expect(diffParticipants(set(['a', 'b']), set(['b', 'c']))).toEqual({ added: ['c'], removed: ['a'] });
  });
});

describe('syncGameAttendance', () => {
  test('1. 참가자 집합 동일 (장소만 수정) → DB 호출 0', async () => {
    const { tx, calls } = fakeTx({ users, attendances: att(7, 1, 2) });
    await sync(tx, ['홍길동', '김철수', '이영희'], ['홍길동', '김철수', '이영희']);
    expect(calls).toHaveLength(0);
  });

  test('2. 순서만 바뀜 / selected↔manual 이동 → DB 호출 0', async () => {
    const { tx, calls } = fakeTx({ users, attendances: att(1, 2) });
    await sync(tx, '["김철수","이영희"]', ['이영희'], [], ['김철수']);
    expect(calls).toHaveLength(0);
  });

  test('3. 일반 회원 1명 추가 → 해당 회원만 create', async () => {
    const { tx, rows, writes } = fakeTx({ users, attendances: att(1) });
    const result = await sync(tx, ['김철수'], ['김철수', '이영희']);
    expect(writes()).toHaveLength(1);
    expect(writes()[0]).toEqual({ step: 'attendance.createMany', args: { data: [{ gameId: GAME, userId: 2, status: 'YES' }] } });
    expect(result.added).toEqual([2]);
    expect(rows.map(r => r.userId).sort()).toEqual([1, 2]);
  });

  test('4. 일반 회원 1명 제거 → 해당 회원만 delete', async () => {
    const { tx, rows, writes } = fakeTx({ users, attendances: att(1, 2) });
    await sync(tx, ['김철수', '이영희'], ['김철수']);
    expect(writes()).toEqual([{ step: 'attendance.deleteMany', args: { where: { gameId: GAME, userId: { in: [2] } } } }]);
    expect(rows.map(r => r.userId)).toEqual([1]);
  });

  test('5. 탈퇴회원 기록: 다른 참가자 추가/제거에도 userId 7 보존', async () => {
    const { tx, rows } = fakeTx({ users, attendances: att(7, 1, 2) });
    await sync(tx, ['홍길동', '김철수', '이영희'], ['홍길동', '이영희', '박민수']);
    expect(rows.map(r => r.userId).sort()).toEqual([2, 3, 7]);
  });

  test('6. JSON에서 "홍길동"(탈퇴회원 원래 이름) 제거 → 0명 매칭 → delete 0', async () => {
    const { tx, rows, writes } = fakeTx({ users, attendances: att(7, 1) });
    const result = await sync(tx, ['홍길동', '김철수'], ['김철수']);
    expect(writes()).toHaveLength(0);
    expect(result.skipped).toEqual(['홍길동']);
    expect(rows.map(r => r.userId).sort()).toEqual([1, 7]);
  });

  test('7. 동명이인 제거 → ambiguous → delete 0', async () => {
    const twins = [...users, { id: 15, name: '김철수', status: 'ACTIVE' }];
    const { tx, rows, writes } = fakeTx({ users: twins, attendances: att(1, 15) });
    await sync(tx, ['김철수'], []);
    expect(writes()).toHaveLength(0);
    expect(rows).toHaveLength(2);
  });

  test('8. 동명이인 추가 → ambiguous → create 0', async () => {
    const twins = [...users, { id: 15, name: '김철수', status: 'ACTIVE' }];
    const { tx, writes } = fakeTx({ users: twins });
    const result = await sync(tx, [], ['김철수']);
    expect(writes()).toHaveLength(0);
    expect(result.skipped).toEqual(['김철수']);
  });

  test('8b. DELETED 회원 이름("탈퇴회원")은 추가·제거 모두 무시', async () => {
    const { tx, rows, writes } = fakeTx({ users, attendances: att(7) });
    await sync(tx, ['탈퇴회원'], []);
    await sync(tx, [], ['탈퇴회원']);
    expect(writes()).toHaveLength(0);
    expect(rows.map(r => r.userId)).toEqual([7]);
  });

  test('8c. INACTIVE/SUSPENDED 회원은 기존처럼 연결 (정책 유지)', async () => {
    const mixed = [{ id: 4, name: '휴면', status: 'INACTIVE' }, { id: 5, name: '정지', status: 'SUSPENDED' }];
    const { tx, rows } = fakeTx({ users: mixed });
    await sync(tx, [], ['휴면', '정지']);
    expect(rows.map(r => r.userId).sort()).toEqual([4, 5]);
  });

  test('9. 추가 회원의 Attendance가 이미 존재 → 중복 create 0', async () => {
    const { tx, rows, writes } = fakeTx({ users, attendances: att(2) });
    await sync(tx, ['김철수'], ['김철수', '이영희']);
    expect(writes()).toHaveLength(0);
    expect(rows).toHaveLength(1);
  });

  test('10. 수기 이름(회원 아님) 추가 → 오류 없이 create 0', async () => {
    const { tx, writes } = fakeTx({ users });
    const result = await sync(tx, [], [], [], ['외부 게스트']);
    expect(writes()).toHaveLength(0);
    expect(result.skipped).toEqual(['외부 게스트']);
  });

  test('11. sync 중 오류는 그대로 throw → route의 $transaction이 rollback', async () => {
    const { tx } = fakeTx({ users, attendances: att(1), failOn: 'attendance.createMany' });
    await expect(sync(tx, ['김철수'], ['김철수', '이영희'])).rejects.toThrow('boom:attendance.createMany');
  });
});

describe('참가자 필드 누락 vs 명시적 전달 (route가 쓰는 helper + 실제 sync)', () => {
  const existing = { selectedMembers: '["김철수"]', memberNames: '["용병A"]' };
  // route와 같은 순서: requestedParticipants → planParticipantUpdate → syncGameAttendance
  const applyPut = async (tx, body, stored = existing) => {
    const requested = requestedParticipants(body);
    if (!requested) return { synced: false, data: {} };
    const plan = planParticipantUpdate(requested, stored);
    await syncGameAttendance(tx, GAME, plan.oldSet, plan.newSet);
    return { synced: true, data: plan.data, plan };
  };

  test('17. 두 필드 모두 누락 → sync 호출 0, 참가자 JSON data 없음', async () => {
    const { tx, calls } = fakeTx({ users, attendances: att(1) });
    const result = await applyPut(tx, { location: '새 구장' });
    expect(requestedParticipants({ location: '새 구장' })).toBeNull();
    expect(result).toEqual({ synced: false, data: {} });
    expect(calls).toHaveLength(0);
  });

  test('18. 명시적 [] [] → 명단 비움: 특정 가능한 일반회원만 제거, JSON "[]" 저장', async () => {
    const { tx, rows } = fakeTx({ users, attendances: att(7, 1) });
    const result = await applyPut(tx, { selectedMembers: [], memberNames: [] }, { selectedMembers: '["홍길동","김철수"]', memberNames: '[]' });
    expect(result.data).toEqual({ selectedMembers: '[]', memberNames: '[]' });
    expect(rows.map(r => r.userId)).toEqual([7]); // 탈퇴회원 보존, 김철수만 제거
  });

  test('19. selectedMembers만 전달 → 기존 memberNames 보존 + 새 집합에 포함', async () => {
    const { tx, rows } = fakeTx({ users, attendances: att(1) });
    const result = await applyPut(tx, { selectedMembers: ['이영희'] });
    expect(result.data).toEqual({ selectedMembers: '["이영희"]' });
    expect([...result.plan.newSet].sort()).toEqual(['용병A', '이영희']);
    expect(rows.map(r => r.userId)).toEqual([2]);
  });

  test('20. memberNames만 전달 → 기존 selectedMembers 보존', async () => {
    const { tx, calls } = fakeTx({ users, attendances: att(1) });
    const result = await applyPut(tx, { memberNames: '["용병A"]' });
    expect(result.data).toEqual({ memberNames: '["용병A"]' });
    expect([...result.plan.newSet].sort()).toEqual(['김철수', '용병A']);
    expect(calls).toHaveLength(0); // 집합 동일 → Attendance 호출 0
  });

  test('21. 두 필드 누락 + 장소 변경 → update data에 참가자 필드 없음 (route 구조 테스트와 함께 검증)', async () => {
    const { tx, rows } = fakeTx({ users, attendances: att(1, 7) });
    const result = await applyPut(tx, { location: '새 구장', time: '20:00' });
    expect(result.data).not.toHaveProperty('selectedMembers');
    expect(result.data).not.toHaveProperty('memberNames');
    expect(rows).toHaveLength(2);
  });

  test('22. 저장 JSON 손상 → crash 없음, 기존 Attendance delete 0, 특정 가능한 신규만 추가', async () => {
    const { tx, rows, writes } = fakeTx({ users, attendances: att(1) });
    const result = await applyPut(tx, { selectedMembers: ['이영희'] }, { selectedMembers: '{broken', memberNames: '[]' });
    expect(result.plan.oldSet.size).toBe(0);
    expect(writes().map(w => w.step)).toEqual(['attendance.createMany']);
    expect(rows.map(r => r.userId).sort()).toEqual([1, 2]);
  });

  test('23. 요청 JSON 오류는 route 밖(트랜잭션 전)에서 throw', () => {
    expect(() => requestedParticipants({ selectedMembers: '{broken' })).toThrow();
  });
});

describe('PUT /games/:id route 구조', () => {
  const fs = require('fs');
  const path = require('path');
  const src = fs.readFileSync(path.join(__dirname, '../src/routes/auth_simple.ts'), 'utf8');
  const start = src.indexOf("router.put('/games/:id'");
  const route = src.slice(start, src.indexOf('\nrouter.', start + 1));
  const txStart = route.indexOf('prisma.$transaction(async (tx)');
  const txEnd = route.indexOf('if (!txResult)');

  test('Attendance 전체 삭제/재생성 없음, prisma 직접 attendance 호출 없음', () => {
    expect(route).not.toMatch(/attendance\.(deleteMany|createMany|create|delete)\(/);
  });

  test('game.update는 참가자 JSON을 직접 덮어쓰지 않고 participantData만 spread', () => {
    expect(route).not.toMatch(/(memberNames|selectedMembers):\s*JSON\.stringify/);
    expect(route).toMatch(/\.\.\.participantData,/);
    expect(route).toMatch(/requestedParticipants\(req\.body\)/);
    expect(route.indexOf('requestedParticipants(req.body)')).toBeLessThan(route.indexOf('prisma.$transaction'));
  });

  test('조회·sync·game.update 모두 하나의 트랜잭션 안, 메일·자동경기 정리는 밖', () => {
    expect(txStart).toBeGreaterThan(-1);
    const txBody = route.slice(txStart, txEnd);
    expect(txBody).toMatch(/tx\.game\.findUnique/);
    expect(txBody).toMatch(/if \(requested\) \{[\s\S]*planParticipantUpdate[\s\S]*syncGameAttendance\(tx,/);
    expect(txBody).toMatch(/tx\.game\.update/);
    expect(txBody).not.toMatch(/prisma\.game\./);
    expect(route.slice(txEnd)).toMatch(/sendGameConfirmationNotification/);
    expect(txBody).not.toMatch(/sendGameConfirmationNotification|deleteOtherAutoGeneratedGames/);
  });
});
