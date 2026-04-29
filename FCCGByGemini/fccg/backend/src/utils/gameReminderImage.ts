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
  const iconCol = 34;
  const labelCol = 78;
  const gapCol = 18;
  const valueX = opts.x + iconCol + labelCol + gapCol;
  const lineHeight = 18;
  let y = opts.y;

  let svg = '';
  for (const r of opts.rows) {
    const lines = r.valueLines.length ? r.valueLines : [''];
    const blockH = Math.max(lineHeight, lines.length * lineHeight);
    const hasKey = Boolean(String(r.icon || '').trim()) || Boolean(String(r.label || '').trim());

    if (hasKey) {
      svg += `
      <text x="${opts.x + 6}" y="${y + 16}" font-size="14" fill="#111827">${escapeXml(r.icon)}</text>
      <text x="${opts.x + iconCol}" y="${y + 16}" font-size="13" font-weight="700" fill="#374151" text-anchor="middle">${escapeXml(r.label)}</text>
      <text x="${opts.x + iconCol + labelCol}" y="${y + 16}" font-size="13" font-weight="800" fill="#6b7280">:</text>
    `;
    }

    const color = r.valueColor || '#111827';
    const startX = hasKey ? valueX : opts.x + 6;
    lines.forEach((line, idx) => {
      svg += `<text x="${startX}" y="${y + 16 + idx * lineHeight}" font-size="13" fill="${color}">${escapeXml(line)}</text>`;
    });

    y += blockH + 6;
  }

  return { svg, height: y - opts.y };
}

export function buildGameReminderMailSvg(input: GameMailImageInput) {
  const width = 720;
  const pad = 22;
  const headerH = 64;
  const footerH = 44;

  const nowLabel = input.nowLabel || new Date().toLocaleString('ko-KR');
  const games = Array.isArray(input.games) ? input.games.slice(0, 3) : [];

  let y = pad + headerH + 18;
  let body = '';

  body += `<text x="${pad}" y="${y}" font-size="15" font-weight="800" fill="#111827">다음 경기 일정</text>`;
  y += 26;

  if (games.length === 0) {
    body += `
      <rect x="${pad}" y="${y}" width="${width - pad * 2}" height="86" rx="12" fill="#f9fafb" stroke="#e5e7eb"/>
      <text x="${pad + 16}" y="${y + 52}" font-size="14" fill="#374151">현재 확정된 경기가 없습니다.</text>
    `;
    y += 96;
  }

  games.forEach((game, idx) => {
    const cardY = y;
    const cardW = width - pad * 2;
    const { names, mercenaryCount, totalParticipantCount } = getParticipantSummary(game);

    const dateStr = new Date(game.date).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });
    const timeStr = game.time ? ` ⏰ ${game.time}` : '';
    const location = game.location || '장소 미정';
    const address = game.locationAddress ? `(${game.locationAddress})` : '';

    const locationLines = wrapLines(location, 34, 3);
    const addressLines = address ? wrapLines(address, 34, 2) : [];

    const memberLine = names.length > 0 ? `- 회원: ${names.join(', ')}` : '';
    const mercLine = mercenaryCount > 0 ? `- 용병: ${mercenaryCount}명` : '';
    const detailLines: string[] = [];
    if (memberLine) detailLines.push(...wrapLines(memberLine, 40, 3));
    if (mercLine) detailLines.push(...wrapLines(mercLine, 40, 2));

    const rows = [
      { icon: '🏆', label: '유형', valueLines: [formatEventType(game.eventType)] },
      { icon: '📅', label: '일시', valueLines: [`${dateStr}${timeStr}`] },
      { icon: '📍', label: '장소', valueLines: [...locationLines, ...addressLines] },
      { icon: '👥', label: '참가자', valueLines: [`${totalParticipantCount}명`] },
      ...(detailLines.length
        ? [{ icon: '', label: '', valueLines: detailLines, valueColor: '#374151' as const }]
        : []),
    ];

    const rowsSvg = buildRowsSvg({ x: pad + 14, y: cardY + 16, w: cardW - 28, rows });
    const cardH = rowsSvg.height + 28;

    body += `
      <rect x="${pad}" y="${cardY}" width="${cardW}" height="${cardH}" rx="14" fill="#ffffff" stroke="#e5e7eb"/>
      <rect x="${pad}" y="${cardY}" width="${cardW}" height="6" rx="14" fill="#4f46e5"/>
    `;
    body += rowsSvg.svg;

    y = cardY + cardH + (idx === games.length - 1 ? 10 : 12);
  });

  const totalH = y + footerH + pad;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${totalH}" viewBox="0 0 ${width} ${totalH}">
  <defs>
    <linearGradient id="hdr" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#4f46e5"/>
      <stop offset="100%" stop-color="#312e81"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#000000" flood-opacity="0.12"/>
    </filter>
  </defs>

  <rect x="0" y="0" width="${width}" height="${totalH}" fill="#f3f4f6"/>

  <rect x="${pad}" y="${pad}" width="${width - pad * 2}" height="${totalH - pad * 2}" rx="16" fill="#ffffff" stroke="#e5e7eb" filter="url(#shadow)"/>

  <rect x="${pad}" y="${pad}" width="${width - pad * 2}" height="${headerH}" rx="16" fill="url(#hdr)"/>
  <rect x="${pad}" y="${pad + headerH - 16}" width="${width - pad * 2}" height="16" fill="#312e81"/>

  <text x="${pad + 20}" y="${pad + 40}" font-size="22" font-weight="800" fill="#ffffff">⚽ 경기 알림</text>
  <text x="${width - pad - 20}" y="${pad + 40}" font-size="12" fill="#e0e7ff" text-anchor="end">FC CHAL GGYEO</text>

  <text x="${pad + 20}" y="${pad + headerH + 22}" font-size="14" fill="#374151">확정된 경기 일정을 회원들에게 알립니다.</text>

  ${body}

  <text x="${pad + 20}" y="${totalH - pad - 18}" font-size="12" fill="#6b7280">발송 시간: ${escapeXml(nowLabel)}</text>
  <text x="${width - pad - 20}" y="${totalH - pad - 18}" font-size="11" fill="#9ca3af" text-anchor="end">이 메일은 자동 발송되었습니다.</text>
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
