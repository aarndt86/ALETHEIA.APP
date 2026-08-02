"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/components/AppProvider';

// Detailed Mock Data for the Timeline
const archiveData = [
  {
    month: "October 2026",
    entries: [
      { 
        id: "entry-1", 
        day: "12", 
        state: "Scattered", 
        preview: "The noise outside my window matched the static in my head. I sat down to...",
        echo: "The noise outside my window matched the static in my head. I sat down to write this, not knowing if it would help. There are too many moving pieces right now—projects at work, family obligations, and the constant hum of the news. I feel like my attention is being pulled in twenty directions, leaving nothing for myself.",
        reflection: "It sounds like you are standing in the center of a storm, trying to hold all the wind at once. The static you feel is not a failure of focus, but the natural weight of carrying too many worlds. Perhaps, for today, it is enough to drop just one of those pieces and simply listen to the noise outside, knowing you don't have to organize it.",
        hasReflection: true,
        storyMapping: { chapterId: 'chap-2', paragraphIndex: 1 }
      },
      { 
        id: "entry-2", 
        day: "10", 
        state: "Heavy", 
        preview: "A lingering sense of responsibility followed me throughout today's meetings...",
        echo: "A lingering sense of responsibility followed me throughout today's meetings. Even when I stepped away from the desk, I carried the unsaid thoughts of others on my shoulders.",
        reflection: "Responsibility can be a quiet tether. Notice how heavily you permit the unspoken expectations of others to weigh upon your own quiet hours. They are not yours to carry everywhere.",
        hasReflection: true,
        storyMapping: { chapterId: 'chap-2', paragraphIndex: 0 }
      },
      { 
        id: "entry-3", 
        day: "08", 
        state: "Centered", 
        preview: "Woke up before the alarm. The quiet of the house felt like a rare gift...",
        echo: "Woke up before the alarm. The quiet of the house felt like a rare gift, and for the first time in weeks, I didn't reach for my phone immediately. I just let the morning exist.",
        reflection: "There is profound power in allowing the morning to arrive without demanding anything from it. You created a sanctuary in those brief moments of stillness.",
        hasReflection: true,
        storyMapping: { chapterId: 'chap-1', paragraphIndex: 2 }
      },
    ]
  },
  {
    month: "September 2026",
    entries: [
      { 
        id: "entry-4", 
        day: "29", 
        state: "Light", 
        preview: "Finally let go of the project that was dragging me down. The immense relief...",
        echo: "Finally let go of the project that was dragging me down. The immense relief was immediate. It feels like I can breathe deeply again without hesitation.",
        reflection: "Sometimes the most necessary act of creation is the willingness to let something go. You have cleared the brush so new growth can eventually take root.",
        hasReflection: true,
        storyMapping: { chapterId: 'chap-1', paragraphIndex: 1 }
      }
    ]
  }
];

// Set to true to view the beautiful empty state
const isEmpty = false;

export default function TimelineScreen() {
  const router = useRouter();
  const { isTransitioningToBook, showPreservedMicrocopy, clearPreservedMicrocopy } = useAppContext();
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [isExpanding, setIsExpanding] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isTransitingOut, setIsTransitingOut] = useState(false);

  const getSelectedEntry = () => {
    for (const group of archiveData) {
      const entry = group.entries.find(e => e.id === selectedEntryId);
      if (entry) return { ...entry, month: group.month };
    }
    return null;
  };

  const selectedEntry = getSelectedEntry();

  const handleEntryTap = (id: string) => {
    if (selectedEntryId) return;
    
    // Scale isolation logic
    setSelectedEntryId(id);
    
    // Expand physics logic
    setTimeout(() => {
      setIsExpanding(true);
    }, 450);
  };

  const handleCloseDetail = () => {
    setIsClosing(true);
    
    setTimeout(() => {
      setIsExpanding(false);
      setSelectedEntryId(null);
      setIsClosing(false);
    }, 800);
  };

  const handleJumpToStory = (mapping: { chapterId: string, paragraphIndex: number }) => {
    setIsTransitingOut(true);
    
    setTimeout(() => {
      router.push(`/story?chapter=${mapping.chapterId}&p=${mapping.paragraphIndex}`);
    }, 800);
  };

  if (isEmpty) {
    return (
      <main className={`min-h-screen flex flex-col items-center justify-center p-8 bg-[var(--color-canvas-linen)] ${isTransitioningToBook ? 'animate-[timelineCompress_300ms_cubic-bezier(0.65,0,0.35,1)_forwards]' : ''}`}>
        <div className="max-w-md w-full text-center opacity-0 animate-[fadeIn_2s_ease-in_forwards]">
          <h2 className="font-serif text-2xl text-[var(--color-text-ink)] leading-relaxed mb-12">
            Your story begins with a single Echo.
          </h2>
          <Link 
            href="/check-in"
            className="group flex flex-col items-center focus:outline-none"
            aria-label="Begin today's reflection"
          >
            <span className="font-sans text-[var(--color-text-graphite)] text-xs tracking-[0.2em] uppercase border-b border-transparent group-hover:border-[var(--color-accent-clay)] group-hover:text-[var(--color-text-ink)] pb-2 transition-colors duration-700">
              Begin today's reflection
            </span>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main 
      className={`absolute inset-0 w-full h-full flex flex-col items-center bg-[var(--color-canvas-linen)] selection:bg-[var(--color-canvas-stone)] transition-all ease-[cubic-bezier(0.33,1,0.68,1)] overflow-y-auto no-scrollbar scroll-smooth
      ${selectedEntry && isExpanding ? 'overflow-hidden max-h-screen' : ''} 
      ${isTransitioningToBook ? 'animate-[timelineCompress_300ms_cubic-bezier(0.65,0,0.35,1)_forwards]' : ''}
      ${isTransitingOut ? 'opacity-0 blur-[5px] duration-[800ms]' : 'opacity-100 duration-1000'}
      `}
      style={{ WebkitOverflowScrolling: 'auto', overscrollBehavior: 'none' }}
    >
      
      {/* Visual Global Wrapper for Seamless Background Tracking */}
      <div className={`w-full flex-1 flex flex-col items-center pt-[15vh] px-8 sm:px-12 md:px-24 transition-all duration-[1000ms] ease-out
        ${isExpanding && !isClosing ? 'opacity-0 scale-[0.98] pointer-events-none' : 'opacity-100 scale-100 pointer-events-auto'}
      `}>
        
        {/* Timeline Header */}
      <header className="w-full max-w-3xl mb-32 sm:mb-40 flex flex-col items-center animate-[fadeIn_1.5s_ease-out_forwards]">
        <h1 className="font-serif text-3xl sm:text-4xl text-[var(--color-text-ink)]/90 tracking-wide">The Archive</h1>
        <p className="font-serif italic text-sm tracking-wide text-[var(--color-text-graphite)]/60 mt-6">
          Thoughts captured in time
        </p>
      </header>
      
      {/* Archive List Drop (Pure Typography Memory Map) */}
      <section className="w-full max-w-3xl flex flex-col items-center animate-[fadeIn_2s_ease-out_forwards]">
        {archiveData.map((group, groupIdx) => (
          <div key={groupIdx} className="w-full flex flex-col items-center">
            
            {/* Soft Month Typographic Divider */}
            <h2 className="font-serif italic text-lg sm:text-xl text-[var(--color-text-graphite)]/40 mb-20 sm:mb-24">
              {group.month}
            </h2>
            
            {/* Memory Entrances */}
            <div className="flex flex-col w-full items-center">
              {group.entries.map((entry, entryIdx) => (
                <React.Fragment key={entry.id}>
                  
                  <article 
                    onClick={() => handleEntryTap(entry.id)}
                    className={`group flex flex-col items-center text-center cursor-pointer w-full max-w-[440px] px-4 transition-all duration-700
                      ${selectedEntryId === entry.id && !isExpanding ? 'scale-[1.03]' : 'hover:scale-[1.01]'}
                      ${selectedEntryId && selectedEntryId !== entry.id ? 'opacity-85' : 'opacity-100'}
                    `}
                    aria-label={`Entry from ${group.month} ${entry.day}`}
                  >
                    
                    {/* The Excerpt */}
                    <p className="font-serif text-lg sm:text-[21px] text-[var(--color-text-ink)]/75 leading-[2.3] sm:leading-[2.5] group-hover:text-[var(--color-text-ink)]/95 transition-colors duration-700 mb-8 max-w-full">
                      "{entry.preview}"
                    </p>
                    
                    {/* Preserved in your story — newest entry only, after completion */}
                    {groupIdx === 0 && entryIdx === 0 && showPreservedMicrocopy && (
                      <p 
                        className="font-sans text-[9px] tracking-[0.15em] uppercase text-[var(--color-accent-sage)] opacity-50 mb-4"
                        onAnimationEnd={clearPreservedMicrocopy}
                      >
                        Preserved in your story.
                      </p>
                    )}

                    {/* Faint Typographic Date / State Meta */}
                    <div className="flex items-center justify-center gap-6 opacity-30 group-hover:opacity-60 transition-opacity duration-500">
                      <span className="font-sans text-[9px] sm:text-[10px] tracking-[0.2em] uppercase text-[var(--color-text-graphite)]">
                        {entry.day}
                      </span>
                      {entry.hasReflection && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent-sage)]/80"></span>
                      )}
                      <span className="font-sans text-[9px] sm:text-[10px] tracking-[0.2em] uppercase text-[var(--color-text-graphite)]">
                        {entry.state}
                      </span>
                    </div>

                  </article>

                  {/* Absolute Timeline Memory Dot (Fades deeply based on archive depth) */}
                  <div className="py-20 sm:py-28">
                    <span 
                      className="block w-1.5 h-1.5 rounded-full bg-[var(--color-text-graphite)]/50"
                      style={{ opacity: Math.max(0.08, 0.35 - ((groupIdx * 4 + entryIdx) * 0.05)) }}
                    ></span>
                  </div>

                </React.Fragment>
              ))}
            </div>
            
          </div>
        ))}
      </section>
      </div>
      
      {/* Full Entry Reading View Overlay */}
      {selectedEntryId && selectedEntry && (
        <div 
          className={`absolute top-0 left-0 right-0 z-50 flex flex-col p-6 sm:p-12 md:p-24 min-h-[100dvh] overflow-y-auto no-scrollbar scroll-smooth transition-all ease-[cubic-bezier(0.33,1,0.68,1)] pointer-events-none
            ${isExpanding && !isClosing ? 'opacity-100 translate-y-0 blur-0 duration-[1200ms] pointer-events-auto' : 'opacity-0 translate-y-6 blur-[1px] duration-[800ms]'}
          `}
          style={{ WebkitOverflowScrolling: 'auto', overscrollBehavior: 'none' }}
          role="dialog"
          aria-modal="true"
        >
          
          <div className="max-w-3xl w-full mx-auto">
            
            <button 
              onClick={handleCloseDetail}
              className="font-sans text-[10px] tracking-[0.2em] uppercase text-[var(--color-text-graphite)] hover:text-[var(--color-text-ink)] transition-colors self-start mb-16 sm:mb-24 focus:outline-none"
              aria-label="Close entry and return to archive"
            >
              Close
            </button>
            
            <article className="w-full">
              
              <header className="mb-16">
                <p className="font-sans text-[var(--color-accent-clay)] text-xs tracking-[0.2em] uppercase mb-4">
                  {/* Safely clean the exact month and day string */}
                  {selectedEntry.month.replace(/\d+/, '')} {selectedEntry.day}, {selectedEntry.month.match(/\d+/)} &mdash; {selectedEntry.state}
                </p>
                <div className="w-8 h-[1px] bg-[var(--color-canvas-stone)] my-8"></div>
              </header>
              
              {/* User's Original Echo */}
              <div className="mb-16">
                <span className="block font-sans text-[10px] tracking-[0.2em] uppercase text-[var(--color-text-graphite)] mb-6 opacity-60">
                  Your Echo
                </span>
                <p className="font-serif text-lg sm:text-xl text-[var(--color-text-ink)] leading-loose whitespace-pre-wrap">
                  {selectedEntry.echo}
                </p>
              </div>

              {/* The AI's Reflection */}
              {selectedEntry.reflection && (
                <div className="mt-16 sm:mt-24 pt-16 border-t border-[var(--color-canvas-stone)]/60">
                  <span className="block font-sans text-[10px] tracking-[0.2em] uppercase text-[var(--color-accent-sage)] mb-8 opacity-80">
                    A Reflection
                  </span>
                  <p className="font-serif text-xl sm:text-2xl text-[var(--color-text-ink)] italic leading-[1.8] whitespace-pre-wrap">
                    {selectedEntry.reflection}
                  </p>
                </div>
              )}

            </article>

            {/* Bottom Return Action */}
            <div className="mt-24 sm:mt-32 pb-32 flex flex-col items-center gap-12 sm:gap-16">
              
              <button 
                onClick={() => handleJumpToStory(selectedEntry.storyMapping)}
                className="font-serif italic text-sm sm:text-[15px] tracking-wide text-[var(--color-text-graphite)]/80 hover:text-[var(--color-text-ink)] transition-colors duration-500 focus:outline-none"
              >
                View in Story
              </button>

              <button 
                onClick={handleCloseDetail}
                className="font-sans text-[var(--color-text-graphite)] text-[10px] sm:text-xs tracking-[0.2em] uppercase hover:text-[var(--color-text-ink)] transition-colors duration-500 focus:outline-none"
              >
                Return to Archive
              </button>
            </div>
            
          </div>
          
        </div>
      )}
      
    </main>
  );
}
