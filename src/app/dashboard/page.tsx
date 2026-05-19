"use client";

import React, { useState, useEffect, useRef } from "react";
import { useUser, UserButton } from "@clerk/nextjs";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
// NovaAvatar removed — using dynamic AIAvatar now
import TypingIndicator from "@/components/TypingIndicator";

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
  const elementId = useRef(`mermaid-${Math.floor(Math.random() * 1000000)}`);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
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
  }, [chart]);

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

  if (!svg) {
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
  Moon
} from "lucide-react";
import Link from "next/link";
import { parseAnyFile } from "@/lib/fileParser";
const parseThoughtAndContent = (text: string): { thought: string; content: string } => {
  if (!text) return { thought: "", content: "" };
  
  // 1. Try <thought> tags
  let thoughtStart = text.indexOf("<thought>");
  let thoughtEnd = text.indexOf("</thought>");
  let tagOffset = 9;
  
  // 2. Fallback to <think> tags (DeepSeek native)
  if (thoughtStart === -1) {
    thoughtStart = text.indexOf("<think>");
    thoughtEnd = text.indexOf("</think>");
    tagOffset = 7;
  }
  
  if (thoughtStart !== -1) {
    if (thoughtEnd !== -1) {
      // Completed thought block
      const thought = text.substring(thoughtStart + tagOffset, thoughtEnd).trim();
      const content = (text.substring(0, thoughtStart) + text.substring(thoughtEnd + tagOffset + 1)).trim();
      return { thought, content };
    } else {
      // In-progress thought block
      const thought = text.substring(thoughtStart + tagOffset).trim();
      const content = text.substring(0, thoughtStart).trim();
      return { thought, content };
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
  const handleDownload = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow popups to export as PDF");
      return;
    }
    
    const html = parseMarkdownForPDF(content);

    printWindow.document.write(`
      <html>
        <head>
          <title>Kacha Morich AI - Business Intelligence Report</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #333; line-height: 1.6; background-color:#fff; }
            h1, h2, h3 { font-family: 'Segoe UI', sans-serif; color: #111; }
            table { page-break-inside: avoid; }
            tr { page-break-inside: avoid; page-break-after: auto; }
            thead { display: table-header-group; }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
          <!-- Mermaid rendering support -->
          <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
          <script>
            window.onload = function() {
              try {
                mermaid.initialize({
                  startOnLoad: true,
                  theme: 'neutral',
                  flowchart: {
                    useMaxWidth: true,
                    htmlLabels: true
                  }
                });
              } catch(e) { console.error(e); }
              
              // Delay execution to allow Mermaid script to construct flowchart SVGs
              setTimeout(function() {
                window.print();
                setTimeout(function() { window.close(); }, 500);
              }, 1500);
            };
          </script>
        </head>
        <body>
          <div style="text-align:center;margin-bottom:30px;border-bottom:2px solid #E11D48;padding-bottom:10px;">
            <h2 style="margin:0;color:#E11D48;">🌶️ KACHA MORICH AI</h2>
            <p style="margin:5px 0 0 0;font-size:12px;color:#666;text-transform:uppercase;letter-spacing:1px;">Generated Business Artifact</p>
          </div>
          <div>${html}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
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
        className="self-start sm:self-center px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-neutral-950 text-xs font-black tracking-widest uppercase transition-all duration-300 shadow-lg shadow-red-500/10 hover:shadow-red-500/30 hover:scale-[1.02] active:scale-95"
      >
        📥 Download PDF
      </button>
    </div>
  );
};

const WordArtifactCard = ({ content }: { content: string }) => {
  const handleDownload = () => {
    const html = parseMarkdownForPDF(content);

    const wordContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><title>Kacha Morich AI Report</title></head>
        <body>
          <h2 style="color:#FF8C00;">🌶️ Generated Business Report</h2>
          <hr/>
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
        className="self-start sm:self-center px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-neutral-950 text-xs font-black tracking-widest uppercase transition-all duration-300 shadow-lg shadow-blue-500/10 hover:shadow-blue-500/30 hover:scale-[1.02] active:scale-95"
      >
        📥 Download Word
      </button>
    </div>
  );
};

const ExcelArtifactCard = ({ content }: { content: string }) => {
  const handleDownload = () => {
    const lines = content.split('\n');
    let csvContent = "";
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('|')) {
        if (line.includes('---')) continue; 
        const cells = line.split('|').map(c => c.trim()).filter((c, idx, arr) => idx > 0 && idx < arr.length - 1);
        const csvRow = cells.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',');
        csvContent += csvRow + '\r\n';
      } else if (line.includes(',')) {
        csvContent += line + '\r\n';
      }
    }

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
        className="self-start sm:self-center px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-neutral-950 text-xs font-black tracking-widest uppercase transition-all duration-300 shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/30 hover:scale-[1.02] active:scale-95"
      >
        📥 Download Excel
      </button>
    </div>
  );
};

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
];

const MODELS_LIST = [
  { id: "google/gemma-4-31b-it", name: "Google Gemma 31B", icon: "💎", badge: "Primary" },
  { id: "deepseek/deepseek-r1:free", name: "DeepSeek R1 (Thinking)", icon: "🔮", badge: "Reasoning King" },
  { id: "deepseek/deepseek-v4-flash", name: "DeepSeek V4 Flash", icon: "⚡", badge: "Super Fast" },
  { id: "nousresearch/hermes-3-llama-3.1-405b", name: "Hermes 3 405B Instruct", icon: "🧠", badge: "Max Reasoning" },
  { id: "openai/gpt-oss-120b:free", name: "GPT OSS 120B", icon: "🤖", badge: "OSS Giant" },
  { id: "nvidia/nemotron-3-super-120b-a12b:free", name: "Nvidia Nemotron 120B", icon: "🐲", badge: "Enterprise" },
  { id: "baidu/cobuddy:free", name: "Baidu Cobuddy", icon: "🐼", badge: "Smart Agent" },
  { id: "meta-llama/llama-3.3-70b-instruct:free", name: "Llama 3.3 70B", icon: "🦙", badge: "Meta Logic" },
  { id: "arcee-ai/trinity-large-thinking:free", name: "Trinity Large", icon: "🧩", badge: "Deep Analysis" },
  { id: "liquid/lfm-2.5-1.2b-thinking:free", name: "Liquid LFM Thinking", icon: "💧", badge: "Fluid Logic" },
  { id: "openrouter/owl-alpha", name: "Owl Alpha", icon: "🦉", badge: "Alpha Tier" },
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

  const [selectedModelId, setSelectedModelId] = useState<string>("google/gemma-4-31b-it");
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);

  // Multi-Agent Brain Trust State
  const [isBrainTrust, setIsBrainTrust] = useState(false);
  const [boardSize, setBoardSize] = useState<number>(16);

  // Theme Mode State: "black" (dark) or "light" (clean light)
  const [themeMode, setThemeMode] = useState<"black" | "light">("black");

  // Robust Hydrated Persistence Engine
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTone = localStorage.getItem("kacha_selected_tone");
      const savedAgent = localStorage.getItem("kacha_selected_agent");
      const savedModel = localStorage.getItem("kacha_selected_model");
      const savedBrainTrust = localStorage.getItem("kacha_is_braintrust");
      const savedTheme = localStorage.getItem("kacha_selected_theme") as "black" | "light";

      if (savedTone) setSelectedToneId(savedTone);
      if (savedAgent) setSelectedAgentId(savedAgent);
      if (savedModel) setSelectedModelId(savedModel);
      if (savedBrainTrust) setIsBrainTrust(savedBrainTrust === "true");
      
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
        body.style.backgroundColor = "#F1F5F9";
        body.style.color = "#1E293B";
      } else {
        root.classList.remove("light");
        root.classList.add("dark");
        body.style.backgroundColor = "#020202";
        body.style.color = "#F5F5F5";
      }
    }
  }, [themeMode]);

  const toggleTheme = () => {
    const nextTheme = themeMode === "black" ? "light" : "black";
    setThemeMode(nextTheme);
    localStorage.setItem("kacha_selected_theme", nextTheme);
  };

  const handleToneChange = (toneId: string) => {
    setSelectedToneId(toneId);
    localStorage.setItem("kacha_selected_tone", toneId);
  };

  // Dynamic prompt suggestions states
  const [customSuggestions, setCustomSuggestions] = useState<Record<string, string[]>>({});
  const [isGeneratingPrompts, setIsGeneratingPrompts] = useState(false);
  const [customPromptText, setCustomPromptText] = useState("");

  const handleGeneratePrompts = async () => {
    const activeAgent = AGENTS_LIST.find((a) => a.id === selectedAgentId);
    if (!activeAgent) return;
    
    setIsGeneratingPrompts(true);
    try {
      const response = await fetch("/api/prompts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: activeAgent.id,
          agentName: activeAgent.name,
          agentDesc: activeAgent.desc
        })
      });
      if (response.ok) {
        const data = await response.json();
        if (data.suggestions) {
          setCustomSuggestions(prev => ({
            ...prev,
            [selectedAgentId]: data.suggestions
          }));
        }
      }
    } catch (err) {
      console.error("Failed to generate custom prompts:", err);
    } finally {
      setIsGeneratingPrompts(false);
    }
  };

  const handleAddCustomPrompt = () => {
    if (!customPromptText.trim()) return;
    const currentList = customSuggestions[selectedAgentId] || 
      (AGENTS_LIST.find((a) => a.id === selectedAgentId)?.suggestions || []);
    
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

  const handleModelChange = (modelId: string) => {
    setSelectedModelId(modelId);
    localStorage.setItem("kacha_selected_model", modelId);
  };

  const handleBrainTrustToggle = (val: boolean) => {
    setIsBrainTrust(val);
    localStorage.setItem("kacha_is_braintrust", String(val));
  };

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
          modelId: selectedModelId,
          aiName: aiName,
          tonePrompt: TONES_LIST.find(t => t.id === selectedToneId)?.prompt,
          isBrainTrust: isBrainTrust,
          boardSize: boardSize,
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
      className={`fixed inset-0 flex overflow-hidden font-sans w-full transition-colors duration-300 ${
        themeMode === "black" ? "bg-black text-neutral-100 theme-black" : "bg-[#F8FAFC] text-neutral-900 theme-light"
      }`}
      style={{ height: "var(--viewport-height, 100%)" }}
    >
      {/* 1. Sidebar - Collapsible on Mobile */}
      <aside 
        className={`fixed inset-y-0 left-0 z-40 w-72 transform transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 transition-colors duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } ${
          themeMode === "black" 
            ? "bg-[#050505] border-r border-white/5" 
            : "bg-[#FFFFFF] border-r border-neutral-200"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Top Nav Brand */}
          <div className={`p-5 border-b flex flex-col gap-1 text-left ${
            themeMode === "black" ? "border-white/5" : "border-neutral-200"
          }`}>
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2.5">
                <AIAvatar size={34} className={themeMode === "black" ? "border border-white/10" : "border border-neutral-200"} />
                <span className={`font-extrabold tracking-widest text-xs uppercase ${
                  themeMode === "black" ? "text-white/90" : "text-neutral-800"
                }`}>
                  {aiName}
                </span>
              </Link>
              <button 
                className={`lg:hidden p-1 transition-colors ${
                  themeMode === "black" ? "text-neutral-400 hover:text-neutral-100" : "text-neutral-600 hover:text-neutral-900"
                }`} 
                onClick={() => setSidebarOpen(false)}
              >
                <X size={20} />
              </button>
            </div>
            <span className={`text-[10px] font-medium leading-normal ${
              themeMode === "black" ? "text-neutral-500" : "text-neutral-400"
            }`}>
              Your personal multi-specialist AI assistant.
            </span>
          </div>

          {/* New Chat Button */}
          <div className="px-4 py-3">
            <button 
              onClick={handleNewChat}
              className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border transition duration-300 shadow-sm text-sm font-bold ${
                themeMode === "black"
                  ? "border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent hover:from-white/[0.08] text-neutral-200 hover:text-white"
                  : "border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-800 hover:text-neutral-900"
              }`}
            >
              <Plus size={16} /> New Analysis
            </button>
          </div>

          {/* Chats History List */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
            {isSyncing ? (
              <div className={`p-4 text-center text-xs ${themeMode === "black" ? "text-neutral-600" : "text-neutral-400"}`}>Syncing consultations...</div>
            ) : chats.length === 0 ? (
              <div className={`p-4 text-center text-xs ${themeMode === "black" ? "text-neutral-600" : "text-neutral-400"}`}>No previous consultations</div>
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
                      ? themeMode === "black"
                        ? "bg-neutral-200/10 border border-neutral-200/20 text-white font-medium" 
                        : "bg-amber-500/10 border border-amber-500/20 text-amber-950 font-bold shadow-sm"
                      : themeMode === "black"
                        ? "border border-transparent text-neutral-400 hover:bg-neutral-900/60 hover:text-neutral-200"
                        : "border border-transparent text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <MessageSquare size={15} className={activeChatId === chat.id ? (themeMode === "black" ? "text-neutral-200" : "text-neutral-800") : "text-neutral-500"} />
                    <span className="truncate pr-2">{parseChatTitle(chat.title).title}</span>
                  </div>
                  <button 
                    onClick={(e) => handleDeleteChat(e, chat.id)}
                    className={`p-1 rounded opacity-0 group-hover:opacity-100 transition duration-300 ${
                      themeMode === "black"
                        ? "text-neutral-600 hover:text-red-400 hover:bg-red-950/20"
                        : "text-neutral-400 hover:text-red-500 hover:bg-red-50"
                    }`}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Sidebar User Footer */}
          <div className={`p-4 border-t transition-colors duration-300 flex items-center justify-between ${
            themeMode === "black" ? "border-neutral-900 bg-[#050505]" : "border-neutral-200 bg-[#FAFAFA]"
          }`}>
            <div className="flex items-center gap-3">
              <UserButton />
              <div className="flex flex-col text-left">
                <span className={`text-xs font-bold truncate max-w-[120px] ${
                  themeMode === "black" ? "text-neutral-200" : "text-neutral-850 font-extrabold"
                }`}>
                  {user?.firstName || user?.username || "Consultant"}
                </span>
                <span className={`text-[10px] font-bold tracking-wider ${
                  themeMode === "black" ? "text-neutral-400" : "text-neutral-500"
                }`}>PREMIUM MEMBER</span>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              {user?.primaryEmailAddress?.emailAddress && 
               ["koishiquedhrubo@gmail.com", "rahmanmdkoishiqur@gmail.com", "aloniliark@gmail.com"].includes(user.primaryEmailAddress.emailAddress) && (
                <Link
                  href="/admin"
                  className={`p-2 rounded-lg transition duration-200 ${
                    themeMode === "black" ? "text-emerald-500 hover:text-emerald-300 hover:bg-neutral-900" : "text-emerald-600 hover:text-emerald-500 hover:bg-emerald-50"
                  }`}
                  title="Admin Dashboard"
                >
                  <ShieldCheck size={16} className="animate-pulse" />
                </Link>
              )}
              <button 
                onClick={() => setIsSettingsModalOpen(true)}
                className={`p-2 rounded-lg transition duration-200 ${
                  themeMode === "black" ? "text-neutral-500 hover:text-neutral-200 hover:bg-neutral-900" : "text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100"
                }`}
                title="Manage Account"
              >
                <Settings size={16} />
              </button>
              <Link 
                href="/" 
                className={`p-2 rounded-lg transition duration-200 ${
                  themeMode === "black" ? "text-neutral-500 hover:text-neutral-200 hover:bg-neutral-900" : "text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100"
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
      <main className={`flex-1 min-h-0 flex flex-col relative transition-colors duration-300 ${
        themeMode === "black" ? "bg-[#020202]" : "bg-[#F1F5F9]"
      }`}>
        {/* Dynamic header */}
        <header className={`h-16 px-4 sm:px-6 border-b backdrop-blur-xl flex items-center justify-between z-10 transition-colors duration-300 ${
          themeMode === "black" 
            ? "border-white/5 bg-[#050505]/80" 
            : "border-neutral-200 bg-[#FFFFFF]/80 shadow-sm"
        }`}>
          <div className="flex items-center gap-3">
            <button 
              className={`lg:hidden p-1.5 rounded-lg transition duration-200 ${
                themeMode === "black" ? "text-neutral-400 hover:text-neutral-100 hover:bg-neutral-900" : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100"
              }`}
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
                    className={`flex items-center gap-1 sm:gap-1.5 px-2 py-1.5 sm:px-2.5 sm:py-1 rounded-xl transition-all font-extrabold shadow-sm border ${
                      themeMode === "black"
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
                    <div className={`absolute top-full left-0 mt-2 w-56 backdrop-blur-xl border rounded-2xl p-1 shadow-2xl z-50 transition-colors duration-300 ${
                      themeMode === "black" 
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
                            className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-semibold rounded-xl transition duration-200 ${
                              selectedToneId === tone.id 
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
              <span className={`mobile-hide sm:block text-sm font-semibold truncate max-w-[200px] ml-2 ${
                themeMode === "black" ? "text-neutral-200" : "text-neutral-800"
              }`}>
                {activeChat ? parseChatTitle(activeChat.title).title : ""}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* AI Brain Selector Dropdown */}
            <div className="relative hidden md:block">
              <button
                type="button"
                onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition duration-300 font-bold shadow-sm text-xs ${
                  themeMode === "black"
                    ? "border-white/10 bg-[#0A0A0A]/50 hover:bg-[#111111]/80 text-neutral-300 hover:text-white hover:border-neutral-200/30"
                    : "border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 hover:text-neutral-900"
                }`}
              >
                <span>{MODELS_LIST.find((m) => m.id === selectedModelId)?.icon}</span>
                <span className="truncate max-w-[100px]">
                  {MODELS_LIST.find((m) => m.id === selectedModelId)?.name || "Select AI Brain"}
                </span>
                <ChevronDown size={13} className={`text-neutral-500 transition duration-300 ${modelDropdownOpen ? "rotate-180 text-neutral-200" : ""}`} />
              </button>

              {modelDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setModelDropdownOpen(false)} />
                  <div className={`absolute right-0 mt-2.5 w-60 rounded-xl border p-2 shadow-2xl z-50 divide-y space-y-1 ${
                    themeMode === "black"
                      ? "border-neutral-800 bg-[#090909]/95 backdrop-blur-md divide-neutral-900 text-neutral-300"
                      : "border-neutral-200 bg-white divide-neutral-100 text-neutral-800 shadow-xl"
                  }`}>
                    <div className={`px-3 py-1.5 text-[9px] font-black tracking-widest uppercase ${
                      themeMode === "black" ? "text-neutral-500" : "text-neutral-400"
                    }`}>
                      Select AI Brain Model
                    </div>
                    <div className="pt-1.5 space-y-0.5 font-sans">
                      {MODELS_LIST.map((model) => {
                        const isSelected = selectedModelId === model.id;
                        return (
                          <button
                            key={model.id}
                            type="button"
                            onClick={() => {
                              handleModelChange(model.id);
                              setModelDropdownOpen(false);
                            }}
                            className={`w-full text-left flex items-center justify-between p-2.5 rounded-lg transition duration-200 ${
                              isSelected 
                                ? themeMode === "black"
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                  : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : themeMode === "black"
                                  ? "border border-transparent hover:bg-neutral-900 text-neutral-300 hover:text-neutral-100"
                                  : "border border-transparent hover:bg-neutral-50 text-neutral-700 hover:text-neutral-900"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span>{model.icon}</span>
                              <span className="text-xs font-bold">{model.name}</span>
                            </div>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                              themeMode === "black" ? "bg-white/5 text-neutral-400" : "bg-neutral-100 text-neutral-500"
                            }`}>{model.badge}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Elite Agent Selector Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setAgentDropdownOpen(!agentDropdownOpen)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border transition duration-300 font-bold shadow-sm text-xs ${
                  themeMode === "black"
                    ? "border-white/10 bg-[#0A0A0A]/50 hover:bg-[#111111]/80 text-neutral-300 hover:text-white hover:border-neutral-200/30"
                    : "border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 hover:text-neutral-900"
                }`}
              >
                {(() => {
                  const activeAgent = AGENTS_LIST.find((a) => a.id === selectedAgentId);
                  if (activeAgent) {
                    const AgentIcon = activeAgent.icon;
                    return <AgentIcon size={14} className={`${themeMode === "black" ? "text-neutral-200" : "text-neutral-700"} flex-shrink-0 animate-pulse`} />;
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
                  <div className={`absolute right-0 mt-2.5 w-80 max-h-[420px] overflow-y-auto rounded-xl border p-2 shadow-2xl z-50 divide-y space-y-1 scrollbar-thin ${
                    themeMode === "black"
                      ? "border-neutral-800 bg-[#090909]/95 backdrop-blur-md divide-neutral-900"
                      : "border-neutral-200 bg-white divide-neutral-100 shadow-xl"
                  }`}>
                    <div className={`px-3 py-1.5 text-[9px] font-black tracking-widest uppercase ${
                      themeMode === "black" ? "text-neutral-500" : "text-neutral-400"
                    }`}>
                      Select Specialist AI Agent
                    </div>
                    <div className="pt-1.5 space-y-0.5 font-sans">
                      {AGENTS_LIST.map((agent) => {
                        const AgentIcon = agent.icon;
                        const isSelected = selectedAgentId === agent.id;
                        return (
                          <button
                            key={agent.id}
                            type="button"
                            onClick={() => {
                              handleAgentChange(agent.id);
                              setAgentDropdownOpen(false);
                              // Start a new chat if there are already messages in the current one
                              if (messages.length > 0) {
                                handleNewChat();
                              }
                            }}
                            className={`w-full text-left flex items-start gap-3 p-2.5 rounded-lg transition duration-200 ${
                              isSelected 
                                ? themeMode === "black"
                                  ? "bg-neutral-200/10 text-white border border-neutral-200/20"
                                  : "bg-neutral-100 text-neutral-900 border border-neutral-200"
                                : themeMode === "black"
                                  ? "border border-transparent hover:bg-neutral-900 text-neutral-300 hover:text-neutral-100"
                                  : "border border-transparent hover:bg-[#F1F5F9] text-neutral-700 hover:text-neutral-900"
                            }`}
                          >
                            <AgentIcon size={16} className={`mt-0.5 flex-shrink-0 ${isSelected ? (themeMode === "black" ? "text-neutral-200" : "text-neutral-700") : "text-neutral-500"}`} />
                            <div className="flex flex-col text-xs leading-normal">
                              <span className={`font-bold ${themeMode === "black" ? "text-neutral-200" : "text-neutral-900"}`}>{agent.banglaName}</span>
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
              className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition duration-300 text-xs ${
                themeMode === "black"
                  ? "border-neutral-800 bg-neutral-900/40 text-neutral-400 hover:text-white hover:bg-neutral-850"
                  : "border-neutral-200 bg-white text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 shadow-sm"
              }`}
            >
              Home
            </Link>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg transition duration-200 ${
                themeMode === "black" 
                  ? "text-neutral-500 hover:text-amber-400 hover:bg-neutral-900" 
                  : "text-neutral-500 hover:text-amber-650 hover:bg-neutral-100"
              }`}
              title={themeMode === "black" ? "Switch to System Light Theme" : "Switch to Obsidian Black Theme"}
            >
              {themeMode === "black" ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <button 
              onClick={() => setIsSettingsModalOpen(true)}
              className={`p-2 rounded-lg transition duration-200 ${
                themeMode === "black" ? "text-neutral-500 hover:text-neutral-200 hover:bg-neutral-900" : "text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100"
              }`}
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
                <AIAvatar size={88} className={`relative mb-6 border-2 ${themeMode === "black" ? "border-white/10" : "border-neutral-200"}`} />
              </div>
 
              <h2 className={`text-xl sm:text-2xl md:text-3xl font-extrabold mt-4 leading-normal ${
                themeMode === "black" ? "text-neutral-100" : "text-neutral-900"
              }`}>
                {aiName}:{" "}
                <span className={themeMode === "black" ? "text-neutral-400" : "text-neutral-500"}>
                  {AGENTS_LIST.find((a) => a.id === selectedAgentId)?.banglaName || "Specialist"}
                </span>
              </h2>
              <p className={`mt-4 leading-relaxed max-w-xl text-sm ${
                themeMode === "black" ? "text-neutral-400/80" : "text-neutral-600"
              }`}>
                {AGENTS_LIST.find((a) => a.id === selectedAgentId)?.banglaDesc || "কুদ্দুস আলীর ২০+ বছরের বাস্তব বিজনেস অভিজ্ঞতার আলোকে যেকোনো আইডিয়া যাচাই করুন।"}
              </p>
 
              {/* Warning box */}
              <div className={`mt-6 w-full p-4 rounded-xl border text-xs flex items-center gap-2 justify-center shadow-sm transition duration-300 ${
                themeMode === "black"
                  ? "border-neutral-800 bg-neutral-900/40 text-neutral-300 shadow-[0_0_15px_rgba(245,158,11,0.02)]"
                  : "border-amber-200 bg-amber-500/10 text-amber-955 shadow-[0_0_15px_rgba(245,158,11,0.05)] font-semibold"
              }`}>
                <Sparkles size={14} className={`flex-shrink-0 animate-pulse ${themeMode === "black" ? "text-neutral-200" : "text-amber-700"}`} />
                <span>● <strong>Operational Advisor Warning:</strong> Please specify your <strong>target country and primary market</strong> first for accurate feedback.</span>
              </div>
 
              {/* Prompt Suggestions Grid */}
              <div className="mt-10 w-full text-left">
                <div className={`flex items-center gap-2.5 mb-4 border-b pb-3 ${
                  themeMode === "black" ? "border-neutral-900" : "border-neutral-200"
                }`}>
                  <span className={`text-xs font-black uppercase tracking-widest ${
                    themeMode === "black" ? "text-neutral-200" : "text-neutral-850"
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
                      className={`relative z-10 p-2 rounded-full border transition-all duration-300 hover:scale-115 active:scale-90 ${
                        isGeneratingPrompts
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
                  {(customSuggestions[selectedAgentId] || (AGENTS_LIST.find((a) => a.id === selectedAgentId)?.suggestions || [])).map((suggestText, sIdx) => {
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
                        className={`relative p-5 text-left rounded-2xl border transition-all duration-300 text-xs leading-relaxed hover:scale-[1.01] hover:-translate-y-0.5 active:scale-[0.99] flex flex-col justify-between gap-4 group overflow-hidden ${
                          themeMode === "black"
                            ? "border-neutral-800 bg-[#0c0c0c]/80 hover:border-amber-500/40 text-neutral-300 hover:shadow-[0_0_20px_rgba(245,158,11,0.06)]"
                            : "border-neutral-250 hover:border-amber-500/35 bg-white hover:bg-neutral-50 text-neutral-600 hover:text-neutral-900 hover:shadow-lg"
                        }`}
                      >
                        <div className="absolute top-0 right-0 w-28 h-28 bg-amber-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-amber-500/10 transition-all duration-500"></div>
                        
                        <div className="flex items-center justify-between w-full relative z-10">
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border tracking-wide ${
                            themeMode === "black" ? "bg-neutral-950 border-neutral-850 text-neutral-400" : "bg-neutral-50 border-neutral-200 text-neutral-550"
                          }`}>
                            🏷️ {cardTag}
                          </span>
                          <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border tracking-wider ${levelColors[cardLevel] || "bg-blue-500/10 text-blue-400 border-blue-500/20"}`}>
                            {cardLevel}
                          </span>
                        </div>

                        <div className="relative z-10 space-y-1.5 flex-1">
                          <h4 className={`text-[12px] font-black tracking-wide ${
                            themeMode === "black" ? "text-neutral-100 group-hover:text-amber-400" : "text-neutral-950 group-hover:text-amber-850"
                          } transition-colors duration-300`}>
                            {cardTitle}
                          </h4>
                          <p className={`text-[11px] leading-relaxed line-clamp-3 ${
                            themeMode === "black" ? "text-neutral-400 group-hover:text-neutral-300" : "text-neutral-500 group-hover:text-neutral-755"
                          } transition-colors duration-350`}>
                            &ldquo;{cardPrompt}&rdquo;
                          </p>
                        </div>
                        
                        <div className={`text-[9px] font-black tracking-widest uppercase flex items-center gap-1.5 transition-all duration-300 group-hover:text-amber-400 ${
                          themeMode === "black" ? "text-neutral-600" : "text-neutral-400"
                        }`}>
                          <span>Activate Case</span>
                          <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Add Custom Suggestion Prompt Widget */}
                <div className={`mt-5 p-3 rounded-xl border flex items-center gap-2 ${
                  themeMode === "black"
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
                    className={`flex-1 text-xs bg-transparent border-0 outline-none focus:ring-0 px-2 ${
                      themeMode === "black" ? "text-neutral-200 placeholder-neutral-700" : "text-neutral-800 placeholder-neutral-400"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomPrompt}
                    disabled={!customPromptText.trim()}
                    className={`text-[10px] font-extrabold px-3 py-2 rounded-lg border transition-all duration-300 uppercase tracking-wider ${
                      themeMode === "black"
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
                        <div className={`border rounded-2xl rounded-tl-none px-4 sm:px-6 py-4 sm:py-5 leading-relaxed text-sm shadow-md backdrop-blur-md prose prose-sm max-w-full w-full overflow-hidden relative transition-colors duration-300 ${
                          themeMode === "black"
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
                                    <span className={`text-xs font-black tracking-wider uppercase animate-pulse ${
                                      themeMode === "black" ? "text-neutral-400" : "text-neutral-500"
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
                                            className={`relative my-6 px-5 py-4 rounded-xl border-l-[3px] ${
                                              themeMode === "black"
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
                            <div className="flex gap-1 items-center py-2">
                              <span className={`w-2 h-2 rounded-full animate-bounce [animation-delay:-0.3s] ${themeMode === "black" ? "bg-neutral-200" : "bg-neutral-500"}`}></span>
                              <span className={`w-2 h-2 rounded-full animate-bounce [animation-delay:-0.15s] ${themeMode === "black" ? "bg-neutral-200" : "bg-neutral-500"}`}></span>
                              <span className={`w-2 h-2 rounded-full animate-bounce ${themeMode === "black" ? "bg-neutral-200" : "bg-neutral-500"}`}></span>
                            </div>
                          )}
                        </div>
                        {msg.content && (
                          <div className="flex justify-start items-center gap-1">
                            <button
                              type="button"
                              onClick={() => copyToClipboard(msg.content, `msg-${index}`)}
                              className={`opacity-75 hover:opacity-100 focus:opacity-100 transition-opacity p-1 mt-1 rounded-md border flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 shadow-inner ${
                                themeMode === "black"
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
                  <div key={index} className="flex gap-4 items-start justify-end animate-fade-in font-sans">
                    <div className="flex flex-col gap-1.5 items-end max-w-[80%] group/msg relative">
                      <span className={`text-[10px] font-bold tracking-wider ${themeMode === "black" ? "text-neutral-500" : "text-neutral-400"}`}>YOUR BUSINESS INQUIRY</span>
                      <div className={`border rounded-2xl rounded-tr-none px-5 py-4 text-sm shadow-sm flex flex-col items-end relative transition-all duration-300 ${
                        themeMode === "black"
                          ? "bg-gradient-to-bl from-neutral-200/10 to-transparent border-neutral-200/20 text-amber-50"
                          : "bg-amber-500/10 border-amber-500/20 text-neutral-800"
                      }`}>
                        {imageUrl && (
                          <div className={`mb-2 relative rounded-xl overflow-hidden border group shadow-md max-w-full ${
                            themeMode === "black" ? "border-white/10" : "border-neutral-200"
                          }`}>
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
        <div className={`p-3 pb-6 sm:p-4 md:p-6 border-t transition-colors duration-300 ${
          themeMode === "black" 
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
            <form 
              onSubmit={handleSubmit}
              className={`w-full relative rounded-2xl border transition duration-300 overflow-hidden ${
                themeMode === "black"
                  ? "border-white/10 bg-[#0A0A0A] shadow-[0_0_40px_rgba(0,0,0,0.8)] focus-within:border-neutral-200/40 focus-within:ring-1 focus-within:ring-neutral-200/20"
                  : "border-neutral-200 bg-white shadow-[0_5px_30px_rgba(0,0,0,0.05)] focus-within:border-neutral-400 focus-within:ring-1 focus-within:ring-neutral-300"
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
              className={`w-full bg-transparent border-0 ring-0 focus:ring-0 focus:outline-none text-sm px-5 py-4 resize-none h-[64px] min-h-[50px] max-h-[200px] ${
                themeMode === "black"
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
            {attachedFile && (
              <div className={`mx-5 my-2 px-3 py-1.5 rounded-lg border text-xs flex items-center justify-between max-w-sm ${
                themeMode === "black"
                  ? "bg-neutral-200/10 border-neutral-200/20 text-white"
                  : "bg-neutral-100 border-neutral-200 text-neutral-850"
              }`}>
                <div className="flex items-center gap-2 truncate">
                  <FileText size={14} className={themeMode === "black" ? "text-neutral-200" : "text-neutral-600"} />
                  <span className="truncate font-semibold">{attachedFile.name}</span>
                </div>
                <button 
                  type="button" 
                  onClick={() => setAttachedFile(null)}
                  className={`p-0.5 transition ${
                    themeMode === "black" ? "text-neutral-500 hover:text-red-400" : "text-neutral-400 hover:text-red-500"
                  }`}
                >
                  <X size={14} />
                </button>
              </div>
            )}
            {isFileParsing && (
              <div className={`mx-5 my-2 text-xs flex items-center gap-1.5 animate-pulse ${
                themeMode === "black" ? "text-neutral-500" : "text-neutral-450"
              }`}>
                <Loader2 size={12} className={`animate-spin ${themeMode === "black" ? "text-neutral-200" : "text-neutral-600"}`} />
                <span>Parsing document data...</span>
              </div>
            )}

            <div className={`flex items-center justify-between px-5 pb-3 border-t pt-2.5 transition-colors duration-300 ${
              themeMode === "black"
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
                />
                
                {/* Paperclip Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading || isFileParsing}
                  title="Attach file (PDF, Word, Excel, Images, Text)"
                  className={`p-2 rounded-xl border transition duration-300 ${
                    themeMode === "black"
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
                  className={`p-2 rounded-xl border transition duration-300 ${
                    themeMode === "black"
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
                     className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-black tracking-widest uppercase transition-all duration-300 ${
                       isBrainTrust 
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
                       className={`px-2 py-1 text-[9px] font-black uppercase rounded-full border transition-all duration-300 outline-none ${
                         themeMode === "black" 
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

                {/* Mic Button */}
                <button
                  type="button"
                  onClick={toggleListening}
                  title={isListening ? "Stop listening" : "Dictate (Speech to Text)"}
                  className={`p-2 rounded-xl border transition duration-300 ${
                    isListening 
                      ? "bg-red-500/10 border-red-500/30 text-red-500 animate-pulse" 
                      : themeMode === "black"
                        ? "border-neutral-800 bg-neutral-900/40 text-neutral-400 hover:text-red-400 hover:border-red-500/20"
                        : "border-neutral-200 bg-white text-neutral-500 hover:text-red-500 hover:border-red-200"
                  }`}
                >
                  {isListening ? <MicOff size={15} /> : <Mic size={15} />}
                </button>
              </div>

              <span className={`text-[10px] select-none hidden md:inline-flex items-center gap-1 ml-4 ${
                themeMode === "black" ? "text-neutral-600" : "text-neutral-400"
              }`}>
                <CornerDownLeft size={10} /> Press Enter to send consultation
              </span>
              
              <button 
                type="submit"
                disabled={isLoading || (!inputMessage.trim() && !attachedFile)}
                className={`ml-auto p-2.5 rounded-xl flex items-center justify-center transition duration-300 ${
                  isLoading || (!inputMessage.trim() && !attachedFile)
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
      </main>
    </div>

    {/* Camera Modal Overlay */}
    {isCameraOpen && (
      <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${
        themeMode === "black" ? "bg-black/90 backdrop-blur-md" : "bg-neutral-900/60 backdrop-blur-sm"
      }`}>
        <div className={`relative w-full max-w-lg border rounded-3xl overflow-hidden shadow-2xl flex flex-col transition-all duration-300 ${
          themeMode === "black" ? "bg-[#0A0A0A] border-white/10" : "bg-white border-neutral-200"
        }`}>
          {/* Header */}
          <div className={`flex items-center justify-between p-4 border-b ${
            themeMode === "black" ? "border-white/5" : "border-neutral-150"
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
          <div className={`p-4 flex items-center justify-center border-t ${
            themeMode === "black" ? "border-white/5 bg-[#050505]" : "border-neutral-150 bg-[#FAFAFA]"
          }`}>
            <button
              onClick={capturePhoto}
              className={`group relative flex items-center justify-center w-16 h-16 rounded-full border-4 transition duration-300 ${
                themeMode === "black" 
                  ? "bg-white/10 border-white/20 hover:border-white" 
                  : "bg-black/5 border-neutral-300 hover:border-neutral-800"
              }`}
            >
              <div className={`w-12 h-12 rounded-full group-hover:scale-95 transition-transform duration-300 ${
                themeMode === "black" ? "bg-white" : "bg-neutral-800"
              }`}></div>
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Settings / Manage Account Modal */}
    {isSettingsModalOpen && (
      <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in ${
        themeMode === "black" ? "bg-black/90 backdrop-blur-md" : "bg-neutral-900/60 backdrop-blur-sm"
      }`}>
        <div className={`relative w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col p-6 space-y-6 transition-all duration-300 border ${
          themeMode === "black" ? "bg-[#0A0A0A] border-white/10" : "bg-white border-neutral-200"
        }`}>
          {/* Header */}
          <div className={`flex items-center justify-between border-b pb-4 ${
            themeMode === "black" ? "border-white/5" : "border-neutral-150"
          }`}>
            <div className="flex items-center gap-2">
              <Settings className="text-[#10b981]" size={20} />
              <h2 className={`font-bold text-lg tracking-wide ${themeMode === "black" ? "text-white" : "text-neutral-850"}`}>Manage Account</h2>
            </div>
            <button 
              onClick={() => setIsSettingsModalOpen(false)}
              className={`p-1 rounded-full transition ${
                themeMode === "black" ? "text-neutral-400 hover:text-white hover:bg-neutral-900" : "text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100"
              }`}
            >
              <X size={20} />
            </button>
          </div>

          {/* User Account Info */}
          <div className={`space-y-2 p-4 rounded-2xl border ${
            themeMode === "black" ? "bg-[#050505] border-neutral-900" : "bg-[#F8FAFC] border-neutral-200"
          }`}>
            <span className={`text-[10px] font-bold uppercase tracking-wider block ${
              themeMode === "black" ? "text-neutral-500" : "text-neutral-450"
            }`}>Logged in as</span>
            <div className="flex items-center gap-3">
              <UserButton />
              <div className="flex flex-col text-left">
                <span className={`text-sm font-bold truncate ${
                  themeMode === "black" ? "text-neutral-200" : "text-neutral-800"
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
              <span className={`text-xs font-bold ${themeMode === "black" ? "text-neutral-400" : "text-neutral-500"}`}>Current File Attachment</span>
              {attachedFile ? (
                <div className={`flex items-center justify-between p-3 rounded-2xl text-xs border ${
                  themeMode === "black" ? "bg-red-500/5 border-red-500/10" : "bg-red-500/10 border-red-200"
                }`}>
                  <div className="flex items-center gap-2 truncate">
                    <FileText size={15} className="text-red-500 flex-shrink-0" />
                    <span className={`truncate font-semibold ${themeMode === "black" ? "text-neutral-200" : "text-neutral-800"}`}>{attachedFile.name}</span>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm("Are you sure you want to remove the current file attachment?")) {
                        setAttachedFile(null);
                        alert("File attachment removed successfully.");
                      }
                    }}
                    className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl font-bold transition duration-300"
                  >
                    Delete File
                  </button>
                </div>
              ) : (
                <div className={`p-3 text-center rounded-2xl text-xs border ${
                  themeMode === "black" ? "bg-neutral-900/30 border-neutral-900 text-neutral-500" : "bg-neutral-50 border-neutral-200 text-neutral-450"
                }`}>
                  No file attached currently. You can attach a document using the clip icon in the chatbar.
                </div>
              )}
            </div>

            {/* 2. Delete All Conversations */}
            <div className="flex flex-col space-y-2 pt-2">
              <span className={`text-xs font-bold ${themeMode === "black" ? "text-neutral-400" : "text-neutral-500"}`}>Danger Zone</span>
              <div className={`p-4 rounded-2xl border space-y-3 ${
                themeMode === "black" ? "bg-red-500/5 border-red-500/10" : "bg-red-500/5 border-red-200"
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
                      className={`px-4 py-2.5 rounded-xl font-bold text-xs text-center transition duration-300 border ${
                        themeMode === "black" 
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
                    className={`w-full py-2.5 rounded-xl font-bold text-xs text-center transition duration-300 flex items-center justify-center gap-2 ${
                      chats.length === 0 
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
    )}
    </>
  );
}
