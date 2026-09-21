import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import {
  Sun,
  Moon,
  Cpu,
  HardDrive,
  FolderSync,
  Check,
  AlertCircle,
  Folder,
  ArrowRight,
  Database,
} from 'lucide-react';

interface StorageInfo {
  path: string;
  drive: string;
  total_gb: number;
  used_gb: number;
  free_gb: number;
  percent_free: number;
  conversations_count: number;
  workspaces_count: number;
  is_portable: boolean;
}

export const SettingsView: React.FC = () => {
  const { theme, setTheme } = useTheme();

  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [loadingStorage, setLoadingStorage] = useState(true);
  const [newPathInput, setNewPathInput] = useState('');
  const [migrateExisting, setMigrateExisting] = useState(true);
  const [isRelocating, setIsRelocating] = useState(false);
  const [relocateStatus, setRelocateStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const fetchStorageInfo = async () => {
    try {
      setLoadingStorage(true);
      const res = await fetch('http://localhost:8000/storage/info');
      if (res.ok) {
        const data = await res.json();
        setStorageInfo(data);
        setNewPathInput(data.path);
      }
    } catch {
      // Offline fallback
    } finally {
      setLoadingStorage(false);
    }
  };

  useEffect(() => {
    fetchStorageInfo();
  }, []);

  const handleRelocate = async () => {
    if (!newPathInput.trim() || isRelocating) return;
    setIsRelocating(true);
    setRelocateStatus(null);

    try {
      const res = await fetch('http://localhost:8000/storage/relocate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          new_path: newPathInput.trim(),
          migrate_existing: migrateExisting,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setRelocateStatus({
          type: 'success',
          message: `Storage successfully relocated to ${data.new_path}`,
        });
        await fetchStorageInfo();
      } else {
        setRelocateStatus({
          type: 'error',
          message: data.detail || 'Failed to relocate storage',
        });
      }
    } catch (e: any) {
      setRelocateStatus({
        type: 'error',
        message: e?.message || 'Network error while relocating storage',
      });
    } finally {
      setIsRelocating(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FAF9F5] dark:bg-[#141413] text-[#1F1E1D] dark:text-[#F4F4F5] p-8 overflow-y-auto">
      {/* Header */}
      <div className="mb-8 max-w-3xl">
        <h1 className="text-2xl font-serif font-bold text-[#1F1E1D] dark:text-[#F4F4F5]">Settings</h1>
        <p className="text-xs text-[#716E68] dark:text-[#9E9B94] mt-1">
          Configure application preferences, storage directories on any drive, and local model parameters.
        </p>
      </div>

      <div className="space-y-8 max-w-3xl">
        {/* Appearance Section */}
        <div className="bg-[#FFFFFF] dark:bg-[#20201E] border border-[#E5E2DC] dark:border-[#2E2D2B] rounded-2xl p-5 shadow-xs">
          <h2 className="text-sm font-semibold text-[#1F1E1D] dark:text-[#F4F4F5] mb-4">Appearance</h2>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setTheme('light')}
              className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${
                theme === 'light'
                  ? 'border-[#C2410C] bg-[#FAF9F5] text-[#C2410C] ring-1 ring-[#C2410C]/20 shadow-xs'
                  : 'border-[#E5E2DC] dark:border-[#2E2D2B] text-[#716E68] dark:text-[#9E9B94] hover:bg-[#F3F1EC] dark:hover:bg-[#1A1918]'
              }`}
            >
              <div className="p-2 rounded-lg bg-[#F3F1EC] text-[#C2410C]">
                <Sun className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-semibold">Claude Warm Light</div>
                <div className="text-[11px] opacity-75">Warm ivory & linen aesthetic</div>
              </div>
            </button>

            <button
              onClick={() => setTheme('dark')}
              className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${
                theme === 'dark'
                  ? 'border-[#EA580C] bg-[#1A1918] text-[#EA580C] ring-1 ring-[#EA580C]/20 shadow-xs'
                  : 'border-[#E5E2DC] dark:border-[#2E2D2B] text-[#716E68] dark:text-[#9E9B94] hover:bg-[#F3F1EC] dark:hover:bg-[#1A1918]'
              }`}
            >
              <div className="p-2 rounded-lg bg-[#2E2D2B] text-[#EA580C]">
                <Moon className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-semibold">Claude Charcoal Dark</div>
                <div className="text-[11px] opacity-75">Deep slate & obsidian aesthetic</div>
              </div>
            </button>
          </div>
        </div>

        {/* Edge Model Section */}
        <div className="bg-[#FFFFFF] dark:bg-[#20201E] border border-[#E5E2DC] dark:border-[#2E2D2B] rounded-2xl p-5 shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <Cpu className="w-4 h-4 text-[#C2410C] dark:text-[#EA580C]" />
            <h2 className="text-sm font-semibold text-[#1F1E1D] dark:text-[#F4F4F5]">Local Inference Runtime</h2>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-[#1F1E1D] dark:text-[#F4F4F5]">
                Qwen2.5-3B-Instruct-Q4_K_M.gguf
              </div>
              <div className="text-xs text-[#716E68] dark:text-[#9E9B94] mt-0.5">
                Vulkan GPU Accelerated • Adaptive Context Window (2048 - 16384 tokens)
              </div>
            </div>
            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-medium rounded-full">
              Active
            </span>
          </div>
        </div>

        {/* Data Storage & Custom Drive Management Section */}
        <div className="bg-[#FFFFFF] dark:bg-[#20201E] border border-[#E5E2DC] dark:border-[#2E2D2B] rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-[#C2410C] dark:text-[#EA580C]" />
              <h2 className="text-sm font-semibold text-[#1F1E1D] dark:text-[#F4F4F5]">
                Custom Storage Root & Disk Space
              </h2>
            </div>
            {storageInfo?.is_portable && (
              <span className="px-2.5 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[11px] font-medium rounded-full">
                Portable Mode Active
              </span>
            )}
          </div>

          <p className="text-xs text-[#716E68] dark:text-[#9E9B94] mb-4">
            Store conversations, database, file uploads, and artifacts on any drive (C:, D:, E:, or USB).
            You can change this path or migrate data at any time to preserve disk space.
          </p>

          {/* Drive Capacity Visualizer */}
          {storageInfo && (
            <div className="p-4 bg-[#FAF9F5] dark:bg-[#1A1918] border border-[#E5E2DC] dark:border-[#2E2D2B] rounded-xl mb-5">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-semibold text-[#1F1E1D] dark:text-[#F4F4F5]">
                  Drive {storageInfo.drive || 'Storage'} Capacity
                </span>
                <span className="text-[#716E68] dark:text-[#9E9B94] font-mono">
                  {storageInfo.free_gb} GB free of {storageInfo.total_gb} GB ({storageInfo.percent_free}% free)
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 rounded-full bg-[#E5E2DC] dark:bg-[#2E2D2B] overflow-hidden">
                <div
                  className="h-full bg-[#C2410C] dark:bg-[#EA580C] rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, 100 - storageInfo.percent_free)}%` }}
                />
              </div>

              <div className="flex items-center gap-4 mt-3 text-[11px] text-[#716E68] dark:text-[#9E9B94]">
                <div className="flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5" />
                  <span>{storageInfo.conversations_count} saved conversations</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Folder className="w-3.5 h-3.5" />
                  <span>{storageInfo.workspaces_count} active workspaces</span>
                </div>
              </div>
            </div>
          )}

          {/* Path Relocation Form */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-[#1F1E1D] dark:text-[#F4F4F5]">
              Active Storage Root Path
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newPathInput}
                onChange={(e) => setNewPathInput(e.target.value)}
                placeholder="e.g. D:\AI-Portable-Storage"
                className="flex-1 text-xs font-mono px-3 py-2 rounded-xl bg-[#FFFFFF] dark:bg-[#141413] border border-[#E5E2DC] dark:border-[#2E2D2B] focus:outline-none focus:border-[#C2410C] dark:focus:border-[#EA580C] text-[#1F1E1D] dark:text-[#F4F4F5]"
              />
            </div>

            {/* Migration Checkbox */}
            <label className="flex items-center gap-2 text-xs text-[#52504C] dark:text-[#B0ACA4] cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={migrateExisting}
                onChange={(e) => setMigrateExisting(e.target.checked)}
                className="rounded border-[#E5E2DC] dark:border-[#2E2D2B] text-[#C2410C] focus:ring-[#C2410C]"
              />
              <span>Safely copy existing database, history, and uploaded files to the new location</span>
            </label>

            {/* Status Feedback */}
            {relocateStatus && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  relocateStatus.type === 'success'
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                    : 'bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400'
                }`}
              >
                {relocateStatus.type === 'success' ? (
                  <Check className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{relocateStatus.message}</span>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-2">
              <button
                onClick={handleRelocate}
                disabled={isRelocating || !newPathInput.trim() || newPathInput.trim() === storageInfo?.path}
                className="px-4 py-2 bg-[#1F1E1D] dark:bg-[#F4F4F5] text-white dark:text-[#1F1E1D] hover:opacity-90 disabled:opacity-50 text-xs font-medium rounded-xl transition-all shadow-xs flex items-center gap-2"
              >
                <FolderSync className={`w-3.5 h-3.5 ${isRelocating ? 'animate-spin' : ''}`} />
                <span>{isRelocating ? 'Relocating & Migrating Data...' : 'Apply & Relocate Storage'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
