import React from 'react';
import { Zap, Pencil, RotateCcw } from 'lucide-react';
import { Message } from '../types.ts';

interface ChatMessagesProps {
  messages: Message[];
  isLoading: boolean;
  onEdit: (text: string) => void;
  onRetry: (text: string) => void;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

export const ChatMessages: React.FC<ChatMessagesProps> = ({ 
  messages, 
  isLoading, 
  onEdit, 
  onRetry,
  messagesEndRef 
}) => {
  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 pb-40 space-y-6">
      {messages.map((msg) => (
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
                     onClick={() => onEdit(msg.content)} 
                     className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 transition-all"
                     title="Edit"
                   >
                      <Pencil className="w-3.5 h-3.5" />
                   </button>
                   <button 
                     onClick={() => onRetry(msg.content)} 
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
  );
};