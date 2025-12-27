import React, { useState, useRef, useEffect } from 'react';
import { Sidebar } from './components/Sidebar.tsx';
import { InputArea } from './components/InputArea.tsx';
import { ToolsModal } from './components/ToolsModal.tsx';
import { MessageContent } from './components/MessageContent.tsx';
import { ConversationHistory } from './components/ConversationHistory.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { useAuth } from './contexts/AuthContext.tsx';
import { Message, ModelType } from './types.ts';
import { INITIAL_SUGGESTIONS } from './constants.tsx';
import { streamChatResponse } from './services/backendService.ts';
import {
  createConversation,
  getConversationMessages,
  Conversation,
  ConversationMessage
} from './services/conversationService.ts';
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
  const { isAuthenticated } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeNav, setActiveNav] = useState('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isWelcomeScreen, setIsWelcomeScreen] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isToolsModalOpen, setIsToolsModalOpen] = useState(false);
  const [currentModel, setCurrentModel] = useState('Gemini 3 Pro');
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [userId] = useState('user_' + Math.random().toString(36).substr(2, 9));
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [conversationTitle, setConversationTitle] = useState<string | null>(null);

  // Auth modal state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const modelDropdownRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Handle OAuth callback tokens from URL
  useEffect(() => {
    const handleOAuthCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      if (accessToken) {
        try {
          // Store tokens
          localStorage.setItem('access_token', accessToken);
          if (refreshToken) {
            localStorage.setItem('refresh_token', refreshToken);
          }

          // Fetch user data
          const response = await fetch('http://localhost:8000/auth/me', {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          });

          if (response.ok) {
            const userData = await response.json();
            localStorage.setItem('user', JSON.stringify(userData));

            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);

            // Reload to update auth state
            window.location.reload();
          }
        } catch (error) {
          console.error('OAuth callback error:', error);
        }
      }
    };

    handleOAuthCallback();
  }, []);

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

  // Close profile dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close model dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target as Node)) {
        setIsModelDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
      const response = await streamChatResponse(
        messages,
        text,
        userId,
        sessionId,
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

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-[#0f0f10] text-gray-900 dark:text-gray-100 font-sans overflow-hidden transition-colors duration-300">


      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authModalMode}
      />

      <ToolsModal
        isOpen={isToolsModalOpen}
        onClose={() => setIsToolsModalOpen(false)}
      />

      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white dark:bg-[#1c1c1e] shadow-md rounded-lg text-gray-700 dark:text-white"
      >
        <Menu className="w-5 h-5" />
      </button>

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

        {/* Top Navigation Bar */}
        <div className="h-16 border-b border-gray-200 dark:border-white/5 flex items-center justify-between px-6 bg-white/80 dark:bg-[#0f0f10]/80 backdrop-blur-md z-30 sticky top-0 transition-colors">
          <div className="flex items-center gap-2">
            {/* Model Selector Dropdown */}
            <div className="relative" ref={modelDropdownRef}>
              <button
                onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#1c1c1e] transition-colors group"
              >
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{currentModel}</span>
                <ChevronDown className={`w-3 h-3 text-gray-500 transition-transform duration-200 ${isModelDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {isModelDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-white dark:bg-[#1c1c1e] border border-gray-200 dark:border-white/10 rounded-xl shadow-xl overflow-hidden z-50 animate-fade-in-up">
                  <div className="py-1">
                    {['Gemini 3 Pro', 'LLaMA', 'Gemini 2.5 Flash', 'DeepSeek'].map((model) => (
                      <button
                        key={model}
                        onClick={() => {
                          setCurrentModel(model);
                          setIsModelDropdownOpen(false);
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 flex items-center justify-between group"
                      >
                        <span>{model}</span>
                        {currentModel === model && <Check className="w-3.5 h-3.5 text-blue-500" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1c1c1e] rounded-lg transition-colors"
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/10 rounded-lg hover:bg-gray-100 dark:hover:bg-[#1c1c1e] transition-colors">
              <Share className="w-3.5 h-3.5" />
              Export
            </button>
            <button className="flex items-center gap-2 px-4 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg hover:opacity-90 transition-opacity">
              Pro
            </button>

            {/* Auth Section - Top Right */}
            {!isAuthenticated ? (
              // Guest User - Show Login/Sign Up buttons
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setAuthModalMode('login');
                    setIsAuthModalOpen(true);
                  }}
                  className="px-4 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  Login
                </button>
                <button
                  onClick={() => {
                    setAuthModalMode('register');
                    setIsAuthModalOpen(true);
                  }}
                  className="px-4 py-1.5 text-sm font-bold text-white bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg hover:opacity-90 transition-opacity"
                >
                  Sign Up
                </button>
              </div>
            ) : (
              // Authenticated User - Show Profile Dropdown
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-xs font-bold shadow-md cursor-pointer hover:opacity-90 transition-opacity ml-1"
                >
                  {useAuth().user?.name ? useAuth().user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U'}
                </button>

                {/* Profile Dropdown */}
                {isProfileOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-[#1c1c1e] border border-gray-200 dark:border-white/10 rounded-xl shadow-xl overflow-hidden z-50 animate-fade-in-up">
                    {/* User Info */}
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-white/5">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {useAuth().user?.name || 'User'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {useAuth().user?.email || ''}
                      </p>
                      {useAuth().user?.auth_provider && (
                        <div className="mt-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300">
                            {useAuth().user.auth_provider === 'google' ? '🔵 Google' : '📧 Email'}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="py-1">
                      <button
                        onClick={() => {
                          setIsToolsModalOpen(true);
                          setIsProfileOpen(false);
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 flex items-center gap-2"
                      >
                        <Blocks className="w-4 h-4" />
                        Tools
                      </button>
                      <button className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 flex items-center gap-2">
                        <Settings className="w-4 h-4" />
                        Settings
                      </button>
                      <div className="h-px bg-gray-100 dark:bg-white/5 my-1" />
                      <button
                        onClick={() => {
                          useAuth().logout();
                          setIsProfileOpen(false);
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 flex items-center gap-2"
                      >
                        <LogOut className="w-4 h-4" />
                        Log out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Scrollable Chat Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar relative">

          {isWelcomeScreen ? (
            <div className="min-h-full flex flex-col items-center justify-center p-4 sm:p-8">
              {/* Header */}
              <div className="text-center mb-12 space-y-4 animate-fade-in-up">
                <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white tracking-tight">
                  Welcome to Rexie.
                </h1>
                <p className="text-gray-600 dark:text-gray-400 max-w-lg mx-auto text-lg font-light">
                  Your intelligent assistant for Gmail, Slack, Calendar, Docs, and more
                </p>
              </div>

              {/* Centered Input Area */}
              <div className="w-full max-w-3xl px-4">
                <InputArea
                  onSend={handleSendMessage}
                  onStop={handleStopGeneration}
                  disabled={isLoading}
                  value={inputValue}
                  isGenerating={isLoading}
                />
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="w-full max-w-3xl p-4 sm:p-6 pb-56 space-y-6">
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
                          <MessageContent content={msg.content} />
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
            </div>
          )}
        </div>

        {/* Bottom Input Area Container - Fixed and Centered - Only show when not on welcome screen */}
        {!isWelcomeScreen && (
          <div className="absolute bottom-0 left-0 right-0 flex justify-center bg-gradient-to-t from-gray-50 via-gray-50 dark:from-[#0f0f10] dark:via-[#0f0f10] to-transparent pt-12 pb-6 px-4 z-20 transition-colors min-h-[180px]">
            <div className="w-full max-w-3xl px-4">
              <InputArea
                onSend={handleSendMessage}
                onStop={handleStopGeneration}
                disabled={isLoading}
                value={inputValue}
                isGenerating={isLoading}
              />
            </div>
          </div>
        )}

      </div>
    </div>
  );
}