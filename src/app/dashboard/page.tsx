"use client";

import React, { useState, useEffect, useRef } from "react";
import { useUser, UserButton } from "@clerk/nextjs";
import ReactMarkdown from "react-markdown";
// NovaAvatar removed — using dynamic AIAvatar now
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
  Sparkles,
  Paperclip,
  Mic,
  MicOff,
  FileText,
  Loader2,
  Lightbulb,
  Settings,
  DollarSign,
  Video,
  Target,
  Mail,
  Search,
  Eye,
  Calendar,
  Share2,
  GraduationCap,
  Briefcase,
  Heart,
  TrendingUp,
  Code,
  ChevronDown,
  Camera,
  XCircle,
  Copy,
  Check,
  Square
} from "lucide-react";
import Link from "next/link";
import { parseAnyFile } from "@/lib/fileParser";

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
const AGENTS_LIST = [
  {
    id: "daily-innovation-idea-agent",
    name: "Daily Innovation Idea Agent",
    banglaName: "Daily Innovation Idea Agent",
    desc: "Provides 4-5 fresh business/tech/income ideas daily",
    banglaDesc: "Provides 4-5 fresh business/tech/income ideas daily",
    icon: Lightbulb,
    placeholder: "Which sector or target country are you looking to generate business ideas for today?",
    suggestions: [
      "Give me 4-5 fresh business ideas that will perform well in 2026.",
      "SaaS or tech startup ideas with low starting capital for UK market."
    ]
  },
  {
    id: "personal-cfo-finance-agent",
    name: "Personal CFO / Finance Agent",
    banglaName: "Personal CFO / Finance Agent",
    desc: "Expense tracking, budgeting, investment, tax help",
    banglaDesc: "Expense tracking, budgeting, investment, tax help",
    icon: DollarSign,
    placeholder: "Describe your current finances, monthly budget constraints, or investment goal...",
    suggestions: [
      "What are the key tax filing and VAT guidelines for starting a new business?",
      "How to optimize operational cash flow for a local retail shop?"
    ]
  },
  {
    id: "content-creator-agent",
    name: "Content Creator Agent",
    banglaName: "Content Creator Agent",
    desc: "YouTube, TikTok, FB content ideas & viral scripts",
    banglaDesc: "YouTube, TikTok, FB content ideas & viral scripts",
    icon: Video,
    placeholder: "What is your channel niche, target audience, and preferred video format?",
    suggestions: [
      "Give me 3 TikTok hooks and a video script for a new AI technology product.",
      "Viral YouTube script outlines for a personal finance channel."
    ]
  },
  {
    id: "sales-lead-generator",
    name: "Sales & Lead Generator",
    banglaName: "Sales & Lead Generator",
    desc: "Find prospective customers, write high-converting copy",
    banglaDesc: "Find prospective customers, write high-converting copy",
    icon: Target,
    placeholder: "Describe your product/service and who your primary target buyers are...",
    suggestions: [
      "Write a high-converting cold email sequence for an e-commerce brand.",
      "What are the best channels to find corporate leads for a B2B SaaS?"
    ]
  },
  {
    id: "inbox-manager-agent",
    name: "Inbox Manager Agent",
    banglaName: "Inbox Manager Agent",
    desc: "Summarizes emails, drafts important corporate replies",
    banglaDesc: "Summarizes emails, drafts important corporate replies",
    icon: Mail,
    placeholder: "Paste an incoming client email or message that you want summarized or replied to...",
    suggestions: [
      "Give me a polite but professional reply draft for this client message.",
      "Summarize key issues and action items from this corporate email."
    ]
  },
  {
    id: "research-agent",
    name: "Research Agent",
    banglaName: "Research Agent",
    desc: "Deep research on any topic with source citation reports",
    banglaDesc: "Deep research on any topic with source citation reports",
    icon: Search,
    placeholder: "What topic, industry, or concept do you need a comprehensive, fact-backed research report on?",
    suggestions: [
      "Research the current size and key competitors in the ride-sharing market.",
      "Deep market analysis of organic cosmetic demand in Germany."
    ]
  },
  {
    id: "competitor-spy-agent",
    name: "Competitor Spy Agent",
    banglaName: "Competitor Spy Agent",
    desc: "Monitors competitor websites, pricing, and marketing",
    banglaDesc: "Monitors competitor websites, pricing, and marketing",
    icon: Eye,
    placeholder: "Paste competitor website URLs or names to analyze their positioning and pricing model...",
    suggestions: [
      "Audit my competitor's website to find their key weaknesses.",
      "How do I reverse-engineer a competitor's pricing structure?"
    ]
  },
  {
    id: "personal-assistant",
    name: "Personal Assistant",
    banglaName: "Personal Assistant",
    desc: "Morning briefings, task prioritizing, meeting summaries",
    banglaDesc: "Morning briefings, task prioritizing, meeting summaries",
    icon: Calendar,
    placeholder: "Enter today's tasks or paste a messy transcript to structure your daily agenda...",
    suggestions: [
      "Organize my tasks for today and create a complete morning briefing.",
      "Summarize this messy raw voice meeting note into bullet tasks."
    ]
  },
  {
    id: "social-media-manager",
    name: "Social Media Manager",
    banglaName: "Social Media Manager",
    desc: "Post ideas, captions, schedules, performance analysis",
    banglaDesc: "Post ideas, captions, schedules, performance analysis",
    icon: Share2,
    placeholder: "Which brand are you managing, and for which platform (LinkedIn, FB, IG) do you need posts?",
    suggestions: [
      "Provide a 1-week LinkedIn content calendar with captions for a digital agency.",
      "Instagram reel calendar with caption hooks for a fitness brand."
    ]
  },
  {
    id: "learning-coach",
    name: "Learning Coach",
    banglaName: "Learning Coach",
    desc: "Tailored daily learning paths & progress quizzes",
    banglaDesc: "Tailored daily learning paths & progress quizzes",
    icon: GraduationCap,
    placeholder: "What skill or subject do you want to master, and how many days do you have?",
    suggestions: [
      "Give me a complete 30-day learning routine and daily tasks to learn React Native and Expo.",
      "Create a beginner python guide with a 5-question test."
    ]
  },
  {
    id: "job-application-agent",
    name: "Job Application Agent",
    banglaName: "Job Application Agent",
    desc: "CV revisions, custom cover letters, job search aid",
    banglaDesc: "CV revisions, custom cover letters, job search aid",
    icon: Briefcase,
    placeholder: "Paste the job description and your current resume text to optimize them...",
    suggestions: [
      "Write an attractive and impactful cover letter for a software engineer role.",
      "CV suggestions for a senior product manager career pivot."
    ]
  },
  {
    id: "health-fitness-coach",
    name: "Health & Fitness Coach",
    banglaName: "Health & Fitness Coach",
    desc: "Personalized diet schedules, workout routines, tracking",
    banglaDesc: "Personalized diet schedules, workout routines, tracking",
    icon: Heart,
    placeholder: "What is your target weight/fitness goal, age, and dietary preferences?",
    suggestions: [
      "Provide a high-protein diet and 3-day home workout plan for weight loss.",
      "Keto diet meal prep roadmap for busy working professionals."
    ]
  },
  {
    id: "crypto-stock-researcher",
    name: "Crypto / Stock Researcher",
    banglaName: "Crypto / Stock Researcher",
    desc: "Market analysis, macroeconomic news, investment ideas",
    banglaDesc: "Market analysis, macroeconomic news, investment ideas",
    icon: TrendingUp,
    placeholder: "Which stock, crypto token, or market index do you need deep analysis on?",
    suggestions: [
      "Provide a macroeconomic trend and news summary for the current crypto market.",
      "How to evaluate stock volatility using beta metrics."
    ]
  },
  {
    id: "code-helper-developer-agent",
    name: "Code Helper / Developer Agent",
    banglaName: "Code Helper / Developer Agent",
    desc: "Writes robust code, debugs errors, designs projects",
    banglaDesc: "Writes robust code, debugs errors, designs projects",
    icon: Code,
    placeholder: "Paste the buggy code snippet or describe the feature you want implemented...",
    suggestions: [
      "Write a sample Next.js API route showing the correct structure for handling requests.",
      "Optimize this React state re-rendering bottleneck."
    ]
  },
  {
    id: "womens-beauty-agent",
    name: "Women's Beauty & Skincare Agent",
    banglaName: "Women's Beauty & Skincare Agent",
    desc: "Science-backed skincare routines, makeup styling & product tips",
    banglaDesc: "Science-backed skincare routines, makeup styling & product tips",
    icon: Sparkles,
    placeholder: "What is your skin type (oily, dry, combo) and your primary skin concern?",
    suggestions: [
      "Provide a complete morning skincare routine for my oily, acne-prone skin.",
      "Which active ingredients should I combine for anti-aging without irritation?"
    ]
  }
];

const TONES_LIST = [
  { id: "brutally-honest", name: "Brutally Honest", icon: "🌶️", prompt: "Be extremely blunt, direct, and brutally honest without sugarcoating anything. Use a spicy, roast-heavy, and straightforward tone." },
  { id: "friendly-casual", name: "Friendly / Casual", icon: "😊", prompt: "Act like a chill, relaxed friend. Use casual language, be approachable and very conversational." },
  { id: "professional", name: "Professional / Formal", icon: "👔", prompt: "Be serious, highly professional, clear, and very polite. Do not use slang." },
  { id: "humorous", name: "Humorous / Funny", icon: "😂", prompt: "Include jokes, sarcasm, and light roasting in your responses. Be highly entertaining." },
  { id: "helpful-empathetic", name: "Helpful & Empathetic", icon: "💖", prompt: "Be highly supportive, understanding, caring, and empathetic." },
  { id: "straightforward", name: "Straightforward / Blunt", icon: "🎯", prompt: "Be direct, no sugarcoating, just give the straight facts." },
  { id: "enthusiastic", name: "Enthusiastic", icon: "🚀", prompt: "Be highly energetic, excited, and optimistic." },
  { id: "educational", name: "Educational", icon: "📚", prompt: "Provide detailed, step-by-step explanations as if teaching a student." },
  { id: "witty-clever", name: "Witty / Clever", icon: "🧠", prompt: "Give smart, sharp, and highly witty replies." },
  { id: "short-direct", name: "Short & Direct", icon: "⚡", prompt: "Provide very brief, concise, and direct answers. No fluff whatsoever." },
  { id: "detailed", name: "Detailed", icon: "📝", prompt: "Provide extremely long, in-depth, comprehensive explanations covering all angles." },
];

function parseChatTitle(rawTitle: string) {
  if (!rawTitle) return { title: "New Analysis", agentId: null, toneId: null };
  const parts = rawTitle.split(" | ");
  let cleanTitle = parts[0];
  let agentId = null;
  let toneId = null;

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i].trim();
    if (part.startsWith("agentId:")) {
      agentId = part.substring("agentId:".length).trim();
    } else if (part.startsWith("toneId:")) {
      toneId = part.substring("toneId:".length).trim();
    }
  }

  // If the display title has attached document text, clean it up
  if (cleanTitle.startsWith("[ATTACHED DOCUMENT:")) {
    cleanTitle = "Document Analysis";
  }

  return { title: cleanTitle, agentId, toneId };
}

export default function Dashboard() {
  const { user, isLoaded } = useUser();
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const isStreamingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(true);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("daily-innovation-idea-agent");
  const [agentDropdownOpen, setAgentDropdownOpen] = useState(false);
  
  const [selectedToneId, setSelectedToneId] = useState<string>("brutally-honest");
  const [toneDropdownOpen, setToneDropdownOpen] = useState(false);

  // AI Personalization State (user chooses name & color on first visit)
  const aiName = "Kacha Morich AI";
  const aiColor = "#10b981";

  // File Upload State
  const [attachedFile, setAttachedFile] = useState<{ name: string; content: string; type: string } | null>(null);
  const [isFileParsing, setIsFileParsing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Camera State
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Audio STT State
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Manage Account Settings Modal State
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);


  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    isStreamingRef.current = false;
    setIsLoading(false);
  };

  // Dynamic Mobile Keyboard Viewport Resizer Fix
  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;
    const handleResize = () => {
      const height = window.visualViewport ? window.visualViewport.height : window.innerHeight;
      document.documentElement.style.setProperty(
        "--viewport-height",
        `${height}px`
      );
    };
    window.visualViewport.addEventListener("resize", handleResize);
    window.visualViewport.addEventListener("scroll", handleResize);
    handleResize(); // Initial call
    return () => {
      window.visualViewport?.removeEventListener("resize", handleResize);
      window.visualViewport?.removeEventListener("scroll", handleResize);
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // A. Speech-to-Text (STT) Setup
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = "en-US";

        recognition.onresult = (event: any) => {
          const transcript = event.results[event.results.length - 1][0].transcript;
          setInputMessage((prev) => prev + (prev.endsWith(" ") || prev === "" ? "" : " ") + transcript);
        };

        recognition.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
          setIsListening(false);
          if (event.error === "not-allowed") {
            alert("Microphone permission is blocked! Please click the lock icon next to the URL, enable the microphone permission, and refresh the page.");
          } else if (event.error === "no-speech") {
            console.log("Speech recognition stopped due to silence.");
          } else if (event.error === "audio-capture") {
            alert("No working microphone was detected! Please connect a microphone or fix the input device in your system sound settings.");
          } else if (event.error === "network") {
            alert("Your browser (e.g., Brave) is blocking the Speech API for privacy reasons. Please use Google Chrome or Microsoft Edge for voice typing.");
          } else {
            console.error(`Voice recognition error: ${event.error}`);
          }
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        // Detect if user has typed anything in Bengali to preset recognition language
        const isUserSpeakingBengali = /[\u0980-\u09FF]/.test(inputMessage) || 
          messages.some(m => m.role === "user" && /[\u0980-\u09FF]/.test(m.content));
        
        recognitionRef.current.lang = isUserSpeakingBengali ? "bn-BD" : "en-US";
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error("Failed to start speech recognition:", err);
      }
    }
  };

  // C. File Upload Setup
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsFileParsing(true);
    try {
      const parsedContent = await parseAnyFile(file);
      setAttachedFile({
        name: file.name,
        content: parsedContent,
        type: file.type || "text/plain",
      });
    } catch (err: any) {
      console.error("File parsing error:", err);
      alert(`Could not parse file: ${err.message || "Unknown error"}`);
    } finally {
      setIsFileParsing(false);
    }
  };

  // D. Camera Setup
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment" } 
      });
      streamRef.current = stream;
      setIsCameraOpen(true);
    } catch (err) {
      console.error("Camera error:", err);
      alert("Could not access camera. Please allow permissions.");
    }
  };

  useEffect(() => {
    if (isCameraOpen && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [isCameraOpen]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      
      const file = new File([blob], `snapshot_${Date.now()}.jpg`, { type: "image/jpeg" });
      stopCamera();
      
      setIsFileParsing(true);
      try {
        const parsedContent = await parseAnyFile(file);
        setAttachedFile({
          name: file.name,
          content: parsedContent,
          type: file.type || "image/jpeg",
        });
      } catch (err: any) {
        console.error("Camera file parsing error:", err);
        alert(`Could not parse photo: ${err.message || "Unknown error"}`);
      } finally {
        setIsFileParsing(false);
      }
    }, "image/jpeg", 0.9);
  };

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
      if (!activeChatId || isStreamingRef.current) {
        if (!activeChatId && !isStreamingRef.current) {
          setMessages([]);
        }
        return;
      }

      // Restore active chat's agent and tone if serialized in the title
      const currentChat = chats.find((c) => c.id === activeChatId);
      if (currentChat) {
        const { agentId, toneId } = parseChatTitle(currentChat.title);
        if (agentId) setSelectedAgentId(agentId);
        if (toneId) setSelectedToneId(toneId);
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
  }, [activeChatId, chats]);

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

  // 4b. Delete All Chat Threads
  const handleDeleteAllChats = async () => {
    try {
      const res = await fetch("/api/chats", {
        method: "DELETE",
      });
      if (res.ok) {
        setChats([]);
        setActiveChatId(null);
        setMessages([]);
        setIsSettingsModalOpen(false);
        setConfirmDeleteAll(false);
      } else {
        alert("Failed to delete all conversations. Please try again.");
      }
    } catch (err) {
      console.error("Delete all chats error:", err);
      alert("An unexpected error occurred. Please try again.");
    }
  };

  // 5. Submit Message to Kacha Morich AI (with Real-time Streaming!)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputMessage.trim() && !attachedFile) || isLoading) return;

    // Stop listening if user was dictating
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    const userMessageContent = inputMessage.trim();
    setInputMessage("");
    setIsLoading(true);
    isStreamingRef.current = true;

    // Format the final message sent to AI with attached file contents if present
    let messageToSend = userMessageContent;
    const currentAttachment = attachedFile;
    if (attachedFile) {
      messageToSend = `[ATTACHED DOCUMENT: ${attachedFile.name}]\n\`\`\`\n${attachedFile.content}\n\`\`\`\n\nUser Prompt: ${userMessageContent || "Please analyze the extracted text above based on your specialized agent role."}`;
      setAttachedFile(null);
    }

    // Append user's message locally (show clean message in chat UI, not the giant raw file block)
    const base64Match = currentAttachment?.content.match(/\[IMAGE_BASE64:(data:image\/[^\]]+)\]/);
    const base64Tag = base64Match ? `[IMAGE_BASE64:${base64Match[1]}]` : "";

    const newUserMessage: Message = { 
      role: "user", 
      content: (base64Tag ? base64Tag + "\n" : "") + (userMessageContent || `Attached file: ${currentAttachment ? currentAttachment.name : "file"}`) 
    };
    setMessages((prev) => [...prev, newUserMessage]);

    // Create an empty Kacha Morich AI placeholder for stream accumulation
    const assistantPlaceholder: Message = { role: "assistant", content: "" };
    setMessages((prev) => [...prev, assistantPlaceholder]);

    try {
      abortControllerRef.current = new AbortController();
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortControllerRef.current.signal,
        body: JSON.stringify({
          message: messageToSend,
          chatId: activeChatId,
          agentId: selectedAgentId,
          toneId: selectedToneId,
          aiName: aiName,
          tonePrompt: TONES_LIST.find(t => t.id === selectedToneId)?.prompt,
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
            content: "Sorry, I ran into a connection glitch. Let's try that again. - Kacha Morich AI",
          };
        }
        return updated;
      });
    } finally {
      setIsLoading(false);
      isStreamingRef.current = false;
    }
  };

  const activeChat = chats.find((c) => c.id === activeChatId);

  // Quick suggestions templates
  const handleQuickSuggest = (text: string) => {
    setInputMessage(text);
  };

  // Dynamic letter avatar based on AI name
  const AIAvatar = ({ size = 34, className = "" }: { size?: number; className?: string }) => (
    <div
      className={`relative rounded-full flex items-center justify-center font-black text-black ${className}`}
      style={{ width: size, height: size, backgroundColor: aiColor, fontSize: size * 0.5 }}
    >
      🌶️
      <span className="absolute bottom-0.5 right-0.5 w-2 h-2 bg-emerald-400 rounded-full border border-black animate-pulse" />
    </div>
  );

  return (
    <>
    <div 
      className="flex bg-black overflow-hidden text-neutral-100 font-sans relative w-full"
      style={{ height: "var(--viewport-height, 100dvh)" }}
    >
      {/* 1. Sidebar - Collapsible on Mobile */}
      <aside 
        className={`fixed inset-y-0 left-0 z-40 w-72 bg-[#050505] border-r border-white/5 transform transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Top Nav Brand */}
          <div className="p-5 border-b border-white/5 flex flex-col gap-1 text-left">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2.5">
                <AIAvatar size={34} className="border border-white/10" />
                <span className="font-extrabold tracking-widest text-white/90 text-xs uppercase">
                  {aiName}
                </span>
              </Link>
              <button 
                className="lg:hidden p-1 text-neutral-400 hover:text-neutral-100" 
                onClick={() => setSidebarOpen(false)}
              >
                <X size={20} />
              </button>
            </div>
            <span className="text-[10px] font-medium text-neutral-500 leading-normal">
              Your personal multi-specialist AI assistant.
            </span>
          </div>

          {/* New Chat Button */}
          <div className="px-4 py-3">
            <button 
              onClick={handleNewChat}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent hover:from-white/[0.08] text-neutral-200 hover:text-white text-sm font-bold transition duration-300 shadow-sm"
            >
              <Plus size={16} /> New Analysis
            </button>
          </div>

          {/* Chats History List */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
            {isSyncing ? (
              <div className="p-4 text-center text-xs text-neutral-600">Syncing consultations...</div>
            ) : chats.length === 0 ? (
              <div className="p-4 text-center text-xs text-neutral-600">No previous consultations</div>
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
                      ? "bg-neutral-200/10 border border-neutral-200/20 text-white font-medium" 
                      : "border border-transparent text-neutral-400 hover:bg-neutral-900/60 hover:text-neutral-200"
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <MessageSquare size={15} className={activeChatId === chat.id ? "text-neutral-200" : "text-neutral-500"} />
                    <span className="truncate pr-2">{parseChatTitle(chat.title).title}</span>
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
          <div className="p-4 border-t border-neutral-900 bg-[#050505] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <UserButton />
              <div className="flex flex-col text-left">
                <span className="text-xs font-bold text-neutral-200 truncate max-w-[120px]">
                  {user?.firstName || user?.username || "Consultant"}
                </span>
                <span className="text-[10px] text-neutral-200 font-bold tracking-wider">PREMIUM ADVISORY MEMBER</span>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setIsSettingsModalOpen(true)}
                className="p-2 text-neutral-500 hover:text-neutral-200 rounded-lg hover:bg-neutral-900 transition duration-200"
                title="Manage Account"
              >
                <Settings size={16} />
              </button>
              <Link 
                href="/" 
                className="p-2 text-neutral-500 hover:text-neutral-200 rounded-lg hover:bg-neutral-900 transition duration-200"
                title="Exit to home"
              >
                <ArrowLeft size={16} />
              </Link>
            </div>
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
      <main className="flex-1 min-h-0 flex flex-col bg-[#020202] relative">
        {/* Dynamic header */}
        <header className="h-16 px-4 sm:px-6 border-b border-white/5 bg-[#050505]/80 backdrop-blur-xl flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <button 
              className="lg:hidden p-1.5 text-neutral-400 hover:text-neutral-100 rounded-lg hover:bg-neutral-950"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2.5">
              {isListening ? (
                <div className="flex items-end h-5 px-2.5 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 select-none">
                  <span className="text-[9px] font-black tracking-wider mr-2 uppercase">🎙️ LISTENING TO YOUR VOICE QUERY</span>
                  <span className="soundwave-bar bg-red-500"></span>
                  <span className="soundwave-bar bg-red-500"></span>
                  <span className="soundwave-bar bg-red-500"></span>
                  <span className="soundwave-bar bg-red-500"></span>
                  <span className="soundwave-bar bg-red-500"></span>
                </div>
              ) : (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setToneDropdownOpen(!toneDropdownOpen)}
                    className="flex items-center gap-1 sm:gap-1.5 px-2 py-1.5 sm:px-2.5 sm:py-1 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-900/50 transition-colors"
                  >
                    <span className="text-[11px] sm:text-xs font-black tracking-wider uppercase">
                      {(() => {
                        const activeTone = TONES_LIST.find((t) => t.id === selectedToneId);
                        return (
                          <>
                            <span className="hidden sm:inline">{activeTone ? `${activeTone.icon} ${activeTone.name}` : "🌶️ BRUTALLY HONEST"}</span>
                            <span className="sm:hidden">{activeTone ? activeTone.icon : "🌶️"}</span>
                          </>
                        );
                      })()}
                    </span>
                    <ChevronDown size={12} className={`transition-transform duration-200 ${toneDropdownOpen ? "rotate-180" : ""}`} />
                  </button>
                  
                  {toneDropdownOpen && (
                    <div className="absolute top-full left-0 mt-2 w-56 bg-[#0A0A0A]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-1 shadow-2xl z-50">
                      <div className="max-h-64 overflow-y-auto">
                        {TONES_LIST.map((tone) => (
                          <button
                            key={tone.id}
                            type="button"
                            onClick={() => {
                              setSelectedToneId(tone.id);
                              setToneDropdownOpen(false);
                            }}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-semibold rounded-xl transition duration-200 ${
                              selectedToneId === tone.id ? "bg-emerald-500/10 text-emerald-400" : "text-neutral-400 hover:bg-white/5 hover:text-white"
                            }`}
                          >
                            <span className="text-base">{tone.icon}</span>
                            <span>{tone.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              <span className="mobile-hide sm:block text-sm font-semibold text-neutral-200 truncate max-w-[200px] ml-2">
                {activeChat ? parseChatTitle(activeChat.title).title : ""}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Elite Agent Selector Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setAgentDropdownOpen(!agentDropdownOpen)}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-white/10 bg-[#0A0A0A]/50 hover:bg-[#111111]/80 backdrop-blur-md text-xs text-neutral-300 hover:text-white hover:border-neutral-200/30 transition duration-300 font-bold shadow-sm"
              >
                {(() => {
                  const activeAgent = AGENTS_LIST.find((a) => a.id === selectedAgentId);
                  if (activeAgent) {
                    const AgentIcon = activeAgent.icon;
                    return <AgentIcon size={14} className="text-neutral-200 flex-shrink-0 animate-pulse" />;
                  }
                  return null;
                })()}
                <span className="truncate max-w-[120px] sm:max-w-[180px]">
                  {AGENTS_LIST.find((a) => a.id === selectedAgentId)?.name || "Select Agent"}
                </span>
                <ChevronDown size={13} className={`text-neutral-500 transition duration-300 ${agentDropdownOpen ? "rotate-180 text-neutral-200" : ""}`} />
              </button>

              {/* Dynamic Glassmorphic Dropdown List */}
              {agentDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setAgentDropdownOpen(false)} />
                  <div className="absolute right-0 mt-2.5 w-80 max-h-[420px] overflow-y-auto rounded-xl border border-neutral-800 bg-[#090909]/95 backdrop-blur-md p-2 shadow-[0_15px_40px_rgba(0,0,0,0.7)] z-50 divide-y divide-neutral-900 space-y-1 scrollbar-thin">
                    <div className="px-3 py-1.5 text-[9px] font-black text-neutral-500 tracking-widest uppercase">
                      Select Specialist AI Agent
                    </div>
                    <div className="pt-1.5 space-y-0.5">
                      {AGENTS_LIST.map((agent) => {
                        const AgentIcon = agent.icon;
                        const isSelected = selectedAgentId === agent.id;
                        return (
                          <button
                            key={agent.id}
                            type="button"
                            onClick={() => {
                              setSelectedAgentId(agent.id);
                              setAgentDropdownOpen(false);
                              // Start a new chat if there are already messages in the current one
                              if (messages.length > 0) {
                                handleNewChat();
                              }
                            }}
                            className={`w-full text-left flex items-start gap-3 p-2.5 rounded-lg transition duration-200 ${
                              isSelected 
                                ? "bg-neutral-200/10 text-white border border-neutral-200/20" 
                                : "border border-transparent hover:bg-neutral-900 text-neutral-300 hover:text-neutral-100"
                            }`}
                          >
                            <AgentIcon size={16} className={`mt-0.5 flex-shrink-0 ${isSelected ? "text-neutral-200" : "text-neutral-500"}`} />
                            <div className="flex flex-col text-xs leading-normal">
                              <span className="font-bold">{agent.banglaName}</span>
                              <span className="text-[10px] text-neutral-500 leading-normal mt-0.5">
                                {agent.banglaDesc}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>

            <Link 
              href="/"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-800 bg-neutral-900/40 text-xs text-neutral-400 hover:text-white hover:bg-neutral-850 transition duration-300"
            >
              Home
            </Link>
            <button 
              onClick={() => setIsSettingsModalOpen(true)}
              className="p-2 text-neutral-500 hover:text-neutral-200 rounded-lg hover:bg-neutral-900 transition duration-200"
              title="Manage Account"
            >
              <Settings size={16} />
            </button>
            <UserButton />
          </div>
        </header>
 
        {/* Scrollable Conversation area */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 sm:p-6 md:p-8 space-y-6">
          {messages.length === 0 ? (
            /* Welcome / Onboarding Screen */
            <div className="max-w-2xl mx-auto pt-8 pb-12 flex flex-col items-center justify-center text-center relative">
              <div className="relative group">
                <div className="absolute -inset-1 rounded-full opacity-60 blur-md group-hover:opacity-90 transition duration-1000" style={{ background: `radial-gradient(circle, ${aiColor}44, transparent)` }}></div>
                <AIAvatar size={88} className="relative border-2 border-white/10 mb-6" />
              </div>
 
              <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-neutral-100 mt-4 leading-normal">
                {aiName}:{" "}
                <span className="text-neutral-400">
                  {AGENTS_LIST.find((a) => a.id === selectedAgentId)?.banglaName || "Specialist"}
                </span>
              </h2>
              <p className="mt-4 text-neutral-400/80 leading-relaxed max-w-xl text-sm">
                {AGENTS_LIST.find((a) => a.id === selectedAgentId)?.banglaDesc || "কুদ্দুস আলীর ২০+ বছরের বাস্তব বিজনেস অভিজ্ঞতার আলোকে যেকোনো আইডিয়া যাচাই করুন।"}
              </p>
 
              {/* Warning box */}
              <div className="mt-6 w-full p-4 rounded-xl border border-neutral-200/20 bg-neutral-200/5 text-white text-xs flex items-center gap-2 justify-center shadow-[0_0_15px_rgba(245,158,11,0.02)]">
                <Sparkles size={14} className="flex-shrink-0 text-neutral-200 animate-pulse" />
                <span>● <strong>Operational Advisor Warning:</strong> Please specify your <strong>target country and primary market</strong> first for accurate feedback.</span>
              </div>
 
              {/* Prompt Suggestions Grid */}
              <div className="mt-10 w-full text-left">
                <span className="text-xs font-semibold text-neutral-200 uppercase tracking-widest block mb-4 border-b border-neutral-900 pb-2">
                  Select a Case / Consultation Prompt
                </span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {(AGENTS_LIST.find((a) => a.id === selectedAgentId)?.suggestions || []).map((suggestText, sIdx) => (
                    <button 
                      key={sIdx}
                      onClick={() => handleQuickSuggest(suggestText)}
                      className="p-4 text-left rounded-xl border border-neutral-900/60 hover:border-neutral-200/30 bg-neutral-900/20 hover:bg-neutral-900/50 transition duration-300 text-xs text-neutral-300 leading-relaxed shadow-sm hover:shadow-[0_0_15px_rgba(255,140,0,0.03)]"
                    >
                      ✨ &ldquo;{suggestText}&rdquo;
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Historical & Streamed Messages */
            <div className="max-w-3xl mx-auto w-full space-y-8 pb-12 overflow-x-hidden">
              {messages.map((msg, index) => {
                // If it is AI's response
                if (msg.role === "assistant") {
                  return (
                    <div key={index} className="flex gap-2 sm:gap-4 items-start animate-fade-in">
                      <AIAvatar size={36} className="flex-shrink-0 border border-white/10" />
                      <div className="flex flex-col gap-1.5 flex-1 min-w-0 overflow-hidden group/msg relative">
                        <span className="text-xs font-black tracking-wider flex items-center gap-1.5" style={{ color: aiColor }}>
                          {aiName.toUpperCase()}
                        </span>
                        <div className="bg-gradient-to-br from-[#0F0F0F] to-[#0A0A0A] border border-white/5 rounded-2xl rounded-tl-none px-4 sm:px-6 py-4 sm:py-5 text-neutral-200 leading-relaxed text-sm shadow-md backdrop-blur-md prose prose-invert prose-sm max-w-full w-full overflow-hidden relative">
                          {msg.content ? (
                            <div className="w-full max-w-full overflow-hidden break-words [&_*]:max-w-full [&_pre]:overflow-x-auto [&_code]:break-all [&_p]:break-words [&_li]:break-words">
                              <ReactMarkdown>{msg.content}</ReactMarkdown>
                            </div>
                          ) : (
                            <div className="flex gap-1 items-center py-2">
                              <span className="w-2 h-2 bg-neutral-200 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                              <span className="w-2 h-2 bg-neutral-200 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                              <span className="w-2 h-2 bg-neutral-200 rounded-full animate-bounce"></span>
                            </div>
                          )}
                        </div>
                        {msg.content && (
                          <div className="flex justify-start">
                            <button
                              type="button"
                              onClick={() => copyToClipboard(msg.content, `msg-${index}`)}
                              className="opacity-70 hover:opacity-100 focus:opacity-100 transition-opacity p-1 mt-1 rounded hover:bg-white/5 text-neutral-500 hover:text-neutral-300 flex items-center gap-1 text-[10px] font-bold"
                              title="Copy response"
                            >
                              {copiedId === `msg-${index}` ? (
                                <>
                                  <Check size={12} className="text-emerald-500" />
                                  <span className="text-emerald-500">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy size={12} />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }

                // User's message
                const base64Regex = /\[IMAGE_BASE64:(data:image\/[^\]]+)\]/;
                const hasImageMatch = msg.content?.match(base64Regex);
                const imageUrl = hasImageMatch ? hasImageMatch[1] : null;
                const cleanContent = msg.content ? msg.content.replace(base64Regex, "").trim() : "";

                return (
                  <div key={index} className="flex gap-4 items-start justify-end animate-fade-in">
                    <div className="flex flex-col gap-1.5 items-end max-w-[80%] group/msg relative">
                      <span className="text-xs font-semibold text-neutral-500 tracking-wider">YOUR BUSINESS INQUIRY</span>
                      <div className="bg-gradient-to-bl from-neutral-200/10 to-transparent border border-neutral-200/20 rounded-2xl rounded-tr-none px-5 py-4 text-amber-50 text-sm shadow-sm flex flex-col items-end relative">
                        {imageUrl && (
                          <div className="mb-2 relative rounded-xl overflow-hidden border border-white/10 group shadow-md max-w-full">
                            <img 
                              src={imageUrl} 
                              alt="Uploaded visual context" 
                              className="max-h-60 max-w-full object-contain rounded-xl"
                            />
                          </div>
                        )}
                        {cleanContent && (
                          <span className="text-left w-full block whitespace-pre-wrap">{cleanContent}</span>
                        )}
                      </div>
                      {cleanContent && (
                        <div className="flex justify-end w-full">
                          <button
                            type="button"
                            onClick={() => copyToClipboard(cleanContent, `msg-${index}`)}
                            className="opacity-70 hover:opacity-100 focus:opacity-100 transition-opacity p-1 mt-1 rounded hover:bg-white/5 text-neutral-500 hover:text-neutral-300 flex items-center gap-1 text-[10px] font-bold"
                            title="Copy input"
                          >
                            {copiedId === `msg-${index}` ? (
                              <>
                                <Check size={12} className="text-emerald-500" />
                                <span className="text-emerald-500">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy size={12} />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Typing indicator */}
              {isLoading && messages[messages.length - 1]?.content !== "" && (
                <TypingIndicator aiName={aiName} aiColor={aiColor} />
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Text Form Area */}
        <div className="p-3 pb-6 sm:p-4 md:p-6 border-t border-white/5 bg-gradient-to-t from-[#020202] to-black">
          <div className="max-w-3xl mx-auto relative">
            {/* Stop Generation Button */}
            {isLoading && (
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-30">
                <button
                  type="button"
                  onClick={stopGeneration}
                  className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0A0A0A]/95 hover:bg-neutral-900 border border-white/10 text-neutral-300 text-xs shadow-xl backdrop-blur-md transition-all active:scale-95 animate-fade-in font-bold whitespace-nowrap"
                >
                  <Square size={10} fill="currentColor" className="text-red-500 animate-pulse" /> Stop generating
                </button>
              </div>
            )}
            <form 
              onSubmit={handleSubmit}
              className="w-full relative rounded-2xl border border-white/10 bg-[#0A0A0A] shadow-[0_0_40px_rgba(0,0,0,0.8)] focus-within:border-neutral-200/40 focus-within:ring-1 focus-within:ring-neutral-200/20 transition duration-300 overflow-hidden"
            >
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                // Prevent accidental submission when pressing Enter to finalize Bengali/IME composition
                if (e.nativeEvent.isComposing) return;
                
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              onPaste={async (e) => {
                const items = e.clipboardData?.items;
                if (!items) return;
                for (let i = 0; i < items.length; i++) {
                  if (items[i].type.indexOf("image") !== -1) {
                    const blob = items[i].getAsFile();
                    if (blob) {
                      const file = new File([blob], `pasted_image_${Date.now()}.png`, { type: blob.type });
                      setIsFileParsing(true);
                      try {
                        const parsedContent = await parseAnyFile(file);
                        setAttachedFile({
                          name: file.name,
                          content: parsedContent,
                          type: file.type || "image/png",
                        });
                      } catch (err: any) {
                        console.error("Paste image parsing error:", err);
                        alert(`Could not parse pasted image: ${err.message || "Unknown error"}`);
                      } finally {
                        setIsFileParsing(false);
                      }
                      e.preventDefault(); // Stop default paste so the image doesn't try to paste as raw data
                      return;
                    }
                  }
                }
              }}
              placeholder={AGENTS_LIST.find((a) => a.id === selectedAgentId)?.placeholder || "Describe your startup idea and which country/market you are targeting..."}
              className="w-full bg-transparent border-0 ring-0 focus:ring-0 focus:outline-none placeholder-neutral-600 text-sm text-neutral-200 px-5 py-4 resize-none h-[64px] min-h-[50px] max-h-[200px]"
              disabled={isLoading}
              onFocus={(e) => {
                // Mobile keyboard fix: scroll textarea into view after keyboard finishes animating
                const target = e.currentTarget;
                setTimeout(() => {
                  target.scrollIntoView({ behavior: "smooth", block: "center" });
                }, 350);
              }}
            />

            {/* Attached file preview or parsing indicator */}
            {attachedFile && (
              <div className="mx-5 my-2 px-3 py-1.5 rounded-lg bg-neutral-200/10 border border-neutral-200/20 text-xs text-white flex items-center justify-between max-w-sm">
                <div className="flex items-center gap-2 truncate">
                  <FileText size={14} className="text-neutral-200 flex-shrink-0" />
                  <span className="truncate font-semibold">{attachedFile.name}</span>
                </div>
                <button 
                  type="button" 
                  onClick={() => setAttachedFile(null)}
                  className="p-0.5 text-neutral-500 hover:text-red-400 transition"
                >
                  <X size={14} />
                </button>
              </div>
            )}
            {isFileParsing && (
              <div className="mx-5 my-2 text-xs text-neutral-500 flex items-center gap-1.5 animate-pulse">
                <Loader2 size={12} className="animate-spin text-neutral-200" />
                <span>Parsing document data...</span>
              </div>
            )}

            <div className="flex items-center justify-between px-5 pb-3 bg-[#0D0D0D] border-t border-neutral-900 pt-2.5">
              {/* Media tools */}
              <div className="flex items-center gap-2">
                {/* Hidden File Input */}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept=".txt,.md,.csv,.json,.pdf,.docx,.xlsx,.xls,.png,.jpg,.jpeg,.webp"
                  className="hidden" 
                />
                
                {/* Paperclip Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading || isFileParsing}
                  title="Attach file (PDF, Word, Excel, Images, Text)"
                  className="p-2 rounded-xl border border-neutral-800 bg-neutral-900/40 text-neutral-400 hover:text-white hover:border-neutral-200/20 transition duration-300"
                >
                  <Paperclip size={15} />
                </button>

                {/* Camera Button */}
                <button
                  type="button"
                  onClick={startCamera}
                  disabled={isLoading || isFileParsing}
                  title="Take Photo"
                  className="p-2 rounded-xl border border-neutral-800 bg-neutral-900/40 text-neutral-400 hover:text-white hover:border-neutral-200/20 transition duration-300"
                >
                  <Camera size={15} />
                </button>

                {/* Mic Button */}
                <button
                  type="button"
                  onClick={toggleListening}
                  title={isListening ? "Stop listening" : "Dictate (Speech to Text)"}
                  className={`p-2 rounded-xl border transition duration-300 ${
                    isListening 
                      ? "bg-red-500/10 border-red-500/30 text-red-500 animate-pulse" 
                      : "border-neutral-800 bg-neutral-900/40 text-neutral-400 hover:text-red-400 hover:border-red-500/20"
                  }`}
                >
                  {isListening ? <MicOff size={15} /> : <Mic size={15} />}
                </button>
              </div>

              <span className="text-[10px] text-neutral-600 select-none hidden md:inline-flex items-center gap-1 ml-4">
                <CornerDownLeft size={10} /> Press Enter to send consultation
              </span>
              
              <button 
                type="submit"
                disabled={isLoading || (!inputMessage.trim() && !attachedFile)}
                className={`ml-auto p-2.5 rounded-xl text-neutral-950 flex items-center justify-center transition duration-300 ${
                  isLoading || (!inputMessage.trim() && !attachedFile)
                    ? "bg-neutral-900 text-neutral-600 cursor-not-allowed border border-neutral-900/40" 
                    : "bg-neutral-200 hover:bg-white hover:scale-105 active:scale-95 text-neutral-950 font-bold"
                }`}
              >
                <Send size={15} />
              </button>
            </div>
            </form>
          </div>
        </div>
      </main>
    </div>

    {/* Camera Modal Overlay */}
    {isCameraOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
        <div className="relative w-full max-w-lg bg-[#0A0A0A] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/5">
            <span className="text-white font-bold text-sm tracking-wide">Capture Photo</span>
            <button 
              onClick={stopCamera}
              className="text-neutral-400 hover:text-white transition"
            >
              <XCircle size={20} />
            </button>
          </div>
          
          {/* Video Stream */}
          <div className="relative bg-black flex-1 aspect-[4/3] sm:aspect-video flex items-center justify-center">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className="w-full h-full object-cover"
            />
          </div>
          
          {/* Hidden Canvas */}
          <canvas ref={canvasRef} className="hidden" />
          
          {/* Footer Controls */}
          <div className="p-4 flex items-center justify-center border-t border-white/5 bg-[#050505]">
            <button
              onClick={capturePhoto}
              className="group relative flex items-center justify-center w-16 h-16 rounded-full bg-white/10 border-4 border-white/20 hover:border-white transition duration-300"
            >
              <div className="w-12 h-12 bg-white rounded-full group-hover:scale-95 transition-transform duration-300"></div>
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Settings / Manage Account Modal */}
    {isSettingsModalOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in">
        <div className="relative w-full max-w-md bg-[#0A0A0A] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div className="flex items-center gap-2">
              <Settings className="text-[#10b981]" size={20} />
              <h2 className="text-white font-bold text-lg tracking-wide">Manage Account</h2>
            </div>
            <button 
              onClick={() => setIsSettingsModalOpen(false)}
              className="p-1 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-900 transition"
            >
              <X size={20} />
            </button>
          </div>

          {/* User Account Info */}
          <div className="space-y-2 bg-[#050505] p-4 rounded-2xl border border-neutral-900">
            <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block">Logged in as</span>
            <div className="flex items-center gap-3">
              <UserButton />
              <div className="flex flex-col text-left">
                <span className="text-sm font-bold text-neutral-200 truncate">
                  {user?.primaryEmailAddress?.emailAddress || "Advisory Member"}
                </span>
                <span className="text-[10px] text-[#10b981] font-bold tracking-wider">PREMIUM ADVISORY MEMBER</span>
              </div>
            </div>
          </div>

          {/* Options / Action Controls */}
          <div className="space-y-4">
            {/* 1. Delete Attached File */}
            <div className="flex flex-col space-y-2">
              <span className="text-xs font-bold text-neutral-400">Current File Attachment</span>
              {attachedFile ? (
                <div className="flex items-center justify-between p-3 rounded-2xl bg-red-500/5 border border-red-500/10 text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <FileText size={15} className="text-red-400 flex-shrink-0" />
                    <span className="text-neutral-200 truncate font-semibold">{attachedFile.name}</span>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm("Are you sure you want to remove the current file attachment?")) {
                        setAttachedFile(null);
                        alert("File attachment removed successfully.");
                      }
                    }}
                    className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl font-bold transition duration-300"
                  >
                    Delete File
                  </button>
                </div>
              ) : (
                <div className="p-3 text-center rounded-2xl bg-neutral-900/30 border border-neutral-900 text-xs text-neutral-500">
                  No file attached currently. You can attach a document using the clip icon in the chatbar.
                </div>
              )}
            </div>

            {/* 2. Delete All Conversations */}
            <div className="flex flex-col space-y-2 pt-2">
              <span className="text-xs font-bold text-neutral-400">Danger Zone</span>
              <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/10 space-y-3">
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Permanently delete all your chat logs, consultation history, and any files embedded inside them. This cannot be undone.
                </p>
                {confirmDeleteAll ? (
                  <div className="flex gap-2 w-full">
                    <button
                      type="button"
                      onClick={handleDeleteAllChats}
                      className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white border border-transparent rounded-xl font-bold text-xs text-center transition duration-300 flex items-center justify-center gap-2 shadow-lg shadow-red-950/20"
                    >
                      <Trash2 size={14} />
                      Yes, Delete All
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteAll(false)}
                      className="px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 border border-white/5 rounded-xl font-bold text-xs text-center transition duration-300"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteAll(true)}
                    disabled={chats.length === 0}
                    className={`w-full py-2.5 rounded-xl font-bold text-xs text-center transition duration-300 flex items-center justify-center gap-2 ${
                      chats.length === 0 
                        ? "bg-neutral-950 text-neutral-700 border border-neutral-900 cursor-not-allowed"
                        : "bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 hover:border-transparent"
                    }`}
                  >
                    <Trash2 size={14} />
                    Delete All Conversations
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
