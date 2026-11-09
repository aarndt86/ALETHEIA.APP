"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PreservedBook, PreservedVolumeEdition, ANNUAL_LINEN_DESIGNS } from '@/lib/volumeData';

interface BookDetailViewProps {
  book: PreservedBook;
  selectedEdition: PreservedVolumeEdition;
  onSelectEdition: (editionId: string) => void;
  onOpenReader: () => void;
  onOpenRecordedPresence: () => void;
  onBackToBookshelf: () => void;
}

export default function BookDetailView({
  book,
  selectedEdition,
  onSelectEdition,
  onOpenReader,
  onOpenRecordedPresence,
  onBackToBookshelf,
}: BookDetailViewProps) {
  const router = useRouter();
  const [showNewEditionModal, setShowNewEditionModal] = useState(false);

  // Derive cover styling corresponding to this specific selected edition
  const isSignatureLinen = Boolean(selectedEdition.preservationFormats?.signatureLinen?.configured);
  const linenTitle = selectedEdition.preservationFormats?.signatureLinen?.customizedTitle;
  const annualDesign = ANNUAL_LINEN_DESIGNS[book.year || 2025] || ANNUAL_LINEN_DESIGNS[2025];

  const coverBaseColor = isSignatureLinen
    ? annualDesign.baseColor
    : book.cover.baseColor || '#8B5A42';
  const coverSpineFoil = isSignatureLinen
    ? annualDesign.spineFoilColor
    : book.cover.spineFoilColor || '#3B3128';

  const formattedPreservedDate = new Date(selectedEdition.preservedAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="w-full flex flex-col gap-10 animate-[fadeIn_0.3s_ease-out_forwards]">
      {/* Top Folio Breadcrumb Bar */}
      <div className="flex items-center justify-between pb-6 border-b border-[var(--color-text-graphite)]/15">
        <button
          type="button"
          onClick={onBackToBookshelf}
          className="font-sans text-[11px] tracking-[0.16em] uppercase text-[var(--color-text-graphite)] hover:text-[var(--color-text-ink)] flex items-center gap-2 transition-colors focus:outline-none"
        >
          <span>&larr;</span>
          <span>Back to Library Bookshelf</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="py-1 px-3 rounded-full bg-[var(--color-canvas-stone)] border border-[var(--color-text-graphite)]/15 font-sans text-[9px] tracking-widest uppercase text-[var(--color-text-graphite)]">
            Edition v{selectedEdition.version} &bull; Sealed
          </span>
        </div>
      </div>

      {/* Main Book Detail Canvas */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-10 lg:gap-14 items-start">
        {/* Left Column: Hand-Bound Tactile Book Cover */}
        <div className="md:col-span-5 lg:col-span-4 flex flex-col items-center">
          <div
            className="relative w-full max-w-[270px] aspect-[3/4.2] rounded-[4px] p-6 flex flex-col justify-between overflow-hidden select-none border border-black/10 shadow-[0_18px_38px_-8px_rgba(44,37,35,0.24),0_6px_14px_-2px_rgba(44,37,35,0.12)] transition-transform duration-500 hover:scale-[1.01]"
            style={{ backgroundColor: coverBaseColor }}
          >
            {/* Subtle Linen Weave Texture Simulation */}
            <div
              className="absolute inset-0 pointer-events-none opacity-25 mix-blend-overlay"
              style={{
                backgroundImage:
                  'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%223%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/%3E%3C/svg%3E")',
              }}
            />

            {/* Hardcover Joint Crease / Gutter */}
            <div className="absolute top-0 bottom-0 left-5 w-[1px] bg-white/25 shadow-[1px_0_1px_rgba(0,0,0,0.3)] pointer-events-none" />
            <div className="absolute top-0 bottom-0 left-0 w-5 bg-gradient-to-r from-black/25 via-black/10 to-transparent pointer-events-none" />

            {/* Signature Linen Espresso Bronze Foil Spine Band */}
            {isSignatureLinen && (
              <div
                className="absolute top-0 bottom-0 left-0 w-9 border-r border-[#3B3128]/30 shadow-md flex flex-col justify-between py-6 items-center pointer-events-none"
                style={{ backgroundColor: coverSpineFoil }}
              >
                <span className="font-sans text-[7px] tracking-[0.25em] text-[#E8E2D9]/80 uppercase -rotate-90 origin-center whitespace-nowrap mt-4">
                  ALTHEARA
                </span>
                <span className="font-serif text-[8px] text-[#E8E2D9]/70 -rotate-90 origin-center whitespace-nowrap mb-4">
                  {book.year}
                </span>
              </div>
            )}

            {/* Cover Top: Volume designation */}
            <div className={`relative z-10 ${isSignatureLinen ? 'pl-8' : 'pl-3'}`}>
              <span
                className={`font-sans text-[8px] sm:text-[9px] tracking-[0.28em] uppercase block font-medium ${
                  isSignatureLinen ? 'text-[#3B3128]/80' : 'text-white/80'
                }`}
              >
                {book.year ? `Volume ${book.year}` : 'Life Book'}
              </span>
            </div>

            {/* Cover Center: Debossed Motif and Title */}
            <div
              className={`relative z-10 flex flex-col items-center text-center my-auto px-2 ${
                isSignatureLinen ? 'pl-8' : 'pl-3'
              }`}
            >
              {/* Debossed Botanical Filigree Accent */}
              <div className="mb-3 opacity-60">
                <svg
                  className={`w-8 h-8 ${isSignatureLinen ? 'text-[#3B3128]' : 'text-white'}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                >
                  <path d="M12 2L12 22" strokeLinecap="round" />
                  <path d="M12 7C9.5 5 6 6 5 8C6 11 9.5 10 12 10" />
                  <path d="M12 14C14.5 12 18 13 19 15C18 18 14.5 17 12 17" />
                  <circle cx="12" cy="7" r="1" fill="currentColor" />
                  <circle cx="12" cy="14" r="1" fill="currentColor" />
                </svg>
              </div>

              {/* Title Foil Stamp on Cover */}
              <h2
                className={`font-serif text-base sm:text-lg font-medium leading-tight tracking-tight max-w-[170px] ${
                  isSignatureLinen ? 'text-[#2A231D]' : 'text-white'
                }`}
              >
                {linenTitle || selectedEdition.bookTitle}
              </h2>

              {selectedEdition.subtitle && (
                <p
                  className={`font-serif italic text-[10px] mt-1.5 line-clamp-1 max-w-[150px] opacity-75 ${
                    isSignatureLinen ? 'text-[#3B3128]' : 'text-white'
                  }`}
                >
                  {selectedEdition.subtitle}
                </p>
              )}
            </div>

            {/* Cover Bottom */}
            <div
              className={`relative z-10 flex items-center justify-between border-t pt-2.5 ${
                isSignatureLinen
                  ? 'pl-8 border-[#3B3128]/20 text-[#3B3128]/70'
                  : 'pl-3 border-white/20 text-white/70'
              }`}
            >
              <span className="font-sans text-[7px] tracking-[0.2em] uppercase">
                {selectedEdition.authorName}
              </span>
              <span className="font-sans text-[7px] tracking-[0.2em] uppercase">
                Vault
              </span>
            </div>
          </div>

          {/* Discreet Archival Fingerprint */}
          <span className="font-sans text-[9px] tracking-widest uppercase text-[var(--color-text-graphite)]/50 mt-4 text-center">
            Vault ID: {selectedEdition.editionId}
          </span>
        </div>

        {/* Right Column: Book Metadata & Three Primary Choices */}
        <div className="md:col-span-7 lg:col-span-8 flex flex-col justify-between">
          <div className="flex flex-col gap-6">
            {/* Year & Book Type */}
            <div className="flex items-center gap-3">
              <span className="font-sans text-[10px] tracking-[0.28em] uppercase text-[var(--color-accent-clay)] font-semibold">
                {book.year ? `Annual Volume \u2022 ${book.year}` : 'Preserved Life Book'}
              </span>
              <span className="text-[var(--color-text-graphite)]/30">&bull;</span>
              <span className="font-sans text-[10px] tracking-wider uppercase text-[var(--color-text-graphite)]/70">
                Preserved {formattedPreservedDate}
              </span>
            </div>

            {/* Manuscript Title & Subtitle */}
            <div>
              <h1 className="font-serif text-3xl sm:text-4xl text-[var(--color-text-ink)] tracking-tight">
                {selectedEdition.bookTitle}
              </h1>
              {selectedEdition.subtitle && (
                <p className="font-serif italic text-lg sm:text-xl text-[var(--color-text-graphite)]/85 mt-2">
                  {selectedEdition.subtitle}
                </p>
              )}

              {/* Title Association Clarity Note */}
              {linenTitle && linenTitle !== selectedEdition.bookTitle && (
                <div className="mt-3 inline-flex items-center gap-2 py-1 px-3 rounded-full bg-[var(--color-canvas-stone)] border border-[var(--color-text-graphite)]/15 text-[10px] font-sans text-[var(--color-text-graphite)]">
                  <span className="uppercase tracking-wider font-semibold text-[var(--color-accent-clay)]">
                    Signature Linen Cover Foil:
                  </span>
                  <span>&ldquo;{linenTitle}&rdquo;</span>
                </div>
              )}
            </div>

            {/* Author & Literary Dimensions */}
            <div className="flex flex-wrap items-center gap-4 py-3 border-y border-[var(--color-text-graphite)]/15 font-sans text-[11px] text-[var(--color-text-graphite)]">
              <span>Author: <strong className="text-[var(--color-text-ink)] font-medium">{selectedEdition.authorName}</strong></span>
              <span>&bull;</span>
              <span>{selectedEdition.totalChapters} Chapters</span>
              <span>&bull;</span>
              <span>~{selectedEdition.totalWords.toLocaleString()} Words</span>
              <span>&bull;</span>
              <span>Reading Time: ~{Math.max(1, Math.round(selectedEdition.totalWords / 200))} min</span>
            </div>

            {/* Preserved Editions Version Selector (Brief Section 6) */}
            {book.editions.length > 1 && (
              <div className="flex flex-col gap-2 p-4 rounded-2xl bg-[var(--color-canvas-stone)]/40 border border-[var(--color-text-graphite)]/15">
                <div className="flex items-center justify-between">
                  <span className="font-sans text-[10px] tracking-[0.2em] uppercase text-[var(--color-text-graphite)] font-semibold">
                    Preserved Editions ({book.editions.length})
                  </span>
                  <span className="font-sans text-[9px] text-[var(--color-text-graphite)]/60">
                    Each version is an immutable snapshot
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 mt-1">
                  {book.editions.map((ed) => {
                    const isSelected = ed.editionId === selectedEdition.editionId;
                    const dateStr = new Date(ed.preservedAt).toLocaleDateString(undefined, {
                      month: 'short',
                      year: 'numeric',
                    });

                    return (
                      <button
                        key={ed.editionId}
                        type="button"
                        onClick={() => onSelectEdition(ed.editionId)}
                        className={`py-1.5 px-3 rounded-lg font-sans text-[10px] tracking-wider uppercase transition-all flex items-center gap-2 ${
                          isSelected
                            ? 'bg-[var(--color-text-ink)] text-[var(--color-canvas-linen)] font-medium shadow-sm'
                            : 'bg-white/70 text-[var(--color-text-graphite)] hover:text-[var(--color-text-ink)] hover:bg-white border border-[var(--color-text-graphite)]/15'
                        }`}
                      >
                        <span>Edition v{ed.version}</span>
                        <span className={`text-[8px] ${isSelected ? 'text-white/70' : 'text-[var(--color-text-graphite)]/50'}`}>
                          &bull; {dateStr}
                        </span>
                        {ed.hasAuthenticRecording && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent-clay)]" title="Recording attached"></span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* THE THREE PRIMARY CHOICES (Brief Section 5)                   */}
            {/* 1. Read My Book                                              */}
            {/* 2. Experience Recorded Presence                              */}
            {/* 3. My Physical Editions                                      */}
            {/* ============================================================ */}
            <div className="flex flex-col gap-3.5 mt-2">
              {/* Choice 1: Read My Book (Active in Phase C) */}
              <div
                onClick={onOpenReader}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') onOpenReader();
                }}
                className="group cursor-pointer p-5 sm:p-6 rounded-2xl bg-[var(--color-text-ink)] hover:bg-[var(--color-text-ink)]/90 text-[var(--color-canvas-linen)] transition-all duration-300 flex items-center justify-between shadow-md active:scale-[0.99]"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-serif text-xl sm:text-2xl font-medium tracking-tight text-[var(--color-canvas-linen)]">
                      Read My Book
                    </span>
                    <span className="py-0.5 px-2 rounded-full bg-white/20 font-sans text-[8px] tracking-widest uppercase font-semibold text-white/90">
                      eBook Reader
                    </span>
                  </div>
                  <span className="font-serif italic text-xs text-[var(--color-canvas-linen)]/75">
                    Open the complete preserved manuscript and resume where you left off.
                  </span>
                </div>
                <span className="font-sans text-xs tracking-widest uppercase text-white/80 group-hover:translate-x-1 transition-transform ml-4 shrink-0">
                  Read &rarr;
                </span>
              </div>

              {/* Choice 2: Experience Recorded Presence (Active in Phase D) */}
              <div
                onClick={onOpenRecordedPresence}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') onOpenRecordedPresence();
                }}
                className={`group cursor-pointer p-5 sm:p-6 rounded-2xl transition-all duration-300 flex items-center justify-between border shadow-sm active:scale-[0.99] ${
                  selectedEdition.authenticRecording
                    ? 'bg-white/85 hover:bg-white border-[var(--color-text-graphite)]/20 hover:border-[var(--color-accent-clay)]/40 hover:shadow-md'
                    : 'bg-white/50 hover:bg-white/70 border-[var(--color-text-graphite)]/15'
                }`}
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-serif text-xl sm:text-2xl font-medium tracking-tight text-[var(--color-text-ink)]">
                      Experience Recorded Presence
                    </span>
                    <span
                      className={`py-0.5 px-2 rounded-full font-sans text-[8px] tracking-widest uppercase font-semibold ${
                        selectedEdition.authenticRecording
                          ? 'bg-[var(--color-accent-clay)]/15 text-[var(--color-accent-clay)]'
                          : 'bg-[var(--color-canvas-stone)] border border-[var(--color-text-graphite)]/20 text-[var(--color-text-graphite)]'
                      }`}
                    >
                      {selectedEdition.authenticRecording
                        ? selectedEdition.authenticRecording.mediaType === 'video'
                          ? 'Video Message'
                          : 'Voice Take'
                        : 'No Recording'}
                    </span>
                  </div>
                  <span className="font-serif italic text-xs text-[var(--color-text-graphite)]/80">
                    {selectedEdition.authenticRecording
                      ? `Authentic ${
                          selectedEdition.authenticRecording.mediaType === 'video' ? 'video take' : 'voice take'
                        } (${selectedEdition.authenticRecording.durationSeconds}s) preserved with this book.`
                      : 'This edition does not include a voice or video recording.'}
                  </span>
                </div>
                <span className="font-sans text-xs tracking-widest uppercase text-[var(--color-accent-clay)] group-hover:translate-x-1 transition-transform ml-4 shrink-0 font-medium">
                  {selectedEdition.authenticRecording ? 'Listen \u2192' : 'View Status \u2192'}
                </span>
              </div>

              {/* Choice 3: My Physical Editions (Upcoming in Phase E) */}
              <div className="p-5 sm:p-6 rounded-2xl bg-white/60 border border-[var(--color-text-graphite)]/15 flex items-center justify-between opacity-90">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-serif text-xl sm:text-2xl font-medium tracking-tight text-[var(--color-text-ink)]">
                      My Physical Editions
                    </span>
                    <span className="py-0.5 px-2 rounded-full bg-[var(--color-canvas-stone)] border border-[var(--color-text-graphite)]/20 font-sans text-[8px] tracking-widest uppercase text-[var(--color-text-graphite)]">
                      Phase E
                    </span>
                  </div>
                  <span className="font-serif italic text-xs text-[var(--color-text-graphite)]/80">
                    Revisit previously ordered physical copies and verified production specifications.
                  </span>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <span className="font-sans text-[10px] tracking-wider uppercase text-[var(--color-text-graphite)]/60 font-medium">
                    0 Orders
                  </span>
                </div>
              </div>
            </div>

            {/* Secondary Action: Create a New Edition (Brief Section 9) */}
            <div className="pt-4 border-t border-[var(--color-text-graphite)]/10 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="font-sans text-[9px] tracking-widest uppercase text-[var(--color-text-graphite)]/60">
                  Manuscript Revisions
                </span>
                <span className="font-serif italic text-xs text-[var(--color-text-graphite)]/75">
                  Want to refine your story or add new memories?
                </span>
              </div>

              <button
                type="button"
                onClick={() => setShowNewEditionModal(true)}
                className="py-1.5 px-4 rounded-full border border-[var(--color-text-graphite)]/25 text-[var(--color-text-graphite)] hover:text-[var(--color-text-ink)] hover:border-[var(--color-text-ink)] font-sans text-[10px] tracking-[0.14em] uppercase transition-colors"
              >
                Create a New Edition &rarr;
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Safe Editor Handoff Modal (Architectural Safeguard 3) */}
      {showNewEditionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="w-full max-w-md p-6 sm:p-8 rounded-3xl bg-[#F7F5F0] border border-[var(--color-text-graphite)]/20 shadow-2xl flex flex-col gap-5 text-center">
            <span className="font-sans text-[9px] tracking-[0.25em] uppercase text-[var(--color-accent-clay)] font-semibold">
              Archival Protection &bull; Handoff
            </span>
            <h3 className="font-serif text-2xl text-[var(--color-text-ink)]">
              Create a New Edition
            </h3>
            <p className="font-serif italic text-sm text-[var(--color-text-graphite)] leading-relaxed">
              Opening the Volume Editor creates a <strong>separate, editable working draft</strong> cloned from this volume.
            </p>
            <p className="font-serif text-xs text-[var(--color-text-graphite)]/80 leading-relaxed border-t border-[var(--color-text-graphite)]/15 pt-3">
              Your preserved Library editions (v1, v2, v3) will remain <strong>completely untouched and immutable</strong> in the vault. A new version is sealed only when you explicitly finish preservation again.
            </p>

            <div className="flex items-center justify-center gap-3 mt-2">
              <button
                type="button"
                onClick={() => setShowNewEditionModal(false)}
                className="py-2 px-5 rounded-full border border-[var(--color-text-graphite)]/25 text-[var(--color-text-graphite)] hover:text-[var(--color-text-ink)] font-sans text-[10px] tracking-wider uppercase transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowNewEditionModal(false);
                  router.push(`/profile/volume-editor/editor?volumeId=${book.bookId}`);
                }}
                className="py-2 px-5 rounded-full bg-[var(--color-text-ink)] text-[var(--color-canvas-linen)] font-sans text-[10px] tracking-wider uppercase hover:bg-[var(--color-text-ink)]/90 transition-colors"
              >
                Open Volume Editor &rarr;
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
