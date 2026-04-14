'use server'

import { GoogleGenerativeAI } from '@google/generative-ai'
import { storage, Subscription } from '@/lib/storage'

const geminiApiKey = process.env.GEMINI_API_KEY

if (!geminiApiKey) {
  throw new Error('Missing GEMINI_API_KEY environment variable')
}

const genAI = new GoogleGenerativeAI(geminiApiKey)

export interface ParsedSubscription {
  service_name: string
  amount: number
  currency: string
  cycle: 'monthly' | 'yearly' | 'weekly' | 'quarterly'
  next_billing_date: string
  billing_email?: string
}

/**
 * Gemini API를 사용하여 결제 텍스트에서 구독 정보 추출
 */
export async function parseSubscriptionText(text: string): Promise<ParsedSubscription | null> {
  try {
    if (!text || text.trim().length === 0) {
      throw new Error('텍스트를 입력해주세요.')
    }

    // Gemini 모델 초기화 - 최신 모델 사용
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' })

    const prompt = `
다음은 정기구독 결제 알림 텍스트입니다. 이 텍스트에서 다음 정보를 추출하여 JSON 형식으로 응답해주세요:

1. service_name: 서비스명 (예: 넷플릭스, 스포티파이, 유튜브 프리미엄 등)
2. amount: 결제 금액 (숫자만, 소수점 포함 가능)
3. currency: 통화 (KRW, USD, EUR 등, 기본값은 KRW)
4. cycle: 결제 주기 ('monthly', 'yearly', 'weekly', 'quarterly' 중 하나)
5. next_billing_date: 다음 결제 예정일 (YYYY-MM-DD 형식)
6. billing_email: 결제 이메일 주소 (있는 경우만)

만약 날짜가 명시되어 있지 않다면, 오늘 날짜를 기준으로 주기에 맞춰 계산해주세요.
예를 들어, 오늘이 2024-01-15이고 주기가 'monthly'라면 다음 결제일은 2024-02-15가 됩니다.

응답은 반드시 유효한 JSON 형식이어야 하며, 다른 설명 없이 JSON만 반환해주세요.

텍스트:
${text}
`

    const result = await model.generateContent(prompt)
    const response = result.response
    const textResponse = response.text()

    // JSON 추출 (마크다운 코드 블록 제거)
    let jsonText = textResponse.trim()
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '')
    }

    const parsed = JSON.parse(jsonText) as ParsedSubscription

    // 데이터 검증
    if (!parsed.service_name || !parsed.amount || !parsed.cycle || !parsed.next_billing_date) {
      throw new Error('필수 필드가 누락되었습니다.')
    }

    // 날짜 형식 검증
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(parsed.next_billing_date)) {
      throw new Error('날짜 형식이 올바르지 않습니다.')
    }

    // 통화 기본값 설정
    if (!parsed.currency) {
      parsed.currency = 'KRW'
    }

    return parsed
  } catch (error) {
    console.error('Gemini API 오류:', error)

    // 더 자세한 에러 메시지 제공
    let errorMessage = '텍스트 분석 중 오류가 발생했습니다.'

    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        errorMessage = 'Gemini API 키가 유효하지 않습니다. 환경 변수를 확인해주세요.'
      } else if (error.message.includes('model')) {
        errorMessage = 'Gemini 모델을 사용할 수 없습니다. API 키와 모델 이름을 확인해주세요.'
      } else if (error.message.includes('quota') || error.message.includes('limit')) {
        errorMessage = 'Gemini API 할당량을 초과했습니다. 잠시 후 다시 시도해주세요.'
      } else {
        errorMessage = `오류: ${error.message}`
      }
    }

    throw new Error(errorMessage)
  }
}

/**
 * 구독 정보를 저장 (로컬 파일)
 */
export async function saveSubscription(
  userId: string,
  subscription: ParsedSubscription
) {
  try {
    const newSub = await storage.subscriptions.add({
      user_id: userId,
      service_name: subscription.service_name,
      amount: subscription.amount,
      currency: subscription.currency,
      next_billing_date: subscription.next_billing_date,
      cycle: subscription.cycle,
      billing_email: subscription.billing_email,
      status: 'active',
      category: undefined,
      tags: [],
      service_url: undefined,
      notes: undefined
    });

    return newSub
  } catch (error) {
    console.error('저장 오류:', error)
    throw new Error('구독 정보 저장에 실패했습니다.')
  }
}

/**
 * 사용자의 모든 구독 정보 조회
 */
export async function getSubscriptions(userId: string) {
  try {
    const all = await storage.subscriptions.getAll();
    // Filter by user_id and status='active', sort by next_billing_date
    return all
      .filter(sub => sub.user_id === userId && sub.status === 'active')
      .sort((a, b) => new Date(a.next_billing_date).getTime() - new Date(b.next_billing_date).getTime());
  } catch (error) {
    console.error('조회 오류:', error)
    throw new Error('구독 정보를 불러오는데 실패했습니다.')
  }
}

/**
 * 구독 정보 수정
 */
export async function updateSubscription(
  subscriptionId: string,
  updates: {
    service_name?: string
    amount?: number
    currency?: string
    next_billing_date?: string
    cycle?: 'monthly' | 'yearly' | 'weekly' | 'quarterly'
    category?: string
    tags?: string[]
    billing_email?: string
    service_url?: string
    notes?: string
  }
) {
  try {
    // In local storage implementation, direct update is supported
    const updated = await storage.subscriptions.update(subscriptionId, updates);
    return updated;
  } catch (error) {
    console.error('수정 오류:', error)
    throw new Error('구독 정보 수정에 실패했습니다.')
  }
}

/**
 * 구독 정보 조회 (단일)
 */
export async function getSubscription(subscriptionId: string) {
  try {
    const all = await storage.subscriptions.getAll();
    const sub = all.find(s => s.id === subscriptionId);
    if (!sub) {
      throw new Error('Subscription not found');
    }
    return sub;
  } catch (error) {
    console.error('조회 오류:', error)
    throw new Error('구독 정보를 불러오는데 실패했습니다.')
  }
}

/**
 * 구독 정보 삭제 (해지)
 */
export async function cancelSubscription(subscriptionId: string) {
  try {
    const updated = await storage.subscriptions.update(subscriptionId, { status: 'cancelled' });
    return updated;
  } catch (error) {
    console.error('해지 오류:', error)
    throw new Error('구독 해지에 실패했습니다.')
  }
}

/**
 * 구독 정보 검색 및 필터링
 */
export async function searchSubscriptions(
  userId: string,
  filters: {
    search?: string
    category?: string
    minAmount?: number
    maxAmount?: number
    cycle?: string
    sortBy?: 'next_billing_date' | 'amount' | 'service_name'
    sortOrder?: 'asc' | 'desc'
  } = {}
) {
  try {
    let results = await getSubscriptions(userId); // Already gets active ones sorted by date

    // 검색어 필터
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      results = results.filter(sub =>
        sub.service_name.toLowerCase().includes(searchLower) ||
        (sub.notes && sub.notes.toLowerCase().includes(searchLower))
      );
    }

    // 카테고리 필터
    if (filters.category) {
      results = results.filter(sub => sub.category === filters.category);
    }

    // 금액 범위 필터
    if (filters.minAmount !== undefined) {
      results = results.filter(sub => sub.amount >= filters.minAmount!);
    }
    if (filters.maxAmount !== undefined) {
      results = results.filter(sub => sub.amount <= filters.maxAmount!);
    }

    // 주기 필터
    if (filters.cycle) {
      results = results.filter(sub => sub.cycle === filters.cycle);
    }

    // 정렬
    if (filters.sortBy) {
      results.sort((a, b) => {
        let valA: any = a[filters.sortBy!];
        let valB: any = b[filters.sortBy!];

        // Handle date comparison specifically if needed, though string comparison works for ISO dates
        // Handle numbers
        if (filters.sortBy === 'amount') {
          valA = Number(valA);
          valB = Number(valB);
        }

        if (valA < valB) return filters.sortOrder === 'desc' ? 1 : -1;
        if (valA > valB) return filters.sortOrder === 'desc' ? -1 : 1;
        return 0;
      });
    }

    return results;
  } catch (error) {
    console.error('검색 오류:', error)
    throw error // Re-throw to handle in UI
  }
}

/**
 * 결제 내역 저장
 */
export async function savePaymentHistory(
  userId: string,
  subscriptionId: string,
  paymentDate: string,
  amount: number,
  currency: string = 'KRW',
  status: 'paid' | 'failed' | 'refunded' = 'paid',
  notes?: string
) {
  try {
    // Create a plain object for the record
    const record = {
      user_id: userId,
      subscription_id: subscriptionId,
      payment_date: paymentDate,
      amount,
      currency,
      status,
      notes
    };

    const newHistory = await storage.paymentHistory.add(record);
    return newHistory;
  } catch (error) {
    console.error('저장 오류:', error)
    throw new Error('결제 내역 저장에 실패했습니다.')
  }
}

/**
 * 결제 내역 조회
 */
export async function getPaymentHistory(
  userId: string,
  subscriptionId?: string,
  startDate?: string,
  endDate?: string
) {
  try {
    const all = await storage.paymentHistory.getAll();
    let query = all.filter(h => h.user_id === userId);

    if (subscriptionId) {
      query = query.filter(h => h.subscription_id === subscriptionId);
    }

    if (startDate) {
      query = query.filter(h => h.payment_date >= startDate);
    }

    if (endDate) {
      query = query.filter(h => h.payment_date <= endDate);
    }

    // Sort by payment_date descending
    query.sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());

    return query;
  } catch (error) {
    console.error('조회 오류:', error)
    throw new Error('결제 내역을 불러오는데 실패했습니다.')
  }
}

/**
 * 통계 조회
 */
export async function getStatistics(userId: string, year?: number, month?: number) {
  try {
    const subscriptions = await getSubscriptions(userId)

    // 월간/연간 통계 계산
    const stats = {
      totalSubscriptions: subscriptions.length,
      monthlyTotal: 0,
      yearlyTotal: 0,
      byCategory: {} as Record<string, number>,
      byCycle: {} as Record<string, number>,
    }

    subscriptions.forEach((sub) => {
      const amount = Number(sub.amount)
      const krwAmount = sub.currency === 'KRW' ? amount : amount * 1 // 환율 변환은 별도 처리 필요

      // 주기별 계산
      if (sub.cycle === 'monthly') {
        stats.monthlyTotal += krwAmount
        stats.yearlyTotal += krwAmount * 12
      } else if (sub.cycle === 'yearly') {
        stats.monthlyTotal += krwAmount / 12
        stats.yearlyTotal += krwAmount
      } else if (sub.cycle === 'quarterly') {
        stats.monthlyTotal += krwAmount / 3
        stats.yearlyTotal += krwAmount * 4
      } else if (sub.cycle === 'weekly') {
        stats.monthlyTotal += krwAmount * 4.33
        stats.yearlyTotal += krwAmount * 52
      }

      // 카테고리별 집계
      if (sub.category) {
        stats.byCategory[sub.category] = (stats.byCategory[sub.category] || 0) + krwAmount
      }

      // 주기별 집계
      stats.byCycle[sub.cycle] = (stats.byCycle[sub.cycle] || 0) + krwAmount
    })

    return stats
  } catch (error) {
    console.error('통계 조회 오류:', error)
    throw error
  }
}

/**
 * 데이터 내보내기 (CSV 형식)
 */
export async function exportSubscriptionsToCSV(userId: string): Promise<string> {
  try {
    const subscriptions = await getSubscriptions(userId)

    const headers = [
      '서비스명',
      '금액',
      '통화',
      '다음 결제일',
      '주기',
      '카테고리',
      '태그',
      '결제 이메일',
      '서비스 URL',
      '메모',
    ]

    const rows = subscriptions.map((sub) => [
      sub.service_name,
      sub.amount,
      sub.currency,
      sub.next_billing_date,
      sub.cycle,
      sub.category || '',
      (sub.tags || []).join(', '),
      sub.billing_email || '',
      sub.service_url || '',
      sub.notes || '',
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n')

    return csvContent
  } catch (error) {
    console.error('CSV 내보내기 오류:', error)
    throw error
  }
}

/**
 * 데이터 내보내기 (JSON 형식)
 */
export async function exportSubscriptionsToJSON(userId: string) {
  try {
    const subscriptions = await getSubscriptions(userId)
    return JSON.stringify(subscriptions, null, 2)
  } catch (error) {
    console.error('JSON 내보내기 오류:', error)
    throw error
  }
}

