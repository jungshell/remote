import React, { useState, useEffect } from 'react';
import InAppNotification from './InAppNotification';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: string;
}

interface InAppNotificationManagerProps {
  userId: number;
}

const InAppNotificationManager: React.FC<InAppNotificationManagerProps> = ({ userId }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    // localStorage에서 사용자별 알림 로드
    const loadUserNotifications = () => {
      try {
        const saved = localStorage.getItem(`userNotifications_${userId}`);
        if (saved) {
          const userNotifications = JSON.parse(saved);
          setNotifications(userNotifications.filter((n: Notification) => 
            new Date(n.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000) // 24시간 이내 알림만
          ));
        }
      } catch (error) {
        console.error('사용자 알림 로드 실패:', error);
      }
    };

    // 전역 알림 수신 함수 등록
    const handleGlobalNotification = (event: CustomEvent) => {
      const { notification } = event.detail;
      
      // 현재 사용자가 수신자인지 확인
      if (notification.recipients.includes(userId)) {
        const newNotification: Notification = {
          id: notification.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          timestamp: notification.sentAt
        };

        setNotifications(prev => {
          const updatedNotifications = [newNotification, ...prev];
          localStorage.setItem(`userNotifications_${userId}`, JSON.stringify(updatedNotifications));
          return updatedNotifications;
        });
      }
    };

    // 이벤트 리스너 등록
    window.addEventListener('notification-received', handleGlobalNotification as EventListener);
    
    // 초기 로드
    loadUserNotifications();

    return () => {
      window.removeEventListener('notification-received', handleGlobalNotification as EventListener);
    };
  }, [userId]);

  const handleCloseNotification = (id: string) => {
    setNotifications(prev => {
      const updatedNotifications = prev.filter(n => n.id !== id);
      localStorage.setItem(`userNotifications_${userId}`, JSON.stringify(updatedNotifications));
      return updatedNotifications;
    });
  };

  // 최대 3개까지만 표시
  const visibleNotifications = notifications.slice(0, 3);

  return (
    <>
      {visibleNotifications.map((notification) => (
        <InAppNotification
          key={notification.id}
          notification={notification}
          onClose={handleCloseNotification}
        />
      ))}
    </>
  );
};

export default InAppNotificationManager;
