'use client'

import { useState, useEffect } from 'react'
import { Calendar, DollarSign, Loader2, TrendingUp } from 'lucide-react'
import { getPaymentHistory, savePaymentHistory } from '@/app/actions/subscription'
import { formatCurrencyWithKRW } from '@/lib/exchange-rate'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale/ko'

interface PaymentHistoryProps {
  userId: string
  subscriptionId?: string
}

export default function PaymentHistory({ userId, subscriptionId }: PaymentHistoryProps) {
  const [payments, setPayments] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    payment_date: new Date().toISOString().split('T')[0],
    amount: '',
    currency: 'KRW',
    status: 'paid' as 'paid' | 'failed' | 'refunded',
    notes: '',
  })

  useEffect(() => {
    loadHistory()
  }, [userId, subscriptionId])

  const loadHistory = async () => {
    setIsLoading(true)
    try {
      const data = await getPaymentHistory(userId, subscriptionId)
      setPayments(data)
    } catch (error) {
      console.error('결제 내역 로드 오류:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subscriptionId) {
      alert('구독을 선택해주세요.')
      return
    }

    try {
      await savePaymentHistory(
        userId,
        subscriptionId,
        formData.payment_date,
        parseFloat(formData.amount),
        formData.currency,
        formData.status,
        formData.notes || undefined
      )
      setShowAddForm(false)
      setFormData({
        payment_date: new Date().toISOString().split('T')[0],
        amount: '',
        currency: 'KRW',
        status: 'paid',
        notes: '',
      })
      loadHistory()
    } catch (error) {
      alert(error instanceof Error ? error.message : '결제 내역 추가에 실패했습니다.')
    }
  }

  const totalAmount = payments
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-[#1a73e8]" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-[#34a853] p-2">
            <Calendar className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-[#202124]">결제 내역</h3>
            <p className="text-sm text-[#5f6368]">
              총 {payments.length}건, {formatCurrencyWithKRW(totalAmount, 'KRW')}
            </p>
          </div>
        </div>
        {subscriptionId && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="rounded-full border border-[#dadce0] px-4 py-2 text-sm font-medium text-[#5f6368] transition-all duration-200 hover:bg-[#f8f9fa] hover:border-[#c4c7c5]"
          >
            {showAddForm ? '취소' : '내역 추가'}
          </button>
        )}
      </div>

      {showAddForm && subscriptionId && (
        <form onSubmit={handleAddPayment} className="rounded-xl border border-[#dadce0] bg-white p-4 space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-[#5f6368] mb-1">결제일</label>
              <input
                type="date"
                required
                value={formData.payment_date}
                onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                className="w-full rounded-xl border border-[#dadce0] px-3 py-2 text-sm text-[#202124] focus:border-[#1a73e8] focus:outline-none focus:ring-2 focus:ring-[#1a73e8]/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#5f6368] mb-1">금액</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="flex-1 rounded-xl border border-[#dadce0] px-3 py-2 text-sm text-[#202124] focus:border-[#1a73e8] focus:outline-none focus:ring-2 focus:ring-[#1a73e8]/20"
                />
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="rounded-xl border border-[#dadce0] px-3 py-2 text-sm text-[#202124] focus:border-[#1a73e8] focus:outline-none focus:ring-2 focus:ring-[#1a73e8]/20"
                >
                  <option value="KRW">KRW</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#5f6368] mb-1">상태</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full rounded-xl border border-[#dadce0] px-3 py-2 text-sm text-[#202124] focus:border-[#1a73e8] focus:outline-none focus:ring-2 focus:ring-[#1a73e8]/20"
              >
                <option value="paid">결제 완료</option>
                <option value="failed">결제 실패</option>
                <option value="refunded">환불</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#5f6368] mb-1">메모</label>
              <input
                type="text"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full rounded-xl border border-[#dadce0] px-3 py-2 text-sm text-[#202124] focus:border-[#1a73e8] focus:outline-none focus:ring-2 focus:ring-[#1a73e8]/20"
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full rounded-full bg-[#1a73e8] px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-[#1557b0]"
          >
            추가하기
          </button>
        </form>
      )}

      {payments.length === 0 ? (
        <div className="py-8 text-center text-[#5f6368]">
          <Calendar className="mx-auto mb-3 h-12 w-12 text-[#dadce0]" />
          <p>결제 내역이 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {payments.map((payment) => (
            <div
              key={payment.id}
              className="flex items-center justify-between rounded-xl border border-[#dadce0] bg-white p-4"
            >
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-[#e8f0fe] p-2">
                  <DollarSign className="h-4 w-4 text-[#1a73e8]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#202124]">
                    {format(new Date(payment.payment_date), 'yyyy년 MM월 dd일', { locale: ko })}
                  </p>
                  <p className="text-xs text-[#5f6368]">
                    {payment.status === 'paid' && '✅ 결제 완료'}
                    {payment.status === 'failed' && '❌ 결제 실패'}
                    {payment.status === 'refunded' && '↩️ 환불'}
                    {payment.notes && ` • ${payment.notes}`}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-[#202124]">
                  {formatCurrencyWithKRW(payment.amount, payment.currency)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

