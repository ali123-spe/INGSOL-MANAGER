import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, Loader2 } from 'lucide-react';
import './assistant.css';

export default function AssistantChat({ activeView, isOpen, onClose }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hi! I'm INGSOL AI. How can I help you with INGSOL Manager today?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          currentPage: activeView
        })
      });

      let data = null;
      try {
        data = await response.json();
      } catch (e) {
        // Ignore JSON parse errors for non-JSON responses
      }

      if (!response.ok) {
        const errorMsg = data?.error ? `HTTP ${response.status}: ${data.error}` : `HTTP ${response.status}: Failed to connect to INGSOL AI`;
        throw new Error(errorMsg);
      }

      if (data && data.error) throw new Error(data.error);

      setMessages([...newMessages, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Something went wrong.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="ingsol-ai-panel">
      <div className="ingsol-ai-header">
        <h3 className="ingsol-ai-title"><Sparkles size={18} /> INGSOL AI</h3>
        <button className="ingsol-ai-close" onClick={onClose} aria-label="Close Assistant">
          <X size={20} />
        </button>
      </div>

      <div className="ingsol-ai-messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`ingsol-ai-message ${msg.role}`}>
            {msg.content}
          </div>
        ))}
        {isLoading && (
          <div className="ingsol-ai-loading">
            <Loader2 size={16} className="ai-spin-icon" /> 
            Thinking...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="ingsol-ai-input-area">
        <div className="ingsol-ai-input-row">
          <input
            type="text"
            className="ingsol-ai-input"
            placeholder="Ask me anything..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
          />
          <button 
            className="ingsol-ai-send" 
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            aria-label="Send Message"
          >
            <Send size={18} />
          </button>
        </div>
        {error && <div className="ingsol-ai-error">{error}</div>}
      </div>
    </div>
  );
}
