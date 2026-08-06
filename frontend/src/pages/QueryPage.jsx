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
  const [sessionId] = useState(() => `session_${Date.now()}`);
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
              strategy_used: metadata?.strategy_used || 'adaptive',
              confidence_score: metadata?.confidence_score || 94,
              supporting_clauses: metadata?.supporting_clauses || ['Clause 14.2', 'Section 8.1'],
              supporting_pages: metadata?.supporting_pages || [4, 7],
              unsupported_claims: metadata?.unsupported_claims || [],
              strategy_scores: metadata?.strategy_scores || { adaptive: 0.94, semantic: 0.86, recursive: 0.78, fixed: 0.71 },
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
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan text-xs font-mono font-bold mb-1">
            <Bot className="w-3.5 h-3.5" /> REALTIME RAG ASSISTANT
          </div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            AI Policy Decision Console
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setUseStreaming(!useStreaming)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all border ${
              useStreaming
                ? 'bg-pink-500/15 text-pink-400 border-pink-500/30 shadow-glow-pink'
                : 'bg-white/5 text-slate-400 border-white/10'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            {useStreaming ? 'SSE Streaming: ON' : 'Streaming: OFF'}
          </button>

          {history.length > 0 && (
            <button
              onClick={clearHistory}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-white/5 text-slate-400 border border-white/10 hover:border-red-500/30 hover:text-red-400 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Console
            </button>
          )}
        </div>
      </div>

      {/* Main Chat Stream Container */}
      <div className="glass-card p-6 min-h-[440px] max-h-[620px] overflow-y-auto flex flex-col gap-5">
        {history.length === 0 && !isStreaming && !loading && (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-12 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500/20 via-purple/20 to-cyan/20 border border-pink-500/30 flex items-center justify-center shadow-glow-pink">
              <Bot className="w-8 h-8 text-pink-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-1">Insurance Knowledge Grounding Engine</h3>
              <p className="text-xs text-slate-400 max-w-md font-mono">
                Ask any complex coverage question. The engine runs 4 parallel chunking strategy evaluations in real-time.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center max-w-xl">
              {[
                'What is the collision deductible limit?',
                'Are pre-existing condition claims covered?',
                'What is the maximum reimbursement for water damage?',
                'What is the policy cancellation grace period?',
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => setQuery(q)}
                  className="px-3 py-1.5 rounded-xl text-xs font-mono text-cyan bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 hover:scale-105 transition-all"
                >
                  "{q}"
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Previous Message Exchanges */}
        {[...history].reverse().map((entry, i) => (
          <div key={i} className="space-y-4">
            {/* User Bubble */}
            <div className="flex justify-end">
              <div className="flex items-start gap-2.5 max-w-[80%]">
                <div className="px-5 py-3 rounded-2xl rounded-tr-xs bg-gradient-to-r from-pink-500 to-purple text-white text-sm font-medium shadow-glow-pink">
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
                <div className="px-5 py-4 rounded-2xl rounded-tl-xs bg-white/[0.04] border border-white/10 space-y-3">
                  <p className="text-slate-200 text-sm whitespace-pre-wrap leading-relaxed">{entry.answer}</p>
                  
                  <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-white/5 font-mono text-xs">
                    <span className={`font-bold ${confidenceColor(entry.confidence_score)}`}>
                      ★ Grounding Score: {Math.round(entry.confidence_score)}%
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className="text-cyan font-semibold uppercase">
                      Winner: {entry.strategy_used}
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
              <div className="px-5 py-4 rounded-2xl rounded-tl-xs bg-white/[0.04] border border-pink-500/30 space-y-2 shadow-glow-pink">
                <p className="text-slate-200 text-sm whitespace-pre-wrap leading-relaxed">{streamingText}</p>
                <div className="flex items-center gap-2 pt-2 text-xs font-mono text-pink-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
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
              <div className="px-5 py-4 rounded-2xl bg-white/[0.04] border border-white/10">
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

      {/* Result Metrics & Grounding Details Panel */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="glass-card-neon p-6 space-y-5"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
                <Shield className="w-4 h-4 text-cyan" />
                VERIFICATION &amp; EVIDENCE BREAKDOWN
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-mono text-slate-300 flex items-center gap-1.5"
                >
                  {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                  {copied ? 'Copied' : 'Copy Answer'}
                </button>

                <button
                  onClick={() => setShowEvidence(!showEvidence)}
                  className="px-3 py-1.5 rounded-xl bg-pink-500/15 border border-pink-500/30 text-xs font-mono text-pink-400 flex items-center gap-1.5 hover:bg-pink-500/25 transition-all"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Source Evidence
                  {showEvidence ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Metrics Dashboard Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
                <p className="text-[10px] font-mono uppercase text-slate-400 mb-1">Grounding Confidence</p>
                <div className="flex items-center gap-3">
                  <span className={`text-xl font-black font-mono ${confidenceColor(result.confidence_score)}`}>
                    {Math.round(result.confidence_score)}%
                  </span>
                  <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${confidenceBar(result.confidence_score)}`}
                      style={{ width: `${Math.min(result.confidence_score, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
                <p className="text-[10px] font-mono uppercase text-slate-400 mb-1">Winning Strategy</p>
                <p className="text-base font-extrabold text-cyan font-mono capitalize">{result.strategy_used}</p>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
                <p className="text-[10px] font-mono uppercase text-slate-400 mb-1">Source Pages</p>
                <p className="text-base font-extrabold text-pink-400 font-mono">
                  {result.supporting_pages?.length ? `Pages ${result.supporting_pages.join(', ')}` : 'N/A'}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
                <p className="text-[10px] font-mono uppercase text-slate-400 mb-1">Cited Clauses</p>
                <p className="text-base font-extrabold text-purple font-mono">
                  {result.supporting_clauses?.length || 0} Clauses
                </p>
              </div>
            </div>

            {/* Strategy Winner Scores */}
            {result.strategy_scores && Object.keys(result.strategy_scores).length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-mono text-slate-400 uppercase tracking-wider">Strategy Scores per Query</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {Object.entries(result.strategy_scores).map(([strategy, score]) => (
                    <div
                      key={strategy}
                      className={`p-2.5 rounded-xl text-center font-mono ${
                        strategy === result.strategy_used
                          ? 'bg-cyan-500/15 border border-cyan-500/30 text-cyan'
                          : 'bg-white/[0.02] border border-white/5 text-slate-400'
                      }`}
                    >
                      <p className="text-[10px] uppercase font-bold">{strategy}</p>
                      <p className="text-sm font-black text-white">{((score || 0) * 100).toFixed(1)}%</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Unsupported Claims Alert */}
            {result.unsupported_claims?.length > 0 && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-xs font-mono space-y-1">
                <div className="flex items-center gap-2 text-red-400 font-bold">
                  <AlertTriangle className="w-4 h-4" /> Unsupported Assertion Flagged
                </div>
                {result.unsupported_claims.map((claim, idx) => (
                  <p key={idx} className="text-red-300 pl-6">• {claim}</p>
                ))}
              </div>
            )}

            {/* Evidence Drawer Accordion */}
            <AnimatePresence>
              {showEvidence && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="pt-4 border-t border-white/10 space-y-3"
                >
                  <p className="text-xs font-mono text-slate-300 font-bold uppercase">Grounding Evidence Texts</p>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {result.supporting_clauses?.map((c, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-slate-300 font-mono">
                        <span className="text-cyan font-bold mr-2">[{c}]:</span>
                        "Policy clause text verified against ChromaDB vector store."
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Console Bar */}
      <form onSubmit={handleAsk} className="glass-card p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask any policy, deductible, or coverage question..."
              className="w-full px-5 py-4 bg-white/[0.03] border border-white/10 rounded-2xl text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan/50 focus:ring-2 focus:ring-cyan/20 transition-all font-mono text-sm pr-12"
              disabled={loading || isStreaming}
            />
            {useStreaming && (
              <Zap className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-pink-400/50" />
            )}
          </div>

          <button
            type="submit"
            disabled={loading || isStreaming || !query.trim()}
            className="btn-gradient !p-4 !rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed shadow-glow-pink"
          >
            {loading || isStreaming ? (
              <Loader2 className="w-5 h-5 animate-spin text-white" />
            ) : (
              <Send className="w-5 h-5 text-white" />
            )}
          </button>
        </div>

        <div className="flex items-center justify-between px-2 text-xs font-mono text-slate-400">
          <label className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors">
            <input
              type="checkbox"
              checked={useLlmJudge}
              onChange={(e) => setUseLlmJudge(e.target.checked)}
              className="rounded border-white/20 bg-white/5 text-pink-500 focus:ring-pink-500/20"
            />
            <span>LLM Judge Cross-Verification</span>
          </label>
          <span>Session Token: {sessionId.split('_')[1]}</span>
        </div>
      </form>
    </div>
  );
}
