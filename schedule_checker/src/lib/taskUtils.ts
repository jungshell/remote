/**
 * 클라이언트/서버 모두에서 사용 가능한 Task 유틸리티 함수
 * firebase-admin을 사용하지 않는 순수 함수들만 포함
 */
import type { Task, TaskPriority } from '@/types/models';

/**
 * 스마트 우선순위 자동 분류
 * 마감일, 지연 여부, 담당자 등을 기반으로 우선순위 자동 계산
 */
export function calculatePriority(task: Task): TaskPriority {
  const now = new Date();
  const dueDate = task.dueAt ? new Date(task.dueAt) : null;
  
  // 마감일이 지났으면 긴급
  if (dueDate && dueDate < now) {
    return 'urgent';
  }
  
  // 마감일이 24시간 이내면 높음
  if (dueDate) {
    const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (hoursUntilDue <= 24) {
      return 'high';
    }
    if (hoursUntilDue <= 72) {
      return 'medium';
    }
  }
  
  // 기본값
  return task.priority || 'low';
}

/**
 * 리마인드 주기 자동 조정
 * 진행률과 중요도에 따라 알림 주기 조정
 */
export function calculateReminderInterval(task: Task): "6h" | "12h" | "24h" {
  const priority = calculatePriority(task);
  const now = new Date();
  const dueDate = task.dueAt ? new Date(task.dueAt) : null;
  
  if (priority === 'urgent' && dueDate) {
    const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (hoursUntilDue <= 12) {
      return '6h';
    }
    return '12h';
  }
  
  if (priority === 'high') {
    return '12h';
  }
  
  return '24h';
}
