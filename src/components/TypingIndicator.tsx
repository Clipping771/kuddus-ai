import React from "react";
interface TypingIndicatorProps {
  aiName: string;
  aiColor: string;
}

export default function TypingIndicator({ aiName, aiColor }: TypingIndicatorProps) {
  return (
    <div className="flex gap-4 items-start max-w-3xl animate-pulse">
      {/* Inline dynamic avatar for typing indicator */}
      <div
        className="relative rounded-full flex items-center justify-center font-black text-black flex-shrink-0"
        style={{ width: 40, height: 40, backgroundColor: aiColor, fontSize: 40 * 0.4 }}
      >
        {aiName.charAt(0).toUpperCase()}
        <span className="absolute bottom-0.5 right-0.5 w-2 h-2 bg-emerald-400 rounded-full border border-black animate-pulse" />
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold tracking-wider uppercase" style={{ color: aiColor }}>
          {aiName}
        </span>
        <div className="bg-[#121212]/80 border border-neutral-800/60 rounded-2xl rounded-tl-none px-5 py-4 text-neutral-300 shadow-lg backdrop-blur-md flex items-center gap-1.5 min-w-[80px] h-[48px]">
          <span className="w-2.5 h-2.5 rounded-full animate-bounce [animation-delay:-0.3s]" style={{ backgroundColor: aiColor }}></span>
          <span className="w-2.5 h-2.5 rounded-full animate-bounce [animation-delay:-0.15s]" style={{ backgroundColor: aiColor }}></span>
          <span className="w-2.5 h-2.5 rounded-full animate-bounce" style={{ backgroundColor: aiColor }}></span>
        </div>
      </div>
    </div>
  );
}
