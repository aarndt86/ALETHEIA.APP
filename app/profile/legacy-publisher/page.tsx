'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { PublishingDraft } from '@/lib/publishingData';
import { BookstoreImageStep } from '@/components/publisher/BookstoreImageStep';

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
      {stepParam === '2' ? (
        <BookstoreImageStep draft={draft} pubDraftId={pubDraftId} onDraftUpdate={setDraft} />
      ) : (
        /* Fallback for other steps if accessed */
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
