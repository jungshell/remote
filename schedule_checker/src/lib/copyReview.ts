/**
 * 규칙 기반 문구 점검 (간결/친절/정중)
 */
export type CopyTone = 'concise' | 'friendly' | 'formal';

export function suggestCopy(input: string, tone: CopyTone): string {
  const trimmed = input.trim();
  if (!trimmed) return '';

  switch (tone) {
    case 'concise': {
      // 간결: 불필요한 말 줄이기, 단문 위주
      let s = trimmed
        .replace(/\s*그리고\s+/g, ', ')
        .replace(/\s*또한\s+/g, ', ')
        .replace(/\s*하여\s+/g, '해 ')
        .replace(/\s+해\s+주세요\.?/g, '해 주세요.');
      if (s.length > 80 && s.includes('.')) {
        const first = s.split('.')[0];
        if (first && first.length >= 20) s = first + '.';
      }
      return s || trimmed;
    }
    case 'friendly': {
      // 친절: 해요체, 부드러운 종결
      let s = trimmed
        .replace(/합니다\.?/g, '해요.')
        .replace(/됩니다\.?/g, '돼요.')
        .replace(/합니다/g, '해요')
        .replace(/입니다\.?/g, '이에요.')
        .replace(/주세요\.?/g, '주세요.');
      if (!/\.$|요\.$|세요\.$/.test(s)) s = s.replace(/\.$/, '') + ' 해요.';
      return s || trimmed;
    }
    case 'formal': {
      // 정중: 합쇼체/합니다체
      let s = trimmed
        .replace(/해요\.?/g, '합니다.')
        .replace(/돼요\.?/g, '됩니다.')
        .replace(/이에요\.?/g, '입니다.')
        .replace(/([가-힣])요\.?$/g, '$1습니다.');
      if (!/습니다\.?|합니다\.?|입니다\.?|됩니다\.?$/.test(s)) s = s.replace(/\.$/, '') + ' 합니다.';
      return s || trimmed;
    }
    default:
      return trimmed;
  }
}
