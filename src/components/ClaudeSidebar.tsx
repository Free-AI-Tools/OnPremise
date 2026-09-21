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
  ChevronDown,
  Pencil,
  Check,
  X,
  ArrowUpRight,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useUser } from '../context/UserContext';
import { formatShortRelativeTime } from '../utils/date';

export type NavSection = 'chat' | 'mcp' | 'skills' | 'settings' | 'artifacts' | 'all-chats';

export interface ConversationItem {
  id: string;
  title: string;
  updated_at?: string;
  created_at?: string;
  last_message_at?: string;
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
  const { userName, setUserName } = useUser();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleProfileClick = () => {
    const newName = window.prompt('Update your profile name:', userName);
    if (newName && newName.trim()) {
      setUserName(newName.trim());
    }
  };

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

  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editTitleDraft, setEditTitleDraft] = useState('');

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

  const handleStartRenameChat = (e: React.MouseEvent, item: ConversationItem) => {
    e.stopPropagation();
    setEditingChatId(item.id);
    setEditTitleDraft(item.title || 'Untitled Chat');
  };

  const handleSaveRenameChat = async (e: React.MouseEvent | React.KeyboardEvent, id: string) => {
    e.stopPropagation();
    const trimmed = editTitleDraft.trim();
    if (!trimmed) {
      setEditingChatId(null);
      return;
    }
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: trimmed } : c))
    );
    setEditingChatId(null);
    try {
      await fetch(`http://localhost:8000/conversations/${id}/title`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: trimmed }),
      });
      window.dispatchEvent(new CustomEvent('conversation-renamed', { detail: { id, title: trimmed } }));
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
          disabled
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition-colors text-[#716E68] dark:text-[#9E9B94] opacity-70 cursor-not-allowed"
          title="Coming in a future update"
        >
          <div className="flex items-center gap-2.5">
            <Sliders className="w-4 h-4" />
            <span>Customize (MCP & Skills)</span>
          </div>
          <span className="text-[9px] font-bold uppercase tracking-wider bg-[#E5E2DC] dark:bg-[#2E2D2B] px-1.5 py-0.5 rounded-sm">Soon</span>
        </button>
      </div>

      {/* "Chats and tasks" Section */}
      <div className="flex-1 flex flex-col overflow-hidden px-2 pt-3">
        <div className="px-2.5 pb-2 flex items-center justify-between text-[11px] font-semibold text-[#716E68] dark:text-[#9E9B94]">
          <button
            onClick={() => onSelectSection('all-chats')}
            className="flex items-center gap-1 hover:text-[#1F1E1D] dark:hover:text-[#F4F4F5] transition-colors cursor-pointer"
            title="View all chats and tasks"
          >
            <span>Chats and tasks</span>
            <ChevronDown className="w-3 h-3 opacity-60" />
          </button>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onSelectSection('all-chats')}
              className="p-1 hover:bg-[#E5E2DC] dark:hover:bg-[#2E2D2B] rounded transition-colors"
              title="Open all chats and tasks"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
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
            <>
              {(searchQuery ? filteredConversations : filteredConversations.slice(0, 15)).map((item) => {
                const isActive = item.id === activeConversationId && currentSection === 'chat';
                const isEditing = editingChatId === item.id;

                if (isEditing) {
                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-[#E5E2DC] dark:bg-[#2E2D2B]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="text"
                        value={editTitleDraft}
                        onChange={(e) => setEditTitleDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveRenameChat(e, item.id);
                          if (e.key === 'Escape') setEditingChatId(null);
                        }}
                        className="flex-1 min-w-0 text-xs px-2 py-1 rounded bg-[#FAF9F5] dark:bg-[#1A1918] border border-[#C2410C] dark:border-[#EA580C] text-[#1F1E1D] dark:text-[#F4F4F5] focus:outline-none"
                        autoFocus
                      />
                      <button
                        onClick={(e) => handleSaveRenameChat(e, item.id)}
                        className="p-1 text-emerald-600 dark:text-emerald-400 hover:bg-[#DCD8D0] dark:hover:bg-[#3D3B37] rounded"
                        title="Save title"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingChatId(null);
                        }}
                        className="p-1 text-[#716E68] dark:text-[#9E9B94] hover:bg-[#DCD8D0] dark:hover:bg-[#3D3B37] rounded"
                        title="Cancel"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                }

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
                    <div className="flex items-center gap-2 truncate min-w-0 pr-2">
                      <span className="text-[10px] text-[#A8A49C] dark:text-[#6E6B65] shrink-0">○</span>
                      <span className="truncate">{item.title || 'Untitled Chat'}</span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 ml-1">
                      <span className="text-[10px] text-[#A8A49C] dark:text-[#6E6B65] group-hover:hidden select-none font-mono">
                        {formatShortRelativeTime(item.last_message_at || item.created_at || item.updated_at)}
                      </span>

                      <div className="hidden group-hover:flex items-center gap-0.5">
                        <button
                          onClick={(e) => handleStartRenameChat(e, item)}
                          title="Rename Chat"
                          className="p-1 hover:text-[#C2410C] dark:hover:text-[#EA580C] rounded transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteConversation(e, item.id)}
                          title="Delete Chat"
                          className="p-1 hover:text-rose-500 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* View all link matching Screenshot 1 */}
              {filteredConversations.length > 0 && (
                <button
                  onClick={() => onSelectSection('all-chats')}
                  className={`w-full text-left px-2.5 py-2 text-xs rounded-lg transition-colors flex items-center justify-between group ${
                    currentSection === 'all-chats'
                      ? 'bg-[#E5E2DC] dark:bg-[#2E2D2B] font-medium text-[#1F1E1D] dark:text-white'
                      : 'text-[#716E68] dark:text-[#9E9B94] hover:bg-[#EAE7E0] dark:hover:bg-[#242320] hover:text-[#1F1E1D] dark:hover:text-[#F4F4F5]'
                  }`}
                >
                  <span>View all</span>
                  <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Bottom User Profile & Theme Footer */}
      <div className="p-2.5 border-t border-[#E5E2DC] dark:border-[#2E2D2B] flex items-center justify-between">
        <div 
          onClick={handleProfileClick}
          className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-[#E5E2DC] dark:hover:bg-[#2E2D2B] cursor-pointer flex-1 transition-colors"
        >
          <div className="w-7 h-7 rounded-full bg-[#C2410C]/15 dark:bg-[#EA580C]/20 text-[#C2410C] dark:text-[#EA580C] font-semibold flex items-center justify-center text-xs">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="flex flex-col truncate">
            <span className="text-xs font-semibold leading-tight">{userName}</span>
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
