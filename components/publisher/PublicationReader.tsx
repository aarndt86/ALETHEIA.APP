'use client';

import React, { useState, useEffect } from 'react';
import { PreservedPublicationEdition } from '@/lib/publishingData';

interface PublicationReaderProps {
  publicationId: string;
  initialEditionId?: string;
  onBackToLibrary: () => void;
}

export function PublicationReader({
  publicationId,
  initialEditionId,
  onBackToLibrary
}: PublicationReaderProps) {
  const [editions, setEditions] = useState<PreservedPublicationEdition[]>([]);
  const [selectedEditionId, setSelectedEditionId] = useState<string | null>(initialEditionId || null);
  const [currentEdition, setCurrentEdition] = useState<PreservedPublicationEdition | null>(null);
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const [isTocOpen, setIsTocOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch all preserved editions for this publication
  useEffect(() => {
    let isMounted = true;
    async function loadEditions() {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        const res = await fetch(`/api/volume/publishing/edition?publicationId=${encodeURIComponent(publicationId)}`);
        if (!res.ok) {
          throw new Error('Failed to load preserved publication editions from vault.');
        }

        const data = await res.json();
        if (isMounted) {
          const list: PreservedPublicationEdition[] = data.editions || [];
          setEditions(list);

          if (list.length > 0) {
            const target = selectedEditionId
              ? list.find(e => e.publicationEditionId === selectedEditionId) || list[0]
              : list[0];
            setSelectedEditionId(target.publicationEditionId);
            setCurrentEdition(target);
          } else {
            setErrorMessage('No preserved editions found for this publication.');
          }
        }
      } catch (err: unknown) {
        if (isMounted) {
          setErrorMessage(err instanceof Error ? err.message : 'Error reading publication edition.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadEditions();

    return () => {
      isMounted = false;
    };
  }, [publicationId, selectedEditionId]);

  const handleSelectEdition = (editionId: string) => {
    const target = editions.find(e => e.publicationEditionId === editionId);
    if (target) {
      setSelectedEditionId(editionId);
      setCurrentEdition(target);
      setActiveChapterIndex(0);
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen w-full bg-[var(--color-canvas-linen)] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-10 h-10 rounded-full border-2 border-[var(--color-accent-clay)] border-t-transparent animate-spin mb-4"></div>
        <h2 className="font-serif text-lg text-[var(--color-text-ink)] font-normal">
          Opening Preserved Edition...
        </h2>
        <span className="font-sans text-[10px] tracking-[0.2em] uppercase text-[var(--color-text-graphite)]/60 mt-1">
          Altheara Vault Reader &bull; Read-Only Protection
        </span>
      </main>
    );
  }

  if (errorMessage || !currentEdition) {
    return (
      <main className="min-h-screen w-full bg-[var(--color-canvas-linen)] flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md p-8 rounded-2xl bg-white/80 border border-red-200 shadow-sm flex flex-col items-center gap-4">
          <span className="font-sans text-[10px] tracking-[0.25em] uppercase text-red-700 font-semibold">
            Publication Access Notice
          </span>
          <p className="font-serif text-base text-[var(--color-text-ink)] leading-relaxed">
            {errorMessage || 'Preserved publication could not be loaded.'}
          </p>
          <button
            type="button"
            onClick={onBackToLibrary}
            className="mt-2 py-2.5 px-6 rounded-full bg-[var(--color-text-ink)] text-[var(--color-canvas-linen)] font-sans text-xs tracking-[0.16em] uppercase hover:bg-[var(--color-text-ink)]/90 transition-all focus:outline-none"
          >
            &larr; Return to My Publications
          </button>
        </div>
      </main>
    );
  }

  const chapters = currentEdition.chapters || [];
  const activeChapter = chapters[activeChapterIndex] || chapters[0];

  return (
    <div className="min-h-screen w-full bg-[var(--color-canvas-linen)] text-[var(--color-text-ink)] flex flex-col selection:bg-[var(--color-canvas-stone)]">
      {/* Top Archival Reader Bar */}
      <header className="sticky top-0 z-30 w-full bg-[var(--color-canvas-linen)]/95 backdrop-blur-md border-b border-[var(--color-text-graphite)]/15 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        {/* Left: Return to My Publications */}
        <button
          type="button"
          onClick={onBackToLibrary}
          className="group flex items-center gap-2 font-sans text-[11px] tracking-[0.18em] uppercase text-[var(--color-text-graphite)] hover:text-[var(--color-text-ink)] transition-colors focus:outline-none shrink-0"
        >
          <span className="group-hover:-translate-x-1 transition-transform duration-200">&larr;</span>
          <span>My Publications</span>
        </button>

        {/* Center: Publication Title & Sealed Version */}
        <div className="hidden md:flex flex-col items-center text-center max-w-md truncate px-4">
          <span className="font-serif text-sm font-medium text-[var(--color-text-ink)] truncate">
            {currentEdition.bookTitle}
          </span>
          <span className="font-sans text-[9px] tracking-[0.2em] uppercase text-[var(--color-accent-clay)]">
            Preserved Edition v{currentEdition.version} &bull; Read-Only
          </span>
        </div>

        {/* Right: Version Selector & TOC Toggle */}
        <div className="flex items-center gap-3">
          {editions.length > 1 && (
            <div className="flex items-center gap-1.5 font-sans text-xs">
              <label htmlFor="reader-version-select" className="text-[10px] uppercase tracking-wider text-[var(--color-text-graphite)]/70 hidden sm:inline">
                Version:
              </label>
              <select
                id="reader-version-select"
                value={currentEdition.publicationEditionId}
                onChange={(e) => handleSelectEdition(e.target.value)}
                className="py-1 px-2.5 rounded-full bg-white border border-[var(--color-text-graphite)]/20 text-xs font-serif text-[var(--color-text-ink)] focus:outline-none focus:border-[var(--color-accent-clay)]"
              >
                {editions.map(ed => (
                  <option key={ed.publicationEditionId} value={ed.publicationEditionId}>
                    Edition v{ed.version} ({new Date(ed.preservedAt).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsTocOpen(!isTocOpen)}
            className="py-1.5 px-3.5 rounded-full border border-[var(--color-text-graphite)]/25 hover:border-[var(--color-text-ink)] text-[var(--color-text-ink)] font-sans text-[10px] tracking-[0.16em] uppercase transition-colors focus:outline-none"
          >
            {isTocOpen ? 'Close Index' : 'Chapters'}
          </button>
        </div>
      </header>

      {/* Main Reader Layout */}
      <div className="w-full flex-1 max-w-4xl mx-auto px-4 sm:px-8 py-8 md:py-14 flex flex-col gap-10">
        {/* Book Titleplate Header */}
        <div className="w-full pb-8 border-b border-[var(--color-text-graphite)]/15 flex flex-col items-center text-center gap-4">
          {/* Decoupled Artwork Plate Thumbnail */}
          {currentEdition.bookstoreImage?.storagePath && (
            <div className="w-24 sm:w-28 aspect-[3/4] rounded-md overflow-hidden shadow-md border border-[var(--color-text-graphite)]/20 bg-[var(--color-canvas-stone)] shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentEdition.bookstoreImage.storagePath}
                alt={currentEdition.bookTitle}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5 max-w-xl">
            <span className="font-sans text-[10px] tracking-[0.25em] uppercase text-[var(--color-accent-clay)] font-semibold">
              Preserved Public Edition
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl text-[var(--color-text-ink)] font-normal tracking-tight">
              {currentEdition.bookTitle}
            </h1>
            {currentEdition.subtitle && (
              <p className="font-serif italic text-base text-[var(--color-text-graphite)]">
                {currentEdition.subtitle}
              </p>
            )}
            <span className="font-sans text-xs tracking-[0.2em] uppercase text-[var(--color-text-ink)] font-medium mt-1">
              by {currentEdition.authorDisplayName}
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 text-[10px] font-sans text-[var(--color-text-graphite)]/80 pt-2">
            <span>Derived from Volume {currentEdition.sourceVolumeId}</span>
            <span>&bull;</span>
            <span>{currentEdition.totalWordCount.toLocaleString()} words</span>
            <span>&bull;</span>
            <span>{currentEdition.chapterCount} chapters</span>
            <span>&bull;</span>
            <span className="font-mono text-[9px] text-[var(--color-text-graphite)]/60">
              SHA-256: {currentEdition.contentHash.slice(0, 12)}...
            </span>
          </div>
        </div>

        {/* Chapter TOC Drawer (when toggled) */}
        {isTocOpen && (
          <aside className="w-full p-6 rounded-2xl bg-white/90 border border-[var(--color-text-graphite)]/15 shadow-sm flex flex-col gap-4 animate-[fadeIn_0.2s_ease-out]">
            <div className="flex items-center justify-between border-b border-[var(--color-text-graphite)]/10 pb-2">
              <span className="font-sans text-[10px] tracking-[0.2em] uppercase text-[var(--color-accent-clay)] font-semibold">
                Table of Contents
              </span>
              <span className="font-sans text-[10px] text-[var(--color-text-graphite)]/60">
                {chapters.length} Chapters Preserved
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
              {chapters.map((chap, idx) => (
                <button
                  key={chap.id || chap.number}
                  type="button"
                  onClick={() => {
                    setActiveChapterIndex(idx);
                    setIsTocOpen(false);
                    window.scrollTo({ top: 300, behavior: 'smooth' });
                  }}
                  className={`text-left p-3 rounded-lg border transition-all text-xs font-serif ${
                    activeChapterIndex === idx
                      ? 'bg-[var(--color-canvas-stone)] border-[var(--color-accent-clay)] text-[var(--color-text-ink)] font-medium'
                      : 'bg-transparent border-transparent hover:bg-[var(--color-canvas-stone)]/40 text-[var(--color-text-graphite)] hover:text-[var(--color-text-ink)]'
                  }`}
                >
                  <span className="font-sans text-[9px] uppercase tracking-wider block text-[var(--color-accent-clay)]">
                    Chapter {chap.number}
                  </span>
                  <span className="truncate block">{chap.title}</span>
                </button>
              ))}
            </div>
          </aside>
        )}

        {/* Current Chapter Content */}
        {activeChapter ? (
          <article className="w-full flex flex-col gap-6 max-w-2xl mx-auto">
            {/* Chapter Header */}
            <div className="flex flex-col items-center text-center gap-1.5 pb-4 border-b border-[var(--color-text-graphite)]/10">
              <span className="font-sans text-[10px] tracking-[0.25em] uppercase text-[var(--color-accent-clay)] font-semibold">
                Chapter {activeChapter.number} of {chapters.length}
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl text-[var(--color-text-ink)] font-normal">
                {activeChapter.title}
              </h2>
            </div>

            {/* Paragraphs */}
            <div className="flex flex-col gap-5 text-base sm:text-lg font-serif text-[var(--color-text-ink)]/90 leading-relaxed sm:leading-loose">
              {(activeChapter.paragraphs || []).map((p) => (
                <p key={p.id} className="indent-6 sm:indent-8 first:indent-0 text-justify hyphens-auto">
                  {p.text}
                </p>
              ))}
            </div>

            {/* Chapter Pagination Actions */}
            <div className="w-full flex items-center justify-between pt-8 border-t border-[var(--color-text-graphite)]/15 mt-6 font-sans text-xs">
              <button
                type="button"
                disabled={activeChapterIndex === 0}
                onClick={() => {
                  setActiveChapterIndex(prev => Math.max(0, prev - 1));
                  window.scrollTo({ top: 300, behavior: 'smooth' });
                }}
                className="py-2 px-4 rounded-full border border-[var(--color-text-graphite)]/20 hover:border-[var(--color-text-ink)] disabled:opacity-30 disabled:pointer-events-none uppercase tracking-wider"
              >
                &larr; Previous Chapter
              </button>

              <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-graphite)]/60">
                {activeChapterIndex + 1} / {chapters.length}
              </span>

              <button
                type="button"
                disabled={activeChapterIndex >= chapters.length - 1}
                onClick={() => {
                  setActiveChapterIndex(prev => Math.min(chapters.length - 1, prev + 1));
                  window.scrollTo({ top: 300, behavior: 'smooth' });
                }}
                className="py-2 px-4 rounded-full border border-[var(--color-text-graphite)]/20 hover:border-[var(--color-text-ink)] disabled:opacity-30 disabled:pointer-events-none uppercase tracking-wider"
              >
                Next Chapter &rarr;
              </button>
            </div>
          </article>
        ) : (
          <div className="w-full text-center p-8 text-xs font-serif italic text-[var(--color-text-graphite)]">
            No chapter content in this preserved edition.
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="w-full py-6 border-t border-[var(--color-text-graphite)]/15 text-center font-sans text-[10px] uppercase tracking-[0.2em] text-[var(--color-text-graphite)]/60">
        Altheara Vault &bull; Immutable Preserved Publication Edition
      </footer>
    </div>
  );
}
