import React, { useState, useEffect } from 'react';
import { Plus, Settings, Power } from 'lucide-react';

interface MCPServer {
  id: string;
  name: string;
  enabled: boolean;
  transport: string;
  command?: string;
  args?: string[];
  url?: string;
  connected?: boolean;
  toolsSummary?: string;
}

export const MCPManagerView: React.FC = () => {
  const [servers, setServers] = useState<MCPServer[]>([
    {
      id: 'brave',
      name: 'Brave Search',
      enabled: true,
      transport: 'remote · http',
      connected: true,
      toolsSummary: 'Tools: search, news, research',
    },
    {
      id: 'fs',
      name: 'Filesystem',
      enabled: false,
      transport: 'local · stdio',
      connected: false,
      toolsSummary: 'Tools: read, write, list, delete',
    },
    {
      id: 'github',
      name: 'GitHub',
      enabled: true,
      transport: 'remote · http',
      connected: true,
      toolsSummary: 'Tools: search, issues, pull_requests, repo',
    },
  ]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0e1117] text-[#f8fafc] p-8 overflow-y-auto">
      {/* Header matching mcp.png */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#f8fafc]">MCP Servers</h1>
          <p className="text-xs text-[#64748b] mt-1">
            Manage your Model Context Protocol (MCP) servers.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#141a29] hover:bg-[#1e273b] border border-[#232d42] text-xs font-medium text-[#38bdf8] rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Server</span>
        </button>
      </div>

      {/* Server Cards matching mcp.png */}
      <div className="space-y-4 max-w-4xl">
        {servers.map((server) => (
          <div
            key={server.id}
            className="bg-[#0c0e15] border border-[#1a1f2c] rounded-xl p-5 flex items-center justify-between shadow-sm"
          >
            <div className="flex items-center gap-4">
              {/* Green status indicator dot matching mcp.png */}
              <div
                className={`w-3 h-3 rounded-full ${
                  server.enabled ? 'bg-[#34d399] shadow-[0_0_8px_#34d399]' : 'border-2 border-[#475569]'
                }`}
              />
              <div>
                <h3 className="text-sm font-semibold text-[#f8fafc]">{server.name}</h3>
                <p className="text-xs text-[#64748b] mt-0.5">{server.toolsSummary}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-xs text-[#64748b] font-mono">{server.transport}</span>

              <button className="p-2.5 bg-[#141a29] hover:bg-[#1e273b] border border-[#232d42] text-[#94a3b8] rounded-lg transition-colors">
                <Settings className="w-4 h-4" />
              </button>

              <button
                onClick={() =>
                  setServers((prev) =>
                    prev.map((s) => (s.id === server.id ? { ...s, enabled: !s.enabled } : s))
                  )
                }
                className={`p-2.5 rounded-lg border transition-colors ${
                  server.enabled
                    ? 'bg-[#141a29] border-[#232d42] text-[#38bdf8]'
                    : 'bg-[#141a29] border-[#232d42] text-[#64748b]'
                }`}
              >
                <Power className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
