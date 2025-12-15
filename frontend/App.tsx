import React, { useState, useRef, useEffect } from 'react';
import { Sidebar } from './components/Sidebar.tsx';
import { InputArea } from './components/InputArea.tsx';
import { ToolsModal } from './components/ToolsModal.tsx';
import { Message, ModelType } from './types.ts';
import { INITIAL_SUGGESTIONS } from './constants.tsx';
import { streamChatResponse } from './services/geminiService.ts';
import {
  Share,
  Menu,
  Zap,
  Sun,
  Moon,
  RotateCcw,
  Pencil,
  Blocks,
  LogOut,
  Settings,
  ChevronDown,
  Check
} from 'lucide-react';

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
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);

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

    // Create conversation if this is the first message
    if (!currentConversationId && !sessionId) {
      try {
        const newSessionId = 'sess_' + Math.random().toString(36).substr(2, 9);
        setSessionId(newSessionId);

        const conversation = await createConversation(userId, newSessionId, text);
        setCurrentConversationId(conversation.conversation_id);
        setConversationTitle(conversation.title || null);
      } catch (error) {
        console.error('Error creating conversation:', error);
      }
    }

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
        [...messages, userMsg],
        text,
        ModelType.FLASH,
        (chunk) => {
          setMessages(prev => prev.map(msg =>
            msg.id === botMsgId
              ? { ...msg, content: msg.content + chunk }
              : msg
          ));
        },
        abortControllerRef.current.signal
      );

      // Update session ID from response
      if (response.session_id && !sessionId) {
        setSessionId(response.session_id);
      }

      // If there are suggested actions, you could handle them here
      if (response.suggested_actions && response.suggested_actions.length > 0) {
        console.log('Suggested actions:', response.suggested_actions);
      }

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
    setSessionId(null);
    setCurrentConversationId(null);
    setConversationTitle(null);
  };

  const handleSelectConversation = async (conversationId: string) => {
    try {
      const { messages: convMessages } = await getConversationMessages(conversationId);

      // Convert to Message format
      const formattedMessages: Message[] = convMessages.map((msg: ConversationMessage) => ({
        id: msg.id,
        role: msg.role === 'assistant' ? 'model' : msg.role as 'user' | 'model',
        content: msg.content,
        timestamp: new Date(msg.timestamp)
      }));

      setMessages(formattedMessages);
      setCurrentConversationId(conversationId);
      setIsWelcomeScreen(false);

      // Close sidebar on mobile
      if (window.innerWidth < 768) setIsSidebarOpen(false);
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
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
      >
        {activeNav === 'chat' && (
          <ConversationHistory
            userId={userId}
            currentConversationId={currentConversationId || undefined}
            onSelectConversation={handleSelectConversation}
            onNewConversation={handleNewChat}
          />
        )}
      </Sidebar>

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
            <div className="min-h-full flex flex-col items-center justify-center p-4 sm:p-8 max-w-5xl mx-auto pb-40">
              {/* Header */}
              <div className="text-center mb-16 space-y-4 animate-fade-in-up">
                <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white tracking-tight">
                  Welcome to Rexie.
                </h1>
                <p className="text-gray-600 dark:text-gray-400 max-w-lg mx-auto text-lg font-light">
                  Your intelligent assistant for Gmail, Slack, Calendar, Docs, and more
                </p>
              </div>

              {/* Suggestions Grid */}
              <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-4 px-4">
                {INITIAL_SUGGESTIONS.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className={`
                      group relative p-6 bg-white dark:bg-[#1c1c1e] hover:bg-gray-50 dark:hover:bg-[#2c2c2e] 
                      border border-gray-200 dark:border-white/5 rounded-xl text-left 
                      transition-all duration-300 hover:shadow-xl hover:scale-[1.01] shadow-sm
                      ${(idx === INITIAL_SUGGESTIONS.length - 1 && INITIAL_SUGGESTIONS.length % 2 !== 0) ? 'md:col-span-2' : ''}
                    `}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-white relative z-10 flex items-center gap-2">
                      {suggestion}
                    </h3>
                    <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1">
                      <Zap className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto p-4 sm:p-6 pb-40 space-y-6">
              {messages.map((msg, idx) => (
                <div
                  key={msg.id}
                  className={`flex gap-4 group ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'model' && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center flex-shrink-0 mt-1 shadow-md">
                      <Zap className="w-4 h-4 text-white" />
                    </div>
                  )}

                  {msg.role === 'user' ? (
                    <div className="flex flex-col items-end max-w-[85%]">
                      <div className="bg-gray-200 dark:bg-[#2c2c2e] text-gray-900 dark:text-white rounded-2xl px-5 py-3.5 text-sm leading-relaxed shadow-sm">
                        {msg.content}
                      </div>
                      {/* Edit and Retry Options */}
                      <div className="flex items-center gap-2 mt-1 mr-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button
                          onClick={() => handleEdit(msg.content)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 transition-all"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleRetry(msg.content)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 transition-all"
                          title="Retry"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`
                         max-w-[85%] rounded-2xl px-5 py-3.5 text-sm leading-relaxed shadow-sm
                         bg-white dark:bg-[#1c1c1e] text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-white/5
                         ${msg.isError ? 'border-red-500/50 bg-red-50 dark:bg-red-500/10' : ''}
                       `}
                    >
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        <div className="whitespace-pre-wrap font-light">{msg.content}</div>
                      </div>
                    </div>
                  )}

                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0 mt-1 text-xs font-bold text-white shadow-md">
                      JD
                    </div>
                  )}
                </div>
              ))}
              {isLoading && messages[messages.length - 1]?.role === 'user' && (
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center flex-shrink-0 mt-1 animate-pulse shadow-md">
                    <Zap className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex items-center gap-1 mt-3">
                    <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce delay-75"></div>
                    <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce delay-150"></div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
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