import React, { useState, useEffect } from 'react';
import {
  Activity, Cpu, HardDrive, Gauge, ShieldCheck, AlertTriangle,
  Database, Wifi, Server, Clock, Zap
} from 'lucide-react';

const nodeGrid = Array.from({ length: 12 }, (_, i) => ({
  id: `N-${String(i + 1).padStart(2, '0')}`,
  status: i === 7 ? 'error' : i === 3 ? 'warning' : 'active',
}));

export default function RightPanel() {
  const [metrics, setMetrics] = useState({
    accuracy: 99.2,
    processingTime: 720,
    retrievalPrecision: 98.8,
    fraudScore: 97.4,
    hallucinationRisk: 0.01,
    gpuUsage: 58.4,
    tokensPerSec: 148,
    activeSessions: 52,
    uptime: 99.99,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => ({
        ...prev,
        accuracy: +(prev.accuracy + (Math.random() - 0.5) * 0.1).toFixed(1),
        processingTime: Math.max(450, Math.min(1000, prev.processingTime + Math.floor((Math.random() - 0.5) * 20))),
        tokensPerSec: Math.max(120, Math.min(180, prev.tokensPerSec + Math.floor((Math.random() - 0.5) * 5))),
        activeSessions: Math.max(40, Math.min(70, prev.activeSessions + Math.floor((Math.random() - 0.5) * 2))),
        gpuUsage: +(prev.gpuUsage + (Math.random() - 0.5) * 0.4).toFixed(1),
      }));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <aside className="w-80 h-full border-l border-white/10 bg-[#070C1E]/80 backdrop-blur-2xl overflow-y-auto flex-shrink-0 hidden xl:block z-30">
      <div className="p-4 space-y-5">
        {/* System Health Header */}
        <div>
          <h3 className="text-xs uppercase tracking-widest text-slate-400 font-bold font-mono mb-3 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan" />
              Live Telemetry
            </span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-cyan/10 text-cyan border border-cyan/20">
              REALTIME
            </span>
          </h3>

          <div className="space-y-2.5">
            <MetricRow icon={ShieldCheck} label="AI Precision" value={`${metrics.accuracy}%`} color="text-emerald-400" barWidth={metrics.accuracy} />
            <MetricRow icon={Clock} label="Retrieval Time" value={`${metrics.processingTime}ms`} color="text-cyan" barWidth={100 - metrics.processingTime / 12} />
            <MetricRow icon={Gauge} label="Context Relevance" value={`${metrics.retrievalPrecision}%`} color="text-pink-400" barWidth={metrics.retrievalPrecision} />
            <MetricRow icon={ShieldCheck} label="Grounding Verifier" value={`${metrics.fraudScore}%`} color="text-purple" barWidth={metrics.fraudScore} />
            <MetricRow icon={AlertTriangle} label="Hallucination Risk" value={`${metrics.hallucinationRisk}`} color="text-emerald-400" barWidth={(1 - metrics.hallucinationRisk) * 100} indicator="SAFE" />
          </div>
        </div>

        {/* Neural Node Status */}
        <div className="glass-card p-4">
          <h3 className="text-xs uppercase tracking-widest text-slate-400 font-bold font-mono mb-3 flex items-center gap-2">
            <Server className="w-4 h-4 text-purple" />
            Neural Cluster Matrix
          </h3>
          <div className="grid grid-cols-4 gap-1.5">
            {nodeGrid.map(node => (
              <div
                key={node.id}
                className={`h-9 rounded-lg flex items-center justify-center text-[10px] font-mono font-bold cursor-pointer transition-all hover:scale-105 border ${
                  node.status === 'active'
                    ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan'
                    : node.status === 'warning'
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                    : 'bg-red-500/10 border-red-500/30 text-red-400 animate-pulse'
                }`}
              >
                {node.id.split('-')[1]}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between mt-3 text-[10px] text-slate-400 font-mono">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-cyan" /> Ready</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" /> High Load</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-400" /> Offline</span>
          </div>
        </div>

        {/* System Architecture */}
        <div className="glass-card p-4">
          <h3 className="text-xs uppercase tracking-widest text-slate-400 font-bold font-mono mb-3 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-pink-400" />
            Active Stack
          </h3>
          <div className="space-y-2 text-xs">
            <InfoRow label="RAG Pipelines" value="Fixed, Recursive, Semantic, Adaptive" />
            <InfoRow label="Vector Engine" value="ChromaDB v0.4" />
            <InfoRow label="Embeddings" value="all-MiniLM-L6-v2" />
            <InfoRow label="LLM Generator" value="Google Gemini 1.5 Pro" />
            <InfoRow label="Context Limit" value="1,000,000 Tokens" />
            <InfoRow label="System Latency" value="1.8ms" highlight />
          </div>
        </div>

        {/* Live Counters */}
        <div className="glass-card p-4">
          <div className="grid grid-cols-2 gap-3">
            <StatBox icon={HardDrive} label="GPU VRAM" value={`${metrics.gpuUsage} GB`} color="text-pink-400" />
            <StatBox icon={Zap} label="Tokens / Sec" value={`${metrics.tokensPerSec}`} color="text-cyan" />
            <StatBox icon={Wifi} label="Active Threads" value={`${metrics.activeSessions}`} color="text-purple" />
            <StatBox icon={Database} label="Indexed Embeddings" value="184K" color="text-emerald-400" />
          </div>
        </div>
      </div>
    </aside>
  );
}

function MetricRow({ icon: Icon, label, value, color, barWidth, indicator }) {
  return (
    <div className="glass-card p-3 hover:border-cyan/30 transition-all group">
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
