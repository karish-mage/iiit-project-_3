import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Play, Upload, MessageSquare, GitCompare, Shield,
  ArrowRight, FileText, Search, CheckCircle2, BarChart3, Sparkles,
  HelpCircle, Cpu, Zap, Layers
} from 'lucide-react';

const steps = [
  {
    num: '01',
    icon: Upload,
    title: 'Upload Insurance Policies & Customer Records',
    desc: 'Navigate to Data Ingestion. Drag-and-drop your policy PDFs or customer spreadsheets (.csv, .xlsx, .json). Text and tabular data are extracted via layout-aware parsers and stored across 4 distinct chunking strategy collections in ChromaDB simultaneously.',
    tag: 'INGESTION',
  },
  {
    num: '02',
    icon: MessageSquare,
    title: 'Ask Policy Questions in AI Assistant',
    desc: 'Head to the AI Assistant tab and submit any complex policy question. The backend triggers parallel vector search across all four strategy collections, evaluates retrieval accuracy live, and selects the winner for response generation.',
    tag: 'RAG SEARCH',
  },
  {
    num: '03',
    icon: GitCompare,
    title: 'Compare 4 Chunking Strategies Side-by-Side',
    desc: 'Open Strategy Bench to compare Fixed, Recursive, Semantic, and Adaptive chunking. View exact retrieved text chunks, cosine similarity scores, latency, and Precision@K vs Recall@K metrics per query.',
    tag: 'BENCHMARKING',
  },
  {
    num: '04',
    icon: Shield,
    title: 'Verify Grounded Evidence & Clause Citations',
    desc: 'Every AI-generated answer comes with clause-level citations and PDF page numbers. The Verification Engine flags unsupported statements and displays a grounding confidence score (0-100%).',
    tag: 'GROUNDING',
  },
];

export default function TutorialPage() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-12 space-y-12">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4"
      >
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan text-xs font-mono font-bold">
          <HelpCircle className="w-4 h-4 text-cyan" /> ARCHITECTURE GUIDANCE
        </div>
        <h1 className="text-4xl md:text-6xl font-black text-white">
          How to Master <span className="gradient-text-pink">Insurance Division</span>
        </h1>
        <p className="text-slate-300 max-w-2xl mx-auto text-base">
          A step-by-step walkthrough of the RAG pipeline — from raw PDF upload to verified evidence answers.
        </p>
      </motion.div>

      {/* Embedded Video Showcase */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="glass-card-neon p-3 rounded-3xl"
      >
        <div className="relative w-full overflow-hidden rounded-2xl bg-obsidian-900 border border-white/10 flex items-center justify-center" style={{ minHeight: '320px' }}>
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500/20 to-purple/20 border border-pink-500/30 flex items-center justify-center mx-auto">
              <Play className="w-8 h-8 text-pink-400" />
            </div>
            <p className="text-sm font-bold text-white">System Demo Walkthrough</p>
            <p className="text-xs text-slate-400 font-mono">Video coming soon</p>
          </div>
        </div>
      </motion.div>

      {/* Detailed Walkthrough Cards */}
      <div className="space-y-6">
        {steps.map((step, i) => (
          <motion.div
            key={step.num}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="glass-card p-6 md:p-8 flex flex-col md:flex-row items-start gap-6 hover:border-pink-500/30 transition-all"
          >
            <div className="flex-shrink-0 flex flex-col items-center">
              <span className="text-5xl font-black font-mono gradient-text-pink opacity-50">{step.num}</span>
              <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-white/5 text-cyan border border-cyan/20 mt-1">
                {step.tag}
              </span>
            </div>
            <div className="flex items-start gap-4 flex-1">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500/20 to-purple/20 border border-pink-500/30 flex items-center justify-center flex-shrink-0 mt-1">
                <step.icon className="w-6 h-6 text-pink-400" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white">{step.title}</h3>
                <p className="text-sm text-slate-300 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Strategy Summary Comparison Table */}
      <div className="glass-card p-8 space-y-6">
        <div className="flex items-center gap-3">
          <Layers className="w-6 h-6 text-cyan" />
          <h2 className="text-2xl font-bold text-white">4 Chunking Strategies Overview</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider">
                <th className="pb-3 pr-4">Strategy</th>
                <th className="pb-3 pr-4">Chunking Logic</th>
                <th className="pb-3 pr-4">Best Used For</th>
                <th className="pb-3">Typical Accuracy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300">
              <tr>
                <td className="py-3 font-bold text-cyan">Fixed-Size</td>
                <td className="py-3">Fixed character length (500 chars, 50 overlap)</td>
                <td className="py-3">Simple structured policies</td>
                <td className="py-3 text-emerald-400">75% - 82%</td>
              </tr>
              <tr>
                <td className="py-3 font-bold text-purple">Recursive</td>
                <td className="py-3">Hierarchical split by paragraphs &amp; headers</td>
                <td className="py-3">Multi-page standard contracts</td>
                <td className="py-3 text-emerald-400">83% - 89%</td>
              </tr>
              <tr>
                <td className="py-3 font-bold text-amber-400">Semantic</td>
                <td className="py-3">Embedding distance threshold breaks</td>
                <td className="py-3">Complex policy riders &amp; addendums</td>
                <td className="py-3 text-emerald-400">88% - 94%</td>
              </tr>
              <tr>
                <td className="py-3 font-bold text-pink-400">Adaptive (Winner)</td>
                <td className="py-3">Dynamic score-weighted hybrid selection</td>
                <td className="py-3">All query types &amp; edge cases</td>
                <td className="py-3 text-emerald-400 font-bold">95% - 99%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* CTA Bottom Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="glass-card-neon p-8 text-center space-y-4"
      >
        <h2 className="text-2xl font-bold text-white">Ready to test your policy documents?</h2>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/upload" className="btn-gradient px-8 py-3.5 text-sm font-bold">
            <Upload className="w-4 h-4" /> Go to Data Ingestion
          </Link>
          <Link to="/query" className="btn-ghost px-8 py-3.5 text-sm font-bold">
            Open AI Assistant <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
