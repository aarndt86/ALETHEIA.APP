"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AletheiaDashboard() {
  const router = useRouter();
  const [isTransitioning, setIsTransitioning] = useState(false);

  const navigateTo = (path: string) => {
    setIsTransitioning(true);
    setTimeout(() => router.push(path), 600);
  };

  return (
    <main className={`relative min-h-[100dvh] pb-[88px] pt-[18vh] sm:pt-[22vh] px-8 sm:px-12 flex flex-col items-center bg-[var(--color-canvas-linen)] transition-opacity duration-[600ms] overflow-hidden ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
      
      {/* Visual Atmosphere Background */}
      <div 
        className="absolute inset-0 pointer-events-none mix-blend-multiply opacity-50"
        style={{
          background: 'radial-gradient(circle at 35% 65%, var(--color-canvas-stone) 0%, transparent 60%)',
          animation: 'breatheAtmosphere 20s ease-in-out infinite alternate'
        }}
      />

      <div className="relative w-full flex flex-col items-center z-10 opacity-0 animate-[spaceArrival_1.2s_ease-out_forwards]">
        {/* Top Header Layout */}
        <header className="relative w-full max-w-sm flex justify-center items-center mb-24">
          <h1 className="font-serif text-[11px] sm:text-xs tracking-[0.4em] uppercase text-[var(--color-text-graphite)]/60 text-center">
            Aletheia
          </h1>
          
          <button 
            onClick={() => navigateTo('/profile')}
            className="absolute right-0 w-8 h-8 rounded-full flex flex-col items-center justify-center border border-[var(--color-text-graphite)]/10 text-[var(--color-text-graphite)]/40 hover:text-[var(--color-text-graphite)]/70 hover:border-[var(--color-text-graphite)]/25 transition-all duration-[500ms] focus:outline-none active:scale-[0.96]"
            aria-label="Profile Settings"
          >
            <div className="w-[10px] h-[10px] rounded-full border border-current"></div>
          </button>
        </header>

        {/* Main Mode Options */}
        <div className="w-full max-w-lg flex flex-col items-center gap-16 sm:gap-24 mt-8">
          
          {/* New Echo (Starts Reflect Loop) */}
          <button 
            onClick={() => navigateTo('/echo')}
            className="group flex flex-col items-center text-center focus:outline-none transition-all duration-[600ms] opacity-[0.95] hover:opacity-100 active:scale-[1.02] active:opacity-100"
          >
            <span className="font-serif tracking-wide text-3xl sm:text-4xl text-[var(--color-text-ink)]/85 transition-colors duration-500">
              New Echo
            </span>
            <span className="font-serif italic text-sm sm:text-[15px] tracking-wide text-[var(--color-text-graphite)]/75 group-hover:text-[var(--color-text-graphite)]/90 transition-opacity duration-500 mt-4 leading-relaxed max-w-[220px]">
              Return to the quiet space
            </span>
          </button>

          {/* Timeline (Archive) */}
          <button 
            onClick={() => navigateTo('/timeline')}
            className="group flex flex-col items-center text-center focus:outline-none transition-all duration-[600ms] opacity-[0.95] hover:opacity-100 active:scale-[1.02] active:opacity-100"
          >
            <span className="font-serif tracking-wide text-3xl sm:text-4xl text-[var(--color-text-ink)]/85 transition-colors duration-500">
              Timeline
            </span>
            <span className="font-serif italic text-sm sm:text-[15px] tracking-wide text-[var(--color-text-graphite)]/75 group-hover:text-[var(--color-text-graphite)]/90 transition-opacity duration-500 mt-4 leading-relaxed max-w-[220px]">
              Review your past states
            </span>
          </button>

          {/* Story (Book Reveal) */}
          <button 
            onClick={() => navigateTo('/story')}
            className="group flex flex-col items-center text-center focus:outline-none transition-all duration-[600ms] opacity-[0.95] hover:opacity-100 active:scale-[1.02] active:opacity-100"
          >
            <span className="font-serif tracking-wide text-3xl sm:text-4xl text-[var(--color-text-ink)]/85 transition-colors duration-500">
              Story
            </span>
            <span className="font-serif italic text-sm sm:text-[15px] tracking-wide text-[var(--color-text-graphite)]/75 group-hover:text-[var(--color-text-graphite)]/90 transition-opacity duration-500 mt-4 leading-relaxed max-w-[220px]">
              Observe the narrative forming
            </span>
          </button>

        </div>
      </div>
      
    </main>
  );
}
