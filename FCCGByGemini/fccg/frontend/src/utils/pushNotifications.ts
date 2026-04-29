/**
 * PWA 푸시 알림 시스템
 * 브라우저 푸시 알림 및 서비스 워커 관리
 */

export interface PushNotificationData {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

class PushNotificationManager {
  private registration: ServiceWorkerRegistration | null = null;
  private isSupported: boolean = false;

  constructor() {
    this.isSupported = 'Notification' in window && 'serviceWorker' in navigator;
  }

  /**
   * 푸시 알림 지원 여부 확인
   */
  isNotificationSupported(): boolean {
    return this.isSupported;
  }

  /**
   * 알림 권한 요청
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported) {
      throw new Error('푸시 알림을 지원하지 않는 브라우저입니다.');
    }

    const permission = await Notification.requestPermission();
    console.log('알림 권한:', permission);
    return permission;
  }

  /**
   * 서비스 워커 등록
   */
  async registerServiceWorker(): Promise<ServiceWorkerRegistration> {
    const enablePush = (import.meta as any)?.env?.VITE_ENABLE_PUSH === 'true';
    if (!this.isSupported || !enablePush) {
      throw new Error('서비스 워커를 지원하지 않는 브라우저입니다.');
    }

    try {
      this.registration = await navigator.serviceWorker.register('/sw.js');
      console.log('✅ 서비스 워커 등록 성공:', this.registration);
      return this.registration;
    } catch (error) {
      console.error('❌ 서비스 워커 등록 실패:', error);
      throw error;
    }
  }

  /**
   * 푸시 알림 표시
   */
  async showNotification(data: PushNotificationData): Promise<void> {
    if (!this.isSupported) {
      console.warn('푸시 알림을 지원하지 않는 브라우저입니다.');
      return;
    }

    if (Notification.permission !== 'granted') {
      console.warn('알림 권한이 허용되지 않았습니다.');
      return;
    }

    try {
      if (this.registration) {
        // 서비스 워커를 통한 알림 표시
        await this.registration.showNotification(data.title, {
          body: data.body,
          icon: data.icon || '/vite.svg',
          badge: data.badge || '/vite.svg',
          tag: data.tag,
          data: data.data,
          actions: data.actions,
          requireInteraction: true,
          silent: false
        });
      } else {
        // 기본 알림 표시
        new Notification(data.title, {
          body: data.body,
          icon: data.icon || '/vite.svg',
          tag: data.tag,
          data: data.data
        });
      }
      
      console.log('✅ 푸시 알림 표시 성공:', data.title);
    } catch (error) {
      console.error('❌ 푸시 알림 표시 실패:', error);
    }
  }

  /**
   * 경기 확정 알림
   */
  async showGameConfirmationNotification(gameData: {
    gameDate: string;
    gameTime: string;
    gameLocation: string;
    gameType: string;
  }): Promise<void> {
    await this.showNotification({
      title: '🏆 경기 일정 확정',
      body: `${gameData.gameDate} ${gameData.gameTime} - ${gameData.gameLocation}`,
      tag: 'game-confirmation',
      data: { type: 'game_confirmation', ...gameData },
      actions: [
        {
          action: 'view',
          title: '일정 보기',
          icon: '/vite.svg'
        },
        {
          action: 'dismiss',
          title: '닫기'
        }
      ]
    });
  }

  /**
   * 투표 알림
   */
  async showVoteReminderNotification(voteData: {
    votePeriod: string;
    voteDeadline: string;
  }): Promise<void> {
    await this.showNotification({
      title: '🗳️ 일정 투표',
      body: `${voteData.votePeriod} 투표가 시작되었습니다`,
      tag: 'vote-reminder',
      data: { type: 'vote_reminder', ...voteData },
      actions: [
        {
          action: 'vote',
          title: '투표하기',
          icon: '/vite.svg'
        },
        {
          action: 'dismiss',
          title: '닫기'
        }
      ]
    });
  }

  /**
   * 신규 회원 알림
   */
  async showNewMemberNotification(memberData: {
    memberName: string;
  }): Promise<void> {
    await this.showNotification({
      title: '👋 신규 회원 가입',
      body: `${memberData.memberName}님이 팀에 가입했습니다`,
      tag: 'new-member',
      data: { type: 'new_member', ...memberData },
      actions: [
        {
          action: 'view',
          title: '팀 보기',
          icon: '/vite.svg'
        },
        {
          action: 'dismiss',
          title: '닫기'
        }
      ]
    });
  }

  /**
   * 경기 리마인더 알림
   */
  async showGameReminderNotification(gameData: {
    gameDate: string;
    gameTime: string;
    gameLocation: string;
    hoursBefore: number;
  }): Promise<void> {
    await this.showNotification({
      title: `⚽ 경기 ${gameData.hoursBefore}시간 전`,
      body: `${gameData.gameDate} ${gameData.gameTime} - ${gameData.gameLocation}`,
      tag: 'game-reminder',
      data: { type: 'game_reminder', ...gameData },
      actions: [
        {
          action: 'view',
          title: '경기 정보',
          icon: '/vite.svg'
        },
        {
          action: 'dismiss',
          title: '닫기'
        }
      ]
    });
  }

  /**
   * 알림 클릭 이벤트 처리
   */
  setupNotificationClickHandler(): void {
    if (!this.registration) return;

    this.registration.addEventListener('notificationclick', (event) => {
      console.log('알림 클릭:', event);
      
      const notification = event.notification;
      const action = event.action;
      const data = notification.data;

      // 알림 닫기
      notification.close();

      // 액션별 처리
      if (action === 'dismiss') {
        return;
      }

      // 기본 동작: 해당 페이지로 이동
      if (data?.type) {
        this.handleNotificationAction(data.type, data, action);
      }
    });
  }

  /**
   * 알림 액션 처리
   */
  private handleNotificationAction(type: string, data: any, action?: string): void {
    const baseUrl = window.location.origin;
    
    switch (type) {
      case 'game_confirmation':
      case 'game_reminder':
        window.open(`${baseUrl}/schedule-v2`, '_blank');
        break;
      case 'vote_reminder':
        if (action === 'vote') {
          window.open(`${baseUrl}/schedule-v2`, '_blank');
        } else {
          window.open(`${baseUrl}/`, '_blank');
        }
        break;
      case 'new_member':
        window.open(`${baseUrl}/admin`, '_blank');
        break;
      default:
        window.open(`${baseUrl}/`, '_blank');
    }
  }

  /**
   * 알림 권한 상태 확인
   */
  getPermissionStatus(): NotificationPermission {
    return Notification.permission;
  }

  /**
   * 알림 설정 초기화
   */
  async initialize(): Promise<boolean> {
    try {
      if (!this.isSupported) {
        console.warn('푸시 알림을 지원하지 않는 브라우저입니다.');
        return false;
      }

      // 서비스 워커 등록
      await this.registerServiceWorker();

      // 알림 클릭 핸들러 설정
      this.setupNotificationClickHandler();

      console.log('✅ 푸시 알림 시스템 초기화 완료');
      return true;
    } catch (error) {
      console.error('❌ 푸시 알림 시스템 초기화 실패:', error);
      return false;
    }
  }
}

// 전역 인스턴스
export const pushNotificationManager = new PushNotificationManager();

// 편의 함수들
export const requestNotificationPermission = () => pushNotificationManager.requestPermission();
export const showGameConfirmationNotification = (data: any) => pushNotificationManager.showGameConfirmationNotification(data);
export const showVoteReminderNotification = (data: any) => pushNotificationManager.showVoteReminderNotification(data);
export const showNewMemberNotification = (data: any) => pushNotificationManager.showNewMemberNotification(data);
export const showGameReminderNotification = (data: any) => pushNotificationManager.showGameReminderNotification(data);
export const initializePushNotifications = () => pushNotificationManager.initialize();
export const isNotificationSupported = () => pushNotificationManager.isNotificationSupported();
export const getNotificationPermission = () => pushNotificationManager.getPermissionStatus();

