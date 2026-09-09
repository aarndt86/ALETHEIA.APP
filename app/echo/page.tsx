"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/components/AppProvider';
import { STORY_CHAPTERS, getDetailedStoryProgress, splitIntoSentences, getNewlyRevealedSentences, getSentenceId } from '@/lib/storyData';
import type { SentenceRef } from '@/lib/storyData';
import { trackEvent } from '@/lib/analytics';
import { getNextInsight, loadInsightAnswers, saveInsightAnswer, getCompletedInsightIds } from '@/lib/insights';
import type { InsightQuestion } from '@/lib/insights';
import { TypewriterSentence } from '@/components/TypewriterSentence';

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
// V1 Daily Loop: firstEchoIntro → invitation → writing → morphing → reflection → revelation → [insightIntro → insight → insightComplete] → returning
type Stage =
  | 'firstEchoIntro'
  | 'invitation'
  | 'checkin'
  | 'writing'
  | 'morphing'
  | 'reflection'
  | 'revelation'
  | 'insightIntro'
  | 'insight'
  | 'insightComplete'
  | 'returning'
  | 'error';

export default function UnifiedReflectLoopScreen() {
  const {
    selectedState, setSelectedState,
    currentDraft, setCurrentDraft,
    totalEchoCount,
    saveEcho, completeReflection, markReflectionFailed,
    isFirstEcho,
    userStats,
    shouldShowInsight,
    markInsightCompleted,
    markInsightSkipped,
    markInsightIntroSeen,
    markRevealAnimated,
    lastAnimatedRevealEchoCount,
  } = useAppContext();
  const router = useRouter();

  // --- State Machine ---
  const [stage, setStage] = useState<Stage | null>(null);

  const [content, setContent] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [checkInDisappearing, setCheckInDisappearing] = useState(false);
  const [reflectionParagraphs, setReflectionParagraphs] = useState<string[]>([]);
  const [isTransitingOut, setIsTransitingOut] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Transition state
  const [transitionMessage, setTransitionMessage] = useState("Sitting with your words.");
  const [showReflection, setShowReflection] = useState(false);

  // Revelation phase: the timed sequence from Reflection → Revelation
  // idle → dissolving (reflection fades like ink settling) → emerging (story appears) → revealing (typing begins) → resting (copy appears) → ready (actions appear)
  type RevelationPhase = 'idle' | 'dissolving' | 'emerging' | 'revealing' | 'resting' | 'ready';
  const [revelationPhase, setRevelationPhase] = useState<RevelationPhase>('idle');

  // Whether the typewriter has completed for this Revelation
  const [revealTypingDone, setRevealTypingDone] = useState(false);

  // Insight state
  const [currentInsight, setCurrentInsight] = useState<InsightQuestion | null>(null);
  const [insightAnswer, setInsightAnswer] = useState('');

  // Error state
  const [saveError, setSaveError] = useState(false);

  // Optional feeling panel (replaces mandatory checkin)
  const [showFeelingPanel, setShowFeelingPanel] = useState(false);

  // Custom Expression Layer Dynamics
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lineCount = content.split('\n').length;

  // Accessibility: reduced motion
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const insightTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Track AI generation timing
  const aiStartTimeRef = useRef<number>(0);

  // Invitation — memoized per mount so it doesn't re-randomize on re-render
  const invitationRef = useRef<string | null>(null);

  // --- Animation duration helper ---
  const getFadeDuration = useCallback((ms: number) => {
    return prefersReducedMotion ? Math.min(ms, 300) : ms;
  }, [prefersReducedMotion]);

  // --- Initialization ---
  useEffect(() => {
    setSelectedState(null);
    setContent('');
    setCurrentDraft('');

    // Show orientation every time for QA. Production will restrict to first-use only.
    const initialStage: Stage = 'firstEchoIntro';
    setStage(initialStage);

    if (invitationRef.current === null) {
      invitationRef.current = isFirstEcho
        ? FIRST_INVITATION
        : STANDARD_INVITATIONS[Math.floor(Math.random() * STANDARD_INVITATIONS.length)];
    }

    setIsLoaded(true);

    if (typeof window !== 'undefined') {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(mq.matches);
      const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
  }, [isFirstEcho, setSelectedState, setCurrentDraft]);

  // --- Computed ---
  const invitation = invitationRef.current || FIRST_INVITATION;
  const showFirstEchoUI = isFirstEcho && userStats.savedEchoCount === 0;

  const placeholderText = showFirstEchoUI
    ? "Write what feels true right now\u2026"
    : undefined;

  // --- Handlers ---

  const handleFirstEchoBegin = () => {
    trackEvent('first_echo_started', { isFirstEcho: true });
    setStage('writing');
  };

  // --- Invitation handlers ---
  const handleWriteWithInvitation = () => {
    trackEvent('invitation_accepted');
    setStage('writing');
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  const handleWriteOwn = () => {
    trackEvent('invitation_skipped');
    setStage('writing');
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  // --- Optional feeling selection (replaces mandatory checkin) ---
  const handleFeelingSelect = (id: string) => {
    setSelectedState(id);
    setShowFeelingPanel(false);
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
    typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 150);
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

    // Step 1: Save the Echo immediately
    try {
      saveEcho({
        excerpt: content,
        state: selectedState || 'reflective',
      });
    } catch {
      setSaveError(true);
      setIsSubmitting(false);
      setStage('writing');
      return;
    }

    // Step 2: Enter transition
    setStage('morphing');
    setTransitionMessage("Sitting with your words.");

    // Step 3: AI request + minimum pause
    aiStartTimeRef.current = Date.now();
    const minPause = prefersReducedMotion ? 300 : 1500;
    const maxPauseTime = prefersReducedMotion ? 300 : 2200;

    const minPausePromise = new Promise<void>(resolve => setTimeout(resolve, minPause));
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

    await minPausePromise;
    clearTimeout(maxPauseTimeout);

    const generationTime = Date.now() - aiStartTimeRef.current;

    if (aiFailed || !aiResult) {
      trackEvent('reflection_failed', {
        emotionalState: selectedState || undefined,
        aiGenerationTimeMs: generationTime,
      });
      markReflectionFailed();
      setStage('error');
      setIsSubmitting(false);
      return;
    }

    // Parse reflection into paragraphs
    const paragraphs = aiResult.reflection
      .split('\n')
      .map(p => p.trim())
      .filter(p => p.length > 0);
    setReflectionParagraphs(paragraphs);

    // Reveal the Reflection
    setShowReflection(false);
    const fadeOut = prefersReducedMotion ? 100 : 250;
    await new Promise<void>(resolve => setTimeout(resolve, fadeOut));

    setStage('reflection');
    requestAnimationFrame(() => setShowReflection(true));

    setIsSubmitting(false);
  }, [content, selectedState, userStats.savedEchoCount, saveEcho, markReflectionFailed, prefersReducedMotion]);

  const handleSealEcho = () => {
    if (isSubmitting) return;
    triggerReflectionFlow();
  };

  // --- "See What This Added →" — The Revelation Moment ---
  // The Reflection dissolves like ink settling into paper.
  // If new Story text was unlocked, the typewriter drives the completion timing.
  // If not, fixed timers provide the same calm pacing.
  const handleSeeWhatThisAdded = () => {
    const reflectionText = reflectionParagraphs.join('\n\n');
    completeReflection(reflectionText);

    trackEvent('revelation_entered', {
      emotionalState: selectedState || undefined,
    });

    // Check at call time whether we'll have new text to animate
    // Note: completeReflection() just incremented totalEchoCount in state,
    // but the state update hasn't flushed yet. Use +1 to reflect post-increment.
    const postEchoCount = totalEchoCount + 1;
    const postRevealDiff = getNewlyRevealedSentences(postEchoCount);
    const willAnimate = postRevealDiff.hasNewReveal && lastAnimatedRevealEchoCount < postEchoCount;

    if (prefersReducedMotion) {
      setShowReflection(false);
      setRevelationPhase('dissolving');
      setTimeout(() => {
        setStage('revelation');
        setRevelationPhase('revealing');
        if (!willAnimate) {
          // No typewriter — fixed timers
          setTimeout(() => setRevelationPhase('resting'), 400);
          setTimeout(() => setRevelationPhase('ready'), 1200);
        }
        // If willAnimate, TypewriterSentence.onComplete handles resting/ready
      }, 200);
      return;
    }

    // Full emotional sequence:
    // +0ms: Pause. The Reflection holds. Silence.
    // +600ms: Reflection begins dissolving
    // +1000ms: Revelation stage mounts, Story emerges
    // +2200ms: Typing begins (or, if no new text, resting phase)
    // resting/ready: driven by typewriter completion OR fixed timers

    setTimeout(() => {
      setRevelationPhase('dissolving');
      setShowReflection(false);
    }, 600);

    setTimeout(() => {
      setStage('revelation');
      setRevelationPhase('emerging');
    }, 1000);

    setTimeout(() => {
      setRevelationPhase('revealing');
      if (!willAnimate) {
        // No new text to type — go directly to resting/ready on fixed timers
        setTimeout(() => setRevelationPhase('resting'), 1200);
        setTimeout(() => setRevelationPhase('ready'), 3700);
      }
      // If willAnimate, TypewriterSentence.onComplete handles resting/ready
    }, 2200);
  };

  // --- Navigation helpers ---
  const resetAndNavigate = useCallback((path: string) => {
    setIsSubmitting(false);
    setIsTransitingOut(true);
    setTimeout(() => {
      router.push(path);
    }, getFadeDuration(600));
  }, [router, getFadeDuration]);

  // --- Revelation Actions ---
  const handleReturnToAltheara = () => {
    trackEvent('revelation_return_dashboard');
    resetAndNavigate('/home');
  };

  const handleContinueToStory = () => {
    trackEvent('revelation_continue_to_story');
    resetAndNavigate('/story');
  };

  // --- Insight Flow ---
  const handleRevelationComplete = () => {
    // After Revelation, check if an Insight should be shown
    if (shouldShowInsight) {
      const completedIds = getCompletedInsightIds();
      const nextInsight = getNextInsight(completedIds);
      if (nextInsight) {
        setCurrentInsight(nextInsight);
        if (!userStats.insightIntroSeen) {
          setStage('insightIntro');
        } else {
          setStage('insight');
        }
        return;
      }
    }
    // No insight — return to dashboard
    handleReturnToAltheara();
  };

  const handleInsightIntroContinue = () => {
    markInsightIntroSeen();
    setStage('insight');
    setTimeout(() => insightTextareaRef.current?.focus(), 200);
  };

  const handleInsightIntroSkip = () => {
    markInsightSkipped();
    handleReturnToAltheara();
  };

  const handleInsightSubmit = () => {
    if (!currentInsight || insightAnswer.trim().length < 5) return;

    saveInsightAnswer({
      questionId: currentInsight.id,
      answer: insightAnswer.trim(),
      answeredAt: new Date().toISOString(),
    });
    markInsightCompleted();

    trackEvent('insight_completed', {
      insightCategory: currentInsight.category,
    });

    setStage('insightComplete');
  };

  const handleInsightSkip = () => {
    markInsightSkipped();
    handleReturnToAltheara();
  };

  const handleInsightCompleteDone = () => {
    handleReturnToAltheara();
  };

  // --- Error Handlers ---
  const handleRetry = () => {
    setIsSubmitting(false);
    setStage('morphing');
    setTransitionMessage("Sitting with your words.");
    setTimeout(() => triggerReflectionFlow(), 50);
  };

  const handleErrorReturnHome = () => {
    resetAndNavigate('/home');
  };

  // --- Story Progress for Revelation ---
  const storyProgress = getDetailedStoryProgress(totalEchoCount);
  const currentChapter = STORY_CHAPTERS[storyProgress.currentChapterIndex];

  // Compute what this Echo actually revealed (before vs after comparison)
  const revealDiff = getNewlyRevealedSentences(totalEchoCount);
  // Should we animate? Only if this is the first time seeing this reveal
  const shouldAnimate = revealDiff.hasNewReveal && lastAnimatedRevealEchoCount < totalEchoCount;
  // Build a set of newly revealed sentence IDs for fast lookup
  const newlyRevealedIds = new Set(revealDiff.newlyRevealed.map(getSentenceId));
  // For multi-sentence reveals: type only the first new sentence, fade the rest
  const primaryTypeSentence = revealDiff.newlyRevealed.length > 0 ? revealDiff.newlyRevealed[0] : null;
  const primaryTypeSentenceId = primaryTypeSentence ? getSentenceId(primaryTypeSentence) : null;

  // Typewriter completion handler
  const handleTypewriterComplete = useCallback(() => {
    setRevealTypingDone(true);
    markRevealAnimated();
    // After typing: hold ~800ms, show copy, then show actions
    const holdMs = prefersReducedMotion ? 200 : 800;
    setTimeout(() => setRevelationPhase('resting'), holdMs);
    setTimeout(() => setRevelationPhase('ready'), holdMs + (prefersReducedMotion ? 400 : 2500));
  }, [markRevealAnimated, prefersReducedMotion]);

  // --- Pre-hydration ---
  if (!isLoaded || stage === null) {
    return <main className="min-h-[100dvh] bg-[var(--color-canvas-linen)]"></main>;
  }

  return (
    <main className={`min-h-[100dvh] w-full flex flex-col items-center justify-center px-8 sm:px-12 relative overflow-hidden transition-all ease-out
      ${stage === 'firstEchoIntro' || stage === 'checkin' || stage === 'writing' ? 'bg-[var(--color-canvas-linen)] duration-[1000ms]' : 'bg-[var(--color-canvas-linen)] duration-[1200ms]'}
      ${isTransitingOut ? 'opacity-0 duration-[800ms]' : 'opacity-100'}
    `}>

      {/* Background layers — all pointer-events-none */}
      <div
        className={`absolute inset-0 pointer-events-none transition-all ease-out z-0
        ${stage === 'firstEchoIntro' || stage === 'checkin' || stage === 'writing' ? 'bg-transparent opacity-0 duration-0' : 'bg-[#363532] opacity-[0.03] duration-[1200ms]'}`}
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
          STAGE: Echo Orientation
          Shows every time for QA. Production: first-use only.
          ============================================================ */}
      {stage === 'firstEchoIntro' && (
        <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center p-8 sm:p-12 z-30">
          <div className="flex flex-col items-center text-center max-w-md">
            <span className="font-sans text-[10px] sm:text-[11px] tracking-[0.25em] uppercase text-[var(--color-text-graphite)] opacity-60 mb-12">
              A note before you begin
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl text-[var(--color-text-ink)] mb-10 leading-snug">
              There is no right way<br />to leave an Echo.
            </h1>
            <p className="font-serif text-[15px] sm:text-base text-[var(--color-text-graphite)] leading-relaxed mb-6 max-w-[320px]">
              A thought. A feeling. Something that happened.<br />
              Something you don&apos;t want to forget.
            </p>
            <p className="font-serif text-[15px] sm:text-base text-[var(--color-text-graphite)] leading-relaxed mb-6 max-w-[320px]">
              Today&apos;s Invitation is simply a place to begin.<br />
              You never have to answer it.
            </p>
            <p className="font-serif text-[15px] sm:text-base text-[var(--color-text-graphite)] leading-relaxed mb-16 max-w-[320px]">
              Start there, or start anywhere.
            </p>
            <button
              type="button"
              onClick={handleFirstEchoBegin}
              className="group flex flex-col items-center focus:outline-none transition-all duration-500 active:scale-[0.98] active:opacity-60"
            >
              <span className="font-sans text-[var(--color-text-ink)] text-[11px] sm:text-xs tracking-[0.2em] uppercase border-b border-[var(--color-accent-clay)]/40 group-hover:border-[var(--color-accent-clay)] pb-2 transition-colors duration-[600ms]">
                Begin &rarr;
              </span>
            </button>
          </div>
        </div>
      )}



      {/* ============================================================
          STAGE: Writing
          The Invitation and the writing surface are ONE page.
          Tapping anywhere focuses the textarea.
          The Invitation fades when the first character is typed.
          ============================================================ */}
      <div
        className={`absolute top-0 w-full max-w-[520px] flex flex-col pt-[24vh] px-6 sm:px-8 transition-all ease-in-out z-10
          ${stage === 'checkin' || stage === 'firstEchoIntro' ? 'opacity-0 translate-y-8 duration-0 pointer-events-none' : ''}
          ${stage === 'writing' ? 'opacity-100 scale-100 blur-0 translate-y-0 duration-[1000ms] pointer-events-auto' : ''}
          ${stage === 'morphing' ? `opacity-0 scale-100 ${prefersReducedMotion ? 'duration-[200ms]' : 'duration-[400ms]'} pointer-events-none` : ''}
          ${stage !== 'checkin' && stage !== 'firstEchoIntro' && stage !== 'writing' && stage !== 'morphing' ? 'opacity-0 pointer-events-none duration-0' : ''}
        `}
        onClick={() => { if (stage === 'writing') textareaRef.current?.focus(); }}
        role="presentation"
      >
        {/* Invitation — fades on first character, returns if emptied */}
        <div className={`transition-all ease-out pointer-events-none
          ${stage === 'writing' && content.length === 0 ? 'opacity-70 translate-y-0 duration-[600ms]' : ''}
          ${stage === 'writing' && content.length > 0 ? 'opacity-0 -translate-y-1 duration-[600ms]' : ''}
          ${stage !== 'writing' ? 'opacity-0 duration-0' : ''}
          ${content.length > 0 ? 'absolute' : 'relative mb-12'}
        `}>
          <span className="font-sans text-[10px] sm:text-[11px] tracking-[0.25em] uppercase text-[var(--color-text-graphite)] opacity-50 block mb-8">
            Today&apos;s Invitation
          </span>
          <h2 className="font-serif text-[20px] sm:text-[22px] text-[var(--color-text-ink)] text-left italic font-light tracking-wide">
            {invitation}
          </h2>
          <p className="font-serif italic text-[13px] text-[var(--color-text-graphite)] opacity-40 mt-6">
            or begin anywhere
          </p>
        </div>

        {/* Writing surface — borderless, chromeless, the page itself */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          readOnly={stage !== 'writing'}
          spellCheck="false"
          className={`w-full bg-transparent resize-none outline-none font-serif text-[21px] sm:text-2xl lg:text-[26px] text-[var(--color-text-ink)] leading-[1.8] sm:leading-[1.9] min-h-[50vh] focus:outline-none transition-all duration-[180ms] ease-out
            ${isTyping ? 'opacity-95 translate-y-[2px]' : 'opacity-100 translate-y-0'}
          `}
          style={{
            caretColor: 'var(--color-text-graphite)',
            textShadow: isTyping ? '0 1px 2px rgba(0,0,0,0.02)' : '0 1px 0 rgba(0,0,0,0)'
          }}
        />
      </div>

      {/* Save Error Message */}
      {saveError && stage === 'writing' && (
        <div className="absolute bottom-32 left-8 right-8 flex justify-center z-30 pointer-events-none">
          <p className="font-sans text-sm text-[var(--color-text-ink)] bg-[var(--color-canvas-stone)] px-6 py-4 rounded-sm text-center max-w-md">
            We could not save this yet. Your words are still here. Please try again.
          </p>
        </div>
      )}

      {/* Submit Button: "Add Echo to Your Story →" */}
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
          <span className="font-sans text-[var(--color-text-graphite)]/70 text-[10px] sm:text-xs tracking-[0.2em] uppercase pb-2 transition-colors duration-[600ms] group-hover:text-[var(--color-text-ink)]">
            Add Echo to Your Story &rarr;
          </span>
        </button>
      </div>

      {/* Optional Feeling — small, muted, subordinate to the writing */}
      <div
        className={`absolute bottom-36 flex flex-col items-center w-full transition-all duration-[600ms] ease-out z-20
          ${stage === 'writing' && content.trim().length >= 10 && !isSubmitting ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
        `}
      >
        {!showFeelingPanel && !selectedState && (
          <button
            type="button"
            onClick={() => setShowFeelingPanel(true)}
            className="font-sans text-[10px] tracking-[0.15em] uppercase text-[var(--color-text-graphite)]/40 hover:text-[var(--color-text-graphite)]/70 transition-colors duration-500 focus:outline-none"
          >
            + Add a Feeling
          </button>
        )}
        {selectedState && !showFeelingPanel && (
          <button
            type="button"
            onClick={() => { setSelectedState(null); setShowFeelingPanel(true); }}
            className="font-serif italic text-[12px] text-[var(--color-text-graphite)]/50 hover:text-[var(--color-text-graphite)]/80 transition-colors duration-500 focus:outline-none"
          >
            {lockedStates.find(s => s.id === selectedState)?.label}
          </button>
        )}
        {showFeelingPanel && (
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 max-w-sm px-4 animate-[fadeIn_0.4s_ease-out_forwards]">
            {lockedStates.map((stateInfo) => (
              <button
                key={stateInfo.id}
                type="button"
                onClick={() => handleFeelingSelect(stateInfo.id)}
                className="font-serif text-sm text-[var(--color-text-graphite)]/60 hover:text-[var(--color-text-ink)] transition-colors duration-300 focus:outline-none px-1 py-0.5"
              >
                {stateInfo.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ============================================================
          STAGE: Morphing / Ceremonial Transition
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
          STAGE: Reflection
          3 paragraphs: Mirror → Observation → Carry Forward
          CTA: "See What This Added →"
          The Reflection dissolves like ink settling into paper
          when the Revelation sequence begins.
          ============================================================ */}
      <div className={`absolute inset-0 w-full h-full flex flex-col items-center justify-start z-30 overflow-y-auto no-scrollbar
        transition-all ease-out
        ${stage === 'reflection' && revelationPhase === 'idle'
          ? `opacity-100 blur-0 translate-y-0 ${prefersReducedMotion ? 'duration-[200ms]' : 'duration-[500ms]'} pointer-events-auto`
          : stage === 'reflection' && revelationPhase === 'dissolving'
          ? 'opacity-0 blur-[2px] translate-y-0 duration-[1000ms] pointer-events-none'
          : 'opacity-0 pointer-events-none'
        }
      `}
      style={{ WebkitOverflowScrolling: 'auto', overscrollBehavior: 'none' }}
      >
        <div className="w-full max-w-lg px-6 sm:px-8 pt-[28vh] pb-[20vh] flex flex-col items-center">
          {/* Reflection ritual header */}
          <div className={`text-center mb-16 transition-opacity ease-out
            ${showReflection
              ? `opacity-100 ${prefersReducedMotion ? 'duration-[200ms]' : 'duration-[500ms]'}`
              : 'opacity-0 duration-0'
            }
          `}>
            <span className="font-sans text-[10px] sm:text-[11px] tracking-[0.25em] uppercase text-[var(--color-text-graphite)] opacity-60 block mb-6">
              Reflection
            </span>
            <p className="font-serif text-[15px] sm:text-base text-[var(--color-text-graphite)] leading-relaxed opacity-80">
              What your words seem to hold.
            </p>
          </div>

          {/* Single concise reflection — 15–30 words */}
          <p
            className={`font-serif text-lg sm:text-xl lg:text-2xl text-[var(--color-text-ink)] leading-[1.8] sm:leading-[2] text-center max-w-md
              transition-opacity ease-out
              ${showReflection
                ? `opacity-100 ${prefersReducedMotion ? 'duration-[200ms]' : 'duration-[600ms]'}`
                : 'opacity-0 duration-0'
              }
            `}
            style={{
              transitionDelay: showReflection && !prefersReducedMotion ? '200ms' : '0ms'
            }}
          >
            {reflectionParagraphs.join(' ')}
          </p>

          {/* "See What This Added →" CTA */}
          <div
            className={`mt-20 sm:mt-24
              transition-all ease-out
              ${showReflection && stage === 'reflection' && revelationPhase === 'idle'
                ? `opacity-100 translate-y-0 ${prefersReducedMotion ? 'duration-[200ms]' : 'duration-[600ms]'}`
                : 'opacity-0 translate-y-2 duration-0'
              }
            `}
            style={{
              transitionDelay: showReflection && !prefersReducedMotion ? '600ms' : '0ms'
            }}
          >
            <button
              type="button"
              onClick={handleSeeWhatThisAdded}
              disabled={stage !== 'reflection' || revelationPhase !== 'idle'}
              className="group flex flex-col items-center focus:outline-none transition-all duration-300 active:scale-[0.98] active:opacity-60"
            >
              <span className="font-sans text-[var(--color-text-ink)] text-[10px] sm:text-xs tracking-[0.2em] uppercase border-b border-transparent group-hover:border-[var(--color-accent-clay)] pb-2 transition-colors duration-[600ms]">
                See What This Added &rarr;
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================
          STAGE: Revelation
          The quiet moment where today's Echo finds its place
          inside the unfolding story.

          V1.3: Compares before/after story state to identify
          genuinely new text. Only new text gets the typewriter.
          Previously revealed text appears immediately.
          Future text stays blurred.
          ============================================================ */}
      {stage === 'revelation' && (
        <div
          className={`absolute inset-0 w-full h-full flex flex-col items-center pt-[14vh] pb-[20vh] px-8 sm:px-12 z-40 overflow-y-auto no-scrollbar
            transition-opacity ease-out
            ${revelationPhase !== 'idle' ? 'opacity-100 duration-[1200ms]' : 'opacity-0 duration-[400ms]'}
          `}
          style={{ WebkitOverflowScrolling: 'auto', overscrollBehavior: 'none' }}
        >
          {/* Cinematic grain */}
          <div
            className="absolute inset-0 pointer-events-none z-50 opacity-[0.02]"
            style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}
          ></div>

          {/* Story Header */}
          <header className={`w-full max-w-[540px] mb-24 sm:mb-32 flex flex-col items-center text-center
            transition-opacity ease-out duration-[1800ms]
            ${revelationPhase !== 'idle' && revelationPhase !== 'dissolving' ? 'opacity-100' : 'opacity-0'}
          `}>
            {revealDiff.isFirstReveal && shouldAnimate ? (
              <h2 className="font-sans text-[11px] sm:text-xs tracking-[0.3em] uppercase text-[var(--color-text-ink)]/80 mb-8">
                Your Story Has Begun
              </h2>
            ) : (
              <h2 className="font-serif text-3xl sm:text-4xl text-[var(--color-text-ink)]/90 mb-6 tracking-wide">
                Your Story
              </h2>
            )}
            <p className="font-serif italic text-[14px] sm:text-[15px] tracking-wide text-[var(--color-text-graphite)]/60">
              The accumulation of your presence
            </p>
          </header>

          {/* Chapter Content */}
          <article className={`w-full max-w-[540px] flex flex-col gap-12 sm:gap-16
            transition-opacity ease-out duration-[1800ms]
            ${revelationPhase !== 'idle' && revelationPhase !== 'dissolving' ? 'opacity-100' : 'opacity-0'}
          `}>
            <header className="mb-4">
              <h3 className="font-serif text-xl sm:text-2xl text-[var(--color-text-ink)] mb-6 text-center md:text-left">
                {currentChapter.title}
              </h3>
              <div className="w-12 h-[1px] bg-[var(--color-text-graphite)]/20 mx-auto md:mx-0 mt-8"></div>
            </header>

            {/* Sentence-level rendering with before/after comparison */}
            <div className="flex flex-col gap-12 md:gap-16">
              {currentChapter.paragraphs.map((paragraphText, pIdx) => {
                const sentences = splitIntoSentences(paragraphText);
                const paragraphSentenceRefs = storyProgress.revealedSentences.filter(
                  s => s.chapterIndex === storyProgress.currentChapterIndex && s.paragraphIndex === pIdx
                );
                const revealedCount = paragraphSentenceRefs.length;
                const hasAnyRevealed = revealedCount > 0;

                if (!hasAnyRevealed) {
                  return (
                    <p
                      key={pIdx}
                      className="font-serif text-[19px] sm:text-[21px] leading-[2.4] md:leading-[2.6] text-left text-[var(--color-text-graphite)]/30 blur-[6px] select-none"
                    >
                      {paragraphText}
                    </p>
                  );
                }

                return (
                  <p
                    key={pIdx}
                    className="font-serif text-[19px] sm:text-[21px] leading-[2.4] md:leading-[2.6] text-left"
                  >
                    {sentences.map((sentence, sIdx) => {
                      const isRevealed = sIdx < revealedCount;
                      const sentenceId = `c${storyProgress.currentChapterIndex}-p${pIdx}-s${sIdx}`;
                      const isNewlyRevealed = newlyRevealedIds.has(sentenceId);
                      const isPrimaryType = sentenceId === primaryTypeSentenceId;
                      const isNextToReveal = sIdx === revealedCount;

                      if (isRevealed && isNewlyRevealed && shouldAnimate) {
                        if (isPrimaryType) {
                          // PRIMARY new sentence — gets the typewriter
                          return (
                            <TypewriterSentence
                              key={sIdx}
                              text={sentence}
                              active={revelationPhase === 'revealing' || revelationPhase === 'resting' || revelationPhase === 'ready'}
                              charDelay={35}
                              reducedMotion={prefersReducedMotion}
                              onComplete={handleTypewriterComplete}
                            />
                          );
                        } else {
                          // Secondary new sentences — fade in after typing completes
                          return (
                            <span
                              key={sIdx}
                              className={`transition-all ease-out duration-[800ms] ${
                                revealTypingDone
                                  ? 'text-[var(--color-text-ink)] blur-0'
                                  : 'text-[var(--color-text-graphite)]/40 blur-[5px]'
                              }`}
                            >
                              {sentence}{' '}
                            </span>
                          );
                        }
                      } else if (isRevealed) {
                        // Previously revealed — immediately readable
                        return (
                          <span key={sIdx} className="text-[var(--color-text-ink)]/85 blur-0">
                            {sentence}{' '}
                          </span>
                        );
                      } else if (isNextToReveal) {
                        return (
                          <span key={sIdx} className="text-[var(--color-text-graphite)]/50 blur-[3px] select-none">
                            {sentence}{' '}
                          </span>
                        );
                      } else {
                        return (
                          <span key={sIdx} className="text-[var(--color-text-graphite)]/30 blur-[6px] select-none">
                            {sentence}{' '}
                          </span>
                        );
                      }
                    })}
                  </p>
                );
              })}
            </div>
          </article>

          {/* Revelation Copy — three variants based on what happened */}
          <div className={`w-full max-w-[540px] flex flex-col items-center text-center mt-32 sm:mt-40
            transition-opacity ease-out duration-[1500ms]
            ${revelationPhase === 'resting' || revelationPhase === 'ready' ? 'opacity-100' : 'opacity-0'}
          `}>
            {revealDiff.isFirstReveal && shouldAnimate ? (
              /* First Echo — special treatment */
              <>
                <h3 className="font-serif text-xl sm:text-2xl text-[var(--color-text-ink)] mb-6 leading-snug">
                  The first line has found its place.
                </h3>
                <p className={`font-serif text-[15px] sm:text-base text-[var(--color-text-graphite)] leading-relaxed mb-16
                  transition-opacity ease-out duration-[1200ms] delay-[500ms]
                  ${revelationPhase === 'resting' || revelationPhase === 'ready' ? 'opacity-70' : 'opacity-0'}
                `}>
                  This is the beginning of something only you can tell.
                </p>
              </>
            ) : revealDiff.hasNewReveal ? (
              /* New content was revealed */
              <>
                <h3 className="font-serif text-xl sm:text-2xl text-[var(--color-text-ink)] mb-6 leading-snug">
                  Another part of your story has come into view.
                </h3>
                <p className={`font-serif text-[15px] sm:text-base text-[var(--color-text-graphite)] leading-relaxed mb-4
                  transition-opacity ease-out duration-[1200ms] delay-[500ms]
                  ${revelationPhase === 'resting' || revelationPhase === 'ready' ? 'opacity-70' : 'opacity-0'}
                `}>
                  Every Echo helps the life you are living become something you can return to.
                </p>
                <p className={`font-serif italic text-[13px] text-[var(--color-text-graphite)]/50 mb-16
                  transition-opacity ease-out duration-[1200ms] delay-[1000ms]
                  ${revelationPhase === 'resting' || revelationPhase === 'ready' ? 'opacity-100' : 'opacity-0'}
                `}>
                  As you leave more here, more begins to connect.
                </p>
              </>
            ) : (
              /* No new reveal — Echo is preserved but threshold not crossed */
              <>
                <h3 className="font-serif text-xl sm:text-2xl text-[var(--color-text-ink)] mb-6 leading-snug">
                  Another page has found its place.
                </h3>
                <p className={`font-serif text-[15px] sm:text-base text-[var(--color-text-graphite)] leading-relaxed mb-4
                  transition-opacity ease-out duration-[1200ms] delay-[500ms]
                  ${revelationPhase === 'resting' || revelationPhase === 'ready' ? 'opacity-70' : 'opacity-0'}
                `}>
                  Your Echo is now part of the story taking shape.
                </p>
                <p className={`font-serif italic text-[13px] text-[var(--color-text-graphite)]/50 mb-16
                  transition-opacity ease-out duration-[1200ms] delay-[1000ms]
                  ${revelationPhase === 'resting' || revelationPhase === 'ready' ? 'opacity-100' : 'opacity-0'}
                `}>
                  As you leave more here, more begins to connect.
                </p>
              </>
            )}
          </div>

          {/* Revelation Actions */}
          <div className={`w-full max-w-[540px] flex flex-col items-center gap-10 mt-8 pb-20
            transition-opacity ease-out duration-[1200ms]
            ${revelationPhase === 'ready' ? 'opacity-100' : 'opacity-0 pointer-events-none'}
          `}>
            <button
              type="button"
              onClick={handleRevelationComplete}
              disabled={revelationPhase !== 'ready'}
              className="group flex flex-col items-center focus:outline-none transition-all duration-500 active:scale-[0.98] active:opacity-60"
            >
              <span className="font-sans text-[var(--color-text-ink)] text-[11px] sm:text-xs tracking-[0.2em] uppercase border-b border-[var(--color-accent-clay)]/40 group-hover:border-[var(--color-accent-clay)] pb-2 transition-colors duration-[600ms]">
                Return to Altheara
              </span>
            </button>

            <button
              type="button"
              onClick={handleContinueToStory}
              disabled={revelationPhase !== 'ready'}
              className="group flex flex-col items-center focus:outline-none transition-all duration-500 active:scale-[0.98] active:opacity-60"
            >
              <span className="font-sans text-[var(--color-text-graphite)] text-[10px] sm:text-[11px] tracking-[0.2em] uppercase opacity-50 group-hover:opacity-80 transition-opacity duration-[600ms]">
                Continue to Story &rarr;
              </span>
            </button>
          </div>
        </div>
      )}

      {/* ============================================================
          STAGE: Insight Introduction (first time only)
          ============================================================ */}
      {stage === 'insightIntro' && (
        <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center p-8 sm:p-12 z-40">
          <div className="flex flex-col items-center text-center max-w-md opacity-0 animate-[fadeIn_1.5s_ease-out_forwards]">
            <span className="font-sans text-[10px] sm:text-[11px] tracking-[0.25em] uppercase text-[var(--color-text-graphite)] opacity-60 mb-12">
              Insight
            </span>

            <p className="font-serif text-[15px] sm:text-base text-[var(--color-text-graphite)] leading-relaxed mb-6 max-w-[380px]">
              Most of your story unfolds naturally through your Echoes.
            </p>
            <p className="font-serif text-[15px] sm:text-base text-[var(--color-text-graphite)] leading-relaxed mb-6 max-w-[380px]">
              From time to time, Altheara will offer an Insight&mdash;a single thoughtful question that helps preserve the parts of your life everyday moments may never naturally reveal.
            </p>
            <p className="font-serif text-[15px] sm:text-base text-[var(--color-text-graphite)] leading-relaxed mb-16 max-w-[380px]">
              Over time, these Insights help your story become richer, more complete, and unmistakably yours.
            </p>

            <div className="flex flex-col items-center gap-10">
              <button
                type="button"
                onClick={handleInsightIntroContinue}
                className="group flex flex-col items-center focus:outline-none transition-all duration-500 active:scale-[0.98] active:opacity-60"
              >
                <span className="font-sans text-[var(--color-text-ink)] text-[11px] sm:text-xs tracking-[0.2em] uppercase border-b border-[var(--color-accent-clay)]/40 group-hover:border-[var(--color-accent-clay)] pb-2 transition-colors duration-[600ms]">
                  Continue
                </span>
              </button>

              <button
                type="button"
                onClick={handleInsightIntroSkip}
                className="group flex flex-col items-center focus:outline-none transition-all duration-500 active:scale-[0.98] active:opacity-60"
              >
                <span className="font-sans text-[var(--color-text-graphite)] text-[10px] sm:text-[11px] tracking-[0.2em] uppercase opacity-50 group-hover:opacity-80 transition-opacity duration-[600ms]">
                  Skip for Today
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          STAGE: Insight Question
          ============================================================ */}
      {stage === 'insight' && currentInsight && (
        <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-start pt-[20vh] px-8 sm:px-12 z-40 overflow-y-auto no-scrollbar">
          <div className="w-full max-w-[520px] flex flex-col items-center opacity-0 animate-[fadeIn_1.5s_ease-out_forwards]">
            <span className="font-sans text-[10px] sm:text-[11px] tracking-[0.25em] uppercase text-[var(--color-text-graphite)] opacity-60 mb-16">
              Insight
            </span>

            <h2 className="font-serif text-xl sm:text-2xl text-[var(--color-text-ink)] text-center leading-snug mb-20 max-w-[440px]">
              {currentInsight.question}
            </h2>

            <textarea
              ref={insightTextareaRef}
              value={insightAnswer}
              onChange={(e) => setInsightAnswer(e.target.value)}
              spellCheck="false"
              placeholder="Write what comes to mind\u2026"
              className="w-full bg-transparent resize-none outline-none font-serif text-[19px] sm:text-xl text-[var(--color-text-ink)] leading-[1.8] sm:leading-[1.9] min-h-[30vh] focus:outline-none placeholder:text-[var(--color-text-graphite)]/30 placeholder:italic"
              style={{ caretColor: 'var(--color-text-graphite)' }}
            />

            <div className="flex flex-col items-center gap-10 mt-16 pb-20">
              <div className={`transition-all duration-500 ${insightAnswer.trim().length >= 5 ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <button
                  type="button"
                  onClick={handleInsightSubmit}
                  disabled={insightAnswer.trim().length < 5}
                  className="group flex flex-col items-center focus:outline-none transition-all duration-500 active:scale-[0.98] active:opacity-60"
                >
                  <span className="font-sans text-[var(--color-text-ink)] text-[10px] sm:text-xs tracking-[0.2em] uppercase border-b border-[var(--color-accent-clay)]/40 group-hover:border-[var(--color-accent-clay)] pb-2 transition-colors duration-[600ms]">
                    Add to Your Story
                  </span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleInsightSkip}
                className="group flex flex-col items-center focus:outline-none transition-all duration-500 active:scale-[0.98] active:opacity-60"
              >
                <span className="font-sans text-[var(--color-text-graphite)] text-[10px] sm:text-[11px] tracking-[0.2em] uppercase opacity-50 group-hover:opacity-80 transition-opacity duration-[600ms]">
                  Skip for Today
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          STAGE: Insight Complete
          ============================================================ */}
      {stage === 'insightComplete' && (
        <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center p-8 sm:p-12 z-40">
          <div className="flex flex-col items-center text-center max-w-md opacity-0 animate-[fadeIn_1.5s_ease-out_forwards]">
            <h2 className="font-serif text-xl sm:text-2xl text-[var(--color-text-ink)] mb-6 leading-snug">
              Another Insight has found its place in your story.
            </h2>
            <p className="font-serif text-[15px] sm:text-base text-[var(--color-text-graphite)] leading-relaxed mb-16 opacity-70">
              This will help shape the chapters ahead.
            </p>

            <button
              type="button"
              onClick={handleInsightCompleteDone}
              className="group flex flex-col items-center focus:outline-none transition-all duration-500 active:scale-[0.98] active:opacity-60"
            >
              <span className="font-sans text-[var(--color-text-ink)] text-[11px] sm:text-xs tracking-[0.2em] uppercase border-b border-[var(--color-accent-clay)]/40 group-hover:border-[var(--color-accent-clay)] pb-2 transition-colors duration-[600ms]">
                Return to Altheara
              </span>
            </button>
          </div>
        </div>
      )}

      {/* ============================================================
          STAGE: Error (AI Reflection Failed)
          ============================================================ */}
      {stage === 'error' && (
        <div
          className="absolute inset-0 w-full h-full flex flex-col items-center justify-center p-8 sm:p-12 z-40"
          role="alert"
        >
          <div className="flex flex-col items-center text-center max-w-md opacity-0 animate-[fadeIn_0.8s_ease-out_forwards]">
            <h2 className="font-serif text-xl sm:text-2xl text-[var(--color-text-ink)] mb-6 leading-snug">
              Your words have been kept.
            </h2>
            <p className="font-serif text-[15px] sm:text-base text-[var(--color-text-graphite)] leading-relaxed mb-16 opacity-70">
              Altheara could not complete the Reflection just yet. You can return to it when it is ready.
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

    </main>
  );
}
