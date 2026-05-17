import React from "react";
import KuddusAvatar from "./KuddusAvatar";

export default function TypingIndicator() {
  return (
    <div className="flex gap-4 items-start max-w-3xl animate-pulse">
      <KuddusAvatar size={40} />
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-amber-500 tracking-wider">KUDDUS ALI</span>
        <div className="bg-[#121212]/80 border border-neutral-800/60 rounded-2xl rounded-tl-none px-5 py-4 text-neutral-300 shadow-lg backdrop-blur-md flex items-center gap-1.5 min-w-[80px] h-[48px]">
          <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
          <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
          <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-bounce"></span>
        </div>
      </div>
    </div>
  );
}
