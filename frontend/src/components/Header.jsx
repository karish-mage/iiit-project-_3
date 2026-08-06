import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Bell, Search, User, ChevronDown, Wifi, Activity, ShieldCheck, Zap } from 'lucide-react';

const tabs = [
  { path: '/', label: 'Overview' },
  { path: '/query', label: 'RAG Console' },
  { path: '/upload', label: 'Vault' },
  { path: '/comparison', label: 'Benchmark' },
  { path: '/analytics', label: 'Telemetry' },
];

export default function Header() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-14 border-b border-white/10 bg-[#070C1E]/80 backdrop-blur-xl flex items-center justify-between px-6 flex-shrink-0 z-40 sticky top-0">
      {/* Left — Title + Tabs */}
      <div className="flex items-center gap-6">
        <div className="hidden lg:flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan animate-pulse" />
          <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
            RAG Command Center
          </span>
        </div>

        <nav className="flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.03] border border-white/5">
          {tabs.map(tab => (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={({ isActive }) =>
                `px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-cyan/15 text-cyan border border-cyan/30 shadow-glow-cyan'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Right — Live Telemetry & Quick Tools */}
      <div className="flex items-center gap-4">
        {/* Engine Status */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <div className="status-dot bg-emerald-400" />
          <span className="text-[11px] text-emerald-400 font-semibold font-mono">4 Pipelines Active</span>
        </div>

        {/* Latency */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs font-mono text-cyan px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/5">
          <Wifi className="w-3.5 h-3.5" />
          <span>1.8ms</span>
        </div>

        {/* Time Ticker */}
        <span className="text-xs font-mono text-slate-400 hidden xl:block px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/5">
          {time.toLocaleTimeString()}
        </span>

        {/* User Badge */}
        <div className="flex items-center gap-2 pl-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-pink-500 to-purple flex items-center justify-center border border-white/20 shadow-glow-pink">
            <User className="w-4 h-4 text-white" />
          </div>
        </div>
      </div>
    </header>
  );
}
