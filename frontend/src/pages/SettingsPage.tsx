import React from 'react';
import { Settings, Database, Shield, Bell, Palette } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Settings size={22} /> Settings</h1>
        <p className="text-sm text-slate-500">Application configuration</p>
      </div>

      {[
        {
          icon: Database,
          title: 'Data Processing',
          items: [
            { label: 'Max file size', value: '100 MB', note: 'Configure in backend .env' },
            { label: 'Sample rows limit', value: '50,000 rows', note: 'For large dataset performance' },
            { label: 'Supported formats', value: 'CSV, Excel, JSON, XML, Parquet, HTML, SQL, ZIP, TXT' },
          ]
        },
        {
          icon: Shield,
          title: 'Security',
          items: [
            { label: 'Session timeout', value: '60 minutes' },
            { label: 'Password requirements', value: 'Min 8 characters' },
            { label: 'Data isolation', value: 'Per-user, enforced at API level' },
          ]
        },
        {
          icon: Palette,
          title: 'Dashboard Themes',
          items: [
            { label: 'Available themes', value: 'Modern Light, Dark Professional, Midnight Blue, Minimal White' },
            { label: 'Default theme', value: 'Modern Light' },
          ]
        },
      ].map((section) => (
        <div key={section.title} className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <section.icon size={16} className="text-slate-500" />
            <h2 className="text-base font-semibold text-slate-900">{section.title}</h2>
          </div>
          <div className="space-y-3">
            {section.items.map((item) => (
              <div key={item.label} className="flex items-start justify-between gap-4 py-2 border-b border-slate-100 last:border-0">
                <div>
                  <p className="text-sm font-medium text-slate-700">{item.label}</p>
                  {item.note && <p className="text-xs text-slate-400 mt-0.5">{item.note}</p>}
                </div>
                <span className="text-sm text-slate-500 text-right">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="card p-5 bg-brand-50 border-brand-100">
        <h2 className="text-sm font-semibold text-brand-900 mb-2">AI Configuration</h2>
        <p className="text-sm text-brand-700">
          To enable OpenAI-powered insights and chat, add your API key to the backend <code className="bg-white/80 px-1 rounded text-xs">.env</code> file:
        </p>
        <code className="block mt-2 p-3 bg-white rounded-lg text-xs text-slate-700 border border-brand-200">
          OPENAI_API_KEY=sk-your-key-here
        </code>
        <p className="text-xs text-brand-600 mt-2">The app works fully without an AI API using rule-based analytics.</p>
      </div>
    </div>
  );
}
