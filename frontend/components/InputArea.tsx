import React, { useState, useRef, useEffect } from 'react';
import { Paperclip, ArrowUp, Sparkles, Command, Bot, Zap, Star, Square, Mic } from 'lucide-react';
import { INITIAL_SUGGESTIONS } from '../constants.tsx';

interface InputAreaProps {
  onSend: (message: string) => void;
  onStop?: () => void;
  disabled?: boolean;
  isExpanded?: boolean;
  value?: string;
  isGenerating?: boolean;
}

export const InputArea: React.FC<InputAreaProps> = ({ onSend, onStop, disabled, isExpanded = true, value, isGenerating }) => {
  const [input, setInput] = useState('');
  const [showPrompts, setShowPrompts] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const promptMenuRef = useRef<HTMLDivElement>(null);

  // Allow external control of input value (for sidebar clicks)
  useEffect(() => {
    if (value) {
      setInput(value);
      // Auto-focus when value is set from outside
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  }, [value]);

  // Close prompts menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (promptMenuRef.current && !promptMenuRef.current.contains(event.target as Node)) {
        setShowPrompts(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || disabled) return;
    onSend(input);
    setInput('');
    setShowPrompts(false);
  };

  const handleStop = (e?: React.MouseEvent) => {
    e?.preventDefault();
    if (onStop) {
      onStop();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handlePromptClick = (prompt: string) => {
    setInput(prompt);
    setShowPrompts(false);
    if (textareaRef.current) {
        textareaRef.current.focus();
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [input]);

  return (
    <div className="w-full max-w-4xl mx-auto relative">
      
      {/* Prompt Menu Popup */}
      {showPrompts && (
        <div ref={promptMenuRef} className="absolute bottom-full left-0 mb-3 w-72 bg-white dark:bg-[#1c1c1e] border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-fade-in-up">
           <div className="px-4 py-3 border-b border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5 flex items-center justify-between">
             <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Quick Prompts</span>
             <Zap className="w-3 h-3 text-blue-500 dark:text-blue-400" />
           </div>
           <div className="max-h-64 overflow-y-auto custom-scrollbar p-1">
             {INITIAL_SUGGESTIONS.map((suggestion, idx) => (
               <button
                 key={idx}
                 onClick={() => handlePromptClick(suggestion)}
                 className="w-full text-left px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-blue-600 dark:hover:text-white rounded-lg transition-colors truncate flex items-center gap-2"
               >
                 <span className="w-1.5 h-1.5 rounded-full bg-blue-500/50 flex-shrink-0"></span>
                 <span className="truncate">{suggestion}</span>
               </button>
             ))}
           </div>
        </div>
      )}

      <div className="relative bg-white dark:bg-[#1c1c1e] rounded-2xl border border-gray-200 dark:border-white/10 focus-within:border-blue-400 dark:focus-within:border-white/20 transition-all shadow-xl shadow-black/5 dark:shadow-black/20">
        
        {/* Robot / Prompts Button */}
        <div className="absolute left-3 top-3 z-10">
           <button 
             onClick={() => setShowPrompts(!showPrompts)}
             className="relative p-2 bg-blue-50 dark:bg-[#2c2c2e]/50 hover:bg-blue-100 dark:hover:bg-[#3a3a3c] rounded-lg transition-colors group overflow-visible"
             title="Open AI prompts"
           >
             <Bot className={`w-5 h-5 text-blue-500 dark:text-blue-400 group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-transform duration-300 ${showPrompts ? 'scale-110' : ''}`} />
             
             {/* Animated Thinking Dots */}
             {!showPrompts && (
               <div className="absolute -top-0.5 -right-0.5 flex space-x-[1px] bg-white dark:bg-[#1c1c1e] rounded-full px-1 py-0.5 border border-blue-100 dark:border-blue-500/30">
                  <div className="w-1 h-1 bg-blue-500 dark:bg-blue-400 rounded-full animate-bounce" style={{ animationDuration: '1s', animationDelay: '0s' }}></div>
                  <div className="w-1 h-1 bg-blue-500 dark:bg-blue-400 rounded-full animate-bounce" style={{ animationDuration: '1s', animationDelay: '0.2s' }}></div>
                  <div className="w-1 h-1 bg-blue-500 dark:bg-blue-400 rounded-full animate-bounce" style={{ animationDuration: '1s', animationDelay: '0.4s' }}></div>
               </div>
             )}

             {/* Magical Floating Particles - Decoration */}
             {!showPrompts && (
               <>
                 <Sparkles className="absolute -top-2 -left-2 w-3 h-3 text-yellow-400 animate-pulse opacity-0 group-hover:opacity-100 transition-opacity duration-700 delay-75" style={{ animationDuration: '2s' }} />
                 <Star className="absolute -bottom-1 -right-2 w-2.5 h-2.5 text-blue-400 animate-float opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
               </>
             )}
           </button>
        </div>

        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask Rexie anything..."
          className="w-full bg-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-base py-4 pr-12 pl-14 rounded-2xl resize-none focus:outline-none min-h-[56px] max-h-[150px] overflow-y-auto scrollbar-hide"
          rows={1}
          disabled={disabled && !isGenerating}
        />
        
        {/* Send / Stop Button */}
        <button
          onClick={isGenerating ? handleStop : () => handleSubmit()}
          disabled={(!input.trim() && !isGenerating) || (disabled && !isGenerating)}
          className={`
            absolute right-3 top-3 p-1.5 rounded-lg transition-all duration-200
            ${(input.trim() || isGenerating) && !(disabled && !isGenerating)
              ? 'bg-blue-600 dark:bg-white text-white dark:text-black hover:bg-blue-700 dark:hover:bg-gray-200 shadow-md' 
              : 'bg-gray-200 dark:bg-[#2c2c2e] text-gray-400 dark:text-gray-500 cursor-not-allowed'}
          `}
        >
          {isGenerating ? (
            <Square className="w-4 h-4 fill-current" />
          ) : (
            <ArrowUp className="w-4 h-4" />
          )}
        </button>

        {/* Footer Actions inside Input */}
        <div className="flex items-center justify-between px-3 pb-3 pt-1 ml-11">
          <div className="flex items-center gap-1">
             {/* Spacer */}
          </div>

          <div className="flex items-center gap-1">
             <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2c2c2e] text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors" title="Attach">
                <Paperclip className="w-4 h-4" />
             </button>
             <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2c2c2e] text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors" title="Voice">
                <Mic className="w-4 h-4" />
             </button>
          </div>
        </div>
      </div>
      
      <div className="text-center mt-3">
        <p className="text-[10px] text-gray-400 dark:text-gray-600">
          Rexie can make mistakes. Consider checking important information.
        </p>
      </div>
    </div>
  );
};