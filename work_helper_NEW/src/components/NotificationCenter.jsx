import React, { useState, useEffect } from 'react';
import './NotificationCenter.css';

const NotificationCenter = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        // Simulate checking for proactive notifications
        const checkNotifications = () => {
            const newNotifs = [];
            
            // Rule 1: Deadline Warning
            const today = new Date();
            if (today.getDate() > 20) {
                newNotifs.push({
                    id: 'deadline-1',
                    type: 'warning',
                    message: '월말 정산 마감이 얼마 남지 않았습니다! (25일 마감)',
                    time: '방금 전'
                });
            }

            // Rule 2: Regulation Change
            newNotifs.push({
                id: 'reg-1',
                type: 'info',
                message: '[공지] 2026년도 보조금 집행 규정이 일부 개정되었습니다.',
                time: '1시간 전'
            });

            // Rule 3: Smart Tip
            newNotifs.push({
                id: 'tip-1',
                type: 'tip',
                message: '팁: 영수증 스캔 기능이 추가되었습니다. 사용해보세요!',
                time: '2시간 전'
            });

            setNotifications(newNotifs);
            setUnreadCount(newNotifs.length);
        };

        checkNotifications();
    }, []);

    const toggleOpen = () => {
        setIsOpen(!isOpen);
        if (!isOpen) {
            setUnreadCount(0); // Mark as read when opened
        }
    };

    return (
        <div className="notification-center">
            <button className="bell-btn" onClick={toggleOpen}>
                🔔
                {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
            </button>

            {isOpen && (
                <div className="notification-dropdown animate-in">
                    <div className="notif-header">
                        <h3>알림 센터</h3>
                        <button className="close-btn" onClick={() => setIsOpen(false)}>✕</button>
                    </div>
                    <div className="notif-list">
                        {notifications.length === 0 ? (
                            <div className="empty-notif">새로운 알림이 없습니다.</div>
                        ) : (
                            notifications.map(notif => (
                                <div key={notif.id} className={`notif-item ${notif.type}`}>
                                    <div className="notif-icon">
                                        {notif.type === 'warning' ? '🚨' : notif.type === 'tip' ? '💡' : '📢'}
                                    </div>
                                    <div className="notif-content">
                                        <p className="notif-msg">{notif.message}</p>
                                        <span className="notif-time">{notif.time}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationCenter;
