
import React from 'react';
import { motion } from 'motion/react';
import { ShieldCheck } from 'lucide-react';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  isAdmin?: boolean;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle, isAdmin }) => {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#020617] relative overflow-hidden">
      {/* Dynamic Background Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -left-20 w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[120px] animate-float" />
        <div className="absolute -bottom-20 -right-20 w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] animate-float" style={{ animationDelay: '-5s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/10 rounded-full blur-[150px]" />
      </div>
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-lg relative z-10"
      >
        <div className="glass-card p-12 rounded-[4rem] border-none shadow-2xl premium-shadow relative overflow-hidden group">
          {/* Internal Glow */}
          <div className="absolute top-0 right-0 w-64 h-64 vibrant-gradient opacity-10 blur-[100px] -mr-32 -mt-32 transition-opacity group-hover:opacity-20" />
          
          <div className="flex flex-col items-center mb-12 relative z-10">
            <div className="relative mb-10">
              <div className="w-24 h-24 vibrant-gradient rounded-[2rem] flex items-center justify-center shadow-2xl shadow-indigo-500/40 rotate-12 glow-indigo animate-float relative z-10 overflow-hidden group/icon">
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/icon:translate-y-0 transition-transform duration-500" />
                <ShieldCheck className="text-white w-14 h-14 relative z-10" />
              </div>
              {/* Decorative Rings */}
              <div className="absolute inset-0 -m-3 border-2 border-indigo-500/20 rounded-[2.5rem] animate-spin-slow" />
              <div className="absolute inset-0 -m-6 border border-purple-500/10 rounded-[3rem] animate-reverse-spin" />
            </div>

            <h1 className="text-5xl font-black text-center text-white tracking-tighter mb-4 uppercase">
              {title.split(' ').map((word, i) => (
                <span key={i} className={i === 0 ? "text-white" : "text-indigo-500"}>{word} </span>
              ))}
            </h1>
            <p className="text-slate-400 text-center font-bold leading-relaxed max-w-xs uppercase tracking-widest text-[10px] opacity-60">{subtitle}</p>
            
            {isAdmin && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mt-8 flex items-center gap-2 bg-indigo-500/10 backdrop-blur-xl px-6 py-2.5 rounded-full border border-indigo-500/20 shadow-lg glow-indigo"
              >
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" />
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">
                  Secure Admin Terminal
                </p>
              </motion.div>
            )}
          </div>

          <div className="relative z-10">
            {children}
          </div>

          {/* Bottom Decoration */}
          <div className="mt-12 pt-8 border-t border-white/5 flex justify-center relative z-10">
            <div className="flex gap-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/10" />
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
