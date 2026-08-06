import React, { useState, useEffect } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { Menu, X, Shield, Sparkles, Activity, Zap, Cpu } from 'lucide-react';

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
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[#030712]/90 backdrop-blur-2xl border-b border-white/10 shadow-2xl py-2.5'
          : 'bg-[#030712]/60 backdrop-blur-xl border-b border-white/5 py-3.5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        {/* Left — Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 via-purple to-cyan flex items-center justify-center shadow-glow-pink group-hover:scale-105 transition-transform duration-300">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan"></span>
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold text-white tracking-tight group-hover:text-cyan transition-colors">
                INSURANCE DIVISION
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider bg-pink-500/10 text-pink-400 border border-pink-500/20">
                PRO RAG
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
              <Cpu className="w-3 h-3 text-cyan" /> Decision Engine v2.5
            </p>
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

        {/* Right — Active Engine Indicator & CTA */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
            <span className="status-dot bg-cyan" />
            <span className="text-xs text-cyan font-mono font-semibold">Gemini 1.5 Pro</span>
          </div>

          <Link
            to="/query"
            className="hidden sm:inline-flex btn-gradient !py-2 !px-5 !text-xs !rounded-xl"
          >
            <Zap className="w-3.5 h-3.5" />
            Launch Assistant
          </Link>

          <button
            className="lg:hidden p-2.5 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-white/10 px-6 py-5 space-y-2 bg-[#030712]/95 backdrop-blur-2xl animate-fade-in">
          {navLinks.map(link => (
            <NavLink
              key={link.path}
              to={link.path}
              end={link.path === '/'}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? 'text-pink-400 bg-pink-500/10 border border-pink-500/30'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`
              }
            >
              <span>{link.label}</span>
              <Sparkles className="w-4 h-4 text-cyan/50" />
            </NavLink>
          ))}
          <Link
            to="/query"
            onClick={() => setMobileOpen(false)}
            className="btn-gradient w-full text-center mt-4 !py-3"
          >
            Launch Assistant
          </Link>
        </div>
      )}
    </nav>
  );
}
