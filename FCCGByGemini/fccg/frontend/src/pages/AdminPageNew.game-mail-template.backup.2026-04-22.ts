/**
 * Backup snapshot for game notification mail template
 * Date: 2026-04-22
 * Source: AdminPageNew.tsx -> buildGameNotificationHtml()
 *
 * NOTE:
 * This backup stores the participant rendering block before
 * the email-safe fallback redesign.
 */
export const GAME_MAIL_TEMPLATE_BACKUP_2026_04_22 = {
  participantBadges: `
const memberNameSet = new Set(
  (userList || [])
    .map((u: any) => (typeof u?.name === 'string' ? u.name.trim() : ''))
    .filter((n: string) => !!n)
);
const memberBadges: string[] = [];
const otherBadges: string[] = [];
names.forEach((name) => {
  const trimmed = typeof name === 'string' ? name.trim() : '';
  if (!trimmed) return;
  if (memberNameSet.has(trimmed)) memberBadges.push(trimmed);
  else otherBadges.push(trimmed);
});
const participantDetailLine = (() => {
  const chips: string[] = [];
  chips.push(
    ...memberBadges.map(
      (n) =>
        \`<span style="display:inline-block;background:#004ea8;color:#fff;padding:2px 8px;border-radius:999px;font-size:12px;font-weight:600;margin:0 4px 4px 0;">\${n}</span>\`
    )
  );
  chips.push(
    ...otherBadges.map(
      (n) =>
        \`<span style="display:inline-block;background:#ff6b35;color:#fff;padding:2px 8px;border-radius:999px;font-size:12px;font-weight:600;margin:0 4px 4px 0;">\${n}</span>\`
    )
  );
  if (mercenaryCount > 0) {
    chips.push(
      \`<span style="display:inline-block;background:#111827;color:#fff;padding:2px 8px;border-radius:999px;font-size:12px;font-weight:600;margin:0 4px 4px 0;">용병 \${mercenaryCount}명</span>\`
    );
  }
  if (chips.length === 0) return '';
  return \`<tr>
    <td colspan="4" style="padding:4px 0 0 2ch;text-align:left;">
      \${chips.join('')}
    </td>
  </tr>\`;
})();
`,
};
