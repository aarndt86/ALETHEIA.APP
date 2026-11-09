"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ProfileScreen() {
  const router = useRouter();
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleClose = () => {
    setIsTransitioning(true);
    setTimeout(() => router.back(), 600);
  };

  return (
    <main className={`min-h-[100dvh] pb-[88px] flex flex-col p-8 sm:p-12 items-center bg-[var(--color-canvas-linen)] transition-opacity duration-[600ms] ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
      
      {/* Top Header */}
      <header className="w-full max-w-sm flex justify-between items-center mb-16 opacity-0 animate-[fadeIn_1s_ease-out_forwards]">
        <h1 className="font-sans text-[10px] tracking-[0.2em] uppercase text-[var(--color-text-graphite)] opacity-60">
          Preferences
        </h1>
        <button 
          type="button"
          onClick={handleClose}
          className="font-sans text-[10px] tracking-[0.2em] uppercase text-[var(--color-text-graphite)] hover:text-[var(--color-text-ink)] transition-colors focus:outline-none active:scale-95"
        >
          Close
        </button>
      </header>

      {/* Settings List */}
      <div className="w-full max-w-sm flex flex-col gap-10 mt-6 z-10 opacity-0 animate-[fadeInUp_0.8s_ease-out_forwards]" style={{ animationDelay: '0.2s' }}>
        
        {/* Volume Creation & Editor Entry */}
        <div 
          onClick={() => {
            setIsTransitioning(true);
            setTimeout(() => router.push('/profile/volume-editor'), 500);
          }}
          className="group flex flex-col gap-3 cursor-pointer select-none"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              setIsTransitioning(true);
              setTimeout(() => router.push('/profile/volume-editor'), 500);
            }
          }}
        >
          <div className="flex items-center justify-between">
            <span className="font-serif text-xl sm:text-2xl text-[var(--color-text-ink)] group-hover:text-[var(--color-text-ink)]/80 transition-colors">
              Volume Creation &amp; Editor
            </span>
            <span className="font-sans text-xs tracking-widest text-[var(--color-text-graphite)]/40 group-hover:text-[var(--color-text-ink)] group-hover:translate-x-0.5 transition-all">
              &rarr;
            </span>
          </div>
          <span className="font-sans text-xs text-[var(--color-text-graphite)]/70 group-hover:text-[var(--color-text-graphite)] transition-colors">
            Turn your year into a book worth keeping.
          </span>
          <div className="w-full h-[1px] bg-[var(--color-text-graphite)]/15 mt-2 group-hover:bg-[var(--color-accent-clay)]/40 transition-colors"></div>
        </div>

        {/* My Digital Library Entry */}
        <div 
          onClick={() => {
            setIsTransitioning(true);
            setTimeout(() => router.push('/profile/digital-library'), 500);
          }}
          className="group flex flex-col gap-3 cursor-pointer select-none"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              setIsTransitioning(true);
              setTimeout(() => router.push('/profile/digital-library'), 500);
            }
          }}
        >
          <div className="flex items-center justify-between">
            <span className="font-serif text-xl sm:text-2xl text-[var(--color-text-ink)] group-hover:text-[var(--color-text-ink)]/80 transition-colors">
              My Digital Library
            </span>
            <span className="font-sans text-xs tracking-widest text-[var(--color-text-graphite)]/40 group-hover:text-[var(--color-text-ink)] group-hover:translate-x-0.5 transition-all">
              &rarr;
            </span>
          </div>
          <span className="font-sans text-xs text-[var(--color-text-graphite)]/70 group-hover:text-[var(--color-text-graphite)] transition-colors">
            Your preserved editions and authentic recordings.
          </span>
          <div className="w-full h-[1px] bg-[var(--color-text-graphite)]/15 mt-2 group-hover:bg-[var(--color-accent-clay)]/40 transition-colors"></div>
        </div>

        <div className="flex flex-col gap-4">
          <span className="font-serif text-xl sm:text-2xl text-[var(--color-text-ink)]">Typography Size</span>
          <span className="font-sans text-xs text-[var(--color-text-graphite)] opacity-50">Medium (Default)</span>
          <div className="w-full h-[1px] bg-[var(--color-text-graphite)]/10 mt-2"></div>
        </div>

        <div className="flex flex-col gap-4">
          <span className="font-serif text-xl sm:text-2xl text-[var(--color-text-ink)]">Environment</span>
          <span className="font-sans text-xs text-[var(--color-text-graphite)] opacity-50">Match System</span>
          <div className="w-full h-[1px] bg-[var(--color-text-graphite)]/10 mt-2"></div>
        </div>

        <div className="flex flex-col gap-4">
          <span className="font-serif text-xl sm:text-2xl text-[var(--color-text-ink)]">Data & Archive</span>
          <span className="font-sans text-xs text-[var(--color-text-graphite)] hover:text-[var(--color-text-ink)] cursor-pointer opacity-50 transition-colors">Export Vault</span>
          <div className="w-full h-[1px] bg-[var(--color-text-graphite)]/10 mt-2"></div>
        </div>

      </div>
      
    </main>
  );
}
