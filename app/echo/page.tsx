"use client"

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/components/AppProvider';
import { STORY_CHAPTERS, getStoryProgress } from '@/lib/storyData';

interface EmotionalState {
  id: string;
  label: string;
  description: string;
}

const lockedStates: EmotionalState[] = [
  { id: 'calm', label: 'Calm', description: 'Quiet and clear' },
  { id: 'heavy', label: 'Heavy', description: 'Carrying weight' },
  { id: 'anxious', label: 'Anxious', description: 'Restless energy' },
  { id: 'content', label: 'Content', description: 'At peace' },
  { id: 'unsettled', label: 'Unsettled', description: 'Slightly off-balance' },
  { id: 'drifting', label: 'Drifting', description: 'Untethered' },
  { id: 'grounded', label: 'Grounded', description: 'Rooted and present' },
  { id: 'searching', label: 'Searching', description: 'Looking for direction' },
];

export default function UnifiedReflectLoopScreen() {
  const { selectedState, setSelectedState, currentDraft, setCurrentDraft, completeToday, totalEchoCount } = useAppContext();
  const router = useRouter();
  
  const [content, setContent] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [stage, setStage] = useState<'checkin' | 'writing' | 'morphing' | 'reflection' | 'sealing' | 'reveal' | 'returning'>('checkin');
  const [checkInDisappearing, setCheckInDisappearing] = useState(false);
  const [reflectionText, setReflectionText] = useState<string[]>([]);
  const [isTransitingOut, setIsTransitingOut] = useState(false);
  
  // Custom Expression Layer Dynamics
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lineCount = content.split('\n').length;
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Rigid DOM cleanup when mounting the master loop
    setSelectedState(null);
    setContent('');
    setCurrentDraft('');
    setIsLoaded(true);
  }, []);

  const handleSelection = (id: string) => {
    if (selectedState) return;
    
    setSelectedState(id);
    
    // 1. Emotion Selection scales 1.0 -> 1.05 and lets grid drop away (600ms absolute wait)
    setTimeout(() => {
      // 2. Trigger upward drift sequence natively resolving into the prompt
      setCheckInDisappearing(true);
      
      // 3. Move to writing context completely liquidly
      setTimeout(() => {
        setStage('writing');
        setTimeout(() => textareaRef.current?.focus(), 100);
      }, 800); 
    }, 600);
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);
    setCurrentDraft(val);
    
    // Writing Rhythm (Slow the experience intentionally by causing the DOM to "settle")
    setIsTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 150);
  };

  const generateReflection = () => {
    return [
      `You are describing a quiet sense of ${selectedState || 'presence'}.`,
      `Through your words, it becomes clear that`,
      `what you are feeling is not random,`,
      `but a necessary shedding of weight.`,
      ` `,
      `There is a profound clarity in admitting this`,
      `exactly as it is written.`,
      ` `,
      `Notice how naming the feeling`,
      `physically creates space between you and the noise.`,
      ` `,
      `You do not need to solve anything today.`,
      `You only need to witness it.`
    ];
  };

  const handleSealEcho = () => {
    // 9. Save action = "Placement", not button.
    // Explicit transition staging forcing the textarea to immediately translate downward acknowledging the input.
    setStage('morphing');
    setReflectionText(generateReflection());
    
    setTimeout(() => {
      setStage('reflection');
    }, 1200);
  };

  const handleSaveReflection = () => {
    // Stage 1: Commit and drop CTA leaving exactly 800ms anticipation silence
    setStage('sealing');
    
    completeToday({
      excerpt: content,
      state: selectedState || 'reflective'
    });
    
    // Stage 2: Fire central Reveal artifact
    setTimeout(() => {
      setStage('reveal');
    }, 800);
  };

  const handleDone = () => {
    // Stage 1: Dissolve the Micro-Payoff geometry allowing the blurred Reflection layer to physically sharpen back to focus
    setStage('returning');
    
    // Stage 2: After 800ms of visual recovery, plunge the entire space into the global crossfade logic
    setTimeout(() => {
      setIsTransitingOut(true);
      
      // Stage 3: Resolve physical route completely into the Intent Gateway
      setTimeout(() => {
        router.push('/home');
      }, 800);
    }, 800);
  };

  // Build the dynamic Glimpse slice based strictly on the current memory accumulation depth
  const { currentChapterIndex, paragraphsUnlockedInCurrentChapter } = getStoryProgress(totalEchoCount);
  const currentChapter = STORY_CHAPTERS[currentChapterIndex];
  
  let p1Idx = Math.max(0, paragraphsUnlockedInCurrentChapter - 1);
  let p2Idx = p1Idx + 1;
  
  if (paragraphsUnlockedInCurrentChapter >= currentChapter.paragraphs.length) {
    p2Idx = currentChapter.paragraphs.length - 1;
    p1Idx = Math.max(0, p2Idx - 1);
  } else if (paragraphsUnlockedInCurrentChapter === 0) {
    p2Idx = -1; // Hide sequence deeply
  }

  const glimpseParagraphs = [];
  if (currentChapter.paragraphs[p1Idx]) {
    glimpseParagraphs.push(currentChapter.paragraphs[p1Idx]);
  }
  if (p2Idx !== -1 && currentChapter.paragraphs[p2Idx]) {
    glimpseParagraphs.push(currentChapter.paragraphs[p2Idx]);
  }
  
  // Create the deep continuation block for ambient text overlap
  const fullAmbientText = glimpseParagraphs.join(" \n\n ") 
    + (currentChapter.paragraphs[p2Idx + 1] ? ` \n\n ${currentChapter.paragraphs[p2Idx + 1]}` : "");

  if (!isLoaded) return <main className="min-h-[100dvh] bg-[var(--color-canvas-linen)]"></main>;

  return (
    <main className={`min-h-[100dvh] w-full flex flex-col items-center justify-center px-8 sm:px-12 relative overflow-hidden transition-all ease-out 
      ${stage === 'checkin' || stage === 'writing' ? 'bg-[var(--color-canvas-linen)] duration-[1000ms]' : 'bg-[#EAE8DD] duration-[1200ms]'}
      ${isTransitingOut ? 'opacity-0 duration-[800ms]' : 'opacity-100'}
    `}>
      
      {/* 
        Subtle Base Environment Darkener and Grain Washes (Surface Transformation)
      */}
      <div 
        className={`absolute inset-0 pointer-events-none transition-all ease-out z-0
        ${stage === 'checkin' || stage === 'writing' ? 'bg-transparent opacity-0 duration-0' : 'bg-[#363532] opacity-[0.05] duration-[1200ms]'}`}
      ></div>
      {/* 1. Expression Layer: 2% organic noise filter establishing the domain void */}
      <div 
        className={`absolute inset-0 pointer-events-none z-0 mix-blend-multiply opacity-[0.015]`}
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}
      ></div>
      {/* 7. Receiving Feedback: The warm wash progressively deepens directly relative to the active line array count */}
      <div 
        className={`absolute inset-0 bg-[#E8E1D5] pointer-events-none transition-opacity duration-1000 ease-out z-0 mix-blend-multiply
        ${(stage === 'writing' && content.length > 0) ? '' : 'opacity-0'}
        `}
        style={{ opacity: stage === 'writing' ? Math.min(0.08, lineCount * 0.015) : 0 }}
      ></div>

      {/* 
        1. The Admission Node (Emotion Assembly)
      */}
      <div className={`absolute inset-0 w-full h-full flex flex-col items-center justify-center p-8 sm:p-12 z-20 transition-opacity duration-700 ease-in pointer-events-none
        ${stage === 'checkin' ? 'opacity-100' : 'opacity-0'}
      `}>
        <header className={`mb-20 text-center transition-all duration-700 ease-out 
          ${selectedState ? 'opacity-0 blur-[10px] -translate-y-4' : 'opacity-100'}
        `}>
          <h1 className="font-serif text-2xl md:text-3xl text-[var(--color-text-ink)] mb-4">
            What feels present right now?
          </h1>
        </header>

        <div className="w-full max-w-lg grid grid-cols-2 gap-x-8 gap-y-16 sm:gap-x-12 sm:gap-y-20">
          {lockedStates.map((stateInfo) => {
            const isSelected = selectedState === stateInfo.id;
            const hasSelection = selectedState !== null;
            
            return (
              <button
                key={stateInfo.id}
                onClick={() => handleSelection(stateInfo.id)}
                disabled={hasSelection}
                className={`
                  group flex flex-col items-center justify-center p-4 focus:outline-none pointer-events-auto
                  ${hasSelection && !isSelected ? 'opacity-0 blur-[8px] transition-all duration-[500ms] ease-out' : 'opacity-80 hover:opacity-100 transition-all duration-[400ms] ease-out'}
                  ${isSelected && !checkInDisappearing ? 'opacity-100 scale-[1.05] transition-all duration-[400ms] ease-out' : ''}
                  ${isSelected && checkInDisappearing ? 'opacity-0 -translate-y-16 blur-sm transition-all duration-[800ms] ease-in-out' : ''}
                  ${!hasSelection ? 'hover:scale-[1.02] active:scale-[0.98]' : ''}
                `}
                aria-pressed={isSelected}
              >
                <span className={`font-serif text-xl sm:text-2xl ${isSelected ? 'text-black font-medium transition-colors duration-[180ms]' : 'text-[var(--color-text-graphite)] group-hover:text-[var(--color-text-ink)] transition-colors duration-[400ms]'}`}>
                  {stateInfo.label}
                </span>
                <span className={`font-sans text-[10px] tracking-[0.2em] uppercase mt-3 transition-opacity duration-300 
                  ${isSelected && hasSelection ? 'opacity-0' : 'text-[var(--color-text-graphite)]/60 group-hover:text-[var(--color-accent-clay)]/70'}
                `}>
                  {stateInfo.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 
        2. The Contiguous Input Layer (Writing & Echo Morphing)
        Physically mapped to drop in exactly as the admission payload drifts upward.
      */}
      <div className={`absolute top-0 w-full max-w-[520px] flex flex-col pt-[24vh] px-6 sm:px-8 transition-all ease-in-out z-10 
        ${stage === 'checkin' ? 'opacity-0 translate-y-8 duration-0 pointer-events-none' : ''}
        ${stage === 'writing' ? 'opacity-100 scale-100 blur-0 translate-y-0 duration-[1000ms] pointer-events-auto' : ''} 
        ${stage === 'morphing' ? 'opacity-60 scale-[1.02] blur-sm duration-[400ms] pointer-events-none' : ''}
        ${(stage === 'reflection' || stage === 'sealing' || stage === 'reveal') ? 'opacity-25 scale-[1.02] blur-[2px] pointer-events-none duration-[800ms]' : ''}
      `}>
        <div className={`mb-24 sm:mb-32 transition-all duration-[800ms] pointer-events-none
          ${stage === 'checkin' ? 'opacity-0' : ''}
          ${stage === 'writing' && content.length === 0 ? 'opacity-70 translate-y-0 blur-0' : ''}
          ${stage === 'writing' && content.length > 0 ? 'opacity-0 -translate-y-2 blur-sm absolute' : ''}
          ${stage !== 'checkin' && stage !== 'writing' ? 'opacity-0 hidden' : ''}
        `}>
          <h2 className="font-serif text-[20px] sm:text-[22px] text-[var(--color-text-ink)] text-left italic font-light tracking-wide">
            What have you been carrying that no one sees?
          </h2>
        </div>
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          readOnly={stage !== 'writing'}
          spellCheck="false"
          className={`w-full bg-transparent resize-none outline-none font-serif text-[21px] sm:text-2xl lg:text-[26px] text-[var(--color-text-ink)] leading-[1.8] sm:leading-[1.9] min-h-[50vh] focus:outline-none transition-all duration-[180ms] ease-out
            ${isTyping ? 'opacity-95 translate-y-[2px]' : 'opacity-100 translate-y-0'}
            ${stage === 'morphing' ? 'opacity-40 translate-y-2 blur-[1px] pointer-events-none' : ''}
          `}
          style={{ 
            caretColor: 'var(--color-text-graphite)',
            textShadow: isTyping ? '0 1px 2px rgba(0,0,0,0.02)' : '0 1px 0 rgba(0,0,0,0)'
          }}
        />
      </div>

      <div 
        className={`absolute bottom-20 flex justify-center w-full transition-all duration-[800ms] ease-out z-20 
          ${stage === 'writing' && content.trim().length >= 10 ? 'opacity-100 pointer-events-auto translate-y-0' : 'opacity-0 pointer-events-none translate-y-2'}
        `}
      >
        <button 
          onClick={handleSealEcho}
          disabled={stage !== 'writing'}
          className="group flex flex-col items-center focus:outline-none transition-transform duration-300 active:scale-[0.98] active:opacity-60"
        >
          <span className="font-sans text-[var(--color-text-graphite)]/60 text-[10px] sm:text-xs tracking-[0.25em] uppercase pb-2 transition-colors duration-[600ms] group-hover:text-[var(--color-text-graphite)]/90">
            Form
          </span>
        </button>
      </div>

      {/* 
        3. The Reflection Geometry
        Assembled natively fading over the deepened background matrix. Provides an inherent 3-4px blur push during Stage 4.
      */}
      <div className={`absolute inset-0 w-full h-full flex flex-col items-center justify-start z-30 transition-all duration-[1500ms] ease-out overflow-y-auto no-scrollbar pointer-events-none
        ${(stage === 'reflection' || stage === 'sealing' || stage === 'returning') ? 'opacity-100 blur-0 translate-y-0' : ''}
        ${stage === 'reveal' ? 'opacity-30 blur-[6px] -translate-y-8 pointer-events-none' : ''}
        ${stage === 'checkin' || stage === 'writing' || stage === 'morphing' ? 'opacity-0' : ''}
      `}
      style={{ WebkitOverflowScrolling: 'auto', overscrollBehavior: 'none' }}
      >
        <div className={`w-full max-w-lg pt-[26vh] pb-[30vh] ${stage === 'reflection' ? 'pointer-events-auto' : 'pointer-events-none'}`}>
          {reflectionText.map((line, idx) => (
            <span 
              key={idx} 
              className={`block font-serif text-lg sm:text-xl lg:text-2xl text-[var(--color-text-ink)] leading-[1.8] sm:leading-[2]
                ${line === ' ' ? 'h-6 sm:h-8' : ''}
                ${(stage === 'reflection' || stage === 'sealing' || stage === 'reveal') ? 'opacity-0 animate-[fadeInLine_1.5s_cubic-bezier(0.33,1,0.68,1)_forwards]' : 'opacity-0'}
              `}
              style={{ animationDelay: `${1.2 + (idx * 0.08)}s` }}
            >
              {line}
            </span>
          ))}

          {/* Secure Secondary Interaction Node */}
          <div 
            className={`w-full flex justify-center mt-20 sm:mt-24 pb-20 transition-all duration-[600ms] ease-out
              ${stage === 'reflection' ? 'animate-[fadeInUp_1.5s_cubic-bezier(0.33,1,0.68,1)_forwards]' : 'opacity-0 scale-95 blur-sm pointer-events-none'}
            `}
            style={{ animationDelay: stage === 'reflection' ? `${1.2 + (reflectionText.length * 0.08) + 0.6}s` : '0s' }}
          >
            <button 
              onClick={handleSaveReflection}
              disabled={stage !== 'reflection'}
              className="group flex flex-col items-center focus:outline-none transition-all duration-300 active:scale-[0.98] active:opacity-60"
            >
              <span className="font-sans text-[var(--color-text-ink)] text-[10px] sm:text-xs tracking-[0.2em] uppercase border-b border-transparent group-hover:border-[var(--color-accent-clay)] pb-2 transition-colors duration-[600ms]">
                Save &rarr;
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* 
        4. The Reveal Macro-Structure Overlay
        8% environmental dim bounds
      */}
      <div 
        className={`absolute inset-0 bg-[var(--color-canvas-stone)] pointer-events-none transition-opacity ease-out z-40 mix-blend-multiply
        ${stage === 'sealing' || stage === 'reveal' ? 'opacity-[0.08] duration-[800ms]' : 'opacity-0 duration-[1000ms]'}
        `}
      ></div>

      {/* 5. 10/10 Theatrical Refinement Washes (Paper tone + Vignette) */}
      <div 
        className={`absolute inset-0 bg-[#D8CBB6] pointer-events-none transition-opacity ease-out z-40 mix-blend-multiply
        ${stage === 'reveal' ? 'opacity-[0.06] duration-[2000ms]' : 'opacity-0 duration-[1000ms]'}
        `}
      ></div>
      <div 
        className={`absolute inset-0 pointer-events-none transition-opacity ease-out z-40
        ${stage === 'reveal' ? 'opacity-100 duration-[2000ms]' : 'opacity-0 duration-[1000ms]'}
        `}
        style={{ background: 'radial-gradient(circle at center, transparent 40%, rgba(0,0,0,0.035) 100%)' }}
      ></div>

      {/* Explicit Micro-Payoff Architecture (The Glimpse) */}
      <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center p-8 sm:p-12 z-50 pointer-events-none overflow-hidden">
        
        {/* The Ephemeral Bridge Line */}
        <div className={`absolute w-full flex justify-center pointer-events-none z-10
          ${stage === 'reveal' ? 'animate-[bridgeLineFade_3.5s_ease-in-out_forwards]' : 'opacity-0'}
        `}
        style={{ animationDelay: stage === 'reveal' ? '800ms' : '0ms' }}
        >
          <p className="font-serif italic text-lg sm:text-xl text-[var(--color-text-ink)]/70">
            Your story gathers...
          </p>
        </div>

        {/* 
          The Glimpse Body: Pure Typography centered on the warm background.
          Explicitly isolated to partial visibility to stoke dopamine loops.
        */}
        <div className={`relative z-20 w-full max-w-[440px] flex flex-col items-center justify-start transition-all duration-[1500ms] ease-[cubic-bezier(0.33,1,0.68,1)]
            ${stage === 'reveal' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}
          `}
          style={{ transitionDelay: stage === 'reveal' ? '3200ms' : '0ms' }}
        >
           <header className="flex flex-col items-center text-center mb-16 sm:mb-20">
             <h3 className={`font-serif text-[19px] sm:text-[21px] text-[var(--color-text-ink)] mb-5 transition-all duration-[1500ms] ease-out
                 ${stage === 'reveal' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}
               `}
               style={{ transitionDelay: stage === 'reveal' ? '3800ms' : '0ms' }}
             >
               {currentChapter.title}
             </h3>
             <p className={`font-serif italic text-[12px] sm:text-[13px] tracking-[0.03em] text-[var(--color-text-graphite)]/50 transition-all duration-[1500ms] ease-out
                 ${stage === 'reveal' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}
               `}
               style={{ transitionDelay: stage === 'reveal' ? '4200ms' : '0ms' }}
             >
               {totalEchoCount % 3 === 0 
                  ? "Your story is beginning to take shape." 
                  : `${3 - (totalEchoCount % 3)} more Echo${(3 - (totalEchoCount % 3)) === 1 ? '' : 's'} will reveal your next passage.`
               }
             </p>
           </header>

           {/* The Deep Optical Blur Geometry Stack - 3 overlapping geometric text nodes */}
           <div className={`relative w-full px-6 sm:px-12 transition-all duration-[2400ms] ease-out
               ${stage === 'reveal' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
             `}
             style={{ transitionDelay: stage === 'reveal' ? '4800ms' : '0ms' }}
           >
             
             {/* Plane 1: Sharp Emergence (100% to 60%) */}
             <p className="font-serif text-[16px] sm:text-[17px] font-light leading-[1.8] sm:leading-[1.9] text-left text-[var(--color-text-ink)]/90 whitespace-pre-wrap select-none"
                style={{ 
                  maskImage: 'linear-gradient(to bottom, black 0%, black 28px, rgba(0,0,0,0.4) 50px, transparent 65px)',
                  WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 28px, rgba(0,0,0,0.4) 50px, transparent 65px)'
                }}
             >
               {fullAmbientText || "The quiet presence of time unfolding."}
             </p>

             {/* Plane 2: Softened Continuation (Light Blur) */}
             <p className="absolute top-0 left-6 right-6 sm:left-12 sm:right-12 font-serif text-[16px] sm:text-[17px] font-light leading-[1.8] sm:leading-[1.9] text-left text-[var(--color-text-ink)]/60 blur-[2px] whitespace-pre-wrap select-none"
                style={{ 
                  maskImage: 'linear-gradient(to bottom, transparent 0%, transparent 28px, black 50px, rgba(0,0,0,0.4) 75px, transparent 100px)',
                  WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, transparent 28px, black 50px, rgba(0,0,0,0.4) 75px, transparent 100px)'
                }}
             >
               {fullAmbientText || "The quiet presence of time unfolding."}
             </p>

             {/* Plane 3: The Deep Ghost (Heavy Blur memory) */}
             <p className="absolute top-0 left-6 right-6 sm:left-12 sm:right-12 font-serif text-[16px] sm:text-[17px] font-light leading-[1.8] sm:leading-[1.9] text-left text-[var(--color-text-graphite)]/25 blur-[5px] whitespace-pre-wrap select-none mix-blend-multiply"
                style={{ 
                  maskImage: 'linear-gradient(to bottom, transparent 0%, transparent 60px, black 90px, black 160px, transparent 240px)',
                  WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, transparent 60px, black 90px, black 160px, transparent 240px)'
                }}
             >
               {fullAmbientText || "The quiet presence of time unfolding."}
             </p>
           </div>

           {/* Manual Exit Constraint */}
           <button 
             onClick={handleDone}
             disabled={stage !== 'reveal'}
             className={`group flex flex-col items-center focus:outline-none transition-all duration-[2000ms] mt-32 sm:mt-40 active:scale-[0.98] pointer-events-auto
               ${stage === 'reveal' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
             `}
             style={{ transitionDelay: stage === 'reveal' ? '7000ms' : '0ms' }}
           >
             <span className="font-sans text-[var(--color-text-graphite)] text-[10px] tracking-[0.25em] uppercase opacity-40 group-hover:opacity-80 transition-opacity duration-[600ms]">
               Return
             </span>
           </button>

        </div>

      </div>

    </main>
  );
}
