import React from 'react';
import ModeSwitch from './ModeSwitch';
import NotificationCenter from './NotificationCenter';
import './Sidebar.css';

const Sidebar = ({ sessions, activeSessionId, onSessionSelect, onNewChat, mode, onModeToggle, activeCategory, onCategoryChange, activeAnswerTarget = 'general', onAnswerTargetChange, currentView, onViewChange, onLogout, isAdmin }) => {
    const categories = [
        { id: 'all', label: '전체', icon: '🌐' },
        { id: 'enaradoum', label: 'e나라도움', icon: '🏛️' },
        { id: '규정', label: '진흥원 규정', icon: '📜' }
    ];

    const answerTargets = [
        { id: 'general', label: '일반 사용자용', icon: '👤' },
        { id: 'officer', label: '담당자용', icon: '📋' }
    ];

    return (
        <aside className="sidebar glass">
            <div className="sidebar-header">
                <div className="branding-container">
                    <div className="title-text">
                        <h2 className="title-ko">충콘지니</h2>
                        <h3 className="title-en">CCON GENIE</h3>
                    </div>
                    <div className="header-actions">
                        <NotificationCenter />
                        <div className="genie-emoji">🧞</div>
                    </div>
                </div>

                <ModeSwitch mode={mode} onToggle={onModeToggle} />

                <div className="category-selector">
                    {categories.map((cat) => (
                        <button
                            key={cat.id}
                            className={`category-btn ${activeCategory === cat.id ? 'active' : ''}`}
                            onClick={() => onCategoryChange(cat.id)}
                            title={cat.label}
                        >
                            <span className="cat-icon">{cat.icon}</span>
                            <span className="cat-label">{cat.label}</span>
                        </button>
                    ))}
                </div>
                <p className="category-hint">
                    💡 제규정 질문은 <strong>진흥원 규정</strong>을 선택하세요.
                </p>

                <div className="answer-target-selector">
                    <span className="target-label">답변 대상</span>
                    <div className="target-buttons">
                        {answerTargets.map((t) => (
                            <button
                                key={t.id}
                                className={`category-btn small ${activeAnswerTarget === t.id ? 'active' : ''}`}
                                onClick={() => onAnswerTargetChange && onAnswerTargetChange(t.id)}
                                title={t.label}
                            >
                                <span className="cat-icon">{t.icon}</span>
                                <span className="cat-label">{t.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <button className="new-chat-btn" onClick={onNewChat}>
                    + 새 대화 시작
                </button>

                <div className="view-toggles">
                    <button
                        className={`view-btn ${currentView === 'smart-form' ? 'active' : ''}`}
                        onClick={() => onViewChange(currentView === 'smart-form' ? 'chat' : 'smart-form')}
                        title="스마트 서식 도우미"
                    >
                        📝 {currentView === 'smart-form' ? '채팅 복귀' : '서식 도우미'}
                    </button>

                    {isAdmin && (
                        <button
                            className={`view-btn ${currentView === 'admin' ? 'active' : ''}`}
                            onClick={() => onViewChange(currentView === 'admin' ? 'chat' : 'admin')}
                            title="관리자 대시보드"
                        >
                            ⚙️ {currentView === 'admin' ? '채팅 복귀' : '관리자 모드'}
                        </button>
                    )}

                    <button
                        className={`view-btn guide-btn ${currentView === 'user-guide' ? 'active' : ''}`}
                        onClick={() => onViewChange(currentView === 'user-guide' ? 'chat' : 'user-guide')}
                        title="앱 사용설명서"
                    >
                        📘 {currentView === 'user-guide' ? '설명서 닫기' : '사용 설명서'}
                    </button>
                </div>
            </div>

            <div className="conversation-list">
                <ul className="history-list">
                    {sessions.map((session) => (
                        <li
                            key={session.id}
                            className={`history-item ${activeSessionId === session.id ? 'active' : ''}`}
                            onClick={() => onSessionSelect(session.id)}
                        >
                            <div className="history-content">
                                <span className="history-title">{session.title || '새 대화'}</span>
                                <span className="history-preview">{session.lastMessage}</span>
                            </div>
                            <span className="history-date">
                                {session.lastUpdated?.toDate ?
                                    session.lastUpdated.toDate().toLocaleDateString([], { month: 'short', day: 'numeric' }) :
                                    ''}
                            </span>
                            <button
                                className="export-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    window.dispatchEvent(new CustomEvent('export-session', { detail: { session } }));
                                }}
                                title="문서 초안으로 내보내기"
                            >
                                📥
                            </button>
                        </li>
                    ))}
                </ul>
            </div>

            <div className="sidebar-footer">
                <button className="logout-btn" onClick={onLogout}>
                    🚪 로그아웃
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
