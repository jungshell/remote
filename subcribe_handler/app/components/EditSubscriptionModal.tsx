'use client'

import { useState, useEffect } from 'react'
import { X, Loader2 } from 'lucide-react'
import { updateSubscription, getSubscription } from '@/app/actions/subscription'

interface EditSubscriptionModalProps {
  subscriptionId: string
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const CATEGORIES = [
  '스트리밍',
  '클라우드',
  '소프트웨어',
  '음악',
  '게임',
  '뉴스',
  '교육',
  '기타',
]

export default function EditSubscriptionModal({
  subscriptionId,
  isOpen,
  onClose,
  onSuccess,
}: EditSubscriptionModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    service_name: '',
    amount: '',
    currency: 'KRW',
    next_billing_date: '',
    cycle: 'monthly' as 'monthly' | 'yearly' | 'weekly' | 'quarterly',
    category: '',
    tags: '',
    billing_email: '',
    service_url: '',
    notes: '',
  })

  useEffect(() => {
    if (isOpen && subscriptionId) {
      loadSubscription()
    }
  }, [isOpen, subscriptionId])

  const loadSubscription = async () => {
    setIsLoading(true)
    try {
      const subscription = await getSubscription(subscriptionId)
      setFormData({
        service_name: subscription.service_name || '',
        amount: String(subscription.amount || ''),
        currency: subscription.currency || 'KRW',
        next_billing_date: subscription.next_billing_date || '',
        cycle: subscription.cycle || 'monthly',
        category: subscription.category || '',
        tags: (subscription.tags || []).join(', '),
        billing_email: subscription.billing_email || '',
        service_url: subscription.service_url || '',
        notes: subscription.notes || '',
      })
    } catch (error) {
      alert(error instanceof Error ? error.message : '구독 정보를 불러오는데 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const tagsArray = formData.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0)

      await updateSubscription(subscriptionId, {
        service_name: formData.service_name,
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        next_billing_date: formData.next_billing_date,
        cycle: formData.cycle,
        category: formData.category || undefined,
        tags: tagsArray.length > 0 ? tagsArray : undefined,
        billing_email: formData.billing_email || undefined,
        service_url: formData.service_url || undefined,
        notes: formData.notes || undefined,
      })

      onSuccess()
      onClose()
    } catch (error) {
      alert(error instanceof Error ? error.message : '수정에 실패했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white p-8 shadow-xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-[#5f6368] hover:bg-[#f1f3f4] transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="mb-6 text-2xl font-normal text-[#202124]">구독 정보 수정</h2>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#1a73e8]" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-[#5f6368] mb-2">
                  서비스명 *
                </label>
                <input
                  type="text"
                  required
                  value={formData.service_name}
                  onChange={(e) => setFormData({ ...formData, service_name: e.target.value })}
                  className="w-full rounded-xl border border-[#dadce0] px-4 py-2.5 text-sm text-[#202124] focus:border-[#1a73e8] focus:outline-none focus:ring-2 focus:ring-[#1a73e8]/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#5f6368] mb-2">
                  금액 *
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="flex-1 rounded-xl border border-[#dadce0] px-4 py-2.5 text-sm text-[#202124] focus:border-[#1a73e8] focus:outline-none focus:ring-2 focus:ring-[#1a73e8]/20"
                  />
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="rounded-xl border border-[#dadce0] px-4 py-2.5 text-sm text-[#202124] focus:border-[#1a73e8] focus:outline-none focus:ring-2 focus:ring-[#1a73e8]/20"
                  >
                    <option value="KRW">KRW</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="JPY">JPY</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#5f6368] mb-2">
                  다음 결제일 *
                </label>
                <input
                  type="date"
                  required
                  value={formData.next_billing_date}
                  onChange={(e) => setFormData({ ...formData, next_billing_date: e.target.value })}
                  className="w-full rounded-xl border border-[#dadce0] px-4 py-2.5 text-sm text-[#202124] focus:border-[#1a73e8] focus:outline-none focus:ring-2 focus:ring-[#1a73e8]/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#5f6368] mb-2">
                  결제 주기 *
                </label>
                <select
                  required
                  value={formData.cycle}
                  onChange={(e) => setFormData({ ...formData, cycle: e.target.value as any })}
                  className="w-full rounded-xl border border-[#dadce0] px-4 py-2.5 text-sm text-[#202124] focus:border-[#1a73e8] focus:outline-none focus:ring-2 focus:ring-[#1a73e8]/20"
                >
                  <option value="monthly">월간</option>
                  <option value="yearly">연간</option>
                  <option value="quarterly">분기</option>
                  <option value="weekly">주간</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#5f6368] mb-2">
                  카테고리
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full rounded-xl border border-[#dadce0] px-4 py-2.5 text-sm text-[#202124] focus:border-[#1a73e8] focus:outline-none focus:ring-2 focus:ring-[#1a73e8]/20"
                >
                  <option value="">선택 안 함</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#5f6368] mb-2">
                  태그 (쉼표로 구분)
                </label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="예: 필수, 자동결제"
                  className="w-full rounded-xl border border-[#dadce0] px-4 py-2.5 text-sm text-[#202124] focus:border-[#1a73e8] focus:outline-none focus:ring-2 focus:ring-[#1a73e8]/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#5f6368] mb-2">
                  결제 이메일
                </label>
                <input
                  type="email"
                  value={formData.billing_email}
                  onChange={(e) => setFormData({ ...formData, billing_email: e.target.value })}
                  className="w-full rounded-xl border border-[#dadce0] px-4 py-2.5 text-sm text-[#202124] focus:border-[#1a73e8] focus:outline-none focus:ring-2 focus:ring-[#1a73e8]/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#5f6368] mb-2">
                  서비스 URL
                </label>
                <input
                  type="url"
                  value={formData.service_url}
                  onChange={(e) => setFormData({ ...formData, service_url: e.target.value })}
                  placeholder="https://..."
                  className="w-full rounded-xl border border-[#dadce0] px-4 py-2.5 text-sm text-[#202124] focus:border-[#1a73e8] focus:outline-none focus:ring-2 focus:ring-[#1a73e8]/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#5f6368] mb-2">
                메모
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full rounded-xl border border-[#dadce0] px-4 py-2.5 text-sm text-[#202124] focus:border-[#1a73e8] focus:outline-none focus:ring-2 focus:ring-[#1a73e8]/20"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-full border border-[#dadce0] px-6 py-3 text-sm font-medium text-[#5f6368] transition-all duration-200 hover:bg-[#f8f9fa] hover:border-[#c4c7c5]"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 rounded-full bg-[#1a73e8] px-6 py-3 text-sm font-medium text-white transition-all duration-200 hover:bg-[#1557b0] hover:shadow-md disabled:cursor-not-allowed disabled:bg-[#dadce0]"
              >
                {isSaving ? '저장 중...' : '저장하기'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

