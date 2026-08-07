import React, { useState, useEffect } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { Menu, X, Layers3, Sparkles } from 'lucide-react';
import { getStats } from '../services/api';

const navLinks = [
  { path: '/', label: 'Home' },
  { path: '/tutorial', label: 'How it Works' },
  { path: '/upload', label: 'Data Ingestion' },
  { path: '/query', label: 'AI Assistant' },
  { path: '/comparison', label: 'Strategy Bench' },
  { path: '/analytics', label: 'Telemetry' },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [provider, setProvider] = useState('Loading...');
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    getStats().then(res => setProvider(res.data?.active_provider || 'N/A')).catch(() => setProvider('Offline'));
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 flex flex-col ${
        scrolled
          ? 'bg-obsidian-950/90 backdrop-blur-2xl border-b border-white/10 shadow-2xl'
          : 'bg-obsidian-950/60 backdrop-blur-xl border-b border-white/5'
      }`}
    >
      <div className="w-full max-w-7xl mx-auto px-6 min-h-[3.5rem] flex items-center justify-between">
        {/* Left — Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-pink-500/10 border border-pink-500/25 flex items-center justify-center group-hover:border-pink-500/50 transition-colors duration-300">
            <Layers3 className="w-4 h-4 text-pink-400" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-extrabold text-white tracking-tight group-hover:text-pink-400 transition-colors">
              INSURANCE DIVISION
            </span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider bg-white/5 text-slate-400 border border-white/10">
              RAG Engine
            </span>
          </div>
        </Link>

        {/* Center — Nav Links (desktop) */}
        <div className="hidden lg:flex items-center gap-1.5 p-1 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md">
          {navLinks.map(link => (
            <NavLink
              key={link.path}
              to={link.path}
              end={link.path === '/'}
              className={({ isActive }) =>
                `nav-link ${isActive ? 'active' : ''}`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </div>

        {/* Right — Active Engine Indicator */}
        <div className="flex items-center gap-2.5">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
            <span className="status-dot bg-cyan" />
            <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">LLM:</span>
            <span className="text-[11px] text-cyan font-mono font-bold uppercase tracking-wide">{provider}</span>
          </div>

          <button
            className="lg:hidden p-2 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-white/10 px-6 py-5 space-y-2 bg-obsidian-950/95 backdrop-blur-2xl animate-fade-in">
          {navLinks.map(link => (
            <NavLink
              key={link.path}
              to={link.path}
              end={link.path === '/'}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? 'text-pink-400 bg-pink-500/10 border border-pink-500/20'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`
              }
            >
              <span>{link.label}</span>
              <Sparkles className="w-4 h-4 text-slate-600" />
            </NavLink>
          ))}
          <Link
            to="/query"
            onClick={() => setMobileOpen(false)}
            className="btn-gradient w-full text-center mt-3 !py-2.5"
          >
            Launch Assistant
          </Link>
        </div>
      )}
    </nav>
  );
}
