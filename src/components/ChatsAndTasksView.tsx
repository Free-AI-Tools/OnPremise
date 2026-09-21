import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  SlidersHorizontal,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  MessageSquare,
  CheckSquare,
  Square,
  ArrowLeft,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export interface ConversationItem {
  id: string;
  title: string;
  created_at?: string;
  updated_at?: string;
  last_message_at?: string;
  active_skills?: string[];
}

interface ChatsAndTasksViewProps {
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onRefreshSidebar?: () => void;
}
import { formatRelativeTime } from '../utils/date';

export const ChatsAndTasksView: React.FC<ChatsAndTasksViewProps> = ({
  onSelectConversation,
  onNewChat,
  onRefreshSidebar,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [sortOrder, setSortOrder] = useState<'recent' | 'oldest' | 'alphabetical'>('recent');
  const [showSortMenu, setShowSortMenu] = useState(false);

  // Selection mode
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // In-place rename
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitleDraft] = useState('');

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:8000/conversations');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setConversations(data);
        }
      }
    } catch {
      // Offline fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  const filteredConversations = useMemo(() => {
    let result = conversations.filter((c) =>
      (c.title || 'Untitled Chat').toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (sortOrder === 'recent') {
      result.sort((a, b) => {
        const tsA = a.last_message_at || a.created_at || '';
        const tsB = b.last_message_at || b.created_at || '';
        return tsB.localeCompare(tsA);
      });
    } else if (sortOrder === 'oldest') {
      result.sort((a, b) => {
        const tsA = a.last_message_at || a.created_at || '';
        const tsB = b.last_message_at || b.created_at || '';
        return tsA.localeCompare(tsB);
      });
    } else if (sortOrder === 'alphabetical') {
      result.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    }

    return result;
  }, [conversations, searchQuery, sortOrder]);

  const toggleSelect = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredConversations.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredConversations.map((c) => c.id)));
    }
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await fetch(`http://localhost:8000/conversations/${id}`, { method: 'DELETE' });
      setConversations((prev) => prev.filter((c) => c.id !== id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      if (onRefreshSidebar) onRefreshSidebar();
    } catch {
      // Offline
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    const idsToDelete = Array.from(selectedIds);
    try {
      await Promise.all(
        idsToDelete.map((id) =>
          fetch(`http://localhost:8000/conversations/${id}`, { method: 'DELETE' })
        )
      );
      setConversations((prev) => prev.filter((c) => !selectedIds.has(c.id)));
      setSelectedIds(new Set());
      setIsSelectMode(false);
      if (onRefreshSidebar) onRefreshSidebar();
    } catch {
      // Offline
    }
  };

  const handleStartRename = (item: ConversationItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(item.id);
    setEditTitleDraft(item.title || 'Untitled Chat');
  };

  const handleSaveRename = async (id: string, e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    const trimmed = editTitle.trim();
    if (!trimmed) {
      setEditingId(null);
      return;
    }
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: trimmed } : c))
    );
    setEditingId(null);

    try {
      await fetch(`http://localhost:8000/conversations/${id}/title`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: trimmed }),
      });
      window.dispatchEvent(
        new CustomEvent('conversation-renamed', { detail: { id, title: trimmed } })
      );
      if (onRefreshSidebar) onRefreshSidebar();
    } catch {
      // Offline
    }
  };

  return (
    <div
      className={`flex-1 h-full overflow-y-auto ${
        isDark ? 'bg-[#141413] text-[#F4F4F5]' : 'bg-[#FAF9F5] text-[#1F1E1D]'
      }`}
    >
      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Header matching Claude aesthetic */}
        <div className="flex items-center justify-between mb-8 pb-4">
          <h1 className="text-3xl font-serif font-normal tracking-tight text-[#1F1E1D] dark:text-[#F4F4F5]">
            Chats and tasks
          </h1>

          <div className="flex items-center gap-2">
            {/* Search Input or Toggle */}
            {showSearchInput ? (
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search chats..."
                  className="text-xs px-3 py-1.5 pr-7 rounded-full bg-[#FFFFFF] dark:bg-[#20201E] border border-[#E5E2DC] dark:border-[#2E2D2B] focus:outline-none focus:border-[#C2410C] dark:focus:border-[#EA580C] text-[#1F1E1D] dark:text-[#F4F4F5] w-48 transition-all"
                  autoFocus
                />
                <button
                  onClick={() => {
                    setShowSearchInput(false);
                    setSearchQuery('');
                  }}
                  className="absolute right-2 text-[#716E68] dark:text-[#9E9B94] hover:text-[#1F1E1D] dark:hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowSearchInput(true)}
                className="p-2 rounded-lg text-[#716E68] dark:text-[#9E9B94] hover:bg-[#EAE7E0] dark:hover:bg-[#242320] transition-colors"
                title="Search chats"
              >
                <Search className="w-4 h-4" />
              </button>
            )}

            {/* Filter / Sort dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowSortMenu(!showSortMenu)}
                className={`p-2 rounded-lg transition-colors ${
                  showSortMenu
                    ? 'bg-[#E5E2DC] dark:bg-[#2E2D2B] text-[#C2410C] dark:text-[#EA580C]'
                    : 'text-[#716E68] dark:text-[#9E9B94] hover:bg-[#EAE7E0] dark:hover:bg-[#242320]'
                }`}
                title="Sort options"
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>

              {showSortMenu && (
                <div
                  className="absolute right-0 mt-2 w-44 rounded-xl shadow-lg border z-30 p-1 text-xs bg-[#FAF9F5] dark:bg-[#20201E] border-[#E5E2DC] dark:border-[#2E2D2B]"
                  onMouseLeave={() => setShowSortMenu(false)}
                >
                  <button
                    onClick={() => {
                      setSortOrder('recent');
                      setShowSortMenu(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      sortOrder === 'recent'
                        ? 'bg-[#E5E2DC] dark:bg-[#2E2D2B] font-medium text-[#C2410C] dark:text-[#EA580C]'
                        : 'hover:bg-[#EAE7E0] dark:hover:bg-[#282826] text-[#52504C] dark:text-[#B0ACA4]'
                    }`}
                  >
                    Most recent
                  </button>
                  <button
                    onClick={() => {
                      setSortOrder('oldest');
                      setShowSortMenu(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      sortOrder === 'oldest'
                        ? 'bg-[#E5E2DC] dark:bg-[#2E2D2B] font-medium text-[#C2410C] dark:text-[#EA580C]'
                        : 'hover:bg-[#EAE7E0] dark:hover:bg-[#282826] text-[#52504C] dark:text-[#B0ACA4]'
                    }`}
                  >
                    Oldest first
                  </button>
                  <button
                    onClick={() => {
                      setSortOrder('alphabetical');
                      setShowSortMenu(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      sortOrder === 'alphabetical'
                        ? 'bg-[#E5E2DC] dark:bg-[#2E2D2B] font-medium text-[#C2410C] dark:text-[#EA580C]'
                        : 'hover:bg-[#EAE7E0] dark:hover:bg-[#282826] text-[#52504C] dark:text-[#B0ACA4]'
                    }`}
                  >
                    Alphabetical (A-Z)
                  </button>
                </div>
              )}
            </div>

            {/* Select Toggle Button */}
            <button
              onClick={() => {
                setIsSelectMode(!isSelectMode);
                if (isSelectMode) setSelectedIds(new Set());
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                isSelectMode
                  ? 'border-[#C2410C] dark:border-[#EA580C] text-[#C2410C] dark:text-[#EA580C] bg-[#C2410C]/5'
                  : 'border-[#E5E2DC] dark:border-[#2E2D2B] text-[#52504C] dark:text-[#B0ACA4] hover:bg-[#EAE7E0] dark:hover:bg-[#242320]'
              }`}
            >
              {isSelectMode ? 'Cancel' : 'Select'}
            </button>

            {/* New Button */}
            <button
              onClick={onNewChat}
              className="px-4 py-1.5 rounded-full text-xs font-medium bg-[#1F1E1D] dark:bg-[#F4F4F5] text-white dark:text-[#1F1E1D] hover:opacity-90 transition-opacity shadow-xs flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New</span>
            </button>
          </div>
        </div>

        {/* Batch Selection Banner */}
        {isSelectMode && (
          <div className="flex items-center justify-between px-4 py-2.5 mb-4 rounded-xl bg-[#F3F1EC] dark:bg-[#1E1E1D] border border-[#E5E2DC] dark:border-[#2E2D2B] text-xs">
            <div className="flex items-center gap-3">
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-1.5 text-[#52504C] dark:text-[#B0ACA4] hover:text-[#1F1E1D] dark:hover:text-white font-medium"
              >
                {selectedIds.size === filteredConversations.length && filteredConversations.length > 0 ? (
                  <CheckSquare className="w-4 h-4 text-[#C2410C] dark:text-[#EA580C]" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                <span>Select all ({filteredConversations.length})</span>
              </button>
              <span className="text-[#716E68] dark:text-[#9E9B94]">
                • {selectedIds.size} selected
              </span>
            </div>

            {selectedIds.size > 0 && (
              <button
                onClick={handleBatchDelete}
                className="px-3 py-1 rounded-lg bg-rose-500 hover:bg-rose-600 text-white font-medium flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete selected ({selectedIds.size})</span>
              </button>
            )}
          </div>
        )}

        {/* Conversation List Table */}
        {loading ? (
          <div className="py-20 text-center text-xs text-[#716E68] dark:text-[#9E9B94]">
            Loading conversations...
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="py-20 text-center">
            <MessageSquare className="w-8 h-8 mx-auto text-[#A8A49C] dark:text-[#6E6B65] mb-2 opacity-50" />
            <p className="text-sm font-medium text-[#716E68] dark:text-[#9E9B94]">
              {searchQuery ? 'No matching conversations found' : 'No conversations yet'}
            </p>
            {!searchQuery && (
              <button
                onClick={onNewChat}
                className="mt-4 px-4 py-2 rounded-full text-xs font-medium bg-[#1F1E1D] dark:bg-[#F4F4F5] text-white dark:text-[#1F1E1D] hover:opacity-90"
              >
                Start your first chat
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-[#E5E2DC] dark:divide-[#2E2D2B] border-t border-[#E5E2DC] dark:border-[#2E2D2B]">
            {filteredConversations.map((item) => {
              const isSelected = selectedIds.has(item.id);
              const isEditing = editingId === item.id;
              const dateDisplay = formatRelativeTime(item.last_message_at || item.created_at);

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    if (isSelectMode) {
                      toggleSelect(item.id);
                    } else if (!isEditing) {
                      onSelectConversation(item.id);
                    }
                  }}
                  className={`group py-3.5 px-3 flex items-center justify-between transition-colors cursor-pointer rounded-lg ${
                    isSelected
                      ? 'bg-[#C2410C]/5 dark:bg-[#EA580C]/10'
                      : 'hover:bg-[#F3F1EC]/70 dark:hover:bg-[#1C1B1A]'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0 pr-4">
                    {/* Checkbox for Select mode */}
                    {isSelectMode && (
                      <button
                        onClick={(e) => toggleSelect(item.id, e)}
                        className="text-[#716E68] dark:text-[#9E9B94] hover:text-[#C2410C] dark:hover:text-[#EA580C] shrink-0"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-[#C2410C] dark:text-[#EA580C]" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    )}

                    {/* Title or Inline Edit */}
                    {isEditing ? (
                      <div
                        className="flex items-center gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitleDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveRename(item.id, e);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          className="text-sm px-2 py-1 rounded bg-[#FFFFFF] dark:bg-[#20201E] border border-[#C2410C] dark:border-[#EA580C] text-[#1F1E1D] dark:text-[#F4F4F5] focus:outline-none w-72"
                          autoFocus
                        />
                        <button
                          onClick={(e) => handleSaveRename(item.id, e)}
                          className="p-1 text-emerald-600 dark:text-emerald-400 hover:bg-[#E5E2DC] dark:hover:bg-[#2E2D2B] rounded"
                          title="Save"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingId(null);
                          }}
                          className="p-1 text-[#716E68] dark:text-[#9E9B94] hover:bg-[#E5E2DC] dark:hover:bg-[#2E2D2B] rounded"
                          title="Cancel"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-sm font-normal text-[#1F1E1D] dark:text-[#F4F4F5] group-hover:text-[#C2410C] dark:group-hover:text-[#EA580C] transition-colors truncate">
                        {item.title || 'Untitled Chat'}
                      </span>
                    )}
                  </div>

                  {/* Right side: Timestamp & Hover Action Buttons */}
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-[#716E68] dark:text-[#9E9B94] font-normal group-hover:hidden">
                      {dateDisplay}
                    </span>

                    {/* Quick Action Icons on hover */}
                    <div className="hidden group-hover:flex items-center gap-1">
                      <span className="text-xs text-[#716E68] dark:text-[#9E9B94] mr-2">
                        {dateDisplay}
                      </span>
                      <button
                        onClick={(e) => handleStartRename(item, e)}
                        title="Rename conversation"
                        className="p-1.5 rounded text-[#716E68] dark:text-[#9E9B94] hover:text-[#C2410C] dark:hover:text-[#EA580C] hover:bg-[#E5E2DC] dark:hover:bg-[#2E2D2B] transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(item.id, e)}
                        title="Delete conversation"
                        className="p-1.5 rounded text-[#716E68] dark:text-[#9E9B94] hover:text-rose-500 hover:bg-[#E5E2DC] dark:hover:bg-[#2E2D2B] transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
