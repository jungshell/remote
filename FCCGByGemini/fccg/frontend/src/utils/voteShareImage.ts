interface VoteShareImageOptions {
  votePeriodLabel: string;
  participationRate: number;
  votedNames: string[];
  nonVotedNames: string[];
}

const WIDTH = 1200;
const HEIGHT = 630;

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

function compactNames(names: string[], limit: number) {
  if (names.length === 0) return '없음';
  const visible = names.slice(0, limit).join(', ');
  const remaining = names.length - limit;
  return remaining > 0 ? `${visible}  외 ${remaining}명` : visible;
}

function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
) {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (context.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = word;
      if (lines.length === maxLines - 1) break;
    } else {
      line = candidate;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  lines.forEach((value, index) => context.fillText(value, x, y + index * lineHeight));
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

  const background = context.createLinearGradient(0, 0, WIDTH, HEIGHT);
  background.addColorStop(0, '#031229');
  background.addColorStop(0.55, '#073a79');
  background.addColorStop(1, '#0877ce');
  context.fillStyle = background;
  context.fillRect(0, 0, WIDTH, HEIGHT);

  const glow = context.createRadialGradient(1050, 40, 20, 1050, 40, 420);
  glow.addColorStop(0, 'rgba(72, 220, 255, .42)');
  glow.addColorStop(1, 'rgba(72, 220, 255, 0)');
  context.fillStyle = glow;
  context.fillRect(620, 0, 580, 500);

  context.strokeStyle = 'rgba(255,255,255,.07)';
  context.lineWidth = 1;
  for (let x = 0; x <= WIDTH; x += 60) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, HEIGHT);
    context.stroke();
  }
  for (let y = 0; y <= HEIGHT; y += 60) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(WIDTH, y);
    context.stroke();
  }

  context.fillStyle = '#7cecff';
  context.font = '800 22px Pretendard, "Noto Sans KR", sans-serif';
  context.letterSpacing = '4px';
  context.fillText('FC CHAL-GGYEO · MATCHDAY OS', 66, 62);
  context.letterSpacing = '0px';
  context.fillStyle = '#ffffff';
  context.font = '900 52px Pretendard, "Noto Sans KR", sans-serif';
  context.fillText('NEXT MATCH VOTE', 66, 132);
  context.fillStyle = 'rgba(255,255,255,.68)';
  context.font = '500 22px Pretendard, "Noto Sans KR", sans-serif';
  context.fillText(votePeriodLabel || '투표 일정을 확인해주세요', 68, 172);

  roundedRect(context, 66, 214, 330, 334, 28);
  context.fillStyle = 'rgba(1, 13, 31, .48)';
  context.fill();
  context.strokeStyle = 'rgba(255,255,255,.18)';
  context.stroke();

  const centerX = 231;
  const centerY = 357;
  context.lineWidth = 22;
  context.strokeStyle = 'rgba(255,255,255,.15)';
  context.beginPath();
  context.arc(centerX, centerY, 94, 0, Math.PI * 2);
  context.stroke();
  context.strokeStyle = '#58e7ff';
  context.lineCap = 'round';
  context.beginPath();
  context.arc(centerX, centerY, 94, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(100, participationRate) / 100);
  context.stroke();
  context.lineCap = 'butt';

  context.textAlign = 'center';
  context.fillStyle = '#ffffff';
  context.font = '900 54px Pretendard, "Noto Sans KR", sans-serif';
  context.fillText(`${participationRate}%`, centerX, centerY + 16);
  context.font = '700 18px Pretendard, "Noto Sans KR", sans-serif';
  context.fillStyle = 'rgba(255,255,255,.62)';
  context.fillText('VOTE RATE', centerX, centerY + 52);
  context.font = '800 20px Pretendard, "Noto Sans KR", sans-serif';
  context.fillStyle = '#a7f7ff';
  context.fillText(`${votedNames.length} / ${votedNames.length + nonVotedNames.length} PLAYERS`, centerX, 507);
  context.textAlign = 'left';

  const cards = [
    {
      y: 214,
      title: `✓ 참여 완료  ${votedNames.length}명`,
      body: compactNames(votedNames, 9),
      accent: '#77f5bc',
    },
    {
      y: 386,
      title: `! 참여 대기  ${nonVotedNames.length}명`,
      body: compactNames(nonVotedNames, 10),
      accent: '#ffd17a',
    },
  ];

  context.lineWidth = 1;
  for (const card of cards) {
    roundedRect(context, 430, card.y, 704, 148, 24);
    context.fillStyle = 'rgba(255,255,255,.095)';
    context.fill();
    context.strokeStyle = 'rgba(255,255,255,.15)';
    context.stroke();
    context.fillStyle = card.accent;
    context.font = '800 23px Pretendard, "Noto Sans KR", sans-serif';
    context.fillText(card.title, 466, card.y + 42);
    context.fillStyle = '#ffffff';
    context.font = '600 24px Pretendard, "Noto Sans KR", sans-serif';
    wrapText(context, card.body, 466, card.y + 84, 626, 34, 2);
  }

  context.fillStyle = 'rgba(255,255,255,.56)';
  context.font = '600 17px Pretendard, "Noto Sans KR", sans-serif';
  context.fillText('아직 투표하지 않은 선수는 일정·투표 페이지에서 참여해주세요.', 430, 574);
  context.fillStyle = '#7cecff';
  context.font = '800 17px Pretendard, "Noto Sans KR", sans-serif';
  context.textAlign = 'right';
  context.fillText('fccg-inoi.vercel.app/schedule-v2', 1134, 607);
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
