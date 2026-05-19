"use client";

import React from "react";
import Link from "next/link";
import { useUser, SignInButton } from "@clerk/nextjs";
import { ArrowRight, Flame, ShieldAlert, Award, Compass, Sparkles, ChevronRight, Zap } from "lucide-react";

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
    <div className="flex flex-col min-h-screen bg-[#000000] text-[#F5F5F7] font-sans antialiased selection:bg-emerald-500/20">
      {/* Subtle Apple-style Ambient Vignette */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.06),transparent_60%)] pointer-events-none" />

      {/* Navigation Header - Minimal & Matte */}
      <header className="relative z-50 backdrop-blur-md bg-[#000000]/70 border-b border-[#1D1D1F] sticky top-0">
        <div className="max-w-6xl w-full mx-auto px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3 group cursor-pointer">
            <AIAvatar size={30} />
            <span className="text-sm font-semibold tracking-wider text-white uppercase opacity-90 group-hover:opacity-100 transition-opacity">
              {aiName}
            </span>
          </div>
          
          <div className="flex items-center gap-5">
            {isLoaded && isSignedIn ? (
              <Link 
                href="/dashboard" 
                className="px-4 py-1.5 rounded-full text-xs font-semibold bg-[#1D1D1F] border border-[#333336] text-[#F5F5F7] hover:bg-[#2D2D30] hover:border-[#444448] transition-all duration-200 flex items-center gap-1.5"
              >
                Go to Dashboard 
                <ChevronRight size={12} className="text-[#86868B]" />
              </Link>
            ) : (
              <SignInButton mode="modal">
                <button className="text-xs font-medium text-[#86868B] hover:text-[#F5F5F7] transition duration-200">
                  Sign In
                </button>
              </SignInButton>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 flex-grow max-w-5xl w-full mx-auto px-6 pt-24 pb-32 flex flex-col items-center text-center">
        {/* Subtle, refined badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#1D1D1F] border border-[#333336] text-[#86868B] text-[11px] font-medium mb-10 tracking-wide">
          <Sparkles size={11} className="text-emerald-400" />
          <span>High-Fidelity Multi-Agent Business Audit</span>
        </div>

        {/* Hero Title - Apple Typography Style */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight max-w-4xl leading-[1.08] text-white">
          Meet Kacha Morich AI.
          <span className="block mt-4 text-2xl sm:text-4xl md:text-5xl font-light text-[#86868B] tracking-normal leading-tight">
            The advisory engine built for{" "}
            <span className="text-[#F5F5F7] font-semibold">raw, unfiltered truth.</span>
          </span>
        </h1>

        {/* Hero Description - Minimalist Slate */}
        <p className="mt-8 text-sm sm:text-base md:text-lg text-[#86868B] max-w-2xl leading-relaxed font-light">
          Forget the startup cheerleaders. We deliver high-fidelity business intelligence, market-specific threat assessments, and rigorous regulatory audits to protect your capital.
        </p>

        {/* Hero CTAs - Apple-Style Solid White Pill & Subtle Text Trigger */}
        <div className="mt-12 flex flex-col sm:flex-row gap-5 items-center justify-center w-full max-w-md">
          {isLoaded && isSignedIn ? (
            <Link 
              href="/dashboard"
              className="w-full sm:w-auto px-7 py-3 rounded-full text-sm font-semibold text-black bg-white hover:bg-[#E8E8ED] transition duration-200 flex items-center justify-center gap-1.5 shadow-sm"
            >
              Start Free Consultation 
              <ArrowRight size={15} />
            </Link>
          ) : (
            <SignInButton mode="modal">
              <button 
                className="w-full sm:w-auto px-7 py-3 rounded-full text-sm font-semibold text-black bg-white hover:bg-[#E8E8ED] transition duration-200 flex items-center justify-center gap-1.5 shadow-sm"
              >
                Ask {aiName} Now 
                <ArrowRight size={15} />
              </button>
            </SignInButton>
          )}
          
          <a 
            href="#features" 
            className="w-full sm:w-auto px-7 py-3 rounded-full text-sm font-semibold text-[#86868B] hover:text-[#F5F5F7] hover:bg-white/5 transition duration-200 flex items-center justify-center"
          >
            How it works
          </a>
        </div>

        {/* Features Section - Google Dev Grid Style */}
        <section id="features" className="mt-40 w-full pt-20 border-t border-[#1D1D1F]">
          <div className="text-center mb-16 max-w-xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
              No sugarcoating. Just data.
            </h2>
            <p className="mt-3 text-sm text-[#86868B] font-light leading-relaxed">
              We leverage multi-agent critique protocols alongside deep OCR analysis to highlight operational and commercial risks before they happen.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Feature 1 */}
            <div className="p-6 rounded-2xl border border-[#1D1D1F] bg-[#0A0A0C]/50 hover:bg-[#111113]/80 hover:border-[#2A2A2D] transition-all duration-300 flex flex-col items-start text-left">
              <div className="p-2.5 rounded-lg bg-[#161618] text-[#86868B] mb-5 border border-[#2D2D30]">
                <Flame size={18} className="text-emerald-400" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-2 tracking-wide uppercase text-xs">⚡ Brutal Verdict</h3>
              <p className="text-[12px] text-[#86868B] leading-relaxed font-light">
                Receive an immediate commercial viability index. Clear, objective grading with no executive summaries or corporate fluff.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-2xl border border-[#1D1D1F] bg-[#0A0A0C]/50 hover:bg-[#111113]/80 hover:border-[#2A2A2D] transition-all duration-300 flex flex-col items-start text-left">
              <div className="p-2.5 rounded-lg bg-[#161618] text-[#86868B] mb-5 border border-[#2D2D30]">
                <Compass size={18} className="text-emerald-400" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-2 tracking-wide uppercase text-xs">📊 Strategy Audit</h3>
              <p className="text-[12px] text-[#86868B] leading-relaxed font-light">
                Instantly map regulatory hurdles, market penetration friction points, and local competitive densities dynamically.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-2xl border border-[#1D1D1F] bg-[#0A0A0C]/50 hover:bg-[#111113]/80 hover:border-[#2A2A2D] transition-all duration-300 flex flex-col items-start text-left">
              <div className="p-2.5 rounded-lg bg-[#161618] text-[#86868B] mb-5 border border-[#2D2D30]">
                <ShieldAlert size={18} className="text-emerald-400" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-2 tracking-wide uppercase text-xs">⚠️ Threat Index</h3>
              <p className="text-[12px] text-[#86868B] leading-relaxed font-light">
                Expose the top critical vectors for business failure. Know exactly what threatens your runway and how to counter it.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-2xl border border-[#1D1D1F] bg-[#0A0A0C]/50 hover:bg-[#111113]/80 hover:border-[#2A2A2D] transition-all duration-300 flex flex-col items-start text-left">
              <div className="p-2.5 rounded-lg bg-[#161618] text-[#86868B] mb-5 border border-[#2D2D30]">
                <Award size={18} className="text-emerald-400" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-2 tracking-wide uppercase text-xs">🏆 Action Roadmap</h3>
              <p className="text-[12px] text-[#86868B] leading-relaxed font-light">
                Obtain a granular, step-by-step tactical playbook designed to validate your ideas with minimal overhead resource usage.
              </p>
            </div>
          </div>
        </section>

        {/* Premium Testimonial Quote Panel - Matte Satin */}
        <section className="mt-36 max-w-4xl w-full mx-auto rounded-2xl border border-[#1D1D1F] bg-[#0A0A0C] p-8 sm:p-10 relative overflow-hidden flex flex-col sm:flex-row items-center gap-6 shadow-sm">
          <AIAvatar size={56} className="border border-white/5 flex-shrink-0" />
          <div className="flex-1 text-left">
            <p className="text-sm sm:text-base font-light italic text-[#F5F5F7] leading-relaxed">
              {"“I've seen brilliant proposals crash and simple ideas scale. I will never tell you what you want to hear to protect your emotions. I will tell you exactly what the market says.”"}
            </p>
            <div className="mt-4 flex items-center gap-1.5">
              <Zap size={11} className="text-emerald-400" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">— {aiName} CEO Engine</span>
            </div>
          </div>
        </section>
      </main>

      {/* Premium Apple-Style Minimal Footer */}
      <footer className="relative z-10 max-w-6xl w-full mx-auto px-6 py-10 border-t border-[#1D1D1F] flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[#86868B]">
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
