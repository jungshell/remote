/**
 * Slack Webhook을 통한 알림 전송
 */

interface SlackMessage {
  text: string
  blocks?: Array<{
    type: string
    text?: {
      type: string
      text: string
    }
    fields?: Array<{
      type: string
      text: string
    }>
  }>
}

/**
 * Slack에 알림 메시지 전송
 */
export async function sendSlackNotification(
  webhookUrl: string,
  message: string,
  subscription?: {
    serviceName: string
    amount: number
    currency: string
    nextBillingDate: string
    daysUntilBilling: number
  }
): Promise<boolean> {
  try {
    let payload: SlackMessage

    if (subscription) {
      // 구독 알림 메시지 (Rich Format)
      const currencyText =
        subscription.currency === 'KRW'
          ? `${subscription.amount.toLocaleString('ko-KR')}원`
          : `${subscription.amount} ${subscription.currency}`

      payload = {
        text: `⚠️ 구독 해지 알림: ${subscription.serviceName}`,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: `⚠️ 구독 해지 알림: ${subscription.serviceName}`,
            },
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*서비스명:*\n${subscription.serviceName}`,
              },
              {
                type: 'mrkdwn',
                text: `*결제 금액:*\n${currencyText}`,
              },
              {
                type: 'mrkdwn',
                text: `*다음 결제일:*\n${subscription.nextBillingDate}`,
              },
              {
                type: 'mrkdwn',
                text: `*남은 일수:*\n${subscription.daysUntilBilling}일`,
              },
            ],
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `다음 결제일까지 *${subscription.daysUntilBilling}일* 남았습니다. 해지가 필요하시면 지금 처리하세요!`,
            },
          },
        ],
      }
    } else {
      // 일반 메시지
      payload = {
        text: message,
      }
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => '응답 읽기 실패')
      console.error('Slack 알림 전송 실패:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        webhookUrl: webhookUrl.substring(0, 50) + '...',
      })
      return false
    }

    const responseText = await response.text().catch(() => 'ok')
    console.log('Slack 알림 전송 성공:', responseText)
    return true
  } catch (error) {
    console.error('Slack 알림 전송 오류:', {
      error: error instanceof Error ? error.message : String(error),
      webhookUrl: webhookUrl.substring(0, 50) + '...',
    })
    return false
  }
}


