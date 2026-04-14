/**
 * Slack Incoming Webhook으로 메시지 전송.
 * 환경 변수 SLACK_WEBHOOK_URL 이 있을 때만 전송합니다.
 */
export async function sendSlackMessage(text: string): Promise<boolean> {
  const url = process.env.SLACK_WEBHOOK_URL?.trim();
  if (!url) return false;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * 구조화된 Slack 메시지 포맷팅
 */
export function formatSlackMessage(data: {
  todayTasks: Array<{ title: string; dueAt?: string; priority?: string }>;
  threeDayTasks: Array<{ title: string; dueAt?: string; priority?: string }>;
  urgentTasks: Array<{ title: string; dueAt?: string; priority?: string }>;
  delayedTasks: Array<{ title: string; dueAt?: string; priority?: string }>;
  stats: {
    total: number;
    completed: number;
    completionRate: number;
    delayedCount: number;
    todayCount: number;
    threeDayCount: number;
    urgentCount: number;
  };
}): string {
  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours();
    const minutes = date.getMinutes();
    return `${month}/${day} ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const formatPriority = (priority?: string): string => {
    const emoji: Record<string, string> = {
      urgent: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '🟢',
    };
    return emoji[priority || 'low'] || '⚪';
  };

  let message = '📋 *AutoFlow 데일리 요약*\n\n';
  
  // 통계
  message += `📊 *통계*\n`;
  message += `• 총 업무: ${data.stats.total}건\n`;
  message += `• 완료율: ${data.stats.completionRate}%\n`;
  message += `• 지연: ${data.stats.delayedCount}건\n\n`;

  // 긴급한 일
  if (data.urgentTasks.length > 0) {
    message += `🚨 *긴급한 일 (${data.urgentTasks.length}건)*\n`;
    data.urgentTasks.slice(0, 5).forEach((task, idx) => {
      const dueStr = task.dueAt ? ` (${formatDate(task.dueAt)})` : '';
      message += `${idx + 1}. ${formatPriority(task.priority)} ${task.title}${dueStr}\n`;
    });
    if (data.urgentTasks.length > 5) {
      message += `   ... 외 ${data.urgentTasks.length - 5}건\n`;
    }
    message += '\n';
  }

  // 오늘 해야 할 일
  if (data.todayTasks.length > 0) {
    message += `📅 *오늘 해야 할 일 (${data.todayTasks.length}건)*\n`;
    data.todayTasks.slice(0, 5).forEach((task, idx) => {
      const dueStr = task.dueAt ? ` (${formatDate(task.dueAt)})` : '';
      message += `${idx + 1}. ${formatPriority(task.priority)} ${task.title}${dueStr}\n`;
    });
    if (data.todayTasks.length > 5) {
      message += `   ... 외 ${data.todayTasks.length - 5}건\n`;
    }
    message += '\n';
  }

  // 3일 내 끝내야 할 일
  if (data.threeDayTasks.length > 0) {
    message += `⏰ *3일 내 끝내야 할 일 (${data.threeDayTasks.length}건)*\n`;
    data.threeDayTasks.slice(0, 5).forEach((task, idx) => {
      const dueStr = task.dueAt ? ` (${formatDate(task.dueAt)})` : '';
      message += `${idx + 1}. ${formatPriority(task.priority)} ${task.title}${dueStr}\n`;
    });
    if (data.threeDayTasks.length > 5) {
      message += `   ... 외 ${data.threeDayTasks.length - 5}건\n`;
    }
    message += '\n';
  }

  // 지연된 업무 (긴급과 중복 제외)
  const delayedOnly = data.delayedTasks.filter(
    task => !data.urgentTasks.some(ut => ut.title === task.title)
  );
  if (delayedOnly.length > 0) {
    message += `⚠️ *지연된 업무 (${delayedOnly.length}건)*\n`;
    delayedOnly.slice(0, 3).forEach((task, idx) => {
      const dueStr = task.dueAt ? ` (${formatDate(task.dueAt)})` : '';
      message += `${idx + 1}. ${task.title}${dueStr}\n`;
    });
    if (delayedOnly.length > 3) {
      message += `   ... 외 ${delayedOnly.length - 3}건\n`;
    }
    message += '\n';
  }

  // 모든 항목이 없을 때
  if (data.urgentTasks.length === 0 && data.todayTasks.length === 0 && data.threeDayTasks.length === 0) {
    message += '✅ 오늘 해야 할 긴급한 일이 없습니다!\n';
  }

  return message;
}
