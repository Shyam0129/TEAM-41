import React, { useState, useRef, useEffect } from 'react';
import { Sidebar } from './components/Sidebar.tsx';
import { InputArea } from './components/InputArea.tsx';
import { ToolsModal } from './components/ToolsModal.tsx';
import { TopNavigation } from './components/TopNavigation.tsx';
import { WelcomeScreen } from './components/WelcomeScreen.tsx';
import { ChatMessages } from './components/ChatMessages.tsx';
import { SettingsModal } from './components/SettingsModal.tsx';
import { ExportModal } from './components/ExportModal.tsx';
import { LogoutModal } from './components/LogoutModal.tsx';
import { ProModal } from './components/ProModal.tsx';
import { LoginPage } from './components/LoginPage.tsx';
import { SignUpPage } from './components/SignUpPage.tsx';
import { Message, ModelType } from './types.ts';
import { streamChatResponse } from './services/geminiService.ts';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeNav, setActiveNav] = useState('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isWelcomeScreen, setIsWelcomeScreen] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [currentModel, setCurrentModel] = useState('Gemini 3 Pro');
  
  // Modal States
  const [isToolsModalOpen, setIsToolsModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isProModalOpen, setIsProModalOpen] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Check initial system preference or class
    if (document.documentElement.classList.contains('dark')) {
      setIsDarkMode(true);
    } else {
      setIsDarkMode(false);
    }
  }, []);

  const toggleTheme = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove('dark');
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      setIsDarkMode(true);
    }
  };

  // Adjust sidebar state based on screen width
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    
    // Set initial state
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSendMessage = async (text: string) => {
    if (isLoading) return;

    // Reset abort controller
    abortControllerRef.current = new AbortController();

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date()
    };

    setIsWelcomeScreen(false);
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    // Create a placeholder for the bot response
    const botMsgId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, {
      id: botMsgId,
      role: 'model',
      content: '', // Start empty for streaming
      timestamp: new Date()
    }]);

    try {
      await streamChatResponse(
        messages,
        text,
        ModelType.FLASH, // Using FLASH as placeholder for any model selected for now
        (chunk) => {
          setMessages(prev => prev.map(msg => 
            msg.id === botMsgId 
              ? { ...msg, content: msg.content + chunk }
              : msg
          ));
        },
        abortControllerRef.current.signal
      );
    } catch (error: any) {
      if (error.name === 'AbortError') {
        // Handled by user stopping
        console.log('Generation stopped by user');
      } else {
        setMessages(prev => prev.map(msg => 
          msg.id === botMsgId 
            ? { ...msg, content: msg.content + "\n[Error: " + (error.message || "Something went wrong") + "]", isError: true }
            : msg
        ));
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setIsWelcomeScreen(true);
    setInputValue('');
  };

  const handleSuggestionClick = (text: string) => {
    setInputValue(text);
  };

  const handleSidebarPromptSelect = (prompt: string) => {
    setInputValue(prompt);
    // On mobile, maybe close sidebar?
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const handleEdit = (text: string) => {
    setInputValue(text);
  };

  const handleRetry = (text: string) => {
    handleSendMessage(text);
  };

  const handleLogout = () => {
    setIsLogoutModalOpen(false);
    setIsAuthenticated(false);
    setAuthMode('login');
    handleNewChat();
  };

  if (!isAuthenticated) {
    if (authMode === 'signup') {
      return (
        <SignUpPage 
          onSignUp={() => setIsAuthenticated(true)} 
          onSwitchToLogin={() => setAuthMode('login')}
          isDarkMode={isDarkMode}
          toggleTheme={toggleTheme}
        />
      );
    }
    return (
      <LoginPage 
        onLogin={() => setIsAuthenticated(true)} 
        onSwitchToSignUp={() => setAuthMode('signup')}
        isDarkMode={isDarkMode}
        toggleTheme={toggleTheme}
      />
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-[#0f0f10] text-gray-900 dark:text-gray-100 font-sans overflow-hidden transition-colors duration-300">
      
      {/* Modals */}
      <ToolsModal 
        isOpen={isToolsModalOpen} 
        onClose={() => setIsToolsModalOpen(false)} 
      />
      <SettingsModal 
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        isDarkMode={isDarkMode}
        toggleTheme={toggleTheme}
      />
      <ExportModal 
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />
      <LogoutModal 
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleLogout}
      />
      <ProModal 
        isOpen={isProModalOpen}
        onClose={() => setIsProModalOpen(false)}
      />

      {/* Sidebar */}
      <Sidebar 
        isOpen={isSidebarOpen} 
        activeNav={activeNav} 
        setActiveNav={setActiveNav}
        onNewChat={handleNewChat}
        onPromptSelect={handleSidebarPromptSelect}
      />

      {/* Main Content */}
      <div className={`flex-1 flex flex-col h-full transition-all duration-300 ${isSidebarOpen ? 'md:ml-72' : 'md:ml-0'}`}>
        
        <TopNavigation 
          isWelcomeScreen={isWelcomeScreen}
          isDarkMode={isDarkMode}
          toggleTheme={toggleTheme}
          currentModel={currentModel}
          setCurrentModel={setCurrentModel}
          setIsToolsModalOpen={setIsToolsModalOpen}
          onMobileMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
          onOpenSettings={() => setIsSettingsModalOpen(true)}
          onOpenExport={() => setIsExportModalOpen(true)}
          onOpenLogout={() => setIsLogoutModalOpen(true)}
          onOpenPro={() => setIsProModalOpen(true)}
        />

        {/* Scrollable Chat Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar relative">
          
          {isWelcomeScreen ? (
            <WelcomeScreen onSuggestionClick={handleSuggestionClick} />
          ) : (
            <ChatMessages 
              messages={messages}
              isLoading={isLoading}
              onEdit={handleEdit}
              onRetry={handleRetry}
              messagesEndRef={messagesEndRef}
            />
          )}
        </div>

        {/* Bottom Input Area Container - Fixed */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-gray-50 via-gray-50 dark:from-[#0f0f10] dark:via-[#0f0f10] to-transparent pt-10 pb-6 px-4 md:px-8 z-20 transition-colors">
          <InputArea 
            onSend={handleSendMessage} 
            onStop={handleStopGeneration}
            disabled={isLoading} 
            value={inputValue}
            isGenerating={isLoading}
          />
        </div>

      </div>
    </div>
  );
}