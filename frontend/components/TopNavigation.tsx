import React, { useState, useRef, useEffect } from 'react';
import { 
  Share, 
  Sun, 
  Moon, 
  Blocks, 
  LogOut, 
  Settings, 
  ChevronDown, 
  Check,
  Menu
} from 'lucide-react';

interface TopNavigationProps {
  isWelcomeScreen: boolean;
  isDarkMode: boolean;
  toggleTheme: () => void;
  currentModel: string;
  setCurrentModel: (model: string) => void;
  setIsToolsModalOpen: (isOpen: boolean) => void;
  onMobileMenuClick: () => void;
  onOpenSettings: () => void;
  onOpenExport: () => void;
  onOpenLogout: () => void;
  onOpenPro: () => void;
}

export const TopNavigation: React.FC<TopNavigationProps> = ({
  isWelcomeScreen,
  isDarkMode,
  toggleTheme,
  currentModel,
  setCurrentModel,
  setIsToolsModalOpen,
  onMobileMenuClick,
  onOpenSettings,
  onOpenExport,
  onOpenLogout,
  onOpenPro
}) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const modelDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target as Node)) {
        setIsModelDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="h-16 border-b border-gray-200 dark:border-white/5 flex items-center justify-between px-6 bg-white/80 dark:bg-[#0f0f10]/80 backdrop-blur-md z-30 sticky top-0 transition-colors">
      <div className="flex items-center gap-2">
         {/* Mobile Menu Trigger - Visible on mobile */}
         <button 
            onClick={onMobileMenuClick}
            className="md:hidden mr-2 p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-[#1c1c1e] rounded-lg"
          >
            <Menu className="w-5 h-5" />
          </button>

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

        <button 
          onClick={onOpenExport}
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/10 rounded-lg hover:bg-gray-100 dark:hover:bg-[#1c1c1e] transition-colors"
        >
          <Share className="w-3.5 h-3.5" />
          Export
        </button>
        <button 
          onClick={onOpenPro}
          className="flex items-center gap-2 px-4 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg hover:opacity-90 transition-opacity"
        >
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
                <button 
                  onClick={() => {
                    onOpenSettings();
                    setIsProfileOpen(false);
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 flex items-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
                <div className="h-px bg-gray-100 dark:bg-white/5 my-1" />
                <button 
                  onClick={() => {
                    onOpenLogout();
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
      </div>
    </div>
  );
};