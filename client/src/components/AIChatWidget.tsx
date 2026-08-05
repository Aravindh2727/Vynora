import { API_BASE_URL } from '../config';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, MessageSquare, Send } from 'lucide-react';
import { useContextEngineStore } from '../store/useContextEngineStore';

export default function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const { dispatchIntent, aiStatus } = useContextEngineStore();
  const [messages, setMessages] = useState<{role: 'user' | 'ai', text: string}[]>([
    { role: 'ai', text: "Hello! I'm your Vynora AI Assistant. I can analyze your expenses, crops, dairy records, or remind you about upcoming bills. What do you need?" }
  ]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setMessages(prev => [...prev, { role: 'user', text: input }]);
    const currentInput = input;
    setInput('');
    
    // Manually trigger thinking state
    useContextEngineStore.setState({ aiStatus: 'thinking' });

    try {
      const res = await fetch(API_BASE_URL + '/api/ai/intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: currentInput })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'ai', text: data.response }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'ai', text: "Error connecting to Context Engine." }]);
    } finally {
      useContextEngineStore.setState({ aiStatus: 'idle' });
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <motion.button
        className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 w-14 h-14 bg-primary text-background rounded-full shadow-neon-primary flex items-center justify-center z-50 hover:scale-110 transition-transform"
        onClick={() => setIsOpen(true)}
        whileHover={{ rotate: 15 }}
        whileTap={{ scale: 0.9 }}
      >
        <MessageSquare size={24} />
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-24 right-4 left-4 sm:left-auto sm:right-8 sm:w-[350px] h-[500px] max-h-[75vh] glass-panel shadow-neon-primary-sm flex flex-col z-50 overflow-hidden border border-glass rounded-2xl"
          >
            {/* Header */}
            <div className="bg-surface p-4 flex items-center justify-between border-b border-glass shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-neon-primary">
                  <Sparkles size={16} className="text-background" />
                </div>
                <h3 className="font-bold tracking-wider text-textMain">Vynora AI</h3>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-textMuted hover:text-textMain transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 p-4 overflow-y-auto custom-scrollbar flex flex-col gap-3">
              {messages.map((msg, idx) => (
                <div key={idx} className={`max-w-[85%] rounded-xl p-3 text-sm ${msg.role === 'user' ? 'bg-primary text-background self-end rounded-tr-sm' : 'bg-surface border border-glass text-textMain self-start rounded-tl-sm'}`}>
                  {msg.text}
                </div>
              ))}
              {aiStatus === 'thinking' && (
                <div className="bg-surface border border-glass text-textMain self-start rounded-xl rounded-tl-sm p-3 flex gap-1">
                  <span className="w-2 h-2 bg-primary rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                  <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                </div>
              )}
            </div>

            {/* Input Area */}
            <form onSubmit={handleSend} className="p-3 bg-surface border-t border-glass flex items-center gap-2 shrink-0">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me anything..."
                className="flex-1 bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain outline-none focus:border-primary transition-colors"
              />
              <button 
                type="submit"
                disabled={!input.trim()}
                className="p-2 bg-primary text-background rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                <Send size={16} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
