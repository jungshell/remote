'use client'

import { useEffect, useState } from 'react'
import { CreditCard, TrendingUp, Settings, Download } from 'lucide-react'
import TextAnalyzer from './components/TextAnalyzer'
import SubscriptionCard from './components/SubscriptionCard'
import SlackSettings from './components/SlackSettings'
import EditSubscriptionModal from './components/EditSubscriptionModal'
import SearchAndFilter from './components/SearchAndFilter'
import { getSubscriptions, cancelSubscription, searchSubscriptions, exportSubscriptionsToCSV, exportSubscriptionsToJSON } from './actions/subscription'
import { convertToKRW } from '@/lib/exchange-rate'

// 임시 사용자 ID (추후 인증 시스템 연동 시 변경)
const TEMP_USER_ID = 'user_001'

interface Subscription {
  id: string
  service_name: string
  amount: number
  currency: string
  next_billing_date: string
  cycle: string
  status: string
  category?: string
  tags?: string[]
}

export default function Home() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [filteredSubscriptions, setFilteredSubscriptions] = useState<Subscription[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [editingSubscriptionId, setEditingSubscriptionId] = useState<string | null>(null)

  const loadSubscriptions = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await getSubscriptions(TEMP_USER_ID)
      setSubscriptions(data as Subscription[])
      setFilteredSubscriptions(data as Subscription[])
    } catch (err) {
      setError(err instanceof Error ? err.message : '구독 정보를 불러오는데 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadSubscriptions()
  }, [])

  const handleFilterChange = async (filters: any) => {
    try {
      const data = await searchSubscriptions(TEMP_USER_ID, filters)
      setFilteredSubscriptions(data as Subscription[])
    } catch (err) {
      console.error('필터링 오류:', err)
    }
  }

  const handleEdit = (id: string) => {
    setEditingSubscriptionId(id)
  }

  const handleExportCSV = async () => {
    try {
      const csv = await exportSubscriptionsToCSV(TEMP_USER_ID)
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `구독목록_${new Date().toISOString().split('T')[0]}.csv`
      link.click()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'CSV 내보내기에 실패했습니다.')
    }
  }

  const handleExportJSON = async () => {
    try {
      const json = await exportSubscriptionsToJSON(TEMP_USER_ID)
      const blob = new Blob([json], { type: 'application/json' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `구독목록_${new Date().toISOString().split('T')[0]}.json`
      link.click()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'JSON 내보내기에 실패했습니다.')
    }
  }

  const handleCancel = async (id: string) => {
    if (!confirm('정말 이 구독을 해지 처리하시겠습니까?')) {
      return
    }

    try {
      await cancelSubscription(id)
      await loadSubscriptions()
    } catch (err) {
      alert(err instanceof Error ? err.message : '해지 처리에 실패했습니다.')
    }
  }

  // 월간 총 결제액 계산 (환율 적용)
  const calculateMonthlyTotal = () => {
    return filteredSubscriptions.reduce((total, sub) => {
      // 먼저 원화로 변환
      const krwAmount = convertToKRW(Number(sub.amount), sub.currency)
      
      // 주기에 따라 월간 금액 계산
      let monthlyAmount = 0
      if (sub.cycle === 'monthly') {
        monthlyAmount = krwAmount
      } else if (sub.cycle === 'yearly') {
        monthlyAmount = krwAmount / 12
      } else if (sub.cycle === 'quarterly') {
        monthlyAmount = krwAmount / 3
      } else if (sub.cycle === 'weekly') {
        monthlyAmount = krwAmount * 4.33
      }
      
      return total + monthlyAmount
    }, 0)
  }

  const monthlyTotal = calculateMonthlyTotal()

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <div className="container mx-auto px-4 py-12 max-w-7xl">
        {/* 헤더 */}
        <header className="mb-12 text-center">
          <h1 className="mb-3 text-5xl font-normal tracking-tight text-[#202124]">
            정기구독 해지 방어기
          </h1>
          <p className="text-lg text-[#5f6368] font-normal">
            AI로 자동 분석하는 스마트 구독 관리 서비스
          </p>
        </header>

        {/* 통계 카드 */}
        <div className="mb-10 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl bg-white p-8 shadow-[0_1px_2px_0_rgba(60,64,67,0.3),0_2px_6px_2px_rgba(60,64,67,0.15)] transition-all duration-200 hover:shadow-[0_2px_4px_0_rgba(60,64,67,0.3),0_4px_8px_4px_rgba(60,64,67,0.15)]">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-[#e8f0fe] p-4">
                <CreditCard className="h-7 w-7 text-[#1a73e8]" />
              </div>
              <div>
                <p className="text-sm text-[#5f6368] mb-1">구독 중인 서비스</p>
                <p className="text-3xl font-normal text-[#202124]">
                  {subscriptions.length}개
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-white p-8 shadow-[0_1px_2px_0_rgba(60,64,67,0.3),0_2px_6px_2px_rgba(60,64,67,0.15)] transition-all duration-200 hover:shadow-[0_2px_4px_0_rgba(60,64,67,0.3),0_4px_8px_4px_rgba(60,64,67,0.15)]">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-[#e6f4ea] p-4">
                <TrendingUp className="h-7 w-7 text-[#34a853]" />
              </div>
              <div>
                <p className="text-sm text-[#5f6368] mb-1">월간 예상 결제액</p>
                <p className="text-3xl font-normal text-[#202124]">
                  {monthlyTotal.toLocaleString('ko-KR')}원
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 설정 버튼 */}
        <div className="mb-6 flex justify-end">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2 rounded-full border border-[#dadce0] px-4 py-2 text-sm font-medium text-[#5f6368] transition-all duration-200 hover:bg-[#f8f9fa] hover:border-[#c4c7c5]"
          >
            <Settings className="h-4 w-4" />
            {showSettings ? '설정 닫기' : 'Slack 알림 설정'}
          </button>
        </div>

        {/* Slack 설정 패널 */}
        {showSettings && (
          <div className="mb-10 rounded-2xl bg-white p-8 shadow-[0_1px_2px_0_rgba(60,64,67,0.3),0_2px_6px_2px_rgba(60,64,67,0.15)]">
            <SlackSettings userId={TEMP_USER_ID} />
          </div>
        )}

        {/* 텍스트 분석기 */}
        <div className="mb-10 rounded-2xl bg-white p-8 shadow-[0_1px_2px_0_rgba(60,64,67,0.3),0_2px_6px_2px_rgba(60,64,67,0.15)]">
          <h2 className="mb-6 text-2xl font-normal text-[#202124]">
            결제 알림 분석하기
          </h2>
          <TextAnalyzer userId={TEMP_USER_ID} onSuccess={loadSubscriptions} />
        </div>

        {/* 구독 리스트 */}
        <div className="rounded-2xl bg-white p-8 shadow-[0_1px_2px_0_rgba(60,64,67,0.3),0_2px_6px_2px_rgba(60,64,67,0.15)]">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-normal text-[#202124]">
              구독 중인 서비스
            </h2>
            <div className="flex gap-2">
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-2 rounded-full border border-[#dadce0] px-4 py-2 text-sm font-medium text-[#5f6368] transition-all duration-200 hover:bg-[#f8f9fa] hover:border-[#c4c7c5]"
              >
                <Download className="h-4 w-4" />
                CSV
              </button>
              <button
                onClick={handleExportJSON}
                className="flex items-center gap-2 rounded-full border border-[#dadce0] px-4 py-2 text-sm font-medium text-[#5f6368] transition-all duration-200 hover:bg-[#f8f9fa] hover:border-[#c4c7c5]"
              >
                <Download className="h-4 w-4" />
                JSON
              </button>
            </div>
          </div>

          {/* 검색 및 필터 */}
          {subscriptions.length > 0 && (
            <div className="mb-6">
              <SearchAndFilter onFilterChange={handleFilterChange} />
            </div>
          )}

          {isLoading ? (
            <div className="py-16 text-center">
              <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-[#1a73e8] border-t-transparent"></div>
              <p className="mt-4 text-[#5f6368]">로딩 중...</p>
            </div>
          ) : error ? (
            <div className="py-16 text-center text-[#ea4335]">{error}</div>
          ) : subscriptions.length === 0 ? (
            <div className="py-16 text-center">
              <CreditCard className="mx-auto mb-6 h-16 w-16 text-[#dadce0]" />
              <p className="text-[#5f6368] text-lg mb-2">아직 등록된 구독 서비스가 없습니다.</p>
              <p className="text-[#80868b] text-sm">
                위의 텍스트 분석기를 사용하여 구독 정보를 추가해보세요!
              </p>
            </div>
          ) : filteredSubscriptions.length === 0 ? (
            <div className="py-16 text-center">
              <CreditCard className="mx-auto mb-6 h-16 w-16 text-[#dadce0]" />
              <p className="text-[#5f6368] text-lg mb-2">검색 결과가 없습니다.</p>
              <p className="text-[#80868b] text-sm">
                필터 조건을 변경해보세요.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredSubscriptions.map((subscription) => (
                <SubscriptionCard
                  key={subscription.id}
                  id={subscription.id}
                  serviceName={subscription.service_name}
                  amount={subscription.amount}
                  currency={subscription.currency}
                  nextBillingDate={subscription.next_billing_date}
                  cycle={subscription.cycle}
                  category={subscription.category}
                  tags={subscription.tags}
                  onCancel={handleCancel}
                  onEdit={handleEdit}
                />
              ))}
            </div>
          )}
        </div>

        {/* 수정 모달 */}
        {editingSubscriptionId && (
          <EditSubscriptionModal
            subscriptionId={editingSubscriptionId}
            isOpen={!!editingSubscriptionId}
            onClose={() => setEditingSubscriptionId(null)}
            onSuccess={() => {
              loadSubscriptions()
              setEditingSubscriptionId(null)
            }}
          />
        )}
      </div>
    </div>
  )
}
