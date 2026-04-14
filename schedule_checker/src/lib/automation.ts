/**
 * 서버 전용: Firebase Admin SDK를 사용하는 자동화 함수들
 * 클라이언트 컴포넌트에서 import하지 마세요!
 */
import { getTasks, createAlert } from './firestoreAdmin';
import type { Task } from '@/types/models';

/**
 * 지연 감지 및 알림 생성. 생성된 지연 알림 개수를 반환합니다.
 */
export async function detectDelays(): Promise<{ delayedCount: number }> {
  const tasks = await getTasks();
  const now = new Date();
  let delayedCount = 0;

  for (const task of tasks) {
    if (task.status === 'done') continue;

    const dueDate = task.dueAt ? new Date(task.dueAt) : null;
    if (dueDate && dueDate < now) {
      const daysDelayed = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      await createAlert({
        type: 'delay',
        message: `지연 감지: '${task.title}'가 ${daysDelayed}일 지연되었습니다.`,
        taskId: task.id,
        ownerId: task.ownerId,
      });
      delayedCount++;
    }
  }
  return { delayedCount };
}


/**
 * 다음 액션 자동 제안
 */
export async function suggestNextActions(): Promise<string[]> {
  const tasks = await getTasks();
  const now = new Date();
  
  // 미완료 업무 중 지연 위험 높은 것들
  const delayedTasks = tasks
    .filter(task => task.status !== 'done')
    .filter(task => {
      const dueDate = task.dueAt ? new Date(task.dueAt) : null;
      if (!dueDate) return false;
      const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
      return hoursUntilDue <= 48 && hoursUntilDue > 0;
    })
    .sort((a, b) => {
      const aDue = a.dueAt ? new Date(a.dueAt).getTime() : Infinity;
      const bDue = b.dueAt ? new Date(b.dueAt).getTime() : Infinity;
      return aDue - bDue;
    })
    .slice(0, 3);
  
  return delayedTasks.map(task => 
    `미완료 업무 중 가장 지연 위험 높은 ${delayedTasks.length}건 확인`
  );
}

/**
 * 데일리 요약 생성 (상세 버전)
 */
export interface DailySummaryData {
  summary: string;
  todayTasks: Task[];
  threeDayTasks: Task[];
  urgentTasks: Task[];
  delayedTasks: Task[];
  stats: {
    total: number;
    completed: number;
    completionRate: number;
    delayedCount: number;
    todayCount: number;
    threeDayCount: number;
    urgentCount: number;
  };
}

export async function generateDailySummaryData(ownerId?: string | null): Promise<DailySummaryData> {
  const tasks = await getTasks(ownerId);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(today);
  endOfToday.setHours(23, 59, 59, 999);
  const threeDaysLater = new Date(today);
  threeDaysLater.setDate(threeDaysLater.getDate() + 3);
  threeDaysLater.setHours(23, 59, 59, 999);

  // 완료된 업무
  const completedTasks = tasks.filter(task => task.status === 'done');
  const completedCount = completedTasks.length;
  const totalTasks = tasks.length;
  const completionRate = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  // 오늘 해야 할 일
  const todayTasks = tasks
    .filter(task => task.status !== 'done')
    .filter(task => {
      if (!task.dueAt) return false;
      const dueDate = new Date(task.dueAt);
      return dueDate >= today && dueDate <= endOfToday;
    })
    .sort((a, b) => {
      const aDue = a.dueAt ? new Date(a.dueAt).getTime() : Infinity;
      const bDue = b.dueAt ? new Date(b.dueAt).getTime() : Infinity;
      return aDue - bDue;
    });

  // 3일 내 끝내야 할 일
  const threeDayTasks = tasks
    .filter(task => task.status !== 'done')
    .filter(task => {
      if (!task.dueAt) return false;
      const dueDate = new Date(task.dueAt);
      return dueDate > endOfToday && dueDate <= threeDaysLater;
    })
    .sort((a, b) => {
      const aDue = a.dueAt ? new Date(a.dueAt).getTime() : Infinity;
      const bDue = b.dueAt ? new Date(b.dueAt).getTime() : Infinity;
      return aDue - bDue;
    });

  // 긴급한 일 (지연됨 또는 urgent 우선순위)
  const nowTime = now.getTime();
  const urgentTasks = tasks
    .filter(task => task.status !== 'done')
    .filter(task => {
      const dueDate = task.dueAt ? new Date(task.dueAt) : null;
      // 지연된 업무
      if (dueDate && dueDate.getTime() < nowTime) return true;
      // urgent 우선순위
      if (task.priority === 'urgent') return true;
      // 24시간 이내 마감
      if (dueDate) {
        const hoursUntilDue = (dueDate.getTime() - nowTime) / (1000 * 60 * 60);
        if (hoursUntilDue <= 24 && hoursUntilDue > 0) return true;
      }
      return false;
    })
    .sort((a, b) => {
      const aDue = a.dueAt ? new Date(a.dueAt).getTime() : -Infinity;
      const bDue = b.dueAt ? new Date(b.dueAt).getTime() : -Infinity;
      // 지연된 것 먼저
      if (aDue < nowTime && bDue >= nowTime) return -1;
      if (aDue >= nowTime && bDue < nowTime) return 1;
      return aDue - bDue;
    });

  // 지연된 업무
  const delayedTasks = tasks.filter(task => {
    if (task.status === 'done') return false;
    const dueDate = task.dueAt ? new Date(task.dueAt) : null;
    return dueDate && dueDate < now;
  });

  return {
    summary: `오늘 완료율: ${completionRate}% | 지연 위험: ${delayedTasks.length}건 | 총 업무: ${totalTasks}건`,
    todayTasks,
    threeDayTasks,
    urgentTasks,
    delayedTasks,
    stats: {
      total: totalTasks,
      completed: completedCount,
      completionRate,
      delayedCount: delayedTasks.length,
      todayCount: todayTasks.length,
      threeDayCount: threeDayTasks.length,
      urgentCount: urgentTasks.length,
    },
  };
}

/**
 * 데일리 요약 생성 (간단 버전 - 기존 호환성)
 */
export async function generateDailySummary(): Promise<string> {
  const data = await generateDailySummaryData();
  return data.summary;
}
