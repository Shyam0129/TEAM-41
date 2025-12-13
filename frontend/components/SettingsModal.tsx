import React from 'react';
import { X, Moon, Sun, Monitor, Type, Globe } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, isDarkMode, toggleTheme }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl w-full max-w-lg shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden transform transition-all scale-100">
        <div className="p-5 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Settings</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Appearance Section */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Appearance</h3>
            <div className="bg-gray-50 dark:bg-[#161618] rounded-xl p-4 border border-gray-100 dark:border-white/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white dark:bg-white/10 rounded-lg shadow-sm">
                    {isDarkMode ? <Moon className="w-4 h-4 text-purple-400" /> : <Sun className="w-4 h-4 text-orange-400" />}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">Dark Mode</div>
                    <div className="text-xs text-gray-500">Adjust the interface theme</div>
                  </div>
                </div>
                <button 
                  onClick={toggleTheme}
                  className={`
                    relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                    ${isDarkMode ? 'bg-blue-600' : 'bg-gray-200'}
                  `}
                >
                  <span className={`
                    inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                    ${isDarkMode ? 'translate-x-6' : 'translate-x-1'}
                  `} />
                </button>
              </div>
            </div>
          </div>

          {/* Preferences Section */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Preferences</h3>
            <div className="space-y-2">
              <button className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-[#161618] transition-colors group">
                <div className="flex items-center gap-3">
                   <Type className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                   <span className="text-sm text-gray-700 dark:text-gray-300">Font Size</span>
                </div>
                <span className="text-xs text-gray-400">Medium</span>
              </button>
              <button className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-[#161618] transition-colors group">
                <div className="flex items-center gap-3">
                   <Globe className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                   <span className="text-sm text-gray-700 dark:text-gray-300">Language</span>
                </div>
                <span className="text-xs text-gray-400">English (US)</span>
              </button>
              <button className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-[#161618] transition-colors group">
                <div className="flex items-center gap-3">
                   <Monitor className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                   <span className="text-sm text-gray-700 dark:text-gray-300">System Instructions</span>
                </div>
                <span className="text-xs text-gray-400">Default</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};