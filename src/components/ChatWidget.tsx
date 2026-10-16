import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Bot, 
  MessageCircle, 
  X, 
  Send, 
  Sparkles, 
  User, 
  ChevronRight, 
  Minimize2,
  RefreshCw,
  Phone,
  Layers,
  Globe,
  CreditCard,
  Zap,
  CheckCircle2
} from 'lucide-react';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';
import { toast } from 'react-hot-toast';
import { getApiUrl } from '../services/apiClient';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
}

const starterPrompts = [
  { icon: Zap, label: 'Hosting Plans & Pricing', text: 'Which web hosting plan is best for my website?' },
  { icon: Globe, label: 'Domain & Nameservers', text: 'How do I point my domain to Click2IT nameservers?' },
  { icon: CreditCard, label: 'bKash Payment Verification', text: 'How do I verify my bKash payment with TrxID?' },
  { icon: RefreshCw, label: 'Free Website Migration', text: 'How can I get free cPanel website migration?' },
];

export const ChatWidget: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { settings } = useSettings();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-1',
      sender: 'bot',
      text: `Hello! 👋 Welcome to ${settings.brandName || 'Click2IT'}.\nHow can our support team assist you today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setIsExpanded(true);
    };
    window.addEventListener('resize', handleResize);
    
    if (window.innerWidth < 768) {
      const timer = setTimeout(() => {
        setIsExpanded(false);
      }, 4000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', handleResize);
      }
    }
    return () => window.removeEventListener('resize', handleResize);
  }, []);



  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [messages, loading, isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || loading) return;

    const userMessage: Message = { 
      id: Date.now().toString(),
      sender: 'user', 
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setMessages(prev => [...prev, userMessage]);
    if (!textToSend) setInputValue('');
    setLoading(true);

    // Save chat inquiry lead asynchronously
    try {
      addDoc(collection(db, 'leads'), {
        userId: user?.uid || 'guest',
        name: user?.displayName || 'Live Chat Visitor',
        email: user?.email || '',
        initialMessage: text,
        source: 'floating_live_chat',
        status: 'new',
        createdAt: new Date().toISOString(),
      }).catch(() => {});
    } catch {
      // ignore lead log error
    }

    try {
      const response = await fetch(getApiUrl('/api/ai/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'AI service unavailable');
      }

      const botMessage: Message = { 
        id: (Date.now() + 1).toString(),
        sender: 'bot', 
        text: data.reply || 'Thank you for reaching out! Our team is available 24/7 to assist you.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const fallbackMessage: Message = { 
        id: (Date.now() + 1).toString(),
        sender: 'bot', 
        text: `Our live assistant received your message. You can also reach our hotline at ${settings.contactPhone || '+8809640887777'} or chat with us on WhatsApp for instant 1-on-1 assistance.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, fallbackMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: Date.now().toString(),
        sender: 'bot',
        text: `Hello! 👋 How can we help you today?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  // Hide on admin routes
  if (location.pathname.startsWith('/admin') || location.pathname.startsWith('/pos')) {
    return null;
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 font-sans">
      {!isOpen ? (
        /* Floating Launcher Button */
        <button
          onClick={() => setIsOpen(true)}
          onMouseEnter={() => setIsExpanded(true)}
          onMouseLeave={() => { if (window.innerWidth < 768) setIsExpanded(false) }}
          className="group flex items-center bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg shadow-blue-600/30 hover:shadow-blue-600/40 hover:scale-105 active:scale-95 transition-all duration-300"
          style={{ padding: isExpanded ? '12px 20px 12px 16px' : '12px' }}
          aria-label="Open Live Chat"
        >
          <div className="relative flex items-center justify-center shrink-0">
            <MessageCircle size={22} />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
            </span>
          </div>
          <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isExpanded ? 'max-w-[120px] opacity-100 ml-3' : 'max-w-0 opacity-0 ml-0'}`}>
            <span className="text-sm font-semibold tracking-tight whitespace-nowrap">
              Chat with Us
            </span>
          </div>
        </button>
      ) : (
        /* Minimalist Modern Chat Window */
        <div className="bg-white rounded-3xl shadow-2xl w-[340px] sm:w-[370px] h-[510px] max-h-[85vh] flex flex-col border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          
          {/* Clean Header */}
          <div className="bg-white px-5 py-4 flex justify-between items-center shrink-0 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
                  <Bot size={18} />
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></span>
              </div>
              <div>
                <h3 className="font-bold text-sm text-gray-900 leading-tight">
                  {settings.brandName || 'Click2IT'} Support
                </h3>
                <p className="text-[11px] text-gray-500 font-medium leading-tight mt-0.5">
                  Usually replies instantly
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-gray-400">
              <button 
                onClick={handleResetChat}
                className="p-1.5 hover:bg-gray-100 hover:text-gray-600 rounded-lg transition-colors"
                title="Restart conversation"
              >
                <RefreshCw size={15} />
              </button>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-gray-100 hover:text-gray-600 rounded-lg transition-colors"
                title="Close"
              >
                <X size={17} />
              </button>
            </div>
          </div>

          {/* Chat Messages Body */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#f8fafc]/60 text-xs">
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <div 
                  key={msg.id} 
                  className={`flex gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot size={13} />
                    </div>
                  )}
                  
                  <div className="max-w-[80%]">
                    <div 
                      className={`p-3 rounded-2xl leading-relaxed whitespace-pre-line text-xs ${
                        isUser 
                          ? 'bg-blue-600 text-white rounded-br-xs' 
                          : 'bg-white text-gray-800 border border-gray-100 rounded-bl-xs shadow-xs'
                      }`}
                    >
                      {msg.text}
                    </div>
                    <span className={`block text-[10px] text-gray-400 mt-1 px-1 ${isUser ? 'text-right' : 'text-left'}`}>
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex gap-2 justify-start items-center">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                  <Bot size={13} />
                </div>
                <div className="bg-white px-3.5 py-2.5 rounded-2xl rounded-bl-xs border border-gray-100 shadow-xs flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce [animation-delay:0.4s]"></span>
                </div>
              </div>
            )}

            {/* Quick Starter Chips (Shown when only initial greeting is present) */}
            {messages.length === 1 && (
              <div className="pt-2 space-y-1.5">
                <p className="text-[11px] font-semibold text-gray-400 px-1">Suggested topics:</p>
                <div className="grid grid-cols-1 gap-1.5">
                  {starterPrompts.map((prompt, idx) => {
                    const Icon = prompt.icon;
                    // Hide widget on Admin Panel and POS routes
  if (location.pathname.startsWith('/admin') || location.pathname.startsWith('/pos')) {
    return null;
  }

  return (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(prompt.text)}
                        className="w-full text-left p-2.5 rounded-xl bg-white hover:bg-blue-50 border border-gray-200/80 hover:border-blue-200 text-gray-700 hover:text-blue-700 text-xs font-medium transition-all flex items-center justify-between group shadow-2xs"
                      >
                        <span className="flex items-center gap-2">
                          <Icon size={14} className="text-blue-600 shrink-0" />
                          {prompt.label}
                        </span>
                        <ChevronRight size={13} className="text-gray-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Sleek Input Footer */}
          <div className="p-3 bg-white border-t border-gray-100 shrink-0">
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} 
              className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100/80 focus-within:bg-white border border-gray-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/10 rounded-2xl px-3 py-1.5 transition-all"
            >
              <input 
                ref={inputRef}
                type="text" 
                value={inputValue} 
                onChange={e => setInputValue(e.target.value)} 
                placeholder="Ask a question..." 
                className="flex-1 bg-transparent py-1.5 text-xs text-gray-900 placeholder-gray-400 outline-none"
              />
              <button 
                type="submit" 
                disabled={!inputValue.trim() || loading}
                className="w-8 h-8 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-30 text-white flex items-center justify-center transition-colors shrink-0 shadow-xs"
                title="Send message"
              >
                <Send size={13} className="translate-x-px" />
              </button>
            </form>
          </div>

        </div>
      )}
    </div>
  );
};

