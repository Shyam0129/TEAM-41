import React from 'react';
import { X, FileText, Code, Download } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl w-full max-w-md shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden transform transition-all scale-100">
        <div className="p-5 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Export Conversation</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        <div className="p-6 grid gap-3">
          <button className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-[#2c2c2e] hover:border-blue-200 dark:hover:border-blue-500/30 transition-all group text-left">
            <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <FileText className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">Markdown</h3>
              <p className="text-xs text-gray-500">Best for note-taking apps</p>
            </div>
            <Download className="w-4 h-4 text-gray-400 ml-auto" />
          </button>

          <button className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-[#2c2c2e] hover:border-purple-200 dark:hover:border-purple-500/30 transition-all group text-left">
            <div className="w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Code className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">JSON</h3>
              <p className="text-xs text-gray-500">Raw data structure</p>
            </div>
            <Download className="w-4 h-4 text-gray-400 ml-auto" />
          </button>
        </div>
      </div>
    </div>
  );
};