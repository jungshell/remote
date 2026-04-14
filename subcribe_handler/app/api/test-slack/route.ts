import { NextRequest, NextResponse } from 'next/server'
import { storage } from '@/lib/storage'
import { sendSlackNotification } from '@/lib/slack'

/**
 * Slack Webhook 직접 테스트용 API
 * GET /api/test-slack?userId=user_001
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId') || 'user_001'

    // 사용자 설정 조회
    const userSettings = await storage.userSettings.get(userId);

    if (!userSettings) {
      return NextResponse.json(
        {
          success: false,
          error: '사용자 설정을 찾을 수 없습니다.',
        },
        { status: 404 }
      )
    }

    if (!userSettings.slack_webhook_url) {
      return NextResponse.json(
        {
          success: false,
          error: 'Slack Webhook URL이 설정되지 않았습니다.',
        },
        { status: 400 }
      )
    }

    // 테스트 메시지 전송
    const testResult = await sendSlackNotification(
      userSettings.slack_webhook_url,
      '🧪 API 테스트 알림\n\n이것은 직접 API를 통한 테스트 메시지입니다!',
      {
        serviceName: 'API 테스트',
        amount: 10000,
        currency: 'KRW',
        nextBillingDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        daysUntilBilling: 3,
      }
    )

    if (!testResult) {
      return NextResponse.json(
        {
          success: false,
          error: 'Slack 알림 전송에 실패했습니다.',
          webhookUrl: userSettings.slack_webhook_url.substring(0, 50) + '...',
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '테스트 알림이 성공적으로 전송되었습니다!',
      webhookUrl: userSettings.slack_webhook_url.substring(0, 50) + '...',
      notificationEnabled: userSettings.notification_enabled,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류',
      },
      { status: 500 }
    )
  }
}

