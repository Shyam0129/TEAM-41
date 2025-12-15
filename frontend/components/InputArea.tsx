import React, { useState, useRef, useEffect } from 'react';
import { Plus, ArrowUp, Square, Mic, Mail, MessageSquare, Calendar, FileText, Smartphone, X } from 'lucide-react';

interface InputAreaProps {
  onSend: (message: string) => void;
  onStop?: () => void;
  disabled?: boolean;
  isExpanded?: boolean;
  value?: string;
  isGenerating?: boolean;
}

const AVAILABLE_TOOLS = [
  { id: 'gmail', name: 'Gmail', icon: Mail, description: 'Send emails', color: 'text-red-500' },
  { id: 'slack', name: 'Slack', icon: MessageSquare, description: 'Send Slack messages', color: 'text-purple-500' },
  { id: 'calendar', name: 'Calendar', icon: Calendar, description: 'Manage calendar events', color: 'text-blue-500' },
  { id: 'docs', name: 'Docs', icon: FileText, description: 'Create documents', color: 'text-blue-600' },
  { id: 'sms', name: 'SMS', icon: Smartphone, description: 'Send text messages', color: 'text-green-500' },
];

export const InputArea: React.FC<InputAreaProps> = ({ onSend, onStop, disabled, isExpanded = true, value, isGenerating }) => {
  const [input, setInput] = useState('');
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const toolsMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      setInput(value);
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(event.target as Node)) {
        setShowToolsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || disabled) return;

    const messageWithTool = selectedTool
      ? `[Using ${AVAILABLE_TOOLS.find(t => t.id === selectedTool)?.name}] ${input}`
      : input;

    onSend(messageWithTool);
    setInput('');
    setSelectedTool(null);
    setShowToolsMenu(false);
  };

  const handleStop = (e?: React.MouseEvent) => {
    e?.preventDefault();
    if (onStop) onStop();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleToolSelect = (toolId: string) => {
    setSelectedTool(toolId);
    setShowToolsMenu(false);
    if (textareaRef.current) textareaRef.current.focus();
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const selectedToolInfo = selectedTool ? AVAILABLE_TOOLS.find(t => t.id === selectedTool) : null;

  return (
    <div className="w-full relative">

      {/* Tools Menu Popup */}
      {showToolsMenu && (
        <div ref={toolsMenuRef} className="absolute bottom-full left-0 mb-2 w-64 bg-white dark:bg-[#2c2c2e] border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-fade-in-up">
          <div className="p-2">
            <div className="px-3 py-2 border-b border-gray-200 dark:border-white/10">
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Select a tool</p>
            </div>
            <div className="mt-1 space-y-0.5">
              {AVAILABLE_TOOLS.map((tool) => {
                const Icon = tool.icon;
                return (
                  <button
                    key={tool.id}
                    onClick={() => handleToolSelect(tool.id)}
                    className="w-full text-left px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors flex items-center gap-3"
                  >
                    <Icon className={`w-4 h-4 ${tool.color}`} />
                    <div className="flex-1">
                      <div className="font-medium">{tool.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-500">{tool.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main Input Container */}
      <div className="relative bg-white dark:bg-[#2c2c2e] rounded-3xl border border-gray-200 dark:border-white/10 focus-within:border-gray-300 dark:focus-within:border-white/20 transition-all shadow-sm hover:shadow-md">

        {/* Selected Tool Badge */}
        {selectedToolInfo && (
          <div className="absolute left-14 top-3 z-10">
            <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-white/5 px-2.5 py-1 rounded-full">
              <selectedToolInfo.icon className={`w-3.5 h-3.5 ${selectedToolInfo.color}`} />
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{selectedToolInfo.name}</span>
              <button
                onClick={() => setSelectedTool(null)}
                className="ml-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full p-0.5"
              >
                <X className="w-3 h-3 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
          </div>
        )}

        {/* Left Side - Plus Button */}
        <div className={`absolute left-4 z-10 ${selectedToolInfo ? 'top-14' : 'bottom-4'}`}>
          <button
            onClick={() => setShowToolsMenu(!showToolsMenu)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors group"
            title="Select tool"
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
          className={`w-full bg-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-[15px] py-4 pr-32 pl-14 rounded-3xl resize-none focus:outline-none min-h-[56px] max-h-[200px] overflow-y-auto custom-scrollbar leading-relaxed ${selectedToolInfo ? 'pt-12' : ''}`}
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