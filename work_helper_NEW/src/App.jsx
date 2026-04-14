import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import Layout from './components/Layout';
import Sidebar from './components/Sidebar';
import ChatDisplay from './components/ChatDisplay';
import InputArea from './components/InputArea';
import AdminDashboard from './components/AdminDashboard';
import SmartFormHelper from './components/SmartFormHelper';
import UserGuide from './components/UserGuide';
import MagicModal from './components/MagicModal';
import './styles/global.css';

import { generateResponse, initKnowledgeSync } from './services/ragEngine';
import { sendMessageToFirestore, subscribeToMessages, subscribeToSessions, createSession } from './services/firebase';

function AuthenticatedApp() {
  const { currentUser, logout } = useAuth();
  const isSending = useRef(false);
  const [mode, setMode] = useState('employee'); // 'employee' or 'character'
  const [knowledgeCategory, setKnowledgeCategory] = useState('all'); // 'all', 'enaradoum', '규정'
  const [answerTarget, setAnswerTarget] = useState('general'); // 'general' | 'officer' (일반 사용자용 | 담당자용)
  const [messages, setMessages] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMagicOpen, setIsMagicOpen] = useState(false);
  const [magicText, setMagicText] = useState('');
  const [currentView, setCurrentView] = useState('chat'); // 'chat' or 'admin'

  const isAdmin = currentUser?.email === 'sti60val@gmail.com';

  // 0. Initialize Knowledge Sync
  useEffect(() => {
    initKnowledgeSync();
  }, []);

  // 1. Subscribe to Sessions (Filtered by User)
  useEffect(() => {
    if (!currentUser) return;
    const unsubscribe = subscribeToSessions((fetchedSessions) => {
      setSessions(fetchedSessions);
      // Auto-select first session if none selected
      if (fetchedSessions.length > 0 && !activeSessionId) {
        setActiveSessionId(fetchedSessions[0].id);
      }
    }, currentUser.uid);
    return () => unsubscribe();
  }, [activeSessionId, currentUser]);

  // 2. Subscribe to Messages of Active Session
  useEffect(() => {
    if (!activeSessionId) return;

    const unsubscribe = subscribeToMessages(activeSessionId, (msgs) => {
      setMessages(msgs);
    });
    return () => unsubscribe();
  }, [activeSessionId]);

  // 3. Listen for Export events from Sidebar
  useEffect(() => {
    const downloadSessionAsDraft = (session, msgs) => {
      try {
        const header = `세션 제목: ${session.title || '새 대화'}\n생성일: ${session.createdAt?.toDate ? session.createdAt.toDate().toISOString() : ''}\n\n`;
        const body = msgs.map(m => {
          const time = m.timestamp?.toDate ? m.timestamp.toDate().toLocaleString() : '';
          return `[${m.sender === 'user' ? '사용자' : '지니'}] ${time}\n${m.text}\n`;
        }).join('\n');
        const text = `${header}${body}`;
        const summary = (session.title || (msgs[0]?.text || '')).slice(0, 15).replace(/[^\w\s가-힣]/gi, '').trim();
        const filename = `충콘지니_${summary || '대화기록'}_${new Date().toISOString().slice(0,10)}.txt`;
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch (e) {
        console.error('세션 내보내기 실패:', e);
        alert('내보내기에 실패했습니다.');
      }
    };
    const handleExport = (e) => {
      const { session } = e.detail;
      if (session.id === activeSessionId) {
        downloadSessionAsDraft(session, messages);
      } else {
        alert("내보내려는 대화를 먼저 선택해주세요!");
      }
    };
    window.addEventListener('export-session', handleExport);
    return () => window.removeEventListener('export-session', handleExport);
  }, [activeSessionId, messages]);


  const handleModeToggle = () => {
    setMode(prev => prev === 'employee' ? 'character' : 'employee');
  };

  const handleSend = async (text, imageFile = null) => {
    if (isLoading || isSending.current) return; // Guard against double clicks

    isSending.current = true;
    setIsLoading(true);

    if (!activeSessionId) {
      const newId = await createSession('새 대화', 'general', currentUser.uid);
      if (newId) {
        setActiveSessionId(newId);
      } else {
        isSending.current = false;
        setIsLoading(false);
        return;
      }
    }

    // 1. Convert image to base64 if exists
    let imageBase64 = null;
    if (imageFile) {
      imageBase64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(imageFile);
      });
    }

    // 2. Save user message to Firebase
    await sendMessageToFirestore({
      text,
      sender: 'user',
      userId: currentUser.uid, // Add User ID
      imageUrl: imageFile ? URL.createObjectURL(imageFile) : null
    }, activeSessionId);

    try {
      // 3. Get AI response with image data if present
      const { text: responseText, metadata } = await generateResponse(text, mode, imageBase64, knowledgeCategory, answerTarget);

      // 4. Save bot response to Firebase
      await sendMessageToFirestore({
        text: responseText,
        sender: 'bot',
        metadata: metadata
      }, activeSessionId);
    } catch (error) {
      console.error("Error fetching response:", error);
      await sendMessageToFirestore({ text: "오류가 발생했습니다. 잠시 후 다시 시도해주세요.", sender: 'bot' }, activeSessionId);
    } finally {
      setIsLoading(false);
      isSending.current = false;
    }
  };

  const handleNewChat = async () => {
    const newId = await createSession('새 대화', 'general', currentUser.uid);
    if (newId) setActiveSessionId(newId);
  };

  const handleMagic = (currentText) => {
    if (!currentText) return;
    setMagicText(currentText);
    setIsMagicOpen(true);
  };
  
  const handleLogout = async () => {
      try {
          await logout();
      } catch (error) {
          console.error("Logout failed", error);
      }
  };

  return (
    <Layout>
      <Sidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSessionSelect={setActiveSessionId}
        onNewChat={handleNewChat}
        mode={mode}
        onModeToggle={handleModeToggle}
        activeCategory={knowledgeCategory}
        onCategoryChange={setKnowledgeCategory}
        activeAnswerTarget={answerTarget}
        onAnswerTargetChange={setAnswerTarget}
        currentView={currentView}
        onViewChange={setCurrentView}
        onLogout={handleLogout}
        isAdmin={isAdmin}
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', height: '100vh', overflow: 'hidden' }}>
        {currentView === 'chat' && (
          <>
            <ChatDisplay messages={messages} isLoading={isLoading} sessionId={activeSessionId} activeCategory={knowledgeCategory} />
            <InputArea onSend={handleSend} onMagic={handleMagic} isLoading={isLoading} />
          </>
        )}
        
        {currentView === 'admin' && isAdmin && <AdminDashboard />}
        
        {currentView === 'smart-form' && <SmartFormHelper />}
        
        {currentView === 'user-guide' && <UserGuide />}

        <MagicModal 
          isOpen={isMagicOpen}
          onClose={() => setIsMagicOpen(false)}
          originalText={magicText}
        />
      </div>
    </Layout>
  );
}

function App() {
  const { currentUser } = useAuth();
  
  if (!currentUser) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    );
  }

  return <AuthenticatedApp />;
}

export default App;
