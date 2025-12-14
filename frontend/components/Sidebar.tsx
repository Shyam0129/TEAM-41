import React from 'react';
import {
  Search,
  Home,
  MessageSquare,
  BookOpen,
  Zap,
  Plus,
  MoreVertical,
  ChevronDown,
  LogOut,
  User,
  Settings,
  Command
} from 'lucide-react';
import { SIDEBAR_NAVIGATION } from '../constants.tsx';

interface SidebarProps {
  isOpen: boolean;
  activeNav: string;
  setActiveNav: (id: string) => void;
  onNewChat: () => void;
  onPromptSelect?: (prompt: string) => void;
  children?: React.ReactNode;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, activeNav, setActiveNav, onNewChat, onPromptSelect, children }) => {
  return (
    <div className={`
      fixed inset-y-0 left-0 z-40 w-72 bg-gray-50 dark:bg-[#0f0f10] text-gray-600 dark:text-gray-300 transform transition-transform duration-300 ease-in-out border-r border-gray-200 dark:border-white/5
      ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 flex flex-col
    `}>
      {/* Header / Model Selector */}
      <div className="p-4">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-between bg-white dark:bg-[#1c1c1e] hover:bg-gray-100 dark:hover:bg-[#2c2c2e] text-gray-900 dark:text-white p-2.5 rounded-lg transition-colors border border-gray-200 dark:border-white/10 group shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
              <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="text-left">
              <div className="text-sm font-semibold">Rexie</div>
              <div className="text-xs text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-400">Intelligent Assistant</div>
            </div>
          </div>
          <Plus className="w-4 h-4 text-gray-400 group-hover:text-gray-900 dark:text-gray-500 dark:group-hover:text-white" />
        </button>
      </div>

      {/* Search */}
      <div className="px-4 mb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Search chats..."
            className="w-full bg-white dark:bg-[#1c1c1e] text-sm text-gray-900 dark:text-gray-200 rounded-lg pl-9 pr-8 py-2 border border-gray-200 dark:border-transparent focus:border-blue-400 dark:focus:border-white/20 focus:outline-none placeholder-gray-400 dark:placeholder-gray-600 shadow-sm"
          />
        </div>
      </div>

      {/* Main Navigation */}
      <div className="px-2 py-2">
        {SIDEBAR_NAVIGATION.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveNav(item.id)}
            className={`
              w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm mb-1 transition-colors
              ${activeNav === item.id
                ? 'bg-gray-200 dark:bg-[#2c2c2e] text-gray-900 dark:text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1c1c1e] hover:text-gray-900 dark:hover:text-gray-200'}
            `}
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </button>
        ))}
      </div>

      {/* Scrollable Content - Children or Empty */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {children || (
          <div className="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-600">
            No conversations yet
          </div>
        )}
      </div>
    </div>
  );
};