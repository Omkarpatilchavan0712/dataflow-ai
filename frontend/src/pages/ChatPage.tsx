import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, Database, Sparkles, User, Bot, BarChart3, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { analyticsApi, datasetsApi, getErrorMessage } from '../lib/api';
import ChartRenderer from '../components/charts/ChartRenderer';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import type { ChatMessage, Dataset, Chart } from '../types';

const SUGGESTED_QUESTIONS = [
  'What is the total revenue?',
  'Show me the top 10 categories',
  'Which month had the highest sales?',
  'What are the missing values?',
  'Show distribution by category',
  'What are the correlations?',
  'Summarize this dataset',
  'Show me the trends over time',
];

export default function ChatPage() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingDatasets, setLoadingDatasets] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadDatasets();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadDatasets = async () => {
    try {
      const response = await datasetsApi.list();
      const ready = response.data.filter((d: Dataset) => d.status === 'ready');
      setDatasets(ready);
      if (ready.length > 0) setSelectedDataset(ready[0]);
    } catch {
      toast.error('Failed to load datasets');
    } finally {
      setLoadingDatasets(false);
    }
  };

  const sendMessage = async (question: string = input) => {
    if (!question.trim() || !selectedDataset || loading) return;
    const q = question.trim();
    setInput('');

    const userMessage: ChatMessage = { role: 'user', content: q, timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      const history = messages.slice(-6).map((m) => ({ role: m.role, content: m.content }));
      const response = await analyticsApi.chat(selectedDataset.id, q, history);
      const { answer, chart } = response.data;

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: answer,
        chart,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `Sorry, I couldn't process that question. ${getErrorMessage(err)}`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => setMessages([]);

  const renderMarkdown = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br/>');
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-10rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <MessageSquare size={22} className="text-brand-600" />
            AI Chat
          </h1>
          <p className="text-sm text-slate-500">Ask questions about your data in plain English</p>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button onClick={clearChat} className="btn-ghost text-sm">
              <RefreshCw size={14} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Dataset selector */}
      <div className="card p-3 mb-4">
        <div className="flex items-center gap-3">
          <Database size={16} className="text-slate-400 shrink-0" />
          <span className="text-sm text-slate-600 shrink-0">Chatting with:</span>
          {loadingDatasets ? (
            <LoadingSpinner size="sm" />
          ) : datasets.length === 0 ? (
            <span className="text-sm text-slate-400">No ready datasets. Upload one first.</span>
          ) : (
            <select
              className="flex-1 text-sm bg-transparent text-slate-900 font-medium border-none outline-none cursor-pointer"
              value={selectedDataset?.id || ''}
              onChange={(e) => setSelectedDataset(datasets.find((d) => d.id === parseInt(e.target.value)) || null)}
            >
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>{d.name} ({d.row_count?.toLocaleString()} rows)</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.length === 0 && (
          <div className="text-center py-10">
            <div className="w-16 h-16 rounded-2xl gradient-brand flex items-center justify-center mx-auto mb-4">
              <Sparkles size={28} className="text-white" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Ask Anything About Your Data</h2>
            <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">
              I can answer questions, show statistics, create charts, and explain patterns in your dataset.
            </p>
            {selectedDataset && (
              <div className="flex flex-wrap gap-2 justify-center">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="px-3 py-1.5 rounded-full text-sm bg-white border border-slate-200 text-slate-600 hover:border-brand-400 hover:text-brand-600 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <AnimatePresence>
          {messages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full gradient-brand flex items-center justify-center shrink-0 mt-1">
                  <Bot size={16} className="text-white" />
                </div>
              )}
              <div className={`max-w-[80%] ${msg.role === 'user' ? 'order-first' : ''}`}>
                <div className={`rounded-2xl px-4 py-3 text-sm ${
                  msg.role === 'user'
                    ? 'bg-brand-600 text-white rounded-tr-md'
                    : 'bg-white border border-slate-200 text-slate-800 rounded-tl-md'
                }`}>
                  <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
                </div>
                {msg.chart && (
                  <div className="mt-2 card p-4">
                    <ChartRenderer
                      chart={{
                        id: `chat-${idx}`,
                        type: msg.chart.type as any,
                        title: msg.chart.title,
                        data: msg.chart.data,
                        size: 'medium',
                      }}
                      height={280}
                    />
                  </div>
                )}
                <p className="text-xs text-slate-400 mt-1 px-1">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </p>
              </div>
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0 mt-1">
                  <User size={16} className="text-slate-600" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full gradient-brand flex items-center justify-center shrink-0">
              <Bot size={16} className="text-white" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-md px-4 py-3">
              <div className="flex gap-1 items-center">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 rounded-full bg-slate-400"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="card p-3">
        <div className="flex gap-3 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={selectedDataset ? `Ask about ${selectedDataset.name}...` : 'Select a dataset first'}
            disabled={!selectedDataset || loading}
            rows={1}
            className="flex-1 resize-none text-sm text-slate-900 placeholder-slate-400 bg-transparent border-none outline-none max-h-32"
            style={{ lineHeight: '1.5' }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || !selectedDataset || loading}
            className="btn-primary py-2 px-3 shrink-0 disabled:opacity-50"
          >
            {loading ? <LoadingSpinner size="sm" /> : <Send size={16} />}
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-2">Press Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}
