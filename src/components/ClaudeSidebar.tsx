import React, { useState, useEffect } from 'react';
import {
  Plus,
  FileCode,
  Sliders,
  Settings,
  Search,
  Trash2,
  Sun,
  Moon,
  PanelLeftClose,
  PanelLeft,
  Sparkles,
  ChevronDown
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export type NavSection = 'chat' | 'mcp' | 'skills' | 'settings' | 'artifacts';

export interface ConversationItem {
  id: string;
  title: string;
  updated_at: string;
}

interface ClaudeSidebarProps {
  currentSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  activeConversationId: string;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onOpenArtifactPanel?: () => void;
  refreshTrigger?: number;
}

export const ClaudeSidebar: React.FC<ClaudeSidebarProps> = ({
  currentSection,
  onSelectSection,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onOpenArtifactPanel,
  refreshTrigger = 0,
}) => {
  const { theme, toggleTheme } = useTheme();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const fetchConversations = async () => {
    try {
      const res = await fetch('http://localhost:8000/conversations');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setConversations(data);
        }
      }
    } catch {
      // Offline fallback
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [refreshTrigger, activeConversationId]);

  const handleDeleteConversation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await fetch(`http://localhost:8000/conversations/${id}`, { method: 'DELETE' });
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (id === activeConversationId) {
        onNewChat();
      }
    } catch {
      // Offline
    }
  };

  const filteredConversations = conversations.filter((c) =>
    (c.title || 'Untitled Chat').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isDark = theme === 'dark';

  if (isCollapsed) {
    return (
      <div className={`w-16 border-r flex flex-col items-center py-4 justify-between h-full select-none shrink-0 z-20 transition-all ${
        isDark ? 'bg-[#1A1918] border-[#2E2D2B] text-[#F4F4F5]' : 'bg-[#F3F1EC] border-[#E5E2DC] text-[#1F1E1D]'
      }`}>
        <div className="flex flex-col items-center space-y-4 w-full">
          <button
            onClick={() => setIsCollapsed(false)}
            title="Expand Sidebar"
            className="p-2 rounded-lg text-[#716E68] dark:text-[#9E9B94] hover:bg-[#E5E2DC] dark:hover:bg-[#2E2D2B] transition-colors"
          >
            <PanelLeft className="w-5 h-5" />
          </button>
          <button
            onClick={onNewChat}
            title="New Chat"
            className="p-2.5 rounded-full bg-[#C2410C] hover:bg-[#9A3412] text-white shadow-sm transition-transform active:scale-95"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          className="p-2 rounded-lg text-[#716E68] dark:text-[#9E9B94] hover:bg-[#E5E2DC] dark:hover:bg-[#2E2D2B] transition-colors"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    );
  }

  return (
    <aside className={`w-72 border-r flex flex-col h-full select-none shrink-0 z-20 transition-all ${
      isDark ? 'bg-[#1A1918] border-[#2E2D2B] text-[#F4F4F5]' : 'bg-[#F3F1EC] border-[#E5E2DC] text-[#1F1E1D]'
    }`}>
      {/* Top Header */}
      <div className="p-3.5 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#C2410C] text-white flex items-center justify-center font-bold text-sm shadow-sm">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="font-semibold text-sm tracking-tight">AI Assistant</span>
        </div>
        <button
          onClick={() => setIsCollapsed(true)}
          title="Collapse Sidebar"
          className="p-1.5 rounded-lg text-[#716E68] dark:text-[#9E9B94] hover:bg-[#E5E2DC] dark:hover:bg-[#2E2D2B] transition-colors"
        >
          <PanelLeftClose className="w-4 h-4" />
        </button>
      </div>

      {/* Action: + New Chat Button */}
      <div className="px-3 pt-2 pb-3">
        <button
          onClick={() => {
            onNewChat();
            onSelectSection('chat');
          }}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#C2410C] hover:bg-[#9A3412] text-white font-medium text-xs shadow-sm transition-all active:scale-[0.98]"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>New Chat</span>
        </button>
      </div>

      {/* Primary Navigation Menu */}
      <div className="px-2 space-y-0.5 border-b border-[#E5E2DC] dark:border-[#2E2D2B] pb-3 text-xs">

        <button
          onClick={() => {
            onSelectSection('chat');
            if (onOpenArtifactPanel) onOpenArtifactPanel();
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium text-[#716E68] dark:text-[#9E9B94] hover:bg-[#EAE7E0] dark:hover:bg-[#242320] transition-colors"
        >
          <FileCode className="w-4 h-4" />
          <span>Artifacts</span>
        </button>

        <button
          onClick={() => onSelectSection('mcp')}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-colors ${
            currentSection === 'mcp' || currentSection === 'skills'
              ? 'bg-[#E5E2DC] dark:bg-[#2E2D2B] text-[#C2410C] dark:text-[#EA580C]'
              : 'text-[#716E68] dark:text-[#9E9B94] hover:bg-[#EAE7E0] dark:hover:bg-[#242320]'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Customize (MCP & Skills)</span>
        </button>
      </div>

      {/* "Chats and tasks" Section */}
      <div className="flex-1 flex flex-col overflow-hidden px-2 pt-3">
        <div className="px-2.5 pb-2 flex items-center justify-between text-[11px] font-semibold text-[#716E68] dark:text-[#9E9B94]">
          <span>Chats and tasks</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="p-1 hover:bg-[#E5E2DC] dark:hover:bg-[#2E2D2B] rounded transition-colors"
              title="Search chats"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Search input if toggled */}
        {isSearchOpen && (
          <div className="px-2 pb-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-[#FFFFFF] dark:bg-[#20201E] border border-[#E5E2DC] dark:border-[#2E2D2B] focus:outline-none focus:border-[#C2410C] dark:focus:border-[#EA580C] text-[#1F1E1D] dark:text-[#F4F4F5] transition-colors"
              autoFocus
            />
          </div>
        )}

        {/* Scrollable Conversation List */}
        <div className="flex-1 overflow-y-auto space-y-0.5 pr-1">
          {filteredConversations.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-[#716E68] dark:text-[#9E9B94]">
              {searchQuery ? 'No matching chats' : 'No conversations yet'}
            </div>
          ) : (
            filteredConversations.map((item) => {
              const isActive = item.id === activeConversationId && currentSection === 'chat';
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    onSelectConversation(item.id);
                    onSelectSection('chat');
                  }}
                  className={`group relative flex items-center justify-between px-2.5 py-2 rounded-lg text-xs cursor-pointer transition-colors ${
                    isActive
                      ? 'bg-[#E5E2DC] dark:bg-[#2E2D2B] font-medium text-[#1F1E1D] dark:text-white'
                      : 'text-[#52504C] dark:text-[#B0ACA4] hover:bg-[#EAE7E0] dark:hover:bg-[#242320]'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate pr-6">
                    <span className="text-[10px] text-[#A8A49C] dark:text-[#6E6B65]">○</span>
                    <span className="truncate">{item.title || 'Untitled Chat'}</span>
                  </div>

                  <button
                    onClick={(e) => handleDeleteConversation(e, item.id)}
                    title="Delete Chat"
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-500 rounded transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Bottom User Profile & Theme Footer */}
      <div className="p-2.5 border-t border-[#E5E2DC] dark:border-[#2E2D2B] flex items-center justify-between">
        <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-[#E5E2DC] dark:hover:bg-[#2E2D2B] cursor-pointer flex-1 transition-colors">
          <div className="w-7 h-7 rounded-full bg-[#C2410C]/15 dark:bg-[#EA580C]/20 text-[#C2410C] dark:text-[#EA580C] font-semibold flex items-center justify-center text-xs">
            H
          </div>
          <div className="flex flex-col truncate">
            <span className="text-xs font-semibold leading-tight">Harsh</span>
            <span className="text-[10px] text-[#716E68] dark:text-[#9E9B94] leading-tight">Local Edge</span>
          </div>
          <ChevronDown className="w-3.5 h-3.5 ml-auto text-[#716E68] dark:text-[#9E9B94]" />
        </div>

        <div className="flex items-center gap-1 pl-1">
          <button
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            className="p-2 rounded-lg text-[#716E68] dark:text-[#9E9B94] hover:bg-[#E5E2DC] dark:hover:bg-[#2E2D2B] transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            onClick={() => onSelectSection('settings')}
            title="Settings"
            className="p-2 rounded-lg text-[#716E68] dark:text-[#9E9B94] hover:bg-[#E5E2DC] dark:hover:bg-[#2E2D2B] transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
