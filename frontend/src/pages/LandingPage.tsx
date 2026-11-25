import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BarChart3, Upload, Sparkles, Zap, Shield, Download, ArrowRight, CheckCircle, TrendingUp, Database, MessageSquare } from 'lucide-react';

const features = [
  { icon: Upload, title: 'Universal Upload', desc: 'CSV, Excel, JSON, XML, Parquet, SQL exports and more. Drop any file and get started instantly.', color: 'text-blue-600 bg-blue-50' },
  { icon: Sparkles, title: 'AI Analysis', desc: 'Automatic data profiling, outlier detection, trend identification, and business insight generation.', color: 'text-purple-600 bg-purple-50' },
  { icon: Zap, title: 'Auto Dashboard', desc: 'Upload your data and get a complete, beautiful dashboard in seconds. No manual chart building required.', color: 'text-yellow-600 bg-yellow-50' },
  { icon: MessageSquare, title: 'Chat With Data', desc: 'Ask natural language questions about your data. Get instant answers backed by real calculations.', color: 'text-emerald-600 bg-emerald-50' },
  { icon: TrendingUp, title: 'Smart Insights', desc: 'AI-generated insights with actual numbers: trends, correlations, anomalies and business recommendations.', color: 'text-orange-600 bg-orange-50' },
  { icon: Download, title: 'Professional Export', desc: 'Export dashboards as PDF reports, download data as CSV or Excel, share public dashboard links.', color: 'text-indigo-600 bg-indigo-50' },
];

const stats = [
  { value: '10+', label: 'File Formats' },
  { value: '20+', label: 'Chart Types' },
  { value: '100%', label: 'Automatic' },
  { value: 'AI', label: 'Powered' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center">
              <BarChart3 size={18} className="text-white" />
            </div>
            <span className="text-lg font-bold text-slate-900">DataFlow AI</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="btn-ghost text-slate-700">Sign In</Link>
            <Link to="/register" className="btn-primary">Get Started Free</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-sm font-medium mb-6">
              <Sparkles size={14} />
              AI-Powered Business Intelligence
            </div>
            <h1 className="text-5xl sm:text-6xl font-extrabold text-slate-900 mb-5 leading-tight text-balance">
              Turn Your Data Into
              <br />
              <span className="gradient-text">Decisions</span>
            </h1>
            <p className="text-xl text-slate-500 mb-8 max-w-2xl mx-auto text-balance">
              Upload any data file and get a complete, interactive analytics dashboard in seconds.
              No setup. No configuration. Just results.
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Link to="/register" className="btn-primary text-base px-6 py-3">
                Start for Free
                <ArrowRight size={18} />
              </Link>
              <Link to="/login" className="btn-secondary text-base px-6 py-3">
                Sign In
              </Link>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-16 pt-10 border-t border-slate-200"
          >
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-black text-slate-900 mb-1">{stat.value}</div>
                <div className="text-sm text-slate-500">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">How It Works</h2>
            <p className="text-slate-500">From raw data to insights in three steps</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Upload Your Data', desc: 'Drag & drop any supported file. We handle CSV, Excel, JSON, XML, Parquet and more.', icon: Upload },
              { step: '02', title: 'AI Analyses It', desc: 'Our engine reads your data, detects types, finds patterns, and identifies key metrics.', icon: Sparkles },
              { step: '03', title: 'Get Your Dashboard', desc: 'An interactive, professional dashboard is generated automatically with the right charts.', icon: BarChart3 },
            ].map((item) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="relative"
              >
                <div className="card p-6 h-full">
                  <div className="text-5xl font-black text-slate-100 mb-3">{item.step}</div>
                  <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center mb-3">
                    <item.icon size={20} className="text-white" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 mb-2">{item.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">Everything You Need</h2>
            <p className="text-slate-500">A complete analytics platform in one application</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="card p-6 hover:shadow-card-hover transition-shadow"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${feature.color}`}>
                  <feature.icon size={20} />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Supported formats */}
      <section className="py-16 px-6 bg-brand-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-white mb-3">Supports Every Data Format</h2>
          <p className="text-brand-200 mb-8">Upload your file in any format - we handle the rest</p>
          <div className="flex flex-wrap justify-center gap-3">
            {['CSV', 'Excel (.xlsx)', 'JSON', 'XML', 'Parquet', 'HTML Tables', 'SQL Export', 'ZIP Archive', 'TXT'].map((fmt) => (
              <span key={fmt} className="px-4 py-2 rounded-full bg-white/10 text-white text-sm font-medium border border-white/20">
                {fmt}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-16 h-16 rounded-2xl gradient-brand flex items-center justify-center mx-auto mb-6">
            <Zap size={28} className="text-white" />
          </div>
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Ready to Turn Data Into Decisions?</h2>
          <p className="text-slate-500 mb-8">Create your free account and upload your first dataset today.</p>
          <Link to="/register" className="btn-primary text-base px-8 py-3">
            Get Started for Free
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded gradient-brand flex items-center justify-center">
              <BarChart3 size={13} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-slate-700">DataFlow AI</span>
            <span className="text-sm text-slate-400">— Turn Your Data Into Decisions</span>
          </div>
          <p className="text-xs text-slate-400">© {new Date().getFullYear()} DataFlow AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
