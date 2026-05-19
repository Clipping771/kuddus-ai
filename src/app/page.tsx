"use client";

import React from "react";
import Link from "next/link";
import { useUser, SignInButton } from "@clerk/nextjs";
import { ArrowRight, Flame, ShieldAlert, Award, Compass, Sparkles, ChevronRight, Zap } from "lucide-react";
import { Plus_Jakarta_Sans } from "next/font/google";

const plusJakarta = Plus_Jakarta_Sans({ 
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap"
});

export default function Home() {
  const { isSignedIn, isLoaded } = useUser();
  const aiName = "Kacha Morich AI";
  const aiColor = "#10b981"; // Emerald Green

  const AIAvatar = ({ size = 36, className = "" }: { size?: number; className?: string }) => (
    <div
      className={`relative rounded-full flex items-center justify-center font-black text-black select-none ${className}`}
      style={{ width: size, height: size, backgroundColor: aiColor, fontSize: size * 0.45 }}
    >
      🌶️
      <span className="absolute bottom-0.5 right-0.5 w-2 h-2 bg-emerald-400 rounded-full border border-black animate-pulse" />
    </div>
  );

  return (
    <div className={`flex flex-col min-h-screen bg-[#050505] text-[#F5F5F7] ${plusJakarta.className} antialiased selection:bg-emerald-500/20 overflow-x-hidden relative`}>
      
      {/* Dynamic Vercel-Style Glowing Backdrop Mesh */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1400px] h-[750px] pointer-events-none select-none overflow-hidden z-0">
        {/* Glowing Focal Spotlight */}
        <div className="absolute top-[-100px] left-[15%] w-[45%] h-[400px] bg-gradient-to-br from-emerald-500/10 to-teal-500/0 rounded-full blur-[120px] animate-pulse duration-[8s]" />
        <div className="absolute top-[-50px] right-[15%] w-[40%] h-[400px] bg-gradient-to-bl from-amber-500/8 to-emerald-500/0 rounded-full blur-[120px] animate-pulse duration-[12s]" />
        
        {/* Subtle Luxury Mesh Grid overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_15%,#000_70%,transparent_100%)] opacity-85" />
      </div>

      {/* Navigation Header - Premium Translucent Glass */}
      <header className="relative z-50 backdrop-blur-xl bg-[#050505]/70 border-b border-white/[0.04] sticky top-0">
        <div className="max-w-6xl w-full mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 group cursor-pointer">
            <AIAvatar size={32} />
            <span className="text-sm font-bold tracking-wider text-white uppercase opacity-90 group-hover:opacity-100 transition-opacity">
              {aiName}
            </span>
          </div>
          
          <div className="flex items-center gap-6">
            {isLoaded && isSignedIn ? (
              <Link 
                href="/dashboard" 
                className="px-4 py-1.5 rounded-full text-xs font-semibold bg-white/[0.04] border border-white/[0.08] text-[#F5F5F7] hover:bg-white/[0.08] hover:border-white/[0.15] transition-all duration-200 flex items-center gap-1.5"
              >
                Go to Dashboard 
                <ChevronRight size={12} className="text-[#86868B]" />
              </Link>
            ) : (
              <SignInButton mode="modal">
                <button className="text-xs font-semibold text-[#86868B] hover:text-[#F5F5F7] transition duration-200">
                  Sign In
                </button>
              </SignInButton>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 flex-grow max-w-5xl w-full mx-auto px-6 pt-24 pb-32 flex flex-col items-center text-center">
        {/* Dynamic Sparkle Pill */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06] text-neutral-350 text-[11px] font-medium mb-8 tracking-wider uppercase animate-fade-in shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
          <Sparkles size={11} className="text-emerald-400 animate-pulse" />
          <span className="bg-gradient-to-r from-emerald-300 to-amber-250 bg-clip-text text-transparent font-bold">Uncompromising Business Critiques</span>
        </div>

        {/* Hero Title - Masterpiece Typography */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight max-w-5xl leading-[1.1] text-white">
          <span className="bg-clip-text text-transparent bg-gradient-to-b from-white via-neutral-150 to-neutral-400 drop-shadow-sm">
            Meet Kacha Morich AI.
          </span>
          <span className="block mt-5 text-xl sm:text-3xl md:text-4xl font-light text-[#9A9A9F] tracking-tight leading-snug">
            The advisory engine built for{" "}
            <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-emerald-300 to-teal-300 relative inline-block drop-shadow-[0_2px_15px_rgba(16,185,129,0.15)]">
              raw, unfiltered truth
              <span className="absolute bottom-1 left-0 w-full h-[2px] bg-gradient-to-r from-emerald-500 to-teal-400 opacity-60 rounded-full" />
            </span>
          </span>
        </h1>

        {/* Hero Description - Pristine & Clean */}
        <p className="mt-10 text-base sm:text-lg text-[#86868B] max-w-2xl leading-relaxed font-normal">
          Forget startup cheerleaders. We deliver high-fidelity business intelligence, market-specific threat assessments, and rigorous regulatory audits to secure your capital.
        </p>

        {/* Hero CTAs - Ultra Premium High Contrast Styling */}
        <div className="mt-12 flex flex-col sm:flex-row gap-5 items-center justify-center w-full max-w-md">
          {isLoaded && isSignedIn ? (
            <Link 
              href="/dashboard"
              className="w-full sm:w-auto px-8 py-3.5 rounded-full text-sm font-bold text-black bg-white hover:bg-neutral-200 transition-all duration-200 flex items-center justify-center gap-1.5 shadow-[0_0_30px_rgba(255,255,255,0.15)] hover:scale-[1.02] transform"
            >
              Start Free Consultation 
              <ArrowRight size={16} />
            </Link>
          ) : (
            <SignInButton mode="modal">
              <button 
                className="w-full sm:w-auto px-8 py-3.5 rounded-full text-sm font-bold text-black bg-white hover:bg-neutral-200 transition-all duration-200 flex items-center justify-center gap-1.5 shadow-[0_0_30px_rgba(255,255,255,0.15)] hover:scale-[1.02] transform"
              >
                Ask {aiName} Now 
                <ArrowRight size={16} />
              </button>
            </SignInButton>
          )}
          
          <a 
            href="#features" 
            className="w-full sm:w-auto px-8 py-3.5 rounded-full text-sm font-semibold text-[#86868B] hover:text-[#F5F5F7] hover:bg-white/[0.03] border border-transparent hover:border-white/[0.06] transition-all duration-200 flex items-center justify-center"
          >
            How it works
          </a>
        </div>

        {/* Features Section - Glassmorphic Panels */}
        <section id="features" className="mt-44 w-full pt-20 border-t border-white/[0.04]">
          <div className="text-center mb-20 max-w-xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight leading-tight">
              No sugarcoating. Just data.
            </h2>
            <p className="mt-4 text-sm text-[#86868B] leading-relaxed">
              We leverage multi-agent critique protocols alongside deep OCR analysis to identify operational and commercial risks instantly.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Feature 1 */}
            <div className="p-7 rounded-2xl border border-white/[0.04] bg-[#0A0A0C]/40 backdrop-blur-md hover:bg-white/[0.02] hover:border-emerald-500/25 transition-all duration-300 flex flex-col items-start text-left group shadow-lg">
              <div className="p-3 rounded-xl bg-white/[0.03] text-[#86868B] mb-6 border border-white/[0.06] group-hover:scale-105 transition-transform duration-300">
                <Flame size={20} className="text-emerald-400 group-hover:animate-pulse" />
              </div>
              <h3 className="text-xs font-bold text-white mb-3 tracking-widest uppercase flex items-center gap-2">
                ⚡ Brutal Verdict
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
              </h3>
              <p className="text-[12px] text-[#86868B] leading-relaxed font-light">
                Receive an immediate commercial viability index. Clear, objective grading with no executive summaries or corporate fluff.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-7 rounded-2xl border border-white/[0.04] bg-[#0A0A0C]/40 backdrop-blur-md hover:bg-white/[0.02] hover:border-emerald-500/25 transition-all duration-300 flex flex-col items-start text-left group shadow-lg">
              <div className="p-3 rounded-xl bg-white/[0.03] text-[#86868B] mb-6 border border-white/[0.06] group-hover:scale-105 transition-transform duration-300">
                <Compass size={20} className="text-emerald-400 group-hover:animate-pulse" />
              </div>
              <h3 className="text-xs font-bold text-white mb-3 tracking-widest uppercase flex items-center gap-2">
                📊 Strategy Audit
              </h3>
              <p className="text-[12px] text-[#86868B] leading-relaxed font-light">
                Instantly map regulatory hurdles, market penetration friction points, and local competitive densities dynamically.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-7 rounded-2xl border border-white/[0.04] bg-[#0A0A0C]/40 backdrop-blur-md hover:bg-white/[0.02] hover:border-emerald-500/25 transition-all duration-300 flex flex-col items-start text-left group shadow-lg">
              <div className="p-3 rounded-xl bg-white/[0.03] text-[#86868B] mb-6 border border-white/[0.06] group-hover:scale-105 transition-transform duration-300">
                <ShieldAlert size={20} className="text-emerald-400 group-hover:animate-pulse" />
              </div>
              <h3 className="text-xs font-bold text-white mb-3 tracking-widest uppercase flex items-center gap-2">
                ⚠️ Threat Index
              </h3>
              <p className="text-[12px] text-[#86868B] leading-relaxed font-light">
                Expose the top critical vectors for business failure. Know exactly what threatens your runway and how to counter it.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-7 rounded-2xl border border-white/[0.04] bg-[#0A0A0C]/40 backdrop-blur-md hover:bg-white/[0.02] hover:border-emerald-500/25 transition-all duration-300 flex flex-col items-start text-left group shadow-lg">
              <div className="p-3 rounded-xl bg-white/[0.03] text-[#86868B] mb-6 border border-white/[0.06] group-hover:scale-105 transition-transform duration-300">
                <Award size={20} className="text-emerald-400 group-hover:animate-pulse" />
              </div>
              <h3 className="text-xs font-bold text-white mb-3 tracking-widest uppercase flex items-center gap-2">
                🏆 Action Roadmap
              </h3>
              <p className="text-[12px] text-[#86868B] leading-relaxed font-light">
                Obtain a granular, step-by-step tactical playbook designed to validate your ideas with minimal overhead resource usage.
              </p>
            </div>
          </div>
        </section>

        {/* Premium Testimonial Quote Panel - Matte Satin */}
        <section className="mt-36 max-w-4xl w-full mx-auto rounded-3xl border border-white/[0.04] bg-[#0A0A0C]/60 backdrop-blur-xl p-8 sm:p-12 relative overflow-hidden flex flex-col sm:flex-row items-center gap-8 shadow-2xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[50px] rounded-full pointer-events-none" />
          <AIAvatar size={64} className="border border-white/10 flex-shrink-0" />
          <div className="flex-1 text-left">
            <p className="text-base sm:text-lg font-light italic text-[#F5F5F7] leading-relaxed">
              {"“I've seen brilliant proposals crash and simple ideas scale. I will never tell you what you want to hear to protect your emotions. I will tell you exactly what the market says.”"}
            </p>
            <div className="mt-5 flex items-center gap-2">
              <Zap size={13} className="text-emerald-400 animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-400">— {aiName} CEO Engine</span>
            </div>
          </div>
        </section>
      </main>

      {/* Premium Apple-Style Minimal Footer */}
      <footer className="relative z-10 max-w-6xl w-full mx-auto px-6 py-12 border-t border-white/[0.04] flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[#86868B]">
        <div>&copy; {new Date().getFullYear()} {aiName}. Engineered for objective corporate advisory.</div>
        <div className="flex gap-6">
          <Link href="/dashboard" className="hover:text-white transition duration-200">Dashboard</Link>
          <a href="#" className="hover:text-white transition duration-200">Terms</a>
          <a href="#" className="hover:text-white transition duration-200">Privacy</a>
        </div>
      </footer>
    </div>
  );
}
