import React, { useState, useRef, useEffect } from 'react';
import './InputArea.css';
import { FAQ_SUGGESTIONS } from '../data/faqData';

const InputArea = ({ onSend, onMagic, isLoading }) => {
    const [text, setText] = useState('');
    const [image, setImage] = useState(null); // { file, preview }
    const [selectedCategory, setSelectedCategory] = useState('전체');
    const fileInputRef = useRef(null);
    const textareaRef = useRef(null);

    // Extract categories
    const categories = ['전체', ...new Set(FAQ_SUGGESTIONS.map(f => f.category))];

    // Filtered suggestions
    const filteredSuggestions = selectedCategory === '전체'
        ? FAQ_SUGGESTIONS
        : FAQ_SUGGESTIONS.filter(f => f.category === selectedCategory);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [text]);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!isLoading) handleSend();
        }
    };

    const handleSend = () => {
        if ((text.trim() || image) && !isLoading) {
            const currentText = text;
            const currentImage = image?.file;

            // Clear BEFORE sending to prevent race conditions
            setText('');
            setImage(null);

            onSend(currentText, currentImage);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImage({ file, preview: reader.result });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleFAQClick = (question) => {
        if (!isLoading) {
            setText(question);
            textareaRef.current?.focus();
        }
    };

    return (
        <div className="input-area-container animate-in" style={{ animationDelay: '0.4s' }}>
            <div className="faq-categories">
                {categories.map(cat => (
                    <button
                        key={cat}
                        className={`category-chip ${selectedCategory === cat ? 'active' : ''}`}
                        onClick={() => setSelectedCategory(cat)}
                        disabled={isLoading}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            <div className="faq-suggestions">
                {filteredSuggestions.map((faq) => (
                    <button
                        key={faq.id}
                        className="faq-badge"
                        onClick={() => handleFAQClick(faq.question)}
                        disabled={isLoading}
                        title={faq.category}
                    >
                        {faq.icon} {faq.question}
                    </button>
                ))}
            </div>

            <div className="input-card glass">
                {image && (
                    <div className="image-preview-overlay">
                        <img src={image.preview} alt="upload preview" className="preview-thumbnail" />
                        <button className="remove-image-btn" onClick={() => setImage(null)}>×</button>
                    </div>
                )}

                <div className="input-flex">
                    <button className="tool-btn" onClick={() => fileInputRef.current.click()} title="이미지 업로드">
                        📎
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        accept="image/*"
                        onChange={handleFileChange}
                    />

                    <textarea
                        ref={textareaRef}
                        className="message-input"
                        placeholder={isLoading ? "지니가 생각 중입니다..." : "지니에게 무엇이든 물어보세요..."}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        rows="1"
                        disabled={isLoading}
                    />

                    <button className="magic-btn" onClick={() => onMagic(text)} title="소통체 변환" disabled={isLoading || !text.trim()}>
                        🪄
                    </button>

                    <button
                        className={`send-btn ${text.trim() || image ? 'active' : ''}`}
                        onClick={handleSend}
                        disabled={isLoading || (!text.trim() && !image)}
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="22" y1="2" x2="11" y2="13"></line>
                            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InputArea;
