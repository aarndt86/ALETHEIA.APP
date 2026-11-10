"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AlthearaHomeScreen() {
  const router = useRouter();
  const [transitionTarget, setTransitionTarget] = useState<string | null>(null);

  const handleNavigate = (path: string) => {
    setTransitionTarget(path);
    setTimeout(() => {
      router.push(path);
    }, 600);
  };

  const destinations = [
    {
      label: 'New Echo',
      description: 'Leave a moment here.',
      path: '/echo',
    },
    {
      label: 'Archive',
      description: 'Revisit the moments you\u2019ve kept.',
      path: '/timeline',
    },
    {
      label: 'Story',
      description: 'Watch your story take shape.',
      path: '/story',
    },
  ];

  return (
    <main className={`min-h-[100dvh] w-full flex flex-col items-center justify-between relative overflow-hidden transition-all duration-[600ms] ease-in-out
      ${transitionTarget ? 'opacity-0' : 'opacity-100'}
      bg-[var(--color-canvas-linen)]
    `}>

      {/* Breathing atmosphere */}
      <div
        className="absolute inset-0 pointer-events-none mix-blend-multiply"
        style={{
          background: 'radial-gradient(circle at 40% 60%, var(--color-canvas-stone) 0%, transparent 60%)',
          animation: 'breatheAtmosphere 18s ease-in-out infinite alternate'
        }}
      />

      {/* Profile Icon */}
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

      {/* Main content */}
      <div
        className="w-full flex-1 flex flex-col items-center justify-between z-10 pt-[18vh] pb-[16vh]"
        style={{ animation: 'screenFloat 1200ms cubic-bezier(0.33, 1, 0.68, 1) both' }}
      >

        {/* Identity Anchor */}
        <div className="w-full flex justify-center">
          <span
            className="font-serif text-[11px] sm:text-xs tracking-[0.4em] uppercase text-[var(--color-text-ink)] opacity-70"
            style={{ animation: 'fadeItem 800ms cubic-bezier(0.33, 1, 0.68, 1) 0ms both' }}
          >
            Altheara
          </span>
        </div>

        {/* Three Destinations */}
        <div className="w-full flex-1 flex flex-col items-center justify-center gap-24 sm:gap-28">
          {destinations.map((dest, idx) => (
            <button
              key={dest.path}
              type="button"
              onClick={() => handleNavigate(dest.path)}
              className="group flex flex-col items-center text-center focus:outline-none transition-all duration-[600ms] opacity-[0.95] hover:opacity-100 active:scale-[1.02] active:opacity-100"
              style={{ animation: `fadeItem 800ms cubic-bezier(0.33, 1, 0.68, 1) ${200 + idx * 150}ms both` }}
            >
              <span className="font-serif tracking-wide text-3xl sm:text-4xl text-[var(--color-text-ink)]/85 transition-colors duration-500">
                {dest.label}
              </span>
              <span className="font-serif italic text-sm sm:text-[15px] tracking-wide text-[var(--color-text-graphite)]/75 group-hover:text-[var(--color-text-graphite)]/90 transition-opacity duration-500 mt-4 leading-relaxed max-w-[220px]">
                {dest.description}
              </span>
            </button>
          ))}
        </div>

        {/* Literary Studios & Libraries Quick Access */}
        <div
          className="w-full flex flex-col items-center gap-4 pt-10"
          style={{ animation: 'fadeItem 800ms cubic-bezier(0.33, 1, 0.68, 1) 700ms both' }}
        >
          <div className="w-12 h-[1px] bg-[var(--color-text-graphite)]/20" />
          <div className="flex items-center justify-center gap-6 px-4 text-center">
            <button
              type="button"
              onClick={() => handleNavigate('/profile/digital-library')}
              className="font-sans text-[10px] tracking-[0.22em] uppercase text-[var(--color-text-graphite)]/75 hover:text-[var(--color-text-ink)] transition-colors duration-300 focus:outline-none"
            >
              My Digital Library
            </button>
            <span className="text-[var(--color-text-graphite)]/30 text-xs select-none">&bull;</span>
            <button
              type="button"
              onClick={() => handleNavigate('/profile/legacy-publisher')}
              className="font-sans text-[10px] tracking-[0.22em] uppercase text-[var(--color-text-graphite)]/75 hover:text-[var(--color-text-ink)] transition-colors duration-300 focus:outline-none"
            >
              Legacy Publisher
            </button>
          </div>
        </div>

      </div>
    </main>
  );
}
