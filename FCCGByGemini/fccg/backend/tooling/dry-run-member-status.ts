/**
 * 회원 상태 규칙 dryRun 검증
 * 사용: npx ts-node --transpile-only tooling/dry-run-member-status.ts
 */
import 'dotenv/config';
import { checkMemberStatusRules } from '../src/controllers/authController';

(async () => {
  const result = await checkMemberStatusRules({ dryRun: true });
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.success ? 0 : 1);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
