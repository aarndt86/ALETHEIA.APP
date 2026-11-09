"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  PreservedBook,
  PreservedVolumeEdition,
  ANNUAL_LINEN_DESIGNS,
} from '@/lib/volumeData';

interface WatchMyBookViewProps {
  book: PreservedBook;
  selectedEdition: PreservedVolumeEdition;
  onSelectEdition: (editionId: string) => void;
  onOpenReader: () => void;
  onBackToDetail: () => void;
  onBackToBookshelf: () => void;
}

export default function WatchMyBookView({
  book,
  selectedEdition,
  onSelectEdition,
  onOpenReader,
  onBackToDetail,
  onBackToBookshelf,
}: WatchMyBookViewProps) {
  const router = useRouter();
  const [showNewEditionModal, setShowNewEditionModal] = useState(false);

  const rec = selectedEdition.authenticRecording;
  const isVideo = rec && rec.mediaType === 'video';

  // Tactile cover styling
  const isSignatureLinen = Boolean(
    selectedEdition.preservationFormats?.signatureLinen?.configured
  );
  const linenTitle =
    selectedEdition.preservationFormats?.signatureLinen?.customizedTitle;
  const annualDesign =
    ANNUAL_LINEN_DESIGNS[book.year || 2025] || ANNUAL_LINEN_DESIGNS[2025];
  const coverBaseColor = isSignatureLinen
    ? annualDesign.baseColor
    : book.cover.baseColor || '#8B5A42';
  const coverSpineFoil = isSignatureLinen
    ? annualDesign.spineFoilColor
    : book.cover.spineFoilColor || '#3B3128';

  const formattedPreservedDate = new Date(
    selectedEdition.preservedAt
  ).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="w-full flex flex-col gap-8 sm:gap-12 animate-[fadeIn_0.3s_ease-out_forwards]">
      {/* Top Folio Breadcrumb Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-[var(--color-text-graphite)]/15">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToDetail}
            className="font-sans text-[11px] tracking-[0.16em] uppercase text-[var(--color-text-graphite)] hover:text-[var(--color-text-ink)] flex items-center gap-2 transition-colors focus:outline-none"
          >
            <span>&larr;</span>
            <span>Return to Book Details</span>
          </button>
          <span className="text-[var(--color-text-graphite)]/30">&bull;</span>
          <button
            type="button"
            onClick={onBackToBookshelf}
            className="font-sans text-[11px] tracking-[0.16em] uppercase text-[var(--color-text-graphite)]/70 hover:text-[var(--color-text-ink)] transition-colors focus:outline-none"
          >
            Bookshelf
          </button>
        </div>

        {/* Edition Switcher */}
        {book.editions.length > 1 && (
          <div className="flex items-center gap-1.5 p-1 rounded-full bg-[var(--color-canvas-stone)] border border-[var(--color-text-graphite)]/15">
            <span className="font-sans text-[9px] tracking-wider uppercase text-[var(--color-text-graphite)]/70 px-2">
              Editions:
            </span>
            {book.editions.map((ed) => {
              const isSelected = ed.editionId === selectedEdition.editionId;
              return (
                <button
                  key={ed.editionId}
                  type="button"
                  onClick={() => onSelectEdition(ed.editionId)}
                  className={`py-1 px-2.5 rounded-full font-sans text-[9px] tracking-wider uppercase transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[var(--color-text-ink)] text-[var(--color-canvas-linen)] font-medium shadow-sm'
                      : 'text-[var(--color-text-graphite)] hover:text-[var(--color-text-ink)]'
                  }`}
                >
                  <span>v{ed.version}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Experience Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Left Column: Tactile Book Centerpiece */}
        <div className="lg:col-span-4 flex flex-col items-center">
          <div
            className="relative w-full max-w-[240px] aspect-[3/4.2] rounded-[4px] p-5 flex flex-col justify-between overflow-hidden select-none border border-black/10 shadow-[0_16px_32px_-6px_rgba(44,37,35,0.22)] transition-transform duration-500 hover:scale-[1.01]"
            style={{ backgroundColor: coverBaseColor }}
          >
            <div
              className="absolute inset-0 pointer-events-none opacity-25 mix-blend-overlay"
              style={{
                backgroundImage:
                  'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%223%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/%3E%3C/svg%3E")',
              }}
            />

            {/* Crease */}
            <div className="absolute top-0 bottom-0 left-5 w-[1px] bg-white/25 shadow-[1px_0_1px_rgba(0,0,0,0.3)] pointer-events-none" />
            <div className="absolute top-0 bottom-0 left-0 w-5 bg-gradient-to-r from-black/25 via-black/10 to-transparent pointer-events-none" />

            {/* Spine Foil Band */}
            {isSignatureLinen && (
              <div
                className="absolute top-0 bottom-0 left-0 w-8 border-r border-[#3B3128]/30 shadow-md flex flex-col justify-between py-5 items-center pointer-events-none"
                style={{ backgroundColor: coverSpineFoil }}
              >
                <span className="font-sans text-[6px] tracking-[0.25em] text-[#E8E2D9]/80 uppercase -rotate-90 origin-center whitespace-nowrap mt-3">
                  ALTHEARA
                </span>
                <span className="font-serif text-[7px] text-[#E8E2D9]/70 -rotate-90 origin-center whitespace-nowrap mb-3">
                  {book.year}
                </span>
              </div>
            )}

            {/* Top Designation */}
            <div className={`relative z-10 ${isSignatureLinen ? 'pl-7' : 'pl-3'}`}>
              <span
                className={`font-sans text-[8px] tracking-[0.25em] uppercase block font-medium ${
                  isSignatureLinen ? 'text-[#3B3128]/80' : 'text-white/80'
                }`}
              >
                {book.year ? `Volume ${book.year}` : 'Life Book'}
              </span>
            </div>

            {/* Center Motif & Title */}
            <div
              className={`relative z-10 flex flex-col items-center text-center my-auto px-1 ${
                isSignatureLinen ? 'pl-7' : 'pl-3'
              }`}
            >
              <div className="mb-2 opacity-60">
                <svg
                  className={`w-6 h-6 ${isSignatureLinen ? 'text-[#3B3128]' : 'text-white'}`}
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

              <h3
                className={`font-serif text-sm sm:text-base font-medium leading-snug tracking-tight max-w-[150px] ${
                  isSignatureLinen ? 'text-[#2A231D]' : 'text-white'
                }`}
              >
                {linenTitle || selectedEdition.bookTitle}
              </h3>
            </div>

            {/* Bottom Author */}
            <div
              className={`relative z-10 flex items-center justify-between border-t pt-2 ${
                isSignatureLinen
                  ? 'pl-7 border-[#3B3128]/20 text-[#3B3128]/70'
                  : 'pl-3 border-white/20 text-white/70'
              }`}
            >
              <span className="font-sans text-[6px] tracking-[0.2em] uppercase">
                {selectedEdition.authorName}
              </span>
              <span className="font-sans text-[6px] tracking-[0.2em] uppercase">
                v{selectedEdition.version}
              </span>
            </div>
          </div>

          <div className="mt-5 text-center flex flex-col items-center gap-1.5 max-w-[240px]">
            <h2 className="font-serif text-lg font-medium text-[var(--color-text-ink)] leading-snug">
              {selectedEdition.bookTitle}
            </h2>
            {selectedEdition.subtitle && (
              <p className="font-serif italic text-xs text-[var(--color-text-graphite)]/80">
                {selectedEdition.subtitle}
              </p>
            )}
            <span className="font-sans text-[9px] tracking-widest uppercase text-[var(--color-accent-clay)] mt-1">
              Edition v{selectedEdition.version} &bull; {formattedPreservedDate}
            </span>

            <button
              type="button"
              onClick={onOpenReader}
              className="mt-3 py-1.5 px-4 rounded-full border border-[var(--color-text-graphite)]/25 text-[var(--color-text-graphite)] hover:text-[var(--color-text-ink)] hover:border-[var(--color-text-ink)] font-sans text-[9px] tracking-widest uppercase transition-colors"
            >
              Read in eBook Reader &rarr;
            </button>
          </div>
        </div>

        {/* Right Column: Watch My Book Experience */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="flex flex-col gap-1.5 border-b border-[var(--color-text-graphite)]/15 pb-5">
            <span className="font-sans text-[10px] tracking-[0.28em] uppercase text-[var(--color-accent-clay)] font-semibold">
              Archival Living Presence
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl text-[var(--color-text-ink)] tracking-tight">
              Watch My Book
            </h1>
            <p className="font-serif italic text-sm sm:text-base text-[var(--color-text-graphite)]/85">
              Approved authentic video and avatar passages preserved alongside your manuscript.
            </p>
          </div>

          {/* Video Player or Honest Empty State */}
          {isVideo && rec ? (
            <div className="p-6 sm:p-8 rounded-3xl bg-[var(--color-canvas-stone)]/50 border border-[var(--color-text-graphite)]/15 flex flex-col gap-5">
              <div className="p-3.5 px-4 rounded-xl bg-amber-50/70 border border-amber-200/60 flex items-center justify-between text-amber-950 font-sans text-[10px] tracking-widest uppercase">
                <span className="font-semibold text-amber-900">
                  Preserved Passage Clip &bull; Individual Passage Recording
                </span>
                <span className="text-amber-800">
                  Full-book avatar narration in future phase
                </span>
              </div>

              <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black/90 shadow-md">
                <video
                  controls
                  playsInline
                  src={`${rec.storagePath}&editionId=${selectedEdition.editionId}`}
                  className="w-full h-full object-contain"
                />
              </div>

              {rec.selectedPassageExcerpt && (
                <blockquote className="font-serif italic text-base text-[var(--color-text-ink)] leading-relaxed pl-4 border-l-2 border-[var(--color-accent-clay)]/50 my-2">
                  &ldquo;{rec.selectedPassageExcerpt}&rdquo;
                </blockquote>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[var(--color-text-graphite)]/15 font-sans text-[9px] tracking-widest uppercase text-[var(--color-text-graphite)]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-600" />
                  <strong className="text-[var(--color-text-ink)]">Authentic Video Take</strong>
                  <span>&bull; Preserved in Vault</span>
                </div>
                <span>Asset ID: {rec.assetId}</span>
              </div>
            </div>
          ) : (
            /* Honest Empty State for Editions Without Video (Requirement 5) */
            <div className="p-8 sm:p-14 rounded-3xl bg-[var(--color-canvas-stone)]/40 border border-[var(--color-text-graphite)]/15 text-center flex flex-col items-center max-w-xl mx-auto my-4 animate-[fadeIn_0.3s_ease-out]">
              <div className="w-14 h-14 rounded-full bg-white/80 border border-[var(--color-text-graphite)]/20 flex items-center justify-center text-[var(--color-text-graphite)] mb-4">
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                  <polygon points="23 7 16 12 23 17 23 7" />
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                  <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="1.2" />
                </svg>
              </div>

              <h2 className="font-serif text-2xl sm:text-3xl text-[var(--color-text-ink)] mb-3">
                No Video Passages Preserved Yet
              </h2>

              <p className="font-serif italic text-sm sm:text-base text-[var(--color-text-graphite)]/90 leading-relaxed mb-6 max-w-md">
                This edition does not include a preserved video or avatar passage. Your written story and audio narrations remain safely preserved in your Library.
              </p>

              <button
                type="button"
                onClick={() => setShowNewEditionModal(true)}
                className="py-2.5 px-6 rounded-full border border-[var(--color-text-graphite)]/25 text-[var(--color-text-graphite)] hover:text-[var(--color-text-ink)] hover:border-[var(--color-text-ink)] font-sans text-[10px] tracking-widest uppercase transition-colors"
              >
                Create a New Edition with Video Presence &rarr;
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Safe Editor Handoff Modal */}
      {showNewEditionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="w-full max-w-md p-6 sm:p-8 rounded-3xl bg-[#F7F5F0] border border-[var(--color-text-graphite)]/20 shadow-2xl flex flex-col gap-5 text-center">
            <span className="font-sans text-[9px] tracking-[0.25em] uppercase text-[var(--color-accent-clay)] font-semibold">
              Archival Protection &bull; Handoff
            </span>
            <h3 className="font-serif text-2xl text-[var(--color-text-ink)]">
              Create a New Edition with Video Presence
            </h3>
            <p className="font-serif italic text-sm text-[var(--color-text-graphite)] leading-relaxed">
              Opening the Volume Editor creates an <strong>isolated editable draft</strong> cloned from this volume.
            </p>
            <p className="font-serif text-xs text-[var(--color-text-graphite)]/80 leading-relaxed border-t border-[var(--color-text-graphite)]/15 pt-3">
              Your preserved Library editions will remain <strong>completely untouched and immutable</strong> in the vault. A new version is sealed only when you explicitly finish preservation again.
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
