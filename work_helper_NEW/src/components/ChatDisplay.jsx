import React, { useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import './ChatDisplay.css';
import { updateMessageFeedback, submitWikiEdit, submitAnswerReport } from '../services/firebase';

// Export utility functions (inline to avoid Vite module issues)
const downloadAsFile = (text, filename = 'draft.txt') => {
    try {
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error("Failed to download file:", error);
    }
};

const suggestFilename = (text) => {
    const timestamp = new Date().toISOString().slice(0, 10);
    const summary = text.slice(0, 15).replace(/[^\w\s가-힣]/gi, '').trim();
    return `충콘지니_${summary || '문서초안'}_${timestamp}.txt`;
};

const formatMetadata = (metadata) => {
    if (!metadata) return null;
    const dataArray = Array.isArray(metadata) ? metadata : [metadata];
    const grouped = {};
    dataArray.forEach(item => {
        if (!grouped[item.source]) grouped[item.source] = new Set();
        grouped[item.source].add(item.page);
    });
    return Object.entries(grouped).map(([source, pages], index) => (
        <span key={index} className="citation-item">
            📄 {source} (p.{Array.from(pages).sort((a, b) => a - b).join(', ')})
            {index < Object.keys(grouped).length - 1 ? ', ' : ''}
        </span>
    ));
};

// 참고문서 클릭 시 해당 구역(원문 excerpt) 표시 + 원문 파일 열기
const CitationModal = ({ citation, onClose }) => {
    if (!citation) return null;
    const openOriginal = () => {
        if (!citation.fileUrl) return;
        const url = citation.page != null
            ? `${citation.fileUrl}#page=${citation.page}`
            : citation.fileUrl;
        window.open(url, '_blank', 'noopener,noreferrer');
    };
    return (
        <div className="citation-modal-overlay" onClick={onClose} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Escape' && onClose()}>
            <div className="citation-modal" onClick={(e) => e.stopPropagation()}>
                <div className="citation-modal-header">
                    <h4>📎 참고 원문 — {citation.source}{citation.page != null ? ` (p.${citation.page})` : ''}</h4>
                    <button type="button" className="citation-modal-close" onClick={onClose} aria-label="닫기">×</button>
                </div>
                <div className="citation-modal-body">
                    {citation.excerpt ? (
                        <pre className="citation-excerpt">{citation.excerpt}</pre>
                    ) : (
                        <p className="citation-no-excerpt">해당 구역 내용을 불러올 수 없습니다.</p>
                    )}
                    {citation.fileUrl && (
                        <div className="citation-modal-actions">
                            <button type="button" className="citation-open-original" onClick={openOriginal}>
                                📄 원문 보기{citation.page != null ? ` (p.${citation.page})` : ''}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const ChatDisplay = ({ messages, isLoading, sessionId, activeCategory = 'all' }) => {
    const [selectedCitation, setSelectedCitation] = React.useState(null);

    const handleReportWrong = async (msg, msgIndex) => {
        const question = messages[msgIndex - 1]?.text || '(질문 없음)';
        const comment = window.prompt('오답 신고 사유를 간단히 입력해 주세요 (선택):', '');
        if (comment === null) return; // cancelled
        await submitAnswerReport({
            sessionId,
            messageId: msg.id,
            question,
            answerSnippet: msg.text?.substring(0, 2000) || '',
            comment: comment?.trim() || ''
        });
        alert('오답 신고가 접수되었습니다. 검토 후 지식 보강에 반영하겠습니다.');
    };
    const bottomRef = useRef(null);

    // Auto-scroll to bottom
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    return (
        <div className="chat-display">
            {messages.map((msg, msgIndex) => (
                <div
                    key={msg.id}
                    className={`message-row ${msg.sender === 'user' ? 'user-row' : 'bot-row'} animate-in`}
                                    style={{ animationDelay: `${msgIndex * 0.1}s` }}
                >
                    <div className={`message-bubble ${msg.sender === 'user' ? 'user-bubble' : 'bot-bubble glass'}`}>
                        <div className="message-text">
                            <ReactMarkdown
                                components={{
                                    a: (props) => <a {...props} target="_blank" rel="noopener noreferrer" style={{ color: '#6c5ce7', textDecoration: 'underline' }} />
                                }}
                            >
                                {msg.text}
                            </ReactMarkdown>
                        </div>

                        {msg.metadata && (
                            <div className="message-metadata">
                                <span className="metadata-label">📍 참고 출처: </span>
                                <div className="citation-links">
                                    {(Array.isArray(msg.metadata) ? msg.metadata : [msg.metadata]).map((item, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            className="citation-link"
                                            onClick={() => setSelectedCitation({ source: item.source, page: item.page, excerpt: item.excerpt, fileUrl: item.fileUrl })}
                                            title="클릭하면 해당 구역 원문 보기"
                                        >
                                            📄 {item.source || '문서'}{item.page != null ? ` p.${item.page}` : ''}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="message-footer">
                            <div className="feedback-actions">
                                <button
                                    className={`feedback-btn ${msg.feedback === 'helpful' ? 'active' : ''}`}
                                    onClick={() => updateMessageFeedback(sessionId, msg.id, 'helpful')}
                                    title="도움됨"
                                >
                                    👍
                                </button>
                                <button
                                    className={`feedback-btn ${msg.feedback === 'unhelpful' ? 'active' : ''}`}
                                    onClick={() => updateMessageFeedback(sessionId, msg.id, 'unhelpful')}
                                    title="부족함"
                                >
                                    👎
                                </button>
                                {msg.sender === 'bot' && (
                                    <button
                                        className="feedback-btn report-btn"
                                        onClick={() => handleReportWrong(msg, msgIndex)}
                                        title="오답 신고"
                                    >
                                        🚩 오답 신고
                                    </button>
                                )}
                                {msg.sender === 'bot' && (
                                    <button
                                        className="export-btn"
                                        onClick={() => downloadAsFile(msg.text, suggestFilename(msg.text))}
                                        title="문서 초안 내보내기"
                                    >
                                        📄 내보내기
                                    </button>
                                )}
                                {msg.sender === 'bot' && (
                                    <button
                                        className="export-btn"
                                        onClick={async () => {
                                            const suggested = window.prompt('수정 제안 내용을 입력해주세요:', msg.text);
                                            if (!suggested || suggested.trim() === msg.text.trim()) return;
                                            await submitWikiEdit({
                                                sessionId,
                                                messageId: msg.id,
                                                originalText: msg.text,
                                                suggestedText: suggested.trim(),
                                                metadata: msg.metadata || null,
                                                category: activeCategory
                                            });
                                            alert('수정 제안이 등록되었습니다. 검토 후 반영됩니다.');
                                        }}
                                        title="지식 수정 제안"
                                    >
                                        ✏️ 수정 제안
                                    </button>
                                )}
                            </div>
                            <span className="message-time">
                                {msg.timestamp?.toDate
                                    ? msg.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                    : new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                }
                            </span>
                        </div>
                    </div>
                </div>
            ))}
            {selectedCitation && (
                <CitationModal citation={selectedCitation} onClose={() => setSelectedCitation(null)} />
            )}
            {isLoading && (
                <div className="message-row bot-row">
                    <div className="message-bubble bot-bubble loading-bubble">
                        <span className="dot">.</span><span className="dot">.</span><span className="dot">.</span>
                    </div>
                </div>
            )}
            <div ref={bottomRef} />
        </div>
    );
};

export default ChatDisplay;
