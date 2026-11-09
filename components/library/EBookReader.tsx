"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { PreservedBook, PreservedVolumeEdition, ReadingStateRecord } from '@/lib/volumeData';

interface EBookReaderProps {
  book: PreservedBook;
  edition: PreservedVolumeEdition;
  onSelectEdition: (editionId: string) => void;
  onBackToDetail: () => void;
  onBackToBookshelf: () => void;
}

interface SearchMatch {
  chapterIndex: number;
  chapterRoman: string;
  chapterTitle: string;
  paragraphIndex: number;
  paragraphId: string;
  textSnippet: string;
}

const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

function getChapterRoman(chap: { romanNumeral?: string; title?: string; order?: number }, idx: number): string {
  if (chap.romanNumeral) return chap.romanNumeral;
  const match = chap.title?.match(/^Chapter\s+([IVXLCDM]+)/i);
  if (match) return match[1].toUpperCase();
  return ROMAN_NUMERALS[idx] || String(idx + 1);
}

function getCleanChapterTitle(chap: { title?: string }, roman: string): string {
  if (!chap.title) return `Chapter ${roman}`;
  const clean = chap.title.replace(/^Chapter\s+[IVXLCDM]+\s*[—:\-]?\s*/i, '').trim();
  return clean || chap.title;
}

export default function EBookReader({
  book,
  edition,
  onSelectEdition,
  onBackToDetail,
  onBackToBookshelf,
}: EBookReaderProps) {
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const [readingStateLoaded, setReadingStateLoaded] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // In-book search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [highlightedParagraphId, setHighlightedParagraphId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      const q = sp.get('search');
      if (q) {
        setSearchQuery(q);
        setIsSearchOpen(true);
      }
    }
  }, []);

  const paragraphRefs = useRef<Record<string, HTMLParagraphElement | null>>({});

  // 1. Load Reading State for this specific edition across sessions (Architectural Requirement 5 & 6)
  useEffect(() => {
    let isMounted = true;
    async function loadProgress() {
      try {
        const res = await fetch(`/api/volume/library/reading-state?editionId=${edition.editionId}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.readingState) {
            const savedChapter = data.readingState.chapterIndex || 0;
            if (savedChapter >= 0 && savedChapter < (edition.chapters?.length || 1)) {
              setActiveChapterIndex(savedChapter);
            }
          }
        }
      } catch (err) {
        console.warn('Could not load reading state:', err);
      } finally {
        if (isMounted) setReadingStateLoaded(true);
      }
    }
    loadProgress();
    return () => {
      isMounted = false;
    };
  }, [edition.editionId, edition.chapters?.length]);

  // 2. Save Reading State whenever chapterIndex changes (Independent per edition)
  const saveReadingProgress = async (newChapterIndex: number, paragraphId?: string) => {
    try {
      await fetch('/api/volume/library/reading-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          editionId: edition.editionId,
          chapterIndex: newChapterIndex,
          paragraphId,
        }),
      });
    } catch (err) {
      console.warn('Could not save reading progress:', err);
    }
  };

  const handleChapterChange = (newIndex: number) => {
    if (newIndex >= 0 && newIndex < edition.chapters.length) {
      setActiveChapterIndex(newIndex);
      saveReadingProgress(newIndex);
      setIsMobileMenuOpen(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // 3. In-Book Text Search Engine
  const searchResults: SearchMatch[] = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || q.length < 2) return [];

    const matches: SearchMatch[] = [];
    edition.chapters.forEach((chap, cIdx) => {
      const roman = getChapterRoman(chap, cIdx);
      const cleanTitle = getCleanChapterTitle(chap, roman);

      chap.paragraphs.forEach((p, pIdx) => {
        const text = p.text || '';
        const lower = text.toLowerCase();
        const foundPos = lower.indexOf(q);
        if (foundPos !== -1) {
          const start = Math.max(0, foundPos - 45);
          const end = Math.min(text.length, foundPos + q.length + 55);
          const snippet = (start > 0 ? '...' : '') + text.substring(start, end) + (end < text.length ? '...' : '');
          matches.push({
            chapterIndex: cIdx,
            chapterRoman: roman,
            chapterTitle: cleanTitle,
            paragraphIndex: pIdx,
            paragraphId: p.id || `p-${cIdx + 1}-${pIdx + 1}`,
            textSnippet: snippet,
          });
        }
      });
    });
    return matches;
  }, [searchQuery, edition.chapters]);

  const handleSelectSearchResult = (match: SearchMatch) => {
    setActiveChapterIndex(match.chapterIndex);
    saveReadingProgress(match.chapterIndex, match.paragraphId);
    setHighlightedParagraphId(match.paragraphId);
    setIsSearchOpen(false);

    // Scroll to paragraph after render
    setTimeout(() => {
      const el = paragraphRefs.current[match.paragraphId];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 200);

    // Clear highlight after 5 seconds
    setTimeout(() => {
      setHighlightedParagraphId(null);
    }, 5000);
  };

  const currentChapter = edition.chapters[activeChapterIndex] || edition.chapters[0];
  const currentRoman = getChapterRoman(currentChapter, activeChapterIndex);
  const currentTitle = getCleanChapterTitle(currentChapter, currentRoman);

  return (
    <div className="w-full flex flex-col font-sans select-none min-h-screen">
      {/* Top Floating Reader Navigation Bar */}
      <nav className="sticky top-0 z-30 w-full bg-[var(--color-canvas-linen)]/95 backdrop-blur-md border-b border-[var(--color-text-graphite)]/15 px-4 sm:px-8 py-3.5 transition-all">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          {/* Left: Back Breadcrumb */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBackToDetail}
              className="font-sans text-[11px] tracking-[0.16em] uppercase text-[var(--color-text-graphite)] hover:text-[var(--color-text-ink)] flex items-center gap-1.5 transition-colors focus:outline-none"
            >
              <span>&larr;</span>
              <span className="hidden sm:inline">Back to</span>
              <span>Details</span>
            </button>
            <span className="text-[var(--color-text-graphite)]/30">&bull;</span>
            <button
              type="button"
              onClick={onBackToBookshelf}
              className="font-sans text-[10px] tracking-wider uppercase text-[var(--color-text-graphite)]/60 hover:text-[var(--color-text-ink)] transition-colors hidden md:inline"
            >
              Bookshelf
            </button>
          </div>

          {/* Center: Book Title & Active Chapter */}
          <div className="text-center flex flex-col items-center max-w-[280px] sm:max-w-md truncate">
            <span className="font-serif text-sm sm:text-base font-medium text-[var(--color-text-ink)] truncate w-full">
              {edition.bookTitle}
            </span>
            <span className="font-sans text-[9px] tracking-widest uppercase text-[var(--color-accent-clay)]">
              Chapter {currentRoman} &bull; {currentTitle}
            </span>
          </div>

          {/* Right: Search Toggle, Edition Selector & Mobile Menu */}
          <div className="flex items-center gap-2">
            {/* In-Book Search Toggle Button */}
            <button
              type="button"
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className={`p-2 rounded-full border transition-colors flex items-center justify-center text-[var(--color-text-graphite)] hover:text-[var(--color-text-ink)] ${
                isSearchOpen || searchQuery
                  ? 'bg-[var(--color-canvas-stone)] border-[var(--color-accent-clay)] text-[var(--color-text-ink)]'
                  : 'border-[var(--color-text-graphite)]/20 hover:border-[var(--color-text-ink)]'
              }`}
              title="Search in this book"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
            </button>

            {/* Edition Switcher Dropdown (If multiple editions exist) */}
            {book.editions.length > 1 && (
              <div className="relative">
                <select
                  value={edition.editionId}
                  onChange={(e) => onSelectEdition(e.target.value)}
                  className="py-1 px-2.5 rounded-full bg-[var(--color-canvas-stone)] border border-[var(--color-text-graphite)]/20 font-sans text-[9px] tracking-widest uppercase text-[var(--color-text-ink)] hover:border-[var(--color-text-ink)] focus:outline-none cursor-pointer"
                  title="Switch preserved edition"
                >
                  {book.editions.map((ed) => (
                    <option key={ed.editionId} value={ed.editionId}>
                      Edition v{ed.version}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Mobile Chapter Navigation Toggle Button */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-full border border-[var(--color-text-graphite)]/20 text-[var(--color-text-graphite)] hover:text-[var(--color-text-ink)] transition-colors"
              title="Table of Contents"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Expandable In-Book Search Bar */}
        {isSearchOpen && (
          <div className="max-w-xl mx-auto mt-3 p-3.5 rounded-2xl bg-white/95 border border-[var(--color-accent-clay)]/40 shadow-xl flex flex-col gap-3 animate-[fadeIn_0.2s_ease-out]">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-[var(--color-accent-clay)] shrink-0 ml-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search words or phrases in this book..."
                autoFocus
                className="flex-1 bg-transparent border-none text-sm font-serif text-[var(--color-text-ink)] placeholder-[var(--color-text-graphite)]/50 focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-xs text-[var(--color-text-graphite)] hover:text-[var(--color-text-ink)] px-1"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsSearchOpen(false)}
                className="text-[10px] uppercase tracking-wider text-[var(--color-text-graphite)] hover:text-[var(--color-text-ink)] border border-[var(--color-text-graphite)]/20 rounded-full px-2.5 py-0.5"
              >
                Close
              </button>
            </div>

            {/* Search Match Results Drawer */}
            {searchQuery.trim().length >= 2 && (
              <div className="max-h-60 overflow-y-auto border-t border-[var(--color-text-graphite)]/10 pt-2 flex flex-col gap-2">
                <span className="font-sans text-[9px] tracking-widest uppercase text-[var(--color-text-graphite)]/70 px-1">
                  {searchResults.length} {searchResults.length === 1 ? 'match found' : 'matches found'}
                </span>
                {searchResults.length === 0 ? (
                  <p className="font-serif italic text-xs text-[var(--color-text-graphite)] py-3 text-center">
                    No passages found matching &ldquo;{searchQuery}&rdquo;.
                  </p>
                ) : (
                  searchResults.map((m, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleSelectSearchResult(m)}
                      className="p-2.5 rounded-xl hover:bg-[var(--color-canvas-stone)] cursor-pointer transition-colors flex flex-col gap-1 text-left"
                    >
                      <div className="flex items-center justify-between font-sans text-[9px] tracking-wider uppercase text-[var(--color-accent-clay)] font-semibold">
                        <span>Chapter {m.chapterRoman} &bull; {m.chapterTitle}</span>
                        <span className="text-[var(--color-text-graphite)]/50">Jump &rarr;</span>
                      </div>
                      <p className="font-serif text-xs text-[var(--color-text-ink)] leading-relaxed italic">
                        {m.textSnippet}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Main Reading Stage Layout (Desktop: Sidebar TOC + Centered Ivory Page) */}
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-8 py-8 sm:py-12 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Chapter Contents Panel (Desktop Only) */}
        <aside className="hidden lg:flex lg:col-span-3 flex-col sticky top-24 gap-4 p-5 rounded-2xl bg-white/50 border border-[var(--color-text-graphite)]/15">
          <div className="flex items-center justify-between border-b border-[var(--color-text-graphite)]/15 pb-2.5">
            <span className="font-sans text-[10px] tracking-[0.25em] uppercase text-[var(--color-text-graphite)] font-semibold">
              Contents
            </span>
            <span className="font-sans text-[9px] text-[var(--color-text-graphite)]/50">
              {edition.chapters.length} Chapters
            </span>
          </div>

          <nav className="flex flex-col gap-1">
            {edition.chapters.map((chap, idx) => {
              const isActive = activeChapterIndex === idx;
              const roman = getChapterRoman(chap, idx);
              const cleanTitle = getCleanChapterTitle(chap, roman);

              return (
                <button
                  key={chap.id}
                  type="button"
                  onClick={() => handleChapterChange(idx)}
                  className={`w-full text-left p-2.5 rounded-xl font-serif text-sm transition-all flex items-start gap-2.5 ${
                    isActive
                      ? 'bg-[var(--color-canvas-stone)] text-[var(--color-text-ink)] font-medium shadow-sm border border-[var(--color-accent-clay)]/30'
                      : 'text-[var(--color-text-graphite)] hover:text-[var(--color-text-ink)] hover:bg-white/60'
                  }`}
                >
                  <span className="font-sans text-[9px] tracking-wider uppercase font-semibold text-[var(--color-accent-clay)] shrink-0 mt-0.5">
                    {roman}
                  </span>
                  <span className="line-clamp-2 leading-snug">
                    {cleanTitle}
                  </span>
                </button>
              );
            })}
          </nav>

          <div className="pt-3 border-t border-[var(--color-text-graphite)]/10 flex flex-col gap-1 font-sans text-[9px] tracking-widest uppercase text-[var(--color-text-graphite)]/60">
            <span>Edition v{edition.version} Manuscript</span>
            <span>Immutable Archival Copy</span>
          </div>
        </aside>

        {/* Mobile Chapter Drawer (Toggled by header button) */}
        {isMobileMenuOpen && (
          <div className="lg:hidden col-span-1 p-5 rounded-2xl bg-white/95 border border-[var(--color-accent-clay)]/40 shadow-xl flex flex-col gap-3 mb-6 animate-[fadeIn_0.2s_ease-out]">
            <div className="flex items-center justify-between border-b border-[var(--color-text-graphite)]/15 pb-2">
              <span className="font-sans text-[10px] tracking-[0.25em] uppercase text-[var(--color-text-graphite)] font-semibold">
                Table of Contents
              </span>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="font-sans text-[9px] uppercase tracking-wider text-[var(--color-text-graphite)]"
              >
                Close
              </button>
            </div>
            <nav className="flex flex-col gap-1">
              {edition.chapters.map((chap, idx) => {
                const isActive = activeChapterIndex === idx;
                const roman = getChapterRoman(chap, idx);
                const cleanTitle = getCleanChapterTitle(chap, roman);

                return (
                  <button
                    key={chap.id}
                    type="button"
                    onClick={() => handleChapterChange(idx)}
                    className={`w-full text-left p-2 rounded-lg font-serif text-sm flex items-center justify-between ${
                      isActive
                        ? 'bg-[var(--color-canvas-stone)] text-[var(--color-text-ink)] font-medium'
                        : 'text-[var(--color-text-graphite)]'
                    }`}
                  >
                    <span>Chapter {roman}: {cleanTitle}</span>
                    {isActive && <span className="text-[10px] text-[var(--color-accent-clay)]">&bull; Reading</span>}
                  </button>
                );
              })}
            </nav>
          </div>
        )}

        {/* Right / Center: The Literary eBook Reading Surface */}
        <main className="lg:col-span-9 flex flex-col items-center">
          <article className="w-full max-w-2xl px-6 sm:px-12 py-10 sm:py-16 rounded-[28px] bg-white/70 border border-[var(--color-text-graphite)]/15 shadow-[0_12px_32px_-6px_rgba(44,37,35,0.08)] flex flex-col">
            {/* Chapter Header */}
            <header className="mb-12 text-center flex flex-col items-center">
              <span className="font-sans text-[10px] sm:text-[11px] tracking-[0.3em] uppercase text-[var(--color-accent-clay)] font-semibold mb-3">
                Chapter {currentRoman}
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl text-[var(--color-text-ink)] tracking-tight leading-snug">
                {currentTitle}
              </h2>

              {/* Literary Fleuron Accent */}
              <div className="flex items-center justify-center gap-3 mt-6 opacity-35 select-none">
                <span className="w-12 h-[1px] bg-[var(--color-text-graphite)]"></span>
                <span className="font-serif text-sm text-[var(--color-text-graphite)]">&#10086;</span>
                <span className="w-12 h-[1px] bg-[var(--color-text-graphite)]"></span>
              </div>
            </header>

            {/* Preserved Manuscript Prose (Strictly read-only, no editing controls) */}
            <div className="flex flex-col gap-6 sm:gap-7 font-serif text-[17px] sm:text-[19px] leading-[1.85] text-[var(--color-text-ink)] text-justify font-normal">
              {currentChapter.paragraphs.map((p, pIdx) => {
                const paragraphId = p.id || `p-${activeChapterIndex + 1}-${pIdx + 1}`;
                const isHighlighted = highlightedParagraphId === paragraphId;

                return (
                  <p
                    key={paragraphId}
                    ref={(el) => {
                      paragraphRefs.current[paragraphId] = el;
                    }}
                    className={`transition-all duration-700 rounded-lg p-1 -m-1 ${
                      isHighlighted
                        ? 'bg-[var(--color-accent-clay)]/15 ring-2 ring-[var(--color-accent-clay)]/50'
                        : ''
                    }`}
                  >
                    {p.text}
                  </p>
                );
              })}
            </div>

            {/* Chapter Turn Navigation (Previous & Next Chapter) */}
            <div className="mt-16 pt-8 border-t border-[var(--color-text-graphite)]/15 flex items-center justify-between">
              {activeChapterIndex > 0 ? (
                <button
                  type="button"
                  onClick={() => handleChapterChange(activeChapterIndex - 1)}
                  className="font-sans text-[10px] tracking-[0.16em] uppercase text-[var(--color-text-graphite)] hover:text-[var(--color-text-ink)] flex items-center gap-2 transition-colors py-2 px-3 rounded-full hover:bg-[var(--color-canvas-stone)]"
                >
                  <span>&larr;</span>
                  <span>Previous Chapter</span>
                </button>
              ) : (
                <div />
              )}

              <span className="font-sans text-[9px] tracking-widest uppercase text-[var(--color-text-graphite)]/40">
                {activeChapterIndex + 1} of {edition.chapters.length}
              </span>

              {activeChapterIndex < edition.chapters.length - 1 ? (
                <button
                  type="button"
                  onClick={() => handleChapterChange(activeChapterIndex + 1)}
                  className="font-sans text-[10px] tracking-[0.16em] uppercase text-[var(--color-text-graphite)] hover:text-[var(--color-text-ink)] flex items-center gap-2 transition-colors py-2 px-3 rounded-full hover:bg-[var(--color-canvas-stone)]"
                >
                  <span>Next Chapter</span>
                  <span>&rarr;</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onBackToDetail}
                  className="font-sans text-[10px] tracking-[0.16em] uppercase text-[var(--color-accent-clay)] hover:text-[var(--color-text-ink)] font-semibold transition-colors py-2 px-3 rounded-full hover:bg-[var(--color-canvas-stone)]"
                >
                  <span>Conclusion &bull; Return to Book</span>
                </button>
              )}
            </div>

            {/* Sealed Vault Archival Provenance Footer */}
            <footer className="mt-12 text-center flex flex-col items-center gap-1 text-[var(--color-text-graphite)]/50 font-sans text-[9px] tracking-widest uppercase">
              <span>Altheara Private Preservation Standard &bull; Vault Sealed Edition v{edition.version}</span>
              <span>Reading progress securely preserved</span>
            </footer>
          </article>
        </main>
      </div>
    </div>
  );
}
