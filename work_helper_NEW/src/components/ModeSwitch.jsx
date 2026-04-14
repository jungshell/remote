import React from 'react';
import './ModeSwitch.css';

const ModeSwitch = ({ mode, onToggle }) => {
    return (
        <div className="mode-switch-container">
            <div className={`switch-track ${mode}`} onClick={onToggle}>
                <div className="switch-thumb">
                    {mode === 'employee' ? '💼' : '🐯'}
                </div>
            </div>
            <span className="mode-label">
                {mode === 'employee' ? '직원 모드' : '캐릭터 모드'}
            </span>
        </div>
    );
};

export default ModeSwitch;
