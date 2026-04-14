/**
 * Rule-based analysis for meeting & emoji-tone (no external API).
 * Returns same shape as SmartWork analyze for UI compatibility.
 */

const STOPWORDS = new Set([
  '있습니다', '합니다', '됩니다', '그리고', '또한', '또는', '등', '및', '관련', '내용', '사항', '주요', '업무', '문서', '확인', '진행', '결과',
]);

function normalizeToken(value: string): string {
  return value
    .replace(/(입니다|합니다|됩니다|되다|하다)$/g, '')
    .replace(/(의|은|는|이|가|을|를|와|과|에|에서|로|으로)$/g, '')
    .trim();
}

export function buildHashtags(text: string, max = 5): string[] {
  const tokens = text
    .replace(/\s+/g, ' ')
    .split(/[^A-Za-z0-9가-힣]+/)
    .map((t) => normalizeToken(t.trim()))
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t));
  const frequency = new Map<string, number>();
  tokens.forEach((t) => frequency.set(t, (frequency.get(t) ?? 0) + 1));
  return Array.from(frequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([token]) => (token.startsWith('#') ? token : `#${token}`));
}

function extractLines(text: string, pattern: RegExp): string[] {
  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean);
  return lines.filter((l) => pattern.test(l)).slice(0, 10);
}

export function analyzeMeeting(content: string, meta: Record<string, string> = {}): Record<string, unknown> {
  const hashtags = buildHashtags(content);
  const summary = content.slice(0, 500).trim() || '요약 없음';
  const decisions = extractLines(content, /결정|의결|합의|동의/i);
  const actionItems = extractLines(content, /할 일|후속|조치|요청|검토|제출|준비/i);
  const risks = extractLines(content, /위험|리스크|이슈|장애|우려/i);
  return {
    summary,
    decisions: decisions.length ? decisions : ['의사결정 없음'],
    action_items: actionItems.length ? actionItems : ['액션 아이템 없음'],
    risks: risks.length ? risks : ['이슈 없음'],
    hashtags,
    importance: 3,
    meeting_date: meta.meeting_date ?? null,
    meeting_start: meta.meeting_start ?? null,
    meeting_end: meta.meeting_end ?? null,
    meeting_location: meta.meeting_location ?? null,
    meeting_participants: meta.meeting_participants ?? null,
    meeting_project: meta.meeting_project ?? null,
    meeting_work_type: meta.meeting_work_type ?? null,
    mode: 'meeting',
  };
}

export function analyzeEmojiTone(
  content: string,
  _opts: { purpose?: string; audience?: string; length?: string; formality?: string } = {}
): Record<string, unknown> {
  const hashtags = buildHashtags(content);
  const summary = content.slice(0, 200).trim() || '요지 없음';
  const message = content.trim().length > 0
    ? `📌 ${content.trim().slice(0, 100)}${content.length > 100 ? '…' : ''}`
    : '문구를 입력해 주세요.';
  return {
    tone_type: '공지형',
    summary,
    versions: [
      { label: '격식', message, emoji: '📌', cta: '확인 부탁드립니다.' },
      { label: '중립', message, emoji: '💬', cta: '참고해 주세요.' },
      { label: '친근', message, emoji: '✨', cta: '궁금한 점 있으면 편하게 물어봐 주세요.' },
    ],
    hashtags,
  };
}
