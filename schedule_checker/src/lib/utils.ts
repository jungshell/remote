import { Timestamp } from 'firebase/firestore';

/**
 * Firestore Timestamp를 Date로 변환
 */
export function timestampToDate(timestamp: any): Date | null {
  if (!timestamp) return null;
  
  if (timestamp instanceof Date) {
    return timestamp;
  }
  
  if (timestamp?.toDate && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }
  
  if (timestamp?.seconds) {
    return new Date(timestamp.seconds * 1000);
  }
  
  return null;
}

/**
 * 날짜를 한국어 형식으로 포맷
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '마감일 없음';
  
  const dateObj = date instanceof Date ? date : new Date(date);
  if (isNaN(dateObj.getTime())) return '마감일 없음';
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDate = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
  
  const diffDays = Math.floor((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return `오늘 ${dateObj.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`;
  } else if (diffDays === 1) {
    return `내일 ${dateObj.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`;
  } else if (diffDays === -1) {
    return `어제 ${dateObj.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`;
  } else if (diffDays > 0 && diffDays <= 7) {
    return `${diffDays}일 후 ${dateObj.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`;
  } else {
    return dateObj.toLocaleDateString('ko-KR', {
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
