import React, { useState, useRef, useEffect } from 'react';
import { Plus, ArrowUp, Square, Mic, Paperclip, Image as ImageIcon } from 'lucide-react';

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
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const attachMenuRef = useRef<HTMLDivElement>(null);

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

  // Close attach menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (attachMenuRef.current && !attachMenuRef.current.contains(event.target as Node)) {
        setShowAttachMenu(false);
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
    setShowAttachMenu(false);
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

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  return (
    <div className="w-full relative">

      {/* Attach Menu Popup */}
      {showAttachMenu && (
        <div ref={attachMenuRef} className="absolute bottom-full left-0 mb-2 w-56 bg-white dark:bg-[#2c2c2e] border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-fade-in-up">
          <div className="p-1">
            <button className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors flex items-center gap-3">
              <Paperclip className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span>Attach file</span>
            </button>
            <button className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors flex items-center gap-3">
              <ImageIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span>Upload image</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Input Container */}
      <div className="relative bg-white dark:bg-[#2c2c2e] rounded-3xl border border-gray-200 dark:border-white/10 focus-within:border-gray-300 dark:focus-within:border-white/20 transition-all shadow-sm hover:shadow-md">

        {/* Left Side - Plus Button */}
        <div className="absolute left-4 bottom-4 z-10">
          <button
            onClick={() => setShowAttachMenu(!showAttachMenu)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors group"
            title="Attach files"
          >
            <Plus className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors" />
          </button>
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message Rexie..."
          className="w-full bg-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-[15px] py-4 pr-32 pl-14 rounded-3xl resize-none focus:outline-none min-h-[56px] max-h-[200px] overflow-y-auto custom-scrollbar leading-relaxed"
          rows={1}
          disabled={disabled && !isGenerating}
        />

        {/* Right Side - Action Buttons */}
        <div className="absolute right-3 bottom-3 flex items-center gap-1">
          {/* Voice Button */}
          <button
            className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            title="Voice input"
          >
            <Mic className="w-5 h-5" />
          </button>

          {/* Send / Stop Button */}
          <button
            onClick={isGenerating ? handleStop : () => handleSubmit()}
            disabled={(!input.trim() && !isGenerating) || (disabled && !isGenerating)}
            className={`
              p-2.5 rounded-lg transition-all duration-200
              ${(input.trim() || isGenerating) && !(disabled && !isGenerating)
                ? 'bg-gray-900 dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-100 shadow-sm'
                : 'bg-gray-200 dark:bg-[#3a3a3c] text-gray-400 dark:text-gray-600 cursor-not-allowed'}
            `}
            title={isGenerating ? "Stop generating" : "Send message"}
          >
            {isGenerating ? (
              <Square className="w-4 h-4 fill-current" />
            ) : (
              <ArrowUp className="w-4 h-4 stroke-[2.5]" />
            )}
          </button>
        </div>
      </div>

      {/* Footer Text */}
      <div className="text-center mt-2.5">
        <p className="text-[11px] text-gray-400 dark:text-gray-600 font-light">
          Rexie can make mistakes. Consider checking important information.
        </p>
      </div>
    </div>
  );
};