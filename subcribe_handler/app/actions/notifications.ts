'use server'

import { storage } from '@/lib/storage'
import { sendSlackNotification } from '@/lib/slack'
import { differenceInDays, format } from 'date-fns'

const MAX_RETRY_ATTEMPTS = 3
const RETRY_DELAY_MS = 1000

/**
 * 재시도 로직이 포함된 Slack 알림 전송
 */
async function sendSlackNotificationWithRetry(
  webhookUrl: string,
  subscription: {
    serviceName: string
    amount: number
    currency: string
    nextBillingDate: string
    daysUntilBilling: number
  },
  maxRetries: number = MAX_RETRY_ATTEMPTS
): Promise<{ success: boolean; error?: string }> {
  let lastError: string | undefined

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const success = await sendSlackNotification(webhookUrl, '', subscription)

      if (success) {
        return { success: true }
      }

      lastError = `알림 전송 실패 (시도 ${attempt}/${maxRetries})`
    } catch (error) {
      lastError =
        error instanceof Error
          ? error.message
          : `알 수 없는 오류 (시도 ${attempt}/${maxRetries})`
    }

    // 마지막 시도가 아니면 대기
    if (attempt < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * attempt))
    }
  }

  return { success: false, error: lastError }
}

/**
 * 알림 히스토리 저장
 */
async function saveNotificationHistory(
  userId: string,
  subscriptionId: string,
  daysBeforeBilling: number,
  status: 'sent' | 'failed' | 'retrying',
  webhookUrl: string | null,
  errorMessage: string | null = null,
  retryCount: number = 0
): Promise<void> {
  const today = format(new Date(), 'yyyy-MM-dd')

  try {
    // 중복 방지: 이미 있는지 확인
    const exists = await storage.notificationHistory.exists(subscriptionId, today, daysBeforeBilling, 'sent')
    if (exists) return;

    await storage.notificationHistory.add({
      user_id: userId,
      subscription_id: subscriptionId,
      notification_date: today,
      days_before_billing: daysBeforeBilling,
      status,
      slack_webhook_url: webhookUrl || undefined,
      error_message: errorMessage || undefined,
      retry_count: retryCount,
    })
  } catch (error) {
    console.error('알림 히스토리 저장 예외:', error)
  }
}

/**
 * 이미 알림을 보냈는지 확인 (중복 방지)
 */
async function hasNotificationBeenSent(
  subscriptionId: string,
  daysBeforeBilling: number
): Promise<boolean> {
  const today = format(new Date(), 'yyyy-MM-dd')
  try {
    return await storage.notificationHistory.exists(subscriptionId, today, daysBeforeBilling, 'sent');
  } catch (error) {
    console.error('알림 히스토리 조회 오류:', error)
    return false // 오류 시 알림을 보내도록 함
  }
}

/**
 * 다음 결제일이 지정된 일수 이내인 구독을 찾아 Slack 알림 전송
 * 여러 알림 시점 지원
 */
export async function checkAndSendNotifications(
  userId: string,
  daysBefore?: number
) {
  try {
    const today = new Date()
    const todayStr = format(today, 'yyyy-MM-dd');

    // 활성 구독 조회
    const allSubscriptions = await storage.subscriptions.getAll();
    const subscriptions = allSubscriptions.filter(sub =>
      sub.user_id === userId &&
      sub.status === 'active' &&
      sub.next_billing_date >= todayStr
    );

    if (!subscriptions || subscriptions.length === 0) {
      return { success: true, sent: 0, message: '알림이 필요한 구독이 없습니다.' }
    }

    // 사용자의 Slack Webhook URL 및 설정 조회
    const userSettings = await storage.userSettings.get(userId);

    if (!userSettings) {
      return {
        success: false,
        error: '사용자 설정을 찾을 수 없습니다.',
      }
    }

    if (!userSettings.notification_enabled) {
      return { success: true, sent: 0, message: '알림이 비활성화되어 있습니다.' }
    }

    if (!userSettings.slack_webhook_url) {
      return {
        success: false,
        error: 'Slack Webhook URL이 설정되지 않았습니다.',
      }
    }

    // 알림 시점 배열 사용 (여러 시점 지원)
    let notificationDaysArray: number[] = []
    if (userSettings.notification_days_before_array && Array.isArray(userSettings.notification_days_before_array) && userSettings.notification_days_before_array.length > 0) {
      notificationDaysArray = userSettings.notification_days_before_array
    } else if (userSettings.notification_days_before) {
      notificationDaysArray = [userSettings.notification_days_before]
    } else if (daysBefore !== undefined) {
      notificationDaysArray = [daysBefore]
    } else {
      notificationDaysArray = [3] // 기본값
    }

    // 각 구독에 대해 알림 전송
    let sentCount = 0
    let skippedCount = 0
    const errors: string[] = []

    for (const subscription of subscriptions) {
      const nextDate = new Date(subscription.next_billing_date)
      const daysUntilBilling = differenceInDays(nextDate, today)

      // 각 알림 시점에 대해 체크
      for (const notificationDays of notificationDaysArray) {
        if (daysUntilBilling === notificationDays) {
          // 중복 알림 방지 체크
          const alreadySent = await hasNotificationBeenSent(
            subscription.id,
            notificationDays
          )

          if (alreadySent) {
            skippedCount++
            continue
          }

          // 재시도 로직이 포함된 알림 전송
          const result = await sendSlackNotificationWithRetry(
            userSettings.slack_webhook_url,
            {
              serviceName: subscription.service_name,
              amount: subscription.amount,
              currency: subscription.currency,
              nextBillingDate: subscription.next_billing_date,
              daysUntilBilling,
            }
          )

          // 알림 히스토리 저장
          await saveNotificationHistory(
            userId,
            subscription.id,
            notificationDays,
            result.success ? 'sent' : 'failed',
            userSettings.slack_webhook_url,
            result.error || null,
            result.success ? 0 : MAX_RETRY_ATTEMPTS
          )

          if (result.success) {
            sentCount++
          } else {
            errors.push(`${subscription.service_name}: ${result.error}`)
          }
        }
      }
    }

    return {
      success: true,
      sent: sentCount,
      skipped: skippedCount,
      total: subscriptions.length,
      errors: errors.length > 0 ? errors : undefined,
    }
  } catch (error) {
    console.error('알림 체크 오류:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    }
  }
}

/**
 * 사용자의 Slack Webhook URL 저장
 */
export async function saveSlackWebhook(userId: string, webhookUrl: string) {
  try {
    await storage.userSettings.upsert(userId, {
      slack_webhook_url: webhookUrl,
      notification_enabled: true
    });
    return { success: true }
  } catch (error) {
    console.error('Webhook 저장 오류:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '저장 실패',
    }
  }
}

/**
 * 알림 설정 업데이트 (여러 시점 설정)
 */
export async function updateNotificationSettings(
  userId: string,
  settings: {
    notification_enabled?: boolean
    notification_days_before_array?: number[]
    notification_days_before?: number
    email_notifications?: boolean
    email_address?: string
  }
) {
  try {
    const updateData: any = { ...settings }

    // notification_days_before_array가 없으면 notification_days_before를 배열로 변환
    if (updateData.notification_days_before && !updateData.notification_days_before_array) {
      updateData.notification_days_before_array = [updateData.notification_days_before]
    }

    await storage.userSettings.upsert(userId, updateData);
    return { success: true }
  } catch (error) {
    console.error('알림 설정 업데이트 오류:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '설정 저장 실패',
    }
  }
}

/**
 * 알림 설정 조회
 */
export async function getNotificationSettings(userId: string) {
  try {
    const data = await storage.userSettings.get(userId);

    return {
      notification_enabled: data?.notification_enabled ?? true,
      notification_days_before: data?.notification_days_before ?? 3,
      notification_days_before_array: data?.notification_days_before_array ?? [3],
      email_notifications: data?.email_notifications ?? false,
      email_address: data?.email_address ?? null,
    }
  } catch (error) {
    console.error('알림 설정 조회 오류:', error)
    return {
      notification_enabled: true,
      notification_days_before: 3,
      notification_days_before_array: [3],
      email_notifications: false,
      email_address: null,
    }
  }
}

/**
 * 사용자의 Slack Webhook URL 조회
 */
export async function getSlackWebhook(userId: string) {
  try {
    const data = await storage.userSettings.get(userId);
    return { webhookUrl: data?.slack_webhook_url || null }
  } catch (error) {
    console.error('Webhook 조회 오류:', error)
    return { webhookUrl: null }
  }
}

