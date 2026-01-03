import React, { useState, useRef, useEffect } from 'react';
import { Sidebar } from './components/Sidebar.tsx';
import { InputArea } from './components/InputArea.tsx';
import { ToolsModal } from './components/ToolsModal.tsx';
import { MessageContent } from './components/MessageContent.tsx';
import { ConversationHistory } from './components/ConversationHistory.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { AgentsModal } from './components/AgentsModal.tsx';

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
import { useAuth } from './contexts/AuthContext.tsx';
import { Message, ModelType } from './types.ts';
import toast from 'react-hot-toast';
import { logger } from './utils/logger';

export default function App() {
  const { isAuthenticated, user } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeNav, setActiveNav] = useState('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isWelcomeScreen, setIsWelcomeScreen] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isToolsModalOpen, setIsToolsModalOpen] = useState(false);
  const [isAgentsModalOpen, setIsAgentsModalOpen] = useState(false);
  const [currentModel, setCurrentModel] = useState('Gemini 3 Pro');
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // FIX: Use real authenticated user ID instead of random
  const userId = user?.user_id || 'anonymous';

  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [conversationTitle, setConversationTitle] = useState<string | null>(null);

  // Auth modal state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [searchTerm, setSearchTerm] = useState('');

  // Trigger to refresh conversation list
  const [conversationRefreshTrigger, setConversationRefreshTrigger] = useState(0);

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
          const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
          const response = await fetch(`${apiUrl}/auth/me`, {
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
        logger.log("🆕 Creating new conversation", { userId });

        const newSessionId = 'sess_' + Math.random().toString(36).substr(2, 9);
        setSessionId(newSessionId);

        const conversation = await createConversation(userId, newSessionId, text);
        setCurrentConversationId(conversation.conversation_id);
        setConversationTitle(conversation.title || null);

        logger.success("✅ CONVERSATION CREATED", {
          conversationId: conversation.conversation_id,
          title: conversation.title
        });

        // Trigger conversation list refresh
        setConversationRefreshTrigger(prev => prev + 1);
      } catch (error) {
        logger.error("❌ CONVERSATION CREATE FAILED", error);
        // Continue anyway - chat can work without persistence
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
      logger.log("🔵 Streaming AI response", { conversationId: currentConversationId });

      const response = await streamChatResponse(
        messages,
        text,
        userId,
        sessionId,
        currentConversationId,  // NEW: Pass conversation_id for message persistence
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

      // Refresh conversation list to update message count and timestamp
      setConversationRefreshTrigger(prev => prev + 1);

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
    logger.log("🔵 LOAD CONVERSATION", { conversationId });

    try {
      const { messages: convMessages } = await getConversationMessages(conversationId);

      logger.log("📥 MESSAGES LOADED", { count: convMessages.length });

      // Convert to Message format
      const formattedMessages: Message[] = convMessages.map((msg: any) => ({
        id: msg.message_id,  // FIX: Use message_id from database
        role: msg.role === 'assistant' ? 'model' : msg.role as 'user' | 'model',
        content: msg.content,
        timestamp: new Date(msg.timestamp)
      }));

      setMessages(formattedMessages);
      setCurrentConversationId(conversationId);
      setIsWelcomeScreen(false);

      // Close sidebar on mobile
      if (window.innerWidth < 768) setIsSidebarOpen(false);

      logger.success("✅ CONVERSATION LOADED", { messageCount: formattedMessages.length });
    } catch (error) {
      logger.error("❌ LOAD CONVERSATION FAILED", { conversationId, error });
      toast.error("Failed to load conversation");
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

      <AgentsModal
        isOpen={isAgentsModalOpen}
        onClose={() => setIsAgentsModalOpen(false)}
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
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
      >
        {activeNav === 'chat' && (
          <ConversationHistory
            userId={userId}
            currentConversationId={currentConversationId || undefined}
            onSelectConversation={handleSelectConversation}
            onNewConversation={handleNewChat}
            searchTerm={searchTerm}
            refreshTrigger={conversationRefreshTrigger}
          />
        )}

      </Sidebar>

      {/* Main Content */}
      <div className={`flex-1 flex flex-col h-full transition-all duration-300 ${isSidebarOpen ? 'md:ml-72' : 'md:ml-0'}`}>

        {/* Top Navigation Bar */}
        <div className="h-16 border-b border-gray-200 dark:border-white/5 flex items-center justify-between px-6 bg-white/80 dark:bg-[#0f0f10]/80 backdrop-blur-md z-30 sticky top-0 transition-colors">
          <div className="flex items-center gap-2">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="md:hidden p-2 -ml-2 mr-2 text-gray-700 dark:text-gray-300"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Model Selector Dropdown */}
            <div className="relative" ref={modelDropdownRef}>
              <button
                onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#1c1c1e] transition-colors group"
              >
                <span className="text-lg font-semibold text-gray-900 dark:text-white">{currentModel}</span>
                <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isModelDropdownOpen ? 'rotate-180' : ''}`} />
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

          <div className="flex items-center gap-2 sm:gap-3">
            {/* New Tools Button on Navbar */}
            <button
              onClick={() => setIsToolsModalOpen(true)}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1c1c1e] rounded-lg transition-colors border border-transparent hover:border-gray-200 dark:hover:border-white/10"
              title="Tools"
            >
              <Blocks className="w-4 h-4" />
              <span className="hidden md:inline">Tools</span>
            </button>

            {/* Agents Button - Future Feature */}
            <button
              onClick={() => setIsAgentsModalOpen(true)}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1c1c1e] rounded-lg transition-colors border border-transparent hover:border-gray-200 dark:hover:border-white/10"
              title="Build Agents"
            >
              <Blocks className="w-4 h-4" /> {/* Using Blocks as placeholder for Agent icon if generic, or Bot icon */}
              <span className="hidden md:inline">Agents</span>
            </button>

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

            {/* Auth Section */}
            {!isAuthenticated ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setAuthModalMode('login');
                    setIsAuthModalOpen(true);
                  }}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  Log in
                </button>
                <button
                  onClick={() => {
                    setAuthModalMode('register');
                    setIsAuthModalOpen(true);
                  }}
                  className="px-3 py-1.5 text-sm font-bold text-white bg-black dark:bg-white dark:text-black rounded-lg hover:opacity-90 transition-opacity"
                >
                  Sign up
                </button>
              </div>
            ) : (
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-xs font-bold shadow-md cursor-pointer hover:opacity-90 transition-opacity ml-1"
                >
                  {useAuth().user?.name ? useAuth().user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U'}
                </button>

                {isProfileOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-[#1c1c1e] border border-gray-200 dark:border-white/10 rounded-xl shadow-xl overflow-hidden z-50 animate-fade-in-up">
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-white/5">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {useAuth().user?.name || 'User'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {useAuth().user?.email || ''}
                      </p>
                    </div>

                    <div className="py-1">
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

        {/* Chat Content Area - Responsive Flex Column */}
        <div className="flex-1 overflow-hidden relative flex flex-col">
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 scroll-smooth">
            {isWelcomeScreen ? (
              <div className="h-full flex flex-col items-center justify-center -mt-10">
                <div className="bg-white dark:bg-[#1c1c1e] p-4 rounded-full shadow-sm mb-6">
                  <Zap className="w-8 h-8 text-black dark:text-white" />
                </div>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-8">
                  How can I help you today?
                </h2>
              </div>
            ) : (
              <div className="w-full max-w-3xl mx-auto space-y-6">
                {messages.map((msg, idx) => (
                  <div
                    key={msg.id}
                    className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'model' && (
                      <div className="w-8 h-8 rounded-full border border-gray-200 dark:border-white/10 bg-white dark:bg-transparent flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Zap className="w-5 h-5 text-black dark:text-white" />
                      </div>
                    )}

                    <div className={`
                    max-w-[85%] sm:max-w-[75%]
                    ${msg.role === 'user'
                        ? 'bg-gray-100 dark:bg-[#2c2c2e] text-gray-900 dark:text-white px-5 py-3 rounded-[20px] rounded-tr-sm'
                        : 'text-gray-900 dark:text-white px-0 py-1' // AI messages have no bubble bg, like ChatGPT
                      }
                  `}>
                      {msg.role === 'user' ? (
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      ) : (
                        <div className="prose prose-sm max-w-none dark:prose-invert leading-relaxed">
                          <MessageContent content={msg.content} />
                        </div>
                      )}

                      {msg.isError && (
                        <div className="mt-2 text-xs text-red-500 bg-red-50 dark:bg-red-500/10 p-2 rounded">
                          Message sent failed. Please try again.
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {isLoading && messages[messages.length - 1]?.role === 'user' && (
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full border border-gray-200 dark:border-white/10 bg-white dark:bg-transparent flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Zap className="w-5 h-5 text-black dark:text-white animate-pulse" />
                    </div>
                    <div className="flex items-center gap-1 mt-3">
                      <div className="w-2 h-2 bg-gray-400 dark:bg-gray-600 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 dark:bg-gray-600 rounded-full animate-bounce delay-75"></div>
                      <div className="w-2 h-2 bg-gray-400 dark:bg-gray-600 rounded-full animate-bounce delay-150"></div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} className="h-4" />
              </div>
            )}
          </div>

          {/* Persistent Input Area at Bottom */}
          <div className="w-full bg-white dark:bg-[#0f0f10] border-t border-transparent dark:border-white/5 p-4 pb-6">
            <div className="max-w-3xl mx-auto">
              {/* Only show "Login first" warning if trying to type? optional, handled in handleSendMessage */}
              <InputArea
                onSend={(text) => {
                  if (!isAuthenticated) {
                    toast.error("Please log in to chat", { id: 'login-required', icon: '🔒' });
                    setAuthModalMode('login');
                    setIsAuthModalOpen(true);
                    return;
                  }
                  handleSendMessage(text);
                }}
                onStop={handleStopGeneration}
                disabled={isLoading}
                value={inputValue}
                isGenerating={isLoading}
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}