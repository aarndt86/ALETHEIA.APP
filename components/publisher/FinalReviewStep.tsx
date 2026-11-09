'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PublishingDraft, PreservedPublicationEdition, PublishingRightsConfirmations } from '@/lib/publishingData';

interface FinalReviewStepProps {
  draft: PublishingDraft;
  pubDraftId: string;
  onDraftUpdate: (updated: PublishingDraft) => void;
}

export function FinalReviewStep({ draft, pubDraftId, onDraftUpdate }: FinalReviewStepProps) {
  const router = useRouter();

  // Public author name / pen name state (defaults to draft authorDisplayName)
  const [authorDisplayName, setAuthorDisplayName] = useState(draft.authorDisplayName || '');

  // Privacy & Rights Confirmations state
  const [confirmations, setConfirmations] = useState<PublishingRightsConfirmations>({
    personalInfoReviewed: Boolean(draft.rightsConfirmations?.personalInfoReviewed),
    intellectualPropertyConfirmed: Boolean(draft.rightsConfirmations?.intellectualPropertyConfirmed),
    thirdPartyPermissionsConfirmed: Boolean(draft.rightsConfirmations?.thirdPartyPermissionsConfirmed),
    confirmedAt: draft.rightsConfirmations?.confirmedAt || ''
  });

  const [isPreserving, setIsPreserving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [preservedEdition, setPreservedEdition] = useState<PreservedPublicationEdition | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);

  // Automatically load existing preserved edition if draft was already preserved
  React.useEffect(() => {
    if (draft.latestPreservedEditionId && !preservedEdition) {
      fetch(`/api/volume/publishing/edition?publicationId=${encodeURIComponent(draft.publicationId)}&editionId=${encodeURIComponent(draft.latestPreservedEditionId)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.edition) {
            setPreservedEdition(data.edition);
          }
        })
        .catch(() => {});
    }
  }, [draft.latestPreservedEditionId, draft.publicationId]);

  // Compute manuscript statistics
  const totalWordCount = (draft.chapters || []).reduce((acc, chap) => {
    return acc + (chap.paragraphs || []).reduce((pAcc, p) => {
      return pAcc + (p.text ? p.text.trim().split(/\s+/).filter(Boolean).length : 0);
    }, 0);
  }, 0);

  // Validation rules
  const hasApprovedArtwork = Boolean(draft.bookstoreImage && draft.bookstoreImage.isApproved);
  const hasValidVideoChoice = draft.videoChoice === 'none' || (draft.videoChoice === 'included' && Boolean(draft.authorVideo?.isApproved));
  const hasChapters = (draft.chapters || []).length > 0;
  const hasAuthorName = authorDisplayName.trim().length > 0;
  const allConfirmationsChecked =
    confirmations.personalInfoReviewed &&
    confirmations.intellectualPropertyConfirmed &&
    confirmations.thirdPartyPermissionsConfirmed;

  const canPreserve =
    hasApprovedArtwork &&
    hasValidVideoChoice &&
    hasChapters &&
    hasAuthorName &&
    allConfirmationsChecked &&
    !isPreserving;

  // Preservation submission handler
  const handlePreserve = async () => {
    if (!canPreserve) return;
    setIsPreserving(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/volume/publishing/edition/preserve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pubDraftId,
          authorDisplayName: authorDisplayName.trim(),
          rightsConfirmations: {
            ...confirmations,
            confirmedAt: new Date().toISOString()
          }
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to preserve publication edition in vault.');
      }

      setPreservedEdition(data.preservedEdition);

      // Update parent draft state
      onDraftUpdate({
        ...draft,
        authorDisplayName: authorDisplayName.trim(),
        rightsConfirmations: data.preservedEdition.rightsConfirmations,
        latestPreservedEditionId: data.preservedEdition.publicationEditionId,
        currentStep: 4,
        isDirty: false
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred during preservation.';
      setErrorMessage(msg);
    } finally {
      setIsPreserving(false);
    }
  };

  const handleCopyHash = (hash: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(hash);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    }
  };

  // POST-PRESERVATION CONFIRMATION VIEW
  if (preservedEdition) {
    return (
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 flex flex-col gap-8">
        {/* Stepper Navigation */}
        <nav aria-label="Publishing Progress" className="w-full flex items-center justify-between border-b border-[var(--color-text-graphite)]/15 pb-4">
          <span className="font-sans text-xs tracking-[0.16em] uppercase text-[var(--color-accent-clay)] font-semibold">
            Archival Complete
          </span>
          <div className="flex items-center gap-6 font-sans text-[11px] tracking-[0.2em] uppercase">
            <span className="text-emerald-700 font-semibold">
              Preserved in Vault
            </span>
          </div>
        </nav>

        {/* Confirmation Container */}
        <section className="w-full p-8 sm:p-12 rounded-3xl bg-white border border-[var(--color-text-graphite)]/15 shadow-sm flex flex-col items-center text-center gap-8 max-w-3xl mx-auto">
          {/* Status Badge */}
          <div className="flex flex-col items-center gap-3">
            <span className="font-sans text-[10px] tracking-[0.25em] uppercase px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium">
              Preserved Private Edition &bull; Edition v{preservedEdition.version}
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl text-[var(--color-text-ink)] font-normal tracking-tight">
              Publication Preserved in Private Vault
            </h1>
            <p className="font-serif italic text-base text-[var(--color-text-graphite)] max-w-xl leading-relaxed">
              Your independent publication edition of &ldquo;{preservedEdition.bookTitle}&rdquo; has been sealed and securely archived in your private vault.
            </p>
          </div>

          {/* CRITICAL ARCHITECTURAL BOUNDARY CALLOUT */}
          <div className="w-full p-5 rounded-2xl bg-[var(--color-canvas-linen)] border border-[var(--color-accent-clay)]/30 text-left flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
              <span className="font-sans text-xs font-semibold uppercase tracking-wider text-[var(--color-text-ink)]">
                Private Vault Guarantee &bull; Not Publicly Listed
              </span>
            </div>
            <p className="font-sans text-xs text-[var(--color-text-graphite)] leading-relaxed">
              This publication edition is preserved strictly in your private vault (<code className="font-mono text-[11px] text-[var(--color-text-ink)]">.data/vault/{preservedEdition.memberId}/publications/{preservedEdition.publicationId}/editions/</code>). It has <strong>NOT</strong> been released to the public, published, or listed in the Legacy Bookstore. It cannot be accessed by external readers without separate, explicit listing authorization.
            </p>
          </div>

          {/* Archival Metadata Summary Grid */}
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4 text-left font-sans text-xs">
            <div className="p-4 rounded-xl bg-[var(--color-canvas-stone)]/40 border border-[var(--color-text-graphite)]/10 flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-graphite)]/70">Edition Identifier</span>
              <span className="font-mono text-[var(--color-text-ink)] font-medium break-all">{preservedEdition.publicationEditionId}</span>
            </div>
            <div className="p-4 rounded-xl bg-[var(--color-canvas-stone)]/40 border border-[var(--color-text-graphite)]/10 flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-graphite)]/70">Preserved Timestamp</span>
              <span className="text-[var(--color-text-ink)] font-medium">{new Date(preservedEdition.preservedAt).toLocaleString()}</span>
            </div>
            <div className="p-4 rounded-xl bg-[var(--color-canvas-stone)]/40 border border-[var(--color-text-graphite)]/10 flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-graphite)]/70">Public Author / Pen Name</span>
              <span className="text-[var(--color-text-ink)] font-medium">{preservedEdition.authorDisplayName}</span>
            </div>
            <div className="p-4 rounded-xl bg-[var(--color-canvas-stone)]/40 border border-[var(--color-text-graphite)]/10 flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-graphite)]/70">Derived From Volume</span>
              <span className="text-[var(--color-text-ink)] font-medium">Volume {preservedEdition.sourceVolumeId} (Private Edition v{preservedEdition.sourcePrivateEditionVersion})</span>
            </div>
            <div className="p-4 rounded-xl bg-[var(--color-canvas-stone)]/40 border border-[var(--color-text-graphite)]/10 flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-graphite)]/70">Manuscript Scope</span>
              <span className="text-[var(--color-text-ink)] font-medium">{preservedEdition.totalWordCount.toLocaleString()} words &bull; {preservedEdition.chapterCount} chapters</span>
            </div>
            <div className="p-4 rounded-xl bg-[var(--color-canvas-stone)]/40 border border-[var(--color-text-graphite)]/10 flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-graphite)]/70">Story Preview Status</span>
              <span className="text-[var(--color-text-ink)] font-medium">
                {preservedEdition.videoChoice === 'included' ? 'Author Showcase Video Included' : 'No Video (Skipped)'}
              </span>
            </div>
          </div>

          {/* SHA-256 Fingerprint */}
          <div className="w-full p-4 rounded-xl bg-[var(--color-canvas-stone)]/60 border border-[var(--color-text-graphite)]/15 text-left flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-sans text-[10px] uppercase tracking-wider text-[var(--color-text-graphite)]/80 font-semibold">
                Cryptographic SHA-256 Content Fingerprint
              </span>
              <button
                type="button"
                onClick={() => handleCopyHash(preservedEdition.contentHash)}
                className="font-sans text-[10px] tracking-wider uppercase text-[var(--color-accent-clay)] hover:underline focus:outline-none"
              >
                {copyFeedback ? 'Copied Fingerprint' : 'Copy Hash'}
              </button>
            </div>
            <code className="font-mono text-xs text-[var(--color-text-ink)] break-all select-all">
              {preservedEdition.contentHash}
            </code>
          </div>

          {/* Navigation Actions */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4 border-t border-[var(--color-text-graphite)]/15 w-full">
            <button
              type="button"
              onClick={() => router.push('/profile/legacy-publisher')}
              className="py-3 px-8 rounded-full bg-[var(--color-text-ink)] text-[var(--color-canvas-linen)] hover:bg-[var(--color-text-ink)]/90 font-sans text-xs tracking-[0.18em] uppercase transition-all focus:outline-none shadow-sm cursor-pointer"
            >
              Go to My Publications &rarr;
            </button>
            <button
              type="button"
              onClick={() => setPreservedEdition(null)}
              className="py-3 px-6 rounded-full border border-[var(--color-text-graphite)]/25 text-[var(--color-text-graphite)] hover:text-[var(--color-text-ink)] hover:bg-[var(--color-canvas-stone)]/30 font-sans text-xs tracking-[0.16em] uppercase transition-colors focus:outline-none"
            >
              Back to Review Form
            </button>
          </div>
        </section>
      </div>
    );
  }

  // STANDARD STEP 4 FINAL REVIEW VIEW
  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 flex flex-col gap-8">
      {/* Top Stepper Navigation */}
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

      {/* Header */}
      <header className="flex flex-col gap-2 max-w-3xl">
        <span className="font-sans text-[11px] tracking-[0.25em] uppercase text-[var(--color-accent-clay)] font-semibold">
          Legacy Publisher &bull; Step 4 of 4
        </span>
        <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl text-[var(--color-text-ink)] font-normal tracking-tight">
          Final Publication Review
        </h1>
        <p className="font-serif italic text-sm sm:text-base text-[var(--color-text-graphite)] leading-relaxed">
          Review your manuscript, bookstore artwork, story preview, and author pen name. When satisfied, preserve an immutable edition in your private vault.
        </p>
      </header>

      {/* Notifications */}
      {errorMessage && (
        <div className="w-full p-4 rounded-lg bg-red-50/80 border border-red-200 text-red-800 text-xs sm:text-sm font-sans flex items-start justify-between gap-4">
          <span>{errorMessage}</span>
          <button type="button" onClick={() => setErrorMessage(null)} className="font-bold hover:opacity-75 focus:outline-none">&times;</button>
        </div>
      )}

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Left Column: Review Sections & Legal Confirmations (col-span-7) */}
        <section className="lg:col-span-7 flex flex-col gap-6">
          {/* Section 1: Manuscript & Chapters */}
          <div className="p-6 sm:p-7 rounded-2xl bg-white/70 border border-[var(--color-text-graphite)]/15 shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[var(--color-text-graphite)]/10 pb-3">
              <span className="font-sans text-[10px] tracking-[0.25em] uppercase text-[var(--color-accent-clay)] font-semibold">
                1. Manuscript Specification
              </span>
              <button
                type="button"
                onClick={() => router.push(`/profile/volume-editor/editor?pubDraftId=${encodeURIComponent(pubDraftId)}&edit=1`)}
                className="font-sans text-[11px] tracking-wider uppercase text-[var(--color-text-ink)] hover:text-[var(--color-accent-clay)] hover:underline focus:outline-none"
              >
                Edit Manuscript &rarr;
              </button>
            </div>

            <div className="flex flex-col gap-1">
              <h3 className="font-serif text-xl text-[var(--color-text-ink)] font-normal">
                {draft.bookTitle || 'Untitled Publication'}
              </h3>
              {draft.subtitle && (
                <p className="font-serif italic text-xs text-[var(--color-text-graphite)]">
                  {draft.subtitle}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 text-xs font-sans">
              <div className="p-3 rounded-lg bg-[var(--color-canvas-stone)]/40 border border-[var(--color-text-graphite)]/10">
                <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-graphite)]/70 block">Chapters</span>
                <span className="font-medium text-[var(--color-text-ink)] font-mono">{draft.chapters?.length || 0} preserved</span>
              </div>
              <div className="p-3 rounded-lg bg-[var(--color-canvas-stone)]/40 border border-[var(--color-text-graphite)]/10">
                <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-graphite)]/70 block">Total Word Count</span>
                <span className="font-medium text-[var(--color-text-ink)] font-mono">{totalWordCount.toLocaleString()} words</span>
              </div>
            </div>

            {/* Chapter list summary */}
            <div className="flex flex-col gap-1.5 pt-2">
              <span className="font-sans text-[10px] uppercase tracking-wider text-[var(--color-text-graphite)]/70">
                Included Chapters
              </span>
              <div className="max-h-36 overflow-y-auto divide-y divide-[var(--color-text-graphite)]/10 text-xs font-serif text-[var(--color-text-graphite)]">
                {(draft.chapters || []).map((c) => (
                  <div key={c.id || c.number} className="py-1.5 flex items-center justify-between">
                    <span>Chapter {c.number}: {c.title}</span>
                    <span className="font-sans text-[10px] font-mono text-[var(--color-text-graphite)]/60">
                      {(c.paragraphs || []).reduce((sum, p) => sum + (p.text?.trim().split(/\s+/).filter(Boolean).length || 0), 0)} words
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section 2: Story Preview Status */}
          <div className="p-6 sm:p-7 rounded-2xl bg-white/70 border border-[var(--color-text-graphite)]/15 shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[var(--color-text-graphite)]/10 pb-3">
              <span className="font-sans text-[10px] tracking-[0.25em] uppercase text-[var(--color-accent-clay)] font-semibold">
                2. Story Preview Video
              </span>
              <button
                type="button"
                onClick={() => router.push(`/profile/legacy-publisher?pubDraftId=${encodeURIComponent(pubDraftId)}&step=3`)}
                className="font-sans text-[11px] tracking-wider uppercase text-[var(--color-text-ink)] hover:text-[var(--color-accent-clay)] hover:underline focus:outline-none"
              >
                Change Video &rarr;
              </button>
            </div>

            {draft.videoChoice === 'included' && draft.authorVideo ? (
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="w-full sm:w-44 aspect-video rounded-lg bg-black overflow-hidden relative shadow-sm shrink-0">
                  <video
                    src={draft.authorVideo.storagePath}
                    controls
                    playsInline
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex flex-col gap-1.5 text-xs font-sans">
                  <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider w-fit">
                    Showcase Video Approved
                  </span>
                  <span className="text-[var(--color-text-graphite)]">
                    Duration: <strong className="font-mono text-[var(--color-text-ink)]">{draft.authorVideo.durationSeconds}s</strong> (max 30.0s)
                  </span>
                  <span className="text-[var(--color-text-graphite)]">
                    Recorded/Uploaded: {new Date(draft.authorVideo.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ) : draft.videoChoice === 'none' ? (
              <div className="p-4 rounded-xl bg-[var(--color-canvas-stone)]/40 border border-[var(--color-text-graphite)]/10 flex items-center justify-between">
                <div className="flex flex-col gap-0.5">
                  <span className="font-sans text-xs font-medium text-[var(--color-text-ink)]">
                    No Video &bull; Story Preview Skipped
                  </span>
                  <span className="font-serif italic text-xs text-[var(--color-text-graphite)]">
                    Your digital bookstore listing will be presented without an author video.
                  </span>
                </div>
                <span className="text-[10px] font-sans uppercase tracking-wider text-[var(--color-text-graphite)]/70 bg-white/70 px-2.5 py-1 rounded-full border border-[var(--color-text-graphite)]/15">
                  Skipped
                </span>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-sans">
                You have not yet made a choice on Step 3 (Story Preview). Please return to Step 3 to include or skip video.
              </div>
            )}
          </div>

          {/* Section 3: Author Public Display Name / Pen Name */}
          <div className="p-6 sm:p-7 rounded-2xl bg-white/70 border border-[var(--color-text-graphite)]/15 shadow-sm flex flex-col gap-4">
            <span className="font-sans text-[10px] tracking-[0.25em] uppercase text-[var(--color-accent-clay)] font-semibold border-b border-[var(--color-text-graphite)]/10 pb-3">
              3. Author Public Identity &amp; Pen Name
            </span>

            <div className="flex flex-col gap-2">
              <label htmlFor="author-display-name-input" className="font-sans text-xs font-medium text-[var(--color-text-ink)]">
                Storefront Display Name
              </label>
              <input
                id="author-display-name-input"
                type="text"
                value={authorDisplayName}
                onChange={(e) => setAuthorDisplayName(e.target.value)}
                placeholder="e.g. S. M. Jenkins or Jane Doe"
                className="w-full p-3 rounded-lg border border-[var(--color-text-graphite)]/25 bg-white text-sm font-serif text-[var(--color-text-ink)] focus:outline-none focus:border-[var(--color-accent-clay)] transition-colors"
              />
              <p className="font-serif italic text-xs text-[var(--color-text-graphite)] leading-relaxed">
                This is the author name that will be displayed on the digital bookstore listing. You may use a pen name or your preferred professional signature.
              </p>
            </div>
          </div>

          {/* Section 4: Author Rights, Privacy & Consent Confirmations */}
          <div className="p-6 sm:p-7 rounded-2xl bg-white/70 border border-[var(--color-text-graphite)]/15 shadow-sm flex flex-col gap-5">
            <div className="flex flex-col gap-1 border-b border-[var(--color-text-graphite)]/10 pb-3">
              <span className="font-sans text-[10px] tracking-[0.25em] uppercase text-[var(--color-accent-clay)] font-semibold">
                4. Rights &amp; Privacy Confirmations
              </span>
              <p className="font-serif italic text-xs text-[var(--color-text-graphite)]">
                All three acknowledgments are required before preserving your publication in the vault.
              </p>
            </div>

            <div className="flex flex-col gap-4">
              {/* Checkbox 1: Personal Info Reviewed */}
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={confirmations.personalInfoReviewed}
                  onChange={(e) =>
                    setConfirmations((prev) => ({ ...prev, personalInfoReviewed: e.target.checked }))
                  }
                  className="mt-1 h-4 w-4 rounded border-[var(--color-text-graphite)]/30 text-[var(--color-accent-clay)] focus:ring-[var(--color-accent-clay)] shrink-0"
                />
                <span className="font-sans text-xs text-[var(--color-text-ink)] group-hover:text-black leading-relaxed">
                  <strong>Personal &amp; Family Privacy:</strong> I have reviewed my manuscript and confirm that any personal, family, or sensitive information included is intended for public readership.
                </span>
              </label>

              {/* Checkbox 2: Intellectual Property */}
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={confirmations.intellectualPropertyConfirmed}
                  onChange={(e) =>
                    setConfirmations((prev) => ({ ...prev, intellectualPropertyConfirmed: e.target.checked }))
                  }
                  className="mt-1 h-4 w-4 rounded border-[var(--color-text-graphite)]/30 text-[var(--color-accent-clay)] focus:ring-[var(--color-accent-clay)] shrink-0"
                />
                <span className="font-sans text-xs text-[var(--color-text-ink)] group-hover:text-black leading-relaxed">
                  <strong>Intellectual Property:</strong> I confirm that I own or hold all necessary intellectual property rights to publish this volume, its stories, and all incorporated materials.
                </span>
              </label>

              {/* Checkbox 3: Third Party Permissions */}
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={confirmations.thirdPartyPermissionsConfirmed}
                  onChange={(e) =>
                    setConfirmations((prev) => ({ ...prev, thirdPartyPermissionsConfirmed: e.target.checked }))
                  }
                  className="mt-1 h-4 w-4 rounded border-[var(--color-text-graphite)]/30 text-[var(--color-accent-clay)] focus:ring-[var(--color-accent-clay)] shrink-0"
                />
                <span className="font-sans text-xs text-[var(--color-text-ink)] group-hover:text-black leading-relaxed">
                  <strong>Third-Party Permissions:</strong> I confirm that I have obtained all necessary permissions from identifiable living individuals and rights-holders of any referenced media.
                </span>
              </label>
            </div>
          </div>

          {/* CRITICAL ARCHITECTURAL BOUNDARY CALLOUT */}
          <div className="w-full p-5 rounded-2xl bg-[var(--color-canvas-stone)]/60 border border-[var(--color-accent-clay)]/30 text-left flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--color-accent-clay)]"></span>
              <span className="font-sans text-xs font-semibold uppercase tracking-wider text-[var(--color-text-ink)]">
                Preserve My Publication !== Publish to Bookstore
              </span>
            </div>
            <p className="font-sans text-xs text-[var(--color-text-graphite)] leading-relaxed">
              Preserving this publication archives an immutable edition in your private vault. It will <strong>NOT</strong> be released to the public or listed in the Legacy Bookstore without separate explicit authorization.
            </p>
          </div>

          {/* Preservation Action Button */}
          <div className="flex flex-col gap-2 pt-2">
            <button
              type="button"
              onClick={handlePreserve}
              disabled={!canPreserve}
              title={
                !canPreserve
                  ? 'Please ensure manuscript is ready, bookstore artwork is approved, author name is filled, and all 3 confirmations are checked'
                  : 'Preserve immutable publication edition in private vault'
              }
              className={`w-full py-3.5 px-6 rounded-full font-sans text-xs tracking-[0.18em] uppercase transition-all duration-200 active:scale-[0.99] focus:outline-none shadow-md ${
                canPreserve
                  ? 'bg-[var(--color-text-ink)] text-[var(--color-canvas-linen)] hover:bg-[var(--color-text-ink)]/90 cursor-pointer'
                  : 'bg-[var(--color-text-ink)]/30 text-white cursor-not-allowed'
              }`}
            >
              {isPreserving ? 'Preserving Edition in Private Vault...' : 'Preserve My Publication'}
            </button>

            {!canPreserve && (
              <span className="font-sans text-[10px] text-center text-[var(--color-text-graphite)]/70">
                {!hasApprovedArtwork && 'Bookstore artwork required &bull; '}
                {!hasValidVideoChoice && 'Story preview choice required &bull; '}
                {!hasAuthorName && 'Author display name required &bull; '}
                {!allConfirmationsChecked && 'All 3 rights confirmations required'}
              </span>
            )}
          </div>
        </section>

        {/* Right Column: Digital Bookstore Listing Live Preview (col-span-5) */}
        <aside className="lg:col-span-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="font-sans text-[10px] tracking-[0.25em] uppercase text-[var(--color-text-graphite)] font-semibold">
              Digital Storefront Listing Preview
            </span>
            <button
              type="button"
              onClick={() => router.push(`/profile/legacy-publisher?pubDraftId=${encodeURIComponent(pubDraftId)}&step=2`)}
              className="font-sans text-[9px] tracking-[0.18em] uppercase text-[var(--color-accent-clay)] hover:underline focus:outline-none"
            >
              Replace Artwork &rarr;
            </button>
          </div>

          {/* Bookstore Listing Card (Decoupled Artwork + Storefront Typography) */}
          <div className="w-full bg-[var(--color-canvas-linen)] border border-[var(--color-text-graphite)]/15 rounded-2xl p-6 sm:p-7 flex flex-col items-center gap-6 shadow-sm">
            {/* Archival Storefront Header Badge */}
            <div className="w-full flex items-center justify-between border-b border-[var(--color-text-graphite)]/10 pb-3">
              <span className="font-sans text-[9px] tracking-[0.25em] uppercase text-[var(--color-text-graphite)]/80">
                Altheara Legacy Bookstore
              </span>
              <span className="font-sans text-[8px] tracking-[0.2em] uppercase text-[var(--color-accent-clay)] font-medium">
                eBook Edition
              </span>
            </div>

            {/* The Artwork Plate Container (Portrait aspect ratio 3:4) */}
            <div className="w-full max-w-[280px] sm:max-w-[320px] aspect-[3/4] relative rounded-lg overflow-hidden shadow-lg border border-[var(--color-text-graphite)]/15 bg-[var(--color-canvas-stone)] flex items-center justify-center group">
              {draft.bookstoreImage?.storagePath ? (
                /* Authenticated Artwork Image Stream */
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={draft.bookstoreImage.storagePath}
                  alt={draft.bookTitle || 'Bookstore Artwork'}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                />
              ) : (
                <div className="p-6 text-center flex flex-col items-center justify-center gap-2">
                  <span className="font-serif italic text-xs text-[var(--color-text-graphite)]/70">
                    No approved artwork
                  </span>
                </div>
              )}
            </div>

            {/* Decoupled Storefront Typographic Metadata */}
            <div className="w-full flex flex-col items-center text-center gap-1.5 pt-2 border-t border-[var(--color-text-graphite)]/10">
              <h2 className="font-serif text-xl sm:text-2xl text-[var(--color-text-ink)] font-medium tracking-tight">
                {draft.bookTitle || 'Untitled Publication'}
              </h2>
              {draft.subtitle && (
                <p className="font-serif italic text-xs sm:text-sm text-[var(--color-text-graphite)]">
                  {draft.subtitle}
                </p>
              )}
              <span className="font-sans text-[11px] tracking-[0.22em] uppercase text-[var(--color-accent-clay)] font-semibold mt-1">
                by {authorDisplayName.trim() || draft.authorDisplayName || 'Author'}
              </span>

              <div className="mt-3 pt-3 w-full flex items-center justify-between text-[9px] font-sans text-[var(--color-text-graphite)]/60 border-t border-[var(--color-text-graphite)]/10">
                <span>Derived from Volume {draft.sourceVolumeId} (v{draft.sourceEditionVersion})</span>
                <span>Altheara Vault Edition</span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Footer Navigation */}
      <footer className="w-full flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-[var(--color-text-graphite)]/15">
        <button
          type="button"
          onClick={() => router.push(`/profile/legacy-publisher?pubDraftId=${encodeURIComponent(pubDraftId)}&step=3`)}
          className="py-2.5 px-5 rounded-full border border-[var(--color-text-graphite)]/25 text-[var(--color-text-ink)] hover:bg-white font-sans text-xs tracking-[0.16em] uppercase transition-colors focus:outline-none"
        >
          &larr; Return to Story Preview
        </button>

        <button
          type="button"
          onClick={() => router.push('/profile/legacy-publisher')}
          className="py-2.5 px-5 rounded-full border border-[var(--color-text-graphite)]/25 text-[var(--color-text-graphite)] hover:text-[var(--color-text-ink)] hover:bg-white font-sans text-xs tracking-[0.16em] uppercase transition-colors focus:outline-none"
        >
          Save Draft &amp; Return to My Publications
        </button>
      </footer>
    </div>
  );
}
