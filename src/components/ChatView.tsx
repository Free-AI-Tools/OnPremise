import React, { useState, useEffect, useRef } from 'react';
import { Search, Upload, ChevronDown, Send } from 'lucide-react';
import { A2UIRenderer, A2UIPayload } from './a2ui/A2UIRenderer';
import { ArtifactPanel } from './ArtifactPanel';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  time?: string;
  a2uiPayload?: A2UIPayload | null;
  artifactCode?: string;
}

interface ChatViewProps {
  conversationId: string;
  onOpenExport: () => void;
}

export const ChatView: React.FC<ChatViewProps> = ({ conversationId, onOpenExport }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'm1',
      role: 'user',
      content: 'Can you explain what is a REST API?',
      time: '10:24 AM',
    },
    {
      id: 'm2',
      role: 'assistant',
      content:
        'A REST API (Representational State Transfer) is an architectural style for building web services. It uses standard HTTP methods (GET, POST, PUT, DELETE) to perform operations on resources, typically in a stateless manner. Data is often exchanged in JSON format, making it simple and widely compatible.',
      time: '10:24 AM',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [status, setStatus] = useState<'idle' | 'thinking' | 'searching'>('idle');
  const [activeToolName, setActiveToolName] = useState<string | null>(null);
  const [streamingDelta, setStreamingDelta] = useState('');
  const [activeA2UIPayload, setActiveA2UIPayload] = useState<A2UIPayload | null>(null);
  const [artifact, setArtifact] = useState<{ filename: string; code: string } | null>({
    filename: 'rest_api_example.py',
    code: `from flask import Flask, jsonify, request\n\napp = Flask(__name__)\n\n# In-memory data (for demo purposes)\ntodos = [\n    {"id": 1, "title": "Learn Python", "done": False},\n    {"id": 2, "title": "Build a project", "done": True}\n]\n\n@app.route("/todos", methods=["GET"])\ndef get_todos():\n    return jsonify(todos)\n\n@app.route("/todos", methods=["POST"])\ndef create_todo():\n    data = request.json\n    new_id = len(todos) + 1\n    todo = {\n        "id": new_id,\n        "title": data.get("title", ""),\n        "done": data.get("done", False)\n    }\n    todos.append(todo)\n    return jsonify(todo), 201`,
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingDelta, status]);

  const handleSend = async () => {
    if (!inputText.trim() || status !== 'idle') return;

    const userText = inputText.trim();
    setInputText('');
    setStatus('thinking');
    setActiveToolName(null);
    setStreamingDelta('');

    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMessage: Message = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: userText,
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
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Backend returned status ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let currentAssistantText = '';
      let currentA2UI: A2UIPayload | null = null;

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
                  setActiveToolName(event.toolCallName || 'web_search');
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
                  currentAssistantText += event.delta;
                  setStreamingDelta(currentAssistantText);
                  break;

                case 'TEXT_MESSAGE_END':
                  setMessages((prev) => [
                    ...prev,
                    {
                      id: `asst_${Date.now()}`,
                      role: 'assistant',
                      content: currentAssistantText,
                      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                      a2uiPayload: currentA2UI,
                    },
                  ]);
                  setStreamingDelta('');
                  break;

                case 'RUN_FINISHED':
                  setStatus('idle');
                  setActiveToolName(null);
                  break;
              }
            } catch (e) {
              // Ignore partial frames
            }
          }
        }
      }
    } catch (err: any) {
      setStatus('idle');
    } finally {
      setStatus('idle');
    }
  };

  return (
    <div className="flex-1 flex h-full bg-[#0e1117] text-[#f8fafc] overflow-hidden">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header matching chat.png */}
        <div className="h-16 border-b border-[#1a1f2c] px-6 flex items-center justify-between bg-[#0e1117]">
          <div>
            <h1 className="text-lg font-bold text-[#f8fafc]">Project Help</h1>
            <p className="text-xs text-[#64748b]">General conversation</p>
          </div>
          <button
            onClick={onOpenExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#232d42] bg-[#141a29] hover:bg-[#1e273b] text-xs font-medium text-[#38bdf8] transition-colors"
          >
            <Upload className="w-3.5 h-3.5 rotate-180" />
            <span>Export</span>
          </button>
        </div>

        {/* Messages Feed matching chat.png */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              {/* Message Header (You: 10:24 AM / Assistant: 10:24 AM) */}
              <div className="text-[12px] font-semibold text-[#60a5fa] mb-1">
                {msg.role === 'user' ? 'You:' : 'Assistant:'}{' '}
                <span className="font-normal text-[#64748b] text-[11px] ml-1">
                  {msg.time || '10:24 AM'}
                </span>
              </div>

              {/* Message Body */}
              <div className="max-w-2xl text-xs leading-relaxed text-[#cbd5e1] font-sans">
                {msg.content}
                {msg.a2uiPayload && <A2UIRenderer payload={msg.a2uiPayload} />}
              </div>
            </div>
          ))}

          {/* Tool execution chip matching chat.png */}
          {status === 'searching' && (
            <div className="flex items-center gap-2.5 px-4 py-2.5 bg-[#141a29] border border-[#232d42] rounded-xl text-xs text-[#cbd5e1] w-fit">
              <Search className="w-4 h-4 text-[#94a3b8] animate-spin" />
              <span>Searching the web...</span>
            </div>
          )}

          {/* Live Streaming Assistant Response */}
          {streamingDelta && (
            <div className="flex flex-col items-start">
              <div className="text-[12px] font-semibold text-[#60a5fa] mb-1">
                Assistant:{' '}
                <span className="font-normal text-[#64748b] text-[11px] ml-1">Just now</span>
              </div>
              <div className="max-w-2xl text-xs leading-relaxed text-[#cbd5e1] font-sans">
                {streamingDelta}
                <span className="inline-block w-1.5 h-3 bg-[#38bdf8] ml-1 animate-pulse" />
                {activeA2UIPayload && <A2UIRenderer payload={activeA2UIPayload} />}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Control Box matching chat.png */}
        <div className="p-6 bg-[#0e1117] border-t border-[#1a1f2c]/50">
          {/* Quick Toggle Chips above input */}
          <div className="flex items-center gap-2 mb-3">
            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-[#141a29] hover:bg-[#1e273b] border border-[#232d42] text-xs text-[#cbd5e1] rounded-lg transition-colors">
              <span>Skills</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#64748b]" />
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-[#141a29] hover:bg-[#1e273b] border border-[#232d42] text-xs text-[#cbd5e1] rounded-lg transition-colors">
              <span>Tools</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#64748b]" />
            </button>
          </div>

          {/* Input Box & Send Button */}
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={inputText}
              disabled={status !== 'idle'}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type your message here..."
              className="flex-1 bg-[#141a29] border border-[#232d42] rounded-xl px-4 py-3 text-xs text-[#f8fafc] placeholder-[#64748b] focus:outline-none focus:border-[#38bdf8] transition-colors"
            />
            <button
              onClick={handleSend}
              disabled={status !== 'idle' || !inputText.trim()}
              className="px-5 py-3 bg-[#60a5fa] hover:bg-[#3b82f6] disabled:bg-[#1e273b] disabled:text-[#64748b] text-[#090b10] font-semibold text-xs rounded-xl shadow-md transition-colors"
            >
              Send
            </button>
          </div>
        </div>
      </div>

      {/* Right Artifact Panel */}
      {artifact && (
        <ArtifactPanel
          filename={artifact.filename}
          code={artifact.code}
          onClose={() => setArtifact(null)}
        />
      )}
    </div>
  );
};
