import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BotMessageSquare,
  Send,
  Sparkles,
  AlertCircle,
  ShieldCheck,
  User,
  Plus,
  Info,
} from 'lucide-react';
import { api } from '../../services/api';
import { Card, CardHeader, CardTitle } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { AiConversation, AiStatus } from '../../types';

export const AiAssistantPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [inputMessage, setInputMessage] = useState('');
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Fetch AI Configuration Status
  const { data: status } = useQuery<AiStatus>({
    queryKey: ['ai-status'],
    queryFn: async () => {
      const resp = await api.get('/ai/status');
      return resp.data;
    },
  });

  // 2. Fetch Conversations
  const { data: conversations = [], isLoading: loadingConvs } = useQuery<AiConversation[]>({
    queryKey: ['ai-conversations'],
    queryFn: async () => {
      const resp = await api.get('/ai/conversations');
      return resp.data;
    },
  });

  // Automatically select the most recent conversation if none is selected
  useEffect(() => {
    if (!activeConvId && conversations.length > 0) {
      setActiveConvId(conversations[0].id);
    }
  }, [conversations, activeConvId]);

  // Current active conversation
  const activeConversation = conversations.find((c) => c.id === activeConvId);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversation?.messages]);

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: async ({ text, convId }: { text: string; convId: string | null }) => {
      const url = convId ? `/ai/chat?conversation_id=${convId}` : '/ai/chat';
      const resp = await api.post(url, { content: text });
      return resp.data;
    },
    onSuccess: (updatedConv: AiConversation) => {
      queryClient.invalidateQueries({ queryKey: ['ai-conversations'] });
      setActiveConvId(updatedConv.id);
      setInputMessage('');
    },
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || sendMutation.isPending) return;
    sendMutation.mutate({ text: inputMessage.trim(), convId: activeConvId });
  };

  const handleStartNewConversation = () => {
    setActiveConvId(null);
    setInputMessage('Can you provide an analysis of my past 7 days fitness records and protein progress?');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2.5">
            <BotMessageSquare className="w-6 h-6 text-emerald-400" />
            AI Fitness Intelligence Assistant
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Grounded in your authorized database logs, distinguishing recorded facts from estimates.
          </p>
        </div>

        {/* Integration Status Badge */}
        <div className="flex items-center gap-2">
          {status?.is_configured ? (
            <Badge variant="emerald" size="md">
              <Sparkles className="w-3.5 h-3.5" />
              Live AI Model ({status.model})
            </Badge>
          ) : (
            <Badge variant="amber" size="md">
              <ShieldCheck className="w-3.5 h-3.5" />
              Factual Analytics Mode
            </Badge>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={handleStartNewConversation}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            New Query
          </Button>
        </div>
      </div>

      {/* Configuration Status Notice when no API key configured */}
      {status && !status.is_configured && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-3 leading-relaxed">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-amber-200 block mb-0.5">
              Live AI Inferences: Configuration Guide
            </strong>
            <p className="text-zinc-300">
              The AI assistant is currently operating in <strong>deterministic factual mode</strong>, analyzing verified database records directly. To activate real-time generative conversational advice and multimodal vision recognition, configure <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-200">AI_API_KEY</code> and <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-200">AI_PROVIDER=openai</code> in <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-200">backend/.env</code>.
            </p>
          </div>
        </div>
      )}

      {/* Main Chat Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[600px]">
        {/* Sidebar: Conversation History */}
        <Card className="p-3 flex flex-col justify-between hidden lg:flex">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-800/80">
              <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                Conversations
              </span>
              <button
                onClick={handleStartNewConversation}
                className="text-emerald-400 hover:text-emerald-300 p-1"
                title="New chat"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5 overflow-y-auto max-h-[480px]">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setActiveConvId(conv.id)}
                  className={`w-full text-left p-2.5 rounded-xl text-xs font-medium transition-colors truncate block ${
                    activeConvId === conv.id
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                  }`}
                >
                  {conv.title}
                </button>
              ))}

              {conversations.length === 0 && (
                <p className="text-xs text-zinc-500 italic p-3 text-center">
                  No previous conversations. Send a question below.
                </p>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-800 text-[11px] text-zinc-500 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 shrink-0" />
            <span>Non-medical fitness analytics only.</span>
          </div>
        </Card>

        {/* Chat Pane (3 cols) */}
        <Card className="lg:col-span-3 flex flex-col justify-between p-0 overflow-hidden">
          {/* Chat Messages Log */}
          <div className="flex-1 p-5 overflow-y-auto space-y-4">
            {activeConversation?.messages && activeConversation.messages.length > 0 ? (
              activeConversation.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-start gap-3 ${
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {msg.role !== 'user' && (
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles className="w-4 h-4" />
                    </div>
                  )}

                  <div
                    className={`max-w-2xl p-4 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-emerald-500 text-zinc-950 font-medium ml-12 rounded-tr-sm'
                        : 'bg-[#18181b] border border-zinc-800 text-zinc-200 mr-12 rounded-tl-sm'
                    }`}
                  >
                    {msg.content}
                  </div>

                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-xl bg-zinc-800 text-zinc-300 flex items-center justify-center shrink-0 mt-0.5">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-400">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3">
                  <BotMessageSquare className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-base text-zinc-200">
                  Ask FITPULSE AI Anything About Your Records
                </h3>
                <p className="text-xs max-w-md text-zinc-400 mt-1">
                  Queries are grounded in your recorded database entries (nutrition, protein targets, running pace, football sessions, and weight progression).
                </p>

                <div className="flex flex-wrap gap-2 mt-4 max-w-lg justify-center">
                  {[
                    'Analyze my 7-day protein intake',
                    'How is my running pace trending?',
                    'Did I hit my workout targets this week?',
                    'Summarize my progress towards 60kg',
                  ].map((quickQ) => (
                    <button
                      key={quickQ}
                      onClick={() => setInputMessage(quickQ)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/60 transition-colors"
                    >
                      {quickQ}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Bar */}
          <form
            onSubmit={handleSendMessage}
            className="p-3.5 bg-[#121215] border-t border-zinc-800 flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Ask about your protein, workouts, running pace, or weekly consistency..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              className="flex-1 bg-[#18181b] border border-zinc-700/80 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
            />

            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={!inputMessage.trim()}
              isLoading={sendMutation.isPending}
              rightIcon={<Send className="w-4 h-4" />}
            >
              Ask AI
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};
