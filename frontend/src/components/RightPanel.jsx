import React, { useState, useEffect } from 'react';
import {
  Activity, Cpu, HardDrive, Gauge, ShieldCheck, AlertTriangle,
  Database, Server, Clock, Zap
} from 'lucide-react';
import { getStats } from '../services/api';

export default function RightPanel() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    try {
      const res = await getStats();
      setStats(res.data);
      setOnline(true);
    } catch (e) {
      setStats(null);
      setOnline(false);
    }
    setLoading(false);
  };

  const hasQueries = (stats?.queries_answered ?? 0) > 0;
  const retrievalBarWidth = hasQueries ? Math.max(0, 100 - (stats?.avg_response_time_ms ?? 0) / 5) : 0;

  return (
    <aside className="w-72 h-full ml-2 border-l border-white/10 bg-obsidian-900/80 backdrop-blur-2xl overflow-y-auto flex-shrink-0 hidden xl:block z-30">
      <div className="p-3 space-y-4">
        {/* System Health Header */}
        <div>
          <h3 className="text-xs uppercase tracking-widest text-slate-400 font-bold font-mono mb-2.5 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan" />
              Live Telemetry
            </span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-cyan/10 text-cyan border border-cyan/20">
              REALTIME
            </span>
          </h3>

          <div className="space-y-2">
            <MetricRow icon={ShieldCheck} label="AI Precision" value={loading ? '...' : `${((stats?.avg_accuracy ?? 0) * 100).toFixed(1)}%`} color="text-emerald-400" barWidth={(stats?.avg_accuracy ?? 0) * 100} />
            <MetricRow icon={Clock} label="Retrieval Time" value={loading ? '...' : hasQueries ? `${(stats?.avg_response_time_ms ?? 0).toFixed(0)}ms` : 'No data'} color="text-cyan" barWidth={retrievalBarWidth} />
            <MetricRow icon={Gauge} label="Context Relevance" value={loading ? '...' : `${((stats?.avg_context_relevance ?? 0) * 100).toFixed(1)}%`} color="text-pink-400" barWidth={(stats?.avg_context_relevance ?? 0) * 100} />
            <MetricRow icon={ShieldCheck} label="Grounding Verifier" value={loading ? '...' : `${(stats?.avg_confidence ?? 0).toFixed(1)}%`} color="text-purple" barWidth={stats?.avg_confidence ?? 0} />
            <MetricRow icon={AlertTriangle} label="Avg Precision" value={loading ? '...' : `${((stats?.avg_precision ?? 0) * 100).toFixed(1)}%`} color="text-amber-400" barWidth={(stats?.avg_precision ?? 0) * 100} />
          </div>
        </div>

        {/* System Status */}
        <div className="glass-card p-3">
          <h3 className="text-xs uppercase tracking-widest text-slate-400 font-bold font-mono mb-2.5 flex items-center gap-2">
            <Server className="w-4 h-4 text-purple" />
            System Status
          </h3>
          <div className="flex items-center gap-4 text-[11px] font-mono">
            <span className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${online ? 'bg-cyan animate-pulse' : 'bg-red-400'}`} />
              <span className={online ? 'text-cyan' : 'text-red-400'}>{online ? 'Backend Online' : 'Backend Offline'}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${hasQueries ? 'bg-emerald-400' : 'bg-slate-600'}`} />
              <span className={hasQueries ? 'text-emerald-400' : 'text-slate-500'}>{hasQueries ? 'Data Flowing' : 'Awaiting Data'}</span>
            </span>
          </div>
        </div>

        {/* System Architecture */}
        <div className="glass-card p-3">
          <h3 className="text-xs uppercase tracking-widest text-slate-400 font-bold font-mono mb-2.5 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-pink-400" />
            Active Stack
          </h3>
          <div className="space-y-1.5 text-xs">
            <InfoRow label="RAG Pipelines" value="Fixed, Recursive, Semantic, Adaptive" />
            <InfoRow label="Vector Engine" value="ChromaDB v0.4" />
            <InfoRow label="Embeddings" value="all-MiniLM-L6-v2" />
            <InfoRow label="LLM Generator" value={loading ? '...' : (stats?.active_model || 'Not configured')} />
            <InfoRow label="LLM Provider" value={loading ? '...' : (stats?.active_provider || 'none')} />
            <InfoRow label="Avg Latency" value={loading ? '...' : hasQueries ? `${(stats?.avg_response_time_ms ?? 0).toFixed(1)}ms` : 'N/A'} highlight />
          </div>
        </div>

        {/* Live Counters */}
        <div className="glass-card p-3">
          <div className="grid grid-cols-2 gap-2.5">
            <StatBox icon={Database} label="Docs Indexed" value={loading ? '...' : (stats?.documents_indexed ?? 0)} color="text-emerald-400" />
            <StatBox icon={Activity} label="Queries Answered" value={loading ? '...' : (stats?.queries_answered ?? 0)} color="text-cyan" />
            <StatBox icon={HardDrive} label="Total Chunks" value={loading ? '...' : (stats?.total_chunks ?? 0)} color="text-pink-400" />
            <StatBox icon={Zap} label="Strategies" value={loading ? '...' : (stats?.strategies_available ?? 4)} color="text-purple" />
          </div>
        </div>
      </div>
    </aside>
  );
}

function MetricRow({ icon: Icon, label, value, color, barWidth, indicator }) {
  return (
    <div className="glass-card p-2.5 hover:border-cyan/30 transition-all group">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${color}`} />
          <span className="text-xs font-semibold text-slate-300">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          {indicator && (
            <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-emerald-500/20 text-emerald-400">
              {indicator}
            </span>
          )}
          <span className={`text-xs font-bold font-mono ${color}`}>{value}</span>
        </div>
      </div>
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${
            barWidth > 80 ? 'bg-gradient-to-r from-pink-500 via-purple to-cyan' :
            barWidth > 50 ? 'bg-gradient-to-r from-purple to-cyan' :
            'bg-gradient-to-r from-amber-500 to-red-500'
          }`}
          style={{ width: `${Math.min(100, Math.max(0, barWidth))}%` }}
        />
      </div>
    </div>
  );
}

function InfoRow({ label, value, highlight }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
      <span className="text-slate-400 text-xs">{label}</span>
      <span className={`font-mono font-semibold text-xs text-right max-w-[140px] truncate ${highlight ? 'text-cyan' : 'text-slate-200'}`}>
        {value}
      </span>
    </div>
  );
}

function StatBox({ icon: Icon, label, value, color }) {
  return (
    <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-center">
      <Icon className={`w-4 h-4 ${color} mx-auto mb-1`} />
      <p className="text-sm font-bold font-mono text-white">{value}</p>
      <p className="text-[9px] text-slate-400 font-mono uppercase mt-0.5">{label}</p>
    </div>
  );
}
