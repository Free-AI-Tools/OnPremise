import React, { useState } from 'react';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { UserProvider } from './context/UserContext';
import { ClaudeSidebar, NavSection } from './components/ClaudeSidebar';
import { ChatView } from './components/ChatView';
import { MCPManagerView } from './components/MCPManagerView';
import { SkillsManagerView } from './components/SkillsManagerView';
import { SettingsView } from './components/SettingsView';
import { ExportModal } from './components/ExportModal';
import { ChatsAndTasksView } from './components/ChatsAndTasksView';

export const MainApp: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [currentSection, setCurrentSection] = useState<NavSection>('chat');
  const [conversationId, setConversationId] = useState<string>(() => `conv_${Date.now()}`);
  const [showExportModal, setShowExportModal] = useState(false);
  const [sidebarRefresh, setSidebarRefresh] = useState(0);

  const handleNewChat = () => {
    setConversationId(`conv_${Date.now()}`);
    setCurrentSection('chat');
  };

  const handleMessageSent = () => {
    setSidebarRefresh((prev) => prev + 1);
  };

  return (
    <div className={`flex h-screen w-screen overflow-hidden font-sans transition-colors duration-200 ${
      isDark ? 'dark bg-[#141413] text-[#F4F4F5]' : 'bg-[#FAF9F5] text-[#1F1E1D]'
    }`}>
      {/* Claude Desktop Navigation Sidebar */}
      <ClaudeSidebar
        currentSection={currentSection}
        onSelectSection={setCurrentSection}
        activeConversationId={conversationId}
        onSelectConversation={(id) => {
          setConversationId(id);
          setCurrentSection('chat');
        }}
        onNewChat={handleNewChat}
        refreshTrigger={sidebarRefresh}
      />

      {/* Main Workspace Canvas */}
      <div className="flex-1 h-full overflow-hidden flex flex-col">
        {currentSection === 'chat' && (
          <ChatView
            conversationId={conversationId}
            onSelectConversation={setConversationId}
            onOpenExport={() => setShowExportModal(true)}
            onMessageSent={handleMessageSent}
          />
        )}
        {currentSection === 'all-chats' && (
          <ChatsAndTasksView
            onSelectConversation={(id) => {
              setConversationId(id);
              setCurrentSection('chat');
            }}
            onNewChat={handleNewChat}
            onRefreshSidebar={handleMessageSent}
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

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <UserProvider>
        <MainApp />
      </UserProvider>
    </ThemeProvider>
  );
};

export default App;
