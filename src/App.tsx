import { useState, useEffect } from 'react';
import { Copy, Terminal, Cpu, Link as LinkIcon, Send, Activity, Clock, User as UserIcon, BookOpen, Users, LayoutDashboard, Save, Server, Globe, Zap, Database, X, ChevronRight, CheckCircle2, Search } from 'lucide-react';
import { ScriptConfig, SavedUser } from './types';
import { generatePythonScript } from './scriptGenerator';

const PROVIDERS = [
  { id: '@cf/meta/llama-3-8b-instruct', name: 'Llama 3 (8B) Instruct', provider: 'Meta', color: 'from-blue-500 to-indigo-500', badge: 'Fast & Smart' },
  { id: '@cf/meta/llama-3.1-8b-instruct', name: 'Llama 3.1 (8B) Instruct', provider: 'Meta', color: 'from-indigo-500 to-purple-500', badge: 'Latest' },
  { id: '@cf/qwen/qwen1.5-14b-chat-awq', name: 'Qwen 1.5 (14B) Chat', provider: 'Alibaba', color: 'from-orange-500 to-red-500', badge: 'Multilingual' },
  { id: '@cf/mistral/mistral-7b-instruct-v0.2', name: 'Mistral (7B) Instruct', provider: 'Mistral', color: 'from-emerald-500 to-teal-500', badge: 'Efficient' },
  { id: '@cf/microsoft/phi-2', name: 'Phi-2 (2.7B)', provider: 'Microsoft', color: 'from-cyan-500 to-blue-500', badge: 'Lightweight' },
  { id: '@cf/openchat/openchat-3.5-0106', name: 'OpenChat 3.5', provider: 'OpenChat', color: 'from-purple-500 to-pink-500', badge: 'Conversational' },
  { id: '@cf/tinyllama/tinyllama-1.1b-chat-v1.0', name: 'TinyLlama 1.1B Chat', provider: 'TinyLlama', color: 'from-yellow-500 to-orange-500', badge: 'Ultra Fast' },
];

const API_BASE_URL = import.meta.env.VITE_API_URL || ''; // Gunakan path relatif agar request menuju ke host yang sama di Cloudflare Pages

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'docs' | 'users'>('dashboard');
  const [isServerPopupOpen, setIsServerPopupOpen] = useState(false);
  const [isProviderPopupOpen, setIsProviderPopupOpen] = useState(false);
  const [searchProvider, setSearchProvider] = useState('');
  
  const [config, setConfig] = useState<ScriptConfig>({
    accountId: '',
    apiToken: '',
    username: '',
    modelId: '@cf/meta/llama-3-8b-instruct'
  });

  const [linkCopied, setLinkCopied] = useState(false);
  const [scriptUrl, setScriptUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [testPrompt, setTestPrompt] = useState('');
  const [testResponse, setTestResponse] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  
  const [savedUsers, setSavedUsers] = useState<SavedUser[]>([]);

  const appUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const scriptCode = generatePythonScript(config, appUrl);

  // Load history from API on mount
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/users`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setSavedUsers(data);
        }
      })
      .catch(e => console.error("Failed to fetch users", e));
  }, []);

  const handleSaveUser = async () => {
    if (!config.accountId || !config.apiToken) return;
    
    const newUser: SavedUser = {
      id: Math.random().toString(36).substring(2, 9),
      accountId: config.accountId,
      apiToken: config.apiToken,
      username: config.username || 'Anonymous User',
      time: new Date().toLocaleTimeString(),
      modelId: config.modelId
    };
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });
      
      if (res.ok) {
        setSavedUsers([newUser, ...savedUsers]);
        setActiveTab('users');
      }
    } catch (error) {
      console.error("Error saving user:", error);
    }
  };

  const handleGenerateLink = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/save-script`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script: scriptCode }),
      });
      const data = await res.json();
      if (data.id) {
        setScriptUrl(`${appUrl}/api/script/${data.id}`);
      }
    } catch (error) {
      console.error("Error generating link:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const copyLink = () => {
    if (scriptUrl) {
      navigator.clipboard.writeText(`curl -sL ${scriptUrl} > ai_assistant.py && python3 ai_assistant.py`);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  const handleTestAPI = async () => {
    if (!config.accountId || !config.apiToken) {
      setTestResponse("Error: Missing Cloudflare credentials (Account ID and API Token are required).");
      return;
    }
    
    setIsTesting(true);
    setTestResponse("Testing connection...");
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: config.accountId,
          token: config.apiToken,
          modelId: config.modelId,
          systemPrompt: `You are assisting user: ${config.username || 'User'}.`,
          messages: [{ role: 'user', content: testPrompt || 'Hello, are you there?' }]
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        setTestResponse(data.response || "No response received.");
      } else {
        let errorDetails = data.error || 'Unknown error';
        if (data.details) {
          try {
            const parsed = JSON.parse(data.details);
            if (parsed.errors && parsed.errors.length > 0) {
              errorDetails += `: ${parsed.errors[0].message}`;
            } else {
              errorDetails += `: ${data.details}`;
            }
          } catch(e) {
            errorDetails += `: ${data.details}`;
          }
        }
        setTestResponse(`Error: ${errorDetails}`);
      }
    } catch (error) {
      setTestResponse(`Network Error: ${String(error)}`);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 font-sans selection:bg-emerald-500/30">
      {/* Header */}
      <header className="border-b border-white/5 bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-[#f38020]/10 p-2 rounded-lg border border-[#f38020]/20 shadow-[0_0_15px_rgba(243,128,32,0.15)]">
              <Globe className="w-6 h-6 text-[#f38020]" />
            </div>
            <h1 className="text-xl font-bold text-zinc-50 tracking-tight flex items-center">
              CFLARE <span className="ml-2 text-xs px-2 py-0.5 bg-[#f38020]/20 text-[#f38020] rounded-full border border-[#f38020]/30 font-mono">PROXY</span>
            </h1>
          </div>
          
          <button 
            onClick={() => setIsServerPopupOpen(true)}
            className="flex items-center space-x-2 text-xs font-mono text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-1.5 rounded-full border border-emerald-500/20 transition-all cursor-pointer shadow-[0_0_10px_rgba(16,185,129,0.1)] hover:shadow-[0_0_15px_rgba(16,185,129,0.2)]"
          >
            <Server className="w-3.5 h-3.5 hidden sm:block" />
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
            <span className="font-semibold tracking-wide hidden sm:block">SERVER</span>
          </button>
        </div>
      </header>

      {/* Server Info Modal Popup */}
      {isServerPopupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsServerPopupOpen(false)}></div>
          <div className="relative w-full max-w-sm bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-emerald-500 to-purple-500"></div>
            
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-zinc-50 flex items-center">
                  <Server className="w-5 h-5 mr-2 text-emerald-400" />
                  Server Status
                </h3>
                <button 
                  onClick={() => setIsServerPopupOpen(false)}
                  className="p-1.5 rounded-md hover:bg-white/5 text-zinc-400 hover:text-zinc-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-zinc-950/50 rounded-xl p-4 border border-white/5 flex items-center justify-between group hover:border-white/10 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="bg-blue-500/10 p-2 rounded-lg">
                      <Globe className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-0.5">Wilayah</p>
                      <p className="text-sm font-medium text-zinc-200">Global (Edge)</p>
                    </div>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>
                </div>

                <div className="bg-zinc-950/50 rounded-xl p-4 border border-white/5 flex items-center justify-between group hover:border-white/10 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="bg-emerald-500/10 p-2 rounded-lg">
                      <Zap className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-0.5">Ping Server</p>
                      <p className="text-sm font-medium text-zinc-200">12 ms</p>
                    </div>
                  </div>
                  <div className="text-xs font-mono text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded">FAST</div>
                </div>

                <div className="bg-zinc-950/50 rounded-xl p-4 border border-white/5 flex items-center justify-between group hover:border-white/10 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="bg-purple-500/10 p-2 rounded-lg">
                      <Database className="w-4 h-4 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-0.5">Sisa Request</p>
                      <p className="text-sm font-medium text-zinc-200">Unlimited (BETA)</p>
                    </div>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Provider Selection Modal Popup */}
      {isProviderPopupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsProviderPopupOpen(false)}></div>
          <div className="relative w-full max-w-lg bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[80vh] flex flex-col">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500"></div>
            
            <div className="p-6 border-b border-white/5 shrink-0">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-zinc-50 flex items-center">
                  <Cpu className="w-5 h-5 mr-2 text-emerald-400" />
                  Pilih AI Provider
                </h3>
                <button 
                  onClick={() => setIsProviderPopupOpen(false)}
                  className="p-1.5 rounded-md hover:bg-white/5 text-zinc-400 hover:text-zinc-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input 
                  type="text" 
                  placeholder="Cari model AI..."
                  value={searchProvider}
                  onChange={(e) => setSearchProvider(e.target.value)}
                  className="w-full bg-zinc-950/50 border border-white/10 rounded-lg pl-9 pr-4 py-2.5 text-zinc-200 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all text-sm"
                />
              </div>
            </div>

            <div className="p-4 overflow-y-auto custom-scrollbar space-y-2 flex-1">
              {PROVIDERS.filter(p => p.name.toLowerCase().includes(searchProvider.toLowerCase()) || p.provider.toLowerCase().includes(searchProvider.toLowerCase())).map((provider) => (
                <button
                  key={provider.id}
                  onClick={() => {
                    setConfig({ ...config, modelId: provider.id });
                    setIsProviderPopupOpen(false);
                  }}
                  className={`w-full text-left p-4 rounded-xl border transition-all group flex items-center justify-between ${config.modelId === provider.id ? 'bg-zinc-800/80 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'bg-zinc-950/50 border-white/5 hover:border-white/10 hover:bg-zinc-900'}`}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br ${provider.color} shadow-lg shrink-0`}>
                      <span className="text-white font-bold text-lg">{provider.provider[0]}</span>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <p className={`font-semibold ${config.modelId === provider.id ? 'text-emerald-400' : 'text-zinc-200 group-hover:text-white'}`}>
                          {provider.name}
                        </p>
                        {config.modelId === provider.id && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        )}
                      </div>
                      <div className="flex items-center mt-1 space-x-2">
                        <p className="text-xs text-zinc-500">{provider.provider}</p>
                        <span className="w-1 h-1 rounded-full bg-zinc-700"></span>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">{provider.badge}</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
              
              {PROVIDERS.filter(p => p.name.toLowerCase().includes(searchProvider.toLowerCase()) || p.provider.toLowerCase().includes(searchProvider.toLowerCase())).length === 0 && (
                <div className="text-center py-8 text-zinc-500 text-sm">
                  Model tidak ditemukan
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 pb-32">
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Left Column: Configuration */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-zinc-900/40 border border-white/10 rounded-2xl p-5 sm:p-7 shadow-2xl backdrop-blur-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500/0 via-emerald-500/50 to-emerald-500/0"></div>
                
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="bg-zinc-800/50 p-1.5 rounded-md">
                      <Cpu className="w-5 h-5 text-emerald-400" />
                    </div>
                    <h2 className="text-xl font-semibold text-zinc-50 tracking-tight">Configuration</h2>
                  </div>
                  <button 
                    onClick={handleSaveUser}
                    className="flex items-center space-x-2 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/40 rounded-lg transition-all text-sm font-medium"
                  >
                    <Save className="w-4 h-4" />
                    <span>Simpan</span>
                  </button>
                </div>

                <div className="space-y-5">
                  {/* AI Provider Selector */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1.5">
                      AI Provider Model
                    </label>
                    <button 
                      onClick={() => setIsProviderPopupOpen(true)}
                      className="w-full bg-zinc-950/80 border border-white/10 hover:border-emerald-500/50 rounded-lg px-4 py-3 text-zinc-300 text-sm flex items-center justify-between shadow-inner transition-all group"
                    >
                      <div className="flex items-center">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 mr-3 shadow-[0_0_8px_rgba(59,130,246,0.6)]"></span>
                        <span className="font-medium">{PROVIDERS.find(p => p.id === config.modelId)?.name || config.modelId}</span>
                      </div>
                      <div className="flex items-center text-zinc-500 group-hover:text-emerald-400 transition-colors">
                        <span className="text-xs mr-2 border border-white/10 px-2 py-0.5 rounded-full bg-zinc-900 group-hover:border-emerald-500/30">Ganti</span>
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </button>
                    <p className="mt-2 text-[11px] text-zinc-500 uppercase tracking-wider font-semibold">
                      Requests proxied securely via Web App URL
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Account ID */}
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                        Cloudflare Account ID
                      </label>
                      <input
                        type="text"
                        value={config.accountId}
                        onChange={(e) => setConfig({ ...config, accountId: e.target.value })}
                        placeholder="e.g. 32f9d5fc..."
                        className="w-full bg-zinc-950/80 border border-white/10 rounded-lg px-4 py-2.5 text-zinc-200 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-inner"
                      />
                    </div>
                    
                    {/* API Token */}
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                        API Token (Bearer)
                      </label>
                      <input
                        type="password"
                        value={config.apiToken}
                        onChange={(e) => setConfig({ ...config, apiToken: e.target.value })}
                        placeholder="cfut_..."
                        className="w-full bg-zinc-950/80 border border-white/10 rounded-lg px-4 py-2.5 text-zinc-200 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-inner placeholder:text-zinc-600"
                      />
                    </div>
                  </div>

                  {/* Username */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                      Username (Optional)
                    </label>
                    <input
                      type="text"
                      value={config.username}
                      onChange={(e) => setConfig({ ...config, username: e.target.value })}
                      placeholder="root, admin, or your name"
                      className="w-full bg-zinc-950/80 border border-white/10 rounded-lg px-4 py-2.5 text-zinc-200 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-inner"
                    />
                  </div>
                </div>
              </div>
              
              {/* Test API Section */}
              <div className="bg-zinc-900/40 border border-white/10 rounded-2xl p-5 sm:p-7 shadow-xl backdrop-blur-sm relative overflow-hidden">
                 <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500/0 via-blue-500/50 to-blue-500/0"></div>
                <h2 className="text-lg font-semibold text-zinc-50 mb-5 flex items-center">
                  <div className="bg-zinc-800/50 p-1.5 rounded-md mr-3">
                    <Send className="w-4 h-4 text-blue-400" />
                  </div>
                  Test API Connection
                </h2>
                
                <div className="space-y-4">
                  <input
                    type="text"
                    value={testPrompt}
                    onChange={(e) => setTestPrompt(e.target.value)}
                    placeholder="Ask a question or request a command..."
                    className="w-full bg-zinc-950/80 border border-white/10 rounded-lg px-4 py-2.5 text-zinc-200 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-inner"
                    onKeyDown={(e) => e.key === 'Enter' && handleTestAPI()}
                  />
                  
                  <button
                    onClick={handleTestAPI}
                    disabled={isTesting}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors text-sm shadow-[0_0_15px_rgba(37,99,235,0.2)] hover:shadow-[0_0_20px_rgba(37,99,235,0.4)]"
                  >
                    {isTesting ? 'Sending Request...' : 'Send Test Request'}
                  </button>
                  
                  {testResponse && (
                    <div className="mt-4 p-4 bg-zinc-950 border border-white/5 rounded-xl text-sm text-blue-300 font-mono overflow-auto max-h-48 custom-scrollbar whitespace-pre-wrap leading-relaxed shadow-inner">
                      {testResponse}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Install */}
            <div className="lg:col-span-7 flex flex-col space-y-6">
              
              {/* Generated Link Section */}
              <div className="bg-emerald-950/30 border border-emerald-500/20 rounded-2xl p-6 shadow-xl relative overflow-hidden backdrop-blur-sm">
                <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-500/5 blur-[50px] rounded-full pointer-events-none"></div>
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
                  <h3 className="text-emerald-400 font-semibold flex items-center text-lg">
                    <div className="bg-emerald-900/50 p-1.5 rounded-md mr-3">
                      <LinkIcon className="w-4 h-4 text-emerald-400" />
                    </div>
                    Install on VPS / Termux
                  </h3>
                  <button
                    onClick={handleGenerateLink}
                    disabled={isSaving}
                    className="px-4 py-2 text-sm font-medium text-emerald-950 bg-emerald-500 hover:bg-emerald-400 rounded-lg transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_20px_rgba(16,185,129,0.5)] disabled:opacity-50 disabled:shadow-none whitespace-nowrap"
                  >
                    {isSaving ? 'Generating...' : 'Generate Script Link'}
                  </button>
                </div>
                
                {scriptUrl ? (
                  <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300 mt-2">
                    <p className="text-sm text-emerald-100/70 font-medium">Run this command in your terminal to download and execute:</p>
                    <div className="flex items-center gap-2 group">
                      <div className="flex-1 bg-zinc-950/80 border border-emerald-500/30 rounded-lg px-4 py-3 overflow-x-auto shadow-inner relative group-hover:border-emerald-500/50 transition-colors">
                        <code className="text-xs sm:text-sm text-emerald-300 font-mono whitespace-nowrap">
                          curl -sL {scriptUrl} &gt; ai_assistant.py && python3 ai_assistant.py
                        </code>
                      </div>
                      <button
                        onClick={copyLink}
                        className="p-3 bg-zinc-900 hover:bg-zinc-800 border border-white/5 rounded-lg text-zinc-300 hover:text-emerald-400 transition-colors flex-shrink-0 focus:ring-2 focus:ring-emerald-500/50 focus:outline-none"
                        title="Copy install command"
                      >
                        <Copy className="w-5 h-5" />
                      </button>
                    </div>
                    {linkCopied && <p className="text-xs text-emerald-400 font-medium">✨ Copied to clipboard!</p>}
                  </div>
                ) : (
                  <p className="text-sm text-emerald-100/60 leading-relaxed mt-2 max-w-xl">
                    Click the button above to generate a secure install link for your current configuration. The link will be active for 1 hour.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
            <div className="bg-zinc-900/40 border border-white/10 rounded-2xl p-5 sm:p-7 shadow-xl backdrop-blur-sm flex flex-col relative overflow-hidden min-h-[500px]">
               <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 blur-[50px] rounded-full pointer-events-none"></div>
               
               <h3 className="text-xl font-semibold text-zinc-50 mb-6 flex items-center">
                <div className="bg-zinc-800/50 p-1.5 rounded-md mr-3">
                  <Users className="w-5 h-5 text-purple-400" />
                </div>
                List User Tersimpan
              </h3>

              {savedUsers.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-white/5 rounded-xl bg-zinc-950/30 border-dashed">
                  <Users className="w-12 h-12 text-zinc-700 mb-4" />
                  <p className="text-zinc-400 text-base font-medium">Belum ada user tersimpan.</p>
                  <p className="text-zinc-600 text-sm mt-2">Simpan user di tab Dashboard untuk melihat daftar di sini.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto custom-scrollbar flex-1 pr-2">
                  {savedUsers.map((user, index) => (
                    <div key={index} className="bg-zinc-950/60 border border-white/5 rounded-xl p-5 flex flex-col hover:border-white/10 transition-colors group relative">
                      <div className="flex items-center space-x-4 mb-4">
                        <div className="bg-purple-500/10 p-3 rounded-full">
                          <UserIcon className="w-6 h-6 text-purple-400" />
                        </div>
                        <div>
                          <p className="text-zinc-100 font-semibold text-base">{user.username}</p>
                          <p className="text-zinc-500 text-xs flex items-center mt-1">
                            <Clock className="w-3 h-3 mr-1" />
                            {user.time}
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-2 mt-auto">
                        <div className="bg-zinc-900/50 px-3 py-2 rounded-lg border border-white/5">
                          <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1">Account ID</p>
                          <p className="text-xs text-zinc-300 font-mono truncate">{user.accountId}</p>
                        </div>
                        <div className="bg-zinc-900/50 px-3 py-2 rounded-lg border border-white/5 flex items-center justify-between">
                          <div>
                            <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1">Model</p>
                            <p className="text-xs text-zinc-400 font-mono truncate">{PROVIDERS.find(p => p.id === user.modelId)?.name || user.modelId || 'Default Llama-3'}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="absolute top-4 right-4 flex items-center space-x-2">
                        <button 
                          onClick={() => {
                            setConfig({
                              accountId: user.accountId,
                              apiToken: user.apiToken,
                              username: user.username,
                              modelId: user.modelId || '@cf/meta/llama-3-8b-instruct'
                            });
                            setActiveTab('dashboard');
                          }}
                          className="px-3 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-semibold transition-colors"
                        >
                          Load
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'docs' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
            <div className="bg-zinc-900/40 border border-white/10 rounded-2xl p-6 sm:p-8 shadow-xl backdrop-blur-sm relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-[50px] rounded-full pointer-events-none"></div>
               
               <h3 className="text-xl font-semibold text-zinc-50 mb-6 flex items-center border-b border-white/5 pb-4">
                <div className="bg-zinc-800/50 p-1.5 rounded-md mr-3">
                  <BookOpen className="w-5 h-5 text-blue-400" />
                </div>
                Dokumentasi
              </h3>

              <div className="space-y-6 text-zinc-300 text-sm leading-relaxed">
                <section>
                  <h4 className="text-emerald-400 font-medium text-base mb-2">1. Persiapan Cloudflare</h4>
                  <p>
                    Anda membutuhkan akun Cloudflare dan akses ke layanan Workers AI. Dapatkan <strong>Account ID</strong> dari dashboard Cloudflare Anda.
                  </p>
                  <p className="mt-2">
                    Buat API Token dengan izin <code>Workers AI: Read</code>. Gunakan token ini di kolom <strong>API Token</strong>.
                  </p>
                </section>

                <section>
                  <h4 className="text-emerald-400 font-medium text-base mb-2">2. Konfigurasi Dashboard</h4>
                  <p>
                    Masukkan kredensial Anda di tab <strong>Dashboard</strong>. Anda dapat menguji koneksi terlebih dahulu menggunakan form Test API. 
                    Jika berhasil, klik <strong>Generate Script Link</strong> untuk membuat link instalasi khusus.
                  </p>
                </section>

                <section>
                  <h4 className="text-emerald-400 font-medium text-base mb-2">3. Instalasi di Termux/VPS</h4>
                  <p>
                    Salin perintah `curl` yang dihasilkan, lalu jalankan di terminal VPS atau Termux Android Anda.
                    Skrip Python akan otomatis terunduh dan berjalan, menyambungkan terminal Anda dengan AI.
                  </p>
                  <div className="bg-zinc-950 p-3 rounded-lg border border-white/5 mt-3 font-mono text-xs text-emerald-300">
                    curl -sL https://... &gt; ai_assistant.py && python3 ai_assistant.py
                  </div>
                </section>

                <section>
                  <h4 className="text-emerald-400 font-medium text-base mb-2">4. Manajemen Pengguna</h4>
                  <p>
                    Anda dapat menyimpan konfigurasi pengguna dengan menekan tombol <strong>Simpan</strong> di Dashboard.
                    Daftar pengguna yang disimpan dapat dilihat pada tab <strong>List User</strong>.
                  </p>
                </section>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 w-full bg-zinc-950/80 backdrop-blur-xl border-t border-white/5 px-4 pb-safe z-30">
        <div className="max-w-md mx-auto flex items-center justify-between py-2 sm:py-3">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center p-2 rounded-xl transition-all duration-300 ${activeTab === 'dashboard' ? 'text-emerald-400' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}
          >
            <LayoutDashboard className={`w-5 h-5 mb-1 ${activeTab === 'dashboard' ? 'drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]' : ''}`} />
            <span className="text-[10px] font-semibold tracking-wide">DASBOR</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('docs')}
            className={`flex flex-col items-center p-2 rounded-xl transition-all duration-300 ${activeTab === 'docs' ? 'text-blue-400' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}
          >
            <BookOpen className={`w-5 h-5 mb-1 ${activeTab === 'docs' ? 'drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]' : ''}`} />
            <span className="text-[10px] font-semibold tracking-wide">DOKUMENTASI</span>
          </button>

          <button 
            onClick={() => setActiveTab('users')}
            className={`flex flex-col items-center p-2 rounded-xl transition-all duration-300 ${activeTab === 'users' ? 'text-purple-400' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}
          >
            <Users className={`w-5 h-5 mb-1 ${activeTab === 'users' ? 'drop-shadow-[0_0_8px_rgba(192,132,252,0.5)]' : ''}`} />
            <span className="text-[10px] font-semibold tracking-wide">LIST USER</span>
          </button>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #27272a;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #3f3f46;
        }
      `}</style>
    </div>
  );
}
