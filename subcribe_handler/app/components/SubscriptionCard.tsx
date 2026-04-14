'use client'

import { Calendar, DollarSign, AlertCircle, ExternalLink, Edit, Tag } from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import { ko } from 'date-fns/locale/ko'
import { formatCurrencyWithKRW } from '@/lib/exchange-rate'

interface SubscriptionCardProps {
  id: string
  serviceName: string
  amount: number
  currency: string
  nextBillingDate: string
  cycle: string
  category?: string
  tags?: string[]
  onCancel?: (id: string) => void
  onEdit?: (id: string) => void
}

export default function SubscriptionCard({
  id,
  serviceName,
  amount,
  currency,
  nextBillingDate,
  cycle,
  category,
  tags,
  onCancel,
  onEdit,
}: SubscriptionCardProps) {
  const nextDate = new Date(nextBillingDate)
  const today = new Date()
  const daysUntilBilling = differenceInDays(nextDate, today)
  const isWarning = daysUntilBilling <= 3 && daysUntilBilling >= 0

  // 통화 포맷팅 (환율 적용)
  const formatCurrency = (amount: number, currency: string) => {
    return formatCurrencyWithKRW(amount, currency)
  }

  // 주기 한글 변환
  const cycleMap: Record<string, string> = {
    monthly: '월간',
    yearly: '연간',
    weekly: '주간',
    quarterly: '분기',
  }

  // 해지 링크 생성 (구글 검색)
  const getCancelLink = (serviceName: string) => {
    const encodedName = encodeURIComponent(`${serviceName} 해지`)
    return `https://www.google.com/search?q=${encodedName}`
  }

  return (
    <div
      className={`relative rounded-2xl bg-white p-6 shadow-[0_1px_2px_0_rgba(60,64,67,0.3),0_2px_6px_2px_rgba(60,64,67,0.15)] transition-all duration-200 hover:shadow-[0_2px_4px_0_rgba(60,64,67,0.3),0_4px_8px_4px_rgba(60,64,67,0.15)] ${
        isWarning
          ? 'border-2 border-[#ea4335] bg-[#fce8e6]'
          : ''
      }`}
    >
      {/* 경고 배지 */}
      {isWarning && (
        <div className="absolute -top-2 -right-2 flex items-center gap-1.5 rounded-full bg-[#ea4335] px-3 py-1.5 text-xs font-medium text-white shadow-lg">
          <AlertCircle className="h-3.5 w-3.5" />
          해지 주의!
        </div>
      )}

      <div className="space-y-5">
        {/* 서비스명 및 카테고리 */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <h3 className="text-xl font-normal text-[#202124] leading-tight">{serviceName}</h3>
            {category && (
              <span className="mt-1 inline-block rounded-full bg-[#e8f0fe] px-2.5 py-0.5 text-xs font-medium text-[#1a73e8]">
                {category}
              </span>
            )}
          </div>
          {onEdit && (
            <button
              onClick={() => onEdit(id)}
              className="rounded-full p-2 text-[#5f6368] hover:bg-[#f1f3f4] transition-colors"
              title="수정"
            >
              <Edit className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* 태그 */}
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 rounded-full bg-[#f1f3f4] px-2 py-0.5 text-xs text-[#5f6368]"
              >
                <Tag className="h-3 w-3" />
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* 금액 및 주기 */}
        <div className="flex items-baseline gap-2">
          <DollarSign className="h-5 w-5 text-[#1a73e8] flex-shrink-0 mt-0.5" />
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-normal text-[#202124]">{formatCurrency(amount, currency)}</span>
            <span className="text-sm text-[#5f6368]">/ {cycleMap[cycle] || cycle}</span>
          </div>
        </div>

        {/* 다음 결제일 */}
        <div className="flex items-center gap-2 text-[#5f6368]">
          <Calendar className="h-4 w-4 text-[#1a73e8] flex-shrink-0" />
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm">
              {format(nextDate, 'yyyy년 MM월 dd일', { locale: ko })}
            </span>
            {daysUntilBilling >= 0 && (
              <span className="text-xs text-[#80868b] bg-[#f1f3f4] px-2 py-0.5 rounded-full">
                {daysUntilBilling}일 후
              </span>
            )}
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="flex gap-2 pt-2">
          <a
            href={getCancelLink(serviceName)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[#1a73e8] px-4 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:bg-[#1557b0] hover:shadow-md active:bg-[#174ea6]"
          >
            <ExternalLink className="h-4 w-4" />
            해지하러 가기
          </a>
          {onCancel && (
            <button
              onClick={() => onCancel(id)}
              className="rounded-full border border-[#dadce0] px-4 py-2.5 text-sm font-medium text-[#5f6368] transition-all duration-200 hover:bg-[#f8f9fa] hover:border-[#c4c7c5] active:bg-[#f1f3f4]"
            >
              해지 완료
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

