'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { PublishingDraft } from '@/lib/publishingData';
import { BookstoreImageStep } from '@/components/publisher/BookstoreImageStep';
import { StoryPreviewStep } from '@/components/publisher/StoryPreviewStep';
import { FinalReviewStep } from '@/components/publisher/FinalReviewStep';
import { MyPublicationsView } from '@/components/publisher/MyPublicationsView';
import { PublicationReader } from '@/components/publisher/PublicationReader';

function LegacyPublisherContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const pubDraftId = searchParams.get('pubDraftId');
  const stepParam = searchParams.get('step') || '2';
  const publicationIdParam = searchParams.get('publicationId');
  const editionIdParam = searchParams.get('editionId');
  const isReadingMode = searchParams.get('read') === '1' || Boolean(publicationIdParam && editionIdParam);

  const [draft, setDraft] = useState<PublishingDraft | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(pubDraftId));
  const [loadError, setLoadError] = useState<string | null>(null);

  // Load publishing draft only when pubDraftId is present
  useEffect(() => {
    let isMounted = true;

    async function loadPublishingDraft() {
      if (!pubDraftId) {
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

  // Mode 1: Preserved Publication Reader
  if (isReadingMode && publicationIdParam) {
    return (
      <PublicationReader
        publicationId={publicationIdParam}
        initialEditionId={editionIdParam || undefined}
        onBackToLibrary={() => router.push('/profile/legacy-publisher')}
      />
    );
  }

  // Mode 2: Loading State for Draft
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

  // Mode 3: Draft Load Error
  if (loadError || (pubDraftId && !draft)) {
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
            onClick={() => router.push('/profile/legacy-publisher')}
            className="mt-2 py-2.5 px-6 rounded-full bg-[var(--color-text-ink)] text-[var(--color-canvas-linen)] font-sans text-xs tracking-[0.16em] uppercase hover:bg-[var(--color-text-ink)]/90 transition-all focus:outline-none cursor-pointer"
          >
            &larr; Return to My Publications
          </button>
        </div>
      </main>
    );
  }

  // Mode 4: No draft specified -> Render My Publications Library Workspace
  if (!pubDraftId || !draft) {
    return (
      <main className="min-h-screen w-full bg-[var(--color-canvas-linen)] text-[var(--color-text-ink)] selection:bg-[var(--color-canvas-stone)]">
        <MyPublicationsView
          onReadEdition={(publicationId, editionId) => {
            router.push(`/profile/legacy-publisher?publicationId=${encodeURIComponent(publicationId)}&editionId=${encodeURIComponent(editionId)}&read=1`);
          }}
        />
      </main>
    );
  }

  // Mode 5: Active 4-Step Publishing Preparation Journey
  return (
    <main className="min-h-screen w-full bg-[var(--color-canvas-linen)] text-[var(--color-text-ink)] selection:bg-[var(--color-canvas-stone)]">
      {stepParam === '2' && (
        <BookstoreImageStep draft={draft} pubDraftId={pubDraftId} onDraftUpdate={setDraft} />
      )}

      {stepParam === '3' && (
        <StoryPreviewStep draft={draft} pubDraftId={pubDraftId} onDraftUpdate={setDraft} />
      )}

      {stepParam === '4' && (
        <FinalReviewStep draft={draft} pubDraftId={pubDraftId} onDraftUpdate={setDraft} />
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
