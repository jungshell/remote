'use server'

import { checkAndSendNotifications } from './notifications'
import { storage } from '@/lib/storage'
import { sendSlackNotification } from '@/lib/slack'

/**
 * 수동 테스트용 알림 전송 함수
 * 테스트 모드: 실제 구독과 관계없이 테스트 메시지를 Slack에 전송
 */
export async function testNotification(userId: string) {
  try {
    // 디버깅: 전체 구독 수 확인
    const allSubscriptions = await storage.subscriptions.findByUserId(userId);
    const activeSubscriptions = allSubscriptions.filter(s => s.status === 'active');

    // 사용자 설정 확인
    const userSettings = await storage.userSettings.get(userId);

    if (!userSettings) {
      return {
        success: false,
        message: '사용자 설정을 찾을 수 없습니다. 먼저 Webhook URL을 저장해주세요.',
        details: null,
      }
    }

    if (!userSettings.slack_webhook_url) {
      return {
        success: false,
        message: 'Slack Webhook URL이 설정되지 않았습니다. 먼저 URL을 저장해주세요.',
        details: null,
      }
    }

    // 테스트 메시지 전송 (실제 구독과 관계없이)
    let testResult = false
    let testError: string | null = null

    try {
      testResult = await sendSlackNotification(
        userSettings.slack_webhook_url,
        '🧪 정기구독 해지 방어기 테스트 알림\n\n이것은 테스트 메시지입니다. 알림 설정이 정상적으로 작동하고 있습니다!',
        {
          serviceName: '테스트 서비스',
          amount: 10000,
          currency: 'KRW',
          nextBillingDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          daysUntilBilling: 3,
        }
      )
    } catch (error) {
      testError = error instanceof Error ? error.message : String(error)
      console.error('테스트 알림 전송 오류:', error)
    }

    if (!testResult) {
      return {
        success: false,
        message: `Slack 알림 전송에 실패했습니다.${testError ? ` 오류: ${testError}` : ''} Webhook URL을 확인해주세요.`,
        details: {
          webhookUrl: userSettings.slack_webhook_url ? '설정됨' : '없음',
          error: testError,
        },
      }
    }

    // 실제 알림도 체크 (30일 이내)
    const realResult = await checkAndSendNotifications(userId, 30)

    // 결과 메시지 생성
    let message = '✅ 테스트 알림이 성공적으로 전송되었습니다!'

    const totalSubs = activeSubscriptions.length || 0
    if (totalSubs > 0) {
      message += `\n\n📊 구독 현황:`
      message += `\n- 전체 활성 구독: ${totalSubs}개`
      message += `\n- 실제 알림 전송: ${realResult.sent || 0}개`
      message += `\n- 건너뜀: ${realResult.skipped || 0}개`

      if (realResult.sent === 0 && realResult.skipped === 0) {
        const today = new Date().toISOString().split('T')[0]
        const futureDate = new Date()
        futureDate.setDate(futureDate.getDate() + 30)
        const futureDateStr = futureDate.toISOString().split('T')[0]

        message += `\n\n⚠️ 실제 알림:`
        message += `\n- 30일 이내 결제 예정인 구독이 없습니다.`
        if (activeSubscriptions.length > 0) {
          const nextDates = activeSubscriptions.map(s => s.next_billing_date).join(', ')
          message += `\n- 다음 결제일들: ${nextDates}`
          message += `\n- 체크 기간: ${today} ~ ${futureDateStr}`
        }
      }
    } else {
      message += `\n\n📝 현재 등록된 구독이 없습니다.`
    }

    return {
      success: true,
      message,
      details: {
        testNotificationSent: true,
        realNotifications: realResult,
        debug: {
          totalSubscriptions: totalSubs,
          userSettings: {
            notification_enabled: userSettings.notification_enabled,
            has_webhook: !!userSettings.slack_webhook_url,
            notification_days_before: userSettings.notification_days_before,
          },
        },
      },
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '테스트 중 오류 발생',
      details: null,
    }
  }
}


