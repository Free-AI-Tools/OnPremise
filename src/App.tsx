import React, { useState } from 'react';
import { Sidebar, NavSection } from './components/Sidebar';
import { ChatView } from './components/ChatView';
import { MCPManagerView } from './components/MCPManagerView';
import { SkillsManagerView } from './components/SkillsManagerView';
import { SettingsView } from './components/SettingsView';
import { ExportModal } from './components/ExportModal';

export const App: React.FC = () => {
  const [currentSection, setCurrentSection] = useState<NavSection>('chat');
  const [conversationId, setConversationId] = useState<string>(() => `conv_${Date.now()}`);
  const [showExportModal, setShowExportModal] = useState(false);

  const handleNewChat = () => {
    setConversationId(`conv_${Date.now()}`);
    setCurrentSection('chat');
  };

  return (
    <div className="flex h-screen w-screen bg-slate-900 overflow-hidden font-sans select-none">
      {/* Navigation Shell */}
      <Sidebar
        currentSection={currentSection}
        onSelectSection={setCurrentSection}
        onNewChat={handleNewChat}
      />

      {/* Main Content Area */}
      <div className="flex-1 h-full overflow-hidden flex flex-col">
        {currentSection === 'chat' && (
          <ChatView
            conversationId={conversationId}
            onOpenExport={() => setShowExportModal(true)}
          />
        )}
        {currentSection === 'mcp' && <MCPManagerView />}
        {currentSection === 'skills' && <SkillsManagerView />}
        {currentSection === 'settings' && <SettingsView />}
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <ExportModal
          conversationId={conversationId}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </div>
  );
};

export default App;
