import { NextRequest, NextResponse } from 'next/server'
import { checkAndSendNotifications } from '@/app/actions/notifications'
import { storage } from '@/lib/storage'

/**
 * Cron Job용 API 엔드포인트
 * 외부 cron 서비스에서 호출하거나 Vercel Cron Jobs에서 사용
 * 
 * 보안: Authorization 헤더로 보호 (선택사항)
 */
export async function GET(request: NextRequest) {
  try {
    // Authorization 헤더 확인 (선택사항 - 보안 강화)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 모든 활성 사용자 조회 (Slack Webhook이 설정되고 알림이 활성화된 사용자)
    const allSettings = await storage.userSettings.getAll();
    const activeUsers = allSettings.filter(user =>
      user.notification_enabled === true &&
      user.slack_webhook_url &&
      user.slack_webhook_url.trim() !== ''
    );

    if (!activeUsers || activeUsers.length === 0) {
      return NextResponse.json({
        success: true,
        message: '알림 설정이 활성화된 사용자가 없습니다.',
        timestamp: new Date().toISOString(),
        users_checked: 0,
      })
    }

    // 모든 활성 사용자에 대해 알림 체크 (병렬 처리)
    // checkAndSendNotifications 함수가 이미 여러 알림 시점을 지원하므로 daysBefore는 undefined로 전달
    const results = await Promise.allSettled(
      activeUsers.map(async (user) => {
        return {
          userId: user.user_id,
          result: await checkAndSendNotifications(user.user_id), // 여러 시점 자동 지원
        }
      })
    )

    // 결과 집계
    const summary = {
      total_users: activeUsers.length,
      successful_users: 0,
      failed_users: 0,
      total_notifications_sent: 0,
      total_notifications_skipped: 0,
      errors: [] as string[],
    }

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const { userId, result: notificationResult } = result.value

        if (notificationResult.success) {
          summary.successful_users++
          summary.total_notifications_sent += notificationResult.sent || 0
          summary.total_notifications_skipped += notificationResult.skipped || 0

          if (notificationResult.errors && notificationResult.errors.length > 0) {
            summary.errors.push(
              ...notificationResult.errors.map((err) => `[${userId}] ${err}`)
            )
          }
        } else {
          summary.failed_users++
          summary.errors.push(
            `[${userId}] ${notificationResult.error || '알 수 없는 오류'}`
          )
        }
      } else {
        summary.failed_users++
        summary.errors.push(
          `[${activeUsers[index]?.user_id || 'unknown'}] ${result.reason}`
        )
      }
    })

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...summary,
    })
  } catch (error) {
    console.error('Cron job 오류:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류',
      },
      { status: 500 }
    )
  }
}

// POST도 지원 (일부 cron 서비스에서 POST 사용)
export async function POST(request: NextRequest) {
  return GET(request)
}

