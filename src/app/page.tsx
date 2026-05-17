"use client";

import React from "react";
import Link from "next/link";
import { useUser, SignInButton } from "@clerk/nextjs";
import KuddusAvatar from "@/components/KuddusAvatar";
import { ArrowRight, Flame, ShieldAlert, Award, Compass, Sparkles } from "lucide-react";

export default function Home() {
  const { isSignedIn, isLoaded } = useUser();

  return (
    <div className="flex flex-col min-h-screen bg-[#0A0A0A] overflow-hidden">
      {/* Dynamic Grid Background Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f1f_1px,transparent_1px),linear-gradient(to_bottom,#1f1f1f_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none opacity-40"></div>

      {/* Top Header / Nav */}
      <header className="relative z-10 max-w-7xl w-full mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <KuddusAvatar size={40} />
          <span className="text-xl font-extrabold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-amber-600">
            KUDDUS ALI AI
          </span>
        </div>
        
        <div>
          {isLoaded && isSignedIn ? (
            <Link 
              href="/dashboard" 
              className="px-5 py-2.5 rounded-full text-sm font-semibold border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition duration-300 shadow-[0_0_15px_rgba(245,158,11,0.1)] flex items-center gap-1.5"
            >
              Go to Dashboard <ArrowRight size={16} />
            </Link>
          ) : (
            <SignInButton mode="modal">
              <button className="px-5 py-2.5 rounded-full text-sm font-semibold border border-neutral-800 bg-neutral-900 text-neutral-300 hover:bg-neutral-800 transition duration-300">
                Sign In
              </button>
            </SignInButton>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 flex-grow max-w-7xl w-full mx-auto px-6 pt-16 pb-24 flex flex-col items-center text-center">
        {/* Smirk Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-950/40 border border-amber-900/60 text-amber-500 text-xs font-semibold mb-8 animate-pulse">
          <Sparkles size={14} className="text-amber-400" />
          Unusual name. Unusual honesty.
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight max-w-4xl leading-tight">
          Meet Kuddus Ali — The Advisor Who{" "}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500">
            Tells You The Truth.
          </span>
        </h1>

        {/* Hero Description */}
        <p className="mt-8 text-lg sm:text-xl text-neutral-400 max-w-2xl leading-relaxed">
          Forget the sweet talk and startup cheerleaders. Kuddus Ali gives you brutally honest, battle-tested advice to save you from expensive failures and lead you to real profits.
        </p>

        {/* Hero CTAs */}
        <div className="mt-10 flex flex-col sm:flex-row gap-4 items-center justify-center">
          {isLoaded && isSignedIn ? (
            <Link 
              href="/dashboard"
              className="px-8 py-4 rounded-full text-base font-bold bg-amber-500 text-neutral-950 hover:bg-amber-400 hover:scale-105 transition duration-300 shadow-[0_4px_20px_rgba(245,158,11,0.4)] flex items-center gap-2"
            >
              Start Your Free Consultation <ArrowRight size={18} />
            </Link>
          ) : (
            <SignInButton mode="modal">
              <button className="px-8 py-4 rounded-full text-base font-bold bg-amber-500 text-neutral-950 hover:bg-amber-400 hover:scale-105 transition duration-300 shadow-[0_4px_20px_rgba(245,158,11,0.4)] flex items-center gap-2">
                Ask Kuddus Ali Now <ArrowRight size={18} />
              </button>
            </SignInButton>
          )}
          
          <a 
            href="#features" 
            className="px-8 py-4 rounded-full text-base font-bold border border-neutral-800 bg-neutral-900/60 text-neutral-300 hover:bg-neutral-800/80 transition duration-300 backdrop-blur"
          >
            How it works
          </a>
        </div>

        {/* Features Grid */}
        <section id="features" className="mt-32 w-full pt-16 border-t border-neutral-900">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-amber-500 text-center mb-16">
            What You Get (No Sugarcoating Guaranteed)
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feature 1 */}
            <div className="p-8 rounded-2xl border border-neutral-800/80 bg-neutral-900/30 backdrop-blur hover:border-amber-500/20 hover:bg-neutral-900/50 transition duration-300 flex flex-col items-center text-center">
              <div className="p-3.5 rounded-xl bg-amber-500/10 text-amber-400 mb-6">
                <Flame size={28} />
              </div>
              <h3 className="text-xl font-bold mb-3 text-neutral-100">⚡ brutal VERDICT</h3>
              <p className="text-sm text-neutral-400 leading-relaxed">
                You get a direct Go, No-Go, or Pivot verdict in the very first line. No beating around the bush.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-8 rounded-2xl border border-neutral-800/80 bg-neutral-900/30 backdrop-blur hover:border-amber-500/20 hover:bg-neutral-900/50 transition duration-300 flex flex-col items-center text-center">
              <div className="p-3.5 rounded-xl bg-amber-500/10 text-amber-400 mb-6">
                <Compass size={28} />
              </div>
              <h3 className="text-xl font-bold mb-3 text-neutral-100">📊 Market Deep-Dive</h3>
              <p className="text-sm text-neutral-400 leading-relaxed">
                {"Specific analyses tailored to your country's culture, regulations, competition, and search trends."}
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-8 rounded-2xl border border-neutral-800/80 bg-neutral-900/30 backdrop-blur hover:border-amber-500/20 hover:bg-neutral-900/50 transition duration-300 flex flex-col items-center text-center">
              <div className="p-3.5 rounded-xl bg-amber-500/10 text-amber-400 mb-6">
                <ShieldAlert size={28} />
              </div>
              <h3 className="text-xl font-bold mb-3 text-neutral-100">⚠️ Risk Assessment</h3>
              <p className="text-sm text-neutral-400 leading-relaxed">
                At least 3 critical, market-specific risks and realistic mitigations for regulatory and economic issues.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-8 rounded-2xl border border-neutral-800/80 bg-neutral-900/30 backdrop-blur hover:border-amber-500/20 hover:bg-neutral-900/50 transition duration-300 flex flex-col items-center text-center">
              <div className="p-3.5 rounded-xl bg-amber-500/10 text-amber-400 mb-6">
                <Award size={28} />
              </div>
              <h3 className="text-xl font-bold mb-3 text-neutral-100">➡️ 7-Day Action Plan</h3>
              <p className="text-sm text-neutral-400 leading-relaxed">
                A highly concrete, actionable roadmap with tasks that can be completed in 24 to 48 hours.
              </p>
            </div>
          </div>
        </section>

        {/* Smirking Kuddus Quote */}
        <section className="mt-32 max-w-4xl mx-auto rounded-3xl border border-amber-500/10 bg-gradient-to-b from-amber-500/5 to-transparent p-8 sm:p-12 relative overflow-hidden flex flex-col sm:flex-row items-center gap-8">
          <KuddusAvatar size={100} className="border-2 border-amber-500" />
          <div className="flex-1 text-left">
            <p className="text-xl sm:text-2xl font-medium italic text-neutral-300 leading-relaxed">
              {"“I've seen brilliant ideas fail and stupid ideas make millions. I won't tell you what you want to hear. I will tell you what is real.”"}
            </p>
            <p className="mt-4 text-sm font-bold text-amber-500 uppercase tracking-widest">— Kuddus Ali</p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 max-w-7xl w-full mx-auto px-6 py-12 border-t border-neutral-950 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-neutral-500">
        <div>&copy; {new Date().getFullYear()} Kuddus Ali AI. All rights reserved.</div>
        <div className="flex gap-6">
          <Link href="/dashboard" className="hover:text-amber-500 transition duration-300">Dashboard</Link>
          <a href="#" className="hover:text-amber-500 transition duration-300">Terms</a>
          <a href="#" className="hover:text-amber-500 transition duration-300">Privacy</a>
        </div>
      </footer>
    </div>
  );
}
