import React from 'react';
import { X, Sparkles, Bot, Zap, ArrowRight } from 'lucide-react';

interface AgentsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const AgentsModal: React.FC<AgentsModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div
                className="relative w-full max-w-lg bg-white dark:bg-[#1c1c1e] rounded-3xl shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden transform transition-all animate-scale-in"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Decorative background gradients */}
                <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-br from-purple-600/20 via-blue-600/20 to-transparent pointer-events-none" />
                <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-full bg-black/5 dark:bg-white/10 text-gray-500 dark:text-gray-400 hover:bg-black/10 dark:hover:bg-white/20 transition-colors z-10"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="relative p-8 pt-12 flex flex-col items-center text-center">

                    {/* Icon Badge */}
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-600 p-[2px] mb-6 shadow-xl rotate-3 hover:rotate-0 transition-transform duration-500">
                        <div className="w-full h-full bg-white dark:bg-[#1c1c1e] rounded-2xl flex items-center justify-center">
                            <Bot className="w-10 h-10 text-transparent bg-clip-text bg-gradient-to-br from-purple-500 to-blue-600 fill-current" />
                        </div>
                    </div>

                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3 tracking-tight">
                        Rexie Agents
                        <span className="ml-2 text-sm font-medium py-1 px-2.5 bg-gradient-to-r from-purple-500/10 to-blue-500/10 text-purple-600 dark:text-purple-400 rounded-full border border-purple-500/20">
                            Coming Soon
                        </span>
                    </h2>

                    <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-sm leading-relaxed">
                        Build, train, and deploy custom AI agents that work for you 24/7. Automate workflows with intelligent workers.
                    </p>

                    <div className="grid grid-cols-2 gap-4 w-full mb-8">
                        <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 text-left group hover:border-blue-500/30 transition-colors">
                            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">Custom Skills</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Teach agents specific tasks</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 text-left group hover:border-purple-500/30 transition-colors">
                            <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                <Zap className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                            </div>
                            <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">Auto-Execute</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Run actions autonomously</p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="w-full py-3.5 bg-gray-900 dark:bg-white text-white dark:text-black font-semibold rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2"
                    >
                        Notify Me When It Launches
                        <ArrowRight className="w-4 h-4" />
                    </button>

                </div>
            </div>
        </div>
    );
};
