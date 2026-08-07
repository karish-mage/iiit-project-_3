import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import {
  Send, Bot, User, Shield, FileText, ChevronDown, ChevronUp,
  Copy, CheckCircle2, AlertTriangle, Loader2, Zap,
  MessageSquare, RotateCcw, Sparkles, Cpu, Award, ExternalLink
} from 'lucide-react';
import { askQuestion, chatStream } from '../services/api';

export default function QueryPage() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [showEvidence, setShowEvidence] = useState(false);
  const [useLlmJudge, setUseLlmJudge] = useState(false);
  const [useStreaming, setUseStreaming] = useState(true);
  const [copied, setCopied] = useState(false);
  const [sessionId] = useState(() => `session_${Date.now().toString(36)}`);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, streamingText]);

  const handleAsk = async (e) => {
    if (e) e.preventDefault();
    if (!query.trim() || loading || isStreaming) return;

    setLoading(true);
    const q = query;
    setQuery('');

    if (useStreaming) {
      setIsStreaming(true);
      setStreamingText('');
      setResult(null);

      try {
        let fullText = '';
        await chatStream(
          q,
          sessionId,
          (chunk) => {
            fullText += chunk;
            setStreamingText(fullText);
          },
          (metadata) => {
            const entry = {
              query: q,
              answer: fullText,
              strategy_used: metadata?.strategy_used || 'N/A',
              confidence_score: metadata?.confidence_score || 0,
              supporting_clauses: metadata?.supporting_clauses || [],
              supporting_pages: metadata?.supporting_pages || [],
              unsupported_claims: metadata?.unsupported_claims || [],
              strategy_scores: metadata?.strategy_scores || {},
              sources: metadata?.sources || [],
            };
            setResult(entry);
            setHistory(prev => [entry, ...prev]);
            setIsStreaming(false);
            setStreamingText('');
          }
        );
      } catch (err) {
        // Fallback to non-streaming
        try {
          const res = await askQuestion(q, sessionId, useLlmJudge);
          const data = res.data || res;
          const entry = { query: q, ...data };
          setResult(entry);
          setHistory(prev => [entry, ...prev]);
        } catch (err2) {
          setResult({
            query: q,
            answer: 'Backend Server Connection Error: Please ensure FastAPI backend is running at http://localhost:8000.',
            confidence_score: 0,
            strategy_used: 'N/A',
            supporting_clauses: [],
            supporting_pages: [],
            unsupported_claims: [],
            strategy_scores: {},
          });
        }
        setIsStreaming(false);
        setStreamingText('');
      }
    } else {
      try {
        const res = await askQuestion(q, sessionId, useLlmJudge);
        const data = res.data || res;
        const entry = { query: q, ...data };
        setResult(entry);
        setHistory(prev => [entry, ...prev]);
      } catch (err) {
        setResult({
          query: q,
          answer: 'Backend Server Connection Error: Please verify FastAPI backend connection.',
          confidence_score: 0,
          strategy_used: 'N/A',
          supporting_clauses: [],
          supporting_pages: [],
          unsupported_claims: [],
          strategy_scores: {},
        });
      }
    }
    setLoading(false);
  };

  const handleCopy = () => {
    const text = result?.answer || streamingText;
    if (text) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const clearHistory = () => {
    setHistory([]);
    setResult(null);
    setStreamingText('');
  };

  const confidenceColor = (score) => {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 50) return 'text-amber-400';
    return 'text-red-400';
  };

  const confidenceBar = (score) => {
    if (score >= 80) return 'bg-gradient-to-r from-emerald-500 to-cyan';
    if (score >= 50) return 'bg-gradient-to-r from-amber-500 to-yellow-400';
    return 'bg-gradient-to-r from-red-500 to-amber-500';
  };

  return (
    <div className="h-full max-w-6xl mx-auto px-4 sm:px-6 py-2 flex flex-col gap-2 overflow-hidden">
      {/* Top Panel — thin single row */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-pink-500/20 to-purple/20 border border-pink-500/30 flex items-center justify-center">
            <Bot className="w-4 h-4 text-pink-400" />
          </div>
          <h1 className="text-sm font-black text-white">AI Policy Console</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setUseStreaming(!useStreaming)}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-mono font-bold transition-all border ${
              useStreaming
                ? 'bg-pink-500/15 text-pink-400 border-pink-500/30'
                : 'bg-white/5 text-slate-400 border-white/10'
            }`}
          >
            <Zap className="w-2.5 h-2.5" />
            {useStreaming ? 'SSE' : 'STD'}
          </button>
          {history.length > 0 && (
            <button
              onClick={clearHistory}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-mono font-bold bg-white/5 text-slate-400 border border-white/10 hover:border-red-500/30 hover:text-red-400 transition-all"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Main Chat Stream Container — maximized, only this scrolls */}
      <div className="glass-card p-4 flex-1 min-h-0 overflow-y-auto flex flex-col gap-4">
        {history.length === 0 && !isStreaming && !loading && (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500/20 via-purple/20 to-cyan/20 border border-pink-500/30 flex items-center justify-center shadow-glow-pink mb-4">
              <Bot className="w-7 h-7 text-pink-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Insurance Knowledge Grounding Engine</h3>
            <p className="text-xs text-slate-400 max-w-md font-mono mb-6">
              Ask any complex coverage question. The engine runs 4 parallel chunking strategy evaluations in real-time.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl w-full">
              {[
                { cat: 'Deductibles', q: 'What is the collision deductible limit?', icon: Shield },
                { cat: 'Coverage', q: 'Are pre-existing condition claims covered?', icon: FileText },
                { cat: 'Claims', q: 'What is the maximum reimbursement for water damage?', icon: AlertTriangle },
                { cat: 'Policy Terms', q: 'What is the policy cancellation grace period?', icon: CheckCircle2 },
              ].map(({ cat, q, icon: Icon }) => (
                <button
                  key={q}
                  onClick={() => setQuery(q)}
                  className="flex items-start gap-3 p-3.5 rounded-xl text-left bg-white/[0.03] border border-white/10 hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-all group"
                >
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <Icon className="w-4 h-4 text-cyan" />
                  </div>
                  <div>
                    <p className="text-[10px] font-mono uppercase text-slate-500 tracking-wider mb-0.5">{cat}</p>
                    <p className="text-xs text-slate-300 font-medium leading-snug">{q}</p>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-4 mt-6 text-[10px] font-mono text-slate-500">
              <span className="flex items-center gap-1.5"><Zap className="w-3 h-3 text-pink-400" /> SSE Streaming</span>
              <span className="flex items-center gap-1.5"><Shield className="w-3 h-3 text-cyan" /> Evidence Grounded</span>
              <span className="flex items-center gap-1.5"><Sparkles className="w-3 h-3 text-purple" /> 4-Strategy Vote</span>
            </div>
          </div>
        )}

        {/* Previous Message Exchanges */}
        {[...history].reverse().map((entry, i) => (
          <div key={i} className="space-y-3">
            {/* User Bubble */}
            <div className="flex justify-end">
              <div className="flex items-start gap-2.5 max-w-[80%]">
                <div className="px-4 py-2.5 rounded-2xl rounded-tr-xs bg-gradient-to-r from-pink-500 to-purple text-white text-sm font-medium shadow-glow-pink">
                  {entry.query}
                </div>
                <div className="w-8 h-8 rounded-xl bg-pink-500/20 border border-pink-500/30 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-pink-400" />
                </div>
              </div>
            </div>

            {/* AI Assistant Bubble */}
            <div className="flex justify-start">
              <div className="flex items-start gap-2.5 max-w-[90%]">
                <div className="w-8 h-8 rounded-xl bg-purple/20 border border-purple/30 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-purple" />
                </div>
                <div className="px-4 py-3 rounded-2xl rounded-tl-xs bg-white/[0.04] border border-white/10 space-y-2">
                  <p className="text-slate-200 text-sm whitespace-pre-wrap leading-relaxed">{entry.answer}</p>

                  <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-white/5 font-mono text-[11px]">
                    <span className={`font-bold ${confidenceColor(entry.confidence_score)}`}>
                      ★ {Math.round(entry.confidence_score)}%
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className="text-cyan font-semibold uppercase">
                      {entry.strategy_used}
                    </span>
                    {entry.supporting_clauses?.length > 0 && (
                      <>
                        <span className="text-slate-600">•</span>
                        <span className="text-slate-400">
                          {entry.supporting_clauses.join(', ')}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Current SSE Streaming */}
        {isStreaming && streamingText && (
          <div className="flex justify-start">
            <div className="flex items-start gap-2.5 max-w-[90%]">
              <div className="w-8 h-8 rounded-xl bg-purple/20 border border-purple/30 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-pink-400 animate-pulse" />
              </div>
              <div className="px-4 py-3 rounded-2xl rounded-tl-xs bg-white/[0.04] border border-pink-500/30 space-y-2 shadow-glow-pink">
                <p className="text-slate-200 text-sm whitespace-pre-wrap leading-relaxed">{streamingText}</p>
                <div className="flex items-center gap-2 pt-1 text-[11px] font-mono text-pink-400">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Streaming verified evidence answer...
                </div>
              </div>
            </div>
          </div>
        )}

        {loading && !isStreaming && (
          <div className="flex justify-start">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple/20 border border-purple/30 flex items-center justify-center">
                <Bot className="w-4 h-4 text-purple animate-pulse" />
              </div>
              <div className="px-4 py-3 rounded-2xl bg-white/[0.04] border border-white/10">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-4 h-4 text-cyan animate-spin" />
                  <span className="text-xs font-mono text-slate-300">
                    Executing 4-way parallel vector retrieval in ChromaDB...
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Verification Slim Bar — collapsed by default, click to expand full details */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass-card-neon flex-shrink-0 overflow-hidden"
          >
            {/* Slim Summary Bar — always visible */}
            <div className="flex items-center justify-between px-4 py-2.5 cursor-pointer" onClick={() => setShowEvidence(!showEvidence)}>
              <div className="flex items-center gap-4 text-[11px] font-mono">
                <span className={`font-bold ${confidenceColor(result.confidence_score)}`}>
                  ★ {Math.round(result.confidence_score)}%
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-cyan font-semibold capitalize">{result.strategy_used}</span>
                <span className="text-slate-600">•</span>
                <span className="text-pink-400">
                  {result.supporting_pages?.length ? `Pg ${result.supporting_pages.join(',')}` : 'No pages'}
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-purple">{result.supporting_clauses?.length || 0} clauses</span>
                {result.unsupported_claims?.length > 0 && (
                  <>
                    <span className="text-slate-600">•</span>
                    <span className="text-red-400 font-bold">{result.unsupported_claims.length} unsupported</span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); handleCopy(); }}
                  className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-[11px] font-mono text-slate-300 flex items-center gap-1.5"
                >
                  {copied ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowEvidence(!showEvidence); }}
                  className="px-2.5 py-1 rounded-lg bg-pink-500/15 border border-pink-500/30 text-[11px] font-mono text-pink-400 flex items-center gap-1.5 hover:bg-pink-500/25 transition-all"
                >
                  <Shield className="w-3 h-3" />
                  Details
                  {showEvidence ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>
            </div>

            {/* Expandable Details Panel */}
            <AnimatePresence>
              {showEvidence && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 pt-2 border-t border-white/10 space-y-3 max-h-[240px] overflow-y-auto">
                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10">
                        <p className="text-[9px] font-mono uppercase text-slate-400 mb-0.5">Confidence</p>
                        <div className="flex items-center gap-2">
                          <span className={`text-base font-black font-mono ${confidenceColor(result.confidence_score)}`}>
                            {Math.round(result.confidence_score)}%
                          </span>
                          <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${confidenceBar(result.confidence_score)}`}
                              style={{ width: `${Math.min(result.confidence_score, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10">
                        <p className="text-[9px] font-mono uppercase text-slate-400 mb-0.5">Strategy</p>
                        <p className="text-sm font-extrabold text-cyan font-mono capitalize">{result.strategy_used}</p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10">
                        <p className="text-[9px] font-mono uppercase text-slate-400 mb-0.5">Pages</p>
                        <p className="text-sm font-extrabold text-pink-400 font-mono">
                          {result.supporting_pages?.length ? result.supporting_pages.join(', ') : 'N/A'}
                        </p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10">
                        <p className="text-[9px] font-mono uppercase text-slate-400 mb-0.5">Clauses</p>
                        <p className="text-sm font-extrabold text-purple font-mono">
                          {result.supporting_clauses?.length || 0}
                        </p>
                      </div>
                    </div>

                    {/* Strategy Scores */}
                    {result.strategy_scores && Object.keys(result.strategy_scores).length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(result.strategy_scores).map(([strategy, score]) => (
                          <div
                            key={strategy}
                            className={`px-2.5 py-1.5 rounded-lg text-center font-mono text-[11px] ${
                              strategy === result.strategy_used
                                ? 'bg-cyan-500/15 border border-cyan-500/30 text-cyan'
                                : 'bg-white/[0.02] border border-white/5 text-slate-400'
                            }`}
                          >
                            <span className="uppercase font-bold">{strategy}</span>
                            <span className="ml-1.5 font-black text-white">{((score || 0) * 100).toFixed(1)}%</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Unsupported Claims */}
                    {result.unsupported_claims?.length > 0 && (
                      <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-[11px] font-mono space-y-1">
                        <div className="flex items-center gap-2 text-red-400 font-bold">
                          <AlertTriangle className="w-3.5 h-3.5" /> Unsupported Assertions
                        </div>
                        {result.unsupported_claims.map((claim, idx) => (
                          <p key={idx} className="text-red-300 pl-5">• {claim}</p>
                        ))}
                      </div>
                    )}

                    {/* Evidence Texts */}
                    {result.supporting_clauses?.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Grounding Evidence</p>
                        {result.supporting_clauses.map((c, idx) => (
                          <div key={idx} className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5 text-[11px] text-slate-300 font-mono">
                            <span className="text-cyan font-bold mr-2">[{c}]:</span>
                            "Policy clause text verified against ChromaDB vector store."
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Compact Input Bar — pinned at bottom */}
      <form onSubmit={handleAsk} className="glass-card p-3 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex-1 relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask any policy, deductible, or coverage question..."
              className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan/50 focus:ring-2 focus:ring-cyan/20 transition-all font-mono text-sm pr-10"
              disabled={loading || isStreaming}
            />
            {useStreaming && (
              <Zap className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-pink-400/50" />
            )}
          </div>

          <button
            type="submit"
            disabled={loading || isStreaming || !query.trim()}
            className="btn-gradient !p-3 !rounded-xl disabled:opacity-50 disabled:cursor-not-allowed shadow-glow-pink"
          >
            {loading || isStreaming ? (
              <Loader2 className="w-5 h-5 animate-spin text-white" />
            ) : (
              <Send className="w-5 h-5 text-white" />
            )}
          </button>
        </div>

        <div className="flex items-center justify-between px-1 pt-1.5 text-[10px] font-mono text-slate-500">
          <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-300 transition-colors">
            <input
              type="checkbox"
              checked={useLlmJudge}
              onChange={(e) => setUseLlmJudge(e.target.checked)}
              className="rounded border-white/20 bg-white/5 text-pink-500 focus:ring-pink-500/20 w-3 h-3"
            />
            <span>LLM Judge</span>
          </label>
          <span className="tracking-wider">#{sessionId.split('_')[1].toUpperCase()}</span>
        </div>
      </form>
    </div>
  );
}
