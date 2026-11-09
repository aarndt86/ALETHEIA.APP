'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { PublishingDraft } from '@/lib/publishingData';
import { BookstoreImageStep } from '@/components/publisher/BookstoreImageStep';
import { StoryPreviewStep } from '@/components/publisher/StoryPreviewStep';

function LegacyPublisherContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const pubDraftId = searchParams.get('pubDraftId');
  const stepParam = searchParams.get('step') || '2';

  const [draft, setDraft] = useState<PublishingDraft | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadPublishingDraft() {
      if (!pubDraftId) {
        setLoadError('No publishing draft specified. Please select an edition from your Digital Library to publish.');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setLoadError(null);

        const res = await fetch(`/api/volume/publishing/draft?pubDraftId=${encodeURIComponent(pubDraftId)}`);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Unable to load publishing draft (HTTP ${res.status}).`);
        }

        const data = await res.json();
        if (isMounted) {
          setDraft(data.draft);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setLoadError(err instanceof Error ? err.message : 'Failed to connect to Altheara vault.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadPublishingDraft();

    return () => {
      isMounted = false;
    };
  }, [pubDraftId]);

  if (isLoading) {
    return (
      <main className="min-h-screen w-full bg-[var(--color-canvas-linen)] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-10 h-10 rounded-full border-2 border-[var(--color-accent-clay)] border-t-transparent animate-spin mb-4"></div>
        <h2 className="font-serif text-lg text-[var(--color-text-ink)] font-normal">
          Loading Publishing Studio...
        </h2>
        <span className="font-sans text-[10px] tracking-[0.2em] uppercase text-[var(--color-text-graphite)]/60 mt-1">
          Altheara Legacy Publisher &bull; Vault Isolation Active
        </span>
      </main>
    );
  }

  if (loadError || !draft || !pubDraftId) {
    return (
      <main className="min-h-screen w-full bg-[var(--color-canvas-linen)] flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md p-8 rounded-2xl bg-white/70 border border-red-200 shadow-sm flex flex-col items-center gap-4">
          <span className="font-sans text-[10px] tracking-[0.25em] uppercase text-red-700 font-semibold">
            Publication Access Notice
          </span>
          <p className="font-serif text-base text-[var(--color-text-ink)] leading-relaxed">
            {loadError || 'Publishing draft could not be loaded.'}
          </p>
          <button
            type="button"
            onClick={() => router.push('/profile/digital-library')}
            className="mt-2 py-2.5 px-6 rounded-full bg-[var(--color-text-ink)] text-[var(--color-canvas-linen)] font-sans text-xs tracking-[0.16em] uppercase hover:bg-[var(--color-text-ink)]/90 transition-all focus:outline-none"
          >
            Return to Digital Library
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen w-full bg-[var(--color-canvas-linen)] text-[var(--color-text-ink)] selection:bg-[var(--color-canvas-stone)]">
      {stepParam === '2' && (
        <BookstoreImageStep draft={draft} pubDraftId={pubDraftId} onDraftUpdate={setDraft} />
      )}

      {stepParam === '3' && (
        <StoryPreviewStep draft={draft} pubDraftId={pubDraftId} onDraftUpdate={setDraft} />
      )}

      {stepParam === '4' && (
        /* Honest Next-Step State for Step 4 (Phase LP2D Preparation) */
        <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 flex flex-col gap-8">
          <nav aria-label="Publishing Progress" className="w-full flex items-center justify-between border-b border-[var(--color-text-graphite)]/15 pb-4">
            <button
              type="button"
              onClick={() => router.push(`/profile/legacy-publisher?pubDraftId=${encodeURIComponent(pubDraftId)}&step=3`)}
              className="group flex items-center gap-2 font-sans text-xs tracking-[0.16em] uppercase text-[var(--color-text-graphite)] hover:text-[var(--color-text-ink)] transition-colors focus:outline-none"
            >
              <span className="group-hover:-translate-x-1 transition-transform duration-200">&larr;</span>
              <span>Return to Story Preview</span>
            </button>

            <div className="hidden sm:flex items-center gap-6 font-sans text-[11px] tracking-[0.2em] uppercase">
              <button
                type="button"
                onClick={() => router.push(`/profile/volume-editor/editor?pubDraftId=${encodeURIComponent(pubDraftId)}&edit=1`)}
                className="text-[var(--color-text-graphite)]/60 hover:text-[var(--color-text-ink)] uppercase focus:outline-none"
              >
                Step 1: Manuscript
              </button>
              <button
                type="button"
                onClick={() => router.push(`/profile/legacy-publisher?pubDraftId=${encodeURIComponent(pubDraftId)}&step=2`)}
                className="text-[var(--color-text-graphite)]/60 hover:text-[var(--color-text-ink)] uppercase focus:outline-none"
              >
                Step 2: Bookstore Image
              </button>
              <button
                type="button"
                onClick={() => router.push(`/profile/legacy-publisher?pubDraftId=${encodeURIComponent(pubDraftId)}&step=3`)}
                className="text-[var(--color-text-graphite)]/60 hover:text-[var(--color-text-ink)] uppercase focus:outline-none"
              >
                Step 3: Story Preview
              </button>
              <span className="text-[var(--color-accent-clay)] font-semibold border-b border-[var(--color-accent-clay)] pb-0.5">
                Step 4: Final Review
              </span>
            </div>
          </nav>

          <section className="w-full p-8 sm:p-12 rounded-2xl bg-white/70 border border-[var(--color-text-graphite)]/15 shadow-sm flex flex-col items-center text-center gap-6 max-w-2xl mx-auto">
            <span className="font-sans text-[10px] tracking-[0.25em] uppercase px-3 py-1 rounded-full bg-[var(--color-canvas-stone)] text-[var(--color-text-graphite)] border border-[var(--color-text-graphite)]/20">
              Next Milestone &bull; Phase LP2D Preparation
            </span>

            <div className="flex flex-col gap-2">
              <h1 className="font-serif text-2xl sm:text-3xl text-[var(--color-text-ink)] font-normal">
                Final Publication Review
              </h1>
              <p className="font-serif italic text-sm text-[var(--color-text-graphite)] leading-relaxed">
                Step 4 will provide the final review checkpoint, author privacy controls, and secure private edition preservation before listing.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200/80 text-amber-900 text-xs font-sans text-left leading-relaxed">
              <strong>Publication Status:</strong> Publication has not yet been finalized. Your manuscript edits, bookstore image, and story preview are safely preserved in your private publishing draft.
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => router.push(`/profile/legacy-publisher?pubDraftId=${encodeURIComponent(pubDraftId)}&step=3`)}
                className="py-2.5 px-6 rounded-full border border-[var(--color-text-graphite)]/25 text-[var(--color-text-ink)] hover:bg-white font-sans text-xs tracking-[0.16em] uppercase transition-colors focus:outline-none"
              >
                &larr; Return to Story Preview
              </button>
              <button
                type="button"
                onClick={() => router.push(`/profile/digital-library?bookId=${encodeURIComponent(draft.sourceVolumeId)}`)}
                className="py-2.5 px-6 rounded-full bg-[var(--color-text-ink)] text-[var(--color-canvas-linen)] hover:bg-[var(--color-text-ink)]/90 font-sans text-xs tracking-[0.16em] uppercase transition-all focus:outline-none shadow-sm"
              >
                Return to Digital Library
              </button>
            </div>
          </section>
        </div>
      )}

      {stepParam !== '2' && stepParam !== '3' && stepParam !== '4' && (
        <BookstoreImageStep draft={draft} pubDraftId={pubDraftId} onDraftUpdate={setDraft} />
      )}
    </main>
  );
}

export default function LegacyPublisherPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen w-full bg-[var(--color-canvas-linen)] flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-[var(--color-accent-clay)] border-t-transparent animate-spin"></div>
        </main>
      }
    >
      <LegacyPublisherContent />
    </Suspense>
  );
}
