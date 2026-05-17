import React from "react";

interface NovaAvatarProps {
  className?: string;
  size?: number;
}

export default function NovaAvatar({ className = "", size = 48 }: NovaAvatarProps) {
  return (
    <div 
      className={`relative rounded-full overflow-hidden border border-amber-500/30 bg-neutral-900 shadow-[0_0_15px_rgba(245,158,11,0.15)] flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Background Radial Glow */}
        <circle cx="50" cy="50" r="48" fill="url(#avatarGlow)" />

        {/* Shoulders / Suit jacket */}
        <path
          d="M20 90 C 25 70, 35 65, 50 65 C 65 65, 75 70, 80 90 Z"
          fill="#1C1917"
          stroke="#F59E0B"
          strokeWidth="1"
        />
        
        {/* White shirt collar */}
        <path
          d="M42 65 L 50 78 L 58 65 Z"
          fill="#FAFAFA"
        />

        {/* Neck */}
        <rect x="44" y="55" width="12" height="15" rx="3" fill="#D97706" />

        {/* Face */}
        <ellipse cx="50" cy="40" rx="20" ry="24" fill="#F59E0B" />

        {/* Modern Minimalist Glasses */}
        <rect x="34" y="32" width="12" height="8" rx="2" stroke="#171717" strokeWidth="2.5" fill="rgba(245, 158, 11, 0.2)" />
        <rect x="54" y="32" width="12" height="8" rx="2" stroke="#171717" strokeWidth="2.5" fill="rgba(245, 158, 11, 0.2)" />
        <line x1="46" y1="36" x2="54" y2="36" stroke="#171717" strokeWidth="2.5" />

        {/* Eyebrows (Serious/Sharp angles) */}
        <path d="M32 27 L 45 29" stroke="#171717" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M68 26 L 55 29" stroke="#171717" strokeWidth="2.5" strokeLinecap="round" />

        {/* Sleek Smart Smirk (The key signature personality trait!) */}
        {/* Slightly curved line lifting on the right side */}
        <path
          d="M42 50 C 42 50, 48 52, 58 48"
          stroke="#171717"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />
        
        {/* Smirk dimple corner */}
        <path
          d="M58 46 L 59 50"
          stroke="#171717"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Hair - Stylish crop */}
        <path
          d="M28 32 C 26 22, 34 14, 50 14 C 66 14, 74 22, 72 32 C 70 24, 60 18, 50 18 C 40 18, 30 24, 28 32 Z"
          fill="#1C1917"
        />

        {/* Gradients */}
        <defs>
          <radialGradient
            id="avatarGlow"
            cx="50%"
            cy="50%"
            r="50%"
            fx="50%"
            fy="50%"
          >
            <stop offset="0%" stopColor="#78350F" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#0A0A0A" stopOpacity="0.1" />
          </radialGradient>
        </defs>
      </svg>
      
      {/* Active Advisor Pulse Ring */}
      <span className="absolute bottom-1 right-1 w-2.5 h-2.5 bg-green-500 rounded-full border border-neutral-900 animate-pulse"></span>
    </div>
  );
}
