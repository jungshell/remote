/**
 * 환율 정보 및 변환 유틸리티
 */

// 주요 통화별 환율 (2024년 12월 기준, 약간의 여유를 두고 설정)
const EXCHANGE_RATES: Record<string, number> = {
  KRW: 1, // 기준 통화
  USD: 1350, // 1 USD = 1,350 KRW
  EUR: 1480, // 1 EUR = 1,480 KRW
  GBP: 1700, // 1 GBP = 1,700 KRW
  JPY: 9.2, // 1 JPY = 9.2 KRW (100 JPY = 920 KRW)
  CNY: 190, // 1 CNY = 190 KRW
  AUD: 900, // 1 AUD = 900 KRW
  CAD: 1000, // 1 CAD = 1,000 KRW
  HKD: 173, // 1 HKD = 173 KRW
  SGD: 1000, // 1 SGD = 1,000 KRW
  MYR: 290, // 1 MYR = 290 KRW (말레이시아 링깃)
  THB: 38, // 1 THB = 38 KRW
  PHP: 24, // 1 PHP = 24 KRW
  IDR: 0.086, // 1 IDR = 0.086 KRW (1000 IDR = 86 KRW)
  VND: 0.055, // 1 VND = 0.055 KRW (1000 VND = 55 KRW)
  INR: 16, // 1 INR = 16 KRW
  CHF: 1550, // 1 CHF = 1,550 KRW
  NZD: 830, // 1 NZD = 830 KRW
  SEK: 130, // 1 SEK = 130 KRW
  NOK: 130, // 1 NOK = 130 KRW
  DKK: 200, // 1 DKK = 200 KRW
  PLN: 340, // 1 PLN = 340 KRW
  MXN: 80, // 1 MXN = 80 KRW
  BRL: 270, // 1 BRL = 270 KRW
  ZAR: 75, // 1 ZAR = 75 KRW
  TRY: 45, // 1 TRY = 45 KRW
  RUB: 15, // 1 RUB = 15 KRW
}

/**
 * 통화를 원화(KRW)로 변환
 */
export function convertToKRW(amount: number, currency: string): number {
  const upperCurrency = currency.toUpperCase()
  const rate = EXCHANGE_RATES[upperCurrency] || 1

  if (upperCurrency === 'KRW') {
    return amount
  }

  return amount * rate
}

/**
 * 통화 코드가 유효한지 확인
 */
export function isValidCurrency(currency: string): boolean {
  return currency.toUpperCase() in EXCHANGE_RATES
}

/**
 * 통화별 환율 정보 가져오기
 */
export function getExchangeRate(currency: string): number {
  return EXCHANGE_RATES[currency.toUpperCase()] || 1
}

/**
 * 통화 포맷팅 (원화 변환 포함)
 */
export function formatCurrencyWithKRW(
  amount: number,
  currency: string
): string {
  const upperCurrency = currency.toUpperCase()
  
  // 원화 변환
  const krwAmount = convertToKRW(amount, currency)
  
  // 원본 통화 포맷팅
  let originalFormat = ''
  if (upperCurrency === 'KRW') {
    originalFormat = `${amount.toLocaleString('ko-KR')}원`
  } else if (upperCurrency === 'USD') {
    originalFormat = `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  } else if (upperCurrency === 'EUR') {
    originalFormat = `€${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  } else if (upperCurrency === 'GBP') {
    originalFormat = `£${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  } else if (upperCurrency === 'JPY') {
    originalFormat = `¥${amount.toLocaleString('en-US')}`
  } else if (upperCurrency === 'MYR') {
    originalFormat = `RM ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  } else {
    originalFormat = `${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${upperCurrency}`
  }
  
  // KRW가 아니면 원화 환산액도 표시
  if (upperCurrency !== 'KRW') {
    return `${originalFormat} (약 ${krwAmount.toLocaleString('ko-KR')}원)`
  }
  
  return originalFormat
}

/**
 * 모든 지원 통화 목록
 */
export function getSupportedCurrencies(): string[] {
  return Object.keys(EXCHANGE_RATES)
}


