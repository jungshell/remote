/**
 * 운영/로컬 DB에서 특정 회원 이름의 투표 행을 삭제합니다.
 * 사용: backend 폴더에서 DATABASE_URL이 설정된 상태로 실행
 *
 *   npx ts-node --transpile-only tooling/remove-votes-for-user.ts "강의수"
 *   npx ts-node --transpile-only tooling/remove-votes-for-user.ts "강의수" --all-incomplete
 *   npx ts-node --transpile-only tooling/remove-votes-for-user.ts "강의수" --session=42
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2).filter((a) => a !== '--');
  const nameArg = args.find((a) => !a.startsWith('--'));
  if (!nameArg?.trim()) {
    console.error(
      '사용법: npx ts-node --transpile-only tooling/remove-votes-for-user.ts "<회원이름>" [--all-incomplete] [--session=<id>]'
    );
    process.exit(1);
  }
  const allIncomplete = process.argv.includes('--all-incomplete');
  const sessionArg = process.argv.find((a) => a.startsWith('--session='));
  const sessionId = sessionArg ? parseInt(sessionArg.split('=')[1], 10) : NaN;

  const users = await prisma.user.findMany({
    where: { name: nameArg.trim() },
    select: { id: true, name: true, status: true }
  });
  if (users.length === 0) {
    console.error('회원 없음:', nameArg);
    process.exit(1);
  }
  if (users.length > 1) {
    console.error('동명이인 — userId를 직접 지정하거나 API를 사용하세요:', users);
    process.exit(1);
  }
  const userId = users[0].id;
  console.log('대상:', users[0]);

  if (allIncomplete) {
    const sessions = await prisma.voteSession.findMany({
      where: { isCompleted: false },
      select: { id: true }
    });
    const del = await prisma.vote.deleteMany({
      where: { userId, voteSessionId: { in: sessions.map((s) => s.id) } }
    });
    console.log('미완료 세션 전체에서 삭제:', del.count);
  } else if (!Number.isNaN(sessionId)) {
    const del = await prisma.vote.deleteMany({
      where: { userId, voteSessionId: sessionId }
    });
    console.log(`세션 ${sessionId}에서 삭제:`, del.count);
  } else {
    const active = await prisma.voteSession.findFirst({
      where: { isActive: true, isCompleted: false }
    });
    if (!active) {
      console.error('활성 세션 없음. --session=<id> 또는 --all-incomplete 사용');
      process.exit(1);
    }
    const del = await prisma.vote.deleteMany({
      where: { userId, voteSessionId: active.id }
    });
    console.log(`활성 세션 ${active.id}에서 삭제:`, del.count);
  }

  await prisma.$disconnect();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect().catch(() => {});
  process.exit(1);
});
