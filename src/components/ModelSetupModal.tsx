import React, { useState, useEffect } from 'react';
import { 
  Download, Folder, CheckCircle2, Loader2, Sparkles, 
  HardDrive, AlertCircle, ArrowRight, ShieldCheck, Cpu
} from 'lucide-react';

interface ModelStatus {
  installed: boolean;
  model_name: string;
  model_path?: string | null;
  size_gb?: number;
  storage_dir: string;
  disk_free_gb: number;
  server_running: boolean;
}

interface ModelSetupModalProps {
  onComplete: () => void;
}

export const ModelSetupModal: React.FC<ModelSetupModalProps> = ({ onComplete }) => {
  const [status, setStatus] = useState<ModelStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [mode, setMode] = useState<'setup' | 'downloading' | 'completed'>('setup');
  
  // Download progress state
  const [progressPercent, setProgressPercent] = useState(0);
  const [downloadedBytes, setDownloadedBytes] = useState(0);
  const [totalBytes, setTotalBytes] = useState(2147483648);
  const [speedMbps, setSpeedMbps] = useState(0);
  const [etaSeconds, setEtaSeconds] = useState(0);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Import local state
  const [showImportInput, setShowImportInput] = useState(false);
  const [importPath, setImportPath] = useState('');
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const res = await fetch('http://localhost:8000/model/status');
      if (res.ok) {
        const data: ModelStatus = await res.json();
        setStatus(data);
        if (data.installed && data.server_running) {
          onComplete();
        }
      }
    } catch (e) {
      console.warn('Failed to fetch model status:', e);
    } finally {
      setLoadingStatus(false);
    }
  };

  const startDownload = () => {
    setMode('downloading');
    setErrorMessage(null);
    setCurrentStep(1);

    const eventSource = new EventSource('http://localhost:8000/model/download-stream');

    eventSource.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.stage === 'downloading') {
          setProgressPercent(data.percent || 0);
          setDownloadedBytes(data.downloaded_bytes || 0);
          setTotalBytes(data.total_bytes || 2147483648);
          setSpeedMbps(data.speed_mbps || 0);
          setEtaSeconds(data.eta_seconds || 0);
          setCurrentStep(1);
        } else if (data.stage === 'verifying') {
          setProgressPercent(100);
          setCurrentStep(2);
        } else if (data.stage === 'ready') {
          setCurrentStep(3);
          eventSource.close();

          // Try launching engine via Tauri or backend
          try {
            // @ts-ignore
            if (window.__TAURI_INTERNALS__) {
              // @ts-ignore
              const { invoke } = await import('@tauri-apps/api/core');
              await invoke('start_llama_server', { customPath: null });
            }
          } catch (launchErr) {
            console.warn('Tauri invoke start_llama_server failed or not in desktop shell:', launchErr);
          }

          setCurrentStep(4);
          setMode('completed');
          setTimeout(() => {
            onComplete();
          }, 1500);
        } else if (data.stage === 'error') {
          eventSource.close();
          setErrorMessage(data.error || 'Download interrupted. Please check connection and retry.');
          setMode('setup');
        }
      } catch (err) {
        console.error('Error parsing SSE event:', err);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      setErrorMessage('Connection lost while downloading weights. Please try again.');
      setMode('setup');
    };
  };

  const handleImport = async () => {
    if (!importPath.trim()) return;
    setImporting(true);
    setErrorMessage(null);

    try {
      const res = await fetch('http://localhost:8000/model/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_path: importPath.trim() }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Import failed');
      }

      // Launch engine
      try {
        // @ts-ignore
        if (window.__TAURI_INTERNALS__) {
          // @ts-ignore
          const { invoke } = await import('@tauri-apps/api/core');
          await invoke('start_llama_server', { customPath: null });
        }
      } catch (launchErr) {
        console.warn('Launch engine error:', launchErr);
      }

      setMode('completed');
      setTimeout(() => {
        onComplete();
      }, 1000);
    } catch (e: any) {
      setErrorMessage(e.message || 'Failed to import model');
    } finally {
      setImporting(false);
    }
  };

  if (loadingStatus) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0D0D0C]/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-[480px] bg-[#181817] border border-[#2E2D2B] rounded-2xl p-6 sm:p-7 shadow-2xl text-[#F4F4F5] relative overflow-hidden">
        
        {/* Subtle decorative glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 bg-[#EA580C]/10 rounded-full blur-2xl pointer-events-none" />

        {/* MODE: SETUP & SELECTION */}
        {mode === 'setup' && (
          <div className="flex flex-col items-center text-center">
            {/* Claude-style Terracotta Starburst */}
            <div className="w-12 h-12 rounded-xl bg-[#EA580C]/15 border border-[#EA580C]/30 flex items-center justify-center text-[#EA580C] mb-4 shadow-inner">
              <svg className="w-6 h-6 animate-pulse" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
              </svg>
            </div>

            <h2 className="text-xl sm:text-2xl font-serif tracking-tight text-[#F4F4F5] mb-1.5">
              Setup Your Offline AI Engine
            </h2>
            <p className="text-xs text-[#9E9B94] mb-5 max-w-[360px] leading-relaxed">
              Download the recommended quantized model for 100% private, edge GPU inference with zero cloud dependency.
            </p>

            {errorMessage && (
              <div className="w-full mb-4 p-2.5 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300 text-xs flex items-center gap-2 text-left">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Model Card */}
            <div className="w-full bg-[#20201E] border border-[#2E2D2B] rounded-xl p-4 text-left mb-3.5 hover:border-[#EA580C]/40 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-sm text-[#F4F4F5]">Qwen 2.5 3B Instruct</span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-[#EA580C]/20 text-[#EA580C] px-2 py-0.5 rounded-full border border-[#EA580C]/30">
                  Recommended
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                <span className="text-[11px] bg-[#2E2D2B] text-[#D4D2CC] px-2 py-0.5 rounded-md">2.0 GB</span>
                <span className="text-[11px] bg-[#2E2D2B] text-[#D4D2CC] px-2 py-0.5 rounded-md">Vulkan GPU</span>
                <span className="text-[11px] bg-[#2E2D2B] text-[#D4D2CC] px-2 py-0.5 rounded-md">Runs on 4GB+ RAM</span>
              </div>
              <p className="text-[11px] text-[#9E9B94] leading-normal">
                High-performance 4-bit weights balanced for rapid coding, reasoning, and tool calling.
              </p>
            </div>

            {/* Import Local GGUF Accordion */}
            <div className="w-full mb-5">
              {!showImportInput ? (
                <button
                  type="button"
                  onClick={() => setShowImportInput(true)}
                  className="w-full py-2 text-xs text-[#9E9B94] hover:text-[#F4F4F5] bg-[#20201E]/50 hover:bg-[#20201E] border border-dashed border-[#2E2D2B] hover:border-[#3E3D39] rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <Folder className="w-3.5 h-3.5" />
                  <span>Import existing .gguf model file from computer</span>
                </button>
              ) : (
                <div className="bg-[#20201E] border border-[#2E2D2B] rounded-xl p-3 text-left animate-in fade-in duration-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-[#F4F4F5]">Local GGUF Path</span>
                    <button 
                      onClick={() => setShowImportInput(false)}
                      className="text-[10px] text-[#9E9B94] hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="D:/Models/my_model.gguf"
                      value={importPath}
                      onChange={(e) => setImportPath(e.target.value)}
                      className="flex-1 bg-[#141413] border border-[#2E2D2B] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#EA580C]"
                    />
                    <button
                      onClick={handleImport}
                      disabled={importing || !importPath.trim()}
                      className="px-3 py-1.5 bg-[#EA580C] hover:bg-[#C2410C] disabled:opacity-50 text-white font-medium rounded-lg text-xs transition-colors flex items-center gap-1.5"
                    >
                      {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Import'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Storage directory & Free space */}
            {status && (
              <div className="flex items-center gap-1.5 text-[11px] text-[#9E9B94] mb-4">
                <HardDrive className="w-3.5 h-3.5 text-[#716E68]" />
                <span className="truncate max-w-[340px]">
                  Storage: {status.storage_dir} ({status.disk_free_gb} GB free)
                </span>
              </div>
            )}

            {/* Primary Action Button */}
            <button
              onClick={startDownload}
              className="w-full py-2.5 px-4 bg-[#EA580C] hover:bg-[#C2410C] active:scale-[0.99] text-white font-medium rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#EA580C]/20 cursor-pointer"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              <span>Download & Initialize Engine</span>
            </button>
          </div>
        )}

        {/* MODE: DOWNLOADING PROGRESS */}
        {mode === 'downloading' && (
          <div className="flex flex-col items-center text-center">
            <h2 className="text-xl font-serif tracking-tight text-[#F4F4F5] mb-1">
              Downloading AI Model
            </h2>
            <p className="text-xs text-[#9E9B94] mb-5">
              Qwen 2.5 3B Instruct (2.0 GB)
            </p>

            {/* Live Progress Numbers */}
            <div className="w-full flex items-center justify-between text-xs text-[#9E9B94] font-mono mb-2">
              <span>
                {(downloadedBytes / (1024 ** 3)).toFixed(2)} GB / {(totalBytes / (1024 ** 3)).toFixed(2)} GB
              </span>
              <span className="text-[#EA580C] font-semibold">{speedMbps} MB/s</span>
              <span>{etaSeconds > 0 ? `${etaSeconds}s remaining` : 'Finalizing...'}</span>
            </div>

            {/* Glowing Terracotta Progress Bar */}
            <div className="w-full h-3 bg-[#242320] border border-[#2E2D2B] rounded-full overflow-hidden p-0.5 mb-6 relative">
              <div 
                className="h-full bg-gradient-to-r from-[#C2410C] to-[#EA580C] rounded-full transition-all duration-300 shadow-[0_0_12px_rgba(234,88,12,0.5)]"
                style={{ width: `${Math.max(2, progressPercent)}%` }}
              />
            </div>

            {/* 4-Step Checklist */}
            <div className="w-full space-y-3 text-left text-xs">
              {/* Step 1 */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#20201E]/60 border border-[#2E2D2B]">
                <div className="flex items-center gap-2.5">
                  {currentStep > 1 ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Loader2 className="w-4 h-4 text-[#EA580C] animate-spin" />
                  )}
                  <span className="text-[#F4F4F5] font-medium">1. Download weights</span>
                </div>
                <span className="text-[11px] font-mono text-[#EA580C]">
                  {progressPercent.toFixed(0)}%
                </span>
              </div>

              {/* Step 2 */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#20201E]/60 border border-[#2E2D2B]">
                <div className="flex items-center gap-2.5">
                  {currentStep > 2 ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : currentStep === 2 ? (
                    <Loader2 className="w-4 h-4 text-[#EA580C] animate-spin" />
                  ) : (
                    <ShieldCheck className="w-4 h-4 text-[#716E68]" />
                  )}
                  <span className={currentStep >= 2 ? 'text-[#F4F4F5] font-medium' : 'text-[#716E68]'}>
                    2. Verify file checksum
                  </span>
                </div>
                <span className="text-[11px] text-[#716E68]">
                  {currentStep > 2 ? 'Done' : currentStep === 2 ? 'Verifying' : 'Pending'}
                </span>
              </div>

              {/* Step 3 */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#20201E]/60 border border-[#2E2D2B]">
                <div className="flex items-center gap-2.5">
                  {currentStep > 3 ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : currentStep === 3 ? (
                    <Loader2 className="w-4 h-4 text-[#EA580C] animate-spin" />
                  ) : (
                    <Cpu className="w-4 h-4 text-[#716E68]" />
                  )}
                  <span className={currentStep >= 3 ? 'text-[#F4F4F5] font-medium' : 'text-[#716E68]'}>
                    3. Initialize Vulkan GPU engine
                  </span>
                </div>
                <span className="text-[11px] text-[#716E68]">
                  {currentStep > 3 ? 'Done' : currentStep === 3 ? 'Starting' : 'Pending'}
                </span>
              </div>

              {/* Step 4 */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#20201E]/60 border border-[#2E2D2B]">
                <div className="flex items-center gap-2.5">
                  {currentStep === 4 ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-[#716E68]" />
                  )}
                  <span className={currentStep === 4 ? 'text-emerald-400 font-medium' : 'text-[#716E68]'}>
                    4. Start assistant
                  </span>
                </div>
                <span className="text-[11px] text-[#716E68]">
                  {currentStep === 4 ? 'Ready' : 'Pending'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* MODE: COMPLETED */}
        {mode === 'completed' && (
          <div className="flex flex-col items-center text-center py-6 animate-in zoom-in-95 duration-300">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-serif text-[#F4F4F5] mb-1">
              Engine Ready!
            </h2>
            <p className="text-xs text-[#9E9B94]">
              Launching your private, offline assistant...
            </p>
          </div>
        )}

      </div>
    </div>
  );
};
