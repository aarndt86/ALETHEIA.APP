'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PublishingDraft } from '@/lib/publishingData';
import { PublicationItemWithEditions } from '@/app/api/volume/publishing/publications/route';

interface MyPublicationsViewProps {
  onReadEdition: (publicationId: string, editionId: string) => void;
}

export function MyPublicationsView({ onReadEdition }: MyPublicationsViewProps) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<PublishingDraft[]>([]);
  const [publications, setPublications] = useState<PublicationItemWithEditions[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadPublications() {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        const res = await fetch('/api/volume/publishing/publications');
        if (!res.ok) {
          throw new Error('Failed to load publishing projects from your vault.');
        }

        const data = await res.json();
        if (isMounted) {
          setDrafts(data.drafts || []);
          setPublications(data.publications || []);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setErrorMessage(err instanceof Error ? err.message : 'Error loading publications.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadPublications();

    return () => {
      isMounted = false;
    };
  }, []);

  const getStepName = (step: number) => {
    switch (step) {
      case 1:
        return 'Step 1: Manuscript';
      case 2:
        return 'Step 2: Bookstore Image';
      case 3:
        return 'Step 3: Story Preview';
      case 4:
        return 'Step 4: Final Review';
      default:
        return 'Step 2: Bookstore Image';
    }
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex flex-col items-center justify-center text-center">
        <div className="w-10 h-10 rounded-full border-2 border-[var(--color-accent-clay)] border-t-transparent animate-spin mb-4"></div>
        <h2 className="font-serif text-lg text-[var(--color-text-ink)] font-normal">
          Loading My Publications...
        </h2>
        <span className="font-sans text-[10px] tracking-[0.2em] uppercase text-[var(--color-text-graphite)]/60 mt-1">
          Altheara Legacy Publisher &bull; Vault Isolation
        </span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 flex flex-col gap-10">
      {/* Top Header & Navigation */}
      <header className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[var(--color-text-graphite)]/15 pb-6">
        <div className="flex flex-col gap-1.5">
          <span className="font-sans text-[10px] tracking-[0.25em] uppercase text-[var(--color-accent-clay)] font-semibold">
            Legacy Publisher Workspace
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl text-[var(--color-text-ink)] font-normal tracking-tight">
            My Publications
          </h1>
          <p className="font-serif italic text-xs sm:text-sm text-[var(--color-text-graphite)] max-w-xl">
            Your independent public-facing manuscripts, bookstore editions, and privately preserved publication projects.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => router.push('/profile/digital-library')}
            className="py-2.5 px-5 rounded-full border border-[var(--color-text-graphite)]/25 text-[var(--color-text-graphite)] hover:text-[var(--color-text-ink)] hover:bg-white font-sans text-xs tracking-[0.14em] uppercase transition-colors focus:outline-none"
          >
            &larr; Digital Library (Private)
          </button>
          <button
            type="button"
            onClick={() => router.push('/profile/digital-library')}
            className="py-2.5 px-5 rounded-full bg-[var(--color-text-ink)] text-[var(--color-canvas-linen)] hover:bg-[var(--color-text-ink)]/90 font-sans text-xs tracking-[0.16em] uppercase transition-all focus:outline-none shadow-sm cursor-pointer"
          >
            Start New Publication &rarr;
          </button>
        </div>
      </header>

      {/* Notifications */}
      {errorMessage && (
        <div className="w-full p-4 rounded-lg bg-red-50/80 border border-red-200 text-red-800 text-xs sm:text-sm font-sans flex items-start justify-between gap-4">
          <span>{errorMessage}</span>
          <button type="button" onClick={() => setErrorMessage(null)} className="font-bold hover:opacity-75 focus:outline-none">&times;</button>
        </div>
      )}

      {/* SECTION 1: IN PROGRESS MANUSCRIPTS */}
      <section className="flex flex-col gap-5">
        <div className="flex items-center justify-between border-b border-[var(--color-text-graphite)]/10 pb-2.5">
          <div className="flex items-center gap-3">
            <h2 className="font-serif text-xl sm:text-2xl text-[var(--color-text-ink)] font-normal">
              In Progress Manuscripts
            </h2>
            <span className="font-sans text-[10px] tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-[var(--color-canvas-stone)] text-[var(--color-text-graphite)] border border-[var(--color-text-graphite)]/15">
              {drafts.length} Active
            </span>
          </div>
          <span className="font-serif italic text-xs text-[var(--color-text-graphite)]/70 hidden sm:inline">
            Drafts saved in vault
          </span>
        </div>

        {drafts.length === 0 ? (
          <div className="w-full p-8 rounded-2xl bg-white/40 border border-dashed border-[var(--color-text-graphite)]/20 text-center flex flex-col items-center gap-2">
            <span className="font-serif italic text-sm text-[var(--color-text-graphite)]">
              No in-progress publishing drafts.
            </span>
            <span className="font-sans text-[11px] text-[var(--color-text-graphite)]/60">
              Select an edition from your Digital Library and click &ldquo;Publish This Edition&rdquo; to begin a manuscript.
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {drafts.map((d) => {
              const wordCount = (d.chapters || []).reduce((acc, chap) => {
                return acc + (chap.paragraphs || []).reduce((pAcc, p) => {
                  return pAcc + (p.text ? p.text.trim().split(/\s+/).filter(Boolean).length : 0);
                }, 0);
              }, 0);

              const resumeStep = d.currentStep || 2;
              const resumeUrl = resumeStep === 1
                ? `/profile/volume-editor/editor?pubDraftId=${encodeURIComponent(d.publishingDraftId)}&edit=1`
                : `/profile/legacy-publisher?pubDraftId=${encodeURIComponent(d.publishingDraftId)}&step=${resumeStep}`;

              return (
                <article
                  key={d.publishingDraftId}
                  className="p-6 rounded-2xl bg-white/70 border border-[var(--color-text-graphite)]/15 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between gap-5"
                >
                  <div className="flex items-start gap-4">
                    {/* Bookstore Artwork Plate / Thumbnail */}
                    <div className="w-20 sm:w-24 aspect-[3/4] rounded-md overflow-hidden bg-[var(--color-canvas-stone)] border border-[var(--color-text-graphite)]/15 shrink-0 flex items-center justify-center">
                      {d.bookstoreImage?.storagePath ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={d.bookstoreImage.storagePath}
                          alt={d.bookTitle || 'Bookstore Artwork'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="p-2 text-center flex flex-col items-center justify-center">
                          <span className="font-serif italic text-[10px] text-[var(--color-text-graphite)]/60">
                            No Artwork
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Metadata & Title */}
                    <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-sans text-[9px] tracking-[0.2em] uppercase px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200 font-medium">
                          {getStepName(d.currentStep)}
                        </span>
                        {d.videoChoice === 'included' && (
                          <span className="font-sans text-[9px] uppercase tracking-wider text-emerald-800">
                            Video Added
                          </span>
                        )}
                        {d.videoChoice === 'none' && (
                          <span className="font-sans text-[9px] uppercase tracking-wider text-[var(--color-text-graphite)]/60">
                            No Video
                          </span>
                        )}
                      </div>

                      <h3 className="font-serif text-lg sm:text-xl text-[var(--color-text-ink)] font-normal truncate">
                        {d.bookTitle || 'Untitled Publication'}
                      </h3>
                      {d.subtitle && (
                        <p className="font-serif italic text-xs text-[var(--color-text-graphite)] truncate">
                          {d.subtitle}
                        </p>
                      )}

                      <span className="font-sans text-[11px] uppercase tracking-wider text-[var(--color-accent-clay)] font-semibold mt-0.5">
                        by {d.authorDisplayName || 'Author'}
                      </span>

                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-sans text-[var(--color-text-graphite)]/70 pt-1">
                        <span>Derived from {d.sourceVolumeId} (v{d.sourceEditionVersion})</span>
                        <span>&bull;</span>
                        <span>{wordCount.toLocaleString()} words</span>
                        <span>&bull;</span>
                        <span>{(d.chapters || []).length} chapters</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom: Timestamp & Resume Action */}
                  <div className="flex items-center justify-between pt-3 border-t border-[var(--color-text-graphite)]/10 text-xs font-sans">
                    <span className="text-[10px] text-[var(--color-text-graphite)]/60">
                      Saved {new Date(d.lastSavedAt || d.createdAt).toLocaleDateString()}
                    </span>

                    <button
                      type="button"
                      onClick={() => router.push(resumeUrl)}
                      className="py-1.5 px-4 rounded-full bg-[var(--color-text-ink)] text-[var(--color-canvas-linen)] hover:bg-[var(--color-text-ink)]/90 font-sans text-[10px] tracking-[0.16em] uppercase transition-all shadow-sm cursor-pointer"
                    >
                      Resume Project &rarr;
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* SECTION 2: PRESERVED PUBLICATIONS */}
      <section className="flex flex-col gap-5 pt-6 border-t border-[var(--color-text-graphite)]/15">
        <div className="flex items-center justify-between border-b border-[var(--color-text-graphite)]/10 pb-2.5">
          <div className="flex items-center gap-3">
            <h2 className="font-serif text-xl sm:text-2xl text-[var(--color-text-ink)] font-normal">
              Preserved Publications
            </h2>
            <span className="font-sans text-[10px] tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium">
              {publications.length} Sealed Private
            </span>
          </div>
          <span className="font-serif italic text-xs text-[var(--color-text-graphite)]/70 hidden sm:inline">
            Vault editions &bull; Unlisted from Bookstore
          </span>
        </div>

        {publications.length === 0 ? (
          <div className="w-full p-8 rounded-2xl bg-white/40 border border-dashed border-[var(--color-text-graphite)]/20 text-center flex flex-col items-center gap-2">
            <span className="font-serif italic text-sm text-[var(--color-text-graphite)]">
              No preserved publication editions yet.
            </span>
            <span className="font-sans text-[11px] text-[var(--color-text-graphite)]/60">
              When you complete Step 4 and click &ldquo;Preserve My Publication&rdquo;, your immutable edition will appear here.
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {publications.map((pub) => {
              const latestEd = pub.editions && pub.editions.length > 0 ? pub.editions[0] : null;
              if (!latestEd) return null;

              return (
                <article
                  key={pub.publicationId}
                  className="p-6 rounded-2xl bg-white border border-[var(--color-text-graphite)]/15 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between gap-5"
                >
                  <div className="flex items-start gap-4">
                    {/* Bookstore Artwork Plate */}
                    <div className="w-20 sm:w-24 aspect-[3/4] rounded-md overflow-hidden bg-[var(--color-canvas-stone)] border border-[var(--color-text-graphite)]/15 shrink-0 flex items-center justify-center shadow-sm">
                      {latestEd.bookstoreImage?.storagePath ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={latestEd.bookstoreImage.storagePath}
                          alt={latestEd.bookTitle}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="p-2 text-center flex flex-col items-center justify-center">
                          <span className="font-serif italic text-[10px] text-[var(--color-text-graphite)]/60">
                            Artwork Plate
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-sans text-[9px] tracking-[0.2em] uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium">
                          Preserved Edition v{latestEd.version}
                        </span>
                        {pub.sealedEditionCount > 1 && (
                          <span className="font-sans text-[9px] uppercase tracking-wider text-[var(--color-text-graphite)]/60">
                            {pub.sealedEditionCount} versions
                          </span>
                        )}
                      </div>

                      <h3 className="font-serif text-lg sm:text-xl text-[var(--color-text-ink)] font-normal truncate">
                        {latestEd.bookTitle}
                      </h3>
                      {latestEd.subtitle && (
                        <p className="font-serif italic text-xs text-[var(--color-text-graphite)] truncate">
                          {latestEd.subtitle}
                        </p>
                      )}

                      <span className="font-sans text-[11px] uppercase tracking-wider text-[var(--color-accent-clay)] font-semibold mt-0.5">
                        by {latestEd.authorDisplayName}
                      </span>

                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-sans text-[var(--color-text-graphite)]/70 pt-1">
                        <span>Derived from {latestEd.sourceVolumeId}</span>
                        <span>&bull;</span>
                        <span>{latestEd.totalWordCount.toLocaleString()} words</span>
                        <span>&bull;</span>
                        <span>{latestEd.chapterCount} chapters</span>
                      </div>

                      <div className="pt-1">
                        <span className="font-mono text-[9px] text-[var(--color-text-graphite)]/60 block truncate">
                          SHA-256: {latestEd.contentHash.slice(0, 16)}...
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom: Preserved Date & Read Action */}
                  <div className="flex items-center justify-between pt-3 border-t border-[var(--color-text-graphite)]/10 text-xs font-sans">
                    <span className="text-[10px] text-[var(--color-text-graphite)]/60">
                      Preserved {new Date(latestEd.preservedAt).toLocaleDateString()}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onReadEdition(pub.publicationId, latestEd.publicationEditionId)}
                        className="py-1.5 px-4 rounded-full bg-[var(--color-text-ink)] text-[var(--color-canvas-linen)] hover:bg-[var(--color-text-ink)]/90 font-sans text-[10px] tracking-[0.16em] uppercase transition-all shadow-sm cursor-pointer"
                      >
                        Read Publication &rarr;
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
