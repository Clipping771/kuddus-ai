"use client";

import React from "react";
import Link from "next/link";
import { useUser, SignInButton } from "@clerk/nextjs";
import { ArrowRight, Flame, ShieldAlert, Award, Compass, Sparkles, CheckCircle2, ChevronRight, Zap } from "lucide-react";

export default function Home() {
  const { isSignedIn, isLoaded } = useUser();
  const aiName = "Kacha Morich AI";
  const aiColor = "#10b981"; // Emerald Green

  const AIAvatar = ({ size = 42, className = "" }: { size?: number; className?: string }) => (
    <div
      className={`relative rounded-full flex items-center justify-center font-black text-black select-none shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-transform duration-500 hover:scale-110 ${className}`}
      style={{ width: size, height: size, backgroundColor: aiColor, fontSize: size * 0.5 }}
    >
      🌶️
      <span className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-[#050505] animate-pulse" />
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-[#050507] text-neutral-100 overflow-hidden relative selection:bg-emerald-500/30">
      {/* Premium Ambient Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-950/20 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-amber-950/15 blur-[150px] pointer-events-none" />

      {/* Grid Pattern with Premium Fade */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#141416_1px,transparent_1px),linear-gradient(to_bottom,#141416_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_80%,transparent_100%)] pointer-events-none opacity-60" />

      {/* Navigation Header */}
      <header className="relative z-50 backdrop-blur-md border-b border-white/5 bg-[#050507]/60 sticky top-0">
        <div className="max-w-7xl w-full mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AIAvatar size={36} />
            <span className="text-base sm:text-lg font-black tracking-widest text-white uppercase bg-gradient-to-r from-emerald-400 to-emerald-200 bg-clip-text text-transparent">
              {aiName}
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            {isLoaded && isSignedIn ? (
              <Link 
                href="/dashboard" 
                className="px-5 py-2.5 rounded-full text-xs sm:text-sm font-black border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-500/50 transition-all duration-300 shadow-[0_0_15px_rgba(16,185,129,0.15)] flex items-center gap-2 group"
              >
                Go to Dashboard 
                <ChevronRight size={14} className="transform group-hover:translate-x-1 transition-transform" />
              </Link>
            ) : (
              <SignInButton mode="modal">
                <button className="px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold border border-white/10 bg-white/5 text-neutral-300 hover:bg-white/10 hover:text-white transition duration-300">
                  Sign In
                </button>
              </SignInButton>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 flex-grow max-w-7xl w-full mx-auto px-6 pt-20 pb-32 flex flex-col items-center text-center">
        {/* Glowing Badge */}
        <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-neutral-300 text-xs font-semibold mb-8 animate-fade-in shadow-inner">
          <Sparkles size={14} className="text-emerald-400 animate-spin-slow" />
          <span>Multi-Specialist AI. Brutal Honesty.</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight max-w-5xl leading-[1.15] text-white">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-neutral-100 via-white to-neutral-400">
            Meet Kacha Morich AI
          </span>
          <span className="text-emerald-400 font-normal">.</span>
          <br className="hidden sm:inline" />
          <span className="text-xl sm:text-3xl md:text-4xl font-light tracking-wide text-neutral-400 block mt-4 sm:mt-6">
            The advisory engine that{" "}
            <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300 relative inline-block">
              delivers the raw truth
              <span className="absolute bottom-1 left-0 w-full h-[2px] bg-gradient-to-r from-emerald-500 to-amber-400 opacity-40 rounded-full"></span>
            </span>
          </span>
        </h1>

        {/* Hero Description */}
        <p className="mt-8 text-base sm:text-lg md:text-xl text-neutral-400 max-w-2xl leading-relaxed">
          Forget the startup cheerleaders. {aiName} delivers raw, high-fidelity business intelligence, regulatory audits, and market-specific threat assessments to save you from expensive failures.
        </p>

        {/* Hero CTAs */}
        <div className="mt-12 flex flex-col sm:flex-row gap-4 items-center justify-center w-full max-w-md">
          {isLoaded && isSignedIn ? (
            <Link 
              href="/dashboard"
              className="w-full sm:w-auto px-8 py-4 rounded-full text-base font-black text-black bg-emerald-400 hover:bg-emerald-300 transition duration-300 hover:scale-105 shadow-[0_8px_30px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2 group"
            >
              Start Free Consultation 
              <ArrowRight size={18} className="transform group-hover:translate-x-1.5 transition-transform" />
            </Link>
          ) : (
            <SignInButton mode="modal">
              <button 
                className="w-full sm:w-auto px-8 py-4 rounded-full text-base font-black text-black bg-emerald-400 hover:bg-emerald-300 transition duration-300 hover:scale-105 shadow-[0_8px_30px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2 group"
              >
                Ask {aiName} Now 
                <ArrowRight size={18} className="transform group-hover:translate-x-1.5 transition-transform" />
              </button>
            </SignInButton>
          )}
          
          <a 
            href="#features" 
            className="w-full sm:w-auto px-8 py-4 rounded-full text-base font-bold border border-white/5 bg-white/5 text-neutral-300 hover:bg-white/10 transition duration-300 backdrop-blur"
          >
            How it works
          </a>
        </div>

        {/* Dynamic Interactive Features Section */}
        <section id="features" className="mt-36 w-full pt-20 border-t border-white/5">
          <div className="text-center mb-16 max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              No Sugarcoating, Ever.
            </h2>
            <p className="mt-4 text-neutral-400 text-sm sm:text-base">
              Kacha Morich AI combines multi-agent critique models with deep OCR document analysis to verify raw facts.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feature 1 */}
            <div className="p-8 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent backdrop-blur hover:border-emerald-500/20 hover:bg-white/10 hover:shadow-[0_0_30px_rgba(16,185,129,0.05)] transition-all duration-500 group flex flex-col items-center text-center">
              <div className="p-4 rounded-xl bg-white/5 text-white mb-6 group-hover:scale-110 transition-transform duration-300">
                <Flame size={24} className="text-emerald-400" />
              </div>
              <h3 className="text-lg font-black mb-3 text-neutral-100 tracking-wide uppercase">⚡ BRUTAL VERDICT</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Receive an immediate, transparent validation index of your business proposal. No fluff, just the raw commercial facts.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-8 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent backdrop-blur hover:border-emerald-500/20 hover:bg-white/10 hover:shadow-[0_0_30px_rgba(16,185,129,0.05)] transition-all duration-500 group flex flex-col items-center text-center">
              <div className="p-4 rounded-xl bg-white/5 text-white mb-6 group-hover:scale-110 transition-transform duration-300">
                <Compass size={24} className="text-emerald-400" />
              </div>
              <h3 className="text-lg font-black mb-3 text-neutral-100 tracking-wide uppercase">📊 STRATEGY AUDIT</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Extract regulatory barriers, localization requirements, competitive densities, and consumer pain points dynamically.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-8 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent backdrop-blur hover:border-emerald-500/20 hover:bg-white/10 hover:shadow-[0_0_30px_rgba(16,185,129,0.05)] transition-all duration-500 group flex flex-col items-center text-center">
              <div className="p-4 rounded-xl bg-white/5 text-white mb-6 group-hover:scale-110 transition-transform duration-300">
                <ShieldAlert size={24} className="text-emerald-400" />
              </div>
              <h3 className="text-lg font-black mb-3 text-neutral-100 tracking-wide uppercase">⚠️ THREAT INDEX</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Highlight the top three points of strategic failure. Learn exactly what might kill your project and how to mitigate it.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-8 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent backdrop-blur hover:border-emerald-500/20 hover:bg-white/10 hover:shadow-[0_0_30px_rgba(16,185,129,0.05)] transition-all duration-500 group flex flex-col items-center text-center">
              <div className="p-4 rounded-xl bg-white/5 text-white mb-6 group-hover:scale-110 transition-transform duration-300">
                <Award size={24} className="text-emerald-400" />
              </div>
              <h3 className="text-lg font-black mb-3 text-neutral-100 tracking-wide uppercase">🏆 ACTION ROADMAP</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Receive a highly systematic, concrete 7-day tactical action plan designed to launch with minimal overhead capital.
              </p>
            </div>
          </div>
        </section>

        {/* Premium Testimonial Quote Panel */}
        <section className="mt-36 max-w-4xl w-full mx-auto rounded-3xl border border-white/5 bg-gradient-to-r from-emerald-950/20 to-neutral-900/10 p-8 sm:p-12 relative overflow-hidden flex flex-col sm:flex-row items-center gap-8 shadow-2xl">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 blur-xl rounded-full" />
          <AIAvatar size={80} className="border-4 border-white/5" />
          <div className="flex-1 text-left">
            <p className="text-lg sm:text-xl font-medium italic text-neutral-300 leading-relaxed">
              {"“I've seen brilliant proposals crash and basic concepts generate millions. I will never tell you what you want to hear to protect your feelings. I will tell you exactly what is real.”"}
            </p>
            <div className="mt-4 flex items-center gap-2">
              <Zap size={14} className="text-emerald-400" />
              <span className="text-xs font-black uppercase tracking-widest text-emerald-400">— {aiName} CEO Engine</span>
            </div>
          </div>
        </section>
      </main>

      {/* Premium Footer */}
      <footer className="relative z-10 max-w-7xl w-full mx-auto px-6 py-12 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
        <div>&copy; {new Date().getFullYear()} {aiName}. All rights reserved. Built for professional business analysis.</div>
        <div className="flex gap-6">
          <Link href="/dashboard" className="hover:text-white transition duration-300">Dashboard</Link>
          <a href="#" className="hover:text-white transition duration-300">Terms of Use</a>
          <a href="#" className="hover:text-white transition duration-300">Privacy Policy</a>
        </div>
      </footer>
    </div>
  );
}
