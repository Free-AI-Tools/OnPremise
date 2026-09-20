import React, { useState, useEffect, useRef } from 'react';
import { Upload, FileCode, Sparkles, Search, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { A2UIPayload } from './a2ui/A2UIRenderer';
import { CollapsibleToolOutput } from './CollapsibleToolOutput';
import { FormattedMessage } from './FormattedMessage';
import { ArtifactPanel } from './ArtifactPanel';
import { ClaudeHero } from './ClaudeHero';
import { ClaudeInputCard, AttachedFile } from './ClaudeInputCard';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  time?: string;
  a2uiPayload?: A2UIPayload | null;
  artifact?: { filename: string; language: string; code: string } | null;
}

interface ChatViewProps {
  conversationId: string;
  onSelectConversation: (id: string) => void;
  onOpenExport: () => void;
  onMessageSent?: () => void;
}

export const ChatView: React.FC<ChatViewProps> = ({
  conversationId,
  onOpenExport,
  onMessageSent,
}) => {
  const { theme, toggleTheme } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<'idle' | 'thinking' | 'searching'>('idle');
  const [activeToolName, setActiveToolName] = useState<string | null>(null);
  const [streamingDelta, setStreamingDelta] = useState('');
  const [activeA2UIPayload, setActiveA2UIPayload] = useState<A2UIPayload | null>(null);
  const [tokenCount, setTokenCount] = useState(0);

  const [activeArtifact, setActiveArtifact] = useState<{
    filename: string;
    language: string;
    code: string;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingDelta, status, activeToolName]);

  // Load conversation thread messages
  useEffect(() => {
    const loadThread = async () => {
      try {
        const res = await fetch(`http://localhost:8000/conversations/${conversationId}`);
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.messages)) {
            setMessages(
              data.messages.map((m: any) => {
                const codeMatch = m.content.match(/```(\w+)?\n([\s\S]*?)```/);
                const artifactObj = codeMatch
                  ? {
                      filename: `generated_artifact.${codeMatch[1] || 'txt'}`,
                      language: codeMatch[1] || 'text',
                      code: codeMatch[2].trim(),
                    }
                  : null;

                return {
                  id: m.id,
                  role: m.role,
                  content: m.content,
                  time: m.timestamp
                    ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : undefined,
                  a2uiPayload: m.a2ui_payload,
                  artifact: artifactObj,
                };
              })
            );
          }
        } else {
          setMessages([]);
        }
      } catch {
        setMessages([]);
      }
    };
    loadThread();
  }, [conversationId]);

  const extractCodeArtifact = (text: string) => {
    const codeMatch = text.match(/```(\w+)?\n([\s\S]*?)```/);
    if (codeMatch) {
      const lang = codeMatch[1] || 'python';
      const ext = lang === 'python' ? 'py' : lang === 'javascript' ? 'js' : lang === 'json' ? 'json' : 'txt';
      return {
        filename: `artifact_${Date.now().toString().slice(-4)}.${ext}`,
        language: lang,
        code: codeMatch[2].trim(),
      };
    }
    return null;
  };

  const handleSend = async (userText: string, files: AttachedFile[] = [], toolsExplicitlyEnabled: boolean = true) => {
    if ((!userText && files.length === 0) || status !== 'idle') return;

    // Compose final user prompt including attached files if any
    let fullPrompt = userText;
    if (files.length > 0) {
      const fileBlocks = files.map(f => `[Attached File: ${f.name}]\n\`\`\`\n${f.content}\n\`\`\``).join('\n\n');
      fullPrompt = userText ? `${fileBlocks}\n\n${userText}` : fileBlocks;
    }

    setStatus('thinking');
    setActiveToolName(null);
    setStreamingDelta('');
    setActiveA2UIPayload(null);
    setTokenCount(0);

    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMessage: Message = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: fullPrompt,
      time: nowTime,
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);

    try {
      const response = await fetch('http://localhost:8000/awp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId: conversationId,
          messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
          // Pass tool preference flag if tools explicitly toggled
          forwardedProps: { toolsEnabled: toolsExplicitlyEnabled },
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Backend returned status ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let currentAssistantText = '';
      let currentA2UI: A2UIPayload | null = null;
      let tokens = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (!dataStr) continue;

            try {
              const event = JSON.parse(dataStr);

              switch (event.type) {
                case 'RUN_STARTED':
                  setStatus('thinking');
                  break;

                case 'TOOL_CALL_START':
                  setStatus('searching');
                  setActiveToolName(event.toolCallName || 'tool');
                  break;

                case 'TOOL_CALL_END':
                  setStatus('thinking');
                  setActiveToolName(null);
                  break;

                case 'CUSTOM':
                  if (event.name === 'a2ui:createSurface' && event.value) {
                    currentA2UI = event.value;
                    setActiveA2UIPayload(event.value);
                  }
                  break;

                case 'TEXT_MESSAGE_CONTENT':
                  setStatus('thinking');
                  tokens += 1;
                  setTokenCount(tokens);
                  currentAssistantText += event.delta;
                  setStreamingDelta(currentAssistantText);

                  const liveArtifact = extractCodeArtifact(currentAssistantText);
                  if (liveArtifact) {
                    setActiveArtifact(liveArtifact);
                  }
                  break;

                case 'TEXT_MESSAGE_END':
                  const finalArtifact = extractCodeArtifact(currentAssistantText);
                  setMessages((prev) => [
                    ...prev,
                    {
                      id: `asst_${Date.now()}`,
                      role: 'assistant',
                      content: currentAssistantText,
                      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                      a2uiPayload: currentA2UI,
                      artifact: finalArtifact,
                    },
                  ]);
                  if (finalArtifact) {
                    setActiveArtifact(finalArtifact);
                  }
                  setStreamingDelta('');
                  if (onMessageSent) onMessageSent();
                  break;

                case 'RUN_FINISHED':
                  setStatus('idle');
                  setActiveToolName(null);
                  break;
              }
            } catch {
              // Ignore partial chunk
            }
          }
        }
      }
    } catch {
      setStatus('idle');
    } finally {
      setStatus('idle');
    }
  };

  const isDark = theme === 'dark';

  return (
    <div className={`flex-1 flex h-full overflow-hidden relative ${
      isDark ? 'bg-[#141413] text-[#F4F4F5]' : 'bg-[#FAF9F5] text-[#1F1E1D]'
    }`}>
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header Bar */}
        <div className={`h-14 border-b px-6 flex items-center justify-between shrink-0 backdrop-blur-md z-10 ${
          isDark ? 'bg-[#141413]/90 border-[#2E2D2B]' : 'bg-[#FAF9F5]/90 border-[#E5E2DC]'
        }`}>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xs font-semibold truncate max-w-sm">
              {messages.length > 0 ? messages[0].content.slice(0, 35) + '...' : 'New Chat'}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {status !== 'idle' && (
              <div className="flex items-center gap-2 bg-[#F3F1EC] dark:bg-[#1E1E1E] border border-[#E5E2DC] dark:border-[#2E2D2B] px-3 py-1 rounded-full shadow-xs">
                <Sparkles className="w-3 h-3 text-[#C2410C] dark:text-[#EA580C] animate-spin" />
                <span className="text-[11px] font-mono text-[#C2410C] dark:text-[#EA580C]">
                  {status === 'searching'
                    ? `Running: ${activeToolName}`
                    : `Streaming (${tokenCount}t)`}
                </span>
              </div>
            )}

            <button
              onClick={toggleTheme}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
              className="p-1.5 rounded-lg border border-[#E5E2DC] dark:border-[#2E2D2B] bg-[#FFFFFF] dark:bg-[#20201E] hover:bg-[#F3F1EC] dark:hover:bg-[#2E2D2B] text-[#716E68] dark:text-[#9E9B94] transition-colors shadow-xs"
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={onOpenExport}
              title="Export Conversation"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5E2DC] dark:border-[#2E2D2B] bg-[#FFFFFF] dark:bg-[#20201E] hover:bg-[#F3F1EC] dark:hover:bg-[#2E2D2B] text-xs font-medium text-[#716E68] dark:text-[#9E9B94] transition-colors shadow-xs"
            >
              <Upload className="w-3.5 h-3.5 rotate-180" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Empty State / Welcome Hero View */}
        {messages.length === 0 && !streamingDelta ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 overflow-y-auto">
            <div className="w-full max-w-2xl flex flex-col items-center">
              <ClaudeHero />
              <div className="w-full mt-2">
                <ClaudeInputCard
                  onSend={handleSend}
                  disabled={status !== 'idle'}
                  status={status}
                  placeholder="How can I help you today?"
                />
              </div>
            </div>
          </div>
        ) : (
          /* Active Chat Conversation Feed */
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            <div className="max-w-3xl mx-auto space-y-6 pb-36">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div className="text-[11px] font-semibold text-[#716E68] dark:text-[#9E9B94] mb-1 px-1">
                    {msg.role === 'user' ? 'You' : 'Assistant'}{' '}
                    <span className="font-normal text-[10px] ml-1 opacity-70">
                      {msg.time}
                    </span>
                  </div>

                  <div
                    className={`text-sm leading-relaxed font-sans max-w-2xl rounded-2xl ${
                      msg.role === 'user'
                        ? 'bg-[#F3F1EC] dark:bg-[#20201E] px-4 py-3 text-[#1F1E1D] dark:text-[#F4F4F5] border border-[#E5E2DC] dark:border-[#2E2D2B]'
                        : 'px-1 py-1 text-[#1F1E1D] dark:text-[#F4F4F5] w-full'
                    }`}
                  >
                    {/* Collapsible Reasoning toggle chip placed strictly ABOVE final response! */}
                    {msg.a2uiPayload && <CollapsibleToolOutput payload={msg.a2uiPayload} />}

                    {/* Formatted Message (Parses Markdown tables & bullet percentages into charts) */}
                    <FormattedMessage content={msg.content} />

                    {/* View Artifact Chip */}
                    {msg.artifact && (
                      <button
                        onClick={() => msg.artifact && setActiveArtifact(msg.artifact)}
                        className="mt-2.5 flex items-center gap-2 px-3 py-1.5 bg-[#FFFFFF] dark:bg-[#1E1E1E] hover:bg-[#F3F1EC] dark:hover:bg-[#2E2D2B] border border-[#C2410C]/40 text-[#C2410C] dark:text-[#EA580C] rounded-lg text-xs font-mono transition-colors shadow-xs"
                      >
                        <FileCode className="w-4 h-4" />
                        <span>View Artifact ({msg.artifact.filename})</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* Tool Execution Searching Pill */}
              {status === 'searching' && (
                <div className="flex items-center gap-2 px-4 py-2 bg-[#FFFFFF] dark:bg-[#20201E] border border-[#E5E2DC] dark:border-[#2E2D2B] rounded-xl text-xs text-[#716E68] dark:text-[#9E9B94] w-fit shadow-xs">
                  <Search className="w-3.5 h-3.5 text-[#C2410C] dark:text-[#EA580C] animate-spin" />
                  <span>Searching and computing via {activeToolName}...</span>
                </div>
              )}

              {/* Live Streaming Delta */}
              {streamingDelta && (
                <div className="flex flex-col items-start w-full">
                  <div className="text-[11px] font-semibold text-[#716E68] dark:text-[#9E9B94] mb-1 px-1">
                    Assistant <span className="font-normal text-[10px] ml-1 opacity-70">Streaming...</span>
                  </div>
                  <div className="text-sm leading-relaxed text-[#1F1E1D] dark:text-[#F4F4F5] font-sans w-full max-w-2xl">
                    {activeA2UIPayload && <CollapsibleToolOutput payload={activeA2UIPayload} />}
                    <FormattedMessage content={streamingDelta} />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>
        )}

        {/* Docked Floating Claude Input Card when chat is active */}
        {messages.length > 0 && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#FAF9F5] via-[#FAF9F5]/90 to-transparent dark:from-[#141413] dark:via-[#141413]/90 z-20">
            <div className="max-w-3xl mx-auto">
              <ClaudeInputCard
                onSend={handleSend}
                disabled={status !== 'idle'}
                status={status}
                placeholder="Reply to assistant..."
              />
            </div>
          </div>
        )}
      </div>

      {/* Dynamic Slide-out Artifact Panel */}
      {activeArtifact && (
        <ArtifactPanel
          filename={activeArtifact.filename}
          language={activeArtifact.language}
          code={activeArtifact.code}
          onClose={() => setActiveArtifact(null)}
        />
      )}
    </div>
  );
};
