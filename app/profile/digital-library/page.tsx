"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PreservedBook } from '@/lib/volumeData';

function DigitalLibraryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedBookId = searchParams.get('bookId');

  const [books, setBooks] = useState<PreservedBook[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchLibrary() {
      try {
        setIsLoading(true);
        if (searchParams.get('empty') === '1') {
          if (isMounted) {
            setBooks([]);
            setIsLoading(false);
          }
          return;
        }
        const res = await fetch('/api/volume/library');
        if (!res.ok) {
          throw new Error('Failed to load private library');
        }
        const data = await res.json();
        if (isMounted) {
          const bookList: PreservedBook[] = data.books || [];
          setBooks(bookList);
          if (requestedBookId) {
            const found = bookList.find((b) => b.bookId === requestedBookId);
            if (found) setSelectedBookId(found.bookId);
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
  }, [requestedBookId]);

  const handleSelectBook = (book: PreservedBook) => {
    setSelectedBookId(book.bookId === selectedBookId ? null : book.bookId);
  };

  return (
    <div className="min-h-screen bg-[var(--color-canvas-linen)] text-[var(--color-text-ink)] flex flex-col font-sans select-none">
      {/* Top Folio Header */}
      <header className="w-full max-w-6xl mx-auto px-6 sm:px-8 py-8 flex items-center justify-between border-b border-[var(--color-text-graphite)]/15">
        <div className="flex flex-col">
          <span className="font-sans text-[9px] tracking-[0.25em] uppercase text-[var(--color-accent-clay)] font-medium">
            Altheara Vault
          </span>
          <span className="font-serif text-xs tracking-widest text-[var(--color-text-graphite)]/70 uppercase mt-0.5">
            A Place for Your Life
          </span>
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

      {/* Main Bookshelf Stage */}
      <main className="w-full max-w-6xl mx-auto px-6 sm:px-8 py-10 sm:py-14 flex-1 flex flex-col">
        {/* Page Title & Vision (Brief Section 4) */}
        <div className="text-center flex flex-col items-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <h1 className="font-serif text-3xl sm:text-4xl text-[var(--color-text-ink)] tracking-tight">
            My Digital Library
          </h1>
          <p className="font-serif italic text-base sm:text-lg text-[var(--color-text-graphite)]/85 mt-3 leading-relaxed">
            The stories you&apos;ve written. The moments you&apos;ve preserved. A lifetime to return to.
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex-1 flex flex-col items-center justify-center py-24 gap-3 opacity-60">
            <div className="w-6 h-6 border-2 border-[var(--color-accent-clay)] border-t-transparent rounded-full animate-spin"></div>
            <span className="font-serif italic text-sm text-[var(--color-text-graphite)]">
              Opening your private library...
            </span>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="p-6 rounded-2xl bg-red-50/60 border border-red-200/50 text-center flex flex-col items-center gap-2 max-w-md mx-auto my-12">
            <span className="font-sans text-[10px] tracking-widest uppercase text-red-700 font-semibold">
              Vault Access Notice
            </span>
            <p className="font-serif text-sm text-red-900">{error}</p>
          </div>
        )}

        {/* Empty State (Brief Section 15: No books preserved) */}
        {!isLoading && !error && books.length === 0 && (
          <div className="py-24 px-6 text-center flex flex-col items-center gap-4 max-w-md mx-auto my-8">
            <div className="w-12 h-12 rounded-full bg-[var(--color-canvas-stone)] border border-[var(--color-text-graphite)]/15 flex items-center justify-center text-[var(--color-text-graphite)] mb-1">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
            </div>
            <h2 className="font-serif text-2xl text-[var(--color-text-ink)]">
              No books preserved
            </h2>
            <p className="font-serif italic text-sm text-[var(--color-text-graphite)] leading-relaxed">
              Your library is waiting for its first story.
            </p>
            <button
              type="button"
              onClick={() => router.push('/profile/volume-editor')}
              className="mt-4 py-2.5 px-6 rounded-full bg-[var(--color-text-ink)] text-[var(--color-canvas-linen)] font-sans text-[10px] tracking-[0.18em] uppercase hover:bg-[var(--color-text-ink)]/90 transition-all active:scale-[0.98]"
            >
              Open Volume Editor &rarr;
            </button>
          </div>
        )}

        {/* Responsive Bookshelf Grid (Brief Section 4: One card per book) */}
        {!isLoading && !error && books.length > 0 && (
          <div className="flex flex-col gap-12">
            {/* Bookshelf Shelf Surface */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 sm:gap-10 items-end">
              {books.map((book) => {
                const isSelected = selectedBookId === book.bookId;
                const isSignatureLinen = book.cover.type === 'signature_linen';

                return (
                  <article
                    key={book.bookId}
                    onClick={() => handleSelectBook(book)}
                    className={`group cursor-pointer flex flex-col w-full max-w-[240px] sm:max-w-none mx-auto sm:mx-0 transition-all duration-300 ${
                      isSelected ? 'scale-[1.02]' : ''
                    }`}
                  >
                    {/* Realistic Hand-Bound Tactile Book Cover */}
                    <div
                      className={`relative w-full aspect-[3/4.2] rounded-[4px] p-5 sm:p-6 flex flex-col justify-between overflow-hidden select-none transition-all duration-500 border border-black/10 ${
                        isSelected
                          ? 'shadow-[0_22px_45px_-8px_rgba(44,37,35,0.28),0_10px_20px_-4px_rgba(44,37,35,0.16)] ring-2 ring-[var(--color-accent-clay)]'
                          : 'shadow-[0_12px_28px_-6px_rgba(44,37,35,0.16),0_4px_10px_-2px_rgba(44,37,35,0.08)] group-hover:shadow-[0_20px_40px_-8px_rgba(44,37,35,0.24)] group-hover:-translate-y-1.5'
                      }`}
                      style={{
                        backgroundColor: book.cover.baseColor,
                      }}
                    >
                      {/* Linen / Cloth Weave Texture Simulation */}
                      <div
                        className="absolute inset-0 pointer-events-none opacity-25 mix-blend-overlay"
                        style={{
                          backgroundImage:
                            'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%223%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/%3E%3C/svg%3E")',
                        }}
                      />

                      {/* Hardcover Spine Joint Crease / Gutter */}
                      <div className="absolute top-0 bottom-0 left-5 w-[1px] bg-white/25 shadow-[1px_0_1px_rgba(0,0,0,0.3)] pointer-events-none" />
                      <div className="absolute top-0 bottom-0 left-0 w-5 bg-gradient-to-r from-black/25 via-black/10 to-transparent pointer-events-none" />

                      {/* Signature Linen Espresso Bronze Foil Spine Band (if applicable) */}
                      {isSignatureLinen && (
                        <div
                          className="absolute top-0 bottom-0 left-0 w-8 sm:w-9 border-r border-[#3B3128]/30 shadow-md flex flex-col justify-between py-6 items-center pointer-events-none"
                          style={{ backgroundColor: book.cover.spineFoilColor }}
                        >
                          <span className="font-sans text-[7px] tracking-[0.25em] text-[#E8E2D9]/80 uppercase -rotate-90 origin-center whitespace-nowrap mt-4">
                            ALTHEARA
                          </span>
                          <span className="font-serif text-[8px] text-[#E8E2D9]/70 -rotate-90 origin-center whitespace-nowrap mb-4">
                            {book.year}
                          </span>
                        </div>
                      )}

                      {/* Top Header of Cover: Year & Designation */}
                      <div className={`relative z-10 ${isSignatureLinen ? 'pl-7 sm:pl-8' : 'pl-3'}`}>
                        <span
                          className={`font-sans text-[8px] sm:text-[9px] tracking-[0.28em] uppercase block font-medium ${
                            isSignatureLinen ? 'text-[#3B3128]/80' : 'text-white/80'
                          }`}
                        >
                          {book.year ? `Volume ${book.year}` : 'Life Book'}
                        </span>
                      </div>

                      {/* Center Cover Motif & Debossed Book Title */}
                      <div
                        className={`relative z-10 flex flex-col items-center text-center my-auto px-2 ${
                          isSignatureLinen ? 'pl-7 sm:pl-8' : 'pl-3'
                        }`}
                      >
                        {/* Debossed Botanical Filigree Accent */}
                        <div className="mb-3 opacity-60">
                          <svg
                            className={`w-7 h-7 sm:w-8 sm:h-8 ${
                              isSignatureLinen ? 'text-[#3B3128]' : 'text-white'
                            }`}
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

                        {/* Debossed Foil Title */}
                        <h2
                          className={`font-serif text-base sm:text-lg font-medium leading-tight tracking-tight max-w-[160px] ${
                            isSignatureLinen ? 'text-[#2A231D]' : 'text-white'
                          }`}
                        >
                          {book.cover.customizedTitle || book.displayTitle}
                        </h2>

                        {/* Subtitle if available */}
                        {book.subtitle && (
                          <p
                            className={`font-serif italic text-[10px] mt-1.5 line-clamp-1 max-w-[140px] opacity-75 ${
                              isSignatureLinen ? 'text-[#3B3128]' : 'text-white'
                            }`}
                          >
                            {book.subtitle}
                          </p>
                        )}
                      </div>

                      {/* Bottom Footer on Cover */}
                      <div
                        className={`relative z-10 flex items-center justify-between border-t pt-2.5 ${
                          isSignatureLinen
                            ? 'pl-7 sm:pl-8 border-[#3B3128]/20 text-[#3B3128]/70'
                            : 'pl-3 border-white/20 text-white/70'
                        }`}
                      >
                        <span className="font-sans text-[7px] tracking-[0.2em] uppercase">
                          {book.authorName}
                        </span>
                        <span className="font-sans text-[7px] tracking-[0.2em] uppercase">
                          Vault
                        </span>
                      </div>
                    </div>

                    {/* Book Metadata Below Cover (Brief Section 4) */}
                    <div className="flex flex-col mt-4 px-1 gap-1">
                      <div className="flex items-center justify-between text-[10px] tracking-[0.16em] uppercase text-[var(--color-text-graphite)]/75">
                        <span>
                          {book.year ? `${book.year} \u2022 Annual Volume` : 'Life Book'}
                        </span>
                        <span>
                          {book.totalEditions > 1 ? `${book.totalEditions} Editions` : `Edition v${book.latestEdition.version}`}
                        </span>
                      </div>

                      <h3 className="font-serif text-lg sm:text-xl text-[var(--color-text-ink)] group-hover:text-[var(--color-accent-clay)] transition-colors leading-snug">
                        {book.displayTitle}
                      </h3>

                      {/* Authentic Recording Pill (if attached) */}
                      {book.hasAuthenticRecording && (
                        <div className="flex items-center gap-1.5 mt-1 text-[9px] font-sans tracking-wider uppercase text-[var(--color-accent-clay)]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent-clay)]"></span>
                          <span>
                            {book.latestRecordingMediaType === 'video' ? 'Video Message Attached' : 'Voice Take Preserved'}
                          </span>
                        </div>
                      )}

                      {/* Selected State Informational Pill (Phase B Boundary Notice) */}
                      {isSelected && (
                        <div className="mt-3 p-2.5 rounded-xl bg-[var(--color-canvas-stone)] border border-[var(--color-accent-clay)]/30 text-center animate-[fadeIn_0.2s_ease-out_forwards]">
                          <span className="font-serif italic text-xs text-[var(--color-text-ink)] block">
                            {book.displayTitle} &bull; Selected
                          </span>
                          <span className="font-sans text-[9px] tracking-wider uppercase text-[var(--color-text-graphite)] block mt-0.5">
                            Book Details &amp; Reader open in Phase C
                          </span>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Subtle Wooden / Stone Bookshelf Rail Ledge */}
            <div className="w-full h-[6px] bg-gradient-to-b from-[#2C2523]/20 via-[#2C2523]/10 to-transparent rounded-full -mt-4 shadow-sm" />
          </div>
        )}
      </main>

      {/* Discreet Single Development Storage Footnote (User Refinement 1) */}
      <footer className="w-full max-w-6xl mx-auto px-6 sm:px-8 py-8 border-t border-[var(--color-text-graphite)]/15 text-center flex flex-col items-center gap-1.5 text-[var(--color-text-graphite)]/60 font-sans text-[9px] tracking-widest uppercase">
        <span>Preserved in private local vault (development preview)</span>
        <span>A Place for Your Life &bull; Altheara</span>
      </footer>
    </div>
  );
}

export default function DigitalLibraryPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--color-canvas-linen)] flex items-center justify-center">
          <span className="font-serif italic text-sm text-[var(--color-text-graphite)]">
            Opening your library...
          </span>
        </div>
      }
    >
      <DigitalLibraryContent />
    </Suspense>
  );
}
