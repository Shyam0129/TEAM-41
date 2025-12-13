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
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const modelDropdownRef = useRef<HTMLDivElement>(null);
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

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-[#0f0f10] text-gray-900 dark:text-gray-100 font-sans overflow-hidden transition-colors duration-300">
      
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
      />

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
            
            {/* User Profile - Top Right with Dropdown */}
            <div className="relative" ref={profileRef}>
              <button 
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-xs font-bold shadow-md cursor-pointer hover:opacity-90 transition-opacity ml-1"
              >
                JD
              </button>

              {/* Profile Dropdown */}
              {isProfileOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-[#1c1c1e] border border-gray-200 dark:border-white/10 rounded-xl shadow-xl overflow-hidden z-50 animate-fade-in-up">
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
                    <button className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 flex items-center gap-2">
                      <LogOut className="w-4 h-4" />
                      Log out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

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