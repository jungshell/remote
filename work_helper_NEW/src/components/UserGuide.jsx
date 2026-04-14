import React from 'react';
import './UserGuide.css';

const UserGuide = () => {
    return (
        <div className="user-guide-container">
            <header className="guide-header">
                <h2>📘 충콘지니 사용 설명서</h2>
                <p>업무 효율을 200% 높여주는 AI 비서 활용법을 알아보세요!</p>
            </header>

            <div className="guide-content">
                <section className="guide-section">
                    <div className="section-icon">🤖</div>
                    <div className="section-text">
                        <h3>1. AI 챗봇 대화하기</h3>
                        <p>
                            <strong>직원 모드 / 캐릭터 모드</strong>를 전환하여 원하는 스타일로 대화할 수 있습니다.
                            궁금한 점을 자연스럽게 물어보세요.
                        </p>
                        <ul className="guide-list">
                            <li>💬 <strong>질문하기:</strong> "이번 달 출장 규정 알려줘"</li>
                            <li>📁 <strong>이미지 분석:</strong> 영수증이나 문서를 캡처해서 업로드하면 내용을 분석해줍니다.</li>
                        </ul>
                    </div>
                </section>

                <section className="guide-section">
                    <div className="section-icon">📝</div>
                    <div className="section-text">
                        <h3>2. 스마트 서식 도우미</h3>
                        <p>
                            복잡한 서식 작성과 규정 검토를 AI가 도와줍니다.
                            사이드바의 <strong>[서식 도우미]</strong> 버튼을 눌러보세요.
                        </p>
                        <ul className="guide-list">
                            <li>✍️ <strong>서식 작성:</strong> 상황을 입력하면 보고서 초안을 만들어줍니다.</li>
                            <li>⚖️ <strong>규정 검토:</strong> 작성된 파일을 올리면 규정 위반 여부를 체크해줍니다.</li>
                        </ul>
                    </div>
                </section>

                <section className="guide-section">
                    <div className="section-icon">🪄</div>
                    <div className="section-text">
                        <h3>3. 마법봉 (Magic) 기능</h3>
                        <p>
                            입력창 위의 <strong>마법봉 아이콘(🪄)</strong>을 클릭하면,
                            작성 중인 내용을 더 정중하게 바꾸거나 요약할 수 있습니다.
                        </p>
                    </div>
                </section>

                <section className="guide-section">
                    <div className="section-icon">⚙️</div>
                    <div className="section-text">
                        <h3>4. 관리자 대시보드</h3>
                        <p>
                            관리자 권한이 있다면 <strong>[관리자 모드]</strong>에서
                            통계 확인 및 지식 데이터베이스(KB) 관리를 할 수 있습니다.
                        </p>
                    </div>
                </section>

                <section className="guide-section">
                    <div className="section-icon">🔔</div>
                    <div className="section-text">
                        <h3>5. 알림 센터</h3>
                        <p>
                            중요한 공지사항이나 마감 알림을 놓치지 마세요.
                            상단의 <strong>종 아이콘(🔔)</strong>을 클릭하여 확인할 수 있습니다.
                        </p>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default UserGuide;
