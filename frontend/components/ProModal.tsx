import React from 'react';
import { X, Check, Zap, Sparkles } from 'lucide-react';

interface ProModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProModal: React.FC<ProModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl w-full max-w-3xl shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden flex flex-col md:flex-row relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 rounded-full z-10 transition-colors">
            <X className="w-5 h-5 text-gray-700 dark:text-white" />
        </button>

        {/* Left Side: Visual/Marketing */}
        <div className="md:w-1/2 bg-gradient-to-br from-indigo-600 to-purple-700 p-8 flex flex-col justify-between text-white relative overflow-hidden">
          <div className="relative z-10">
             <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-xs font-semibold backdrop-blur-sm mb-6 border border-white/10">
                <Sparkles className="w-3 h-3" />
                Upgrade to Pro
             </div>
             <h2 className="text-3xl font-bold mb-4 leading-tight">Unlock the full power of Rexie.</h2>
             <p className="text-indigo-100 opacity-90">Get access to our most advanced models, unlimited generation, and priority support.</p>
          </div>
          
          <div className="relative z-10 mt-8">
            <div className="text-5xl font-bold mb-1">$20<span className="text-lg font-normal opacity-70">/mo</span></div>
            <div className="text-sm opacity-70">Billed monthly</div>
          </div>

          {/* Decorative shapes */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/30 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl" />
        </div>

        {/* Right Side: Features */}
        <div className="md:w-1/2 p-8 bg-white dark:bg-[#1c1c1e] flex flex-col justify-center">
           <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Everything in Free, plus:</h3>
           
           <ul className="space-y-4 mb-8">
             {[
               'Access to Gemini 1.5 Pro & Ultra',
               'Unlimited file uploads & analysis',
               'Faster response times',
               'Early access to new features',
               'Priority customer support'
             ].map((feature, idx) => (
               <li key={idx} className="flex items-center gap-3">
                 <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-500/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-green-600 dark:text-green-400" />
                 </div>
                 <span className="text-sm text-gray-700 dark:text-gray-300">{feature}</span>
               </li>
             ))}
           </ul>

           <button className="w-full py-3 px-4 bg-gray-900 dark:bg-white text-white dark:text-black font-semibold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg">
             <Zap className="w-4 h-4 fill-current" />
             Upgrade Now
           </button>
           <div className="mt-4 text-center">
             <button onClick={onClose} className="text-xs text-gray-500 hover:text-gray-900 dark:hover:text-gray-300">Maybe later</button>
           </div>
        </div>
      </div>
    </div>
  );
};