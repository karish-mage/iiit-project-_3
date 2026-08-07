import React, { useState, useEffect } from 'react';
import { Layers3, Sparkles, Cpu, GitBranch, Terminal } from 'lucide-react';
import { getStats } from '../services/api';

export default function Footer() {
  const [provider, setProvider] = useState('LLM');

  useEffect(() => {
    getStats().then(res => {
      const p = res.data?.active_provider;
      if (p && p !== 'none') setProvider(p === 'groq' ? 'Groq LLM' : p === 'gemini' ? 'Gemini Pro' : p);
    }).catch(() => {});
  }, []);

  return (
    <footer className="border-t border-white/10 py-2 bg-obsidian-950/90 backdrop-blur-2xl relative z-10">
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between gap-4 text-[10px] font-mono text-slate-400">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-pink-500/10 border border-pink-500/25 flex items-center justify-center">
            <Layers3 className="w-3.5 h-3.5 text-pink-400" />
          </div>
          <span className="font-bold text-white">INSURANCE DIVISION</span>
          <span className="px-1.5 py-0.5 rounded text-[9px] bg-cyan/10 text-cyan border border-cyan/30">v2.5</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/10 flex items-center gap-1">
            <Terminal className="w-2.5 h-2.5 text-pink-400" /> FastAPI
          </span>
          <span className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/10 flex items-center gap-1">
            <Cpu className="w-2.5 h-2.5 text-cyan" /> ChromaDB
          </span>
          <span className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/10 flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5 text-purple" /> {provider}
          </span>
          <span className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/10 flex items-center gap-1">
            <GitBranch className="w-2.5 h-2.5 text-emerald-400" /> React + Vite
          </span>
        </div>

        <span>&copy; {new Date().getFullYear()} IIIT Project</span>
      </div>
    </footer>
  );
}
