import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon, Cpu, HardDrive } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FAF9F5] dark:bg-[#141413] text-[#1F1E1D] dark:text-[#F4F4F5] p-8 overflow-y-auto">
      {/* Header */}
      <div className="mb-8 max-w-3xl">
        <h1 className="text-2xl font-serif font-bold text-[#1F1E1D] dark:text-[#F4F4F5]">Settings</h1>
        <p className="text-xs text-[#716E68] dark:text-[#9E9B94] mt-1">
          Configure application preferences, themes, and edge model parameters.
        </p>
      </div>

      <div className="space-y-8 max-w-3xl">
        {/* Appearance Section with working Light / Dark toggle */}
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

        {/* Data Storage Section */}
        <div className="bg-[#FFFFFF] dark:bg-[#20201E] border border-[#E5E2DC] dark:border-[#2E2D2B] rounded-2xl p-5 shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <HardDrive className="w-4 h-4 text-[#C2410C] dark:text-[#EA580C]" />
            <h2 className="text-sm font-semibold text-[#1F1E1D] dark:text-[#F4F4F5]">Local SQLite Storage</h2>
          </div>
          <p className="text-xs text-[#716E68] dark:text-[#9E9B94] mb-3">
            Conversations and tool execution traces are saved locally:
          </p>

          <div className="p-3 bg-[#FAF9F5] dark:bg-[#141413] border border-[#E5E2DC] dark:border-[#2E2D2B] rounded-xl text-xs font-mono text-[#716E68] dark:text-[#9E9B94] mb-4 truncate">
            backend/.config/assistant_history.db
          </div>

          <button
            onClick={async () => {
              if (confirm('Are you sure you want to clear conversations?')) {
                // User confirmed
              }
            }}
            className="px-4 py-2 bg-transparent hover:bg-rose-500/10 border border-rose-500/40 text-rose-600 dark:text-rose-400 text-xs font-medium rounded-xl transition-colors"
          >
            Clear Conversation History
          </button>
        </div>
      </div>
    </div>
  );
};
