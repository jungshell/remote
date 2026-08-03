interface VoteShareImageOptions {
  votePeriodLabel: string;
  participationRate: number;
  votedNames: string[];
  nonVotedNames: string[];
}

const WIDTH = 1080;
const HEIGHT = 1350;
const FONT_FAMILY = 'Pretendard, "Noto Sans KR", "Malgun Gothic", sans-serif';

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

function sortNames(names: string[]) {
  return [...new Set(names.map((name) => name.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'ko-KR'),
  );
}

function splitNameRows(names: string[], perRow: number) {
  const rows: string[][] = [];
  for (let index = 0; index < names.length; index += perRow) {
    rows.push(names.slice(index, index + perRow));
  }
  return rows.length > 0 ? rows : [['없음']];
}

function drawRosterCard(
  context: CanvasRenderingContext2D,
  options: {
    y: number;
    height: number;
    title: string;
    names: string[];
    accent: string;
    softAccent: string;
  },
) {
  const { y, height, title, names, accent, softAccent } = options;
  roundedRect(context, 72, y, 936, height, 34);
  context.fillStyle = 'rgba(255,255,255,0.97)';
  context.fill();
  context.strokeStyle = 'rgba(255,255,255,0.32)';
  context.lineWidth = 1;
  context.stroke();

  roundedRect(context, 106, y + 32, 16, 52, 8);
  context.fillStyle = accent;
  context.fill();

  context.fillStyle = '#0F172A';
  context.font = `800 30px ${FONT_FAMILY}`;
  context.fillText(title, 146, y + 68);

  const sortedNames = sortNames(names);
  const perRow = sortedNames.length >= 10 ? 4 : 3;
  const rows = splitNameRows(sortedNames, perRow);
  const availableWidth = 840;
  const columnWidth = availableWidth / perRow;
  const startY = y + 126;
  const rowHeight = 54;

  context.font = `750 ${sortedNames.length >= 13 ? 25 : 28}px ${FONT_FAMILY}`;
  rows.slice(0, 4).forEach((row, rowIndex) => {
    row.forEach((name, columnIndex) => {
      const chipX = 104 + columnIndex * columnWidth;
      const chipY = startY + rowIndex * rowHeight;
      roundedRect(context, chipX, chipY - 34, columnWidth - 14, 42, 16);
      context.fillStyle = softAccent;
      context.fill();
      context.fillStyle = '#1E293B';
      context.textAlign = 'center';
      context.fillText(name, chipX + (columnWidth - 14) / 2, chipY - 5);
      context.textAlign = 'left';
    });
  });
}

export async function createVoteShareImage({
  votePeriodLabel,
  participationRate,
  votedNames,
  nonVotedNames,
}: VoteShareImageOptions): Promise<File> {
  if (document.fonts?.ready) await document.fonts.ready;

  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('공유 이미지를 만들 수 없습니다.');

  const safeRate = Math.min(100, Math.max(0, participationRate));
  const totalMembers = votedNames.length + nonVotedNames.length;

  const background = context.createLinearGradient(0, 0, WIDTH, HEIGHT);
  background.addColorStop(0, '#031B38');
  background.addColorStop(0.5, '#064A96');
  background.addColorStop(1, '#0B78D0');
  context.fillStyle = background;
  context.fillRect(0, 0, WIDTH, HEIGHT);

  const glow = context.createRadialGradient(900, 90, 20, 900, 90, 520);
  glow.addColorStop(0, 'rgba(124,235,255,0.42)');
  glow.addColorStop(1, 'rgba(124,235,255,0)');
  context.fillStyle = glow;
  context.fillRect(420, 0, 660, 620);

  context.strokeStyle = 'rgba(255,255,255,0.055)';
  context.lineWidth = 1;
  for (let x = 0; x <= WIDTH; x += 54) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, HEIGHT);
    context.stroke();
  }
  for (let y = 0; y <= HEIGHT; y += 54) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(WIDTH, y);
    context.stroke();
  }

  context.fillStyle = '#7CEBFF';
  context.font = `850 24px ${FONT_FAMILY}`;
  context.letterSpacing = '5px';
  context.fillText('FC CHAL-GGYEO', 72, 82);
  context.letterSpacing = '0px';
  context.fillStyle = '#FFFFFF';
  context.font = `900 54px ${FONT_FAMILY}`;
  context.fillText('다음 경기 투표 현황', 72, 154);
  context.fillStyle = 'rgba(255,255,255,0.76)';
  context.font = `650 25px ${FONT_FAMILY}`;
  context.fillText(votePeriodLabel || '투표 일정을 확인해주세요', 74, 202);

  roundedRect(context, 72, 246, 936, 300, 38);
  context.fillStyle = 'rgba(1, 18, 43, 0.50)';
  context.fill();
  context.strokeStyle = 'rgba(255,255,255,0.22)';
  context.stroke();

  const centerX = 260;
  const centerY = 396;
  context.lineWidth = 25;
  context.strokeStyle = 'rgba(255,255,255,0.16)';
  context.beginPath();
  context.arc(centerX, centerY, 92, 0, Math.PI * 2);
  context.stroke();
  context.strokeStyle = '#7CEBFF';
  context.lineCap = 'round';
  context.beginPath();
  context.arc(
    centerX,
    centerY,
    92,
    -Math.PI / 2,
    -Math.PI / 2 + Math.PI * 2 * (safeRate / 100),
  );
  context.stroke();
  context.lineCap = 'butt';

  context.textAlign = 'center';
  context.fillStyle = '#FFFFFF';
  context.font = `900 58px ${FONT_FAMILY}`;
  context.fillText(`${safeRate}%`, centerX, centerY + 18);
  context.font = `750 19px ${FONT_FAMILY}`;
  context.fillStyle = 'rgba(255,255,255,0.68)';
  context.fillText('VOTE RATE', centerX, centerY + 55);

  context.textAlign = 'left';
  context.fillStyle = '#7CEBFF';
  context.font = `850 24px ${FONT_FAMILY}`;
  context.fillText('VOTE STATUS', 444, 322);
  context.fillStyle = '#FFFFFF';
  context.font = `900 70px ${FONT_FAMILY}`;
  context.fillText(`${votedNames.length} / ${totalMembers}`, 440, 408);
  context.font = `700 27px ${FONT_FAMILY}`;
  context.fillStyle = 'rgba(255,255,255,0.82)';
  context.fillText('명 참여 완료', 444, 452);

  roundedRect(context, 442, 480, 430, 12, 6);
  context.fillStyle = 'rgba(255,255,255,0.16)';
  context.fill();
  roundedRect(context, 442, 480, 430 * (safeRate / 100), 12, 6);
  context.fillStyle = '#FEE500';
  context.fill();

  drawRosterCard(context, {
    y: 588,
    height: 258,
    title: `참여 완료 · ${votedNames.length}명`,
    names: votedNames,
    accent: '#059669',
    softAccent: '#D1FAE5',
  });
  drawRosterCard(context, {
    y: 872,
    height: 300,
    title: `참여 대기 · ${nonVotedNames.length}명`,
    names: nonVotedNames,
    accent: '#EA580C',
    softAccent: '#FFEDD5',
  });

  context.fillStyle = 'rgba(255,255,255,0.82)';
  context.font = `650 22px ${FONT_FAMILY}`;
  context.fillText('아직 투표 전이라면 일정 탭에서 참여해주세요.', 72, 1238);
  context.fillStyle = '#7CEBFF';
  context.font = `800 20px ${FONT_FAMILY}`;
  context.fillText('fccg-inoi.vercel.app/schedule-v2', 72, 1279);

  const generatedAt = new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());
  context.textAlign = 'right';
  context.fillStyle = 'rgba(255,255,255,0.58)';
  context.font = `600 18px ${FONT_FAMILY}`;
  context.fillText(`${generatedAt} 기준`, 1008, 1279);
  context.textAlign = 'left';

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => {
      if (value) resolve(value);
      else reject(new Error('공유 이미지 변환에 실패했습니다.'));
    }, 'image/png');
  });

  return new File([blob], `fccg-vote-${new Date().toISOString().slice(0, 10)}.png`, {
    type: 'image/png',
  });
}
