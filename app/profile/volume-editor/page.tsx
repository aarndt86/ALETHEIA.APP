"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SOURCE_VOLUMES, VolumeSummary } from '@/lib/volumeData';

export default function VolumesSelectionScreen() {
  const router = useRouter();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [hasDraft, setHasDraft] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if an existing working draft exists on server or local storage
    async function checkDrafts() {
      try {
        const res = await fetch('/api/volume/draft?volumeId=vol-2025');
        if (res.ok) {
          const data = await res.json();
          // If version > 1 or modified, mark as active draft
          if (data.draft && (data.draft.version > 1 || data.source === 'persisted_disk' || data.source === 'memory')) {
            setHasDraft(prev => ({ ...prev, 'vol-2025': true }));
          }
        }
      } catch (e) {
        console.warn('Failed to check draft status:', e);
      } finally {
        setLoading(false);
      }
    }
    checkDrafts();
  }, []);

  const handleBackToSettings = () => {
    setIsTransitioning(true);
    setTimeout(() => router.push('/profile'), 450);
  };

  const handleSelectVolume = (vol: VolumeSummary) => {
    if (vol.status === 'in_progress') {
      // Unfinished year — Continue your year in daily flow
      setIsTransitioning(true);
      setTimeout(() => router.push('/home'), 500);
      return;
    }

    // Completed volume — open the genuine full manuscript editor
    setIsTransitioning(true);
    setTimeout(() => router.push(`/profile/volume-editor/editor?volumeId=${vol.id}`), 500);
  };

  return (
    <main className={`min-h-[100dvh] w-full flex flex-col p-6 sm:p-10 md:p-16 items-center bg-[var(--color-canvas-linen)] transition-all duration-[600ms] ${isTransitioning ? 'opacity-0 scale-[0.99]' : 'opacity-100 scale-100'}`}>
      
      {/* Top Archival Header */}
      <header className="w-full max-w-2xl flex justify-between items-center mb-12 sm:mb-16 opacity-0 animate-[fadeIn_0.8s_ease-out_forwards]">
        <button 
          type="button"
          onClick={handleBackToSettings}
          className="group flex items-center gap-2 font-sans text-[11px] tracking-[0.2em] uppercase text-[var(--color-text-graphite)] hover:text-[var(--color-text-ink)] transition-colors focus:outline-none"
          aria-label="Back to Settings"
        >
          <span className="group-hover:-translate-x-1 transition-transform duration-300">&larr;</span>
          <span>Preferences</span>
        </button>

        <span className="font-serif italic text-xs tracking-wider text-[var(--color-text-graphite)]/60">
          Archival Studio
        </span>
      </header>

      {/* Screen Title & Editorial Principle */}
      <div className="w-full max-w-2xl text-center mb-16 sm:mb-20 opacity-0 animate-[fadeInUp_0.8s_ease-out_0.1s_forwards]">
        <h1 className="font-serif text-3xl sm:text-4xl text-[var(--color-text-ink)] mb-4 tracking-tight">
          Your Volumes
        </h1>
        <p className="font-serif italic text-[15px] sm:text-base text-[var(--color-text-graphite)]/80 leading-relaxed max-w-md mx-auto">
          &ldquo;Altheara has preserved your year. Now make the book your own.&rdquo;
        </p>
      </div>

      {/* Volume Cards List */}
      <div className="w-full max-w-2xl flex flex-col gap-8 sm:gap-10 z-10 opacity-0 animate-[fadeInUp_0.8s_ease-out_0.25s_forwards]">
        {SOURCE_VOLUMES.map((vol) => {
          const isCompleted = vol.status === 'completed';
          const draftActive = hasDraft[vol.id];

          return (
            <article 
              key={vol.id}
              className={`group relative overflow-hidden rounded-[20px] p-6 sm:p-8 border transition-all duration-500 flex flex-col sm:flex-row gap-6 sm:gap-8 items-start sm:items-center
                ${isCompleted 
                  ? 'bg-white/40 border-[var(--color-text-graphite)]/15 hover:border-[var(--color-accent-clay)]/50 hover:bg-white/60 hover:shadow-lg' 
                  : 'bg-[var(--color-canvas-stone)]/30 border-[var(--color-text-graphite)]/10 opacity-75'
                }
              `}
            >
              {/* Linen Book Spine / Cover Mockup Thumbnail */}
              <div 
                className="w-24 h-32 sm:w-28 sm:h-38 rounded-sm shadow-md flex flex-col justify-between p-3 relative overflow-hidden shrink-0 border border-black/10 select-none"
                style={{
                  backgroundColor: vol.coverAccent,
                  boxShadow: 'inset 4px 0 8px rgba(0,0,0,0.25), 0 8px 18px rgba(0,0,0,0.12)'
                }}
              >
                {/* Subtle linen texture simulation */}
                <div 
                  className="absolute inset-0 pointer-events-none opacity-20 mix-blend-overlay"
                  style={{
                    backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%223%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/%3E%3C/svg%3E")'
                  }}
                />

                {/* Spine crease line */}
                <div className="absolute top-0 bottom-0 left-2 w-[1px] bg-white/20 shadow-[1px_0_1px_rgba(0,0,0,0.3)]"></div>

                <div className="relative z-10 pl-2">
                  <span className="font-sans text-[8px] tracking-[0.25em] uppercase text-white/70 block">
                    {vol.year}
                  </span>
                </div>

                <div className="relative z-10 pl-2">
                  <span className="font-serif text-[11px] font-medium leading-tight text-white block">
                    {vol.title}
                  </span>
                  <span className="font-sans text-[7px] tracking-wider text-white/60 uppercase block mt-1">
                    Altheara
                  </span>
                </div>
              </div>

              {/* Volume Information */}
              <div className="flex-1 flex flex-col justify-between self-stretch">
                <div>
                  {/* Status Badge */}
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-sans text-[10px] tracking-[0.25em] uppercase text-[var(--color-accent-clay)] font-medium">
                      Year {vol.year}
                    </span>
                    <span className="text-[var(--color-text-graphite)]/30">&bull;</span>
                    <span className={`font-sans text-[10px] tracking-[0.15em] uppercase
                      ${isCompleted ? 'text-[var(--color-accent-sage)] font-medium' : 'text-[var(--color-text-graphite)]/60'}
                    `}>
                      {isCompleted ? 'Completed Annual Volume' : 'In Progress (Current Year)'}
                    </span>
                  </div>

                  {/* Volume Title */}
                  <h2 className="font-serif text-2xl text-[var(--color-text-ink)] mb-2">
                    {vol.title}
                  </h2>

                  {/* Subtitle / Description */}
                  <p className="font-serif italic text-sm text-[var(--color-text-graphite)]/80 mb-4">
                    {vol.subtitle}
                  </p>

                  {/* Stats */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-sans text-[var(--color-text-graphite)]/70 mb-6">
                    {isCompleted ? (
                      <>
                        <span>{vol.totalMoments} Moments preserved</span>
                        <span>&bull;</span>
                        <span>{vol.chapterCount} Chapters</span>
                        <span>&bull;</span>
                        <span>~{vol.wordCount.toLocaleString()} Words</span>
                      </>
                    ) : (
                      <>
                        <span>{vol.totalMoments} Moments preserved so far</span>
                        <span>&bull;</span>
                        <span>Accumulating daily</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Single Clear Action Button */}
                <div className="pt-2 border-t border-[var(--color-text-graphite)]/10 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => handleSelectVolume(vol)}
                    className={`group/btn inline-flex items-center gap-2 py-2.5 px-5 rounded-full font-sans text-[11px] tracking-[0.18em] uppercase transition-all duration-300 focus:outline-none active:scale-[0.98]
                      ${isCompleted
                        ? 'bg-[var(--color-text-ink)] text-[var(--color-canvas-linen)] hover:bg-[var(--color-text-ink)]/90 shadow-sm hover:shadow'
                        : 'bg-transparent border border-[var(--color-text-graphite)]/30 text-[var(--color-text-graphite)] hover:border-[var(--color-text-ink)] hover:text-[var(--color-text-ink)]'
                      }
                    `}
                  >
                    <span>
                      {isCompleted 
                        ? (draftActive ? 'Continue Editing' : 'Create My Book')
                        : 'Continue Your Year'
                      }
                    </span>
                    <span className="transition-transform duration-300 group-hover/btn:translate-x-1">&rarr;</span>
                  </button>

                  {draftActive && isCompleted && (
                    <span className="font-sans text-[10px] tracking-wider text-[var(--color-accent-clay)]">
                      Draft In Progress
                    </span>
                  )}
                </div>

              </div>
            </article>
          );
        })}
      </div>

      {/* Archival Quality Footnote */}
      <footer className="w-full max-w-2xl flex justify-center mt-16 sm:mt-20 opacity-0 animate-[fadeIn_1.2s_ease-out_0.5s_forwards]">
        <p className="font-sans tracking-[0.25em] text-[10px] uppercase text-[var(--color-text-graphite)]/50 text-center">
          One year becomes one volume &bull; Preserved for generations
        </p>
      </footer>

    </main>
  );
}
