'use client'

import { useState, useEffect } from 'react'
import { Bell, CheckCircle, XCircle, Loader2, Plus, X } from 'lucide-react'
import { updateNotificationSettings, getNotificationSettings } from '@/app/actions/notifications'

interface NotificationSettingsProps {
  userId: string
}

export default function NotificationSettings({ userId }: NotificationSettingsProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [notificationEnabled, setNotificationEnabled] = useState(true)
  const [notificationDays, setNotificationDays] = useState<number[]>([3])
  const [newDayInput, setNewDayInput] = useState('')

  useEffect(() => {
    loadSettings()
  }, [userId])

  const loadSettings = async () => {
    setIsLoading(true)
    try {
      const settings = await getNotificationSettings(userId)
      setNotificationEnabled(settings.notification_enabled)
      setNotificationDays(settings.notification_days_before_array || [settings.notification_days_before || 3])
    } catch (error) {
      console.error('설정 로드 오류:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    setMessage(null)

    try {
      const result = await updateNotificationSettings(userId, {
        notification_enabled: notificationEnabled,
        notification_days_before_array: notificationDays.length > 0 ? notificationDays : [3],
      })

      if (result.success) {
        setMessage({ type: 'success', text: '알림 설정이 저장되었습니다!' })
        setTimeout(() => setMessage(null), 3000)
      } else {
        setMessage({ type: 'error', text: result.error || '저장에 실패했습니다.' })
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : '저장 중 오류가 발생했습니다.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const addNotificationDay = () => {
    const day = parseInt(newDayInput)
    if (day >= 0 && day <= 30 && !notificationDays.includes(day)) {
      setNotificationDays([...notificationDays, day].sort((a, b) => a - b))
      setNewDayInput('')
    }
  }

  const removeNotificationDay = (day: number) => {
    setNotificationDays(notificationDays.filter((d) => d !== day))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-[#1a73e8]" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="rounded-full bg-[#1a73e8] p-2">
          <Bell className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-medium text-[#202124]">알림 시점 설정</h3>
          <p className="text-sm text-[#5f6368]">
            결제일 며칠 전에 알림을 받을지 설정하세요
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="notification-enabled"
            checked={notificationEnabled}
            onChange={(e) => setNotificationEnabled(e.target.checked)}
            className="h-4 w-4 rounded border-[#dadce0] text-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/20"
          />
          <label htmlFor="notification-enabled" className="text-sm font-medium text-[#202124]">
            알림 활성화
          </label>
        </div>

        {notificationEnabled && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-[#5f6368] mb-2">
                알림 시점 (결제일 기준 며칠 전)
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {notificationDays.map((day) => (
                  <span
                    key={day}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#e8f0fe] px-3 py-1.5 text-sm font-medium text-[#1a73e8]"
                  >
                    {day}일 전
                    <button
                      onClick={() => removeNotificationDay(day)}
                      className="rounded-full p-0.5 hover:bg-[#1a73e8]/20"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={newDayInput}
                  onChange={(e) => setNewDayInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addNotificationDay()}
                  placeholder="0-30일"
                  className="flex-1 rounded-xl border border-[#dadce0] px-4 py-2 text-sm text-[#202124] focus:border-[#1a73e8] focus:outline-none focus:ring-2 focus:ring-[#1a73e8]/20"
                />
                <button
                  onClick={addNotificationDay}
                  className="flex items-center gap-2 rounded-xl border border-[#dadce0] px-4 py-2 text-sm font-medium text-[#5f6368] transition-all duration-200 hover:bg-[#f8f9fa] hover:border-[#c4c7c5]"
                >
                  <Plus className="h-4 w-4" />
                  추가
                </button>
              </div>
              <p className="mt-2 text-xs text-[#80868b]">
                여러 시점을 설정하면 각 시점마다 알림을 받습니다. 예: 7일 전, 3일 전, 1일 전
              </p>
            </div>
          </div>
        )}

        {message && (
          <div
            className={`flex items-start gap-2 rounded-xl px-4 py-3 text-sm whitespace-pre-line ${
              message.type === 'success'
                ? 'bg-[#e6f4ea] border border-[#81c995] text-[#137333]'
                : 'bg-[#fce8e6] border border-[#f28b82] text-[#c5221f]'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            ) : (
              <XCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            )}
            <span className="flex-1">{message.text}</span>
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full rounded-full bg-[#1a73e8] px-6 py-3 text-sm font-medium text-white transition-all duration-200 hover:bg-[#1557b0] hover:shadow-md active:bg-[#174ea6] disabled:cursor-not-allowed disabled:bg-[#dadce0] disabled:text-[#80868b]"
        >
          {isSaving ? '저장 중...' : '설정 저장하기'}
        </button>
      </div>
    </div>
  )
}

