import React from 'react';
import { MessageSquare, Plug, Puzzle, Settings } from 'lucide-react';

export type NavSection = 'chat' | 'mcp' | 'skills' | 'settings';

interface SidebarProps {
  currentSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  onNewChat?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentSection, onSelectSection }) => {
  const navItems = [
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'mcp', label: 'MCP Servers', icon: Plug },
    { id: 'skills', label: 'Skills', icon: Puzzle },
    { id: 'settings', label: 'Settings', icon: Settings },
  ] as const;

  return (
    <div className="w-16 bg-[#090b10] border-r border-[#1a1f2c] flex flex-col items-center py-5 justify-between h-full select-none shrink-0 z-20">
      <div className="flex flex-col items-center space-y-6 w-full">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectSection(item.id)}
              title={item.label}
              className={`relative w-full flex items-center justify-center py-3 transition-colors ${
                isActive
                  ? 'text-[#38bdf8]'
                  : 'text-[#64748b] hover:text-[#94a3b8]'
              }`}
            >
              {/* Active left indicator line */}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#38bdf8] rounded-r" />
              )}
              <Icon className="w-5 h-5" />
            </button>
          );
        })}
      </div>
    </div>
  );
};
