import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Upload, MessageSquare, GitCompare, BarChart3,
  Shield, Brain, FileText, Settings, HelpCircle, Lock,
  Activity, Zap, Database, Bot, Cpu, CheckCircle2, AlertCircle
} from 'lucide-react';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/upload', label: 'Policy Vault', icon: FileText },
  { path: '/query', label: 'AI Assistant', icon: Bot },
  { path: '/comparison', label: 'Strategy Bench', icon: GitCompare },
  { path: '/analytics', label: 'Analytics Telemetry', icon: BarChart3 },
];

const secondaryItems = [
  { label: 'Risk Assessor', icon: Shield },
  { label: 'Claims Processor', icon: Activity },
  { label: 'Vector Store (Chroma)', icon: Database },
];

const recentCases = [
  { id: 'CLM-9821', type: 'Health', status: 'approved', score: '99.4%' },
  { id: 'CLM-9820', type: 'Auto', status: 'review', score: '94.1%' },
  { id: 'CLM-9819', type: 'Property', status: 'approved', score: '98.7%' },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <aside className="w-64 h-screen bg-[#070C1E]/90 backdrop-blur-2xl border-r border-white/10 flex flex-col flex-shrink-0 sticky top-0 z-30">
      {/* Brand Header */}
      <div className="p-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan via-purple to-pink-500 p-0.5 shadow-glow-cyan">
            <div className="w-full h-full bg-[#070C1E] rounded-[10px] flex items-center justify-center">
              <Brain className="w-5 h-5 text-cyan" />
            </div>
          </div>
          <div>
            <h1 className="text-sm font-extrabold text-white tracking-wide">INSURANCE AI</h1>
            <p className="text-[10px] text-pink-400 font-mono font-semibold">4x Strategy RAG</p>
          </div>
        </div>
      </div>

      {/* Cluster Node Status */}
      <div className="px-4 py-3 border-b border-white/10">
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
          <div className="flex items-center gap-2">
            <span className="status-dot bg-cyan" />
            <div>
              <p className="text-[9px] text-slate-400 uppercase tracking-widest font-mono">NODE CLUSTER</p>
              <p className="text-xs font-mono font-bold text-cyan">US-EAST-ALPHA</p>
            </div>
          </div>
          <Cpu className="w-4 h-4 text-cyan/70" />
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        <p className="px-3 mb-2 text-[10px] uppercase tracking-widest text-slate-400 font-bold font-mono">
          Core Engine
        </p>
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `nav-link ${isActive ? 'active' : ''}`
            }
          >
            <item.icon className="w-4 h-4 flex-shrink-0" />
            <span className="font-semibold text-xs">{item.label}</span>
            {item.path === '/query' && (
              <span className="ml-auto px-1.5 py-0.5 rounded text-[9px] font-mono bg-pink-500/20 text-pink-400 font-bold">
                LIVE
              </span>
            )}
          </NavLink>
        ))}

        <div className="pt-5 pb-2">
          <p className="px-3 mb-2 text-[10px] uppercase tracking-widest text-slate-400 font-bold font-mono">
            Infrastructure
          </p>
        </div>
        {secondaryItems.map(item => (
          <div
            key={item.label}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all cursor-pointer"
          >
            <item.icon className="w-4 h-4 flex-shrink-0 text-cyan/60" />
            <span>{item.label}</span>
          </div>
        ))}
      </nav>

      {/* Recent Case Feed */}
      <div className="px-4 py-3 border-t border-white/10">
        <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold font-mono mb-2">
          Recent Evaluations
        </p>
        <div className="space-y-1.5">
          {recentCases.map(c => (
            <div key={c.id} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/5 text-xs">
              <span className="font-mono text-slate-300 font-medium">{c.id}</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold text-cyan">{c.score}</span>
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold font-mono uppercase ${
                  c.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                }`}>
                  {c.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Button */}
      <div className="p-4 border-t border-white/10">
        <button className="btn-gradient w-full flex items-center justify-center gap-2 !py-2.5 !text-xs !rounded-xl">
          <Zap className="w-4 h-4" />
          Deploy Optimized Weights
        </button>
      </div>
    </aside>
  );
}
