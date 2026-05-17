"use client";

import React, { useState, useEffect, useRef } from "react";
import { useUser, UserButton } from "@clerk/nextjs";
import ReactMarkdown from "react-markdown";
import KuddusAvatar from "@/components/KuddusAvatar";
import TypingIndicator from "@/components/TypingIndicator";
import { 
  Plus, 
  Trash2, 
  Send, 
  Menu, 
  X, 
  ArrowLeft, 
  MessageSquare, 
  CornerDownLeft,
  Sparkles
} from "lucide-react";
import Link from "next/link";

interface Chat {
  id: string;
  title: string;
  created_at: string;
}

interface Message {
  id?: string;
  role: "user" | "assistant";
  content: string;
}

export default function Dashboard() {
  const { user, isLoaded } = useUser();
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // 1. Lazy Sync Clerk profile & load chats on initial load
  useEffect(() => {
    async function initUserAndChats() {
      try {
        // Trigger lazy-sync in API
        await fetch("/api/user");
        
        // Fetch chats
        const res = await fetch("/api/chats");
        const data = await res.json();
        if (data.chats) {
          setChats(data.chats);
        }
      } catch (err) {
        console.error("Initialization error:", err);
      } finally {
        setIsSyncing(false);
      }
    }

    if (isLoaded && user) {
      initUserAndChats();
    }
  }, [isLoaded, user]);

  // 2. Fetch messages when activeChatId changes
  useEffect(() => {
    async function fetchMessages() {
      if (!activeChatId) {
        setMessages([]);
        return;
      }

      try {
        setIsLoading(true);
        const res = await fetch(`/api/chats/${activeChatId}`);
        const data = await res.json();
        if (data.messages) {
          setMessages(data.messages);
        }
      } catch (err) {
        console.error("Fetch messages error:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchMessages();
  }, [activeChatId]);

  // 3. Create a New Chat Thread
  const handleNewChat = () => {
    setActiveChatId(null);
    setMessages([]);
    setSidebarOpen(false);
  };

  // 4. Delete Chat Thread
  const handleDeleteChat = async (e: React.MouseEvent, chatIdToDelete: string) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this chat consultation?")) return;

    try {
      const res = await fetch(`/api/chats/${chatIdToDelete}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setChats(chats.filter((c) => c.id !== chatIdToDelete));
        if (activeChatId === chatIdToDelete) {
          setActiveChatId(null);
          setMessages([]);
        }
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  // 5. Submit Message to Kuddus Ali (with Real-time Streaming!)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    const userMessageContent = inputMessage;
    setInputMessage("");
    setIsLoading(true);

    // Append user's message locally
    const newUserMessage: Message = { role: "user", content: userMessageContent };
    setMessages((prev) => [...prev, newUserMessage]);

    // Create an empty Kuddus Ali placeholder for stream accumulation
    const assistantPlaceholder: Message = { role: "assistant", content: "" };
    setMessages((prev) => [...prev, assistantPlaceholder]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessageContent,
          chatId: activeChatId,
        }),
      });

      if (!response.ok) {
        throw new Error("API call failed");
      }

      if (!response.body) return;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedResponse = "";
      let hasHeaderIdParsed = false;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        
        // Custom Header parsing to set activeChatId on new chats
        if (!hasHeaderIdParsed && chunk.includes("__CHAT_ID__:")) {
          const lines = chunk.split("\n");
          const idHeader = lines[0];
          const resolvedId = idHeader.replace("__CHAT_ID__:", "").trim();
          
          if (resolvedId) {
            setActiveChatId(resolvedId);
            hasHeaderIdParsed = true;
          }
          
          // Accumulate the rest of the text
          const restText = lines.slice(1).join("\n");
          accumulatedResponse += restText;
          setMessages((prev) => {
            const updated = [...prev];
            if (updated.length > 0) {
              updated[updated.length - 1] = {
                role: "assistant",
                content: accumulatedResponse,
              };
            }
            return updated;
          });
          continue;
        }

        accumulatedResponse += chunk;
        setMessages((prev) => {
          const updated = [...prev];
          if (updated.length > 0) {
            updated[updated.length - 1] = {
              role: "assistant",
              content: accumulatedResponse,
            };
          }
          return updated;
        });
      }

      // Refresh chats sidebar list to capture auto-generated title
      const chatsRes = await fetch("/api/chats");
      const chatsData = await chatsRes.json();
      if (chatsData.chats) {
        setChats(chatsData.chats);
      }

    } catch (err) {
      console.error("Streaming error:", err);
      setMessages((prev) => {
        const updated = [...prev];
        if (updated.length > 0) {
          updated[updated.length - 1] = {
            role: "assistant",
            content: "Sorry, I ran into a connection glitch. Let's try that again. - Kuddus Ali",
          };
        }
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const activeChat = chats.find((c) => c.id === activeChatId);

  // Quick suggestions templates
  const handleQuickSuggest = (text: string) => {
    setInputMessage(text);
  };

  return (
    <div className="flex h-screen bg-[#0A0A0A] overflow-hidden text-neutral-100 font-sans relative">
      {/* 1. Sidebar - Collapsible on Mobile */}
      <aside 
        className={`fixed inset-y-0 left-0 z-40 w-72 bg-[#0F0F0F] border-r border-neutral-900 transform transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Top Nav Brand */}
          <div className="p-5 border-b border-neutral-900/60 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5">
              <KuddusAvatar size={34} />
              <span className="font-extrabold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-amber-600 text-sm">
                KUDDUS ALI AI
              </span>
            </Link>
            <button 
              className="lg:hidden p-1 text-neutral-400 hover:text-neutral-100" 
              onClick={() => setSidebarOpen(false)}
            >
              <X size={20} />
            </button>
          </div>

          {/* New Chat Button */}
          <div className="px-4 py-3">
            <button 
              onClick={handleNewChat}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 text-amber-400 text-sm font-semibold transition duration-300 shadow-[0_0_15px_rgba(245,158,11,0.03)]"
            >
              <Plus size={16} /> New Consultation
            </button>
          </div>

          {/* Chats History List */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
            {isSyncing ? (
              <div className="p-4 text-center text-xs text-neutral-500">Syncing history...</div>
            ) : chats.length === 0 ? (
              <div className="p-4 text-center text-xs text-neutral-600">No previous consults</div>
            ) : (
              chats.map((chat) => (
                <div 
                  key={chat.id}
                  onClick={() => {
                    setActiveChatId(chat.id);
                    setSidebarOpen(false);
                  }}
                  className={`group w-full flex items-center justify-between px-3 py-3 rounded-xl cursor-pointer transition duration-300 text-sm ${
                    activeChatId === chat.id 
                      ? "bg-amber-500/10 border border-amber-500/20 text-amber-400 font-medium" 
                      : "border border-transparent text-neutral-400 hover:bg-neutral-900/60 hover:text-neutral-200"
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <MessageSquare size={15} className={activeChatId === chat.id ? "text-amber-500" : "text-neutral-500"} />
                    <span className="truncate pr-2">{chat.title}</span>
                  </div>
                  <button 
                    onClick={(e) => handleDeleteChat(e, chat.id)}
                    className="p-1 rounded text-neutral-600 hover:text-red-400 hover:bg-red-950/20 opacity-0 group-hover:opacity-100 transition duration-300"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Sidebar User Footer */}
          <div className="p-4 border-t border-neutral-900/60 bg-[#0A0A0A]/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <UserButton />
              <div className="flex flex-col text-left">
                <span className="text-xs font-bold text-neutral-200 truncate max-w-[120px]">
                  {user?.firstName || user?.username || "Consultant"}
                </span>
                <span className="text-[10px] text-amber-500 font-semibold tracking-wider">FREE UNLIMITED</span>
              </div>
            </div>
            
            <Link 
              href="/" 
              className="p-2 text-neutral-500 hover:text-neutral-200 rounded-lg hover:bg-neutral-900 transition duration-200"
              title="Exit to home"
            >
              <ArrowLeft size={16} />
            </Link>
          </div>
        </div>
      </aside>

      {/* 2. Backdrop overlay for mobile sidebar */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-30 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 3. Main Chat Interface Container */}
      <main className="flex-1 flex flex-col h-full bg-[#0A0A0A] relative">
        {/* Dynamic header */}
        <header className="h-16 px-6 border-b border-neutral-900/60 bg-[#0F0F0F]/60 backdrop-blur-md flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <button 
              className="lg:hidden p-1.5 text-neutral-400 hover:text-neutral-100 rounded-lg hover:bg-neutral-950"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-neutral-900 text-amber-500 border border-amber-500/10">
                ACTIVE
              </span>
              <span className="text-sm font-semibold text-neutral-200 truncate max-w-[200px]">
                {activeChat ? activeChat.title : "New Consultation"}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Link 
              href="/"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-800 bg-neutral-900/40 text-xs text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition duration-300"
            >
              Home
            </Link>
            <UserButton />
          </div>
        </header>

        {/* Scrollable Conversation area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          {messages.length === 0 ? (
            /* Welcome / Onboarding Screen */
            <div className="max-w-2xl mx-auto pt-8 pb-12 flex flex-col items-center justify-center text-center">
              <KuddusAvatar size={80} className="border-2 border-amber-500 mb-6" />
              <h2 className="text-2xl sm:text-3xl font-extrabold text-neutral-100">
                Consultation with{" "}
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-amber-600">
                  Kuddus Ali
                </span>
              </h2>
              <p className="mt-4 text-neutral-400 leading-relaxed max-w-xl text-sm">
                {"Name's Kuddus Ali. I've taken 80+ startups from ideas to profit across 4 continents. If your idea is garbage, I'll tell you instantly. If it's gold, I'll give you a roadmap."}
              </p>

              {/* Warning box */}
              <div className="mt-6 w-full p-4 rounded-xl border border-amber-500/10 bg-amber-500/5 text-amber-400 text-xs flex items-center gap-2 justify-center">
                <Sparkles size={14} className="flex-shrink-0" />
                <span>Make sure to specify your <strong>target country/market</strong> first, or I will ask.</span>
              </div>

              {/* Prompt Suggestions Grid */}
              <div className="mt-10 w-full text-left">
                <span className="text-xs font-semibold text-neutral-500 uppercase tracking-widest block mb-4">
                  Quick Consultation Starters
                </span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <button 
                    onClick={() => handleQuickSuggest("I want to launch a organic luxury soap brand online targeting the USA. Is there a real market?")}
                    className="p-4 text-left rounded-xl border border-neutral-900 hover:border-amber-500/20 bg-neutral-900/30 hover:bg-neutral-900/60 transition duration-300 text-xs text-neutral-300 leading-relaxed"
                  >
                    🚀 &ldquo;Organic luxury soap online in the US...&rdquo;
                  </button>
                  <button 
                    onClick={() => handleQuickSuggest("Can I build a SaaS for automated local barber reservations in Canada? Let's check competitors.")}
                    className="p-4 text-left rounded-xl border border-neutral-900 hover:border-amber-500/20 bg-neutral-900/30 hover:bg-neutral-900/60 transition duration-300 text-xs text-neutral-300 leading-relaxed"
                  >
                    💻 &ldquo;Barber reservation SaaS in Canada...&rdquo;
                  </button>
                  <button 
                    onClick={() => handleQuickSuggest("Opening a coffee shop & bakery in London (UK). What are the critical risks I must avoid?")}
                    className="p-4 text-left rounded-xl border border-neutral-900 hover:border-amber-500/20 bg-neutral-900/30 hover:bg-neutral-900/60 transition duration-300 text-xs text-neutral-300 leading-relaxed"
                  >
                    ☕ &ldquo;Coffee shop & bakery in London, UK...&rdquo;
                  </button>
                  <button 
                    onClick={() => handleQuickSuggest("I have an idea for a peer-to-peer bike renting app in Germany. Verify competitor gap.")}
                    className="p-4 text-left rounded-xl border border-neutral-900 hover:border-amber-500/20 bg-neutral-900/30 hover:bg-neutral-900/60 transition duration-300 text-xs text-neutral-300 leading-relaxed"
                  >
                    🚲 &ldquo;Peer-to-peer bike renting in Germany...&rdquo;
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Historical & Streamed Messages */
            <div className="max-w-3xl mx-auto space-y-8 pb-12">
              {messages.map((msg, index) => {
                // If it is Kuddus Ali's response
                if (msg.role === "assistant") {
                  return (
                    <div key={index} className="flex gap-4 items-start">
                      <KuddusAvatar size={40} className="flex-shrink-0" />
                      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                        <span className="text-xs font-semibold text-amber-500 tracking-wider">KUDDUS ALI</span>
                        <div className="bg-[#121212]/50 border border-neutral-900 rounded-2xl rounded-tl-none px-6 py-5 text-neutral-200 leading-relaxed text-sm shadow-md backdrop-blur prose">
                          {msg.content ? (
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          ) : (
                            <div className="flex gap-1 items-center py-2">
                              <span className="w-2 h-2 bg-amber-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                              <span className="w-2 h-2 bg-amber-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                              <span className="w-2 h-2 bg-amber-500 rounded-full animate-bounce"></span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }

                // User's message
                return (
                  <div key={index} className="flex gap-4 items-start justify-end">
                    <div className="flex flex-col gap-1.5 items-end max-w-[80%]">
                      <span className="text-xs font-semibold text-neutral-500 tracking-wider">YOU</span>
                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl rounded-tr-none px-5 py-4 text-neutral-200 text-sm shadow-sm">
                        {msg.content}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Typing indicator */}
              {isLoading && messages[messages.length - 1]?.content !== "" && (
                <TypingIndicator />
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Text Form Area */}
        <div className="p-4 md:p-6 border-t border-neutral-900/60 bg-[#0A0A0A]">
          <form 
            onSubmit={handleSubmit}
            className="max-w-3xl mx-auto relative rounded-2xl border border-neutral-800 bg-[#0F0F0F] shadow-2xl focus-within:border-amber-500/30 transition duration-300 overflow-hidden"
          >
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="Describe your startup idea and which country/market you are targeting..."
              className="w-full bg-transparent border-0 ring-0 focus:ring-0 focus:outline-none placeholder-neutral-600 text-sm text-neutral-200 px-5 py-4 resize-none h-[64px] min-h-[50px] max-h-[200px]"
              disabled={isLoading}
            />

            <div className="flex items-center justify-between px-5 pb-3 bg-[#0F0F0F] border-t border-neutral-950/40">
              <span className="text-[10px] text-neutral-600 select-none hidden sm:inline-flex items-center gap-1">
                <CornerDownLeft size={10} /> Press Enter to send consultation
              </span>
              
              <button 
                type="submit"
                disabled={isLoading || !inputMessage.trim()}
                className={`ml-auto p-2 rounded-xl text-neutral-950 flex items-center justify-center transition duration-300 ${
                  isLoading || !inputMessage.trim() 
                    ? "bg-neutral-800 text-neutral-500 cursor-not-allowed" 
                    : "bg-amber-500 hover:bg-amber-400 hover:scale-105 active:scale-95"
                }`}
              >
                <Send size={15} />
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
