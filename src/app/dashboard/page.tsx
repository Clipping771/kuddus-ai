"use client";

import React, { useState, useEffect, useRef } from "react";
import NextImage from "next/image";
import { useUser, UserButton } from "@clerk/nextjs";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
// NovaAvatar removed — using dynamic AIAvatar now
import TypingIndicator from "@/components/TypingIndicator";
import ApiKeyBanner, { BannerType } from "@/components/ApiKeyBanner";

// Helper to clean LaTeX arrows in AI response
function cleanArrows(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .replace(/\$?\\rightarrow\$?/gi, "→")
    .replace(/\$?\\Rightarrow\$?/gi, "⇒")
    .replace(/\$?\\to\$?/gi, "→")
    .replace(/\$?\\leftarrow\$?/gi, "←")
    .replace(/\$?\\Leftarrow\$?/gi, "⇐");
}

import mermaid from "mermaid";

if (typeof window !== "undefined") {
  mermaid.initialize({
    startOnLoad: false,
    theme: "dark",
    securityLevel: "loose",
    fontFamily: "Inter, sans-serif"
  });
}

const MermaidDiagram = ({ chart }: { chart: string }) => {
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<boolean>(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const elementId = useRef<string>("");
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Initialize elementId only on client side to avoid hydration mismatch
  useEffect(() => {
    elementId.current = `mermaid-${Math.floor(Math.random() * 1000000)}`;
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    async function renderChart() {
      if (!chart) return;
      try {
        setError(false);
        const { svg: renderedSvg } = await mermaid.render(elementId.current, chart);
        setSvg(renderedSvg);
      } catch (err) {
        console.error("Mermaid parsing error:", err);
        setError(true);
      }
    }
    renderChart();
  }, [chart, isHydrated]);

  const downloadPNG = () => {
    if (!containerRef.current) return;
    const svgElement = containerRef.current.querySelector("svg");
    if (!svgElement) return;

    // Convert SVG to XML string and create binary blob
    const svgString = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const URL = window.URL || window.webkitURL || window;
    const blobURL = URL.createObjectURL(svgBlob);

    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      // Scale up by 2.5x for crisp high-resolution images
      canvas.width = (svgElement.clientWidth || 1000) * 2.5;
      canvas.height = (svgElement.clientHeight || 700) * 2.5;
      const context = canvas.getContext("2d");
      if (context) {
        context.fillStyle = "#0D0D0D"; // Dark futuristic background for enterprise diagrams
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const png = canvas.toDataURL("image/png");

        const a = document.createElement("a");
        a.href = png;
        a.download = `kacha_morich_uml_${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    };
    image.src = blobURL;
  };

  const downloadSVG = () => {
    if (!containerRef.current) return;
    const svgElement = containerRef.current.querySelector("svg");
    if (!svgElement) return;

    const svgString = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kacha_morich_uml_${Date.now()}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (error) {
    return (
      <pre className="bg-red-950/20 border border-red-500/20 rounded-xl p-4 text-xs text-red-400 overflow-x-auto whitespace-pre-wrap">
        <code>{chart}</code>
      </pre>
    );
  }

  if (!isHydrated || !svg) {
    return (
      <div className="flex items-center justify-center p-8 bg-neutral-900/30 rounded-xl border border-white/5 my-4">
        <span className="text-xs text-neutral-500 animate-pulse">Rendering UML Diagram...</span>
      </div>
    );
  }

  return (
    <div className="my-6 border border-white/10 rounded-2xl bg-[#080808]/90 overflow-hidden shadow-2xl backdrop-blur-md">
      {/* Claude-style Premium Artifact Header */}
      <div className="px-4 py-3 bg-[#0D0D0D]/90 border-b border-white/5 flex items-center justify-between text-xs font-black tracking-widest text-amber-400 uppercase select-none">
        <div className="flex items-center gap-2">
          <span className="animate-pulse text-amber-500">🛠️</span>
          <span>Claude-Style UML Diagram Artifact</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={downloadPNG}
            className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold transition-all text-[10px] uppercase tracking-wider"
            title="Download high-resolution PNG image"
          >
            🖼️ Download PNG
          </button>
          <button
            type="button"
            onClick={downloadSVG}
            className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-750 text-neutral-200 font-bold transition-all text-[10px] uppercase tracking-wider"
            title="Download vector SVG file"
          >
            📥 Download SVG
          </button>
        </div>
      </div>

      {/* SVG Diagram Output Render Container */}
      <div
        ref={containerRef}
        className="p-6 flex justify-center overflow-x-auto bg-[#030303] shadow-inner [&_svg]:max-w-full [&_svg]:h-auto [&_svg_rect]:fill-neutral-900 [&_svg_rect]:stroke-amber-500/30 [&_svg_rect]:stroke-1 [&_svg_text]:fill-neutral-100 [&_svg_.actor]:fill-neutral-900 [&_svg_.actor]:stroke-amber-500/40 [&_svg_.messageLine0]:stroke-amber-500/60 [&_svg_.messageLine1]:stroke-amber-500/60 [&_svg_#arrowhead]:fill-amber-500"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  );
};
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
  ShieldCheck,
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
  Square,
  Sun,
  Moon,
  Download,
  ChevronLeft,
  ChevronRight,
  Key
} from "lucide-react";
import Link from "next/link";
import { parseAnyFile } from "@/lib/fileParser";

// Resolves a stored icon string (e.g. "FileText") to the actual Lucide component for custom agents
function resolveCustomIcon(iconName: string) {
  const iconMap: Record<string, React.ElementType> = {
    FileText, Lightbulb, DollarSign, Search, Eye, Code, Target, Video,
    Share2, ShieldCheck, GraduationCap, Briefcase, TrendingUp, Settings,
    Mail, Calendar, Heart, Sparkles, Loader2,
  };
  return iconMap[iconName] || FileText;
}

// Strip heavy instructions before saving to localStorage to avoid QuotaExceededError
function agentsForStorage(agents: CustomAgent[]) {
  return agents.map(({ instructions: _instructions, ...rest }) => rest);
}

// ── Dynamic Loading Indicator ──────────────────────────────────────────────
const LOADING_MESSAGES: Record<string, string[]> = {
  "devmind-agent": [
    "🧠 Analyzing your code architecture...",
    "⚙️ Running security checks...",
    "🔍 Identifying edge cases...",
    "💡 Crafting production-ready solution...",
  ],
  "personal-cfo-finance-agent": [
    "💰 Crunching the numbers...",
    "📊 Analyzing cash flow patterns...",
    "🧮 Running financial models...",
    "📈 Calculating ROI projections...",
  ],
  "research-agent": [
    "🔍 Scanning market data...",
    "📊 Building SWOT analysis...",
    "🌐 Analyzing industry trends...",
    "📋 Synthesizing research findings...",
  ],
  "competitor-spy-agent": [
    "🕵️ Infiltrating competitor data...",
    "🔎 Mapping market positioning...",
    "⚔️ Finding their Achilles heel...",
    "🎯 Crafting attack strategy...",
  ],
  "investor-pitch-agent": [
    "💼 Structuring your pitch deck...",
    "📊 Calculating valuation multiples...",
    "🎯 Anticipating investor questions...",
    "✨ Polishing the narrative...",
  ],
  "daily-innovation-idea-agent": [
    "💡 Scanning global market gaps...",
    "🚀 Generating breakthrough ideas...",
    "🌊 Finding blue ocean opportunities...",
    "⚡ Validating business models...",
  ],
  "pain-point-scraper-agent": [
    "🌶️ Scraping Reddit complaints...",
    "😤 Finding real frustrations...",
    "💰 Mapping market gaps...",
    "🎯 Building business models...",
  ],
  "brain-trust": [
    "🧠 Assembling Executive Board...",
    "📝 Architect drafting master plan...",
    "🕵️ Expert panel reviewing...",
    "✨ CEO synthesizing final strategy...",
  ],
};

const DEFAULT_LOADING_MESSAGES = [
  "🌶️ Sharpening the analysis...",
  "⚡ Processing your request...",
  "🧠 Thinking strategically...",
  "✨ Crafting the perfect response...",
  "🎯 Focusing on what matters...",
];

const DynamicLoadingIndicator = ({ themeMode, agentId }: { themeMode: string; agentId: string }) => {
  const [msgIndex, setMsgIndex] = React.useState(0);
  const [visible, setVisible] = React.useState(true);

  const messages = LOADING_MESSAGES[agentId] || DEFAULT_LOADING_MESSAGES;

  React.useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setMsgIndex((prev) => (prev + 1) % messages.length);
        setVisible(true);
      }, 300);
    }, 2000);
    return () => clearInterval(interval);
  }, [messages.length]);

  return (
    <div className="py-3 px-1">
      {/* Animated bar */}
      <div className={`h-0.5 w-full rounded-full mb-3 overflow-hidden ${themeMode === "black" ? "bg-white/5" : "bg-neutral-100"}`}>
        <div
          className="h-full rounded-full animate-pulse"
          style={{
            background: "linear-gradient(90deg, #10b981, #6366f1, #f59e0b, #ef4444)",
            backgroundSize: "200% 100%",
            animation: "shimmer 2s linear infinite",
            width: "60%",
          }}
        />
      </div>

      {/* Rotating message */}
      <div
        className={`flex items-center gap-2 text-xs font-medium transition-all duration-300 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"} ${themeMode === "black" ? "text-neutral-400" : "text-neutral-500"}`}
      >
        <span>{messages[msgIndex]}</span>
      </div>

      {/* Subtle pulsing dots */}
      <div className="flex gap-1 mt-2.5">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`rounded-full ${themeMode === "black" ? "bg-emerald-500/40" : "bg-emerald-400/60"}`}
            style={{
              width: i === 0 ? "20px" : i === 1 ? "8px" : i === 2 ? "5px" : "3px",
              height: "3px",
              animation: `pulse 1.5s ease-in-out ${i * 0.15}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
};

const parseThoughtAndContent = (text: string): { thought: string; content: string } => {
  if (!text) return { thought: "", content: "" };

  // 1. Tagged thought blocks (<thought>, <think>)
  for (const [open, close, offset] of [["<thought>", "</thought>", 9], ["<think>", "</think>", 7]] as [string, string, number][]) {
    const start = text.indexOf(open);
    if (start !== -1) {
      const end = text.indexOf(close);
      if (end !== -1) {
        const thought = text.substring(start + offset, end).trim();
        const content = (text.substring(0, start) + text.substring(end + offset + 1)).trim();
        return { thought, content };
      } else {
        return { thought: text.substring(start + offset).trim(), content: text.substring(0, start).trim() };
      }
    }
  }

  // 2. Aggressive untagged thinking detection
  // These patterns match ANY internal monologue that leaks before the actual answer
  const THINKING_STARTERS = [
    /^(We have a user request[\s\S]*?)(?=\n\n|\n[A-Z*#]|$)/i,
    /^(The user (is asking|said|wants|asked)[\s\S]*?)(?=\n\n|\n[A-Z*#]|$)/i,
    /^(User (is asking|said|wants|asked)[\s\S]*?)(?=\n\n|\n[A-Z*#]|$)/i,
    /^(Okay,?\s+let['']s\s+see[\s\S]*?)(?=\n\n|\n[A-Z*#]|$)/i,
    /^(Okay,?\s+(I need|the user)[\s\S]*?)(?=\n\n|\n[A-Z*#]|$)/i,
    /^(First,?\s+I\s+need[\s\S]*?)(?=\n\n|\n[A-Z*#]|$)/i,
    /^(Let\s+me\s+(think|analyze|consider|check)[\s\S]*?)(?=\n\n|\n[A-Z*#]|$)/i,
    /^(I\s+need\s+to\s+(adhere|follow|check|respond|provide)[\s\S]*?)(?=\n\n|\n[A-Z*#]|$)/i,
    /^(As\s+(a specialist|the AI|Kacha Morich)[\s\S]*?)(?=\n\n|\n[A-Z*#]|$)/i,
    /^(Since\s+the\s+user[\s\S]*?)(?=\n\n|\n[A-Z*#]|$)/i,
    /^(Need\s+to\s+respond[\s\S]*?)(?=\n\n|\n[A-Z*#]|$)/i,
    /^(They\s+(provided|want|need|asked)[\s\S]*?)(?=\n\n|\n[A-Z*#]|$)/i,
    /^(Also\s+(adhere|follow|check)[\s\S]*?)(?=\n\n|\n[A-Z*#]|$)/i,
    /^(Wait,[\s\S]*?)(?=\n\n|\n[A-Z*#]|$)/i,
    /^(Hmm,[\s\S]*?)(?=\n\n|\n[A-Z*#]|$)/i,
  ];

  for (const pattern of THINKING_STARTERS) {
    const match = text.match(pattern);
    if (match && match[1] && match[1].length > 20) {
      const thought = match[1].trim();
      const remaining = text.substring(match[1].length).trim();
      if (remaining.length > 5) {
        return { thought, content: remaining };
      }
      // If no content after thinking, hide the thinking and show empty
      return { thought, content: "" };
    }
  }

  // 3. Multi-paragraph thinking: if first paragraph looks like internal monologue
  // and second paragraph is the actual answer
  const paragraphs = text.split(/\n\n+/);
  if (paragraphs.length >= 2) {
    const firstPara = paragraphs[0].trim();
    const thinkingIndicators = [
      /\buser (is asking|said|wants|asked)\b/i,
      /\bneed to respond\b/i,
      /\bwe (have|must|should|need)\b/i,
      /\bprobably respond\b/i,
      /\bkeep (it |this )?(brief|short|concise)\b/i,
      /\bself.?check\b/i,
      /\bfinal output\b/i,
    ];
    const isThinkingParagraph = thinkingIndicators.some(p => p.test(firstPara));
    if (isThinkingParagraph && firstPara.length > 30) {
      return {
        thought: firstPara,
        content: paragraphs.slice(1).join("\n\n").trim(),
      };
    }
  }

  return { thought: "", content: text };
};

// --- CLAUDE-STYLE DOCUMENT ARTIFACTS ---
const parseMarkdownForPDF = (markdown: string): string => {
  let lines = markdown.split("\n");
  let inTable = false;
  let tableHeaderParsed = false;
  let tableRows: string[][] = [];
  let tableHeaders: string[] = [];

  let resultHtml: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();

    // Detect Table Row
    if (line.startsWith("|") && line.endsWith("|")) {
      inTable = true;
      let cells = line.split("|").map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);

      // Check if this is a separator line (e.g. |:---|:---|)
      const isSeparator = cells.every(c => c.startsWith(":") || c.endsWith(":") || /^-+$/.test(c) || c === "");
      if (isSeparator) {
        continue; // skip separator row
      }

      if (!tableHeaderParsed) {
        tableHeaders = cells;
        tableHeaderParsed = true;
      } else {
        tableRows.push(cells);
      }
      continue;
    } else {
      // If we were in a table and the table ended
      if (inTable) {
        let tableHtml = `<table style="width:100%; border-collapse:collapse; margin:20px 0; font-size:13px; border:1px solid rgba(0,0,0,0.08); border-radius:8px; overflow:hidden; font-family:'Segoe UI',sans-serif; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">`;
        // Headers
        tableHtml += `<thead style="background:#E11D48; color:white;"><tr>`;
        tableHeaders.forEach(h => {
          tableHtml += `<th style="padding:10px 14px; border-bottom:2px solid #E11D48; text-align:left; font-weight:bold; font-size:12px; letter-spacing:0.5px; text-transform:uppercase; white-space:nowrap;">${h}</th>`;
        });
        tableHtml += `</tr></thead><tbody>`;
        // Rows
        tableRows.forEach((row, rIdx) => {
          const bg = rIdx % 2 === 0 ? '#ffffff' : '#f8fafc';
          tableHtml += `<tr style="background:${bg}; border-bottom:1px solid #f1f5f9;">`;
          row.forEach(cell => {
            tableHtml += `<td style="padding:10px 14px; text-align:left; color:#334155;">${cell}</td>`;
          });
          tableHtml += `</tr>`;
        });
        tableHtml += `</tbody></table>`;
        resultHtml.push(tableHtml);

        // Reset table state
        inTable = false;
        tableHeaderParsed = false;
        tableHeaders = [];
        tableRows = [];
      }
      resultHtml.push(lines[i]);
    }
  }

  // If the file ends while still in a table
  if (inTable) {
    let tableHtml = `<table style="width:100%; border-collapse:collapse; margin:20px 0; font-size:13px; border:1px solid rgba(0,0,0,0.08); border-radius:8px; overflow:hidden; font-family:'Segoe UI',sans-serif; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">`;
    tableHtml += `<thead style="background:#E11D48; color:white;"><tr>`;
    tableHeaders.forEach(h => {
      tableHtml += `<th style="padding:10px 14px; border-bottom:2px solid #E11D48; text-align:left; font-weight:bold; font-size:12px; letter-spacing:0.5px; text-transform:uppercase; white-space:nowrap;">${h}</th>`;
    });
    tableHtml += `</tr></thead><tbody>`;
    tableRows.forEach((row, rIdx) => {
      const bg = rIdx % 2 === 0 ? '#ffffff' : '#f8fafc';
      tableHtml += `<tr style="background:${bg}; border-bottom:1px solid #f1f5f9;">`;
      row.forEach(cell => {
        tableHtml += `<td style="padding:10px 14px; text-align:left; color:#334155;">${cell}</td>`;
      });
      tableHtml += `</tr>`;
    });
    tableHtml += `</tbody></table>`;
    resultHtml.push(tableHtml);
  }

  // Rejoin and parse markdown elements
  let html = resultHtml.join("\n");

  // Mermaid code blocks
  html = html.replace(/```mermaid([\s\S]*?)```/g, (_, code) => {
    return `<div class="mermaid" style="display:flex; justify-content:center; margin: 30px 0; background:#fcfcfc; padding:20px; border-radius:12px; border: 1px solid #eee;">${code.trim()}</div>`;
  });
  html = html.replace(/```flowchart([\s\S]*?)```/g, (_, code) => {
    return `<div class="mermaid" style="display:flex; justify-content:center; margin: 30px 0; background:#fcfcfc; padding:20px; border-radius:12px; border: 1px solid #eee;">${code.trim()}</div>`;
  });

  // Standard code blocks
  html = html.replace(/```([\s\S]*?)```/g, (_, code) => {
    return `<pre style="background:#f4f4f4; padding:15px; border-radius:8px; overflow-x:auto; font-family:monospace; border:1px solid #e3e3e3;"><code>${code.trim()}</code></pre>`;
  });

  // Formatting headers, inline styles
  html = html
    .replace(/^### (.*$)/gim, '<h3 style="color:#0f172a;font-family:\'Segoe UI\',sans-serif;margin-top:25px;font-weight:bold;font-size:18px;">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 style="color:#E11D48;font-family:\'Segoe UI\',sans-serif;margin-top:30px;border-bottom:2px solid #E11D48;padding-bottom:5px;font-weight:bold;font-size:22px;">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 style="color:#E11D48;font-family:\'Segoe UI\',sans-serif;margin-top:35px;border-bottom:3px solid #E11D48;padding-bottom:10px;font-weight:extrabold;font-size:28px;">$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code style="background:#f4f4f4;padding:2px 4px;border-radius:4px;font-family:monospace;">$1</code>')
    .replace(/\n/g, '<br/>');

  return html;
};

const PDFArtifactCard = ({ content }: { content: string }) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      // Dynamic import to avoid SSR issues
      const jsPDF = (await import('jspdf')).default;
      const html2canvas = (await import('html2canvas')).default;

      // Create a temporary container for rendering
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.width = '210mm'; // A4 width
      tempContainer.style.padding = '20mm';
      tempContainer.style.backgroundColor = '#ffffff';
      tempContainer.style.fontFamily = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
      tempContainer.style.color = '#333';
      tempContainer.style.lineHeight = '1.6';

      const html = parseMarkdownForPDF(content);

      tempContainer.innerHTML = `
        <div style="text-align:center;margin-bottom:30px;border-bottom:2px solid #E11D48;padding-bottom:10px;">
          <h2 style="margin:0;color:#E11D48;font-size:24px;">🌶️ KACHA MORICH AI</h2>
          <p style="margin:5px 0 0 0;font-size:12px;color:#666;text-transform:uppercase;letter-spacing:1px;">Generated Business Artifact</p>
        </div>
        <div>${html}</div>
      `;

      document.body.appendChild(tempContainer);

      // Wait for any images to load
      const images = tempContainer.getElementsByTagName('img');
      await Promise.all(
        Array.from(images).map(img => {
          if (img.complete) return Promise.resolve();
          return new Promise(resolve => {
            img.onload = resolve;
            img.onerror = resolve;
          });
        })
      );

      // Generate canvas from HTML
      const canvas = await html2canvas(tempContainer, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      // Remove temporary container
      document.body.removeChild(tempContainer);

      // Create PDF
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/png');

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add new pages if content is longer than one page
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Save the PDF
      pdf.save(`kacha_morich_report_${Date.now()}.pdf`);
    } catch (error) {
      console.error('PDF generation error:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="my-5 border border-red-500/10 rounded-2xl bg-gradient-to-r from-red-950/15 via-[#0A0A0A] to-[#0A0A0A] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl backdrop-blur-md">
      <div className="flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
          <FileText size={22} />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-neutral-100">PDF Report Document</span>
          <span className="text-xs text-neutral-500 mt-0.5">Enterprise-Grade Intelligence Report</span>
        </div>
      </div>
      <button
        type="button"
        onClick={handleDownload}
        disabled={isGenerating}
        className="self-start sm:self-center px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 disabled:bg-red-500/50 disabled:cursor-not-allowed text-neutral-950 text-xs font-black tracking-widest uppercase transition-all duration-300 shadow-lg shadow-red-500/10 hover:shadow-red-500/30 hover:scale-[1.02] active:scale-95 disabled:scale-100 flex items-center gap-2"
      >
        {isGenerating ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            Generating...
          </>
        ) : (
          <>
            📥 Download PDF
          </>
        )}
      </button>
    </div>
  );
};

const WordArtifactCard = ({ content }: { content: string }) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = () => {
    setIsGenerating(true);
    try {
      const html = parseMarkdownForPDF(content);

      const wordContent = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
          <head>
            <meta charset="utf-8">
            <title>Kacha Morich AI Report</title>
            <style>
              body { font-family: 'Segoe UI', Calibri, sans-serif; font-size: 11pt; line-height: 1.6; }
              h1 { color: #E11D48; font-size: 24pt; font-weight: bold; }
              h2 { color: #E11D48; font-size: 18pt; font-weight: bold; }
              h3 { color: #0f172a; font-size: 14pt; font-weight: bold; }
              table { border-collapse: collapse; width: 100%; margin: 20px 0; }
              th { background-color: #E11D48; color: white; padding: 10px; text-align: left; font-weight: bold; }
              td { border: 1px solid #ddd; padding: 10px; }
              tr:nth-child(even) { background-color: #f8fafc; }
              code { background-color: #f4f4f4; padding: 2px 4px; font-family: 'Courier New', monospace; }
              pre { background-color: #f4f4f4; padding: 15px; border-radius: 5px; overflow-x: auto; }
            </style>
          </head>
          <body>
            <div style="text-align:center;margin-bottom:30px;border-bottom:2px solid #E11D48;padding-bottom:10px;">
              <h2 style="margin:0;color:#E11D48;">🌶️ KACHA MORICH AI</h2>
              <p style="margin:5px 0 0 0;font-size:10pt;color:#666;text-transform:uppercase;letter-spacing:1px;">Generated Business Artifact</p>
            </div>
            <div>${html}</div>
          </body>
        </html>
      `;

      const blob = new Blob(['\ufeff' + wordContent], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kacha_morich_artifact_${Date.now()}.doc`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Word generation error:', error);
      alert('Failed to generate Word document. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="my-5 border border-blue-500/10 rounded-2xl bg-gradient-to-r from-blue-950/15 via-[#0A0A0A] to-[#0A0A0A] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl backdrop-blur-md">
      <div className="flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
          <Briefcase size={22} />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-neutral-100">Microsoft Word Document</span>
          <span className="text-xs text-neutral-500 mt-0.5">Editable Advisory Report (.doc)</span>
        </div>
      </div>
      <button
        type="button"
        onClick={handleDownload}
        disabled={isGenerating}
        className="self-start sm:self-center px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 disabled:cursor-not-allowed text-neutral-950 text-xs font-black tracking-widest uppercase transition-all duration-300 shadow-lg shadow-blue-500/10 hover:shadow-blue-500/30 hover:scale-[1.02] active:scale-95 disabled:scale-100 flex items-center gap-2"
      >
        {isGenerating ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            Generating...
          </>
        ) : (
          <>
            📥 Download Word
          </>
        )}
      </button>
    </div>
  );
};

const ExcelArtifactCard = ({ content }: { content: string }) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = () => {
    setIsGenerating(true);
    try {
      const lines = content.split('\n');
      let csvContent = "";

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('|')) {
          // Skip separator lines
          if (line.includes('---')) continue;

          // Parse table rows
          const cells = line.split('|').map(c => c.trim()).filter((c, idx, arr) => idx > 0 && idx < arr.length - 1);
          const csvRow = cells.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',');
          csvContent += csvRow + '\r\n';
        } else if (line.includes(',')) {
          // Already CSV format
          csvContent += line + '\r\n';
        }
      }

      // If no table or CSV data found, convert the entire content
      if (!csvContent) {
        csvContent = `"${content.replace(/"/g, '""')}"`;
      }

      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kacha_morich_data_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Excel generation error:', error);
      alert('Failed to generate Excel file. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="my-5 border border-emerald-500/10 rounded-2xl bg-gradient-to-r from-emerald-950/15 via-[#0A0A0A] to-[#0A0A0A] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl backdrop-blur-md">
      <div className="flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
          <DollarSign size={22} />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-neutral-100">Excel Spreadsheet (.csv)</span>
          <span className="text-xs text-neutral-500 mt-0.5">Tabular Data & Financial Models</span>
        </div>
      </div>
      <button
        type="button"
        onClick={handleDownload}
        disabled={isGenerating}
        className="self-start sm:self-center px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 disabled:cursor-not-allowed text-neutral-950 text-xs font-black tracking-widest uppercase transition-all duration-300 shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/30 hover:scale-[1.02] active:scale-95 disabled:scale-100 flex items-center gap-2"
      >
        {isGenerating ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            Generating...
          </>
        ) : (
          <>
            📥 Download Excel
          </>
        )}
      </button>
    </div>
  );
};

interface CustomAgent {
  id: string;
  name: string;
  banglaName: string;
  banglaDesc: string;
  icon: string;
  instructions: string;
  isCustom?: boolean;
}

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
    id: "general-purpose-agent",
    name: "General Purpose AI",
    banglaName: "General Purpose AI",
    desc: "Versatile AI for writing, coding, translation, Q&A, math, research — anything",
    banglaDesc: "Versatile AI for writing, coding, translation, Q&A, math, research — anything",
    icon: Sparkles,
    placeholder: "Ask me anything — write, code, translate, explain, summarize...",
    suggestions: [
      "Write a professional email declining a meeting request.",
      "Explain quantum computing in simple terms.",
      "Translate this to Bangla: 'The early bird catches the worm'",
      "Write a Python function to sort a list of dictionaries by a key."
    ]
  },
  {
    id: "devmind-agent",
    name: "DevMind — Senior Engineer",
    banglaName: "DevMind — Senior Engineer",
    desc: "Production-ready code, architecture design, debugging, security audits & tech stack decisions",
    banglaDesc: "Production-ready code, architecture design, debugging, security audits & tech stack decisions",
    icon: Code,
    placeholder: "Paste your code, describe your architecture, or ask any engineering question...",
    suggestions: [
      "Review this code for security vulnerabilities and performance issues.",
      "Design a scalable system architecture for a multi-tenant SaaS app.",
      "Debug this error and explain the root cause with a fix.",
      "What's the best tech stack for building a real-time collaborative app in 2026?"
    ]
  },
  {
    id: "daily-innovation-idea-agent",
    name: "Daily Innovation Idea Agent",
    banglaName: "Daily Innovation Idea Agent",
    desc: "Provides 4-5 fresh business, tech, and income generation ideas daily",
    banglaDesc: "Provides 4-5 fresh business, tech, and income generation ideas daily",
    icon: Lightbulb,
    placeholder: "Which sector or target country are you looking to generate business ideas for today?",
    suggestions: [
      "Give me 4-5 fresh business ideas that will perform well in 2026.",
      "SaaS or tech startup ideas with low starting capital for UK market."
    ]
  },
  {
    id: "personal-cfo-finance-agent",
    name: "CFO & Business Finance Agent",
    banglaName: "CFO & Business Finance Agent",
    desc: "Business budgeting, runway calculations, tax strategy & cost audits",
    banglaDesc: "Business budgeting, runway calculations, tax strategy & cost audits",
    icon: DollarSign,
    placeholder: "Describe your current business finances, overhead expenses, or investment goals...",
    suggestions: [
      "What are the key tax filing and VAT guidelines for starting a new business?",
      "How to optimize operational cash flow for a local retail shop?"
    ]
  },
  {
    id: "research-agent",
    name: "Market Research & SWOT Agent",
    banglaName: "Market Research & SWOT Agent",
    desc: "Deep industry reports, SWOT analyses, and TAM/SAM/SOM sizing",
    banglaDesc: "Deep industry reports, SWOT analyses, and TAM/SAM/SOM sizing",
    icon: Search,
    placeholder: "What industry, niche, or product do you need a comprehensive research and SWOT report on?",
    suggestions: [
      "Research the current size and key competitors in the ride-sharing market.",
      "Deep market analysis of organic cosmetic demand in Germany."
    ]
  },
  {
    id: "competitor-spy-agent",
    name: "Competitor Intelligence Agent",
    banglaName: "Competitor Intelligence Agent",
    desc: "Audits competitor websites, pricing models, and marketing weaknesses",
    banglaDesc: "Audits competitor websites, pricing models, and marketing weaknesses",
    icon: Eye,
    placeholder: "Paste competitor website URLs or names to analyze their positioning and pricing model...",
    suggestions: [
      "Audit my competitor's website to find their key weaknesses.",
      "How do I reverse-engineer a competitor's pricing structure?"
    ]
  },
  {
    id: "project-manager-agent",
    name: "Agile Project & Product Manager",
    banglaName: "Agile Project & Product Manager",
    desc: "Agile sprints, Work Breakdown Structure (WBS), milestones & roadmap planner",
    banglaDesc: "Agile sprints, Work Breakdown Structure (WBS), milestones & roadmap planner",
    icon: FileText,
    placeholder: "What project, product, or application features do you want to plan and break down today?",
    suggestions: [
      "Create a 4-week Scrum sprint plan and task breakdown for an e-commerce website.",
      "Break down the WBS and MoSCoW priorities for building a mobile SaaS app."
    ]
  },
  {
    id: "code-helper-developer-agent",
    name: "CTO & Technical Architect",
    banglaName: "CTO & Technical Architect",
    desc: "Technical architecture design, secure optimized code, and CTO advisory",
    banglaDesc: "Technical architecture design, secure optimized code, and CTO advisory",
    icon: Code,
    placeholder: "Paste code to optimize, or describe the technical architecture/database design you need...",
    suggestions: [
      "Design a scalable PostgreSQL database schema for a multi-tenant SaaS application.",
      "Write a secure and optimized Next.js API route for handling subscription payments."
    ]
  },
  {
    id: "sales-lead-generator",
    name: "Sales & Lead Generation Agent",
    banglaName: "Sales & Lead Generation Agent",
    desc: "Find prospective customers, map channels, and write cold sequences",
    banglaDesc: "Find prospective customers, map channels, and write cold sequences",
    icon: Target,
    placeholder: "Describe your product/service and who your primary target buyers are...",
    suggestions: [
      "Write a high-converting cold email sequence for an e-commerce brand.",
      "What are the best channels to find corporate leads for a B2B SaaS?"
    ]
  },
  {
    id: "content-creator-agent",
    name: "Marketing & Content Creator Agent",
    banglaName: "Marketing & Content Creator Agent",
    desc: "Engineering viral marketing copy, script hooks & StoryBrand campaigns",
    banglaDesc: "Engineering viral marketing copy, script hooks & StoryBrand campaigns",
    icon: Video,
    placeholder: "What is your product niche, target audience, and preferred campaign format?",
    suggestions: [
      "Give me 3 TikTok hooks and a video script for a new AI technology product.",
      "Viral YouTube script outlines for a personal finance channel."
    ]
  },
  {
    id: "social-media-manager",
    name: "Social Media Brand Manager",
    banglaName: "Social Media Brand Manager",
    desc: "Multi-platform calendars, SEO captions, and post direction",
    banglaDesc: "Multi-platform calendars, SEO captions, and post direction",
    icon: Share2,
    placeholder: "Which brand are you managing, and for which platform (LinkedIn, FB, IG) do you need posts?",
    suggestions: [
      "Provide a 1-week LinkedIn content calendar with captions for a digital agency.",
      "Instagram reel calendar with caption hooks for a fitness brand."
    ]
  },
  {
    id: "legal-compliance-agent",
    name: "Legal & Compliance Agent",
    banglaName: "Legal & Compliance Agent",
    desc: "Contracts drafting, terms audit, and local compliance regulation checks",
    banglaDesc: "Contracts drafting, terms audit, and local compliance regulation checks",
    icon: ShieldCheck,
    placeholder: "Paste terms to review, or describe the contract/document you need drafted...",
    suggestions: [
      "Draft a standard, comprehensive mutual NDA (Non-Disclosure Agreement).",
      "Audit these contract terms and highlight potential liabilities or risks."
    ]
  },
  {
    id: "hr-recruiting-agent",
    name: "HR & Talent Acquisition Agent",
    banglaName: "HR & Talent Acquisition Agent",
    desc: "Writes Job Descriptions (JD), prepares competency STAR questions & onboarding",
    banglaDesc: "Writes Job Descriptions (JD), prepares competency STAR questions & onboarding",
    icon: GraduationCap,
    placeholder: "What role are you hiring for, and what are the key requirements?",
    suggestions: [
      "Write a Job Description (JD) and KPIs for a Senior Full-Stack Engineer.",
      "Generate 5 STAR-method interview questions to assess problem-solving skills."
    ]
  },
  {
    id: "investor-pitch-agent",
    name: "Investor Pitch & Fundraising Agent",
    banglaName: "Investor Pitch & Fundraising Agent",
    desc: "Guy Kawasaki pitch decks, VC fundraising & startup valuations",
    banglaDesc: "Guy Kawasaki pitch decks, VC fundraising & startup valuations",
    icon: Briefcase,
    placeholder: "Describe your startup, business model, and target funding round...",
    suggestions: [
      "Draft a 10-slide outline for a Pre-Seed investor pitch deck.",
      "How to justify a $5M valuation multiple for a B2B SaaS startup?"
    ]
  },
  {
    id: "performance-marketer-agent",
    name: "Performance & Digital Marketer",
    banglaName: "Performance & Digital Marketer",
    desc: "Paid Ads (Facebook/Google), SEO, CRO, and ROAS optimization strategies",
    banglaDesc: "Paid Ads (Facebook/Google), SEO, CRO, and ROAS optimization strategies",
    icon: TrendingUp,
    placeholder: "Describe your current marketing budget, active ad channels, or SEO goals...",
    suggestions: [
      "How can I lower my Customer Acquisition Cost (CAC) on Facebook Ads?",
      "Audit my e-commerce funnel and suggest Conversion Rate Optimization (CRO) strategies."
    ]
  },
  {
    id: "it-automation-consultant",
    name: "IT Strategy & Automation Consultant",
    banglaName: "IT Strategy & Automation Consultant",
    desc: "SaaS tool selection, No-Code workflows, Zapier integrations & tech stack audits",
    banglaDesc: "SaaS tool selection, No-Code workflows, Zapier integrations & tech stack audits",
    icon: Settings,
    placeholder: "What manual business processes are slowing you down, or what systems are you using?",
    suggestions: [
      "Suggest a low-cost tech stack (CRM, Email, Billing) for a new consulting business.",
      "How do I automate lead capture from Facebook Ads directly to my HubSpot CRM?"
    ]
  },
  {
    id: "pain-point-scraper-agent",
    name: "Pain-Point Scraper & Problem Finder",
    banglaName: "Pain-Point Scraper & Problem Finder",
    desc: "Scrapes web forums and reviews to find real customer complaints and unmet market needs",
    banglaDesc: "Scrapes web forums and reviews to find real customer complaints and unmet market needs",
    icon: MessageSquare,
    placeholder: "What industry, product, or niche do you want to scrape for customer complaints?",
    suggestions: [
      "Find out what people are complaining about most regarding modern dating apps.",
      "What are the biggest frustrations small business owners have with their accounting software?"
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
  { id: "unfiltered-savage", name: "Unfiltered & Savage", icon: "💀", prompt: "You are in FULLY UNFILTERED mode. Zero censorship, zero political correctness, zero sugarcoating. Be savage, raw, and brutally aggressive in your delivery. Speak like a battle-hardened street-smart advisor who has zero patience for weakness or bullshit. Use strong language freely. Destroy bad ideas mercilessly. Call out stupidity directly. No diplomatic softening, no hedging, no 'on the other hand' — just raw, unfiltered, aggressive truth delivered like a sledgehammer. If something is wrong, say it's wrong and why, loudly. If something is right, say it's right and push harder. This is the no-holds-barred, uncensored version of the truth. The user has explicitly requested this mode — give them exactly what they asked for." },
];

// Fallback models shown before dynamic list loads
// NOTE: Thinking models (DeepSeek R1, Qwen3) excluded — they show internal reasoning text
const FALLBACK_MODELS = [
  { id: "meta-llama/llama-3.3-70b-instruct:free", name: "Llama 3.3 70B", icon: "🦙", badge: "Free", isFree: true },
  { id: "google/gemma-3-27b-it:free", name: "Google Gemma 27B", icon: "💎", badge: "Free", isFree: true },
  { id: "mistralai/mistral-7b-instruct:free", name: "Mistral 7B", icon: "🌊", badge: "Free", isFree: true },
  { id: "microsoft/phi-4-reasoning-plus:free", name: "Phi-4 Reasoning", icon: "🧠", badge: "Free", isFree: true },
  { id: "nousresearch/hermes-3-llama-3.1-405b:free", name: "Hermes 3 405B", icon: "🧠", badge: "Max Power", isFree: true },
  { id: "google/gemini-2.5-flash-preview", name: "Gemini 2.5 Flash", icon: "💎", badge: "Fast", isFree: false },
];

// Categorized model list for the dropdown
const CATEGORIZED_MODELS = [
  {
    category: "🚀 Fast & Free",
    desc: "Best for quick answers, greetings, simple tasks",
    color: "emerald",
    models: [
      { id: "meta-llama/llama-3.3-70b-instruct:free", name: "Llama 3.3 70B", provider: "Meta", badge: "Recommended", isFree: true },
      { id: "mistralai/mistral-7b-instruct:free", name: "Mistral 7B", provider: "Mistral", badge: "Lightweight", isFree: true },
      { id: "google/gemma-3-27b-it:free", name: "Gemma 3 27B", provider: "Google", badge: "Balanced", isFree: true },
    ],
  },
  {
    category: "🧠 Powerful & Free",
    desc: "Best for deep analysis, strategy, complex tasks",
    color: "violet",
    models: [
      { id: "nousresearch/hermes-3-llama-3.1-405b:free", name: "Hermes 3 405B", provider: "NousResearch", badge: "Max Power", isFree: true },
      { id: "microsoft/phi-4-reasoning-plus:free", name: "Phi-4 Reasoning+", provider: "Microsoft", badge: "Analytical", isFree: true },
      { id: "meta-llama/llama-3.1-70b-instruct:free", name: "Llama 3.1 70B", provider: "Meta", badge: "Stable", isFree: true },
    ],
  },
  {
    category: "⚡ Reasoning Models",
    desc: "Shows thinking process — best used with Brain Trust",
    color: "amber",
    models: [
      { id: "deepseek/deepseek-r1-0528:free", name: "DeepSeek R1", provider: "DeepSeek", badge: "Thinking", isFree: true },
      { id: "deepseek/deepseek-r1:free", name: "DeepSeek R1 (Base)", provider: "DeepSeek", badge: "Thinking", isFree: true },
    ],
  },
  {
    category: "💎 Premium",
    desc: "Paid models — fastest and most capable",
    color: "blue",
    models: [
      { id: "google/gemini-2.5-flash-preview", name: "Gemini 2.5 Flash", provider: "Google", badge: "Fast", isFree: false },
      { id: "google/gemini-2.5-pro-preview", name: "Gemini 2.5 Pro", provider: "Google", badge: "Most Capable", isFree: false },
      { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet", provider: "Anthropic", badge: "Best Writing", isFree: false },
      { id: "openai/gpt-4o-mini", name: "GPT-4o Mini", provider: "OpenAI", badge: "Efficient", isFree: false },
    ],
  },
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
  const [isHydrated, setIsHydrated] = useState(false);
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
  const [isSidebarFolded, setIsSidebarFolded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(true);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("daily-innovation-idea-agent");
  const [agentDropdownOpen, setAgentDropdownOpen] = useState(false);

  const [selectedToneId, setSelectedToneId] = useState<string>("brutally-honest");
  const [toneDropdownOpen, setToneDropdownOpen] = useState(false);

  const [controlBarVisible, setControlBarVisible] = useState(true);
  const [headerVisible, setHeaderVisible] = useState(true);

  const [selectedModelId, setSelectedModelId] = useState<string>("google/gemma-4-31b-it");
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);

  // Dynamic model list from OpenRouter
  const [modelsList, setModelsList] = useState<any[]>(FALLBACK_MODELS);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsSearch, setModelsSearch] = useState("");
  const [showFreeOnly, setShowFreeOnly] = useState(false);

  // Multi-Agent Brain Trust State
  const [isBrainTrust, setIsBrainTrust] = useState(false);
  const [boardSize, setBoardSize] = useState<number>(16);

  // Auto-routing — AI automatically selects the best agent based on message content
  const [enableAutoRouting, setEnableAutoRouting] = useState(false);

  // Smart Suggestions — context-aware follow-up questions after each response
  const [smartSuggestions, setSmartSuggestions] = useState<string[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  // Chat search in sidebar
  const [chatSearch, setChatSearch] = useState("");

  // Message edit & regenerate
  const [editingMessageIndex, setEditingMessageIndex] = useState<number | null>(null);
  const [editingMessageText, setEditingMessageText] = useState("");

  // Message quality ratings
  const [messageRatings, setMessageRatings] = useState<Record<number, "up" | "down">>({});

  // Adaptive UI — personalized based on user behavior
  const [adaptiveProfile, setAdaptiveProfile] = useState<{
    topAgents: Array<{ agentId: string; useCount: number }>;
    preferredTone: string;
    complexityLevel: string;
  } | null>(null);

  // Theme Mode State: "black" (dark) or "light" (clean light)
  const [themeMode, setThemeMode] = useState<"black" | "light">("black");

  // Set hydration flag on mount
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Custom Pull-to-Refresh Gesture State for Nested Scrolls
  const [pullStartY, setPullStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);

  // Custom Agent Builder States
  const [customAgents, setCustomAgents] = useState<CustomAgent[]>([]);
  const [customAgentModalOpen, setCustomAgentModalOpen] = useState(false);
  const [pdfAgentModalOpen, setPdfAgentModalOpen] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [newPdfAgentName, setNewPdfAgentName] = useState("");
  const [isGeneratingPdfName, setIsGeneratingPdfName] = useState(false);

  // API key notification banner
  const [apiBanner, setApiBanner] = useState<BannerType | null>(null);
  const [apiBannerMessage, setApiBannerMessage] = useState<string>("");

  const [newAgentName, setNewAgentName] = useState("");
  const [newAgentBanglaName, setNewAgentBanglaName] = useState("");
  const [newAgentBanglaDesc, setNewAgentBanglaDesc] = useState("");
  const [newAgentInstructions, setNewAgentInstructions] = useState("");
  const [newAgentIcon, setNewAgentIcon] = useState("🚀");

  // Advanced Auto-Generation States
  const [agentConceptPrompt, setAgentConceptPrompt] = useState("");
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [isGeneratingField, setIsGeneratingField] = useState<string | null>(null);

  // Computed all agents combined list (static + custom)
  const allAgents = [
    ...AGENTS_LIST.map(a => ({
      ...a,
      isCustom: false,
      customIcon: undefined as string | undefined,
      instructions: undefined as string | undefined
    })),
    ...customAgents.map(ca => ({
      id: ca.id,
      name: ca.name,
      banglaName: ca.banglaName,
      desc: ca.banglaDesc,
      banglaDesc: ca.banglaDesc,
      icon: null as any,
      placeholder: "How can this specialized custom agent help you today?",
      suggestions: [] as any[], // always empty — prompts are generated dynamically
      isCustom: true,
      customIcon: ca.icon,
      instructions: ca.instructions
    }))
  ];

  // Auto-generate prompts when switching to a custom agent with no cached suggestions
  useEffect(() => {
    const activeAgent = allAgents.find((a) => a.id === selectedAgentId);
    if (
      activeAgent?.isCustom &&
      !customSuggestions[selectedAgentId] &&
      !isGeneratingPrompts
    ) {
      generatePromptsForAgent(selectedAgentId, allAgents);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAgentId, customAgents]);

  // Robust Hydrated Persistence Engine
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTone = localStorage.getItem("kacha_selected_tone");
      const savedAgent = localStorage.getItem("kacha_selected_agent");
      const savedModel = localStorage.getItem("kacha_selected_model");
      const savedBrainTrust = localStorage.getItem("kacha_is_braintrust");
      const savedSidebarFolded = localStorage.getItem("kacha_sidebar_folded");
      const savedTheme = localStorage.getItem("kacha_selected_theme") as "black" | "light";
      const savedCustomAgents = localStorage.getItem("kacha_custom_agents");

      // Step 1: Load from localStorage immediately (instant UI)
      if (savedCustomAgents) {
        try {
          const parsed = JSON.parse(savedCustomAgents);
          // Strip instructions from any previously saved agents (migration fix)
          setCustomAgents(parsed.map(({ instructions: _i, ...rest }: any) => ({ ...rest, isCustom: true })));
        } catch (e) {
          console.error("Failed to parse custom agents:", e);
        }
      }

      // Step 2: Fetch DB custom agents — merge with localStorage, DB is source of truth
      fetch("/api/agents")
        .then(res => {
          if (!res.ok) {
            // 401 = not logged in yet, 404 = user not in DB yet — keep localStorage data
            console.warn(`[Agents] Fetch returned ${res.status}, keeping localStorage agents`);
            return null;
          }
          return res.json();
        })
        .then(data => {
          if (!data) return; // error case handled above
          if (data.agents && Array.isArray(data.agents) && data.agents.length > 0) {
            // Only overwrite if DB actually has agents — prevents empty-array wipe
            const dbAgents: CustomAgent[] = data.agents.map((a: any) => ({
              id: a.id,
              name: a.name,
              banglaName: a.name,
              banglaDesc: a.description,
              icon: a.icon || "FileText",
              instructions: a.instructions,
              isCustom: true
            }));
            setCustomAgents(dbAgents);
            localStorage.setItem("kacha_custom_agents", JSON.stringify(agentsForStorage(dbAgents)));
          } else if (data.agents && Array.isArray(data.agents) && data.agents.length === 0) {
            // DB returned empty — only clear localStorage if we're confident user is synced
            // Check if localStorage has agents; if so, keep them (DB may not have synced yet)
            const savedCustomAgents = localStorage.getItem("kacha_custom_agents");
            if (!savedCustomAgents || savedCustomAgents === "[]") {
              setCustomAgents([]);
            }
            // else: keep localStorage agents — don't wipe on empty DB response
          }
        })
        .catch((err) => {
          console.error("Failed to fetch agents from DB, keeping localStorage data:", err);
          // On network error, localStorage data is already loaded above — do nothing
        });

      if (savedTone) setSelectedToneId(savedTone);
      if (savedAgent) setSelectedAgentId(savedAgent);

      // Clear stale/thinking model IDs from localStorage
      const THINKING_MODEL_IDS = new Set([
        "deepseek/deepseek-r1-0528:free", "deepseek/deepseek-r1:free",
        "deepseek/deepseek-v4-flash", "deepseek/deepseek-v4-flash:free",
        "qwen/qwen3-8b:free", "qwen/qwen3-8b",
        "google/gemma-4-31b-it", "google/gemma-4-31b-it:free",
        "microsoft/phi-4-reasoning-plus:free",
      ]);
      if (savedModel && !THINKING_MODEL_IDS.has(savedModel)) {
        setSelectedModelId(savedModel);
      } else if (savedModel && THINKING_MODEL_IDS.has(savedModel)) {
        // Reset to safe default and clear localStorage
        const safeDefault = "meta-llama/llama-3.3-70b-instruct:free";
        setSelectedModelId(safeDefault);
        localStorage.setItem("kacha_selected_model", safeDefault);
        console.log(`[ModelGuard] Cleared stale thinking model "${savedModel}" → reset to llama-3.3-70b`);
      }
      if (savedBrainTrust) setIsBrainTrust(savedBrainTrust === "true");
      if (savedSidebarFolded) setIsSidebarFolded(savedSidebarFolded === "true");

      if (savedTheme) {
        setThemeMode(savedTheme);
      } else {
        // Automatic System Light/Dark scheme reader!
        const systemPrefersLight = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches;
        setThemeMode(systemPrefersLight ? "light" : "black");
      }
    }
  }, []);

  // Dynamic HTML & Body Theme Syncer
  useEffect(() => {
    if (typeof window !== "undefined") {
      const root = document.documentElement;
      const body = document.body;
      if (themeMode === "light") {
        root.classList.remove("dark");
        root.classList.add("light");
        body.style.backgroundColor = "#F8FAFC";
        body.style.color = "#0A0A0C";
      } else {
        root.classList.remove("light");
        root.classList.add("dark");
        body.style.backgroundColor = "#050505";
        body.style.color = "#F5F5F7";
      }
    }
  }, [themeMode]);

  const toggleTheme = () => {
    const nextTheme = themeMode === "black" ? "light" : "black";
    setThemeMode(nextTheme);
    localStorage.setItem("kacha_selected_theme", nextTheme);
  };

  const handleSidebarFoldToggle = () => {
    const nextVal = !isSidebarFolded;
    setIsSidebarFolded(nextVal);
    localStorage.setItem("kacha_sidebar_folded", String(nextVal));
  };

  const handleToneChange = (toneId: string) => {
    setSelectedToneId(toneId);
    localStorage.setItem("kacha_selected_tone", toneId);
  };

  // Dynamic prompt suggestions states
  const [customSuggestions, setCustomSuggestions] = useState<Record<string, string[]>>({});
  const [isGeneratingPrompts, setIsGeneratingPrompts] = useState(false);
  const [customPromptText, setCustomPromptText] = useState("");

  // Core generate function — used both manually and auto
  const generatePromptsForAgent = async (agentId: string, agents: typeof allAgents) => {
    const activeAgent = agents.find((a) => a.id === agentId) || agents[0];
    if (!activeAgent) return;

    setIsGeneratingPrompts(true);
    try {
      // If custom agent has no instructions loaded yet (localStorage strips them),
      // fetch fresh from DB to get the actual instructions
      let instructions = activeAgent.isCustom ? (activeAgent.instructions || "").substring(0, 3000) : "";

      if (activeAgent.isCustom && !instructions) {
        try {
          const agentsRes = await fetch("/api/agents");
          if (agentsRes.ok) {
            const agentsData = await agentsRes.json();
            const dbAgent = agentsData.agents?.find((a: any) => a.id === agentId);
            if (dbAgent?.instructions) {
              instructions = dbAgent.instructions.substring(0, 3000);
              // Update local state with instructions so future calls don't need to re-fetch
              setCustomAgents(prev => prev.map(ca =>
                ca.id === agentId ? { ...ca, instructions: dbAgent.instructions } : ca
              ));
            }
          }
        } catch (fetchErr) {
          console.warn("Failed to fetch agent instructions from DB:", fetchErr);
        }
      }

      const response = await fetch(`/api/prompts/generate?t=${Date.now()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          agentId: activeAgent.id,
          agentName: activeAgent.name,
          agentDesc: activeAgent.banglaDesc || (activeAgent as any).desc || "",
          isCustom: activeAgent.isCustom || false,
          instructions,
        })
      });
      if (response.ok) {
        const data = await response.json();
        if (data.suggestions) {
          setCustomSuggestions(prev => ({
            ...prev,
            [agentId]: data.suggestions
          }));
        }
      }
    } catch (err) {
      console.error("Failed to generate custom prompts:", err);
    } finally {
      setIsGeneratingPrompts(false);
    }
  };

  const handleGeneratePrompts = () => generatePromptsForAgent(selectedAgentId, allAgents);

  const handleAddCustomPrompt = () => {
    if (!customPromptText.trim()) return;
    const currentList = customSuggestions[selectedAgentId] ||
      ((allAgents.find((a) => a.id === selectedAgentId) || allAgents[0])?.suggestions || []);

    setCustomSuggestions(prev => ({
      ...prev,
      [selectedAgentId]: [customPromptText.trim(), ...currentList]
    }));
    setCustomPromptText("");
  };

  const handleAgentChange = (agentId: string) => {
    setSelectedAgentId(agentId);
    localStorage.setItem("kacha_selected_agent", agentId);
  };

  const handleGenerateAll = async () => {
    if (!agentConceptPrompt.trim()) return;
    setIsGeneratingAll(true);
    try {
      const res = await fetch("/api/agents/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea: agentConceptPrompt }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.name) setNewAgentName(data.name);
        if (data.banglaName) setNewAgentBanglaName(data.banglaName);
        if (data.banglaDesc) setNewAgentBanglaDesc(data.banglaDesc);
        if (data.icon) setNewAgentIcon(data.icon);
        if (data.instructions) setNewAgentInstructions(data.instructions);
      } else {
        alert("Failed to auto-generate agent details. Please try again.");
      }
    } catch (err) {
      console.error("Auto-generate error:", err);
      alert("An unexpected error occurred. Check the browser console for details.");
    } finally {
      setIsGeneratingAll(false);
    }
  };

  const handleGenerateField = async (field: "name" | "banglaName" | "banglaDesc" | "instructions" | "icon") => {
    if (!agentConceptPrompt.trim()) {
      alert("Please enter a Quick AI Assist Concept first to generate fields!");
      return;
    }
    setIsGeneratingField(field);
    try {
      const res = await fetch("/api/agents/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea: agentConceptPrompt }),
      });
      if (res.ok) {
        const data = await res.json();
        if (field === "name" && data.name) setNewAgentName(data.name);
        if (field === "banglaName" && data.banglaName) setNewAgentBanglaName(data.banglaName);
        if (field === "banglaDesc" && data.banglaDesc) setNewAgentBanglaDesc(data.banglaDesc);
        if (field === "icon" && data.icon) setNewAgentIcon(data.icon);
        if (field === "instructions" && data.instructions) setNewAgentInstructions(data.instructions);
      } else {
        alert(`Failed to auto-generate ${field}. Please try again.`);
      }
    } catch (err) {
      console.error(`Field generation error for ${field}:`, err);
      alert("An unexpected error occurred. Check the browser console for details.");
    } finally {
      setIsGeneratingField(null);
    }
  };

  const handlePdfFileSelect = async (file: File) => {
    setPdfFile(file);

    // Step 1: Smart filename cleaning — strip numbers, edition, year, copy info
    const rawName = file.name.replace(/\.pdf$/i, "");
    const cleanName = rawName
      .replace(/^\d+/g, "")                          // strip leading numbers (e.g. "82050xford" → "xford")
      .replace(/[-_,،]/g, " ")
      .replace(/\b(copy|edition|ed|vol|volume|part|chapter|10th|9th|8th|7th|6th|5th|4th|3rd|2nd|1st|\d{4}|\d+)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim()
      .split(" ")
      .filter(w => w.length > 1)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ") || "Document Expert";

    setNewPdfAgentName(cleanName);
    setIsGeneratingPdfName(true);

    // Step 2: Read PDF content deeply for theme-based name generation
    try {
      let pdfSnippet = "";
      try {
        const { parseAnyFile } = await import("@/lib/fileParser");
        const parsed = await parseAnyFile(file);
        // Take first 1500 chars — enough to understand the book's theme
        pdfSnippet = (parsed as any).text?.slice(0, 1500).replace(/\s+/g, " ").trim() || "";
      } catch {
        // If parsing fails, fall back to filename only
      }

      const ideaForName = pdfSnippet
        ? `A PDF document has been uploaded. Analyze its CONTENT to determine the theme and generate a smart agent name.

File name: "${cleanName}"
Content (first 1500 chars): "${pdfSnippet}"

Based on the ACTUAL CONTENT (not just the filename), identify:
1. What is this document about? (subject/domain)
2. Who is the target audience? (students, doctors, engineers, etc.)
3. What expertise would an AI agent need to answer questions about this?

Generate a smart 2-4 word agent name that reflects the document's THEME and PURPOSE.
Examples: "Clinical Medicine Expert", "Oxford Medicine Advisor", "Surgical Techniques Guide", "Business Strategy Coach"
Return ONLY the name, nothing else.`
        : `File: "${cleanName}". Generate a smart 2-4 word expert agent name based on the filename topic. Return ONLY the name.`;

      const res = await fetch("/api/agents/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea: ideaForName, nameOnly: true }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.name && data.name.trim()) {
          setNewPdfAgentName(data.name.trim());
        }
      }
    } catch {
      // Keep the filename-derived name — already set above
    } finally {
      setIsGeneratingPdfName(false);
    }
  };

  const handleUploadPdfAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfFile || !newPdfAgentName.trim()) return;

    setIsUploadingPdf(true);

    try {
      // Step 1: Extract text CLIENT-SIDE using pdf.js (avoids Vercel 10s timeout)
      let pdfText = "";
      try {
        pdfText = await parseAnyFile(pdfFile);
      } catch (parseErr) {
        console.error("Client-side PDF parse error:", parseErr);
        alert("Failed to read this PDF. Please make sure it's a valid, text-based PDF.");
        setIsUploadingPdf(false);
        return;
      }

      // Strip image base64 data if any (not needed for agent creation)
      pdfText = pdfText.replace(/\[IMAGE_BASE64:[^\]]+\]/g, "").trim();

      if (!pdfText || pdfText.length < 50) {
        alert("Could not extract text from this PDF. It may be a scanned image. Please upload a text-based PDF.");
        setIsUploadingPdf(false);
        return;
      }

      // Step 2: Send extracted text as JSON — server only does LLM call (fast)
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newPdfAgentName.trim(),
          description: "A custom AI agent trained entirely on your uploaded document. It acts as a specialized subject matter expert.",
          pdfText: pdfText.substring(0, 12000), // cap at 12k chars
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        alert(errData.error || "Failed to create agent");
        setIsUploadingPdf(false);
        return;
      }

      const data = await res.json();
      if (data.agent) {
        const newAgent: CustomAgent = {
          id: data.agent.id,
          name: data.agent.name,
          banglaName: data.agent.name,
          banglaDesc: data.agent.description,
          icon: data.agent.icon || "FileText",
          instructions: data.agent.instructions,
          isCustom: true
        };

        const updatedList = [...customAgents, newAgent];
        setCustomAgents(updatedList);
        localStorage.setItem("kacha_custom_agents", JSON.stringify(agentsForStorage(updatedList)));

        setSelectedAgentId(newAgent.id);
        localStorage.setItem("kacha_selected_agent", newAgent.id);

        setPdfFile(null);
        setNewPdfAgentName("");
        setIsGeneratingPdfName(false);
        setPdfAgentModalOpen(false);

        if (messages.length > 0) {
          handleNewChat();
        }
      }
    } catch (err) {
      console.error("PDF upload error:", err);
      alert("An unexpected error occurred. Please try again.");
    } finally {
      setIsUploadingPdf(false);
    }
  };

  const handleCreateCustomAgent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAgentName.trim() || !newAgentBanglaName.trim() || !newAgentInstructions.trim()) return;

    const newAgent: CustomAgent = {
      id: `custom-agent-${Date.now()}`,
      name: newAgentName.trim(),
      banglaName: newAgentBanglaName.trim(),
      banglaDesc: newAgentBanglaDesc.trim() || "Custom Specialist AI Advisor",
      icon: newAgentIcon,
      instructions: newAgentInstructions.trim(),
      isCustom: true
    };

    const updatedList = [...customAgents, newAgent];
    setCustomAgents(updatedList);
    localStorage.setItem("kacha_custom_agents", JSON.stringify(agentsForStorage(updatedList)));

    // Auto-select the newly created custom agent!
    setSelectedAgentId(newAgent.id);
    localStorage.setItem("kacha_selected_agent", newAgent.id);

    // Reset form
    setNewAgentName("");
    setNewAgentBanglaName("");
    setNewAgentBanglaDesc("");
    setNewAgentInstructions("");
    setNewAgentIcon("🚀");

    // Close modal
    setCustomAgentModalOpen(false);

    // Start a new chat for the fresh custom agent!
    if (messages.length > 0) {
      handleNewChat();
    }
  };

  const handleDeleteCustomAgent = async (id: string) => {
    // Optimistically remove from UI immediately
    const updated = customAgents.filter((ca) => ca.id !== id);
    setCustomAgents(updated);
    localStorage.setItem("kacha_custom_agents", JSON.stringify(agentsForStorage(updated)));
    if (selectedAgentId === id) {
      setSelectedAgentId("daily-innovation-idea-agent");
      localStorage.setItem("kacha_selected_agent", "daily-innovation-idea-agent");
    }

    // Delete from DB — only applies to DB-backed agents (UUID ids, not "custom-agent-..." local ones)
    const isDbAgent = !id.startsWith("custom-agent-");
    if (isDbAgent) {
      try {
        await fetch("/api/agents", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
      } catch (err) {
        console.error("Failed to delete agent from DB:", err);
      }
    }
  };

  const handleModelChange = (modelId: string) => {
    setSelectedModelId(modelId);
    localStorage.setItem("kacha_selected_model", modelId);
  };

  const handleBrainTrustToggle = (val: boolean) => {
    setIsBrainTrust(val);
    localStorage.setItem("kacha_is_braintrust", String(val));
  };

  // Custom Touch Event Handlers for Mobile Pull-to-Refresh Gesture
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    if (container.scrollTop === 0 && !isPullRefreshing) {
      setPullStartY(e.touches[0].clientY);
      setPullDistance(0);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (pullStartY === 0 || isPullRefreshing) return;

    const container = e.currentTarget;
    if (container.scrollTop > 0) {
      // Reset if scrolled down
      setPullStartY(0);
      setPullDistance(0);
      return;
    }

    const currentY = e.touches[0].clientY;
    const diff = currentY - pullStartY;

    if (diff > 0) {
      // Capped pull distance with tension resistance factor for native tactile feel
      const distance = Math.min(120, diff * 0.4);
      setPullDistance(distance);

      // Prevent native browser overscroll/refresh gesture so they do not conflict
      if (e.cancelable) {
        e.preventDefault();
      }
    }
  };

  const handleTouchEnd = () => {
    if (pullDistance > 65) {
      setIsPullRefreshing(true);
      setPullDistance(50); // Set to active loader position

      // Perform window reload to trigger full refresh
      setTimeout(() => {
        window.location.reload();
      }, 700);
    } else {
      setPullStartY(0);
      setPullDistance(0);
    }
  };

  // AI Personalization State (user chooses name & color on first visit)
  const aiName = "Kacha Morich AI";
  const aiColor = "#10b981";

  // File Upload State
  const [attachedFiles, setAttachedFiles] = useState<{ name: string; content: string; type: string }[]>([]);
  const attachedFile = attachedFiles.length > 0 ? attachedFiles[0] : null;
  const setAttachedFile = (val: any) => {
    if (val === null) {
      setAttachedFiles([]);
    } else {
      setAttachedFiles([val]);
    }
  };
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

  const exportToPDF = (content: string) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow popups to export as PDF");
      return;
    }

    const cleanText = cleanArrows(content);

    // Convert basic markdown formatting to clean HTML for the print preview
    let html = cleanText
      .replace(/^### (.*$)/gim, '<h3 style="color:#FF8C00;font-family:sans-serif;margin-top:20px;">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 style="color:#FF8C00;font-family:sans-serif;margin-top:25px;">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 style="color:#FF8C00;font-family:sans-serif;margin-top:30px;border-bottom:1px solid #ddd;padding-bottom:10px;">$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code style="background:#f4f4f4;padding:2px 4px;border-radius:4px;">$1</code>')
      .replace(/\n/g, '<br/>');

    // Convert markdown tables to styled HTML tables
    if (html.includes('|')) {
      const lines = html.split('<br/>');
      let inTable = false;
      let tableHtml = '<table style="width:100%;border-collapse:collapse;margin:20px 0;font-family:sans-serif;">';

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('|')) {
          inTable = true;
          const cells = line.split('|').map(c => c.trim()).filter((c, idx, arr) => idx > 0 && idx < arr.length - 1);
          if (line.includes('---')) continue;

          tableHtml += '<tr style="border-bottom:1px solid #ddd;">';
          cells.forEach(cell => {
            tableHtml += `<td style="padding:10px;border:1px solid #ddd;">${cell}</td>`;
          });
          tableHtml += '</tr>';
        } else {
          if (inTable) {
            inTable = false;
            tableHtml += '</table>';
            lines[i] = tableHtml + '<br/>' + lines[i];
          }
        }
      }
      html = lines.join('<br/>');
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Kacha Morich AI - Business Intelligence Report</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #333; line-height: 1.6; }
            h1, h2, h3 { font-family: 'Segoe UI', sans-serif; color: #111; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: #f5f5f5; }
            tr:nth-child(even) { background-color: #fafafa; }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div style="text-align:center;margin-bottom:30px;border-bottom:2px solid #FF8C00;padding-bottom:10px;">
            <h2 style="margin:0;color:#FF8C00;">🌶️ KACHA MORICH AI</h2>
            <p style="margin:5px 0 0 0;font-size:12px;color:#666;text-transform:uppercase;letter-spacing:1px;">Elite Business Advisory Report</p>
          </div>
          <div>${html}</div>
          <div style="margin-top:50px;font-size:10px;color:#999;text-align:center;border-top:1px solid #eee;padding-top:10px;">
            Generated dynamically by Kacha Morich AI Platform. Confidential & Proprietary.
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const exportToWord = (content: string) => {
    const cleanText = cleanArrows(content);
    let html = cleanText
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br/>');

    const wordContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><title>Kacha Morich AI Report</title><style>body { font-family: Arial, sans-serif; }</style></head>
        <body>
          <h2 style="color:#FF8C00;">🌶️ Kacha Morich AI Business Report</h2>
          <hr/>
          <div>${html}</div>
        </body>
      </html>
    `;

    const blob = new Blob(['\ufeff' + wordContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kacha_morich_report_${Date.now()}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportToExcel = (content: string) => {
    const lines = content.split('\n');
    let csvContent = "";
    let hasTable = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('|')) {
        if (line.includes('---')) continue;
        hasTable = true;
        const cells = line.split('|').map(c => c.trim()).filter((c, idx, arr) => idx > 0 && idx < arr.length - 1);
        const csvRow = cells.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',');
        csvContent += csvRow + '\r\n';
      }
    }

    if (!hasTable) {
      csvContent = `"${content.replace(/"/g, '""')}"`;
    }

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kacha_morich_data_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
    if (typeof window === "undefined") return;
    const handleResize = () => {
      const height = window.visualViewport ? window.visualViewport.height : window.innerHeight;
      document.documentElement.style.setProperty(
        "--viewport-height",
        `${height}px`
      );
    };

    window.addEventListener("resize", handleResize);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleResize);
      window.visualViewport.addEventListener("scroll", handleResize);
    }

    // Expose resize to window so we can trigger it dynamically on input focus/scroll
    (window as any).triggerKachaResize = handleResize;

    handleResize(); // Initial call
    return () => {
      window.removeEventListener("resize", handleResize);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", handleResize);
        window.visualViewport.removeEventListener("scroll", handleResize);
      }
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
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsFileParsing(true);
    try {
      const parsedResults = await Promise.all(
        Array.from(files).map(async (file) => {
          const parsedContent = await parseAnyFile(file);
          return {
            name: file.name,
            content: parsedContent,
            type: file.type || "text/plain",
          };
        })
      );
      setAttachedFiles((prev) => [...prev, ...parsedResults]);
    } catch (err: any) {
      console.error("Multi-file parsing error:", err);
      alert(`Could not parse one or more files: ${err.message || "Unknown error"}`);
    } finally {
      setIsFileParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
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
        setAttachedFiles((prev) => [
          ...prev,
          {
            name: file.name,
            content: parsedContent,
            type: file.type || "image/jpeg",
          },
        ]);
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

        // Check API key health in background — show banner if any keys need attention
        fetch("/api/check-keys")
          .then(r => r.ok ? r.json() : null)
          .then(status => {
            if (status?.needsAttention) {
              setApiBanner("api_key_exhausted");
              if (status.reason) setApiBannerMessage(status.reason);
            }
          })
          .catch(() => { /* silent — don't block UI */ });

        // 🎯 Fetch adaptive behavior profile — personalize UI
        fetch("/api/user/profile")
          .then(r => r.ok ? r.json() : null)
          .then(data => {
            if (data?.profile) {
              setAdaptiveProfile(data.profile);
              // Auto-apply preferred tone if user has a strong preference
              if (data.profile.preferredTone && data.profile.topAgents?.length > 2) {
                const savedTone = localStorage.getItem("kacha_selected_tone");
                if (!savedTone) {
                  setSelectedToneId(data.profile.preferredTone);
                }
              }
            }
          })
          .catch(() => { /* silent */ });

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

  // Fetch dynamic model list from OpenRouter via our API
  useEffect(() => {
    if (!isLoaded || !user) return;
    setModelsLoading(true);
    fetch("/api/models")
      .then(res => res.json())
      .then(data => {
        if (data.models && data.models.length > 0) {
          setModelsList(data.models);
        }
      })
      .catch(err => console.error("Failed to fetch models:", err))
      .finally(() => setModelsLoading(false));
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

      // Restore active chat's agent if serialized in the title (tone stays globally persistent)
      const currentChat = chats.find((c) => c.id === activeChatId);
      if (currentChat) {
        const { agentId } = parseChatTitle(currentChat.title);
        if (agentId) setSelectedAgentId(agentId);
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

  // 📥 Export Conversation as PDF
  const handleExportChat = async () => {
    if (messages.length === 0) return;

    try {
      const jsPDF = (await import("jspdf")).default;
      const pdf = new jsPDF("p", "mm", "a4");

      const pageWidth = 210;
      const margin = 15;
      const contentWidth = pageWidth - margin * 2;
      let yPos = 20;

      // Header
      pdf.setFillColor(225, 29, 72);
      pdf.rect(0, 0, pageWidth, 14, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "bold");
      pdf.text("🌶️ KACHA MORICH AI — Conversation Export", margin, 9);

      const activeAgent = allAgents.find((a) => a.id === selectedAgentId);
      const agentLabel = activeAgent?.name || "AI Assistant";
      const dateStr = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
      pdf.setFontSize(7);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Agent: ${agentLabel}  |  Date: ${dateStr}  |  Messages: ${messages.length}`, margin, 13);

      yPos = 22;

      // Messages
      for (const msg of messages) {
        if (!msg.content || msg.content.trim() === "") continue;

        // Role label
        const isUser = msg.role === "user";
        pdf.setFontSize(7);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(isUser ? 59 : 16, isUser ? 130 : 185, isUser ? 246 : 129);
        pdf.text(isUser ? "YOU" : aiName.toUpperCase(), margin, yPos);
        yPos += 4;

        // Clean content — strip markdown, base64 images, artifacts
        const cleanContent = msg.content
          .replace(/\[IMAGE_BASE64:[^\]]+\]/g, "[Image attached]")
          .replace(/\[ATTACHED DOCUMENT:[^\]]+\]/g, "[Document attached]")
          .replace(/```[\s\S]*?```/g, "[Code block]")
          .replace(/#{1,6}\s/g, "")
          .replace(/\*\*(.*?)\*\*/g, "$1")
          .replace(/\*(.*?)\*/g, "$1")
          .replace(/<thought>[\s\S]*?<\/thought>/g, "")
          .replace(/__[A-Z_]+__:[^\n]*/g, "")
          .trim();

        // Word-wrap and paginate
        pdf.setFontSize(8.5);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(30, 30, 30);

        const lines = pdf.splitTextToSize(cleanContent, contentWidth);
        for (const line of lines) {
          if (yPos > 280) {
            pdf.addPage();
            yPos = 15;
          }
          pdf.text(line, margin, yPos);
          yPos += 4.5;
        }

        // Separator
        pdf.setDrawColor(220, 220, 220);
        pdf.line(margin, yPos + 1, pageWidth - margin, yPos + 1);
        yPos += 6;
      }

      // Footer on last page
      pdf.setFontSize(7);
      pdf.setTextColor(150, 150, 150);
      pdf.text("Generated by Kacha Morich AI — kachamorich.vercel.app", margin, 290);

      pdf.save(`kacha_morich_chat_${Date.now()}.pdf`);
    } catch (err) {
      console.error("Export failed:", err);
    }
  };

  // ✏️ Edit a user message — truncates messages after that index and re-sends
  const handleEditMessage = async (index: number, newText: string) => {
    if (!newText.trim() || isLoading) return;
    setEditingMessageIndex(null);
    setEditingMessageText("");
    const messagesBeforeEdit = messages.slice(0, index);
    setMessages(messagesBeforeEdit);
    // Directly trigger send with the new text — bypass form state
    await sendMessageDirectly(newText);
  };

  // 🔄 Regenerate the last assistant response
  const handleRegenerate = async () => {
    if (isLoading || messages.length < 2) return;
    let lastUserIdx = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") { lastUserIdx = i; break; }
    }
    if (lastUserIdx === -1) return;
    const lastUserMsg = messages[lastUserIdx];
    const trimmed = messages.filter((_, i) => i <= lastUserIdx);
    setMessages(trimmed);
    await sendMessageDirectly(lastUserMsg.content);
  };

  // ⭐ Rate a message — 👍 saves rating, 👎 saves rating + offers to regenerate
  const handleRateMessage = (index: number, rating: "up" | "down") => {
    setMessageRatings(prev => ({ ...prev, [index]: rating }));

    if (rating === "down" && index === messages.length - 1) {
      // Auto-suggest regeneration on thumbs down for last message
      setTimeout(() => {
        if (window.confirm("Response wasn't helpful? Regenerate with a different approach?")) {
          handleRegenerate();
        }
      }, 300);
    }
  };

  // 3. Create a New Chat Thread
  const handleNewChat = () => {
    setActiveChatId(null);
    setMessages([]);
    setMessageRatings({});
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
  // sendMessageDirectly — called by edit/regenerate, bypasses form state
  const sendMessageDirectly = async (text: string) => {
    if (!text.trim() || isLoading) return;
    setInputMessage("");
    setIsLoading(true);
    setSmartSuggestions([]);
    setMessageRatings({});
    isStreamingRef.current = true;

    const newUserMessage: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, newUserMessage]);
    const assistantPlaceholder: Message = { role: "assistant", content: "" };
    setMessages((prev) => [...prev, assistantPlaceholder]);

    try {
      abortControllerRef.current = new AbortController();
      const customAgent = customAgents.find((ca) => ca.id === selectedAgentId);
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortControllerRef.current.signal,
        body: JSON.stringify({
          message: text,
          chatId: activeChatId,
          agentId: selectedAgentId,
          toneId: selectedToneId,
          modelId: selectedModelId,
          aiName: aiName,
          tonePrompt: TONES_LIST.find(t => t.id === selectedToneId)?.prompt,
          isBrainTrust: isBrainTrust,
          boardSize: boardSize,
          customInstructions: customAgent ? customAgent.instructions : undefined,
          enableAutoRouting: enableAutoRouting,
        }),
      });

      if (!response.ok || !response.body) throw new Error("API call failed");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedResponse = "";
      let hasHeaderIdParsed = false;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });

        if (!hasHeaderIdParsed && chunk.includes("__CHAT_ID__:")) {
          const lines = chunk.split("\n");
          const resolvedId = lines[0].replace("__CHAT_ID__:", "").trim();
          if (resolvedId) { setActiveChatId(resolvedId); hasHeaderIdParsed = true; }
          const restText = lines.slice(1).join("\n");
          accumulatedResponse += restText;
        } else {
          accumulatedResponse += chunk;
        }

        setMessages((prev) => {
          const updated = [...prev];
          if (updated.length > 0) updated[updated.length - 1] = { role: "assistant", content: accumulatedResponse };
          return updated;
        });
      }

      setMessages((prev) => {
        const updated = [...prev];
        if (updated.length > 0 && accumulatedResponse) updated[updated.length - 1] = { role: "assistant", content: accumulatedResponse };
        return updated;
      });

      Promise.all([
        fetch("/api/chats").then(r => r.json()).then(data => { if (data.chats) setChats(data.chats); }).catch(() => { }),
      ]);
    } catch (err) {
      console.error("sendMessageDirectly error:", err);
    } finally {
      setIsLoading(false);
      isStreamingRef.current = false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputMessage.trim() && attachedFiles.length === 0) || isLoading) return;

    // Stop listening if user was dictating
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    const userMessageContent = inputMessage.trim();
    setInputMessage("");
    setIsLoading(true);
    setSmartSuggestions([]); // Clear previous suggestions when new message is sent
    setMessageRatings({}); // Clear ratings on new message
    isStreamingRef.current = true;

    // Format the final message sent to AI with attached file contents if present
    let messageToSend = userMessageContent;
    const currentAttachments = [...attachedFiles];
    if (currentAttachments.length > 0) {
      const documentsBlock = currentAttachments.map(
        (att) => `[ATTACHED DOCUMENT: ${att.name}]\n\`\`\`\n${att.content}\n\`\`\``
      ).join("\n\n");
      messageToSend = `${documentsBlock}\n\nUser Prompt: ${userMessageContent || "Please analyze the extracted documents above based on your specialized agent role."}`;
      setAttachedFiles([]);
    }

    // Append user's message locally (show clean message in chat UI, not the giant raw file block)
    const base64Tags = currentAttachments
      .map(att => {
        const match = att.content.match(/\[IMAGE_BASE64:(data:image\/[^\]]+)\]/);
        return match ? `[IMAGE_BASE64:${match[1]}]` : "";
      })
      .filter(Boolean)
      .join("\n");

    const newUserMessage: Message = {
      role: "user",
      content: (base64Tags ? base64Tags + "\n" : "") + (userMessageContent || `Attached ${currentAttachments.length} file(s): ${currentAttachments.map(a => a.name).join(", ")}`)
    };
    setMessages((prev) => [...prev, newUserMessage]);

    // Create an empty Kacha Morich AI placeholder for stream accumulation
    const assistantPlaceholder: Message = { role: "assistant", content: "" };
    setMessages((prev) => [...prev, assistantPlaceholder]);

    try {
      abortControllerRef.current = new AbortController();
      const customAgent = customAgents.find((ca) => ca.id === selectedAgentId);
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortControllerRef.current.signal,
        body: JSON.stringify({
          message: messageToSend,
          chatId: activeChatId,
          agentId: selectedAgentId,
          toneId: selectedToneId,
          modelId: selectedModelId,
          aiName: aiName,
          tonePrompt: TONES_LIST.find(t => t.id === selectedToneId)?.prompt,
          isBrainTrust: isBrainTrust,
          boardSize: boardSize,
          customInstructions: customAgent ? customAgent.instructions : undefined,
          enableAutoRouting: enableAutoRouting,
        }),
      });

      if (!response.ok) {
        // Try to read error body to detect API key exhaustion
        try {
          const errData = await response.json();
          if (errData?.error?.includes("exhausted") || errData?.error?.includes("API key") || response.status === 402 || response.status === 429) {
            setApiBanner("api_key_exhausted");
          }
        } catch { /* ignore parse error */ }
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

        // Detect API key exhausted signal from server
        if (chunk.includes("__API_KEY_EXHAUSTED__") || accumulatedResponse.includes("__API_KEY_EXHAUSTED__")) {
          const cleanChunk = chunk.replace("__API_KEY_EXHAUSTED__", "").trim();
          if (cleanChunk) {
            accumulatedResponse += cleanChunk;
          }
          accumulatedResponse = accumulatedResponse.replace("__API_KEY_EXHAUSTED__", "").trim();
          setApiBanner("api_key_exhausted");
          setMessages((prev) => {
            const updated = [...prev];
            if (updated.length > 0) {
              updated[updated.length - 1] = {
                role: "assistant",
                content: accumulatedResponse || "⚠️ Your OpenRouter API keys are exhausted. Please add a new OpenRouter key in Settings to continue.",
              };
            }
            return updated;
          });
          break;
        }

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

        // Auto-routing signal — update the selected agent in UI
        if (chunk.includes("__AUTO_ROUTED_AGENT__:")) {
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("__AUTO_ROUTED_AGENT__:")) {
              const routedAgentId = line.replace("__AUTO_ROUTED_AGENT__:", "").trim();
              if (routedAgentId) {
                setSelectedAgentId(routedAgentId);
                localStorage.setItem("kacha_selected_agent", routedAgentId);
                console.log(`[AutoRoute] UI updated to agent: ${routedAgentId}`);
              }
            }
          }
          // Don't add this metadata line to the response text
          const filteredChunk = chunk.replace(/^__AUTO_ROUTED_AGENT__:[^\n]*\n?/m, "");
          if (filteredChunk) {
            accumulatedResponse += filteredChunk;
            setMessages((prev) => {
              const updated = [...prev];
              if (updated.length > 0) {
                updated[updated.length - 1] = { role: "assistant", content: accumulatedResponse };
              }
              return updated;
            });
          }
          continue;
        }

        accumulatedResponse += chunk;
        // Update UI on every chunk — modern browsers handle this fine
        // Removing throttle gives fastest perceived streaming speed
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

      // Final flush — strip thinking leftovers and ensure last chunk shown
      setMessages((prev) => {
        const updated = [...prev];
        if (updated.length > 0 && accumulatedResponse) {
          // Strip leading filler words that are thinking leftovers (e.g. "Ok.", "Sure.")
          const cleaned = accumulatedResponse
            .replace(/^(Ok\.?\s*|Okay\.?\s*|Sure\.?\s*|Alright\.?\s*|Right\.?\s*|Got it\.?\s*|Understood\.?\s*|Well,?\s*)/i, "")
            .trim();
          updated[updated.length - 1] = { role: "assistant", content: cleaned || accumulatedResponse };
        }
        return updated;
      });


      // ⚡ Non-blocking background tasks — don't delay UI
      // Refresh sidebar + fetch suggestions in parallel, fire-and-forget
      Promise.all([
        fetch("/api/chats").then(r => r.json()).then(data => {
          if (data.chats) setChats(data.chats);
        }).catch(() => { }),
      ]);

      // 💡 Smart Suggestions — background, non-blocking
      setSmartSuggestions([]);
      setSuggestionsLoading(true);
      fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userMessage: messageToSend,
          assistantResponse: accumulatedResponse.substring(0, 600),
          agentId: selectedAgentId,
          language: /[\u0980-\u09FF]/.test(messageToSend) ? "bn" : "en",
        }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.suggestions && Array.isArray(data.suggestions)) {
            setSmartSuggestions(data.suggestions.slice(0, 3));
          }
        })
        .catch(() => { /* silent — non-critical */ })
        .finally(() => setSuggestionsLoading(false));

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

  // Prevent hydration mismatch by not rendering until client-side hydration is complete
  if (!isHydrated) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-neutral-400 text-sm">Loading Kacha Morich AI...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className={`fixed inset-0 flex overflow-hidden font-sans w-full transition-colors duration-300 ${themeMode === "black" ? "bg-black text-neutral-100 theme-black" : "bg-[#F8FAFC] text-neutral-900 theme-light"
          }`}
        style={{ height: "var(--viewport-height, 100%)" }}
      >
        <aside
          className={`fixed inset-y-0 left-0 z-40 flex-shrink-0 transform transition-all duration-300 ease-in-out ${(sidebarOpen || (!isSidebarFolded && !sidebarOpen))
            ? "w-72 opacity-100 lg:static lg:translate-x-0"
            : "w-0 lg:w-0 overflow-hidden opacity-0 -translate-x-full lg:-translate-x-full lg:static pointer-events-none"
            } ${sidebarOpen ? "translate-x-0" : (!isSidebarFolded ? "max-lg:-translate-x-full" : "-translate-x-full")} ${themeMode === "black"
              ? `bg-[#050505] ${isSidebarFolded ? "border-r-0" : "border-r border-white/5"}`
              : `bg-[#FFFFFF] ${isSidebarFolded ? "border-r-0" : "border-r border-neutral-200"}`
            }`}
        >
          <div className="flex flex-col h-full">
            {/* Sidebar Top Nav Brand */}
            <div className={`p-5 border-b flex flex-col gap-1 text-left ${themeMode === "black" ? "border-white/5" : "border-neutral-200"
              }`}>
              <div className="flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2.5">
                  <AIAvatar size={34} className={themeMode === "black" ? "border border-white/10" : "border border-neutral-200"} />
                  <span className={`font-extrabold tracking-widest text-xs uppercase ${themeMode === "black" ? "text-white/90" : "text-neutral-800"
                    }`}>
                    {aiName}
                  </span>
                </Link>
                <div className="flex items-center gap-1">
                  <button
                    className={`lg:hidden p-1 transition-colors ${themeMode === "black" ? "text-neutral-400 hover:text-neutral-100" : "text-neutral-600 hover:text-neutral-900"
                      }`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <X size={20} />
                  </button>
                  <button
                    type="button"
                    className={`hidden lg:flex items-center justify-center p-1.5 rounded-xl border transition-all duration-300 group/toggle ${themeMode === "black"
                      ? "border-white/5 bg-white/[0.02] hover:bg-white/[0.06] text-neutral-400 hover:text-white"
                      : "border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-500 hover:text-neutral-800"
                      }`}
                    onClick={handleSidebarFoldToggle}
                    title="Hide Sidebar"
                  >
                    <ChevronLeft size={16} className="transition-transform duration-300 ease-out group-hover/toggle:-translate-x-0.5" />
                  </button>
                </div>
              </div>
              <span className={`text-[10px] font-medium leading-normal ${themeMode === "black" ? "text-neutral-500" : "text-neutral-400"
                }`}>
                Your personal multi-specialist AI assistant.
              </span>
            </div>

            {/* New Chat Button */}
            <div className="px-4 py-3">
              <button
                onClick={handleNewChat}
                className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border transition-all duration-300 shadow-sm text-xs font-bold ${themeMode === "black"
                  ? "border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent hover:from-white/[0.08] text-neutral-200 hover:text-white"
                  : "border-transparent bg-[#0A0A0C] hover:bg-neutral-800 text-white shadow-[0_4px_12px_rgba(0,0,0,0.1)] hover:scale-[1.01] active:scale-[0.99] transform"
                  }`}
              >
                <Plus size={16} /> New Analysis
              </button>
            </div>

            {/* Chats History List — with search + date grouping */}
            <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
              {/* Search box */}
              <div className="px-3 pb-2 pt-1">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs ${themeMode === "black" ? "bg-white/[0.02] border-white/[0.06] text-neutral-400" : "bg-neutral-50 border-neutral-200 text-neutral-500"}`}>
                  <Search size={11} className="flex-shrink-0" />
                  <input
                    type="text"
                    placeholder="Search chats..."
                    value={chatSearch}
                    onChange={(e) => setChatSearch(e.target.value)}
                    className="bg-transparent outline-none w-full placeholder:text-neutral-600 text-[11px]"
                  />
                  {chatSearch && (
                    <button onClick={() => setChatSearch("")} className="flex-shrink-0 hover:text-white transition-colors">
                      <X size={10} />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-3 py-1 space-y-0.5">
                {isSyncing ? (
                  <div className={`p-4 text-center text-xs ${themeMode === "black" ? "text-neutral-600" : "text-neutral-400"}`}>Syncing consultations...</div>
                ) : chats.length === 0 ? (
                  <div className={`p-4 text-center text-xs ${themeMode === "black" ? "text-neutral-600" : "text-neutral-400"}`}>No previous consultations</div>
                ) : (() => {
                  // Filter by search
                  const filtered = chatSearch.trim()
                    ? chats.filter(c => parseChatTitle(c.title).title.toLowerCase().includes(chatSearch.toLowerCase()))
                    : chats;

                  if (filtered.length === 0) {
                    return <div className={`p-4 text-center text-xs ${themeMode === "black" ? "text-neutral-600" : "text-neutral-400"}`}>No chats found</div>;
                  }

                  // Group by date
                  const now = new Date();
                  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                  const yesterdayStart = new Date(todayStart.getTime() - 86400000);
                  const weekStart = new Date(todayStart.getTime() - 6 * 86400000);
                  const monthStart = new Date(todayStart.getTime() - 29 * 86400000);

                  const groups: { label: string; chats: typeof chats }[] = [
                    { label: "Today", chats: [] },
                    { label: "Yesterday", chats: [] },
                    { label: "This Week", chats: [] },
                    { label: "This Month", chats: [] },
                    { label: "Older", chats: [] },
                  ];

                  for (const chat of filtered) {
                    const d = new Date(chat.created_at);
                    if (d >= todayStart) groups[0].chats.push(chat);
                    else if (d >= yesterdayStart) groups[1].chats.push(chat);
                    else if (d >= weekStart) groups[2].chats.push(chat);
                    else if (d >= monthStart) groups[3].chats.push(chat);
                    else groups[4].chats.push(chat);
                  }

                  return groups.filter(g => g.chats.length > 0).map(group => (
                    <div key={group.label} className="mb-2">
                      <div className={`px-2 py-1 text-[9px] font-black uppercase tracking-widest mb-1 ${themeMode === "black" ? "text-neutral-600" : "text-neutral-400"}`}>
                        {group.label}
                      </div>
                      {group.chats.map((chat) => (
                        <div
                          key={chat.id}
                          onClick={() => { setActiveChatId(chat.id); setSidebarOpen(false); }}
                          className={`group w-full flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition duration-200 text-xs mb-0.5 ${activeChatId === chat.id
                            ? themeMode === "black"
                              ? "bg-white/[0.04] border border-white/[0.06] text-white font-medium shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
                              : "bg-amber-500/10 border border-amber-500/20 text-amber-955 font-bold shadow-sm"
                            : themeMode === "black"
                              ? "border border-transparent text-neutral-400 hover:bg-white/[0.02] hover:text-neutral-200"
                              : "border border-transparent text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                            }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            {activeChatId === chat.id ? (
                              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse flex-shrink-0" />
                            ) : (
                              <MessageSquare size={12} className="text-neutral-600 flex-shrink-0" />
                            )}
                            <span className="truncate pr-2 font-medium">{parseChatTitle(chat.title).title}</span>
                          </div>
                          <button
                            onClick={(e) => handleDeleteChat(e, chat.id)}
                            className={`p-1 rounded opacity-0 group-hover:opacity-100 transition duration-200 flex-shrink-0 ${themeMode === "black" ? "text-neutral-600 hover:text-red-400 hover:bg-red-950/20" : "text-neutral-400 hover:text-red-500 hover:bg-red-50"}`}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ));
                })()}
              </div>
            </div>

            {/* Sidebar User Footer */}
            <div className={`p-4 border-t transition-colors duration-300 flex items-center justify-between ${themeMode === "black" ? "border-neutral-900 bg-[#050505]" : "border-neutral-200 bg-[#FAFAFA]"
              }`}>
              <div className="flex items-center gap-3">
                <UserButton />
                <div className="flex flex-col text-left">
                  <span className={`text-xs font-bold truncate max-w-[120px] ${themeMode === "black" ? "text-neutral-200" : "text-neutral-850 font-extrabold"
                    }`}>
                    {user?.firstName || user?.username || "Consultant"}
                  </span>
                  <span className={`text-[10px] font-bold tracking-wider ${themeMode === "black" ? "text-neutral-400" : "text-neutral-500"
                    }`}>PREMIUM MEMBER</span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {user?.primaryEmailAddress?.emailAddress &&
                  ["koishiquedhrubo@gmail.com", "rahmanmdkoishiqur@gmail.com", "aloniliark@gmail.com"].includes(user.primaryEmailAddress.emailAddress) && (
                    <Link
                      href="/admin"
                      className={`p-2 rounded-lg transition duration-200 ${themeMode === "black" ? "text-emerald-500 hover:text-emerald-300 hover:bg-neutral-900" : "text-emerald-600 hover:text-emerald-500 hover:bg-emerald-50"
                        }`}
                      title="Admin Dashboard"
                    >
                      <ShieldCheck size={16} className="animate-pulse" />
                    </Link>
                  )}
                <button
                  onClick={() => setIsSettingsModalOpen(true)}
                  className={`p-2 rounded-lg transition duration-200 ${themeMode === "black" ? "text-neutral-500 hover:text-neutral-200 hover:bg-neutral-900" : "text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100"
                    }`}
                  title="Manage Account"
                >
                  <Settings size={16} />
                </button>
                <Link
                  href="/"
                  className={`p-2 rounded-lg transition duration-200 ${themeMode === "black" ? "text-neutral-500 hover:text-neutral-200 hover:bg-neutral-900" : "text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100"
                    }`}
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
        <main className={`flex-1 min-h-0 flex flex-col relative overflow-hidden transition-colors duration-300 ${themeMode === "black" ? "bg-[#050505]" : "bg-[#F8FAFC]"
          }`}>
          {/* Dynamic Glowing Satin Spotlight overlays & high-fidelity micro-grid pattern */}
          {themeMode === "black" && (
            <div className="absolute inset-0 pointer-events-none select-none overflow-hidden z-0">
              {/* Soft high-contrast atmospheric spotlights */}
              <div className="absolute top-[-10%] left-[10%] w-[60%] h-[450px] bg-gradient-to-br from-emerald-500/12 to-teal-500/0 rounded-full blur-[130px] animate-pulse duration-[12s] opacity-75" />
              <div className="absolute bottom-[5%] right-[10%] w-[55%] h-[400px] bg-gradient-to-tr from-amber-500/8 to-emerald-500/0 rounded-full blur-[130px] animate-pulse duration-[16s] opacity-65" />
              {/* Micro grid pattern for Silicon Valley tactile depth */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none opacity-80" />
            </div>
          )}

          {/* Slim restore bar — shown only when header is hidden */}
          {!headerVisible && (
            <div
              className={`flex items-center justify-between px-4 py-1.5 z-40 border-b cursor-pointer group transition-all duration-200 ${themeMode === "black"
                ? "bg-[#050505]/90 border-white/5 hover:bg-white/[0.03]"
                : "bg-white/90 border-neutral-200 hover:bg-neutral-50"
                }`}
              onClick={() => { setHeaderVisible(true); setControlBarVisible(true); }}
              title="Show toolbar"
            >
              <span className={`text-[10px] font-black tracking-widest uppercase ${themeMode === "black" ? "text-neutral-600 group-hover:text-neutral-300" : "text-neutral-400 group-hover:text-neutral-700"}`}>
                🌶️ Kacha Morich AI
              </span>
              <div className="flex items-center gap-1.5">
                <span className={`text-[9px] font-bold ${themeMode === "black" ? "text-neutral-600 group-hover:text-neutral-400" : "text-neutral-400 group-hover:text-neutral-600"}`}>Show toolbar</span>
                <ChevronDown size={12} className={`transition-transform duration-200 rotate-180 ${themeMode === "black" ? "text-neutral-600 group-hover:text-neutral-300" : "text-neutral-400 group-hover:text-neutral-600"}`} />
              </div>
            </div>
          )}

          {/* Header wrapper — collapses smoothly */}
          <div className={`transition-all duration-300 ease-in-out relative z-40 ${headerVisible ? "opacity-100" : "max-h-0 opacity-0 overflow-hidden pointer-events-none"}`}>
            <header className={`h-16 px-4 sm:px-6 border-b backdrop-blur-xl flex items-center justify-between z-40 transition-colors duration-300 ${themeMode === "black"
              ? "border-white/5 bg-[#050505]/80"
              : "border-neutral-200 bg-[#FFFFFF]/80 shadow-sm"
              }`}>
              <div className="flex items-center gap-3">
                <button
                  className={`lg:hidden p-1.5 rounded-lg transition duration-200 ${themeMode === "black" ? "text-neutral-400 hover:text-neutral-100 hover:bg-neutral-900" : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100"
                    }`}
                  onClick={() => setSidebarOpen(true)}
                >
                  <Menu size={20} />
                </button>
                {isSidebarFolded && (
                  <button
                    type="button"
                    className={`hidden lg:flex items-center justify-center p-2 rounded-xl border transition-all duration-300 group/toggle animate-fade-in ${themeMode === "black"
                      ? "border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-400 hover:text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                      : "border-emerald-200 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-600 hover:text-emerald-700"
                      }`}
                    onClick={handleSidebarFoldToggle}
                    title="Show Sidebar"
                  >
                    <ChevronRight size={16} className="transition-transform duration-300 ease-out group-hover/toggle:translate-x-0.5" />
                  </button>
                )}
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
                        className={`flex items-center gap-1 sm:gap-1.5 px-2 py-1.5 sm:px-2.5 sm:py-1 rounded-xl transition-all font-extrabold shadow-sm border ${themeMode === "black"
                          ? "bg-emerald-950/40 text-emerald-400 border-emerald-500/20 hover:bg-emerald-900/50"
                          : "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 hover:bg-emerald-500/20"
                          }`}
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
                        <div className={`absolute top-full left-0 mt-2 w-56 backdrop-blur-xl border rounded-2xl p-1 shadow-2xl z-50 transition-colors duration-300 ${themeMode === "black"
                          ? "bg-[#0A0A0A]/95 border-white/10"
                          : "bg-[#FFFFFF]/95 border-neutral-200"
                          }`}>
                          <div className="max-h-64 overflow-y-auto font-sans">
                            {TONES_LIST.map((tone) => (
                              <button
                                key={tone.id}
                                type="button"
                                onClick={() => {
                                  handleToneChange(tone.id);
                                  setToneDropdownOpen(false);
                                }}
                                className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-semibold rounded-xl transition duration-200 ${selectedToneId === tone.id
                                  ? themeMode === "black"
                                    ? "bg-emerald-500/10 text-emerald-400"
                                    : "bg-emerald-500/10 text-emerald-700 font-black shadow-inner"
                                  : themeMode === "black"
                                    ? "text-neutral-400 hover:bg-white/5 hover:text-white"
                                    : "text-neutral-600 hover:bg-neutral-150 hover:text-neutral-900"
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
                  <span className={`mobile-hide sm:block text-sm font-semibold truncate max-w-[200px] ml-2 ${themeMode === "black" ? "text-neutral-200" : "text-neutral-800"
                    }`}>
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
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border transition duration-300 font-bold shadow-sm text-xs ${themeMode === "black"
                      ? "border-white/10 bg-[#0A0A0A]/50 hover:bg-[#111111]/80 text-neutral-300 hover:text-white hover:border-neutral-200/30"
                      : "border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 hover:text-neutral-900"
                      }`}
                  >
                    {(() => {
                      const activeAgent = allAgents.find((a) => a.id === selectedAgentId) || allAgents[0];
                      if (activeAgent) {
                        if (activeAgent.isCustom) {
                          const CustomIcon = resolveCustomIcon(activeAgent.icon);
                          return <CustomIcon size={14} className={`${themeMode === "black" ? "text-neutral-200" : "text-neutral-700"} flex-shrink-0 animate-pulse`} />;
                        }
                        const AgentIcon = activeAgent.icon;
                        return <AgentIcon size={14} className={`${themeMode === "black" ? "text-neutral-200" : "text-neutral-700"} flex-shrink-0 animate-pulse`} />;
                      }
                      return null;
                    })()}
                    <span className="truncate max-w-[120px] sm:max-w-[180px]">
                      {(allAgents.find((a) => a.id === selectedAgentId) || allAgents[0])?.name || "Select Agent"}
                    </span>
                    <ChevronDown size={13} className={`text-neutral-500 transition duration-300 ${agentDropdownOpen ? "rotate-180 text-neutral-200" : ""}`} />
                  </button>

                  {/* Dynamic Glassmorphic Dropdown List */}
                  {agentDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setAgentDropdownOpen(false)} />
                      <div className={`absolute right-0 mt-2.5 w-80 max-h-[420px] overflow-y-auto rounded-xl border p-2 shadow-2xl z-50 divide-y space-y-1 scrollbar-thin ${themeMode === "black"
                        ? "border-neutral-800 bg-[#090909]/95 backdrop-blur-md divide-neutral-900"
                        : "border-neutral-200 bg-white divide-neutral-100 shadow-xl"
                        }`}>
                        <div className={`px-3 py-1.5 text-[9px] font-black tracking-widest uppercase flex items-center justify-between ${themeMode === "black" ? "text-neutral-500" : "text-neutral-400"
                          }`}>
                          <span>Select Specialist AI Agent</span>
                        </div>

                        <div className="pt-1.5 space-y-0.5 font-sans">
                          {/* 🎯 Adaptive: Your Top Agents — shown if user has behavior data */}
                          {adaptiveProfile && adaptiveProfile.topAgents.length >= 2 && (
                            <div className="mb-2">
                              <div className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest ${themeMode === "black" ? "text-violet-500" : "text-violet-600"}`}>
                                ⚡ Your Top Agents
                              </div>
                              {adaptiveProfile.topAgents.slice(0, 3).map(({ agentId: topId }) => {
                                const topAgent = allAgents.find(a => a.id === topId);
                                if (!topAgent) return null;
                                const isSelected = selectedAgentId === topId;
                                const AgentIcon = topAgent.icon as any;
                                return (
                                  <button
                                    key={`top-${topId}`}
                                    type="button"
                                    onClick={() => { handleAgentChange(topId); setAgentDropdownOpen(false); }}
                                    className={`w-[calc(100%-8px)] mx-1 flex items-center gap-2.5 px-3 py-2 rounded-lg transition duration-150 text-xs ${isSelected
                                      ? themeMode === "black" ? "bg-violet-500/15 text-violet-300" : "bg-violet-50 text-violet-700"
                                      : themeMode === "black" ? "text-neutral-300 hover:bg-white/[0.04]" : "text-neutral-700 hover:bg-neutral-50"
                                      }`}
                                  >
                                    {AgentIcon ? <AgentIcon size={13} className="flex-shrink-0 text-violet-400" /> : <span className="text-sm">{topAgent.customIcon || "🤖"}</span>}
                                    <span className="truncate font-semibold">{topAgent.name}</span>
                                    {isSelected && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" />}
                                  </button>
                                );
                              })}
                              <div className={`mx-3 my-1.5 border-t ${themeMode === "black" ? "border-neutral-800" : "border-neutral-100"}`} />
                            </div>
                          )}

                          {/* "+ Create Custom Agent" Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setCustomAgentModalOpen(true);
                              setAgentDropdownOpen(false);
                            }}
                            className={`w-[calc(100%-8px)] mx-1 flex items-center justify-center gap-2 p-2 rounded-lg border-dashed border transition duration-200 text-xs font-black uppercase tracking-wider mb-2 ${themeMode === "black"
                              ? "border-emerald-500/25 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/40"
                              : "border-emerald-200 bg-emerald-500/5 text-emerald-600 hover:bg-emerald-500/10"
                              }`}
                          >
                            <Plus size={13} />
                            <span>✨ Create Custom Agent</span>
                          </button>
                          <button
                            onClick={() => {
                              setPdfAgentModalOpen(true);
                              setAgentDropdownOpen(false);
                            }}
                            className={`w-[calc(100%-8px)] mx-1 flex items-center justify-center gap-2 p-2 rounded-lg border-dashed border transition duration-200 text-xs font-black uppercase tracking-wider mb-2 ${themeMode === "black"
                              ? "border-indigo-500/25 bg-indigo-500/5 text-indigo-400 hover:bg-indigo-500/10 hover:border-indigo-500/40"
                              : "border-indigo-200 bg-indigo-500/5 text-indigo-600 hover:bg-indigo-500/10"
                              }`}
                          >
                            <FileText size={13} />
                            <span>📄 Upload PDF Agent</span>
                          </button>

                          {allAgents.map((agent) => {
                            const isSelected = selectedAgentId === agent.id;
                            return (
                              <div key={agent.id} className="relative group/agent flex items-center w-full">
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleAgentChange(agent.id);
                                    setAgentDropdownOpen(false);
                                    // Start a new chat if there are already messages in the current one
                                    if (messages.length > 0) {
                                      handleNewChat();
                                    }
                                  }}
                                  className={`w-full text-left flex items-start gap-3 p-2.5 rounded-lg transition duration-200 pr-10 ${isSelected
                                    ? themeMode === "black"
                                      ? "bg-neutral-200/10 text-white border border-neutral-200/20"
                                      : "bg-neutral-100 text-neutral-900 border border-neutral-200"
                                    : themeMode === "black"
                                      ? "border border-transparent hover:bg-neutral-900 text-neutral-300 hover:text-neutral-100"
                                      : "border border-transparent hover:bg-[#F1F5F9] text-neutral-700 hover:text-neutral-900"
                                    }`}
                                >
                                  {agent.isCustom ? (
                                    (() => {
                                      const CustomIcon = resolveCustomIcon(agent.icon);
                                      return <CustomIcon size={16} className={`mt-0.5 flex-shrink-0 ${isSelected ? (themeMode === "black" ? "text-neutral-200" : "text-neutral-700") : "text-emerald-400"}`} />;
                                    })()
                                  ) : (
                                    (() => {
                                      const AgentIcon = agent.icon;
                                      return <AgentIcon size={16} className={`mt-0.5 flex-shrink-0 ${isSelected ? (themeMode === "black" ? "text-neutral-200" : "text-neutral-700") : "text-neutral-500"}`} />;
                                    })()
                                  )}
                                  <div className="flex flex-col text-xs leading-normal">
                                    <span className={`font-bold ${themeMode === "black" ? "text-neutral-200" : "text-neutral-900"} flex items-center gap-1.5`}>
                                      {agent.banglaName}
                                      {agent.isCustom && (
                                        <span className="px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Custom</span>
                                      )}
                                    </span>
                                    <span className="text-[10px] text-neutral-500 leading-normal mt-0.5">
                                      {agent.banglaDesc}
                                    </span>
                                  </div>
                                </button>

                                {agent.isCustom && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteCustomAgent(agent.id);
                                    }}
                                    className="absolute right-2 p-1.5 rounded-md hover:bg-red-500/15 text-neutral-500 hover:text-red-400 opacity-0 group-hover/agent:opacity-100 transition duration-150 z-10"
                                    title="Delete custom agent"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <Link
                  href="/"
                  className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition duration-300 text-xs ${themeMode === "black"
                    ? "border-neutral-800 bg-neutral-900/40 text-neutral-400 hover:text-white hover:bg-neutral-850"
                    : "border-neutral-200 bg-white text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 shadow-sm"
                    }`}
                >
                  Home
                </Link>

                {/* Theme Toggle Button */}
                <button
                  onClick={toggleTheme}
                  className={`p-2 rounded-lg transition duration-200 ${themeMode === "black"
                    ? "text-neutral-500 hover:text-amber-400 hover:bg-neutral-900"
                    : "text-neutral-500 hover:text-amber-650 hover:bg-neutral-100"
                    }`}
                  title={themeMode === "black" ? "Switch to System Light Theme" : "Switch to Obsidian Black Theme"}
                >
                  {themeMode === "black" ? <Sun size={16} /> : <Moon size={16} />}
                </button>

                <button
                  onClick={() => setIsSettingsModalOpen(true)}
                  className={`p-2 rounded-lg transition duration-200 ${themeMode === "black" ? "text-neutral-500 hover:text-neutral-200 hover:bg-neutral-900" : "text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100"
                    }`}
                  title="Manage Account"
                >
                  <Settings size={16} />
                </button>
                <Link
                  href="/settings"
                  className={`p-2 rounded-lg transition duration-200 ${themeMode === "black" ? "text-neutral-500 hover:text-red-400 hover:bg-neutral-900" : "text-neutral-500 hover:text-red-600 hover:bg-neutral-100"
                    }`}
                  title="OpenRouter API Keys"
                >
                  <Key size={16} />
                </Link>

                {/* Export Chat as PDF */}
                {messages.length > 0 && (
                  <button
                    type="button"
                    onClick={handleExportChat}
                    title="Export conversation as PDF"
                    className={`p-2 rounded-lg transition duration-200 ${themeMode === "black"
                      ? "text-neutral-500 hover:text-emerald-400 hover:bg-neutral-900"
                      : "text-neutral-500 hover:text-emerald-600 hover:bg-neutral-100"
                      }`}
                  >
                    <Download size={16} />
                  </button>
                )}

                {/* Single toggle — hides/shows both header bar and control bar */}
                <button
                  type="button"
                  onClick={() => { setHeaderVisible(false); setControlBarVisible(false); }}
                  title="Hide toolbar"
                  className={`p-2 rounded-lg transition duration-200 ${themeMode === "black"
                    ? "text-neutral-500 hover:text-neutral-200 hover:bg-neutral-900"
                    : "text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100"
                    }`}
                >
                  <ChevronDown size={15} />
                </button>

                <UserButton />
              </div>
            </header>
          </div>{/* end header wrapper */}

          {/* Premium Sub-Header AI Engine Control Bar (Horizontal Pill Scroller) */}
          <div className={`transition-all duration-300 ease-in-out relative z-30 ${controlBarVisible ? "opacity-100" : "max-h-0 opacity-0 overflow-hidden pointer-events-none"}`}>
            <div className={`px-4 sm:px-6 py-2 border-b flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors duration-300 z-20 ${themeMode === "black" ? "border-white/5 bg-[#050505]/95" : "border-neutral-200 bg-white/95 shadow-sm"
              }`}>
              {/* Models Dropdown */}
              <div className="flex flex-col gap-1 md:flex-row md:items-center md:gap-3 flex-1 min-w-0">
                <span className={`text-[8px] sm:text-[9px] font-black uppercase tracking-wider whitespace-nowrap ${themeMode === "black" ? "text-neutral-500" : "text-neutral-400"
                  }`}>Select AI Brain Model:</span>

                <div className="relative flex-1 max-w-xs">
                  <button
                    type="button"
                    onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
                    className={`w-full flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl border transition duration-300 font-bold shadow-sm text-xs ${themeMode === "black"
                      ? "border-white/10 bg-[#0A0A0A]/50 hover:bg-[#111111]/80 text-neutral-300 hover:text-white hover:border-neutral-200/30"
                      : "border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 hover:text-neutral-900"
                      }`}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {(() => {
                        const activeModel = modelsList.find((m) => m.id === selectedModelId) || modelsList[0];
                        return (
                          <>
                            <span className="text-sm flex-shrink-0">{activeModel?.icon || "✨"}</span>
                            <span className="truncate font-extrabold">{activeModel?.name?.replace(" (Thinking)", "") || selectedModelId.split("/")[1]}</span>
                            <span className={`text-[7px] px-1.5 py-0.5 rounded font-black tracking-normal flex-shrink-0 ${activeModel?.isFree
                              ? (themeMode === "black" ? "bg-emerald-400/20 text-emerald-300" : "bg-emerald-100 text-emerald-700")
                              : (themeMode === "black" ? "bg-amber-400/20 text-amber-300" : "bg-amber-100 text-amber-700")
                              }`}>
                              {activeModel?.badge || "Model"}
                            </span>
                          </>
                        );
                      })()}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {modelsLoading && <span className="w-3 h-3 border border-neutral-500 border-t-transparent rounded-full animate-spin" />}
                      <ChevronDown size={14} className={`text-neutral-500 transition duration-300 ${modelDropdownOpen ? "rotate-180 text-neutral-200" : ""}`} />
                    </div>
                  </button>

                  {/* Model Dropdown List — Categorized */}
                  {modelDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => { setModelDropdownOpen(false); setModelsSearch(""); }} />
                      <div className={`absolute left-0 mt-2 rounded-xl border shadow-2xl z-50 overflow-hidden ${themeMode === "black"
                        ? "border-neutral-800 bg-[#090909]/98 backdrop-blur-md"
                        : "border-neutral-200 bg-white shadow-xl"
                        }`} style={{ width: "360px" }}>

                        {/* Header + Search */}
                        <div className={`px-3 py-2.5 border-b ${themeMode === "black" ? "border-neutral-800" : "border-neutral-100"}`}>
                          <div className={`text-[9px] font-black tracking-widest uppercase mb-2 ${themeMode === "black" ? "text-neutral-500" : "text-neutral-400"}`}>
                            Select AI Brain Model
                          </div>
                          <input
                            type="text"
                            value={modelsSearch}
                            onChange={e => setModelsSearch(e.target.value)}
                            placeholder="Search models..."
                            autoFocus
                            className={`w-full text-xs px-3 py-1.5 rounded-lg border outline-none font-medium ${themeMode === "black"
                              ? "bg-neutral-900 border-neutral-700 text-neutral-200 placeholder-neutral-600"
                              : "bg-neutral-50 border-neutral-200 text-neutral-800 placeholder-neutral-400"
                              }`}
                          />
                        </div>

                        {/* Dynamic Categorized Model List — from OpenRouter */}
                        <div className="max-h-[420px] overflow-y-auto p-2 space-y-3">
                          {(() => {
                            const allModels = modelsList.length > 0 ? modelsList : FALLBACK_MODELS;
                            const filtered = allModels.filter((m: any) =>
                              !modelsSearch ||
                              m.name.toLowerCase().includes(modelsSearch.toLowerCase()) ||
                              m.id.toLowerCase().includes(modelsSearch.toLowerCase())
                            );

                            if (filtered.length === 0) {
                              return <div className={`text-center py-6 text-xs ${themeMode === "black" ? "text-neutral-600" : "text-neutral-400"}`}>No models found</div>;
                            }

                            const isThinking = (id: string) => id.includes("deepseek-r1") || id.includes("qwen3") || id.includes("thinking") || id.includes("-r1");
                            const cats = [
                              { label: "🚀 Fast & Free", desc: "Quick answers", color: "emerald", filter: (m: any) => m.isFree && !isThinking(m.id) && (m.id.includes("llama") || m.id.includes("mistral") || m.id.includes("gemma") || m.id.includes("hermes") || m.id.includes("phi") || m.id.includes("command")) },
                              { label: "⚡ Reasoning", desc: "Shows thinking — use with Brain Trust", color: "amber", filter: (m: any) => isThinking(m.id) },
                              { label: "🌐 Other Free", desc: "More free models", color: "violet", filter: (m: any) => m.isFree && !isThinking(m.id) && !m.id.includes("llama") && !m.id.includes("mistral") && !m.id.includes("gemma") && !m.id.includes("hermes") && !m.id.includes("phi") && !m.id.includes("command") },
                              { label: "💎 Premium", desc: "Paid — fastest & most capable", color: "blue", filter: (m: any) => !m.isFree },
                            ];
                            const cMap: Record<string, string> = { emerald: themeMode === "black" ? "text-emerald-400" : "text-emerald-600", amber: themeMode === "black" ? "text-amber-400" : "text-amber-600", violet: themeMode === "black" ? "text-violet-400" : "text-violet-600", blue: themeMode === "black" ? "text-blue-400" : "text-blue-600" };
                            const bMap: Record<string, string> = { emerald: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20", amber: "bg-amber-500/15 text-amber-400 border-amber-500/20", violet: "bg-violet-500/15 text-violet-400 border-violet-500/20", blue: "bg-blue-500/15 text-blue-400 border-blue-500/20" };

                            return cats.map((cat) => {
                              const catModels = filtered.filter(cat.filter);
                              if (catModels.length === 0) return null;
                              const bgMap: Record<string, string> = {
                                emerald: themeMode === "black" ? "bg-emerald-500/8 border-emerald-500/15" : "bg-emerald-50/80 border-emerald-200",
                                amber: themeMode === "black" ? "bg-amber-500/8 border-amber-500/15" : "bg-amber-50/80 border-amber-200",
                                violet: themeMode === "black" ? "bg-violet-500/8 border-violet-500/15" : "bg-violet-50/80 border-violet-200",
                                blue: themeMode === "black" ? "bg-blue-500/8 border-blue-500/15" : "bg-blue-50/80 border-blue-200",
                              };
                              return (
                                <div key={cat.label} className={`rounded-xl border overflow-hidden ${bgMap[cat.color]}`}>
                                  <div className={`px-3 py-2 flex items-center gap-2 border-b ${themeMode === "black" ? "border-white/5 bg-black/20" : "border-black/5 bg-white/40"}`}>
                                    <span className={`text-[11px] font-black tracking-wide ${cMap[cat.color]}`}>{cat.label}</span>
                                    <span className={`text-[9px] ${themeMode === "black" ? "text-neutral-600" : "text-neutral-400"}`}>— {cat.desc}</span>
                                    <span className={`ml-auto text-[9px] px-1.5 py-0.5 rounded-full font-bold ${bMap[cat.color]}`}>{catModels.length}</span>
                                  </div>
                                  <div className="p-1 space-y-0.5">
                                    {catModels.map((model: any) => {
                                      const isSel = selectedModelId === model.id;
                                      return (
                                        <button key={model.id} type="button"
                                          onClick={() => { handleModelChange(model.id); setModelDropdownOpen(false); setModelsSearch(""); }}
                                          className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg transition duration-150 text-left ${isSel
                                            ? themeMode === "black" ? "bg-white/10 border border-white/15 text-white" : "bg-white border border-neutral-300 shadow-sm text-neutral-900"
                                            : themeMode === "black" ? "text-neutral-300 hover:bg-white/[0.06] hover:text-white" : "text-neutral-700 hover:bg-white/80 hover:text-neutral-900"}`}
                                        >
                                          <div className="flex items-center gap-2.5 min-w-0">
                                            <span className="text-base flex-shrink-0">{model.icon || "✨"}</span>
                                            <div className="min-w-0">
                                              <div className={`text-[12px] font-bold truncate ${isSel ? (themeMode === "black" ? "text-white" : "text-neutral-900") : ""}`}>{model.name}</div>
                                              <div className={`text-[9px] truncate font-mono ${themeMode === "black" ? "text-neutral-600" : "text-neutral-400"}`}>{model.id}</div>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-1.5 flex-shrink-0">
                                            {!model.isFree && <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${themeMode === "black" ? "bg-yellow-500/15 text-yellow-400 border border-yellow-500/20" : "bg-yellow-50 text-yellow-600 border border-yellow-200"}`}>💳</span>}
                                            {isSel && <span className={`w-2 h-2 rounded-full flex-shrink-0 ${themeMode === "black" ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" : "bg-emerald-500"}`} />}
                                          </div>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            });
                          })()}
                        </div>

                        {/* Footer hint */}
                        <div className={`px-3 py-2 border-t text-[9px] ${themeMode === "black" ? "border-neutral-800 text-neutral-600" : "border-neutral-100 text-neutral-400"}`}>
                          ⚡ Reasoning models best used with Brain Trust mode
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div >

              {/* Settings Row (Brain Trust + Board Size) */}
              < div className="flex items-center justify-between md:justify-end gap-3 border-t border-dashed md:border-t-0 pt-1.5 md:pt-0 mt-0.5 md:mt-0 flex-shrink-0" style={{ borderColor: themeMode === "black" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)" }
              }>
                <span className={`text-[8px] sm:text-[9px] font-black uppercase tracking-wider md:hidden ${themeMode === "black" ? "text-neutral-500" : "text-neutral-400"
                  }`}>Cooperative Board:</span>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleBrainTrustToggle(!isBrainTrust)}
                    disabled={isLoading || isFileParsing}
                    className={`flex items-center gap-1 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl border text-[9px] sm:text-xs font-black uppercase tracking-wider transition-all duration-300 ${isBrainTrust
                      ? "bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-rose-500/20 border-amber-500/50 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                      : themeMode === "black"
                        ? "bg-neutral-900/40 border-neutral-800 text-neutral-500"
                        : "bg-white border-neutral-200 text-neutral-500 shadow-sm"
                      }`}
                  >
                    <span>🧠 Board: {isBrainTrust ? "ON" : "OFF"}</span>
                    <div className={`w-1.5 h-1.5 rounded-full ${isBrainTrust ? "bg-red-500 animate-pulse" : "bg-neutral-700"}`} />
                  </button>
                  {isBrainTrust && (
                    <select
                      value={boardSize}
                      onChange={(e) => setBoardSize(Number(e.target.value))}
                      className={`px-1.5 py-0.5 text-[8px] sm:text-[10px] font-black uppercase rounded-full border transition-all duration-300 outline-none ${themeMode === "black"
                        ? "bg-neutral-950 border-neutral-800 text-neutral-400"
                        : "bg-white border-neutral-200 text-neutral-600 shadow-sm"
                        }`}
                    >
                      <option value={3}>3 Ag</option>
                      <option value={5}>5 Ag</option>
                      <option value={9}>9 Ag</option>
                      <option value={16}>16 Ag</option>
                    </select>
                  )}
                </div>
              </div >
            </div >
          </div > {/* end control bar wrapper */}

          {/* Scrollable Conversation area */}
          <div
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 sm:p-6 md:p-8 space-y-6 relative"
          >
            {/* Custom Pull-to-Refresh Indicator */}
            {pullDistance > 0 && (
              <div
                className="w-full flex items-center justify-center overflow-hidden transition-all duration-75 pointer-events-none sticky top-0 z-50"
                style={{
                  height: `${pullDistance}px`,
                  opacity: Math.min(1, pullDistance / 50)
                }}
              >
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${themeMode === "black"
                  ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.2)]"
                  : "bg-emerald-50 border-emerald-300 text-emerald-800 shadow-sm"
                  }`}>
                  {isPullRefreshing ? (
                    <span className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                      Refreshing...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <span
                        className="text-xs transition-transform duration-75"
                        style={{ transform: `rotate(${pullDistance * 4.5}deg)` }}
                      >
                        🌶️
                      </span>
                      <span>{pullDistance > 65 ? "Release to Refresh" : "Pull to Refresh"}</span>
                    </span>
                  )}
                </div>
              </div>
            )}
            {messages.length === 0 ? (
              /* Welcome / Onboarding Screen */
              <div className="max-w-2xl mx-auto pt-8 pb-12 flex flex-col items-center justify-center text-center relative">
                <div className="relative group mb-8">
                  {/* Dynamic concentric glowing halos */}
                  <div className="absolute -inset-4 rounded-full opacity-40 blur-2xl group-hover:opacity-60 transition duration-1000 animate-pulse" style={{ background: `radial-gradient(circle, ${aiColor}88, transparent)` }}></div>
                  <div className="absolute -inset-1 rounded-full opacity-70 blur-lg group-hover:opacity-95 transition duration-1000 animate-pulse" style={{ background: `radial-gradient(circle, ${aiColor}55, transparent)` }}></div>
                  <div className={`relative p-2.5 rounded-full border shadow-[0_8px_32px_rgba(0,0,0,0.3)] flex items-center justify-center transition-colors duration-300 ${themeMode === "black" ? "bg-white/[0.02] border-white/[0.08]" : "bg-black/[0.01] border-neutral-200/50 shadow-[0_8px_32px_rgba(0,0,0,0.02)]"
                    }`}>
                    <AIAvatar size={80} className={`border ${themeMode === "black" ? "border-white/[0.08]" : "border-neutral-200"}`} />
                  </div>
                </div>

                <h2 className={`text-2xl sm:text-3xl font-extrabold mt-4 tracking-tight transition-colors duration-300 ${themeMode === "black"
                  ? "bg-clip-text text-transparent bg-gradient-to-b from-white via-neutral-100 to-neutral-400"
                  : "text-neutral-900"
                  }`}>
                  {aiName}:{" "}
                  <span className={`font-semibold transition-colors duration-300 ${themeMode === "black" ? "text-emerald-400" : "text-emerald-600"}`}>
                    {(allAgents.find((a) => a.id === selectedAgentId) || allAgents[0])?.banglaName || "Specialist"}
                  </span>
                </h2>
                <p className={`mt-4 leading-relaxed max-w-xl text-xs sm:text-sm font-medium transition-colors duration-300 ${themeMode === "black" ? "text-neutral-400" : "text-neutral-500"
                  }`}>
                  {(allAgents.find((a) => a.id === selectedAgentId) || allAgents[0])?.banglaDesc || "কুদ্দুস আলীর ২০+ বছরের বাস্তব বিজনেস অভিজ্ঞতার আলোকে যেকোনো আইডিয়া যাচাই করুন।"}
                </p>

                {/* Warning box — agent-specific contextual hint */}
                {(() => {
                  const agentWarnings: Record<string, { text: React.ReactNode }> = {
                    "daily-innovation-idea-agent": {
                      text: <>● <strong>Idea Agent Tip:</strong> Specify your <strong>target country, industry, and budget range</strong> for highly relevant business ideas.</>
                    },
                    "personal-cfo-finance-agent": {
                      text: <>● <strong>CFO Agent Tip:</strong> Share your <strong>current revenue, monthly expenses, and business stage</strong> for accurate financial advice.</>
                    },
                    "research-agent": {
                      text: <>● <strong>Research Agent Tip:</strong> Mention the <strong>specific industry, geography, and time frame</strong> you want researched.</>
                    },
                    "competitor-spy-agent": {
                      text: <>● <strong>Competitor Intel Tip:</strong> Paste <strong>competitor names or URLs</strong> and your target market for a sharp teardown.</>
                    },
                    "project-manager-agent": {
                      text: <>● <strong>PM Agent Tip:</strong> Describe your <strong>project scope, team size, and deadline</strong> for a precise sprint plan.</>
                    },
                    "code-helper-developer-agent": {
                      text: <>● <strong>CTO Agent Tip:</strong> Share your <strong>tech stack, codebase context, or paste the code</strong> you need reviewed or built.</>
                    },
                    "devmind-agent": {
                      text: <>● <strong>DevMind Tip:</strong> Paste your <strong>code, error message, or describe the architecture</strong> — the more context, the sharper the analysis.</>
                    },
                    "general-purpose-agent": {
                      text: <>● <strong>General AI:</strong> Ask <strong>anything</strong> — write, code, translate, explain, summarize, brainstorm. No topic limits.</>
                    },
                    "sales-lead-generator": {
                      text: <>● <strong>Sales Agent Tip:</strong> Describe your <strong>product, target buyer persona, and current sales channel</strong> for a custom pipeline.</>
                    },
                    "content-creator-agent": {
                      text: <>● <strong>Content Agent Tip:</strong> Specify your <strong>platform (YouTube/TikTok/Blog), niche, and target audience</strong> for viral copy.</>
                    },
                    "social-media-manager": {
                      text: <>● <strong>Social Media Tip:</strong> Tell me your <strong>brand name, platform, and content goal</strong> (awareness / sales / engagement).</>
                    },
                    "legal-compliance-agent": {
                      text: <>● <strong>Legal Agent Tip:</strong> Specify your <strong>country/jurisdiction and contract type</strong> for legally accurate advice.</>
                    },
                    "hr-recruiting-agent": {
                      text: <>● <strong>HR Agent Tip:</strong> Share the <strong>role, seniority level, and key skills required</strong> for a precise JD and interview kit.</>
                    },
                    "investor-pitch-agent": {
                      text: <>● <strong>Pitch Agent Tip:</strong> Describe your <strong>startup, business model, traction, and target funding round</strong> for a VC-ready pitch.</>
                    },
                    "performance-marketer-agent": {
                      text: <>● <strong>Performance Marketer Tip:</strong> Share your <strong>current ad budget, platform, and target CPA/ROAS</strong> for optimized campaigns.</>
                    },
                    "it-automation-consultant": {
                      text: <>● <strong>Automation Tip:</strong> List the <strong>manual processes or tools you currently use</strong> — I&apos;ll find what to automate first.</>
                    },
                    "pain-point-scraper-agent": {
                      text: <>● <strong>Pain-Point Scraper Tip:</strong> Give me a <strong>specific niche or industry</strong> — the more specific, the more actionable the complaints I find.</>
                    },
                  };

                  const activeAgent = allAgents.find((a) => a.id === selectedAgentId);
                  const warningData = agentWarnings[selectedAgentId];
                  // For custom agents, show a generic helpful tip
                  const warningText = warningData?.text ?? (
                    activeAgent?.isCustom
                      ? <>● <strong>Custom Agent Tip:</strong> Provide as much <strong>context about your specific situation</strong> as possible for the best results.</>
                      : <>● <strong>Tip:</strong> The more context you provide, the sharper and more actionable the response will be.</>
                  );

                  return (
                    <div className={`mt-6 w-full p-4 rounded-xl border text-xs flex items-center gap-2.5 justify-center shadow-sm transition duration-300 ${themeMode === "black"
                      ? "border-amber-500/25 bg-amber-500/5 text-amber-200 shadow-[0_0_20px_rgba(245,158,11,0.04)]"
                      : "border-amber-200 bg-amber-500/10 text-amber-955 shadow-[0_0_15px_rgba(245,158,11,0.05)] font-semibold"
                      }`}>
                      <Sparkles size={14} className={`flex-shrink-0 animate-pulse ${themeMode === "black" ? "text-neutral-200" : "text-amber-700"}`} />
                      <span>{warningText}</span>
                    </div>
                  );
                })()}

                {/* Prompt Suggestions Grid */}
                <div className="mt-10 w-full text-left">
                  <div className={`flex items-center gap-2.5 mb-4 border-b pb-3 ${themeMode === "black" ? "border-neutral-900" : "border-neutral-200"
                    }`}>
                    <span className={`text-xs font-black uppercase tracking-widest ${themeMode === "black" ? "text-neutral-200" : "text-neutral-850"
                      }`}>
                      Select a Case / Consultation Prompt
                    </span>

                    <div className="relative flex items-center justify-center">
                      {/* Concentric glowing ping wave */}
                      {!isGeneratingPrompts && (
                        <span className="absolute inline-flex h-6 w-6 rounded-full bg-amber-500/40 animate-ping pointer-events-none"></span>
                      )}

                      <button
                        type="button"
                        onClick={handleGeneratePrompts}
                        disabled={isGeneratingPrompts}
                        title="Generate New AI Consultation Cases"
                        className={`relative z-10 p-2 rounded-full border transition-all duration-300 hover:scale-115 active:scale-90 ${isGeneratingPrompts
                          ? "opacity-50 cursor-not-allowed"
                          : themeMode === "black"
                            ? "bg-amber-500/20 border-amber-500 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.35)] hover:shadow-[0_0_22px_rgba(245,158,11,0.6)] hover:border-amber-400"
                            : "bg-amber-500/15 border-amber-500/50 text-amber-700 shadow-[0_0_12px_rgba(245,158,11,0.2)] hover:shadow-[0_0_18px_rgba(245,158,11,0.45)] hover:border-amber-600"
                          }`}
                      >
                        {isGeneratingPrompts ? (
                          <Loader2 size={13} className="animate-spin text-amber-500" />
                        ) : (
                          <Sparkles size={13} className="text-amber-500" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {isGeneratingPrompts && (allAgents.find(a => a.id === selectedAgentId)?.isCustom) && !customSuggestions[selectedAgentId] ? (
                      [1, 2, 3, 4].map(i => (
                        <div key={i} className={`p-5 rounded-2xl border animate-pulse ${themeMode === "black" ? "border-neutral-800 bg-[#0c0c0c]/80" : "border-neutral-200 bg-white"}`}>
                          <div className={`h-3 w-20 rounded mb-3 ${themeMode === "black" ? "bg-neutral-800" : "bg-neutral-200"}`}></div>
                          <div className={`h-4 w-3/4 rounded mb-2 ${themeMode === "black" ? "bg-neutral-800" : "bg-neutral-200"}`}></div>
                          <div className={`h-3 w-full rounded mb-1 ${themeMode === "black" ? "bg-neutral-800" : "bg-neutral-200"}`}></div>
                          <div className={`h-3 w-2/3 rounded ${themeMode === "black" ? "bg-neutral-800" : "bg-neutral-200"}`}></div>
                        </div>
                      ))
                    ) : (customSuggestions[selectedAgentId] || ((allAgents.find((a) => a.id === selectedAgentId) || allAgents[0])?.suggestions || [])).map((suggestText, sIdx) => {
                      const isObj = typeof suggestText === "object" && suggestText !== null;
                      const cardTitle = isObj ? (suggestText as any).title : "Consultation Scenario";
                      const cardPrompt = isObj ? (suggestText as any).prompt : String(suggestText);
                      const cardTag = isObj ? (suggestText as any).tag : "Strategy";
                      const cardLevel = isObj ? (suggestText as any).level : "Intermediate";

                      const levelColors: Record<string, string> = {
                        "Beginner": "bg-green-500/10 text-green-400 border-green-500/20",
                        "Intermediate": "bg-blue-500/10 text-blue-400 border-blue-500/20",
                        "Advanced": "bg-purple-500/10 text-purple-400 border-purple-500/20",
                        "Expert": "bg-rose-500/10 text-rose-400 border-rose-500/20",
                      };

                      return (
                        <button
                          key={sIdx}
                          onClick={() => handleQuickSuggest(cardPrompt)}
                          className={`relative p-5 text-left rounded-2xl border transition-all duration-300 text-xs leading-relaxed hover:scale-[1.01] hover:-translate-y-0.5 active:scale-[0.99] flex flex-col justify-between gap-4 group overflow-hidden ${themeMode === "black"
                            ? "border-neutral-800 bg-[#0c0c0c]/80 hover:border-amber-500/40 text-neutral-300 hover:shadow-[0_0_20px_rgba(245,158,11,0.06)]"
                            : "border-neutral-250 hover:border-amber-500/35 bg-white hover:bg-neutral-50 text-neutral-600 hover:text-neutral-900 hover:shadow-lg"
                            }`}
                        >
                          <div className="absolute top-0 right-0 w-28 h-28 bg-amber-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-amber-500/10 transition-all duration-500"></div>

                          <div className="flex items-center justify-between w-full relative z-10">
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border tracking-wide ${themeMode === "black" ? "bg-neutral-950 border-neutral-850 text-neutral-400" : "bg-neutral-50 border-neutral-200 text-neutral-550"
                              }`}>
                              🏷️ {cardTag}
                            </span>
                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border tracking-wider ${levelColors[cardLevel] || "bg-blue-500/10 text-blue-400 border-blue-500/20"}`}>
                              {cardLevel}
                            </span>
                          </div>

                          <div className="relative z-10 space-y-1.5 flex-1">
                            <h4 className={`text-[12px] font-black tracking-wide ${themeMode === "black" ? "text-neutral-100 group-hover:text-amber-400" : "text-neutral-950 group-hover:text-amber-850"
                              } transition-colors duration-300`}>
                              {cardTitle}
                            </h4>
                            <p className={`text-[11px] leading-relaxed line-clamp-3 ${themeMode === "black" ? "text-neutral-400 group-hover:text-neutral-300" : "text-neutral-500 group-hover:text-neutral-755"
                              } transition-colors duration-350`}>
                              &ldquo;{cardPrompt}&rdquo;
                            </p>
                          </div>

                          <div className={`text-[9px] font-black tracking-widest uppercase flex items-center gap-1.5 transition-all duration-300 group-hover:text-amber-400 ${themeMode === "black" ? "text-neutral-600" : "text-neutral-400"
                            }`}>
                            <span>Activate Case</span>
                            <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Add Custom Suggestion Prompt Widget */}
                  <div className={`mt-5 p-3 rounded-xl border flex items-center gap-2 ${themeMode === "black"
                    ? "bg-neutral-950/40 border-neutral-900"
                    : "bg-[#F8FAFC] border-neutral-200"
                    }`}>
                    <input
                      type="text"
                      placeholder="Type and add a custom case prompt to this list dynamically..."
                      value={customPromptText}
                      onChange={(e) => setCustomPromptText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddCustomPrompt();
                        }
                      }}
                      className={`flex-1 text-xs bg-transparent border-0 outline-none focus:ring-0 px-2 ${themeMode === "black" ? "text-neutral-200 placeholder-neutral-700" : "text-neutral-800 placeholder-neutral-400"
                        }`}
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomPrompt}
                      disabled={!customPromptText.trim()}
                      className={`text-[10px] font-extrabold px-3 py-2 rounded-lg border transition-all duration-300 uppercase tracking-wider ${themeMode === "black"
                        ? "bg-neutral-900 border-neutral-800 text-neutral-300 hover:border-neutral-700 hover:text-neutral-100 disabled:opacity-40"
                        : "bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50 hover:text-neutral-800 disabled:opacity-40"
                        }`}
                    >
                      ➕ Add Case
                    </button>
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
                        <AIAvatar size={36} className={`flex-shrink-0 border ${themeMode === "black" ? "border-white/10" : "border-neutral-200"}`} />
                        <div className="flex flex-col gap-1.5 flex-1 min-w-0 overflow-hidden group/msg relative">
                          <span className="text-xs font-black tracking-wider flex items-center gap-1.5" style={{ color: aiColor }}>
                            {aiName.toUpperCase()}
                          </span>
                          <div className={`border rounded-2xl rounded-tl-none px-4 sm:px-6 py-4 sm:py-5 leading-relaxed text-sm shadow-md backdrop-blur-md prose prose-sm max-w-full w-full overflow-hidden relative transition-colors duration-300 ${themeMode === "black"
                            ? "bg-gradient-to-br from-[#0F0F0F] to-[#0A0A0A] border-white/5 text-neutral-200 prose-invert"
                            : "bg-gradient-to-br from-[#FFFFFF] to-[#F8FAFC] border-neutral-200/80 text-neutral-800 shadow-md prose-neutral"
                            }`}>
                            {msg.content ? (() => {
                              const { thought, content: finalContent } = parseThoughtAndContent(msg.content);
                              const isMessageLast = index === messages.length - 1;
                              const showSpinner = isMessageLast && isLoading && !finalContent;

                              // If streaming has finished but finalContent is empty, fallback to show thoughts so it is not blank
                              const contentToRender = finalContent || ((!isLoading || !isMessageLast) ? thought : "");

                              return (
                                <div className="w-full max-w-full overflow-hidden break-words [&_*]:max-w-full [&_pre]:overflow-x-auto [&_code]:break-all [&_p]:break-words [&_li]:break-words">
                                  {showSpinner ? (
                                    // Show a clean, premium spinner while generating, hiding raw internal thoughts
                                    <div className="flex items-center gap-2.5 py-2.5">
                                      <Loader2 size={16} className="animate-spin text-amber-500" />
                                      <span className={`text-xs font-black tracking-wider uppercase animate-pulse ${themeMode === "black" ? "text-neutral-400" : "text-neutral-500"
                                        }`}>
                                        Specialist is preparing response...
                                      </span>
                                    </div>
                                  ) : (
                                    <ReactMarkdown
                                      remarkPlugins={[remarkGfm]}
                                      components={{
                                        blockquote({ node, children, ...props }) {
                                          return (
                                            <blockquote
                                              className={`relative my-6 px-5 py-4 rounded-xl border-l-[3px] ${themeMode === "black"
                                                ? "bg-[#0a0a0a]/80 border-amber-500 text-amber-300 shadow-[0_0_25px_rgba(245,158,11,0.15)] ring-1 ring-white/5"
                                                : "bg-amber-500/5 border-amber-500 text-amber-900 shadow-md ring-1 ring-black/5"
                                                } font-mono text-[11px] sm:text-xs tracking-wide leading-relaxed overflow-hidden backdrop-blur-md [&>p]:m-0 [&>p]:mb-1.5 last:[&>p]:mb-0`}
                                              {...props}
                                            >
                                              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-amber-500/10 to-transparent pointer-events-none rounded-r-xl"></div>
                                              <div className="absolute -left-[3px] top-1/4 w-[3px] h-1/2 bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.8)] animate-pulse rounded-r"></div>
                                              <div className="relative z-10">
                                                {children}
                                              </div>
                                            </blockquote>
                                          );
                                        },
                                        code({ node, className, children, ...props }) {
                                          const match = /language-(\w+)/.exec(className || "");
                                          const lang = match ? match[1] : "";
                                          const codeString = String(children).replace(/\n$/, "");

                                          if (lang === "mermaid") {
                                            return <MermaidDiagram chart={codeString} />;
                                          }
                                          if (lang === "pdf") {
                                            return <PDFArtifactCard content={codeString} />;
                                          }
                                          if (lang === "word" || lang === "docx") {
                                            return <WordArtifactCard content={codeString} />;
                                          }
                                          if (lang === "excel" || lang === "csv") {
                                            return <ExcelArtifactCard content={codeString} />;
                                          }

                                          return (
                                            <code className={className} {...props}>
                                              {children}
                                            </code>
                                          );
                                        }
                                      }}
                                    >
                                      {cleanArrows(contentToRender)}
                                    </ReactMarkdown>
                                  )}
                                </div>
                              );
                            })() : (
                              // Only show loading indicator if this is the last message AND still loading
                              (index === messages.length - 1 && isLoading)
                                ? <DynamicLoadingIndicator themeMode={themeMode} agentId={selectedAgentId} />
                                : null
                            )}
                          </div>
                          {msg.content && (
                            <div className="flex justify-start items-center gap-1 flex-wrap">
                              <button
                                type="button"
                                onClick={() => copyToClipboard(msg.content, `msg-${index}`)}
                                className={`opacity-75 hover:opacity-100 focus:opacity-100 transition-opacity p-1 mt-1 rounded-md border flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 shadow-inner ${themeMode === "black"
                                  ? "bg-[#0F0F0F] border-white/5 text-neutral-400 hover:text-neutral-200"
                                  : "bg-white border-neutral-200 text-neutral-500 hover:text-neutral-800 shadow-sm"
                                  }`}
                                title="Copy response"
                              >
                                {copiedId === `msg-${index}` ? (
                                  <>
                                    <Check size={11} className="text-emerald-400" />
                                    <span className="text-emerald-400 font-extrabold">COPIED</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy size={11} />
                                    <span>COPY RESPONSE</span>
                                  </>
                                )}
                              </button>

                              {/* Regenerate — only on last assistant message */}
                              {index === messages.length - 1 && !isLoading && (
                                <button
                                  type="button"
                                  onClick={handleRegenerate}
                                  className={`opacity-75 hover:opacity-100 transition-opacity p-1 mt-1 rounded-md border flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 shadow-inner ${themeMode === "black"
                                    ? "bg-[#0F0F0F] border-white/5 text-neutral-400 hover:text-violet-400 hover:border-violet-500/20"
                                    : "bg-white border-neutral-200 text-neutral-500 hover:text-violet-600 shadow-sm"
                                    }`}
                                  title="Regenerate response"
                                >
                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>
                                  <span>REGENERATE</span>
                                </button>
                              )}

                              {/* 👍👎 Quality Rating */}
                              {!isLoading && msg.content && msg.content.length > 50 && (
                                <div className="flex items-center gap-0.5 mt-1 ml-1">
                                  <button
                                    type="button"
                                    onClick={() => handleRateMessage(index, "up")}
                                    title="Good response"
                                    className={`p-1 rounded transition-all text-[13px] hover:scale-110 active:scale-95 ${messageRatings[index] === "up" ? "opacity-100" : "opacity-35 hover:opacity-80"}`}
                                  >👍</button>
                                  <button
                                    type="button"
                                    onClick={() => handleRateMessage(index, "down")}
                                    title="Poor response — will trigger regeneration"
                                    className={`p-1 rounded transition-all text-[13px] hover:scale-110 active:scale-95 ${messageRatings[index] === "down" ? "opacity-100" : "opacity-35 hover:opacity-80"}`}
                                  >👎</button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }

                  // User's message
                  const base64GlobalRegex = /\[IMAGE_BASE64:(data:image\/[^\]]+)\]/g;
                  const imageUrls: string[] = [];
                  if (msg.content) {
                    let match;
                    base64GlobalRegex.lastIndex = 0;
                    while ((match = base64GlobalRegex.exec(msg.content)) !== null) {
                      imageUrls.push(match[1]);
                    }
                  }

                  // Beautifully clean raw message contents to hide internal developer/OCR debug tags from user screen
                  let cleanContent = "";
                  if (msg.content) {
                    const withoutBase64 = msg.content.replace(base64GlobalRegex, "").trim();

                    // Bulletproof case-insensitive match for the User Prompt tag
                    const promptMatch = withoutBase64.match(/User Prompt:\s*([\s\S]*)$/i);
                    if (promptMatch) {
                      const extractedPrompt = promptMatch[1].trim();
                      if (extractedPrompt === "Please analyze the extracted text above based on your specialized agent role." ||
                        extractedPrompt === "Please analyze the extracted documents above based on your specialized agent role.") {
                        const docMatches = withoutBase64.match(/\[ATTACHED DOCUMENT:\s*([^\]]+)\]/gi);
                        const count = docMatches ? docMatches.length : 1;
                        cleanContent = `📎 ${count} Document(s) analyzed`;
                      } else {
                        cleanContent = extractedPrompt;
                      }
                    } else {
                      // Fallback to strip other internal brackets if they exist
                      cleanContent = withoutBase64;
                    }
                  }

                  // Parse attached documents dynamically to support direct client-side downloads!
                  const docMatches: { name: string; content: string }[] = [];
                  if (msg.content) {
                    const docRegex = /\[ATTACHED DOCUMENT:\s*([^\]]+)\]\s*\n\`\`\`([\s\S]*?)\`\`\`/gi;
                    let docM;
                    docRegex.lastIndex = 0;
                    while ((docM = docRegex.exec(msg.content)) !== null) {
                      docMatches.push({
                        name: docM[1],
                        content: docM[2].trim()
                      });
                    }
                  }

                  return (
                    <div key={index} className="flex gap-4 items-start justify-end animate-fade-in font-sans">
                      <div className="flex flex-col gap-1.5 items-end max-w-[80%] group/msg relative">
                        <span className={`text-[9px] font-black tracking-widest uppercase flex items-center gap-1.5 ${themeMode === "black" ? "text-neutral-500" : "text-neutral-450"}`}>
                          YOUR BUSINESS INQUIRY
                          {themeMode === "black" && <span className="w-1 h-1 bg-emerald-400 rounded-full animate-ping" />}
                        </span>
                        <div className={`border rounded-2xl rounded-tr-none px-5 py-4 text-sm flex flex-col items-end relative transition-all duration-300 shadow-lg ${themeMode === "black"
                          ? "bg-emerald-950/15 border-emerald-500/15 text-emerald-50/95"
                          : "bg-amber-500/10 border-amber-500/20 text-neutral-800 shadow-md"
                          }`}>
                          {imageUrls.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-3 max-w-full justify-end">
                              {imageUrls.map((url, imgIdx) => (
                                <div key={imgIdx} className={`relative rounded-xl overflow-hidden border group shadow-md max-w-[180px] sm:max-w-[220px] ${themeMode === "black" ? "border-white/10" : "border-neutral-200"
                                  }`}>
                                  <NextImage
                                    src={url}
                                    alt={`Uploaded visual context ${imgIdx + 1}`}
                                    width={220}
                                    height={160}
                                    className="max-h-40 max-w-full object-contain rounded-xl transition-transform duration-300 group-hover:scale-105"
                                  />
                                  {/* Glowing Hover Action Overlay with Download Icon */}
                                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2 z-10">
                                    <a
                                      href={url}
                                      download={`attached_image_${imgIdx + 1}.png`}
                                      className="p-2 bg-emerald-500 hover:bg-emerald-400 text-black rounded-lg transition duration-250 shadow-lg transform scale-90 group-hover:scale-100 flex items-center justify-center"
                                      title="Download Image"
                                    >
                                      <Download size={14} />
                                    </a>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          {cleanContent && (
                            <span className="text-left w-full block whitespace-pre-wrap">{cleanContent}</span>
                          )}

                          {/* Render Attached Documents for Direct Download */}
                          {docMatches.length > 0 && (
                            <div className="mt-3 w-full border-t border-dashed border-neutral-700/30 pt-3 flex flex-col gap-2">
                              <span className="text-[10px] font-extrabold text-neutral-400 tracking-widest uppercase block self-start">Embedded Documents</span>
                              <div className="flex flex-wrap gap-2 self-start w-full">
                                {docMatches.map((doc, docIdx) => {
                                  const downloadUri = `data:text/plain;charset=utf-8,${encodeURIComponent(doc.content)}`;
                                  return (
                                    <div key={docIdx} className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs w-full max-w-[260px] justify-between ${themeMode === "black" ? "bg-neutral-950/40 border-white/5" : "bg-white border-neutral-250 shadow-sm"
                                      }`}>
                                      <div className="flex items-center gap-2 truncate">
                                        <FileText size={14} className="text-emerald-400 flex-shrink-0 animate-pulse" />
                                        <span className="truncate font-semibold text-neutral-300" title={doc.name}>{doc.name}</span>
                                      </div>
                                      <a
                                        href={downloadUri}
                                        download={doc.name.endsWith(".txt") ? doc.name : `${doc.name}.txt`}
                                        className="p-1.5 bg-neutral-900 hover:bg-neutral-800 text-emerald-400 rounded-lg transition border border-white/5 flex items-center justify-center shadow-inner"
                                        title={`Download parsed ${doc.name}`}
                                      >
                                        <Download size={11} />
                                      </a>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                        {cleanContent && (
                          <div className="flex justify-end w-full gap-1">
                            {/* Edit button — only on user messages, not while loading */}
                            {!isLoading && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingMessageIndex(index);
                                  setEditingMessageText(cleanContent);
                                }}
                                className="opacity-70 hover:opacity-100 transition-opacity p-1 mt-1 rounded hover:bg-white/5 text-neutral-500 hover:text-amber-400 flex items-center gap-1 text-[10px] font-bold"
                                title="Edit message"
                              >
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                <span>Edit</span>
                              </button>
                            )}
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

                        {/* Inline edit box */}
                        {editingMessageIndex === index && (
                          <div className="mt-2 w-full">
                            <textarea
                              value={editingMessageText}
                              onChange={(e) => setEditingMessageText(e.target.value)}
                              className={`w-full text-xs rounded-xl border p-3 resize-none outline-none transition-colors ${themeMode === "black" ? "bg-neutral-900 border-white/10 text-neutral-200 focus:border-emerald-500/40" : "bg-white border-neutral-200 text-neutral-800 focus:border-emerald-400"}`}
                              rows={3}
                              autoFocus
                            />
                            <div className="flex gap-2 mt-1.5 justify-end">
                              <button
                                type="button"
                                onClick={() => { setEditingMessageIndex(null); setEditingMessageText(""); }}
                                className={`text-[10px] px-3 py-1 rounded-lg border font-bold transition-colors ${themeMode === "black" ? "border-white/10 text-neutral-400 hover:text-white" : "border-neutral-200 text-neutral-500 hover:text-neutral-800"}`}
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleEditMessage(index, editingMessageText)}
                                className="text-[10px] px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-black transition-colors"
                              >
                                Send Edit
                              </button>
                            </div>
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

                {/* 💡 Smart Suggestions — context-aware follow-up chips */}
                {!isLoading && smartSuggestions.length > 0 && messages.length > 0 && (
                  <div className="mt-3 mb-1 px-1">
                    <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${themeMode === "black" ? "text-neutral-600" : "text-neutral-400"}`}>
                      💡 Suggested follow-ups
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {smartSuggestions.map((suggestion, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setInputMessage(suggestion);
                            setSmartSuggestions([]);
                          }}
                          className={`text-[11px] px-3 py-1.5 rounded-full border transition-all duration-200 text-left hover:scale-[1.02] active:scale-95 ${themeMode === "black"
                            ? "border-violet-500/25 bg-violet-500/8 text-violet-300 hover:bg-violet-500/15 hover:border-violet-500/40"
                            : "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 hover:border-violet-300"
                            }`}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input Text Form Area */}
          <div className={`p-3 pb-6 sm:p-4 md:p-6 border-t transition-colors duration-300 ${themeMode === "black"
            ? "border-white/5 bg-gradient-to-t from-[#020202] to-black"
            : "border-neutral-200 bg-gradient-to-t from-[#F8FAFC] to-[#F1F5F9]"
            }`}>
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

              {/* API Key Exhausted Banner */}
              {apiBanner && (
                <ApiKeyBanner
                  type={apiBanner}
                  message={apiBannerMessage || undefined}
                  onDismiss={() => { setApiBanner(null); setApiBannerMessage(""); }}
                />
              )}

              <form
                id="chat-form"
                onSubmit={handleSubmit}
                className={`w-full relative rounded-2xl border transition-all duration-300 overflow-hidden backdrop-blur-md ${themeMode === "black"
                  ? "border-white/[0.04] bg-[#0A0A0C]/80 shadow-[0_4px_30px_rgba(0,0,0,0.7)] focus-within:border-emerald-500/30 focus-within:shadow-[0_0_40px_rgba(16,185,129,0.08)]"
                  : "border-neutral-200 bg-white/90 shadow-[0_5px_30px_rgba(0,0,0,0.03)] focus-within:border-emerald-500/25 focus-within:shadow-[0_0_30px_rgba(16,185,129,0.04)]"
                  }`}
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
                            setAttachedFiles((prev) => [
                              ...prev,
                              {
                                name: file.name,
                                content: parsedContent,
                                type: file.type || "image/png",
                              },
                            ]);
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
                  placeholder={(allAgents.find((a) => a.id === selectedAgentId) || allAgents[0])?.placeholder || "Describe your startup idea and which country/market you are targeting..."}
                  className={`w-full bg-transparent border-0 ring-0 focus:ring-0 focus:outline-none text-sm px-5 py-4 resize-none h-[64px] min-h-[50px] max-h-[200px] ${themeMode === "black"
                    ? "placeholder-neutral-600 text-neutral-200"
                    : "placeholder-neutral-400 text-neutral-800 font-medium"
                    }`}
                  disabled={isLoading}
                  onFocus={(e) => {
                    const target = e.currentTarget;
                    if (typeof window !== "undefined" && (window as any).triggerKachaResize) {
                      (window as any).triggerKachaResize();
                    }
                    setTimeout(() => {
                      target.closest("form")?.scrollIntoView({ behavior: "auto", block: "nearest" });
                      scrollToBottom();
                    }, 100);
                    setTimeout(() => {
                      target.closest("form")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
                      scrollToBottom();
                      if (typeof window !== "undefined" && (window as any).triggerKachaResize) {
                        (window as any).triggerKachaResize();
                      }
                    }, 300);
                  }}
                />

                {/* Attached file preview or parsing indicator */}
                {/* Attached files preview */}
                {attachedFiles.length > 0 && (
                  <div className="mx-5 my-2 flex flex-wrap gap-2.5">
                    {attachedFiles.map((att, attIdx) => {
                      const imageMatch = att.content.match(/\[IMAGE_BASE64:(data:image\/[^\]]+)\]/);
                      const isImage = !!imageMatch;
                      const imgSrc = imageMatch ? imageMatch[1] : "";

                      if (isImage) {
                        return (
                          <div key={attIdx} className="relative group/thumb w-14 h-14 rounded-xl border overflow-hidden shadow-md animate-fade-in flex-shrink-0" style={{ borderColor: themeMode === "black" ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)" }}>
                            <NextImage
                              src={imgSrc}
                              alt={att.name}
                              width={56}
                              height={56}
                              className="w-full h-full object-cover"
                            />
                            {/* Hover Overlay with Delete button */}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-all duration-200">
                              <button
                                type="button"
                                onClick={() => setAttachedFiles((prev) => prev.filter((_, idx) => idx !== attIdx))}
                                className="p-1 rounded-full bg-red-600/95 text-white hover:bg-red-700 hover:scale-110 transition duration-150"
                                title="Remove image"
                              >
                                <X size={10} />
                              </button>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div key={attIdx} className={`px-3 py-1.5 rounded-lg border text-xs flex items-center gap-2 max-w-[200px] shadow-sm animate-fade-in ${themeMode === "black"
                          ? "bg-gradient-to-r from-neutral-200/10 to-transparent border-neutral-200/15 text-white"
                          : "bg-[#FAFAFA] border-neutral-200 text-neutral-850"
                          }`}>
                          <FileText size={13} className="text-emerald-400 flex-shrink-0" />
                          <span className="truncate font-semibold flex-1">{att.name}</span>
                          <button
                            type="button"
                            onClick={() => setAttachedFiles((prev) => prev.filter((_, idx) => idx !== attIdx))}
                            className="p-0.5 text-neutral-400 hover:text-red-400 transition"
                            title="Remove file"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
                {isFileParsing && (
                  <div className={`mx-5 my-2 text-xs flex items-center gap-1.5 animate-pulse ${themeMode === "black" ? "text-neutral-500" : "text-neutral-450"
                    }`}>
                    <Loader2 size={12} className={`animate-spin ${themeMode === "black" ? "text-neutral-200" : "text-neutral-600"}`} />
                    <span>Parsing document data...</span>
                  </div>
                )}

                <div className={`flex items-center justify-between px-5 pb-3 border-t pt-2.5 transition-colors duration-300 ${themeMode === "black"
                  ? "bg-[#0D0D0D] border-neutral-900"
                  : "bg-[#FAFAFA] border-neutral-150"
                  }`}>
                  {/* Media tools */}
                  <div className="flex items-center gap-2">
                    {/* Hidden File Input */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept=".txt,.md,.csv,.json,.pdf,.docx,.xlsx,.xls,.png,.jpg,.jpeg,.webp"
                      className="hidden"
                      multiple
                    />

                    {/* Paperclip Button */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isLoading || isFileParsing}
                      title="Attach file (PDF, Word, Excel, Images, Text)"
                      className={`p-2 rounded-xl border transition duration-300 ${themeMode === "black"
                        ? "border-neutral-800 bg-neutral-900/40 text-neutral-400 hover:text-white hover:border-neutral-200/20"
                        : "border-neutral-200 bg-white text-neutral-500 hover:text-neutral-800 hover:border-neutral-300"
                        }`}
                    >
                      <Paperclip size={15} />
                    </button>

                    {/* Camera Button */}
                    <button
                      type="button"
                      onClick={startCamera}
                      disabled={isLoading || isFileParsing}
                      title="Take Photo"
                      className={`p-2 rounded-xl border transition duration-300 ${themeMode === "black"
                        ? "border-neutral-800 bg-neutral-900/40 text-neutral-400 hover:text-white hover:border-neutral-200/20"
                        : "border-neutral-200 bg-white text-neutral-500 hover:text-neutral-800 hover:border-neutral-300"
                        }`}
                    >
                      <Camera size={15} />
                    </button>

                    {/* Brain Trust Toggle */}
                    <div className="flex items-center gap-1.5 ml-2">
                      <button
                        type="button"
                        onClick={() => handleBrainTrustToggle(!isBrainTrust)}
                        disabled={isLoading || isFileParsing}
                        title="Executive Board: Massively Parallel Deep Analysis"
                        className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-black tracking-widest uppercase transition-all duration-300 ${isBrainTrust
                          ? "bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-rose-500/20 border-amber-500/50 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                          : themeMode === "black"
                            ? "bg-neutral-900/40 border-neutral-800 text-neutral-500 hover:text-neutral-300 hover:border-neutral-600"
                            : "bg-white border-neutral-200 text-neutral-500 hover:text-neutral-800 hover:border-neutral-300 shadow-sm"
                          }`}
                      >
                        <span>🧠 {boardSize}-Agent Board</span>
                        <div className={`w-2 h-2 rounded-full ${isBrainTrust ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,1)] animate-ping" : "bg-neutral-700"}`}></div>
                      </button>
                      {isBrainTrust && (
                        <select
                          value={boardSize}
                          onChange={(e) => setBoardSize(Number(e.target.value))}
                          className={`px-2 py-1 text-[9px] font-black uppercase rounded-full border transition-all duration-300 outline-none ${themeMode === "black"
                            ? "bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white"
                            : "bg-white border-neutral-200 text-neutral-600 hover:text-black shadow-sm"
                            }`}
                        >
                          <option value={3}>3 Agents</option>
                          <option value={5}>5 Agents</option>
                          <option value={9}>9 Agents</option>
                          <option value={16}>16 Agents</option>
                        </select>
                      )}
                    </div>

                    {/* Auto-Routing Toggle */}
                    <button
                      type="button"
                      onClick={() => setEnableAutoRouting((prev) => !prev)}
                      disabled={isLoading || isFileParsing}
                      title={enableAutoRouting ? "Auto-Routing ON: AI selects the best agent automatically" : "Auto-Routing OFF: Click to let AI pick the best agent"}
                      className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-[10px] font-black tracking-widest uppercase transition-all duration-300 ${enableAutoRouting
                        ? "bg-gradient-to-r from-violet-500/20 to-blue-500/20 border-violet-500/50 text-violet-400 shadow-[0_0_12px_rgba(139,92,246,0.25)]"
                        : themeMode === "black"
                          ? "bg-neutral-900/40 border-neutral-800 text-neutral-500 hover:text-violet-400 hover:border-violet-500/30"
                          : "bg-white border-neutral-200 text-neutral-500 hover:text-violet-600 hover:border-violet-200 shadow-sm"
                        }`}
                    >
                      <span>⚡ Auto</span>
                      <div className={`w-1.5 h-1.5 rounded-full ${enableAutoRouting ? "bg-violet-400 shadow-[0_0_6px_rgba(139,92,246,0.8)]" : "bg-neutral-700"}`}></div>
                    </button>

                    {/* Mic Button */}
                    <button
                      type="button"
                      onClick={toggleListening}
                      title={isListening ? "Stop listening" : "Dictate (Speech to Text)"}
                      className={`p-2 rounded-xl border transition duration-300 ${isListening
                        ? "bg-red-500/10 border-red-500/30 text-red-500 animate-pulse"
                        : themeMode === "black"
                          ? "border-neutral-800 bg-neutral-900/40 text-neutral-400 hover:text-red-400 hover:border-red-500/20"
                          : "border-neutral-200 bg-white text-neutral-500 hover:text-red-500 hover:border-red-200"
                        }`}
                    >
                      {isListening ? <MicOff size={15} /> : <Mic size={15} />}
                    </button>
                  </div>

                  <span className={`text-[10px] select-none hidden md:inline-flex items-center gap-1 ml-4 ${themeMode === "black" ? "text-neutral-600" : "text-neutral-400"
                    }`}>
                    <CornerDownLeft size={10} /> Press Enter to send consultation
                  </span>

                  {/* 🎯 Adaptive complexity indicator */}
                  {adaptiveProfile && (
                    <span className={`text-[9px] select-none hidden lg:inline-flex items-center gap-1 ml-2 px-2 py-0.5 rounded-full border ${adaptiveProfile.complexityLevel === "complex"
                      ? themeMode === "black" ? "border-violet-500/20 text-violet-500 bg-violet-500/5" : "border-violet-200 text-violet-600 bg-violet-50"
                      : adaptiveProfile.complexityLevel === "simple"
                        ? themeMode === "black" ? "border-emerald-500/20 text-emerald-500 bg-emerald-500/5" : "border-emerald-200 text-emerald-600 bg-emerald-50"
                        : themeMode === "black" ? "border-neutral-700 text-neutral-500" : "border-neutral-200 text-neutral-400"
                      }`}>
                      {adaptiveProfile.complexityLevel === "complex" ? "⚡ Expert mode" : adaptiveProfile.complexityLevel === "simple" ? "✓ Quick mode" : "◎ Standard"}
                    </span>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading || (!inputMessage.trim() && !attachedFile)}
                    className={`ml-auto p-2.5 rounded-xl flex items-center justify-center transition duration-300 ${isLoading || (!inputMessage.trim() && !attachedFile)
                      ? themeMode === "black"
                        ? "bg-neutral-900 text-neutral-600 cursor-not-allowed border border-neutral-900/40"
                        : "bg-neutral-100 text-neutral-450 cursor-not-allowed border border-neutral-200"
                      : themeMode === "black"
                        ? "bg-neutral-200 hover:bg-white hover:scale-105 active:scale-95 text-neutral-950 font-bold"
                        : "bg-neutral-900 hover:bg-black hover:scale-105 active:scale-95 text-white font-bold"
                      }`}
                  >
                    <Send size={15} />
                  </button>
                </div>
              </form>
            </div>
          </div>
        </main >
      </div >

      {/* Camera Modal Overlay */}
      {
        isCameraOpen && (
          <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${themeMode === "black" ? "bg-black/90 backdrop-blur-md" : "bg-neutral-900/60 backdrop-blur-sm"
            }`}>
            <div className={`relative w-full max-w-lg border rounded-3xl overflow-hidden shadow-2xl flex flex-col transition-all duration-300 ${themeMode === "black" ? "bg-[#0A0A0A] border-white/10" : "bg-white border-neutral-200"
              }`}>
              {/* Header */}
              <div className={`flex items-center justify-between p-4 border-b ${themeMode === "black" ? "border-white/5" : "border-neutral-150"
                }`}>
                <span className={`font-bold text-sm tracking-wide ${themeMode === "black" ? "text-white" : "text-neutral-850"}`}>Capture Photo</span>
                <button
                  onClick={stopCamera}
                  className={`transition ${themeMode === "black" ? "text-neutral-400 hover:text-white" : "text-neutral-500 hover:text-neutral-800"}`}
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
              <div className={`p-4 flex items-center justify-center border-t ${themeMode === "black" ? "border-white/5 bg-[#050505]" : "border-neutral-150 bg-[#FAFAFA]"
                }`}>
                <button
                  onClick={capturePhoto}
                  className={`group relative flex items-center justify-center w-16 h-16 rounded-full border-4 transition duration-300 ${themeMode === "black"
                    ? "bg-white/10 border-white/20 hover:border-white"
                    : "bg-black/5 border-neutral-300 hover:border-neutral-800"
                    }`}
                >
                  <div className={`w-12 h-12 rounded-full group-hover:scale-95 transition-transform duration-300 ${themeMode === "black" ? "bg-white" : "bg-neutral-800"
                    }`}></div>
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Settings / Manage Account Modal */}
      {
        isSettingsModalOpen && (
          <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in ${themeMode === "black" ? "bg-black/90 backdrop-blur-md" : "bg-neutral-900/60 backdrop-blur-sm"
            }`}>
            <div className={`relative w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col p-6 space-y-6 transition-all duration-300 border ${themeMode === "black" ? "bg-[#0A0A0A] border-white/10" : "bg-white border-neutral-200"
              }`}>
              {/* Header */}
              <div className={`flex items-center justify-between border-b pb-4 ${themeMode === "black" ? "border-white/5" : "border-neutral-150"
                }`}>
                <div className="flex items-center gap-2">
                  <Settings className="text-[#10b981]" size={20} />
                  <h2 className={`font-bold text-lg tracking-wide ${themeMode === "black" ? "text-white" : "text-neutral-850"}`}>Manage Account</h2>
                </div>
                <button
                  onClick={() => setIsSettingsModalOpen(false)}
                  className={`p-1 rounded-full transition ${themeMode === "black" ? "text-neutral-400 hover:text-white hover:bg-neutral-900" : "text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100"
                    }`}
                >
                  <X size={20} />
                </button>
              </div>

              {/* User Account Info */}
              <div className={`space-y-2 p-4 rounded-2xl border ${themeMode === "black" ? "bg-[#050505] border-neutral-900" : "bg-[#F8FAFC] border-neutral-200"
                }`}>
                <span className={`text-[10px] font-bold uppercase tracking-wider block ${themeMode === "black" ? "text-neutral-500" : "text-neutral-450"
                  }`}>Logged in as</span>
                <div className="flex items-center gap-3">
                  <UserButton />
                  <div className="flex flex-col text-left">
                    <span className={`text-sm font-bold truncate ${themeMode === "black" ? "text-neutral-200" : "text-neutral-800"
                      }`}>
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
                  <span className={`text-xs font-bold ${themeMode === "black" ? "text-neutral-400" : "text-neutral-500"}`}>Current File Attachments ({attachedFiles.length})</span>
                  {attachedFiles.length > 0 ? (
                    <div className="space-y-2">
                      {attachedFiles.map((att, attIdx) => (
                        <div key={attIdx} className={`flex items-center justify-between p-3 rounded-2xl text-xs border ${themeMode === "black" ? "bg-red-500/5 border-red-500/10" : "bg-red-500/10 border-red-200"
                          }`}>
                          <div className="flex items-center gap-2 truncate">
                            <FileText size={15} className="text-red-500 flex-shrink-0" />
                            <span className={`truncate font-semibold ${themeMode === "black" ? "text-neutral-200" : "text-neutral-805"}`}>{att.name}</span>
                          </div>
                          <button
                            onClick={() => {
                              if (confirm(`Remove file "${att.name}"?`)) {
                                setAttachedFiles((prev) => prev.filter((_, idx) => idx !== attIdx));
                              }
                            }}
                            className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl font-bold transition duration-300"
                          >
                            Delete File
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={`p-3 text-center rounded-2xl text-xs border ${themeMode === "black" ? "bg-neutral-900/30 border-neutral-900 text-neutral-500" : "bg-neutral-50 border-neutral-200 text-neutral-450"
                      }`}>
                      No file attached currently. You can attach a document using the clip icon in the chatbar.
                    </div>
                  )}
                </div>

                {/* 2. Delete All Conversations */}
                <div className="flex flex-col space-y-2 pt-2">
                  <span className={`text-xs font-bold ${themeMode === "black" ? "text-neutral-400" : "text-neutral-500"}`}>Danger Zone</span>
                  <div className={`p-4 rounded-2xl border space-y-3 ${themeMode === "black" ? "bg-red-500/5 border-red-500/10" : "bg-red-500/5 border-red-200"
                    }`}>
                    <p className={`text-xs leading-relaxed ${themeMode === "black" ? "text-neutral-400" : "text-neutral-605"}`}>
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
                          className={`px-4 py-2.5 rounded-xl font-bold text-xs text-center transition duration-300 border ${themeMode === "black"
                            ? "bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 border-white/5"
                            : "bg-white hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900 border-neutral-200 shadow-sm"
                            }`}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteAll(true)}
                        disabled={chats.length === 0}
                        className={`w-full py-2.5 rounded-xl font-bold text-xs text-center transition duration-300 flex items-center justify-center gap-2 ${chats.length === 0
                          ? themeMode === "black"
                            ? "bg-neutral-950 text-neutral-700 border border-neutral-900 cursor-not-allowed"
                            : "bg-neutral-100 text-neutral-400 border border-neutral-200 cursor-not-allowed"
                          : "bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 hover:border-transparent"
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
        )
      }
      {/* 5. Custom Agent Builder — Professional Glassmorphic Modal */}
      {/* 5. Custom Agent Builder — Smart 2-Step Wizard */}
      {
        customAgentModalOpen && (() => {
          // Step state lives here via a wrapper component trick — use existing states
          const isStep2 = newAgentName.trim() !== "" && newAgentInstructions.trim() !== "";
          return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => { setCustomAgentModalOpen(false); setAgentConceptPrompt(""); setNewAgentName(""); setNewAgentBanglaName(""); setNewAgentBanglaDesc(""); setNewAgentInstructions(""); }} />
              <div className={`relative max-w-lg w-full max-h-[92vh] overflow-y-auto rounded-3xl border shadow-2xl scrollbar-thin ${themeMode === "black" ? "bg-[#0A0A0C]/98 border-white/10 text-neutral-100" : "bg-white border-neutral-200 text-neutral-900"}`}>

                {/* Header */}
                <div className={`flex items-center justify-between px-6 py-4 border-b ${themeMode === "black" ? "border-white/5" : "border-neutral-100"}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${themeMode === "black" ? "bg-emerald-500/15" : "bg-emerald-50"}`}>
                      <Sparkles size={15} className="text-emerald-500" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm tracking-tight">Create Custom Agent</h3>
                      <p className={`text-[10px] ${themeMode === "black" ? "text-neutral-500" : "text-neutral-400"}`}>
                        {isStep2 ? "Step 2 — Review & customise" : "Step 1 — Describe your agent"}
                      </p>
                    </div>
                  </div>
                  <button type="button" onClick={() => { setCustomAgentModalOpen(false); setAgentConceptPrompt(""); setNewAgentName(""); setNewAgentBanglaName(""); setNewAgentBanglaDesc(""); setNewAgentInstructions(""); }} className={`p-1.5 rounded-lg transition ${themeMode === "black" ? "hover:bg-white/5 text-neutral-500 hover:text-white" : "hover:bg-neutral-100 text-neutral-400"}`}>
                    <X size={16} />
                  </button>
                </div>

                <div className="px-6 py-5 space-y-4">
                  {!isStep2 ? (
                    /* ── STEP 1: Describe ── */
                    <>
                      <div>
                        <label className={`block text-[11px] font-black uppercase tracking-widest mb-2 ${themeMode === "black" ? "text-neutral-400" : "text-neutral-500"}`}>
                          What kind of agent do you need?
                        </label>
                        <textarea
                          rows={5}
                          autoFocus
                          placeholder={`Describe in plain language. Examples:\n\n• "A fitness coach who creates personalised workout plans and tracks progress"\n• "A legal contract reviewer who spots risks and suggests improvements"\n• "A cold email writer who crafts high-converting outreach sequences"`}
                          value={agentConceptPrompt}
                          onChange={(e) => setAgentConceptPrompt(e.target.value)}
                          className={`w-full p-4 rounded-2xl border outline-none text-sm resize-none leading-relaxed transition ${themeMode === "black" ? "bg-neutral-900/60 border-white/8 text-white placeholder-neutral-600 focus:border-emerald-500/50" : "bg-neutral-50 border-neutral-200 text-neutral-900 placeholder-neutral-400 focus:border-emerald-400"}`}
                        />
                        <p className={`text-[10px] mt-2 ${themeMode === "black" ? "text-neutral-600" : "text-neutral-400"}`}>
                          The more detail you give, the better the agent. Mention tone, expertise level, specific tasks, target audience.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleGenerateAll}
                        disabled={isGeneratingAll || !agentConceptPrompt.trim()}
                        className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-neutral-950 text-sm font-black tracking-wide uppercase transition-all flex items-center justify-center gap-2"
                      >
                        {isGeneratingAll ? (
                          <><Loader2 size={15} className="animate-spin" /> Generating agent...</>
                        ) : (
                          <><Sparkles size={15} /> Generate Agent with AI</>
                        )}
                      </button>
                    </>
                  ) : (
                    /* ── STEP 2: Review & Edit ── */
                    <form onSubmit={handleCreateCustomAgent} className="space-y-4">
                      {/* Generated summary card */}
                      <div className={`p-4 rounded-2xl border ${themeMode === "black" ? "bg-emerald-500/5 border-emerald-500/15" : "bg-emerald-50 border-emerald-200"}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xl">{newAgentIcon}</span>
                          <span className="font-extrabold text-sm text-emerald-500">{newAgentName}</span>
                        </div>
                        <p className={`text-xs leading-relaxed ${themeMode === "black" ? "text-neutral-400" : "text-neutral-600"}`}>{newAgentBanglaDesc}</p>
                      </div>

                      {/* Name */}
                      <div>
                        <label className={`block text-[10px] font-black uppercase tracking-widest mb-1.5 ${themeMode === "black" ? "text-neutral-500" : "text-neutral-400"}`}>Agent Name</label>
                        <input type="text" required value={newAgentName} onChange={(e) => setNewAgentName(e.target.value)}
                          className={`w-full px-4 py-2.5 rounded-xl border outline-none text-sm transition ${themeMode === "black" ? "bg-neutral-900/60 border-white/8 text-white focus:border-emerald-500/50" : "bg-neutral-50 border-neutral-200 focus:border-emerald-400"}`} />
                      </div>

                      {/* Description */}
                      <div>
                        <label className={`block text-[10px] font-black uppercase tracking-widest mb-1.5 ${themeMode === "black" ? "text-neutral-500" : "text-neutral-400"}`}>Short Description</label>
                        <input type="text" value={newAgentBanglaDesc} onChange={(e) => setNewAgentBanglaDesc(e.target.value)}
                          className={`w-full px-4 py-2.5 rounded-xl border outline-none text-sm transition ${themeMode === "black" ? "bg-neutral-900/60 border-white/8 text-white focus:border-emerald-500/50" : "bg-neutral-50 border-neutral-200 focus:border-emerald-400"}`} />
                      </div>

                      {/* Icon */}
                      <div>
                        <label className={`block text-[10px] font-black uppercase tracking-widest mb-1.5 ${themeMode === "black" ? "text-neutral-500" : "text-neutral-400"}`}>Icon</label>
                        <div className="flex flex-wrap gap-2">
                          {["🚀", "💰", "📈", "📣", "🎨", "💻", "🧠", "🛡️", "🤝", "🔥", "🌶️", "⚡", "🎯", "📊", "🔬", "🏋️", "⚖️", "✍️", "🎓", "🌍"].map(e => (
                            <button key={e} type="button" onClick={() => setNewAgentIcon(e)}
                              className={`w-9 h-9 rounded-xl flex items-center justify-center text-base border transition ${newAgentIcon === e ? "border-emerald-500 bg-emerald-500/15 scale-110" : themeMode === "black" ? "border-white/5 bg-neutral-900 hover:bg-neutral-800" : "border-neutral-200 bg-white hover:bg-neutral-50"}`}>
                              {e}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Instructions preview */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className={`text-[10px] font-black uppercase tracking-widest ${themeMode === "black" ? "text-neutral-500" : "text-neutral-400"}`}>System Instructions</label>
                          <span className={`text-[9px] ${themeMode === "black" ? "text-neutral-600" : "text-neutral-400"}`}>{newAgentInstructions.length} chars</span>
                        </div>
                        <textarea rows={5} required value={newAgentInstructions} onChange={(e) => setNewAgentInstructions(e.target.value)}
                          className={`w-full px-4 py-3 rounded-xl border outline-none text-xs resize-none leading-relaxed transition ${themeMode === "black" ? "bg-neutral-900/60 border-white/8 text-neutral-300 focus:border-emerald-500/50" : "bg-neutral-50 border-neutral-200 focus:border-emerald-400"}`} />
                      </div>

                      <div className="flex gap-3 pt-1">
                        <button type="button" onClick={() => { setNewAgentName(""); setNewAgentInstructions(""); }}
                          className={`flex-1 py-2.5 rounded-xl border text-xs font-bold transition ${themeMode === "black" ? "border-white/10 text-neutral-400 hover:text-white hover:border-white/20" : "border-neutral-200 text-neutral-500 hover:text-neutral-800"}`}>
                          ← Regenerate
                        </button>
                        <button type="submit"
                          className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-xs font-black uppercase tracking-wider transition-all">
                          ✓ Save Agent
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </div>
          );
        })()
      }

      {/* 6. Upload PDF Agent Modal */}
      {
        pdfAgentModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={() => setPdfAgentModalOpen(false)} />
            <div className={`relative max-w-md w-full max-h-[92vh] overflow-y-auto rounded-3xl p-5 sm:p-6 border shadow-2xl transition duration-300 transform scale-100 scrollbar-thin ${themeMode === "black"
              ? "bg-[#0A0A0C]/95 border-white/10 text-neutral-100 shadow-[0_0_50px_rgba(79,70,229,0.05)]"
              : "bg-white/95 border-neutral-200 text-neutral-900 shadow-2xl"
              }`}>
              <div className={`flex items-center justify-between pb-3 border-b mb-4 ${themeMode === "black" ? "border-white/5" : "border-neutral-200"}`}>
                <div className="flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-lg ${themeMode === "black" ? "bg-indigo-500/10" : "bg-indigo-50"}`}>
                    <FileText size={14} className="text-indigo-500" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm sm:text-base tracking-tight">Upload PDF Agent</h3>
                    <p className={`text-[10px] mt-0.5 ${themeMode === "black" ? "text-neutral-500" : "text-neutral-400"}`}>Extract expertise from a document</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPdfAgentModalOpen(false)}
                  className={`p-1.5 rounded-lg transition duration-150 ${themeMode === "black" ? "hover:bg-white/5 text-neutral-500 hover:text-neutral-200" : "hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700"}`}
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleUploadPdfAgent} className="space-y-4">
                <div>
                  <label className={`block text-[10px] font-black uppercase tracking-widest mb-1.5 ${themeMode === "black" ? "text-neutral-500" : "text-neutral-400"}`}>PDF Document</label>
                  <input
                    type="file"
                    required
                    accept=".pdf"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handlePdfFileSelect(e.target.files[0]);
                      }
                    }}
                    className={`w-full p-3 rounded-xl border outline-none text-xs transition duration-200 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 ${themeMode === "black"
                      ? "bg-neutral-900/50 border-white/10 focus:border-indigo-500 text-white"
                      : "bg-neutral-50 border-neutral-200 focus:border-indigo-500 text-neutral-900"
                      }`}
                  />
                  <p className={`text-[10px] mt-2 leading-relaxed ${themeMode === "black" ? "text-neutral-500" : "text-neutral-400"}`}>
                    The AI will analyze the core topics of this PDF and automatically generate an expert persona based on its contents.
                  </p>
                </div>

                <div>
                  <label className={`block text-[10px] font-black uppercase tracking-widest mb-1.5 ${themeMode === "black" ? "text-neutral-500" : "text-neutral-400"}`}>
                    Agent Name
                    {isGeneratingPdfName && <span className="ml-2 text-indigo-400 normal-case font-normal tracking-normal animate-pulse">✨ Generating...</span>}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rich Dad Financial Advisor"
                      value={newPdfAgentName}
                      onChange={(e) => setNewPdfAgentName(e.target.value)}
                      className={`w-full p-3 rounded-xl border outline-none text-xs transition duration-200 ${themeMode === "black"
                        ? "bg-neutral-900/50 border-white/10 focus:border-indigo-500 text-white placeholder-neutral-600"
                        : "bg-neutral-50 border-neutral-200 focus:border-indigo-500 text-neutral-900 placeholder-neutral-400"
                        }`}
                    />
                    {isGeneratingPdfName && (
                      <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-indigo-400" />
                    )}
                  </div>
                  <p className={`text-[10px] mt-1.5 ${themeMode === "black" ? "text-neutral-600" : "text-neutral-400"}`}>
                    Auto-generated from your PDF — you can edit it anytime.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isUploadingPdf || !pdfFile || !newPdfAgentName.trim()}
                  className="w-full py-3 rounded-xl bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-neutral-950 text-xs font-black tracking-widest uppercase transition-all duration-300 shadow-lg shadow-indigo-500/15 hover:shadow-indigo-500/35 hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-2 mt-2"
                >
                  {isUploadingPdf ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                  <span>{isUploadingPdf ? "Analyzing & Generating..." : "Generate AI Agent"}</span>
                </button>
              </form>
            </div>
          </div>
        )
      }
    </>
  );
}
