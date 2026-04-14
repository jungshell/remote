import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { auth } from '../services/firebase';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { login, signup, loginWithGoogle } = useAuth();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSignup, setIsSignup] = useState(false);
    const navigate = useNavigate();

    async function handleSubmit(e) {
        e.preventDefault();

        try {
            setError('');
            setLoading(true);
            if (isSignup) {
                await signup(email, password);
                alert("회원가입이 완료되었습니다. 자동 로그인됩니다.");
            } else {
                await login(email, password);
            }
            navigate('/');
        } catch (err) {
            console.error(err);
            setError('로그인/회원가입에 실패했습니다. 이메일과 비밀번호를 확인해주세요.');
        }

        setLoading(false);
    }

    async function handleGoogleLogin() {
        try {
            setError('');
            setLoading(true);
            await loginWithGoogle();
            navigate('/');
        } catch (err) {
            console.error(err);
            setError('Google 로그인에 실패했습니다. 관리자에게 문의하세요.');
        }
        setLoading(false);
    }

    if (!auth) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f5f7fb', flexDirection: 'column', gap: '12px', padding: '24px', textAlign: 'center' }}>
                <h2 style={{ color: '#e74c3c' }}>Firebase 설정이 필요합니다</h2>
                <p>프로젝트 루트의 <strong>.env</strong> 파일에 아래 항목이 올바르게 들어 있는지 확인해 주세요.</p>
                <pre style={{ background: '#fff', padding: '16px', borderRadius: '8px', fontSize: '13px', textAlign: 'left' }}>
{`VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...`}
                </pre>
                <p>Firebase 콘솔 → 프로젝트 설정 → 일반 → 내 앱 에서 값을 복사한 뒤 저장하고, 개발 서버를 재시작하세요.</p>
            </div>
        );
    }

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            backgroundColor: '#f5f7fb'
        }}>
            <div style={{
                background: 'white',
                padding: '40px',
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                width: '100%',
                maxWidth: '400px'
            }}>
                <h2 style={{ textAlign: 'center', marginBottom: '24px', color: '#333' }}>
                    {isSignup ? '회원가입' : '로그인'}
                </h2>
                {error && <div style={{ 
                    backgroundColor: '#ffebee', 
                    color: '#c62828', 
                    padding: '12px', 
                    borderRadius: '4px', 
                    marginBottom: '16px',
                    fontSize: '14px' 
                }}>{error}</div>}
                
                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#666' }}>이메일</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            style={{
                                width: '100%',
                                padding: '10px',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>
                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#666' }}>비밀번호</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            style={{
                                width: '100%',
                                padding: '10px',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>
                    <button 
                        disabled={loading} 
                        type="submit"
                        style={{
                            width: '100%',
                            padding: '12px',
                            backgroundColor: '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '16px',
                            cursor: 'pointer',
                            marginBottom: '16px'
                        }}
                    >
                        {isSignup ? '가입하기' : '로그인'}
                    </button>
                </form>

                <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0' }}>
                    <div style={{ flex: 1, height: '1px', backgroundColor: '#eee' }}></div>
                    <span style={{ padding: '0 10px', color: '#999', fontSize: '14px' }}>또는</span>
                    <div style={{ flex: 1, height: '1px', backgroundColor: '#eee' }}></div>
                </div>

                <button
                    disabled={loading}
                    onClick={handleGoogleLogin}
                    style={{
                        width: '100%',
                        padding: '12px',
                        backgroundColor: '#fff',
                        color: '#333',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '16px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        marginBottom: '16px'
                    }}
                >
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style={{ width: '18px', height: '18px' }} />
                    Google로 계속하기
                </button>

                <div style={{ textAlign: 'center', marginTop: '16px' }}>
                    <button 
                        onClick={() => setIsSignup(!isSignup)}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#007bff',
                            cursor: 'pointer',
                            fontSize: '14px',
                            textDecoration: 'underline'
                        }}
                    >
                        {isSignup ? '이미 계정이 있으신가요? 로그인' : '계정이 없으신가요? 회원가입'}
                    </button>
                </div>
            </div>
        </div>
    );
}
