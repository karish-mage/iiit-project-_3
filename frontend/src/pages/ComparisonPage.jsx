import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GitCompare, Send, Trophy, Clock, Target, Brain,
  ChevronDown, ChevronUp, Loader2, Sparkles, Sliders, Layers, AlertTriangle
} from 'lucide-react';
import { compareStrategies } from '../services/api';

const STRATEGY_THEMES = {
  fixed: { color: 'text-blue-400', bar: 'bg-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
  recursive: { color: 'text-purple', bar: 'bg-purple', bg: 'bg-purple/10', border: 'border-purple/30' },
  semantic: { color: 'text-amber-400', bar: 'bg-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  adaptive: { color: 'text-cyan', bar: 'bg-cyan', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30' },
};

export default function ComparisonPage() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [expandedStrategy, setExpandedStrategy] = useState(null);

  const handleCompare = async (e) => {
    if (e) e.preventDefault();
    if (!query.trim() || loading) return;
    setLoading(true);
    setError('');
    try {
      const res = await compareStrategies(query);
      setResult(res.data || res);
    } catch (err) {
      setResult(null);
      setError(err?.response?.data?.detail || 'Failed to run comparison. Ensure documents are uploaded and indexed.');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 space-y-8">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-purple/10 border border-purple/20 text-purple text-xs font-mono font-bold mb-2">
          <GitCompare className="w-3.5 h-3.5" /> 4-STRATEGY EVALUATION BENCH
        </div>
        <h1 className="text-3xl md:text-5xl font-black text-white">
          Strategy Benchmarking Hub
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Execute head-to-head retrieval comparison across Fixed, Recursive, Semantic, and Adaptive strategies.
        </p>
      </div>

      {/* Query Form */}
      <form onSubmit={handleCompare} className="glass-card p-4 space-y-3">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Enter any policy query to benchmark chunking strategies..."
            className="flex-1 bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-purple/50 focus:ring-2 focus:ring-purple/20 transition-all font-mono"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="btn-gradient !px-8 !py-4 font-bold text-sm disabled:opacity-50 shadow-glow-purple"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            Run 4-Way Evaluation
          </button>
        </div>

        {/* Quick Sample Prompts */}
        <div className="flex flex-wrap items-center gap-2 px-1 pt-1">
          <span className="text-xs font-mono text-slate-400">Quick Benchmark Queries:</span>
          {[
            'What mental health treatments are covered?',
            'What are the exclusion criteria for flood damages?',
            'What is the maximum claim payout for collision accidents?',
          ].map(q => (
            <button
              key={q}
              type="button"
              onClick={() => {
                setQuery(q);
              }}
              className="px-3 py-1 rounded-xl text-xs font-mono text-purple bg-purple/10 border border-purple/20 hover:bg-purple/20 transition-all"
            >
              "{q}"
            </button>
          ))}
        </div>
      </form>

      {/* Benchmark Results */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Winner Banner */}
            <div className="glass-card-neon p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shadow-glow-cyan">
                  <Trophy className="w-6 h-6 text-amber-400 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-400 font-bold uppercase">WINNING STRATEGY</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-pink-500/20 text-pink-400 font-bold">
                      HIGHEST ACCURACY
                    </span>
                  </div>
                  <h2 className="text-2xl font-black text-white capitalize mt-0.5">
                    {result.winner} Strategy
                  </h2>
                </div>
              </div>

              <div className="text-right font-mono">
                <p className="text-xs text-slate-400">Winning Composite Score</p>
                <p className="text-3xl font-black text-cyan">
                  {((result.winner_score || 0) * 100).toFixed(1)}%
                </p>
              </div>
            </div>

            {/* 4 Strategy Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {result.strategies.map((strat, i) => {
                const theme = STRATEGY_THEMES[strat.strategy_name] || STRATEGY_THEMES.fixed;
                const isWinner = strat.strategy_name === result.winner;
                const isExpanded = expandedStrategy === strat.strategy_name;

                return (
                  <motion.div
                    key={strat.strategy_name}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className={`glass-card overflow-hidden ${
                      isWinner ? 'border-pink-500/40 shadow-glow-pink ring-1 ring-pink-500/40' : ''
                    }`}
                  >
                    {/* Strategy Header */}
                    <div className={`p-4 border-b border-white/10 ${isWinner ? 'bg-pink-500/10' : 'bg-white/[0.02]'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className={`w-3 h-3 rounded-full ${theme.bar}`} />
                          <h3 className={`text-base font-extrabold capitalize font-mono ${theme.color}`}>
                            {strat.strategy_name}
                          </h3>
                        </div>
                        {isWinner && (
                          <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-pink-500/20 text-pink-400 border border-pink-500/30">
                            ★ WINNER
                          </span>
                        )}
                      </div>
                      <p className="text-2xl font-black font-mono text-white mt-1">
                        {((strat.final_score || 0) * 100).toFixed(1)}%
                      </p>
                    </div>

                    {/* Metrics Bars */}
                    <div className="p-4 space-y-3">
                      <MetricMeter label="Precision@K" value={strat.precision_at_k} icon={Target} color={theme.bar} />
                      <MetricMeter label="Recall@K" value={strat.recall_at_k} icon={Brain} color={theme.bar} />
                      <MetricMeter label="Relevance" value={strat.context_relevance} icon={Sparkles} color={theme.bar} />

                      <div className="pt-2 border-t border-white/5 space-y-1 text-xs font-mono text-slate-400">
                        <div className="flex justify-between">
                          <span>Latency:</span>
                          <span className="text-slate-200">{strat.retrieval_latency_ms.toFixed(1)}ms</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Retrieved Chunks:</span>
                          <span className="text-slate-200">{strat.chunks.length}</span>
                        </div>
                      </div>
                    </div>

                    {/* Chunks Accordion */}
                    <div className="border-t border-white/10">
                      <button
                        onClick={() => setExpandedStrategy(isExpanded ? null : strat.strategy_name)}
                        className="w-full py-2.5 px-4 text-xs font-mono text-slate-400 hover:text-cyan hover:bg-white/[0.03] flex items-center justify-center gap-1.5 transition-all"
                      >
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        {isExpanded ? 'Hide Chunks' : 'Inspect Retrieved Chunks'}
                      </button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="p-3 pt-0 space-y-2 max-h-72 overflow-y-auto"
                          >
                            {strat.chunks.map((chunk, j) => (
                              <div key={j} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs font-mono space-y-1">
                                <div className="flex items-center justify-between text-[10px]">
                                  <span className="text-slate-400 truncate max-w-[120px]">
                                    {chunk.section_title || `Chunk #${j + 1}`}
                                  </span>
                                  <span className={`font-bold ${theme.color}`}>
                                    {(chunk.similarity_score * 100).toFixed(1)}% Match
                                  </span>
                                </div>
                                <p className="text-slate-300 line-clamp-3 leading-relaxed text-[11px] font-sans">
                                  {chunk.text}
                                </p>
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Banner */}
      {error && (
        <div className="glass-card p-4 flex items-center gap-3 border-red-500/30">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <span className="text-sm text-red-300 font-mono">{error}</span>
        </div>
      )}

      {/* Empty Placeholder */}
      {!result && !loading && !error && (
        <div className="glass-card p-16 text-center space-y-3">
          <Sliders className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-lg font-bold text-white">No Evaluation Executed Yet</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto font-mono">
            Type a query or click one of the quick benchmark prompts above to evaluate Fixed, Recursive, Semantic, and Adaptive retrieval side-by-side.
          </p>
        </div>
      )}
    </div>
  );
}

function MetricMeter({ label, value, icon: Icon, color }) {
  const pct = Math.max(0, Math.min(100, (value || 0) * 100));
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs font-mono">
        <span className="text-slate-400 flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5" /> {label}
        </span>
        <span className="font-bold text-slate-200">{pct.toFixed(1)}%</span>
      </div>
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
