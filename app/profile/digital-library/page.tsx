"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PreservedVolumeEdition } from '@/lib/volumeData';

function DigitalLibraryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedEditionId = searchParams.get('editionId');

  const [editions, setEditions] = useState<PreservedVolumeEdition[]>([]);
  const [selectedEdition, setSelectedEdition] = useState<PreservedVolumeEdition | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);

  useEffect(() => {
    let isMounted = true;
    async function fetchLibrary() {
      try {
        setIsLoading(true);
        const res = await fetch('/api/volume/library');
        if (!res.ok) {
          throw new Error('Failed to load private library');
        }
        const data = await res.json();
        if (isMounted) {
          const list: PreservedVolumeEdition[] = data.editions || [];
          setEditions(list);
          if (requestedEditionId) {
            const found = list.find((e) => e.editionId === requestedEditionId);
            if (found) setSelectedEdition(found);
          }
          setIsLoading(false);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Could not access vault');
          setIsLoading(false);
        }
      }
    }
    fetchLibrary();
    return () => {
      isMounted = false;
    };
  }, [requestedEditionId]);

  const handleSelectEdition = (edition: PreservedVolumeEdition) => {
    setSelectedEdition(edition);
    setActiveChapterIndex(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCloseEdition = () => {
    setSelectedEdition(null);
  };

  return (
    <div className="min-h-screen bg-[var(--color-canvas-linen)] text-[var(--color-text-ink)] flex flex-col font-sans">
      {/* Top Folio Header */}
      <header className="w-full max-w-5xl mx-auto px-6 py-8 flex items-center justify-between border-b border-[var(--color-text-graphite)]/15">
        <div className="flex flex-col">
          <span className="font-sans text-[9px] tracking-[0.25em] uppercase text-[var(--color-accent-clay)] font-medium">
            Altheara Vault
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl text-[var(--color-text-ink)] tracking-tight mt-0.5">
            My Digital Library
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/profile/volume-editor')}
            className="py-1.5 px-4 rounded-full border border-[var(--color-text-graphite)]/25 text-[var(--color-text-graphite)] hover:text-[var(--color-text-ink)] hover:border-[var(--color-text-ink)] font-sans text-[10px] tracking-[0.14em] uppercase transition-colors"
          >
            Volume Editor
          </button>
          <button
            type="button"
            onClick={() => router.push('/profile')}
            className="py-1.5 px-4 rounded-full bg-[var(--color-canvas-stone)] hover:bg-[var(--color-canvas-stone)]/80 text-[var(--color-text-ink)] font-sans text-[10px] tracking-[0.14em] uppercase transition-colors"
          >
            Preferences
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-5xl mx-auto px-6 py-10 flex-1 flex flex-col">
        {/* Loading State */}
        {isLoading && (
          <div className="flex-1 flex flex-col items-center justify-center py-20 gap-3 opacity-60">
            <div className="w-6 h-6 border-2 border-[var(--color-accent-clay)] border-t-transparent rounded-full animate-spin"></div>
            <span className="font-serif italic text-sm text-[var(--color-text-graphite)]">
              Opening your private vault...
            </span>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="p-6 rounded-2xl bg-red-50/60 border border-red-200/50 text-center flex flex-col items-center gap-2 max-w-md mx-auto my-12">
            <span className="font-sans text-[10px] tracking-widest uppercase text-red-700 font-semibold">
              Vault Access Error
            </span>
            <p className="font-serif text-sm text-red-900">{error}</p>
          </div>
        )}

        {/* Reader Mode: When an edition is open */}
        {selectedEdition && !isLoading && (
          <div className="flex flex-col gap-10 animate-[fadeIn_0.3s_ease-out_forwards]">
            {/* Top Reader Bar */}
            <div className="flex items-center justify-between pb-6 border-b border-[var(--color-text-graphite)]/15">
              <button
                type="button"
                onClick={handleCloseEdition}
                className="font-sans text-xs tracking-wider uppercase text-[var(--color-text-graphite)] hover:text-[var(--color-text-ink)] flex items-center gap-1.5 transition-colors"
              >
                &larr; Back to Library
              </button>

              <div className="flex items-center gap-2">
                <span className="py-0.5 px-2.5 rounded-full bg-[var(--color-canvas-stone)] border border-[var(--color-text-graphite)]/20 font-sans text-[9px] tracking-widest uppercase text-[var(--color-text-graphite)]">
                  Edition v{selectedEdition.version} &bull; Sealed
                </span>
                <span className="font-sans text-[10px] text-[var(--color-text-graphite)]/50">
                  {new Date(selectedEdition.preservedAt).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </span>
              </div>
            </div>

            {/* Preserved Book Header */}
            <div className="text-center flex flex-col items-center max-w-xl mx-auto">
              <span className="font-sans text-[10px] tracking-[0.3em] uppercase text-[var(--color-accent-clay)] font-semibold mb-2">
                Preserved Volume &bull; {selectedEdition.sourceVolumeId.replace('vol-', '')}
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl text-[var(--color-text-ink)] tracking-tight">
                {selectedEdition.bookTitle}
              </h2>
              {selectedEdition.subtitle && (
                <p className="font-serif italic text-base text-[var(--color-text-graphite)] mt-2">
                  {selectedEdition.subtitle}
                </p>
              )}
              <span className="font-sans text-xs tracking-wider uppercase text-[var(--color-text-graphite)]/70 mt-3">
                By {selectedEdition.authorName} &bull; {selectedEdition.totalWords.toLocaleString()} words &bull;{' '}
                {selectedEdition.totalChapters} chapters
              </span>
            </div>

            {/* Authentic Recorded Presence Box (If attached) */}
            {selectedEdition.authenticRecording && (
              <div className="w-full max-w-2xl mx-auto p-5 sm:p-6 rounded-2xl bg-[var(--color-canvas-stone)]/60 border border-[var(--color-text-graphite)]/20 flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-[var(--color-text-graphite)]/15 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[var(--color-accent-clay)]"></span>
                    <span className="font-sans text-[10px] tracking-[0.2em] uppercase text-[var(--color-text-ink)] font-semibold">
                      Authentic Recorded Presence
                    </span>
                  </div>
                  <span className="font-sans text-[9px] tracking-wider uppercase text-[var(--color-text-graphite)]/60">
                    {selectedEdition.authenticRecording.mediaType === 'video' ? 'Video Message' : 'Voice Take'} &bull;{' '}
                    {selectedEdition.authenticRecording.durationSeconds}s
                  </span>
                </div>

                {selectedEdition.authenticRecording.selectedPassageExcerpt && (
                  <p className="font-serif italic text-xs text-[var(--color-text-graphite)] border-l-2 border-[var(--color-accent-clay)]/40 pl-3 py-0.5">
                    &ldquo;{selectedEdition.authenticRecording.selectedPassageExcerpt}&rdquo;
                  </p>
                )}

                {selectedEdition.authenticRecording.mediaType === 'video' ? (
                  <video
                    controls
                    playsInline
                    src={selectedEdition.authenticRecording.storagePath}
                    className="w-full max-h-72 rounded-xl bg-black/90 object-contain shadow-inner"
                  />
                ) : (
                  <audio
                    controls
                    src={selectedEdition.authenticRecording.storagePath}
                    className="w-full rounded-lg"
                  />
                )}

                <span className="font-sans text-[9px] text-[var(--color-text-graphite)]/60 text-center tracking-wider">
                  Original recording preserved in private vault &bull; Not synthetic narration or AI cloned
                </span>
              </div>
            )}

            {/* Configured Preservation Formats Badges */}
            <div className="flex flex-wrap items-center justify-center gap-2 max-w-xl mx-auto">
              <span className="py-1 px-3 rounded-full bg-white/80 border border-[var(--color-text-graphite)]/15 font-sans text-[9px] tracking-wider uppercase text-[var(--color-text-ink)]">
                Digital eBook &bull; Archived
              </span>
              {selectedEdition.preservationFormats.signatureLinen?.configured && (
                <span className="py-1 px-3 rounded-full bg-[var(--color-canvas-stone)] border border-[var(--color-accent-clay)]/40 font-sans text-[9px] tracking-wider uppercase text-[var(--color-accent-clay)] font-medium">
                  Signature Linen &bull; Oatmeal &amp; Bronze Foil Configured
                </span>
              )}
              {selectedEdition.preservationFormats.customHardcover?.configured && (
                <span className="py-1 px-3 rounded-full bg-white/80 border border-[var(--color-text-graphite)]/15 font-sans text-[9px] tracking-wider uppercase text-[var(--color-text-ink)]">
                  Hardcover Configured
                </span>
              )}
              {selectedEdition.preservationFormats.paperback?.configured && (
                <span className="py-1 px-3 rounded-full bg-white/80 border border-[var(--color-text-graphite)]/15 font-sans text-[9px] tracking-wider uppercase text-[var(--color-text-ink)]">
                  Paperback Configured
                </span>
              )}
            </div>

            {/* Chapter Tabs */}
            {selectedEdition.chapters.length > 1 && (
              <div className="flex items-center justify-center gap-2 border-b border-[var(--color-text-graphite)]/15 pb-4">
                {selectedEdition.chapters.map((chap, idx) => (
                  <button
                    key={chap.id}
                    type="button"
                    onClick={() => setActiveChapterIndex(idx)}
                    className={`py-1.5 px-4 rounded-full font-sans text-[10px] tracking-[0.16em] uppercase transition-all ${
                      activeChapterIndex === idx
                        ? 'bg-[var(--color-text-ink)] text-[var(--color-canvas-linen)] font-medium shadow-sm'
                        : 'text-[var(--color-text-graphite)] hover:text-[var(--color-text-ink)]'
                    }`}
                  >
                    Chapter {chap.romanNumeral}
                  </button>
                ))}
              </div>
            )}

            {/* Preserved Manuscript Body */}
            {selectedEdition.chapters[activeChapterIndex] && (
              <article className="w-full max-w-2xl mx-auto flex flex-col py-6">
                <header className="mb-10 text-center flex flex-col items-center">
                  <span className="font-sans text-[10px] tracking-[0.25em] uppercase text-[var(--color-accent-clay)] mb-2">
                    Chapter {selectedEdition.chapters[activeChapterIndex].romanNumeral}
                  </span>
                  <h3 className="font-serif text-2xl sm:text-3xl text-[var(--color-text-ink)]">
                    {selectedEdition.chapters[activeChapterIndex].title}
                  </h3>
                  <div className="flex items-center justify-center gap-2 mt-4 opacity-40 select-none">
                    <span className="w-8 h-[1px] bg-[var(--color-text-graphite)]"></span>
                    <span className="font-serif text-xs text-[var(--color-text-graphite)]">&#10086;</span>
                    <span className="w-8 h-[1px] bg-[var(--color-text-graphite)]"></span>
                  </div>
                </header>

                <div className="flex flex-col gap-6 font-serif text-[16px] sm:text-[18px] leading-[1.85] text-[var(--color-text-ink)]">
                  {selectedEdition.chapters[activeChapterIndex].paragraphs.map((p, pIdx) => (
                    <p key={p.id || pIdx} className="text-justify font-normal">
                      {p.text}
                    </p>
                  ))}
                </div>

                {/* Archival Seal Footer */}
                <footer className="mt-16 pt-8 border-t border-[var(--color-text-graphite)]/15 text-center flex flex-col items-center gap-2 text-[var(--color-text-graphite)]/60 font-sans text-[9px] tracking-widest uppercase">
                  <span>Archival Sealed Edition &bull; Vault ID: {selectedEdition.editionId}</span>
                  <span>Altheara Private Preservation Standard</span>
                </footer>
              </article>
            )}
          </div>
        )}

        {/* Library Card List: When no edition is actively open */}
        {!selectedEdition && !isLoading && !error && (
          <div className="flex flex-col gap-8">
            <div className="flex items-center justify-between">
              <span className="font-sans text-[10px] tracking-[0.2em] uppercase text-[var(--color-text-graphite)]">
                {editions.length} {editions.length === 1 ? 'Volume Preserved' : 'Volumes Preserved'}
              </span>
              <span className="font-sans text-[10px] text-[var(--color-text-graphite)]/60">
                Sarah&apos;s Private Vault &bull; Protected
              </span>
            </div>

            {editions.length === 0 ? (
              <div className="py-20 px-6 rounded-3xl bg-[var(--color-canvas-stone)]/40 border border-[var(--color-text-graphite)]/15 text-center flex flex-col items-center gap-4 max-w-lg mx-auto my-8">
                <span className="font-serif italic text-xl text-[var(--color-text-ink)]">
                  Your vault is waiting for its first preserved book.
                </span>
                <p className="font-serif text-sm text-[var(--color-text-graphite)] max-w-sm leading-relaxed">
                  When you complete editing your annual Volume in the Volume Editor, choose &ldquo;Finish My
                  Volume&rdquo; to seal your manuscript into an immutable edition.
                </p>
                <button
                  type="button"
                  onClick={() => router.push('/profile/volume-editor')}
                  className="mt-4 py-2.5 px-6 rounded-full bg-[var(--color-text-ink)] text-[var(--color-canvas-linen)] font-sans text-[10px] tracking-[0.18em] uppercase hover:bg-[var(--color-text-ink)]/90 transition-all active:scale-[0.98]"
                >
                  Open Volume Editor &rarr;
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {editions.map((edition) => (
                  <div
                    key={edition.editionId}
                    onClick={() => handleSelectEdition(edition)}
                    className="group cursor-pointer p-6 sm:p-8 rounded-2xl bg-white/60 hover:bg-white border border-[var(--color-text-graphite)]/15 hover:border-[var(--color-accent-clay)] shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between gap-6"
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="font-sans text-[9px] tracking-[0.25em] uppercase text-[var(--color-accent-clay)] font-semibold">
                          Volume {edition.sourceVolumeId.replace('vol-', '')} &bull; Edition v{edition.version}
                        </span>
                        <span className="font-sans text-[9px] tracking-wider uppercase text-[var(--color-text-graphite)]/50">
                          {new Date(edition.preservedAt).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                      </div>

                      <h3 className="font-serif text-2xl text-[var(--color-text-ink)] group-hover:text-[var(--color-accent-clay)] transition-colors">
                        {edition.bookTitle}
                      </h3>

                      {edition.subtitle && (
                        <p className="font-serif italic text-xs text-[var(--color-text-graphite)]">
                          {edition.subtitle}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col gap-3">
                      {/* Attached Media / Format Tags */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="py-0.5 px-2 rounded-full bg-[var(--color-canvas-stone)] font-sans text-[8px] tracking-wider uppercase text-[var(--color-text-graphite)]">
                          eBook Archived
                        </span>
                        {edition.preservationFormats.signatureLinen?.configured && (
                          <span className="py-0.5 px-2 rounded-full bg-[#E8E2D9] border border-[#3B3128]/20 font-sans text-[8px] tracking-wider uppercase text-[#3B3128] font-medium">
                            Signature Linen Configured
                          </span>
                        )}
                        {edition.authenticRecording && (
                          <span className="py-0.5 px-2 rounded-full bg-[var(--color-accent-clay)]/10 text-[var(--color-accent-clay)] font-sans text-[8px] tracking-wider uppercase font-medium">
                            Voice Recording Included
                          </span>
                        )}
                      </div>

                      <div className="pt-3 border-t border-[var(--color-text-graphite)]/10 flex items-center justify-between font-sans text-[10px] text-[var(--color-text-graphite)]/70">
                        <span>
                          {edition.totalChapters} Chapters &bull; ~{edition.totalWords.toLocaleString()} Words
                        </span>
                        <span className="font-sans text-[10px] tracking-wider uppercase text-[var(--color-text-ink)] group-hover:translate-x-1 transition-transform">
                          Read Manuscript &rarr;
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default function DigitalLibraryPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--color-canvas-linen)] flex items-center justify-center">
          <span className="font-serif italic text-sm text-[var(--color-text-graphite)]">
            Loading library...
          </span>
        </div>
      }
    >
      <DigitalLibraryContent />
    </Suspense>
  );
}
