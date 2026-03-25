"use client";

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAppContext } from '@/components/AppProvider';
import { STORY_CHAPTERS, getStoryProgress } from '@/lib/storyData';

function StoryBookLayer() {
  const { totalEchoCount } = useAppContext();
  const { currentChapterIndex, paragraphsUnlockedInCurrentChapter } = getStoryProgress(totalEchoCount);
  const searchParams = useSearchParams();
  
  const highlightChapter = searchParams.get('chapter');
  const highlightP = searchParams.get('p');
  
  const [activeHighlight, setActiveHighlight] = useState<string | null>(null);

  useEffect(() => {
    if (highlightChapter && highlightP) {
      const targetId = `${highlightChapter}-p-${highlightP}`;
      
      // Delay to allow the structural DOM to mount and the entry transition from the Timeline to completely resolve
      setTimeout(() => {
        const el = document.getElementById(targetId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          
          // Trigger the visual highlight gently matching arrival
          setTimeout(() => {
            setActiveHighlight(targetId);
            
            // Clean it up cleanly after the animation finishes
            setTimeout(() => {
              setActiveHighlight(null);
            }, 2500);
          }, 300);
        }
      }, 700);
    }
  }, [highlightChapter, highlightP]);

  return (
    <main 
      className="absolute inset-0 w-full h-full min-h-[100dvh] flex flex-col items-center pt-[20vh] pb-[40vh] px-8 sm:px-12 md:px-24 bg-[var(--color-canvas-linen)] selection:bg-[var(--color-canvas-stone)] overflow-y-auto scroll-smooth animate-[storyBreath_1.5s_cubic-bezier(0.33,1,0.68,1)_forwards]"
      style={{ WebkitOverflowScrolling: 'auto', overscrollBehavior: 'none' }}
    >
      {/* 6. Subtle Cinematic Grain Overlay */}
      <div 
        className="absolute inset-0 pointer-events-none z-50 opacity-[0.04]"
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}
      ></div>

      <header className="w-full max-w-[540px] mb-40 sm:mb-56 flex flex-col items-center text-center">
        <h1 
          className="font-serif text-4xl sm:text-5xl text-[var(--color-text-ink)]/90 mb-8 tracking-wide opacity-0 animate-[fadeInUp_2s_ease-out_forwards]"
          style={{ animationDelay: '400ms' }}
        >
          Your Story
        </h1>
        <p 
          className="font-serif italic text-[15px] tracking-wide text-[var(--color-text-graphite)]/60 opacity-0 animate-[fadeInUp_2s_ease-out_forwards]"
          style={{ animationDelay: '550ms' }}
        >
          The accumulation of your presence
        </p>
      </header>

      <section className="w-full max-w-[540px] flex flex-col gap-48 sm:gap-64 opacity-0 animate-[fadeIn_2.5s_ease-out_forwards]" style={{ animationDelay: '1000ms' }}>
        {STORY_CHAPTERS.map((chap, cIdx) => {
          const isFullyUnlocked = cIdx < currentChapterIndex;
          const isCurrentActive = cIdx === currentChapterIndex;
          const isLocked = cIdx > currentChapterIndex;
          
          return (
            <article 
              key={chap.id} 
              className={`flex flex-col gap-12 sm:gap-16 transition-opacity duration-1000 ${isLocked ? 'opacity-40' : 'opacity-100'}`}
            >
              <header className="mb-4">
                <h2 
                  className={`font-serif text-xl sm:text-2xl text-[var(--color-text-ink)] mb-6 text-center md:text-left transition-all duration-[2s] ${isLocked ? 'blur-[4px]' : 'blur-0'} opacity-0 animate-[fadeInUp_2s_ease-out_forwards]`}
                  style={{ animationDelay: '700ms' }}
                >
                  {chap.title}
                </h2>
                
                {/* 2. Micro Progression Feedback Layer */}
                {isCurrentActive && (
                  <p 
                    className="font-serif italic text-[13px] text-[var(--color-text-graphite)]/70 text-center md:text-left mb-10 opacity-0 animate-[fadeIn_3s_ease-out_forwards]"
                    style={{ animationDelay: '850ms' }}
                  >
                    {totalEchoCount % 3 === 0 
                      ? "Your story is beginning to take shape." 
                      : `${3 - (totalEchoCount % 3)} more Echo${(3 - (totalEchoCount % 3)) === 1 ? '' : 's'} will reveal your next passage.`
                    }
                  </p>
                )}

                <div className="w-12 h-[1px] bg-[var(--color-text-graphite)]/20 mx-auto md:mx-0 mt-8"></div>
              </header>

              <div className="flex flex-col gap-12 md:gap-16">
                {chap.paragraphs.map((p, pIdx) => {
                  const isPUnlocked = isFullyUnlocked || (isCurrentActive && pIdx < paragraphsUnlockedInCurrentChapter);
                  const isCurrentlyWorking = isCurrentActive && pIdx === paragraphsUnlockedInCurrentChapter;
                  const isFarFuture = isLocked || (isCurrentActive && pIdx > paragraphsUnlockedInCurrentChapter);
                  
                  let opticalState = '';
                  if (isPUnlocked) {
                    opticalState = 'text-[var(--color-text-ink)]/90 blur-0';
                  } else if (isFarFuture) {
                    opticalState = 'text-[var(--color-text-graphite)]/30 blur-[6px] select-none';
                  } else if (isCurrentlyWorking) {
                    // 3. Gradual Text Clarity Systems evaluating continuous unlock potentials
                    const currentWorkingEchoes = totalEchoCount % 3;
                    if (currentWorkingEchoes === 0) opticalState = 'text-[var(--color-text-graphite)]/40 blur-[5px] select-none';
                    else if (currentWorkingEchoes === 1) opticalState = 'text-[var(--color-text-graphite)]/60 blur-[3px] select-none';
                    else if (currentWorkingEchoes === 2) opticalState = 'text-[var(--color-text-graphite)]/80 blur-[1.5px] select-none';
                  }

                  const currentId = `${chap.id}-p-${pIdx}`;
                  const isHighlighted = activeHighlight === currentId;
                  
                  return (
                    <p 
                      id={currentId}
                      key={pIdx} 
                      className={`font-serif text-[19px] sm:text-[21px] leading-[2.4] md:leading-[2.6] text-left break-words transition-all duration-[2000ms]
                      ${opticalState}
                      ${isHighlighted ? 'animate-[memoryHighlight_2.5s_ease-out_forwards]' : ''}
                    `}>
                      {p}
                    </p>
                  );
                })}
              </div>
            </article>
          );
        })}
      </section>

      {/* 7. Future Payoff Anchor */}
      <footer className="w-full flex justify-center mt-48 opacity-0 animate-[fadeIn_4s_ease-out_forwards]" style={{ animationDelay: '2000ms' }}>
        <p className="font-sans tracking-[0.25em] text-[10px] uppercase text-[var(--color-text-graphite)]/50">
          One year becomes one volume.
        </p>
      </footer>

    </main>
  );
}

export default function StoryRevealScreen() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] w-full bg-[var(--color-canvas-linen)]"></div>}>
      <StoryBookLayer />
    </Suspense>
  );
}
