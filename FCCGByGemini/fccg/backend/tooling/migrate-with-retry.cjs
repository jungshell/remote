#!/usr/bin/env node
// DB cold-start(Render 무료 플랜 슬립) 대응: prisma migrate deploy 재시도
const { execSync } = require('child_process');

const MAX_RETRIES = 4;
const RETRY_DELAY_MS = 12000;

for (let i = 0; i < MAX_RETRIES; i++) {
  try {
    console.log(`[migrate] 시도 ${i + 1}/${MAX_RETRIES}`);
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });
    console.log('[migrate] 완료');
    process.exit(0);
  } catch {
    if (i < MAX_RETRIES - 1) {
      console.log(`[migrate] 실패, ${RETRY_DELAY_MS / 1000}초 후 재시도...`);
      const end = Date.now() + RETRY_DELAY_MS;
      while (Date.now() < end) { /* busy-wait */ }
    }
  }
}

console.error('[migrate] 최대 재시도 횟수 초과, 배포 실패');
process.exit(1);
