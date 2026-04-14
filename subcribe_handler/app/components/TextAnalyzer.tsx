'use client'

import { useState } from 'react'
import { Sparkles, Loader2, CheckCircle, XCircle } from 'lucide-react'
import { parseSubscriptionText, saveSubscription, type ParsedSubscription } from '@/app/actions/subscription'
import { formatCurrencyWithKRW } from '@/lib/exchange-rate'

interface TextAnalyzerProps {
  userId: string
  onSuccess?: () => void
}

export default function TextAnalyzer({ userId, onSuccess }: TextAnalyzerProps) {
  const [text, setText] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [parsedData, setParsedData] = useState<ParsedSubscription | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleAnalyze = async () => {
    if (!text.trim()) {
      setError('텍스트를 입력해주세요.')
      return
    }

    setIsAnalyzing(true)
    setError(null)
    setParsedData(null)
    setSuccess(false)

    try {
      const result = await parseSubscriptionText(text)
      setParsedData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : '분석 중 오류가 발생했습니다.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleSave = async () => {
    if (!parsedData) return

    setIsSaving(true)
    setError(null)

    try {
      await saveSubscription(userId, parsedData)
      setSuccess(true)
      setText('')
      setParsedData(null)
      
      // 성공 후 2초 뒤에 상태 초기화
      setTimeout(() => {
        setSuccess(false)
        onSuccess?.()
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    setText('')
    setParsedData(null)
    setError(null)
    setSuccess(false)
  }

  return (
    <div className="w-full space-y-5">
      {/* 입력 영역 */}
      <div className="space-y-3">
        <label htmlFor="payment-text" className="block text-sm font-medium text-[#5f6368]">
          결제 알림 텍스트 붙여넣기
        </label>
        <textarea
          id="payment-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="예: 넷플릭스에서 9,500원이 결제되었습니다. 다음 결제일은 2024년 2월 15일입니다."
          className="w-full min-h-[140px] rounded-xl border border-[#dadce0] px-4 py-3 text-sm text-[#202124] placeholder:text-[#80868b] focus:border-[#1a73e8] focus:outline-none focus:ring-2 focus:ring-[#1a73e8]/20 transition-all duration-200 disabled:bg-[#f8f9fa] disabled:cursor-not-allowed"
          disabled={isAnalyzing || isSaving}
        />
        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing || isSaving || !text.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-[#1a73e8] px-6 py-3 text-sm font-medium text-white transition-all duration-200 hover:bg-[#1557b0] hover:shadow-md active:bg-[#174ea6] disabled:cursor-not-allowed disabled:bg-[#dadce0] disabled:text-[#80868b] disabled:hover:shadow-none"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              AI 분석 중...
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5" />
              AI로 분석하기
            </>
          )}
        </button>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl bg-[#fce8e6] border border-[#f28b82] px-4 py-3 text-sm text-[#c5221f]">
          <XCircle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 성공 메시지 */}
      {success && (
        <div className="flex items-center gap-3 rounded-xl bg-[#e6f4ea] border border-[#81c995] px-4 py-3 text-sm text-[#137333]">
          <CheckCircle className="h-5 w-5 flex-shrink-0" />
          <span>구독 정보가 성공적으로 저장되었습니다!</span>
        </div>
      )}

      {/* 분석 결과 미리보기 */}
      {parsedData && (
        <div className="rounded-xl border-2 border-[#1a73e8] bg-[#e8f0fe] p-6 space-y-4">
          <h4 className="text-base font-medium text-[#202124]">분석 결과 미리보기</h4>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center py-2 border-b border-[#1a73e8]/20">
              <span className="text-[#5f6368]">서비스명</span>
              <span className="font-medium text-[#202124]">{parsedData.service_name}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-[#1a73e8]/20">
              <span className="text-[#5f6368]">금액</span>
              <span className="font-medium text-[#202124]">
                {formatCurrencyWithKRW(parsedData.amount, parsedData.currency)}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-[#1a73e8]/20">
              <span className="text-[#5f6368]">결제 주기</span>
              <span className="font-medium text-[#202124]">
                {parsedData.cycle === 'monthly' ? '월간' :
                 parsedData.cycle === 'yearly' ? '연간' :
                 parsedData.cycle === 'weekly' ? '주간' : '분기'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-[#1a73e8]/20">
              <span className="text-[#5f6368]">다음 결제일</span>
              <span className="font-medium text-[#202124]">{parsedData.next_billing_date}</span>
            </div>
            {parsedData.billing_email && (
              <div className="flex justify-between items-center py-2">
                <span className="text-[#5f6368]">결제 이메일</span>
                <span className="font-medium text-[#202124]">{parsedData.billing_email}</span>
              </div>
            )}
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 rounded-full bg-[#34a853] px-4 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:bg-[#2d8e47] hover:shadow-md active:bg-[#268e3f] disabled:cursor-not-allowed disabled:bg-[#dadce0] disabled:text-[#80868b]"
            >
              {isSaving ? '저장 중...' : '저장하기'}
            </button>
            <button
              onClick={handleReset}
              disabled={isSaving}
              className="rounded-full border border-[#dadce0] px-4 py-2.5 text-sm font-medium text-[#5f6368] transition-all duration-200 hover:bg-[#f8f9fa] hover:border-[#c4c7c5] active:bg-[#f1f3f4] disabled:cursor-not-allowed"
            >
              다시 입력
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

