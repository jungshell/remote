import React, { useState } from 'react';
import { transformTone } from '../services/ragEngine';

function MagicModal({ isOpen, onClose, originalText }) {
    const [targetTone, setTargetTone] = useState('SNS 홍보톤');
    const [result, setResult] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    if (!isOpen) return null;

    const handleTransform = async () => {
        setIsLoading(true);
        try {
            const transformedText = await transformTone(originalText, targetTone);
            setResult(transformedText);
        } catch (error) {
            console.error("Transformation failed:", error);
            setResult("변환에 실패했습니다.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(result);
        alert("복사되었습니다!");
        onClose();
    };

    return (
        <div style={styles.overlay}>
            <div style={styles.modal}>
                <h3 style={styles.title}>✨ 문장 다듬기</h3>

                <div style={styles.section}>
                    <label style={styles.label}>원본 문장</label>
                    <div style={styles.textBlock}>{originalText}</div>
                </div>

                <div style={styles.controls}>
                    <select
                        value={targetTone}
                        onChange={(e) => setTargetTone(e.target.value)}
                        style={styles.select}
                    >
                        <option value="SNS 홍보톤">📢 SNS 홍보톤 (이모지 가득)</option>
                        <option value="정중한 공문서">📄 정중한 공문서 (보고서용)</option>
                        <option value="부드러운 메일">📧 부드러운 메일 (답장용)</option>
                        <option value="간결한 요약">⚡ 간결한 요약 (핵심만)</option>
                    </select>
                    <button onClick={handleTransform} disabled={isLoading} style={styles.button}>
                        {isLoading ? '변환 중...' : '변환하기'}
                    </button>
                </div>

                {result && (
                    <div style={styles.section}>
                        <label style={styles.label}>변환 결과</label>
                        <div style={styles.resultBlock}>{result}</div>
                        <button onClick={handleCopy} style={styles.copyButton}>
                            복사하고 닫기
                        </button>
                    </div>
                )}

                <button onClick={onClose} style={styles.closeButton}>X</button>
            </div>
        </div>
    );
}

const styles = {
    overlay: {
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(5px)'
    },
    modal: {
        backgroundColor: 'white',
        padding: '24px',
        borderRadius: '16px',
        width: '90%',
        maxWidth: '500px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
        position: 'relative',
        animation: 'fadeIn 0.3s ease'
    },
    title: {
        marginTop: 0,
        marginBottom: '20px',
        fontSize: '1.2rem',
        color: '#333'
    },
    section: {
        marginBottom: '16px'
    },
    label: {
        display: 'block',
        fontSize: '0.85rem',
        color: '#666',
        marginBottom: '8px'
    },
    textBlock: {
        padding: '12px',
        backgroundColor: '#f5f5f5',
        borderRadius: '8px',
        fontSize: '0.95rem',
        color: '#444',
        maxHeight: '100px',
        overflowY: 'auto'
    },
    controls: {
        display: 'flex',
        gap: '10px',
        marginBottom: '20px'
    },
    select: {
        flex: 1,
        padding: '10px',
        borderRadius: '8px',
        border: '1px solid #ddd',
        fontSize: '0.95rem'
    },
    button: {
        padding: '10px 20px',
        backgroundColor: '#6c5ce7',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: 'bold'
    },
    resultBlock: {
        padding: '12px',
        backgroundColor: '#f0f3ff',
        border: '1px solid #dce4ff',
        borderRadius: '8px',
        fontSize: '0.95rem',
        color: '#333',
        marginBottom: '10px',
        whiteSpace: 'pre-wrap'
    },
    copyButton: {
        width: '100%',
        padding: '12px',
        backgroundColor: '#333',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer'
    },
    closeButton: {
        position: 'absolute',
        top: '16px',
        right: '16px',
        background: 'none',
        border: 'none',
        fontSize: '1.2rem',
        cursor: 'pointer',
        color: '#999'
    }
};

export default MagicModal;
