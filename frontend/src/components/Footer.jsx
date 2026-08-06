import React from 'react';
import { Shield, Sparkles, Cpu, GitBranch, Terminal } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-white/10 py-10 mt-24 bg-[#030712]/90 backdrop-blur-2xl relative z-10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo & Description */}
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 via-purple to-cyan flex items-center justify-center shadow-glow-pink">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold text-white tracking-wider">INSURANCE DIVISION</span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-mono bg-cyan/10 text-cyan border border-cyan/30">
                  RAG ENGINE v2.5
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                AI-Driven Decision Engine &amp; Multi-Strategy Chunking Evaluation Hub
              </p>
            </div>
          </div>

          {/* Tech Stack Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 text-[10px] font-mono text-slate-400">
            <span className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/10 flex items-center gap-1.5">
              <Terminal className="w-3 h-3 text-pink-400" /> FastAPI
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/10 flex items-center gap-1.5">
              <Cpu className="w-3 h-3 text-cyan" /> ChromaDB
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/10 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-purple" /> Gemini Pro
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/10 flex items-center gap-1.5">
              <GitBranch className="w-3 h-3 text-emerald-400" /> React 18 + Vite
            </span>
          </div>

          {/* Copyright */}
          <div className="text-right">
            <p className="text-xs text-slate-400 font-mono">
              &copy; {new Date().getFullYear()} Insurance Division. Built for IIIT Project.
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Strictly Confidential &amp; Verified Evidence Grounding
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
