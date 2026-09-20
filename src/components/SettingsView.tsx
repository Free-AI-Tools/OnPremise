import React, { useState } from 'react';

export const SettingsView: React.FC = () => {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0e1117] text-[#f8fafc] p-8 overflow-y-auto">
      {/* Header matching settings.png */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#f8fafc]">Settings</h1>
        <p className="text-xs text-[#64748b] mt-1">
          Configure your application preferences.
        </p>
      </div>

      <div className="space-y-8 max-w-3xl">
        {/* Model Section matching settings.png */}
        <div>
          <h2 className="text-sm font-semibold text-[#f8fafc] mb-3">Model</h2>
          <div className="bg-[#0c0e15] border border-[#1a1f2c] rounded-xl p-5 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-[#f8fafc]">
                Qwen2.5-3B-Instruct-Q4_K_M
              </div>
              <div className="text-xs text-[#64748b] mt-1">Context window: 4096</div>
            </div>
            <button className="px-4 py-2 bg-[#141a29] hover:bg-[#1e273b] border border-[#232d42] text-xs font-medium text-[#38bdf8] rounded-lg transition-colors">
              Change...
            </button>
          </div>
        </div>

        <div className="h-px bg-[#1a1f2c]" />

        {/* Appearance Section matching settings.png */}
        <div>
          <h2 className="text-sm font-semibold text-[#f8fafc] mb-4">Appearance</h2>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer text-xs text-[#f8fafc]">
              <input
                type="radio"
                name="theme"
                value="dark"
                checked={theme === 'dark'}
                onChange={() => setTheme('dark')}
                className="w-4 h-4 accent-[#38bdf8]"
              />
              <span>Dark</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer text-xs text-[#f8fafc]">
              <input
                type="radio"
                name="theme"
                value="light"
                checked={theme === 'light'}
                onChange={() => setTheme('light')}
                className="w-4 h-4 accent-[#38bdf8]"
              />
              <span>Light</span>
            </label>
          </div>
        </div>

        <div className="h-px bg-[#1a1f2c]" />

        {/* Data Section matching settings.png */}
        <div>
          <h2 className="text-sm font-semibold text-[#f8fafc] mb-3">Data</h2>
          <p className="text-xs text-[#64748b] mb-2">Conversations stored at:</p>

          <div className="flex items-center gap-3 mb-6">
            <input
              type="text"
              readOnly
              value="C:\Users\harsh\AppData\Roaming\MyAI\conversations"
              className="flex-1 bg-[#141a29] border border-[#232d42] rounded-xl px-4 py-2.5 text-xs text-[#94a3b8] font-mono focus:outline-none"
            />
            <button className="px-4 py-2.5 bg-[#141a29] hover:bg-[#1e273b] border border-[#232d42] text-xs font-medium text-[#38bdf8] rounded-xl transition-colors">
              Open folder
            </button>
          </div>

          <button className="px-4 py-2 bg-transparent hover:bg-rose-950/40 border border-rose-800/80 text-rose-400 text-xs font-medium rounded-lg transition-colors">
            Clear all conversations
          </button>
        </div>
      </div>
    </div>
  );
};
