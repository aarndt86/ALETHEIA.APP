"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HomeGatewayScreen() {
  const router = useRouter();
  const [transitionState, setTransitionState] = useState<'idle' | 'reflect' | 'altheara'>('idle');

  const handleReflect = () => {
    setTransitionState('reflect');
    setTimeout(() => {
      // Bypassing legacy check-in directly linking into the master Reflect node
      router.push('/echo');
    }, 600);
  };

  const handleAltheara = () => {
    setTransitionState('altheara');
    setTimeout(() => {
      router.push('/altheara');
    }, 600);
  };

  return (
    <main className={`min-h-[100dvh] w-full flex flex-col items-center justify-between relative overflow-hidden transition-all duration-[600ms] ease-in-out
      ${transitionState !== 'idle' ? 'opacity-0' : 'opacity-100'}
      ${transitionState === 'reflect' ? 'bg-[var(--color-canvas-stone)] scale-[1.01]' : 'bg-[var(--color-canvas-linen)] scale-100'}
    `}>
      
      {/* 
        Visual Atmosphere:
        Faint, slowly shifting background gradient feeling alive but still.
      */}
      <div 
        className="absolute inset-0 pointer-events-none mix-blend-multiply"
        style={{
          background: 'radial-gradient(circle at 40% 60%, var(--color-canvas-stone) 0%, transparent 60%)',
          animation: 'breatheAtmosphere 18s ease-in-out infinite alternate'
        }}
      />

      {/* Profile Icon Overlay (Anchored to Space) */}
      <div className="absolute top-8 right-8 sm:top-12 sm:right-12 z-20 opacity-0 animate-[fadeItem_1.5s_ease-out_1s_forwards]">
        <button 
          type="button"
          onClick={() => router.push('/profile')}
          className="w-10 h-10 rounded-full flex flex-col items-center justify-center border border-[var(--color-text-graphite)]/20 text-[var(--color-text-graphite)] hover:text-[var(--color-text-ink)] hover:border-[var(--color-text-graphite)]/40 transition-all duration-[400ms] focus:outline-none active:scale-[0.96]"
          aria-label="Profile Settings"
        >
          <div className="w-3.5 h-3.5 rounded-full border-[1.5px] border-current"></div>
        </button>
      </div>

      {/* 
        Bulletproof Flex Layout solving the overlay issue 
        The global up-drift container bounds everything securely in a flex array
      */}
      <div 
        className="w-full flex-1 flex flex-col items-center justify-between z-10 pt-[26vh] pb-[20vh]"
        style={{ animation: 'screenFloat 1200ms cubic-bezier(0.33, 1, 0.68, 1) both' }}
      >
        
        {/* 1. Identity Anchor (Upper Third) */}
        <div className="w-full flex justify-center">
          <span 
            className="font-serif text-[11px] sm:text-xs tracking-[0.4em] uppercase text-[var(--color-text-ink)] opacity-70"
            style={{ animation: 'fadeItem 800ms cubic-bezier(0.33, 1, 0.68, 1) 0ms both' }}
          >
            Altheara
          </span>
        </div>

        {/* 2. Primary Action / Emotional Anchor (Perfect Center) */}
        <div className="w-full flex-1 flex flex-col items-center justify-center">
          <button 
            type="button"
            onClick={handleReflect}
            className="group focus:outline-none transition-transform duration-700 active:scale-[0.98]"
            style={{ animation: 'fadeItem 800ms cubic-bezier(0.33, 1, 0.68, 1) 200ms both' }}
            aria-label="Begin Reflect Mode"
          >
            <span 
              className="block font-serif text-5xl sm:text-6xl md:text-7xl text-[var(--color-text-ink)] leading-snug group-hover:opacity-80 transition-opacity duration-1000"
              style={{ animation: 'gentlePulse 6s ease-in-out infinite alternate' }}
            >
              Reflect
            </span>
          </button>
        </div>

        {/* 3. Secondary Action / Dashboard (Lower Third) */}
        <div className="w-full flex justify-center">
          <button 
            type="button"
            onClick={handleAltheara}
            className="group flex flex-col items-center focus:outline-none transition-transform duration-500 active:scale-[0.98] active:opacity-60"
            style={{ animation: 'fadeItem 800ms cubic-bezier(0.33, 1, 0.68, 1) 400ms both' }}
            aria-label="Enter Altheara Mode"
          >
            <span className="font-sans text-[10px] tracking-[0.35em] uppercase text-[var(--color-text-graphite)] opacity-80 group-hover:opacity-100 transition-colors duration-700">
              Enter Altheara
            </span>
          </button>
        </div>

      </div>
    </main>
  );
}
