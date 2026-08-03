"use client";

import React, { useState, useEffect, useRef, useCallback, memo } from 'react';

interface TypewriterSentenceProps {
  /** The full sentence text to type out */
  text: string;
  /** Whether the typing animation should start */
  active: boolean;
  /** Milliseconds per character (28-42ms recommended) */
  charDelay?: number;
  /** Whether user prefers reduced motion */
  reducedMotion?: boolean;
  /** Called when typing completes (or is skipped) */
  onComplete?: () => void;
}

/**
 * TypewriterSentence — Isolated component for the Revelation typing effect.
 *
 * Renders a single sentence being typed character by character.
 * Uses local state only — does NOT re-render the parent on each character.
 *
 * Spec requirements:
 * - 28-42ms per character with slight natural variation
 * - Typed chars readable, untyped chars concealed (not doubled)
 * - Subtle cursor during typing, disappears on completion
 * - Skippable via tap or keypress
 * - Reduced motion: fade from blur to readable over 300ms
 * - aria-live polite announcement when complete
 * - Cleans up all timers on unmount
 */
function TypewriterSentenceInner({
  text,
  active,
  charDelay = 35,
  reducedMotion = false,
  onComplete,
}: TypewriterSentenceProps) {
  const [charCount, setCharCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [isSkipped, setIsSkipped] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const completeCalledRef = useRef(false);
  const containerRef = useRef<HTMLSpanElement>(null);

  // Reduced motion: simple fade from blur to clarity
  const [fadeVisible, setFadeVisible] = useState(false);

  const finishTyping = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setCharCount(text.length);
    setIsComplete(true);
    if (!completeCalledRef.current) {
      completeCalledRef.current = true;
      onComplete?.();
    }
  }, [text.length, onComplete]);

  // Start typing when active
  useEffect(() => {
    if (!active || isComplete) return;

    if (reducedMotion) {
      // Reduced motion: fade instead of type
      setFadeVisible(true);
      const timer = setTimeout(() => {
        finishTyping();
      }, 300);
      return () => clearTimeout(timer);
    }

    // Character-by-character typing with slight natural variation
    let count = 0;
    const tick = () => {
      count++;
      setCharCount(count);
      if (count >= text.length) {
        finishTyping();
      } else {
        // Natural variation: ±8ms around the base delay
        const variation = Math.floor(Math.random() * 16) - 8;
        const nextDelay = Math.max(18, charDelay + variation);
        intervalRef.current = setTimeout(tick, nextDelay);
      }
    };

    // Start after a brief pause
    intervalRef.current = setTimeout(tick, 200);

    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [active, isComplete, reducedMotion, text.length, charDelay, finishTyping]);

  // Skip handler: tap or keypress completes immediately
  useEffect(() => {
    if (!active || isComplete) return;

    const handleSkip = () => {
      setIsSkipped(true);
      finishTyping();
    };

    // Listen on the container and also on document for keypress
    const el = containerRef.current;
    el?.addEventListener('click', handleSkip);
    document.addEventListener('keydown', handleSkip, { once: true });

    return () => {
      el?.removeEventListener('click', handleSkip);
      document.removeEventListener('keydown', handleSkip);
    };
  }, [active, isComplete, finishTyping]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  if (!active && !isComplete) {
    // Before typing starts — concealed, holding space
    return (
      <span className="text-[var(--color-text-graphite)]/40 blur-[5px] select-none">
        {text}{' '}
      </span>
    );
  }

  // Reduced motion path: blur-to-clear fade
  if (reducedMotion) {
    return (
      <>
        <span
          ref={containerRef}
          className={`transition-all duration-300 ease-out ${
            fadeVisible
              ? 'text-[var(--color-text-ink)] blur-0'
              : 'text-[var(--color-text-graphite)]/40 blur-[5px]'
          }`}
        >
          {text}{' '}
        </span>
        {isComplete && (
          <span className="sr-only" role="status" aria-live="polite">
            {text}
          </span>
        )}
      </>
    );
  }

  // Full typing path
  const visibleText = isComplete || isSkipped ? text : text.slice(0, charCount);
  const hiddenText = isComplete || isSkipped ? '' : text.slice(charCount);
  const showCursor = active && !isComplete && charCount > 0;

  return (
    <>
      <span ref={containerRef} className="cursor-pointer">
        {/* Typed characters — fully readable */}
        <span className="text-[var(--color-text-ink)]">
          {visibleText}
        </span>
        {/* Subtle cursor — a thin vertical bar that disappears on completion */}
        {showCursor && (
          <span
            className="inline-block w-[1.5px] h-[1.1em] bg-[var(--color-text-graphite)]/30 align-text-bottom ml-[1px] animate-pulse"
            aria-hidden="true"
          />
        )}
        {/* Remaining characters — transparent to hold space, preventing layout shift */}
        {hiddenText && (
          <span className="text-transparent select-none" aria-hidden="true">
            {hiddenText}
          </span>
        )}
        {' '}
      </span>
      {/* Screen reader announcement — only when complete */}
      {isComplete && (
        <span className="sr-only" role="status" aria-live="polite">
          {text}
        </span>
      )}
    </>
  );
}

export const TypewriterSentence = memo(TypewriterSentenceInner);
