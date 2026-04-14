import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToPendingEdits, updateEditStatus, getQuestionLogs, addKnowledgeItems, subscribeToKnowledge, deleteKnowledgeItem, updateKnowledgeItem, subscribeToAnswerReports, updateAnswerReportStatus } from '../services/firebase';
import { uploadKnowledgeFile } from '../services/supabase';
import { migrateKnowledgeBase } from '../services/migration';
import { analyzeLogsAndSuggest } from '../services/autoKbService';
import { extractTextFromPdf, splitByArticle, hasArticleStructure } from '../utils/pdfParser';
import { extractTextFromHwp } from '../utils/hwpParser';
import { textToPdfBlob } from '../utils/textToPdf';
import { getEmbedding } from '../services/embeddingService';
import './AdminDashboard.css';

const AdminDashboard = () => {
    const { currentUser } = useAuth();
    const [activeTab, setActiveTab] = useState('edits'); // 'edits' | 'stats' | 'upload' | 'suggestions' | 'reports'
    const [edits, setEdits] = useState([]);
    const [answerReports, setAnswerReports] = useState([]);
    const [stats, setStats] = useState([]);
    const [suggestions, setSuggestions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [statsLoading, setStatsLoading] = useState(false);
    const [suggestionsLoading, setSuggestionsLoading] = useState(false);
    const [migrationStatus, setMigrationStatus] = useState(null);
    
    // Knowledge Base State
    const [knowledgeItems, setKnowledgeItems] = useState([]);
    const [newKnowledge, setNewKnowledge] = useState({ title: '', content: '', category: 'general' });
    const [isAddingKnowledge, setIsAddingKnowledge] = useState(false);
    const [editingId, setEditingId] = useState(null);

    // Upload state
    const [uploadFiles, setUploadFiles] = useState([]);
    const [uploadCategory, setUploadCategory] = useState('general');
    const [isProcessing, setIsProcessing] = useState(false);
    const [uploadStatus, setUploadStatus] = useState(null); // success, error

    useEffect(() => {
        const unsubscribe = subscribeToPendingEdits((data) => {
            setEdits(data);
            setIsLoading(false);
        }, (error) => {
            console.error("Failed to load edits:", error);
            setIsLoading(false);
            alert("데이터를 불러오는데 실패했습니다. (Firestore 권한 또는 인덱스 문제)");
        });
        return () => unsubscribe();
    }, []);

    // 오답 신고 건수 배지용 (탭 미방문 시에도 숫자 표시)
    useEffect(() => {
        const unsub = subscribeToAnswerReports((reports) => setAnswerReports(reports));
        return () => unsub();
    }, []);

    useEffect(() => {
        if (activeTab === 'stats') {
            const loadStats = async () => {
                setStatsLoading(true);
                try {
                    const data = await getQuestionLogs(50);
                    setStats(data);
                } catch (error) {
                    console.error("Failed to load stats:", error);
                } finally {
                    setStatsLoading(false);
                }
            };
            loadStats();
        } else if (activeTab === 'suggestions') {
            if (suggestions.length === 0) {
                handleAnalyzeSuggestions();
            }
        } else if (activeTab === 'knowledge') {
            const unsubscribe = subscribeToKnowledge((items) => {
                setKnowledgeItems(items);
            });
            return () => unsubscribe();
        }
    }, [activeTab]);

    if (currentUser?.email !== 'sti60val@gmail.com') {
        return (
            <div className="admin-access-denied">
                <h2>⛔ 접근 권한이 없습니다</h2>
                <p>관리자 계정(sti60val@gmail.com)으로 로그인해주세요.</p>
            </div>
        );
    }

    const handleAddKnowledge = async (e) => {
        e.preventDefault();
        if (!newKnowledge.content.trim()) return;

        setIsAddingKnowledge(true);
        try {
            // Generate embedding for better search
            let embedding = [];
            try {
                embedding = await getEmbedding(newKnowledge.content);
            } catch (err) {
                console.warn("Embedding generation failed for manual item:", err);
            }

            if (editingId) {
                // UPDATE existing item
                const result = await updateKnowledgeItem(editingId, {
                    content: newKnowledge.content,
                    category: newKnowledge.category,
                    title: newKnowledge.title,
                    embedding: embedding.length > 0 ? embedding : undefined
                });
                
                if (result.success) {
                    alert('지식이 수정되었습니다!');
                    setEditingId(null);
                    setNewKnowledge({ title: '', content: '', category: 'general' });
                } else {
                    alert('수정 실패: ' + result.error);
                }
            } else {
                // CREATE new item
                const item = {
                    content: newKnowledge.content,
                    category: newKnowledge.category,
                    source: 'admin_manual',
                    title: newKnowledge.title,
                    embedding: embedding
                };
                
                const result = await addKnowledgeItems([item]);
                if (result.success) {
                    alert('지식이 추가되었습니다!');
                    setNewKnowledge({ title: '', content: '', category: 'general' });
                } else {
                    alert('추가 실패: ' + result.error);
                }
            }
        } catch (error) {
            console.error("Error in manual add/update:", error);
            alert("처리 중 오류가 발생했습니다.");
        } finally {
            setIsAddingKnowledge(false);
        }
    };

    const handleEditClick = (item) => {
        setNewKnowledge({
            title: item.title || '',
            content: item.content || '',
            category: item.category || 'general'
        });
        setEditingId(item.id);
        // Scroll to top of knowledge section
        const formElement = document.querySelector('.manual-add-section');
        if (formElement) formElement.scrollIntoView({ behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setNewKnowledge({ title: '', content: '', category: 'general' });
    };

    const handleDeleteKnowledge = async (id) => {
        if (window.confirm('정말 삭제하시겠습니까?')) {
            await deleteKnowledgeItem(id);
        }
    };

    const handleAnalyzeSuggestions = async () => {
        setSuggestionsLoading(true);
        try {
            const result = await analyzeLogsAndSuggest();
            if (result.success) {
                setSuggestions(result.suggestions);
            } else {
                alert("제안 생성 실패: " + result.error);
            }
        } catch (error) {
            console.error("Suggestion error:", error);
        } finally {
            setSuggestionsLoading(false);
        }
    };

    const handleSuggestionAction = async (item, action) => {
        if (action === 'approve') {
            if (window.confirm('이 항목을 지식 베이스에 추가하시겠습니까?')) {
                const newItem = [{
                    content: `Q: ${item.question}\nA: ${item.answer}`,
                    category: item.category,
                    source: 'auto_suggestion',
                    page: 1
                }];
                const result = await addKnowledgeItems(newItem);
                if (result.success) {
                    alert('지식 베이스에 추가되었습니다!');
                    setSuggestions(prev => prev.filter(s => s.id !== item.id));
                } else {
                    alert('추가 실패: ' + result.error);
                }
            }
        } else {
            // Reject - just remove from list
            setSuggestions(prev => prev.filter(s => s.id !== item.id));
        }
    };

    const handleAction = async (id, status) => {
        if (window.confirm(status === 'approved' ? '승인하시겠습니까? 바로 지식베이스에 반영됩니다.' : '반려하시겠습니까?')) {
            const edit = edits.find(e => e.id === id);
            await updateEditStatus(id, status, edit);
        }
    };

    const handleFileUpload = (e) => {
        const files = e.target.files ? Array.from(e.target.files) : [];
        if (files.length === 0) return;

        const allowed = files.filter((file) => {
            const isHwp = file.name.toLowerCase().endsWith('.hwp');
            const isPdf = file.type === 'application/pdf';
            const isTxt = file.type === 'text/plain';
            return isPdf || isTxt || isHwp;
        });
        const rejected = files.length - allowed.length;
        if (rejected > 0) {
            alert(`PDF, 텍스트, HWP만 지원합니다. ${rejected}개 파일이 제외되었습니다.`);
        }
        if (allowed.length > 0) {
            setUploadFiles(allowed);
            setUploadStatus(null);
        }
        e.target.value = '';
    };

    const processUpload = async () => {
        if (!uploadFiles.length) return;

        setIsProcessing(true);
        try {
            let allItems = [];
            const fileErrors = [];

            for (const uploadFile of uploadFiles) {
                try {
                    let knowledgeItems = [];
                    let fileUrl = null;

                    if (uploadFile.type === 'application/pdf') {
                        const { fullText, pages } = await extractTextFromPdf(uploadFile);
                        if (hasArticleStructure(fullText)) {
                            const articleChunks = splitByArticle(fullText);
                            knowledgeItems = articleChunks.map((c, idx) => ({
                                content: c.content,
                                category: uploadCategory,
                                source: uploadFile.name,
                                page: c.articleLabel || idx + 1
                            }));
                        } else {
                            knowledgeItems = pages.map(p => ({
                                content: p.text,
                                category: uploadCategory,
                                source: uploadFile.name,
                                page: p.page
                            }));
                        }
                        const blob = new Blob([await uploadFile.arrayBuffer()], { type: 'application/pdf' });
                        fileUrl = await uploadKnowledgeFile(blob, uploadFile.name);
                    } else if (uploadFile.name.toLowerCase().endsWith('.hwp')) {
                        const { fullText } = await extractTextFromHwp(uploadFile);
                        const rawChunks = hasArticleStructure(fullText)
                            ? splitByArticle(fullText)
                            : fullText.split(/\n\s*\n/).filter(c => c.trim().length > 0).map(c => ({ content: c.trim(), articleLabel: null }));
                        knowledgeItems = rawChunks.map((chunk, idx) => ({
                            content: typeof chunk === 'string' ? chunk : chunk.content.trim(),
                            category: uploadCategory,
                            source: uploadFile.name,
                            page: typeof chunk === 'object' && chunk.articleLabel ? chunk.articleLabel : idx + 1
                        }));
                        const pdfBlob = await textToPdfBlob(fullText, uploadFile.name);
                        const pdfName = uploadFile.name.replace(/\.hwp$/i, '.pdf');
                        fileUrl = await uploadKnowledgeFile(pdfBlob, pdfName);
                    } else {
                        const text = await uploadFile.text();
                        const rawChunks = hasArticleStructure(text)
                            ? splitByArticle(text)
                            : text.split(/\n\s*\n/).filter(c => c.trim().length > 0).map(c => ({ content: c.trim(), articleLabel: null }));
                        knowledgeItems = rawChunks.map((chunk, idx) => ({
                            content: typeof chunk === 'string' ? chunk : chunk.content.trim(),
                            category: uploadCategory,
                            source: uploadFile.name,
                            page: typeof chunk === 'object' && chunk.articleLabel ? chunk.articleLabel : idx + 1
                        }));
                        const pdfBlob = await textToPdfBlob(text, uploadFile.name);
                        const pdfName = uploadFile.name.replace(/\.txt$/i, '.pdf');
                        fileUrl = await uploadKnowledgeFile(pdfBlob, pdfName);
                    }

                    if (fileUrl) {
                        knowledgeItems = knowledgeItems.map((item) => ({ ...item, fileUrl }));
                    }
                    allItems = allItems.concat(knowledgeItems);
                } catch (fileErr) {
                    console.error(`Upload failed for ${uploadFile.name}:`, fileErr);
                    fileErrors.push({ name: uploadFile.name, message: fileErr?.message || String(fileErr) });
                }
            }

            if (fileErrors.length > 0 && allItems.length === 0) {
                setUploadStatus('error');
                alert(`모든 파일 처리에 실패했습니다.\n\n${fileErrors.map(e => `• ${e.name}: ${e.message}`).join('\n')}`);
                return;
            }
            if (fileErrors.length > 0) {
                console.warn('Some files failed:', fileErrors);
            }

            if (allItems.length > 0) {
                const itemsWithEmbeddings = [];
                for (const item of allItems) {
                    const embedding = await getEmbedding(item.content);
                    itemsWithEmbeddings.push({ ...item, embedding });
                }

                const result = await addKnowledgeItems(itemsWithEmbeddings);
                if (result.success) {
                    setUploadStatus('success');
                    const failNote = fileErrors.length > 0 ? `\n(일부 파일 실패: ${fileErrors.map(e => e.name).join(', ')})` : '';
                    alert(`${result.count}개의 지식 항목이 추가되었습니다! (${uploadFiles.length}개 파일)${failNote}`);
                    setUploadFiles([]);
                } else {
                    setUploadStatus('error');
                    alert(`저장 오류: ${result.error}`);
                }
            } else {
                alert('추출된 텍스트가 없습니다.');
            }
        } catch (error) {
            console.error("Upload processing error:", error);
            setUploadStatus('error');
            const msg = error?.message || String(error);
            alert(`처리 중 오류가 발생했습니다.\n\n${msg}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleMigration = async () => {
        if (!window.confirm('지식 베이스(KB)를 Firestore로 이관하시겠습니까? 대량의 데이터가 전송됩니다.')) return;
        
        setMigrationStatus('migrating');
        const result = await migrateKnowledgeBase();
        
        if (result.success) {
            setMigrationStatus('success');
            alert(`이관 완료! 총 ${result.count}개의 항목이 저장되었습니다.`);
        } else {
            setMigrationStatus('error');
            alert(`이관 실패: ${result.error || result.message}`);
        }
    };

    if (isLoading) return <div className="admin-loading">데이터 불러오는 중...</div>;

    return (
        <div className="admin-dashboard animate-in">
            <header className="admin-header">
                <div className="header-left">
                    <h2>🛡️ 관리자 대시보드</h2>
                    <div className="admin-tabs">
                        <button 
                            className={`tab-btn ${activeTab === 'edits' ? 'active' : ''}`}
                            onClick={() => setActiveTab('edits')}
                        >
                            수정 제안
                            {edits.length > 0 && <span className="badge">{edits.length}</span>}
                        </button>
                        <button 
                            className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
                            onClick={() => setActiveTab('stats')}
                        >
                            사용 통계
                        </button>
                        <button 
                            className={`tab-btn ${activeTab === 'upload' ? 'active' : ''}`}
                            onClick={() => setActiveTab('upload')}
                        >
                            지식 추가
                        </button>
                        <button 
                            className={`tab-btn ${activeTab === 'knowledge' ? 'active' : ''}`}
                            onClick={() => setActiveTab('knowledge')}
                        >
                            📚 지식 관리
                        </button>
                        <button 
                            className={`tab-btn ${activeTab === 'suggestions' ? 'active' : ''}`}
                            onClick={() => setActiveTab('suggestions')}
                        >
                            KB 추천 (AI)
                        </button>
                        <button 
                            className={`tab-btn ${activeTab === 'reports' ? 'active' : ''}`}
                            onClick={() => setActiveTab('reports')}
                        >
                            오답 신고
                            {answerReports.length > 0 && <span className="badge">{answerReports.length}</span>}
                        </button>
                    </div>
                </div>
                <div className="header-actions">
                    <button 
                        className={`migration-btn ${migrationStatus}`} 
                        onClick={handleMigration}
                        disabled={migrationStatus === 'migrating'}
                    >
                        {migrationStatus === 'migrating' ? '⏳ 이관 중...' : '📤 KB DB 이관'}
                    </button>
                </div>
            </header>

            {activeTab === 'edits' && (
                edits.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">✅</div>
                        <p>대기 중인 수정 제안이 없습니다.</p>
                    </div>
                ) : (
                    <div className="edits-grid">
                        {edits.map((edit) => (
                            <div key={edit.id} className="edit-card">
                                <div className="edit-header">
                                    <span className="edit-category">{edit.category}</span>
                                    <span className="edit-time">
                                        {edit.createdAt?.toDate().toLocaleString()}
                                    </span>
                                </div>

                                <div className="comparison-view">
                                    <div className="text-block original">
                                        <h4>원본 답변</h4>
                                        <p>{edit.originalText}</p>
                                    </div>
                                    <div className="arrow">➡️</div>
                                    <div className="text-block suggested">
                                        <h4>수정 제안</h4>
                                        <p>{edit.suggestedText}</p>
                                    </div>
                                </div>

                                {edit.metadata && (
                                    <div className="edit-metadata">
                                        📍 관련 문서: {edit.metadata.source} (p.{edit.metadata.page})
                                    </div>
                                )}

                                <div className="edit-actions">
                                    <button 
                                        className="reject-btn"
                                        onClick={() => handleAction(edit.id, 'rejected')}
                                    >
                                        반려
                                    </button>
                                    <button 
                                        className="approve-btn"
                                        onClick={() => handleAction(edit.id, 'approved')}
                                    >
                                        승인 및 반영
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            )}

            {activeTab === 'stats' && (
                <div className="stats-view">
                    {statsLoading ? (
                        <div className="admin-loading">통계 불러오는 중...</div>
                    ) : (
                        <>
                            <div className="stats-summary">
                                <div className="stat-card">
                                    <h3>총 질문 수</h3>
                                    <p className="stat-value">{stats.length}</p>
                                </div>
                                <div className="stat-card">
                                    <h3>최근 활동</h3>
                                    <p className="stat-value">{stats.length > 0 ? new Date(stats[0].timestamp?.toDate()).toLocaleDateString() : '-'}</p>
                                </div>
                            </div>
                            
                            <div className="logs-list">
                                <h3>📋 최근 질문 로그 (최신 50개)</h3>
                                <div className="logs-table-container">
                                    <table className="logs-table">
                                        <thead>
                                            <tr>
                                                <th>시간</th>
                                                <th>카테고리</th>
                                                <th>질문</th>
                                                <th>답변 요약</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {stats.map(log => (
                                                <tr key={log.id}>
                                                    <td>{log.timestamp?.toDate().toLocaleString()}</td>
                                                    <td><span className="log-category">{log.category}</span></td>
                                                    <td className="log-question">{log.question}</td>
                                                    <td className="log-answer" title={log.answer}>{log.answer?.substring(0, 50)}...</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

            {activeTab === 'knowledge' && (
                 <div className="knowledge-view">
                    <div className="section-header">
                        <h3>📚 등록된 지식 ({knowledgeItems.length})</h3>
                        <p>등록된 규정 및 지식 데이터를 조회하고 관리합니다.</p>
                        <div className="manual-add-box manual-add-section">
                            <h4>{editingId ? '✏️ 지식 수정' : '✏️ 직접 입력하여 추가'}</h4>
                            <form onSubmit={handleAddKnowledge} className="manual-add-form">
                                <div className="form-row">
                                    <input 
                                        type="text" 
                                        placeholder="제목 (예: 2026 보조금 지침)" 
                                        value={newKnowledge.title}
                                        onChange={(e) => setNewKnowledge({...newKnowledge, title: e.target.value})}
                                        required
                                        className="knowledge-input"
                                    />
                                    <select 
                                        value={newKnowledge.category} 
                                        onChange={(e) => setNewKnowledge({...newKnowledge, category: e.target.value})}
                                        className="knowledge-select"
                                    >
                                        <option value="general">일반</option>
                                        <option value="e나라도움">e나라도움</option>
                                        <option value="규정">진흥원 규정</option>
                                        <option value="사업공고">사업 공고</option>
                                        <option value="기타">기타</option>
                                    </select>
                                </div>
                                <textarea 
                                    placeholder="내용을 입력하세요..." 
                                    value={newKnowledge.content}
                                    onChange={(e) => setNewKnowledge({...newKnowledge, content: e.target.value})}
                                    required
                                    className="knowledge-textarea"
                                />
                                <div className="form-actions">
                                    <button type="submit" disabled={isAddingKnowledge} className="add-kb-btn">
                                        {isAddingKnowledge ? '저장 중...' : (editingId ? '수정 완료' : '추가하기')}
                                    </button>
                                    {editingId && (
                                        <button type="button" onClick={handleCancelEdit} className="cancel-edit-btn">
                                            취소
                                        </button>
                                    )}
                                </div>
                            </form>
                        </div>
                    </div>
                    <div className="knowledge-list">
                        {knowledgeItems.length === 0 ? (
                            <div className="empty-state">
                                <p className="empty-msg">등록된 지식이 없습니다. (기존 데이터를 사용하려면 상단의 'KB DB 이관'을 실행해주세요)</p>
                            </div>
                        ) : (
                            knowledgeItems.map((item) => (
                                <div key={item.id} className="knowledge-item">
                                    <div className="k-header">
                                        <span className="k-category-badge">{item.category}</span>
                                        <span className="k-source">📄 {item.source || '직접 입력'}</span>
                                        <span className="k-date">{item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString() : '날짜 없음'}</span>
                                    </div>
                                    <div className="k-content">
                                        <h4>{item.title || (item.content.length > 20 ? item.content.substring(0, 20) + '...' : item.content)}</h4>
                                        <p>{item.content}</p>
                                    </div>
                                    <div className="k-actions">
                                        <button onClick={() => handleEditClick(item)} className="edit-btn">✏️ 수정</button>
                                        <button onClick={() => handleDeleteKnowledge(item.id)} className="delete-btn">🗑️ 삭제</button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                 </div>
            )}

            {activeTab === 'upload' && (
                <div className="upload-view">
                    <div className="upload-card">
                        <h3>📄 지식 베이스 추가 (PDF/Text/HWP)</h3>
                        <p className="upload-desc">새로운 매뉴얼이나 규정집을 업로드하면, AI가 내용을 학습하여 답변에 활용합니다.</p>
                        
                        <div className="upload-form">
                            <div className="form-group">
                                <label>카테고리</label>
                                <select 
                                    value={uploadCategory} 
                                    onChange={(e) => setUploadCategory(e.target.value)}
                                    className="category-select"
                                >
                                    <option value="general">일반</option>
                                    <option value="e나라도움">e나라도움</option>
                                    <option value="규정">진흥원 규정</option>
                                    <option value="사업공고">사업 공고</option>
                                    <option value="기타">기타</option>
                                </select>
                            </div>

                            <div className="file-drop-area">
                                <input 
                                    type="file" 
                                    accept=".pdf,.txt,.hwp"
                                    multiple
                                    onChange={handleFileUpload}
                                    id="file-upload"
                                />
                                <label htmlFor="file-upload" className="file-label">
                                    {uploadFiles.length > 0 ? (
                                        <div className="file-selected">
                                            <span className="file-icon">📄</span>
                                            <span className="file-name">{uploadFiles.length}개 파일 선택됨</span>
                                            <ul style={{ margin: '8px 0 0', paddingLeft: '18px', fontSize: '13px', color: '#555' }}>
                                                {uploadFiles.map((f, i) => (
                                                    <li key={i}>{f.name} ({(f.size / 1024).toFixed(1)} KB)</li>
                                                ))}
                                            </ul>
                                        </div>
                                    ) : (
                                        <div className="file-placeholder">
                                            <span className="upload-icon">☁️</span>
                                            <span>클릭하여 PDF, 텍스트, HWP 파일을 여러 개 선택</span>
                                        </div>
                                    )}
                                </label>
                            </div>

                            <button 
                                className={`process-btn ${isProcessing ? 'processing' : ''} ${uploadStatus}`}
                                onClick={processUpload}
                                disabled={!uploadFiles.length || isProcessing}
                            >
                                {isProcessing ? '⏳ 문서 분석 및 저장 중...' : '🚀 지식 베이스에 추가하기'}
                            </button>
                        </div>
                    </div>

                    <div className="upload-tips">
                        <h4>💡 팁</h4>
                        <ul>
                            <li>PDF 파일은 텍스트가 포함된 문서여야 합니다. (스캔 이미지는 인식 불가)</li>
                            <li>텍스트 추출 후 페이지 단위로 분할되어 저장됩니다.</li>
                            <li>저장된 데이터는 즉시 챗봇 답변에 반영됩니다.</li>
                        </ul>
                    </div>
                </div>
            )}

            {activeTab === 'suggestions' && (
                <div className="suggestions-view">
                    {suggestionsLoading ? (
                        <div className="admin-loading">
                            <span>🧠 AI가 최근 질문 로그를 분석 중입니다...</span>
                        </div>
                    ) : (
                        suggestions.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-icon">🤷</div>
                                <p>아직 제안할 만한 새로운 FAQ가 없습니다.</p>
                                <button className="retry-btn" onClick={handleAnalyzeSuggestions}>다시 분석하기</button>
                            </div>
                        ) : (
                            <div className="suggestions-grid">
                                <div className="suggestions-header">
                                    <h3>💡 AI 추천 FAQ ({suggestions.length})</h3>
                                    <button className="retry-btn small" onClick={handleAnalyzeSuggestions}>🔄 새로고침</button>
                                </div>
                                {suggestions.map(item => (
                                    <div key={item.id} className="suggestion-card">
                                        <div className="suggestion-meta">
                                            <span className="suggestion-category">{item.category}</span>
                                            <span className="suggestion-reason">🔍 {item.reason}</span>
                                        </div>
                                        <div className="suggestion-content">
                                            <div className="suggestion-q">
                                                <strong>Q.</strong> {item.question}
                                            </div>
                                            <div className="suggestion-a">
                                                <strong>A.</strong> {item.answer}
                                            </div>
                                        </div>
                                        <div className="suggestion-actions">
                                            <button 
                                                className="reject-btn"
                                                onClick={() => handleSuggestionAction(item, 'reject')}
                                            >
                                                거절
                                            </button>
                                            <button 
                                                className="approve-btn"
                                                onClick={() => handleSuggestionAction(item, 'approve')}
                                            >
                                                승인 (KB 추가)
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    )}
                </div>
            )}

            {activeTab === 'reports' && (
                <div className="reports-view">
                    {answerReports.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">✅</div>
                            <p>오답 신고가 없습니다.</p>
                        </div>
                    ) : (
                        <div className="reports-list">
                            <h3>🚩 오답 신고 목록 ({answerReports.length})</h3>
                            {answerReports.map((report) => (
                                <div key={report.id} className="report-card edit-card">
                                    <div className="edit-header">
                                        <span className="edit-time">
                                            {report.createdAt?.toDate?.()?.toLocaleString?.() || '-'}
                                        </span>
                                    </div>
                                    <div className="text-block original">
                                        <h4>질문</h4>
                                        <p>{report.question || '-'}</p>
                                    </div>
                                    <div className="text-block suggested">
                                        <h4>답변 (일부)</h4>
                                        <p>{report.answerSnippet || '-'}</p>
                                    </div>
                                    {report.comment && (
                                        <div className="edit-metadata">
                                            🚩 신고 사유: {report.comment}
                                        </div>
                                    )}
                                    <div className="edit-actions">
                                        <button
                                            className="reject-btn"
                                            onClick={() => updateAnswerReportStatus(report.id, 'dismissed')}
                                        >
                                            무시
                                        </button>
                                        <button
                                            className="approve-btn"
                                            onClick={() => updateAnswerReportStatus(report.id, 'reviewed')}
                                        >
                                            검토함
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;