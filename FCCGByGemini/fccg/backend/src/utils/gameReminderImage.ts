import sharp from 'sharp';

export type GameMailImageGameInput = {
  date: string;
  time?: string;
  eventType?: string;
  location?: string;
  locationAddress?: string;
  memberNames?: string[];
  selectedMembers?: string[];
  allParticipantNames?: string[];
  mercenaryCount?: number;
  totalParticipantCount?: number;
  count?: number;
};

export type GameMailImageInput = {
  nowLabel?: string;
  games: GameMailImageGameInput[];
};

function escapeXml(text: string) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatEventType(eventType?: string) {
  const normalized = eventType || '자체';
  if (['풋살', 'FRIENDLY', 'FRIENDLY_MATCH'].includes(normalized)) return '매치';
  if (!['매치', '자체', '회식', '기타'].includes(normalized)) return '기타';
  return normalized;
}

function parseStringArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((v) => String(v)).map((v) => v.trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    const s = value.trim();
    if (!s) return [];
    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) {
        return parsed.map((v) => String(v)).map((v) => v.trim()).filter(Boolean);
      }
    } catch {
      // ignore
    }
    return s
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return [];
}

function getParticipantSummary(game: GameMailImageGameInput) {
  const allNames = parseStringArray(game.allParticipantNames);
  const selectedNames = parseStringArray(game.selectedMembers);
  const manualNames = parseStringArray(game.memberNames).filter((n) => !n.startsWith('용병'));
  const mergedNames = Array.from(new Set([...allNames, ...selectedNames, ...manualNames]));
  const mercenaryCount = Number(game.mercenaryCount || 0);
  const totalParticipantCount =
    Number(game.totalParticipantCount || 0) ||
    Number(game.count || 0) ||
    mergedNames.length + mercenaryCount;

  return { names: mergedNames, mercenaryCount, totalParticipantCount };
}

function wrapLines(text: string, maxChars: number, maxLines: number) {
  const t = String(text || '').trim();
  if (!t) return [];
  const words = t.split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  const pushCur = () => {
    if (cur) lines.push(cur);
    cur = '';
  };

  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length <= maxChars) {
      cur = next;
      continue;
    }
    if (cur) pushCur();
    // word itself may be longer than maxChars (common in Korean without spaces)
    let remaining = w;
    while (remaining.length > maxChars) {
      lines.push(remaining.slice(0, maxChars));
      remaining = remaining.slice(maxChars);
      if (lines.length >= maxLines) return lines.slice(0, maxLines);
    }
    cur = remaining;
  }
  pushCur();
  return lines.slice(0, maxLines);
}

function buildRowsSvg(opts: {
  x: number;
  y: number;
  w: number;
  rows: { icon: string; label: string; valueLines: string[]; valueColor?: string }[];
}) {
  const iconCol = 24;
  const labelCol = 58;
  const gapCol = 12;
  const valueX = opts.x + iconCol + labelCol + gapCol;
  const lineHeight = 20;
  let y = opts.y;

  let svg = '';
  for (const r of opts.rows) {
    const lines = r.valueLines.length ? r.valueLines : [''];
    const blockH = Math.max(lineHeight, lines.length * lineHeight);
    const hasKey = Boolean(String(r.icon || '').trim()) || Boolean(String(r.label || '').trim());

    if (hasKey) {
      svg += `
      <text x="${opts.x + 2}" y="${y + 15}" font-size="13" fill="#334155">${escapeXml(r.icon)}</text>
      <text x="${opts.x + iconCol}" y="${y + 15}" font-size="13" font-weight="700" fill="#334155">${escapeXml(r.label)}</text>
      <text x="${opts.x + iconCol + labelCol}" y="${y + 15}" font-size="13" font-weight="700" fill="#94a3b8">:</text>
    `;
    }

    const color = r.valueColor || '#111827';
    const startX = hasKey ? valueX : opts.x + 6;
    lines.forEach((line, idx) => {
      svg += `<text x="${startX}" y="${y + 15 + idx * lineHeight}" font-size="13" fill="${color}">${escapeXml(line)}</text>`;
    });

    y += blockH + 4;
  }

  return { svg, height: y - opts.y };
}

function formatDateTimeLabel(date: string, time?: string) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return `${date}${time ? ` ${time}` : ''}`;
  const datePart = parsed.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
  return `${datePart}${time ? ` ${time}` : ''}`;
}

function buildParticipantSegments(game: GameMailImageGameInput) {
  const selectedMembers = parseStringArray(game.selectedMembers);
  const memberNames = parseStringArray(game.memberNames).filter((n) => !n.startsWith('용병'));
  const selectedSet = new Set(selectedMembers);
  const others = memberNames.filter((n) => !selectedSet.has(n));
  const mercenaryCount = Number(game.mercenaryCount || 0);
  return { selectedMembers, others, mercenaryCount };
}

function buildBadgeSvg(x: number, y: number, text: string, opts?: { fill?: string; color?: string; paddingX?: number }) {
  const fill = opts?.fill || '#0b4ea2';
  const color = opts?.color || '#ffffff';
  const paddingX = opts?.paddingX || 10;
  const width = Math.max(52, text.length * 10 + paddingX * 2);
  return {
    width,
    svg: `
      <rect x="${x}" y="${y}" rx="11" ry="11" width="${width}" height="24" fill="${fill}" />
      <text x="${x + width / 2}" y="${y + 16}" font-size="12" font-weight="700" fill="${color}" text-anchor="middle">${escapeXml(text)}</text>
    `,
  };
}

export function buildGameReminderMailSvg(input: GameMailImageInput) {
  const width = 760;
  const pad = 22;
  const headerH = 52;
  const nowLabel = input.nowLabel || new Date().toLocaleString('ko-KR');
  const games = Array.isArray(input.games) ? input.games.slice(0, 3) : [];

  let y = pad + headerH + 10;
  let body = '';

  if (games.length === 0) {
    y += 6;
    body += `
      <rect x="${pad}" y="${y}" width="${width - pad * 2}" height="98" rx="16" fill="#ffffff" stroke="#dbe3ef"/>
      <text x="${pad + 22}" y="${y + 56}" font-size="15" fill="#4b5563">발송할 확정 경기가 없습니다.</text>
    `;
    y += 112;
  }

  for (const game of games) {
    const cardX = pad;
    const cardY = y + 6;
    const cardW = width - pad * 2;
    let rowY = cardY + 30;

    const eventType = formatEventType(game.eventType);
    const dateTime = formatDateTimeLabel(game.date, game.time);
    const location = game.location || '장소 미정';
    const locationAddress = game.locationAddress || '';
    const { names, mercenaryCount, totalParticipantCount } = getParticipantSummary(game);
    const { selectedMembers, others } = buildParticipantSegments(game);
    const memberCount = selectedMembers.length;
    const etcCount = others.length;

    const rows = [
      { icon: '⚽', label: '유형', valueLines: [eventType] },
      { icon: '⏰', label: '일시', valueLines: [dateTime] },
      { icon: '📍', label: '장소', valueLines: [location, ...(locationAddress ? [locationAddress] : [])] },
      { icon: '👥', label: '참석자', valueLines: [`${totalParticipantCount}명 (회원 ${memberCount}명 + 용병 ${mercenaryCount}명 + 기타 ${etcCount}명)`] },
    ];

    const rowsSvg = buildRowsSvg({ x: cardX + 20, y: rowY, w: cardW - 40, rows });
    rowY += rowsSvg.height + 8;

    const maxBadgesPerRow = 8;
    const badgeRows: string[] = [];
    const normalBadges = names.slice(0, 16).map((n) => ({ text: n, fill: '#0b4ea2', color: '#ffffff' }));
    const extraBadges = others.slice(0, 4).map((n) => ({ text: n, fill: '#ff6b35', color: '#ffffff' }));
    if (mercenaryCount > 0) extraBadges.unshift({ text: `용병 ${mercenaryCount}명`, fill: '#111111', color: '#ffffff' });
    const badges = [...normalBadges, ...extraBadges];

    let badgeY = rowY;
    let badgeX = cardX + 20;
    let inRow = 0;
    for (const b of badges) {
      const badge = buildBadgeSvg(badgeX, badgeY, b.text, { fill: b.fill, color: b.color });
      badgeRows.push(badge.svg);
      badgeX += badge.width + 8;
      inRow += 1;
      if (inRow >= maxBadgesPerRow) {
        inRow = 0;
        badgeX = cardX + 20;
        badgeY += 30;
      }
    }
    const cardH = Math.max(204, (badgeY - cardY) + 48);

    body += `
      <rect x="${cardX}" y="${cardY}" width="${cardW}" height="${cardH}" rx="18" fill="#ffffff" stroke="#dbe3ef" />
      <text x="${cardX + cardW - 14}" y="${cardY + 22}" font-size="10" fill="#94a3b8" text-anchor="end">FC CHAL GGYEO</text>
      ${rowsSvg.svg}
      ${badgeRows.join('\n')}
      <text x="${cardX + 20}" y="${cardY + cardH - 16}" font-size="10" fill="#9aa5b1">발송 ${escapeXml(nowLabel)}</text>
    `;

    y = cardY + cardH + 8;
  }

  const totalH = y + 24;
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${totalH}" viewBox="0 0 ${width} ${totalH}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#f7f9fc" />
      <stop offset="100%" stop-color="#eef3fa" />
    </linearGradient>
    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#000000" flood-opacity="0.14"/>
    </filter>
  </defs>
  <rect x="0" y="0" width="${width}" height="${totalH}" fill="url(#bg)" />
  <text x="${pad + 2}" y="${pad + 30}" font-size="14" fill="#64748b">FC CHAL GGYEO</text>
  <text x="${pad + 2}" y="${pad + 50}" font-size="28" font-weight="800" fill="#1f2937">일정 상세정보</text>
  ${body}
  <text x="${width - pad - 8}" y="${totalH - 8}" font-size="11" fill="#9ca3af" text-anchor="end">이 메일은 자동 발송되었습니다.</text>
</svg>`;

  return svg;
}

export async function renderGameReminderMailPng(input: GameMailImageInput) {
  const svg = buildGameReminderMailSvg(input);
  return sharp(Buffer.from(svg, 'utf8'))
    .png({
      compressionLevel: 9,
      quality: 90,
    })
    .toBuffer();
}
