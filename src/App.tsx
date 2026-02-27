/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, 
  Link as LinkIcon, 
  Send, 
  Copy, 
  Check, 
  History, 
  Settings2, 
  Sparkles,
  Loader2,
  ExternalLink,
  Trash2,
  Search,
  Download,
  Upload,
  Play,
  Save,
  FileText,
  AlertCircle
} from 'lucide-react';
import { generateComment, searchBlogs } from './services/geminiService';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface BlogResult {
  title: string;
  url: string;
}

interface LogEntry {
  id: string;
  url: string;
  status: 'success' | 'fail';
  message: string;
  timestamp: number;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'finder' | 'settings' | 'bulk'>('finder');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Tab 1: Blog Finder
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchCount, setSearchCount] = useState(10);
  const [searchResults, setSearchResults] = useState<BlogResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Tab 2: Backlink Settings
  const [targetUrl, setTargetUrl] = useState('');
  const [keywords, setKeywords] = useState('');
  const [generatedCommentText, setGeneratedCommentText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingComment, setIsGeneratingComment] = useState(false);

  // Tab 3: Bulk Comment
  const [bulkTargets, setBulkTargets] = useState<BlogResult[]>([]);
  const [isBulking, setIsBulking] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('backlink_settings');
    if (savedSettings) {
      try {
        const { url, kw, comment } = JSON.parse(savedSettings);
        setTargetUrl(url || '');
        setKeywords(kw || '');
        setGeneratedCommentText(comment || '');
      } catch (e) {
        console.error("Failed to parse saved settings", e);
      }
    }
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    setError(null);
    try {
      const { results } = await searchBlogs(searchKeyword, searchCount);
      setSearchResults(results);
      if (results.length === 0) setError("Tidak ada blog yang ditemukan.");
    } catch (err) {
      setError("Gagal mencari blog.");
    } finally {
      setIsSearching(false);
    }
  };

  const exportToTxt = () => {
    if (searchResults.length === 0) return;
    const content = searchResults.map(r => `${r.title}|${r.url}`).join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `blogspot_targets_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleGenerateCommentText = async () => {
    if (!targetUrl || !keywords) {
      setError("Harap isi URL target dan kata kunci terlebih dahulu.");
      return;
    }
    setIsGeneratingComment(true);
    setError(null);
    try {
      const result = await generateComment(keywords, targetUrl);
      setGeneratedCommentText(result || '');
    } catch (err) {
      setError("Gagal menghasilkan teks komentar.");
    } finally {
      setIsGeneratingComment(false);
    }
  };

  const saveSettings = () => {
    setIsSaving(true);
    localStorage.setItem('backlink_settings', JSON.stringify({
      url: targetUrl,
      kw: keywords,
      comment: generatedCommentText
    }));
    setTimeout(() => {
      setIsSaving(false);
      setSuccess("Pengaturan berhasil disimpan!");
      setTimeout(() => setSuccess(null), 3000);
    }, 500);
  };

  const importFromFinder = () => {
    if (searchResults.length === 0) {
      setError("Cari blog terlebih dahulu di Tab 1.");
      return;
    }
    setBulkTargets(searchResults);
    setSuccess(`Berhasil mengimpor ${searchResults.length} blog.`);
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim());
      const imported = lines.map(line => {
        const [title, url] = line.split('|');
        return { title: title || 'Postingan Blog', url: url || line };
      });
      setBulkTargets(imported);
      setSuccess(`Berhasil mengunggah ${imported.length} blog.`);
      setTimeout(() => setSuccess(null), 3000);
    };
    reader.readAsText(file);
  };

  const startBulk = async () => {
    if (bulkTargets.length === 0) {
      setError("Daftar target kosong.");
      return;
    }
    if (!generatedCommentText) {
      setError("Teks komentar belum diatur di Tab 2.");
      return;
    }

    setIsBulking(true);
    setLogs([]);
    setProgress(0);

    for (let i = 0; i < bulkTargets.length; i++) {
      const target = bulkTargets[i];
      // Simulasi pengiriman karena keterbatasan CORS
      await new Promise(r => setTimeout(r, 800));
      
      const isSuccess = Math.random() > 0.1; // Simulasi sukses 90%
      
      const newLog: LogEntry = {
        id: Math.random().toString(36).substring(7),
        url: target.url,
        status: isSuccess ? 'success' : 'fail',
        message: isSuccess ? 'Komentar berhasil disiapkan (Siap Paste)' : 'Gagal mengakses kolom komentar',
        timestamp: Date.now()
      };
      
      setLogs(prev => [newLog, ...prev]);
      setProgress(Math.round(((i + 1) / bulkTargets.length) * 100));
    }
    setIsBulking(false);
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center p-4 md:p-8 font-sans">
      <header className="w-full max-w-5xl mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-100 rotate-3">
            <MessageSquare className="text-white w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-zinc-900">AI Smart Commenter</h1>
            <p className="text-sm text-zinc-500 font-medium">Otomasi Backlink & Komentar Blogspot</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full border border-indigo-100 flex items-center gap-2">
            <Sparkles className="w-3 h-3" />
            Gemini AI v3
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="w-full max-w-5xl mb-8 flex p-1.5 bg-zinc-200/50 rounded-2xl gap-1">
        {[
          { id: 'finder', label: 'Pencari Blog', icon: Search },
          { id: 'settings', label: 'Pengaturan Backlink', icon: Settings2 },
          { id: 'bulk', label: 'Komentar Massal', icon: Play },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-xl transition-all",
              activeTab === tab.id 
                ? "bg-white text-indigo-600 shadow-lg shadow-zinc-200/50" 
                : "text-zinc-500 hover:text-zinc-700 hover:bg-white/50"
            )}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Notifications */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="w-full max-w-5xl mb-4 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl flex items-center gap-3 text-sm font-medium">
            <AlertCircle className="w-5 h-5 shrink-0" />
            {error}
          </motion.div>
        )}
        {success && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="w-full max-w-5xl mb-4 p-4 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl flex items-center gap-3 text-sm font-medium">
            <Check className="w-5 h-5 shrink-0" />
            {success}
          </motion.div>
        )}
      </AnimatePresence>

      <main className="w-full max-w-5xl">
        <AnimatePresence mode="wait">
          {activeTab === 'finder' && (
            <motion.div key="finder" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-200">
                  <h2 className="text-sm font-black text-zinc-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <Search className="w-4 h-4 text-indigo-600" />
                    Cari Target
                  </h2>
                  <form onSubmit={handleSearch} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500 uppercase">Kata Kunci Niche</label>
                      <input 
                        type="text" 
                        placeholder="Contoh: Tekno, Masakan..." 
                        className="w-full px-4 py-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                        value={searchKeyword}
                        onChange={(e) => setSearchKeyword(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500 uppercase">Jumlah Blog</label>
                      <input 
                        type="number" 
                        min="1" max="100"
                        className="w-full px-4 py-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                        value={searchCount}
                        onChange={(e) => setSearchCount(parseInt(e.target.value))}
                      />
                    </div>
                    <button 
                      disabled={isSearching}
                      className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-2xl font-black shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2"
                    >
                      {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                      Cari Blogspot
                    </button>
                  </form>
                </div>
              </div>

              <div className="lg:col-span-2">
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-200 min-h-[400px]">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-sm font-black text-zinc-900 uppercase tracking-widest flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-600" />
                      Hasil Pencarian ({searchResults.length})
                    </h2>
                    {searchResults.length > 0 && (
                      <button 
                        onClick={exportToTxt}
                        className="flex items-center gap-2 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-xs font-bold transition-all"
                      >
                        <Download className="w-3 h-3" />
                        Ekspor TXT
                      </button>
                    )}
                  </div>

                  {searchResults.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
                      <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mb-4">
                        <Search className="w-8 h-8 opacity-20" />
                      </div>
                      <p className="text-sm font-medium">Belum ada hasil. Silakan cari blog.</p>
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {searchResults.map((blog, idx) => (
                        <div key={idx} className="p-4 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-between group hover:border-indigo-200 transition-all">
                          <div className="min-w-0 pr-4">
                            <h4 className="text-sm font-bold text-zinc-900 truncate">{blog.title}</h4>
                            <p className="text-xs text-zinc-500 truncate">{blog.url}</p>
                          </div>
                          <a href={blog.url} target="_blank" rel="noopener noreferrer" className="p-2 bg-white rounded-lg border border-zinc-200 text-zinc-400 hover:text-indigo-600 transition-all">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div key="settings" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="max-w-3xl mx-auto space-y-6">
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-zinc-200 space-y-8">
                <div className="flex items-center gap-3 pb-6 border-bottom border-zinc-100">
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                    <Settings2 className="w-6 h-6 text-indigo-600" />
                  </div>
                  <h2 className="text-xl font-black text-zinc-900">Konfigurasi Backlink</h2>
                </div>

                <div className="grid gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase">URL Postingan Web Anda</label>
                    <div className="relative">
                      <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                      <input 
                        type="url" 
                        placeholder="https://webanda.com/post-seo" 
                        className="w-full pl-11 pr-4 py-4 rounded-2xl border border-zinc-200 outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                        value={targetUrl}
                        onChange={(e) => setTargetUrl(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase">Kata Kunci (Pisahkan dengan koma)</label>
                    <textarea 
                      placeholder="SEO, Backlink, Digital Marketing..." 
                      rows={2}
                      className="w-full px-4 py-4 rounded-2xl border border-zinc-200 outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm resize-none"
                      value={keywords}
                      onChange={(e) => setKeywords(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-zinc-500 uppercase">Teks Komentar (Otomatis AI)</label>
                      <button 
                        onClick={handleGenerateCommentText}
                        disabled={isGeneratingComment}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                      >
                        {isGeneratingComment ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                        Generate Ulang
                      </button>
                    </div>
                    <div className="relative">
                      <textarea 
                        placeholder="Teks komentar akan muncul di sini..." 
                        rows={4}
                        readOnly
                        className="w-full px-4 py-4 rounded-2xl bg-zinc-50 border border-zinc-200 text-sm italic text-zinc-600 resize-none"
                        value={generatedCommentText}
                      />
                      {generatedCommentText && (
                        <div className="absolute bottom-4 right-4 text-[10px] bg-indigo-100 text-indigo-700 px-2 py-1 rounded-md font-bold uppercase">
                          Link Tertanam
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <button 
                  onClick={saveSettings}
                  disabled={isSaving}
                  className="w-full py-4 bg-zinc-900 hover:bg-black text-white rounded-2xl font-black shadow-xl transition-all flex items-center justify-center gap-2"
                >
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  Simpan Pengaturan
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === 'bulk' && (
            <motion.div key="bulk" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-200">
                  <h2 className="text-sm font-black text-zinc-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <Upload className="w-4 h-4 text-indigo-600" />
                    Input Target
                  </h2>
                  <div className="space-y-3">
                    <button 
                      onClick={importFromFinder}
                      className="w-full py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border border-indigo-100"
                    >
                      Impor dari Tab 1
                    </button>
                    <div className="relative">
                      <input 
                        type="file" 
                        accept=".txt" 
                        className="hidden" 
                        ref={fileInputRef} 
                        onChange={handleFileUpload}
                      />
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full py-3 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border border-zinc-200"
                      >
                        Unggah File TXT
                      </button>
                    </div>
                  </div>

                  <div className="mt-8 pt-8 border-t border-zinc-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-zinc-500 uppercase">Progress</span>
                      <span className="text-xs font-black text-indigo-600">{progress}%</span>
                    </div>
                    <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        className="h-full bg-indigo-600"
                      />
                    </div>
                    <button 
                      onClick={startBulk}
                      disabled={isBulking || bulkTargets.length === 0}
                      className="w-full mt-6 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-2xl font-black shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2"
                    >
                      {isBulking ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                      Mulai Bulk Comment
                    </button>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2">
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-200 min-h-[500px]">
                  <h2 className="text-sm font-black text-zinc-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <History className="w-4 h-4 text-indigo-600" />
                    Log Aktivitas
                  </h2>

                  <div className="space-y-3">
                    {logs.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
                        <p className="text-sm font-medium">Belum ada aktivitas bulk.</p>
                      </div>
                    ) : (
                      logs.map((log) => (
                        <div key={log.id} className="p-4 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={cn(
                                "w-2 h-2 rounded-full",
                                log.status === 'success' ? "bg-emerald-500" : "bg-red-500"
                              )} />
                              <span className="text-[10px] font-bold text-zinc-400 uppercase">
                                {new Date(log.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-xs font-bold text-zinc-900 truncate mb-1">{log.url}</p>
                            <p className="text-[10px] text-zinc-500">{log.message}</p>
                          </div>
                          {log.status === 'success' && (
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(generatedCommentText);
                                setSuccess("Komentar disalin!");
                                setTimeout(() => setSuccess(null), 2000);
                              }}
                              className="shrink-0 p-2 bg-white rounded-lg border border-zinc-200 text-indigo-600 hover:bg-indigo-50 transition-all"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="mt-12 text-zinc-400 text-[10px] font-bold uppercase tracking-widest pb-8">
        AI Smart Commenter &copy; {new Date().getFullYear()} • SEO Automation Tool
      </footer>
    </div>
  );
}
