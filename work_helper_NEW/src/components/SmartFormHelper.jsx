import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { extractTextFromPdf } from '../utils/pdfParser';
import { generateFormExample, checkCompliance } from '../services/ragEngine';
import './SmartFormHelper.css';

const SmartFormHelper = () => {
    const [mode, setMode] = useState('write'); // 'write' | 'check'
    const [file, setFile] = useState(null);
    const [context, setContext] = useState('');
    const [result, setResult] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [dragActive, setDragActive] = useState(false);

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFiles(e.dataTransfer.files[0]);
        }
    };

    const handleChange = (e) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            handleFiles(e.target.files[0]);
        }
    };

    const handleFiles = (selectedFile) => {
        if (selectedFile.type === 'application/pdf') {
            setFile(selectedFile);
            setResult('');
        } else {
            alert('PDF 파일만 지원합니다.');
        }
    };

    const handleGenerate = async () => {
        if (!file) return;
        if (mode === 'write' && !context.trim()) return;

        setIsProcessing(true);
        try {
            // 1. Extract text from PDF
            const { fullText } = await extractTextFromPdf(file);
            
            // 2. Generate result based on mode
            let output = '';
            if (mode === 'write') {
                output = await generateFormExample(fullText, context);
            } else {
                output = await checkCompliance(fullText);
            }
            
            setResult(output);
        } catch (error) {
            console.error("Error:", error);
            alert("처리 중 오류가 발생했습니다.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleExampleClick = (text) => {
        setContext(text);
    };

    return (
        <div className="smart-form-helper">
            <header className="helper-header">
                <div className="header-top">
                    <h2>📝 스마트 서식 도우미</h2>
                    <p>작성하려는 문서의 초안을 생성하거나, 규정에 맞는지 검토해드립니다.</p>
                </div>
                
                <div className="mode-toggle">
                    <button 
                        className={mode === 'write' ? 'active' : ''}
                        onClick={() => setMode('write')}
                    >
                        ✨ 작성 모드
                    </button>
                    <button 
                        className={mode === 'audit' ? 'active' : ''}
                        onClick={() => setMode('audit')}
                    >
                        🔍 검토 모드
                    </button>
                </div>

                <div className="feature-examples">
                    <h4>💡 활용 예시 (클릭하여 체험하기)</h4>
                    {mode === 'write' ? (
                        <ul>
                            <li>
                                <button className="example-btn" onClick={() => handleExampleClick("1박 2일 서울 출장 (업체 미팅), 교통비 및 식비 포함 작성 필요")}>
                                    📄 <strong>출장보고서:</strong> "1박 2일 서울 출장..."
                                </button>
                            </li>
                            <li>
                                <button className="example-btn" onClick={() => handleExampleClick("주간 업무 보고 회의 내용 정리: A프로젝트 진행상황 공유, B이슈 해결 방안 논의")}>
                                    📝 <strong>회의록:</strong> "주간 업무 보고 회의 내용..."
                                </button>
                            </li>
                            <li>
                                <button className="example-btn" onClick={() => handleExampleClick("신규 사업 협조 요청 공문 작성: 사업 목적 설명 및 협조 사항 나열")}>
                                    ✉️ <strong>공문 기안:</strong> "신규 사업 협조 요청 공문..."
                                </button>
                            </li>
                        </ul>
                    ) : (
                        <ul>
                            <li className="audit-hint">
                                💰 <strong>지출 증빙:</strong> "식대 3만원 초과 영수증" (파일 업로드 필요)
                            </li>
                            <li className="audit-hint">
                                📊 <strong>예산 계획:</strong> "워크숍 예산안 파일" (파일 업로드 필요)
                            </li>
                        </ul>
                    )}
                </div>
            </header>

            <div className="smart-form-content">
                <div 
                    className={`file-upload-area ${dragActive ? 'active' : ''}`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById('file-upload').click()}
                >
                    <input 
                        id="file-upload"
                        type="file" 
                        accept=".pdf" 
                        onChange={handleChange}
                        style={{ display: 'none' }} 
                    />
                    <div className="upload-placeholder">
                        <span className="upload-icon">📂</span>
                        {file ? (
                            <span className="file-name">{file.name}</span>
                        ) : (
                            <span>여기를 클릭하거나 파일을 드래그하세요 (PDF)</span>
                        )}
                    </div>
                </div>

                {mode === 'write' && (
                    <div className="context-input-area">
                        <label>작성 상황 / 맥락</label>
                        <textarea
                            className="context-textarea"
                            value={context}
                            onChange={(e) => setContext(e.target.value)}
                            placeholder="예: 1박 2일 서울 출장 (업체 미팅 및 세미나 참석), 교통비 및 식비 포함 작성 필요"
                        />
                    </div>
                )}

                <button 
                    className={`generate-btn ${mode}`}
                    onClick={handleGenerate}
                    disabled={isProcessing || !file || (mode === 'write' && !context)}
                >
                    {isProcessing ? '처리 중...' : (mode === 'write' ? '✨ 작성 예시 생성하기' : '🔍 규정 위반 검토하기')}
                </button>

                {result && (
                    <div className="result-area animate-in">
                        <h3>결과 리포트</h3>
                        <div className="markdown-content">
                            <ReactMarkdown>{result}</ReactMarkdown>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SmartFormHelper;
