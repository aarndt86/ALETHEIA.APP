"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/components/AppProvider';
import { STORY_CHAPTERS, getStoryProgress } from '@/lib/storyData';
import { trackEvent } from '@/lib/analytics';

// --- Types ---

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

// --- Milestone Echoes that trigger the Story Glimpse ---
const MILESTONE_ECHOES = [3, 7, 14, 30];

// --- Invitations ---
const FIRST_INVITATION = "What has been sitting quietly on your mind lately?";
const FIRST_INVITATION_SUPPORT = "Start wherever you are.";

const STANDARD_INVITATIONS = [
  "What have you been carrying that no one sees?",
  "What is asking for your attention today?",
  "What has been circling your thoughts?",
  "What would you say if no one was listening?",
];

// --- Stage type ---
type Stage = 'firstEchoIntro' | 'checkin' | 'writing' | 'morphing' | 'reflection' | 'completion' | 'reveal' | 'returning' | 'error';

export default function UnifiedReflectLoopScreen() {
  const {
    selectedState, setSelectedState,
    currentDraft, setCurrentDraft,
    totalEchoCount,
    saveEcho, completeReflection, markReflectionFailed,
    isFirstEcho,
    userStats,
  } = useAppContext();
  const router = useRouter();

  // --- State Machine ---
  // Stage is initialized to null, then set correctly after hydration
  const [stage, setStage] = useState<Stage | null>(null);

  const [content, setContent] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [checkInDisappearing, setCheckInDisappearing] = useState(false);
  const [reflectionParagraphs, setReflectionParagraphs] = useState<string[]>([]);
  const [isTransitingOut, setIsTransitingOut] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Transition state
  const [transitionMessage, setTransitionMessage] = useState("Sitting with your words\u2026");
  const [showReflection, setShowReflection] = useState(false);

  // Error state
  const [saveError, setSaveError] = useState(false);

  // Custom Expression Layer Dynamics
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lineCount = content.split('\n').length;

  // Accessibility: reduced motion
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Track AI generation timing
  const aiStartTimeRef = useRef<number>(0);

  // Invitation — memoized per mount so it doesn't re-randomize on re-render
  const invitationRef = useRef<string | null>(null);

  // Milestone check for current echo
  const willBeMilestone = MILESTONE_ECHOES.includes(userStats.completedReflectionCount + 1);

  // --- Animation duration helper ---
  const getFadeDuration = useCallback((ms: number) => {
    return prefersReducedMotion ? Math.min(ms, 300) : ms;
  }, [prefersReducedMotion]);

  // --- Initialization ---
  // FIX: Wait for AppProvider hydration before determining initial stage.
  // isFirstEcho is derived from savedEchoCount, which requires localStorage to load.
  useEffect(() => {
    setSelectedState(null);
    setContent('');
    setCurrentDraft('');

    // Determine initial stage AFTER hydration
    const initialStage: Stage = isFirstEcho ? 'firstEchoIntro' : 'checkin';
    setStage(initialStage);

    // Set invitation based on hydrated state
    if (invitationRef.current === null) {
      invitationRef.current = isFirstEcho
        ? FIRST_INVITATION
        : STANDARD_INVITATIONS[Math.floor(Math.random() * STANDARD_INVITATIONS.length)];
    }

    setIsLoaded(true);

    // Detect reduced motion preference
    if (typeof window !== 'undefined') {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(mq.matches);
      const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
  }, [isFirstEcho, setSelectedState, setCurrentDraft]);

  // Analytics: first echo intro viewed
  useEffect(() => {
    if (stage === 'firstEchoIntro') {
      trackEvent('first_echo_intro_viewed', { isFirstEcho: true });
    }
  }, [stage]);

  // --- Computed ---
  const invitation = invitationRef.current || FIRST_INVITATION;

  const showFirstEchoUI = isFirstEcho && userStats.savedEchoCount === 0;

  const placeholderText = showFirstEchoUI
    ? "Write what feels true right now\u2026"
    : undefined;

  // --- Handlers ---

  const handleFirstEchoBegin = () => {
    trackEvent('first_echo_started', { isFirstEcho: true });
    setStage('checkin');
  };

  const handleSelection = (id: string) => {
    if (selectedState) return;

    setSelectedState(id);

    setTimeout(() => {
      setCheckInDisappearing(true);

      setTimeout(() => {
        setStage('writing');
        setTimeout(() => textareaRef.current?.focus(), 100);
      }, getFadeDuration(800));
    }, getFadeDuration(600));
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);
    setCurrentDraft(val);
    setSaveError(false);

    setIsTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 150);
  };

  // --- Core: Submit Echo → Transition → AI Reflection ---
  const triggerReflectionFlow = useCallback(async () => {
    setIsSubmitting(true);
    setSaveError(false);

    trackEvent('echo_submitted', {
      emotionalState: selectedState || undefined,
      echoWordCount: content.split(/\s+/).filter(w => w.length > 0).length,
      isFirstEcho: userStats.savedEchoCount === 0,
    });

    // Step 1 & 2: Save the Echo immediately
    try {
      saveEcho({
        excerpt: content,
        state: selectedState || 'reflective',
      });
      trackEvent('echo_saved', {
        emotionalState: selectedState || undefined,
        isFirstEcho: userStats.savedEchoCount === 0,
      });
    } catch {
      setSaveError(true);
      setIsSubmitting(false);
      setStage('writing');
      return;
    }

    // Step 3: Enter transition
    setStage('morphing');
    setTransitionMessage("Sitting with your words\u2026");
    trackEvent('reflection_transition_started', {
      emotionalState: selectedState || undefined,
    });

    // Step 4 & 5: Start AI request AND enforce minimum pause
    aiStartTimeRef.current = Date.now();

    const minPause = prefersReducedMotion ? 300 : 1400;
    const maxPauseTime = prefersReducedMotion ? 300 : 2200;

    const minPausePromise = new Promise<void>(resolve =>
      setTimeout(resolve, minPause)
    );

    const maxPauseTimeout = setTimeout(() => {
      setTransitionMessage("Finding the thread\u2026");
    }, maxPauseTime);

    let aiResult: { reflection: string; wordCount: number; generationTimeMs: number } | null = null;
    let aiFailed = false;

    try {
      const response = await fetch('/api/reflect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          echo: content,
          emotionalState: selectedState || 'reflective',
        }),
      });

      if (!response.ok) throw new Error('Reflection generation failed');

      aiResult = await response.json();
    } catch {
      aiFailed = true;
    }

    // Wait for minimum pause
    await minPausePromise;
    clearTimeout(maxPauseTimeout);

    const generationTime = Date.now() - aiStartTimeRef.current;

    if (aiFailed || !aiResult) {
      trackEvent('reflection_failed', {
        emotionalState: selectedState || undefined,
        aiGenerationTimeMs: generationTime,
        requestTimedOut: generationTime > 10000,
      });
      markReflectionFailed();
      setStage('error');
      setIsSubmitting(false);
      return;
    }

    trackEvent('reflection_generated', {
      emotionalState: selectedState || undefined,
      reflectionWordCount: aiResult.wordCount,
      aiGenerationTimeMs: aiResult.generationTimeMs,
    });

    // Parse reflection into paragraphs
    const paragraphs = aiResult.reflection
      .split('\n')
      .map(p => p.trim())
      .filter(p => p.length > 0);
    setReflectionParagraphs(paragraphs);

    // Step 5: Reveal the Reflection
    setShowReflection(false);
    const fadeOut = prefersReducedMotion ? 100 : 250;
    await new Promise<void>(resolve => setTimeout(resolve, fadeOut));

    setStage('reflection');
    requestAnimationFrame(() => {
      setShowReflection(true);
    });

    trackEvent('reflection_viewed', {
      emotionalState: selectedState || undefined,
      reflectionWordCount: aiResult.wordCount,
    });

    setIsSubmitting(false);
  }, [content, selectedState, userStats.savedEchoCount, saveEcho, markReflectionFailed, prefersReducedMotion]);

  const handleSealEcho = () => {
    if (isSubmitting) return;
    triggerReflectionFlow();
  };

  // --- Complete Today's Echo ---
  const handleCompleteEcho = () => {
    const reflectionText = reflectionParagraphs.join('\n\n');
    completeReflection(reflectionText);

    trackEvent('completion_screen_viewed', {
      emotionalState: selectedState || undefined,
      completionStatus: 'complete',
      isFirstEcho: userStats.savedEchoCount <= 1,
    });

    if (userStats.savedEchoCount <= 1) {
      trackEvent('first_echo_completed', { isFirstEcho: true });
    }

    setStage('completion');
  };

  // --- Navigation helpers: always reset state before routing ---
  const resetAndNavigate = useCallback((path: string) => {
    setIsSubmitting(false);
    setIsTransitingOut(true);
    setTimeout(() => {
      router.push(path);
    }, getFadeDuration(600));
  }, [router, getFadeDuration]);

  // --- Completion Actions ---
  const handleReturnHome = () => {
    trackEvent('completion_return_home_clicked');
    resetAndNavigate('/home');
  };

  const handleViewTimeline = () => {
    trackEvent('completion_view_timeline_clicked');
    resetAndNavigate('/timeline');
  };

  const handleViewStory = () => {
    resetAndNavigate('/story');
  };

  const handleSeeStoryGlimpse = () => {
    setStage('reveal');
  };

  // --- Return from Reveal ---
  const handleDone = () => {
    setStage('returning');
    setTimeout(() => {
      resetAndNavigate('/home');
    }, getFadeDuration(800));
  };

  // --- Error: Retry ---
  const handleRetry = () => {
    trackEvent('reflection_retry_clicked', {
      emotionalState: selectedState || undefined,
    });
    // Reset submitting flag, then trigger the flow fresh
    setIsSubmitting(false);
    setStage('morphing');
    setTransitionMessage("Sitting with your words\u2026");
    // Use setTimeout to ensure React processes state updates before re-triggering
    setTimeout(() => {
      triggerReflectionFlow();
    }, 50);
  };

  const handleErrorReturnHome = () => {
    resetAndNavigate('/home');
  };

  // --- Build Story Glimpse data (preserved from existing code) ---
  const { currentChapterIndex, paragraphsUnlockedInCurrentChapter } = getStoryProgress(totalEchoCount);
  const currentChapter = STORY_CHAPTERS[currentChapterIndex];

  let p1Idx = Math.max(0, paragraphsUnlockedInCurrentChapter - 1);
  let p2Idx = p1Idx + 1;

  if (paragraphsUnlockedInCurrentChapter >= currentChapter.paragraphs.length) {
    p2Idx = currentChapter.paragraphs.length - 1;
    p1Idx = Math.max(0, p2Idx - 1);
  } else if (paragraphsUnlockedInCurrentChapter === 0) {
    p2Idx = -1;
  }

  const glimpseParagraphs: string[] = [];
  if (currentChapter.paragraphs[p1Idx]) {
    glimpseParagraphs.push(currentChapter.paragraphs[p1Idx]);
  }
  if (p2Idx !== -1 && currentChapter.paragraphs[p2Idx]) {
    glimpseParagraphs.push(currentChapter.paragraphs[p2Idx]);
  }

  const fullAmbientText = glimpseParagraphs.join(" \n\n ")
    + (currentChapter.paragraphs[p2Idx + 1] ? ` \n\n ${currentChapter.paragraphs[p2Idx + 1]}` : "");

  // --- Pre-hydration / loading state ---
  if (!isLoaded || stage === null) {
    return <main className="min-h-[100dvh] bg-[var(--color-canvas-linen)]"></main>;
  }

  return (
    <main className={`min-h-[100dvh] w-full flex flex-col items-center justify-center px-8 sm:px-12 relative overflow-hidden transition-all ease-out
      ${stage === 'firstEchoIntro' || stage === 'checkin' || stage === 'writing' ? 'bg-[var(--color-canvas-linen)] duration-[1000ms]' : 'bg-[#EAE8DD] duration-[1200ms]'}
      ${isTransitingOut ? 'opacity-0 duration-[800ms]' : 'opacity-100'}
    `}>

      {/*
        Background layers — all pointer-events-none, safe
      */}
      <div
        className={`absolute inset-0 pointer-events-none transition-all ease-out z-0
        ${stage === 'firstEchoIntro' || stage === 'checkin' || stage === 'writing' ? 'bg-transparent opacity-0 duration-0' : 'bg-[#363532] opacity-[0.05] duration-[1200ms]'}`}
      ></div>
      <div
        className="absolute inset-0 pointer-events-none z-0 mix-blend-multiply opacity-[0.015]"
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}
      ></div>
      <div
        className={`absolute inset-0 bg-[#E8E1D5] pointer-events-none transition-opacity duration-1000 ease-out z-0 mix-blend-multiply
        ${(stage === 'writing' && content.length > 0) ? '' : 'opacity-0'}
        `}
        style={{ opacity: stage === 'writing' ? Math.min(0.08, lineCount * 0.015) : 0 }}
      ></div>

      {/* ============================================================
          STAGE: First Echo Introduction (before state selection)
          Only shown when savedEchoCount === 0
          FIX: pointer-events-auto ONLY when this stage is active
          ============================================================ */}
      {stage === 'firstEchoIntro' && (
        <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center p-8 sm:p-12 z-30">
          <div className="flex flex-col items-center text-center max-w-md">
            <span className="font-sans text-[10px] sm:text-[11px] tracking-[0.25em] uppercase text-[var(--color-text-graphite)] opacity-60 mb-10">
              Your first Echo
            </span>

            <h1 className="font-serif text-2xl sm:text-3xl text-[var(--color-text-ink)] mb-8 leading-snug">
              You do not need the perfect words.
            </h1>

            <p className="font-serif text-[15px] sm:text-base text-[var(--color-text-graphite)] leading-relaxed mb-16 max-w-[320px]">
              Begin with what is true right now. A sentence is enough. A page is enough. This is simply a place to meet yourself honestly.
            </p>

            <button
              type="button"
              onClick={handleFirstEchoBegin}
              className="group flex flex-col items-center focus:outline-none transition-all duration-500 active:scale-[0.98] active:opacity-60"
            >
              <span className="font-sans text-[var(--color-text-ink)] text-[11px] sm:text-xs tracking-[0.2em] uppercase border-b border-[var(--color-accent-clay)]/40 group-hover:border-[var(--color-accent-clay)] pb-2 transition-colors duration-[600ms]">
                Begin
              </span>
            </button>
          </div>
        </div>
      )}

      {/* ============================================================
          STAGE: Check-In (Emotion Assembly)
          FIX: pointer-events on buttons ONLY when checkin is active
          ============================================================ */}
      <div className={`absolute inset-0 w-full h-full flex flex-col items-center justify-center p-8 sm:p-12 z-20 pointer-events-none transition-opacity duration-700 ease-in
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
                type="button"
                key={stateInfo.id}
                onClick={() => handleSelection(stateInfo.id)}
                disabled={hasSelection}
                className={`
                  group flex flex-col items-center justify-center p-4 focus:outline-none
                  ${stage === 'checkin' ? 'pointer-events-auto' : 'pointer-events-none'}
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

      {/* ============================================================
          STAGE: Writing (Contiguous Input Layer)
          ============================================================ */}
      <div className={`absolute top-0 w-full max-w-[520px] flex flex-col pt-[24vh] px-6 sm:px-8 transition-all ease-in-out z-10
        ${stage === 'checkin' || stage === 'firstEchoIntro' ? 'opacity-0 translate-y-8 duration-0 pointer-events-none' : ''}
        ${stage === 'writing' ? 'opacity-100 scale-100 blur-0 translate-y-0 duration-[1000ms] pointer-events-auto' : ''}
        ${stage === 'morphing' ? `opacity-0 scale-100 ${prefersReducedMotion ? 'duration-[200ms]' : 'duration-[400ms]'} pointer-events-none` : ''}
        ${stage !== 'checkin' && stage !== 'firstEchoIntro' && stage !== 'writing' && stage !== 'morphing' ? 'opacity-0 pointer-events-none duration-0' : ''}
      `}>
        {/* Invitation */}
        <div className={`mb-24 sm:mb-32 transition-all duration-[800ms] pointer-events-none
          ${stage === 'writing' && content.length === 0 ? 'opacity-70 translate-y-0 blur-0' : ''}
          ${stage === 'writing' && content.length > 0 ? 'opacity-0 -translate-y-2 blur-sm absolute' : ''}
          ${stage !== 'writing' ? 'opacity-0' : ''}
        `}>
          <h2 className="font-serif text-[20px] sm:text-[22px] text-[var(--color-text-ink)] text-left italic font-light tracking-wide">
            {invitation}
          </h2>
          {showFirstEchoUI && (
            <p className="font-serif italic text-sm text-[var(--color-text-graphite)] opacity-50 mt-4">
              {FIRST_INVITATION_SUPPORT}
            </p>
          )}
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          readOnly={stage !== 'writing'}
          spellCheck="false"
          placeholder={placeholderText}
          className={`w-full bg-transparent resize-none outline-none font-serif text-[21px] sm:text-2xl lg:text-[26px] text-[var(--color-text-ink)] leading-[1.8] sm:leading-[1.9] min-h-[50vh] focus:outline-none transition-all duration-[180ms] ease-out placeholder:text-[var(--color-text-graphite)]/30 placeholder:italic
            ${isTyping ? 'opacity-95 translate-y-[2px]' : 'opacity-100 translate-y-0'}
          `}
          style={{
            caretColor: 'var(--color-text-graphite)',
            textShadow: isTyping ? '0 1px 2px rgba(0,0,0,0.02)' : '0 1px 0 rgba(0,0,0,0)'
          }}
        />

        {/* First-Echo reassurance */}
        {showFirstEchoUI && stage === 'writing' && (
          <p className={`absolute bottom-28 left-6 right-6 text-center font-sans text-[11px] text-[var(--color-text-graphite)] transition-opacity duration-500
            ${content.length > 0 ? 'opacity-0' : 'opacity-40'}
          `}>
            There is no right way to begin.
          </p>
        )}
      </div>

      {/* Save Error Message */}
      {saveError && stage === 'writing' && (
        <div className="absolute bottom-32 left-8 right-8 flex justify-center z-30 pointer-events-none">
          <p className="font-sans text-sm text-[var(--color-text-ink)] bg-[var(--color-canvas-stone)] px-6 py-4 rounded-sm text-center max-w-md">
            We could not save this yet. Your words are still here. Please try again.
          </p>
        </div>
      )}

      {/* Submit Button — only interactive when in writing stage */}
      <div
        className={`absolute bottom-20 flex justify-center w-full transition-all duration-[800ms] ease-out z-20
          ${stage === 'writing' && content.trim().length >= 10 && !isSubmitting ? 'opacity-100 pointer-events-auto translate-y-0' : 'opacity-0 pointer-events-none translate-y-2'}
        `}
      >
        <button
          type="button"
          onClick={handleSealEcho}
          disabled={stage !== 'writing' || isSubmitting}
          className="group flex flex-col items-center focus:outline-none transition-transform duration-300 active:scale-[0.98] active:opacity-60"
        >
          <span className="font-sans text-[var(--color-text-graphite)]/60 text-[10px] sm:text-xs tracking-[0.25em] uppercase pb-2 transition-colors duration-[600ms] group-hover:text-[var(--color-text-graphite)]/90">
            Form
          </span>
        </button>
      </div>

      {/* ============================================================
          STAGE: Morphing / Ceremonial Transition
          "Sitting with your words…" → "Finding the thread…"
          Always pointer-events-none — no interactive elements
          ============================================================ */}
      <div
        className={`absolute inset-0 w-full h-full flex flex-col items-center justify-center z-30 pointer-events-none
          transition-opacity ease-out
          ${stage === 'morphing'
            ? `opacity-100 ${prefersReducedMotion ? 'duration-[200ms]' : 'duration-[500ms]'}`
            : `opacity-0 ${prefersReducedMotion ? 'duration-[200ms]' : 'duration-[250ms]'}`
          }
        `}
        role="status"
        aria-live="polite"
      >
        <p className="font-serif text-lg sm:text-xl text-[var(--color-text-ink)] opacity-60 text-center">
          {transitionMessage}
        </p>
      </div>

      {/* ============================================================
          STAGE: Reflection Display
          3 paragraphs: Mirror → Notice → Carry Forward
          FIX: pointer-events-auto ONLY when reflection stage active
          ============================================================ */}
      <div className={`absolute inset-0 w-full h-full flex flex-col items-center justify-start z-30 overflow-y-auto no-scrollbar
        transition-all ease-out
        ${stage === 'reflection'
          ? `opacity-100 blur-0 translate-y-0 ${prefersReducedMotion ? 'duration-[200ms]' : 'duration-[500ms]'} pointer-events-auto`
          : 'opacity-0 pointer-events-none'
        }
      `}
      style={{ WebkitOverflowScrolling: 'auto', overscrollBehavior: 'none' }}
      >
        <div className="w-full max-w-lg px-6 sm:px-8 pt-[26vh] pb-[30vh]">
          {reflectionParagraphs.map((paragraph, idx) => (
            <p
              key={idx}
              className={`font-serif text-lg sm:text-xl lg:text-2xl text-[var(--color-text-ink)] leading-[1.8] sm:leading-[2] mb-8 last:mb-0
                transition-opacity ease-out
                ${showReflection
                  ? `opacity-100 ${prefersReducedMotion ? 'duration-[200ms]' : 'duration-[500ms]'}`
                  : 'opacity-0 duration-0'
                }
              `}
              style={{
                transitionDelay: showReflection && !prefersReducedMotion
                  ? `${idx * 90}ms`
                  : '0ms'
              }}
            >
              {paragraph}
            </p>
          ))}

          {/* "Complete Today's Echo →" action */}
          <div
            className={`w-full flex justify-center mt-20 sm:mt-24 pb-20
              transition-all ease-out
              ${showReflection && stage === 'reflection'
                ? `opacity-100 translate-y-0 ${prefersReducedMotion ? 'duration-[200ms]' : 'duration-[600ms]'}`
                : 'opacity-0 translate-y-2 duration-0'
              }
            `}
            style={{
              transitionDelay: showReflection && !prefersReducedMotion
                ? `${reflectionParagraphs.length * 90 + 400}ms`
                : '0ms'
            }}
          >
            <button
              type="button"
              onClick={handleCompleteEcho}
              disabled={stage !== 'reflection'}
              className="group flex flex-col items-center focus:outline-none transition-all duration-300 active:scale-[0.98] active:opacity-60"
            >
              <span className="font-sans text-[var(--color-text-ink)] text-[10px] sm:text-xs tracking-[0.2em] uppercase border-b border-transparent group-hover:border-[var(--color-accent-clay)] pb-2 transition-colors duration-[600ms]">
                Complete Today&rsquo;s Echo &rarr;
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================
          STAGE: Completion Moment
          "Another page has been added to your story."
          FIX: pointer-events-auto ONLY when completion stage active
          ============================================================ */}
      {stage === 'completion' && (
        <div
          className={`absolute inset-0 w-full h-full flex flex-col items-center justify-center p-8 sm:p-12 z-40
            animate-[fadeIn_${prefersReducedMotion ? '0.2' : '0.45'}s_ease-out_forwards]
          `}
          role="region"
          aria-label="Echo completion"
        >
          <div className="flex flex-col items-center text-center max-w-md">
            <h2 className="font-serif text-xl sm:text-2xl text-[var(--color-text-ink)] mb-6 leading-snug">
              Another page has been added to your story.
            </h2>

            <p className="font-serif text-[15px] sm:text-base text-[var(--color-text-graphite)] leading-relaxed mb-16 opacity-70">
              What you shared today is now part of something larger.
            </p>

            <div className="flex flex-col items-center gap-10">
              {/* Primary: Return Home */}
              <button
                type="button"
                onClick={handleReturnHome}
                className="group flex flex-col items-center focus:outline-none transition-all duration-500 active:scale-[0.98] active:opacity-60"
              >
                <span className="font-sans text-[var(--color-text-ink)] text-[11px] sm:text-xs tracking-[0.2em] uppercase border-b border-[var(--color-accent-clay)]/40 group-hover:border-[var(--color-accent-clay)] pb-2 transition-colors duration-[600ms]">
                  Return Home
                </span>
              </button>

              {/* Secondary: View Timeline */}
              <button
                type="button"
                onClick={handleViewTimeline}
                className="group flex flex-col items-center focus:outline-none transition-all duration-500 active:scale-[0.98] active:opacity-60"
              >
                <span className="font-sans text-[var(--color-text-graphite)] text-[10px] sm:text-[11px] tracking-[0.2em] uppercase opacity-50 group-hover:opacity-80 transition-opacity duration-[600ms]">
                  View Timeline
                </span>
              </button>

              {/* Tertiary: View Your Story */}
              <button
                type="button"
                onClick={handleViewStory}
                className="group flex flex-col items-center focus:outline-none transition-all duration-500 active:scale-[0.98] active:opacity-60"
              >
                <span className="font-sans text-[var(--color-text-graphite)] text-[10px] sm:text-[11px] tracking-[0.2em] uppercase opacity-50 group-hover:opacity-80 transition-opacity duration-[600ms]">
                  View Your Story &rarr;
                </span>
              </button>

              {/* Milestone: See what is beginning to form → */}
              {willBeMilestone && (
                <button
                  type="button"
                  onClick={handleSeeStoryGlimpse}
                  className="group flex flex-col items-center focus:outline-none transition-all duration-500 active:scale-[0.98] active:opacity-60 mt-4"
                >
                  <span className="font-serif italic text-sm sm:text-[15px] tracking-wide text-[var(--color-text-graphite)] opacity-50 group-hover:opacity-80 transition-opacity duration-[600ms]">
                    See what is beginning to form &rarr;
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          STAGE: Error (AI Reflection Failed)
          FIX: Only rendered when error stage active — prevents blocking
          ============================================================ */}
      {stage === 'error' && (
        <div
          className={`absolute inset-0 w-full h-full flex flex-col items-center justify-center p-8 sm:p-12 z-40
            animate-[fadeIn_${prefersReducedMotion ? '0.2' : '0.45'}s_ease-out_forwards]
          `}
          role="alert"
        >
          <div className="flex flex-col items-center text-center max-w-md">
            <h2 className="font-serif text-xl sm:text-2xl text-[var(--color-text-ink)] mb-6 leading-snug">
              Your words have been kept.
            </h2>

            <p className="font-serif text-[15px] sm:text-base text-[var(--color-text-graphite)] leading-relaxed mb-16 opacity-70">
              Kairo could not complete the Reflection just yet. You can return to it when it is ready.
            </p>

            <div className="flex flex-col items-center gap-10">
              <button
                type="button"
                onClick={handleErrorReturnHome}
                className="group flex flex-col items-center focus:outline-none transition-all duration-500 active:scale-[0.98] active:opacity-60"
              >
                <span className="font-sans text-[var(--color-text-ink)] text-[11px] sm:text-xs tracking-[0.2em] uppercase border-b border-[var(--color-accent-clay)]/40 group-hover:border-[var(--color-accent-clay)] pb-2 transition-colors duration-[600ms]">
                  Return Home
                </span>
              </button>

              <button
                type="button"
                onClick={handleRetry}
                className="group flex flex-col items-center focus:outline-none transition-all duration-500 active:scale-[0.98] active:opacity-60"
              >
                <span className="font-sans text-[var(--color-text-graphite)] text-[10px] sm:text-[11px] tracking-[0.2em] uppercase opacity-50 group-hover:opacity-80 transition-opacity duration-[600ms]">
                  Try Again
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          STAGE: Reveal (Story Glimpse — Milestone Only)
          FIX: Only rendered when reveal stage active — prevents blocking
          ============================================================ */}
      {stage === 'reveal' && (
        <>
          {/* Reveal Macro-Structure Overlay — 8% environmental dim */}
          <div
            className="absolute inset-0 bg-[var(--color-canvas-stone)] pointer-events-none z-40 mix-blend-multiply opacity-[0.08]"
          ></div>

          {/* Theatrical Refinement Washes */}
          <div
            className="absolute inset-0 bg-[#D8CBB6] pointer-events-none z-40 mix-blend-multiply animate-[fadeIn_2s_ease-out_forwards] opacity-0"
            style={{ '--tw-opacity': '0.06' } as React.CSSProperties}
          ></div>
          <div
            className="absolute inset-0 pointer-events-none z-40 animate-[fadeIn_2s_ease-out_forwards] opacity-0"
            style={{ background: 'radial-gradient(circle at center, transparent 40%, rgba(0,0,0,0.035) 100%)' }}
          ></div>

          {/* Story Glimpse Content */}
          <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center p-8 sm:p-12 z-50 overflow-hidden">

            {/* The Ephemeral Bridge Line */}
            <div
              className="absolute w-full flex justify-center pointer-events-none z-10 animate-[bridgeLineFade_3.5s_ease-in-out_forwards]"
              style={{ animationDelay: '800ms' }}
            >
              <p className="font-serif italic text-lg sm:text-xl text-[var(--color-text-ink)]/70">
                Your story gathers...
              </p>
            </div>

            {/* The Glimpse Body */}
            <div
              className="relative z-20 w-full max-w-[440px] flex flex-col items-center justify-start opacity-0 translate-y-6 transition-all duration-[1500ms] ease-[cubic-bezier(0.33,1,0.68,1)]"
              style={{ transitionDelay: '3200ms' }}
              ref={(el) => {
                // Trigger transition after mount
                if (el) requestAnimationFrame(() => {
                  el.style.opacity = '1';
                  el.style.transform = 'translateY(0)';
                });
              }}
            >
               <header className="flex flex-col items-center text-center mb-16 sm:mb-20">
                 <h3
                   className="font-serif text-[19px] sm:text-[21px] text-[var(--color-text-ink)] mb-5 opacity-0 translate-y-3 transition-all duration-[1500ms] ease-out"
                   style={{ transitionDelay: '3800ms' }}
                   ref={(el) => {
                     if (el) requestAnimationFrame(() => {
                       el.style.opacity = '1';
                       el.style.transform = 'translateY(0)';
                     });
                   }}
                 >
                   {currentChapter.title}
                 </h3>
                 <p
                   className="font-serif italic text-[12px] sm:text-[13px] tracking-[0.03em] text-[var(--color-text-graphite)]/50 opacity-0 translate-y-3 transition-all duration-[1500ms] ease-out"
                   style={{ transitionDelay: '4200ms' }}
                   ref={(el) => {
                     if (el) requestAnimationFrame(() => {
                       el.style.opacity = '1';
                       el.style.transform = 'translateY(0)';
                     });
                   }}
                 >
                   {totalEchoCount % 3 === 0
                      ? "Your story is beginning to take shape."
                      : `${3 - (totalEchoCount % 3)} more Echo${(3 - (totalEchoCount % 3)) === 1 ? '' : 's'} will reveal your next passage.`
                   }
                 </p>
               </header>

               {/* The Deep Optical Blur Geometry Stack */}
               <div
                 className="relative w-full px-6 sm:px-12 opacity-0 translate-y-4 transition-all duration-[2400ms] ease-out"
                 style={{ transitionDelay: '4800ms' }}
                 ref={(el) => {
                   if (el) requestAnimationFrame(() => {
                     el.style.opacity = '1';
                     el.style.transform = 'translateY(0)';
                   });
                 }}
               >
                 <p className="font-serif text-[16px] sm:text-[17px] font-light leading-[1.8] sm:leading-[1.9] text-left text-[var(--color-text-ink)]/90 whitespace-pre-wrap select-none"
                    style={{
                      maskImage: 'linear-gradient(to bottom, black 0%, black 28px, rgba(0,0,0,0.4) 50px, transparent 65px)',
                      WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 28px, rgba(0,0,0,0.4) 50px, transparent 65px)'
                    }}
                 >
                   {fullAmbientText || "The quiet presence of time unfolding."}
                 </p>

                 <p className="absolute top-0 left-6 right-6 sm:left-12 sm:right-12 font-serif text-[16px] sm:text-[17px] font-light leading-[1.8] sm:leading-[1.9] text-left text-[var(--color-text-ink)]/60 blur-[2px] whitespace-pre-wrap select-none"
                    style={{
                      maskImage: 'linear-gradient(to bottom, transparent 0%, transparent 28px, black 50px, rgba(0,0,0,0.4) 75px, transparent 100px)',
                      WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, transparent 28px, black 50px, rgba(0,0,0,0.4) 75px, transparent 100px)'
                    }}
                 >
                   {fullAmbientText || "The quiet presence of time unfolding."}
                 </p>

                 <p className="absolute top-0 left-6 right-6 sm:left-12 sm:right-12 font-serif text-[16px] sm:text-[17px] font-light leading-[1.8] sm:leading-[1.9] text-left text-[var(--color-text-graphite)]/25 blur-[5px] whitespace-pre-wrap select-none mix-blend-multiply"
                    style={{
                      maskImage: 'linear-gradient(to bottom, transparent 0%, transparent 60px, black 90px, black 160px, transparent 240px)',
                      WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, transparent 60px, black 90px, black 160px, transparent 240px)'
                    }}
                 >
                   {fullAmbientText || "The quiet presence of time unfolding."}
                 </p>
               </div>

               {/* Return button */}
               <button
                 type="button"
                 onClick={handleDone}
                 className="group flex flex-col items-center focus:outline-none mt-32 sm:mt-40 active:scale-[0.98] opacity-0 translate-y-4 transition-all duration-[2000ms]"
                 style={{ transitionDelay: '7000ms' }}
                 ref={(el) => {
                   if (el) requestAnimationFrame(() => {
                     el.style.opacity = '1';
                     el.style.transform = 'translateY(0)';
                   });
                 }}
               >
                 <span className="font-sans text-[var(--color-text-graphite)] text-[10px] tracking-[0.25em] uppercase opacity-40 group-hover:opacity-80 transition-opacity duration-[600ms]">
                   Return
                 </span>
               </button>

            </div>

          </div>
        </>
      )}

    </main>
  );
}
