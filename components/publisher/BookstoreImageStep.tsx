'use client';

import React, { useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PublishingDraft, BookstoreImageConfig } from '@/lib/publishingData';

interface BookstoreImageStepProps {
  draft: PublishingDraft;
  pubDraftId: string;
  onDraftUpdate: (updated: PublishingDraft) => void;
}

export function BookstoreImageStep({ draft, pubDraftId, onDraftUpdate }: BookstoreImageStepProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialTab = searchParams?.get('tab') === 'ai' ? 'ai' : 'upload';
  const [activeTab, setActiveTab] = useState<'upload' | 'ai'>(initialTab);
  const [isUploading, setIsUploading] = useState(false);
  const [isSavingApproval, setIsSavingApproval] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Active bookstore image config from draft
  const currentImage: BookstoreImageConfig | undefined = draft.bookstoreImage;

  // Handle file selection and upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('imageFile', file);
      formData.append('pubDraftId', pubDraftId);

      const res = await fetch('/api/volume/publishing/image', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload image artwork.');
      }

      // Automatically attach uploaded image to publishing draft (unapproved until member explicitly approves)
      const updatedConfig: BookstoreImageConfig = {
        assetId: data.asset.assetId,
        source: 'member_upload',
        storagePath: data.asset.storagePath,
        mimeType: data.asset.mimeType,
        width: data.asset.width,
        height: data.asset.height,
        isApproved: false
      };

      // Persist draft with new image config
      const saveRes = await fetch('/api/volume/publishing/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pubDraftId,
          draft: {
            ...draft,
            bookstoreImage: updatedConfig,
            currentStep: 2
          }
        })
      });

      const saveData = await saveRes.json();
      if (!saveRes.ok) {
        throw new Error(saveData.error || 'Failed to update publishing draft with uploaded image.');
      }

      onDraftUpdate(saveData.draft);
      setSuccessMessage(`Artwork uploaded successfully (${data.asset.width} x ${data.asset.height} px). Review the listing preview below and click Approve to finalize.`);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'An error occurred during upload.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle Approve Bookstore Listing Image
  const handleApproveImage = async () => {
    if (!currentImage?.assetId) return;

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSavingApproval(true);

    try {
      const approvedConfig: BookstoreImageConfig = {
        ...currentImage,
        isApproved: true,
        approvedAt: new Date().toISOString()
      };

      const res = await fetch('/api/volume/publishing/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pubDraftId,
          draft: {
            ...draft,
            bookstoreImage: approvedConfig,
            currentStep: 2
          }
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to approve bookstore image.');
      }

      onDraftUpdate(data.draft);
      setSuccessMessage('Bookstore listing image successfully approved and preserved for publication.');
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to approve bookstore image.');
    } finally {
      setIsSavingApproval(false);
    }
  };

  // Handle Revert / Replace Image
  const handleReplaceImage = () => {
    setSuccessMessage(null);
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 flex flex-col gap-8">
      {/* Top Breadcrumb & Step Navigation */}
      <nav aria-label="Publishing Progress" className="w-full flex items-center justify-between border-b border-[var(--color-text-graphite)]/15 pb-4">
        <button
          type="button"
          onClick={() => router.push(`/profile/volume-editor/editor?pubDraftId=${encodeURIComponent(pubDraftId)}&edit=1`)}
          className="group flex items-center gap-2 font-sans text-xs tracking-[0.16em] uppercase text-[var(--color-text-graphite)] hover:text-[var(--color-text-ink)] transition-colors focus:outline-none"
        >
          <span className="group-hover:-translate-x-1 transition-transform duration-200">&larr;</span>
          <span>Return to Manuscript Editor</span>
        </button>

        <div className="hidden sm:flex items-center gap-6 font-sans text-[11px] tracking-[0.2em] uppercase">
          <span className="text-[var(--color-text-graphite)]/60">Step 1: Manuscript</span>
          <span className="text-[var(--color-accent-clay)] font-semibold border-b border-[var(--color-accent-clay)] pb-0.5">Step 2: Bookstore Image</span>
          <span className="text-[var(--color-text-graphite)]/40 cursor-not-allowed" title="Available in Phase LP2C">Step 3: Showcase</span>
          <span className="text-[var(--color-text-graphite)]/40 cursor-not-allowed" title="Available in Phase LP2D">Step 4: Review</span>
        </div>
      </nav>

      {/* Page Title & Mission Statement */}
      <header className="flex flex-col gap-2 max-w-3xl">
        <span className="font-sans text-[11px] tracking-[0.25em] uppercase text-[var(--color-accent-clay)] font-semibold">
          Legacy Publisher &bull; Step 2 of 4
        </span>
        <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl text-[var(--color-text-ink)] font-normal tracking-tight">
          Create My Bookstore Image
        </h1>
        <p className="font-serif italic text-sm sm:text-base text-[var(--color-text-graphite)] leading-relaxed">
          Upload visual artwork for your book. Altheara pairs your artwork with your title and author name in an archival digital bookstore listing.
        </p>
      </header>

      {/* Notifications */}
      {errorMessage && (
        <div className="w-full p-4 rounded-lg bg-red-50/80 border border-red-200 text-red-800 text-xs sm:text-sm font-sans flex items-start justify-between gap-4">
          <span>{errorMessage}</span>
          <button type="button" onClick={() => setErrorMessage(null)} className="font-bold hover:opacity-75 focus:outline-none">&times;</button>
        </div>
      )}

      {successMessage && (
        <div className="w-full p-4 rounded-lg bg-[var(--color-canvas-stone)]/50 border border-[var(--color-accent-clay)]/30 text-[var(--color-text-ink)] text-xs sm:text-sm font-sans flex items-start justify-between gap-4">
          <span>{successMessage}</span>
          <button type="button" onClick={() => setSuccessMessage(null)} className="font-bold hover:opacity-75 focus:outline-none">&times;</button>
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Left Column: Artwork Upload & AI Status (col-span-7) */}
        <section className="lg:col-span-7 flex flex-col gap-6 bg-white/60 p-6 sm:p-8 rounded-2xl border border-[var(--color-text-graphite)]/10 shadow-sm backdrop-blur-sm">
          {/* Mode Selector Tabs */}
          <div className="flex border-b border-[var(--color-text-graphite)]/15 gap-4">
            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`pb-3 font-sans text-xs tracking-[0.18em] uppercase transition-all duration-200 focus:outline-none ${
                activeTab === 'upload'
                  ? 'border-b-2 border-[var(--color-text-ink)] text-[var(--color-text-ink)] font-semibold'
                  : 'text-[var(--color-text-graphite)]/70 hover:text-[var(--color-text-ink)]'
              }`}
            >
              Upload Artwork
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ai')}
              className={`pb-3 font-sans text-xs tracking-[0.18em] uppercase transition-all duration-200 focus:outline-none ${
                activeTab === 'ai'
                  ? 'border-b-2 border-[var(--color-text-ink)] text-[var(--color-text-ink)] font-semibold'
                  : 'text-[var(--color-text-graphite)]/70 hover:text-[var(--color-text-ink)]'
              }`}
            >
              AI Artwork Generation
            </button>
          </div>

          {/* TAB 1: UPLOAD ARTWORK */}
          {activeTab === 'upload' && (
            <div className="flex flex-col gap-6">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="hidden"
                id="bookstore-artwork-input"
              />

              {!currentImage ? (
                /* Empty Upload Dropzone */
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-[var(--color-text-graphite)]/25 hover:border-[var(--color-accent-clay)] p-8 sm:p-12 rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-[var(--color-canvas-linen)]/30 hover:bg-[var(--color-canvas-linen)]/60 group"
                >
                  <div className="w-12 h-12 rounded-full border border-[var(--color-text-graphite)]/20 flex items-center justify-center text-[var(--color-text-graphite)] group-hover:text-[var(--color-accent-clay)] group-hover:border-[var(--color-accent-clay)] transition-colors mb-3">
                    <span className="font-serif text-lg font-light">+</span>
                  </div>
                  <span className="font-serif text-base sm:text-lg text-[var(--color-text-ink)] font-medium mb-1">
                    Select Artwork from Your Device
                  </span>
                  <p className="font-serif italic text-xs sm:text-sm text-[var(--color-text-graphite)] max-w-sm mb-4">
                    Choose a painting, photograph, or illustration to represent your volume in the bookstore.
                  </p>
                  <span className="font-sans text-[10px] tracking-[0.2em] uppercase text-[var(--color-text-graphite)]/60">
                    JPEG &bull; PNG &bull; WebP &bull; Up to 10 MB &bull; Min 400x560 px
                  </span>
                </div>
              ) : (
                /* Uploaded Artwork Details & Actions */
                <div className="flex flex-col gap-5 p-5 sm:p-6 rounded-xl bg-[var(--color-canvas-linen)]/40 border border-[var(--color-text-graphite)]/15">
                  <div className="flex items-center justify-between">
                    <span className="font-sans text-[10px] tracking-[0.22em] uppercase text-[var(--color-text-graphite)] font-medium">
                      Source Artwork Details
                    </span>
                    <span
                      className={`font-sans text-[10px] tracking-[0.16em] uppercase px-2.5 py-1 rounded-full ${
                        currentImage.isApproved
                          ? 'bg-emerald-100/90 text-emerald-800 border border-emerald-300'
                          : 'bg-amber-100/90 text-amber-800 border border-amber-300'
                      }`}
                    >
                      {currentImage.isApproved ? 'Approved for Bookstore' : 'Pending Member Approval'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-sans text-[var(--color-text-graphite)]">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-graphite)]/60">Dimensions</span>
                      <span className="font-mono text-[var(--color-text-ink)] font-medium">{currentImage.width} x {currentImage.height} px</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-graphite)]/60">Format</span>
                      <span className="uppercase font-mono text-[var(--color-text-ink)] font-medium">{currentImage.mimeType.replace('image/', '')}</span>
                    </div>
                    <div className="flex flex-col col-span-2 sm:col-span-1">
                      <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-graphite)]/60">Source</span>
                      <span className="capitalize text-[var(--color-text-ink)] font-medium">{currentImage.source.replace('_', ' ')}</span>
                    </div>
                  </div>

                  {/* Artwork Approval & Replacement Controls */}
                  <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-[var(--color-text-graphite)]/10">
                    {!currentImage.isApproved ? (
                      <button
                        type="button"
                        onClick={handleApproveImage}
                        disabled={isSavingApproval}
                        className="py-2.5 px-6 rounded-full bg-[var(--color-text-ink)] text-[var(--color-canvas-linen)] hover:bg-[var(--color-text-ink)]/90 font-sans text-xs tracking-[0.18em] uppercase transition-all duration-200 active:scale-[0.98] focus:outline-none shadow-sm disabled:opacity-50"
                      >
                        {isSavingApproval ? 'Preserving Approval...' : 'Approve Bookstore Listing Image'}
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 text-xs font-sans text-emerald-800 font-medium">
                        <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                        <span>Artwork approved &bull; Ready for digital catalog</span>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleReplaceImage}
                      disabled={isUploading}
                      className="py-2 px-4 rounded-full border border-[var(--color-text-graphite)]/25 text-[var(--color-text-ink)] hover:bg-white font-sans text-xs tracking-[0.16em] uppercase transition-colors focus:outline-none disabled:opacity-50"
                    >
                      {isUploading ? 'Uploading...' : 'Replace Artwork'}
                    </button>
                  </div>
                </div>
              )}

              {/* Upload Guidelines Callout */}
              <div className="flex flex-col gap-1 text-[11px] font-sans text-[var(--color-text-graphite)]/80 leading-relaxed border-l-2 border-[var(--color-accent-clay)]/40 pl-3">
                <p>
                  <strong>Digital Decoupling:</strong> Your uploaded artwork is stored in its original aspect ratio. Title and author display name are rendered dynamically on the storefront listing, preserving the visual art unchanged.
                </p>
                <p>
                  <strong>Security & Immutability:</strong> The asset is encrypted and isolated within your private member vault. Approval does not modify your historical editions.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: AI ARTWORK GENERATION (Real Status & Pending Integration Notice) */}
          {activeTab === 'ai' && (
            <div className="flex flex-col gap-5 p-6 rounded-xl bg-[var(--color-canvas-linen)]/50 border border-[var(--color-text-graphite)]/15">
              <div className="flex items-center justify-between">
                <span className="font-sans text-[10px] tracking-[0.22em] uppercase text-[var(--color-text-graphite)] font-medium">
                  AI Artwork Generation Status
                </span>
                <span className="font-sans text-[10px] tracking-[0.16em] uppercase px-2.5 py-1 rounded-full bg-slate-200 text-slate-700 border border-slate-300">
                  Provider Not Configured
                </span>
              </div>

              <div className="flex flex-col gap-2">
                <h3 className="font-serif text-lg text-[var(--color-text-ink)] font-normal">
                  Real AI Generation Integration Pending
                </h3>
                <p className="font-serif italic text-xs sm:text-sm text-[var(--color-text-graphite)] leading-relaxed">
                  Altheara requires verified connections to production AI image synthesis services (such as Google Imagen or Gemini multimodal APIs) before enabling generative artwork. No simulated or mock images are presented.
                </p>
              </div>

              {/* Disabled Prompt Demonstration */}
              <div className="flex flex-col gap-2 opacity-60 pointer-events-none">
                <label className="font-sans text-[10px] tracking-[0.2em] uppercase text-[var(--color-text-graphite)]">
                  Artwork Prompt (Preview)
                </label>
                <textarea
                  disabled
                  rows={2}
                  value="An archival oil painting of morning mist over coastal bluffs, literary and contemplative palette."
                  className="w-full p-3 rounded-lg border border-[var(--color-text-graphite)]/20 bg-white/50 text-xs font-serif text-[var(--color-text-graphite)] resize-none"
                />
                <button
                  type="button"
                  disabled
                  className="w-fit py-2 px-5 rounded-full bg-[var(--color-text-graphite)]/30 text-white font-sans text-xs tracking-[0.16em] uppercase cursor-not-allowed"
                >
                  Generate Artwork (Disabled)
                </button>
              </div>

              <div className="p-3 rounded-lg bg-amber-50/80 border border-amber-200/80 text-amber-900 text-xs font-sans">
                Please select the <strong>Upload Artwork</strong> tab to upload your curated image file directly from your device.
              </div>
            </div>
          )}
        </section>

        {/* Right Column: Digital Bookstore Listing Preview (col-span-5) */}
        <aside className="lg:col-span-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="font-sans text-[10px] tracking-[0.25em] uppercase text-[var(--color-text-graphite)] font-semibold">
              Digital Storefront Listing Preview
            </span>
            <span className="font-sans text-[9px] tracking-[0.18em] uppercase text-[var(--color-accent-clay)]">
              Live Preview
            </span>
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
              {currentImage?.storagePath ? (
                /* Authenticated Artwork Image Stream */
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentImage.storagePath}
                  alt={draft.bookTitle}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                />
              ) : (
                /* Empty Artwork Frame Placeholder */
                <div className="p-6 text-center flex flex-col items-center justify-center gap-2">
                  <div className="w-10 h-10 rounded-full border border-dashed border-[var(--color-text-graphite)]/30 flex items-center justify-center text-[var(--color-text-graphite)]/40">
                    <span className="font-serif text-sm italic">Art</span>
                  </div>
                  <span className="font-serif italic text-xs text-[var(--color-text-graphite)]/70">
                    No visual artwork selected yet
                  </span>
                  <span className="font-sans text-[9px] tracking-[0.16em] uppercase text-[var(--color-text-graphite)]/50">
                    Artwork will appear here
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
                by {draft.authorDisplayName || 'Author'}
              </span>

              <div className="mt-3 pt-3 w-full flex items-center justify-between text-[9px] font-sans text-[var(--color-text-graphite)]/60 border-t border-[var(--color-text-graphite)]/10">
                <span>Derived from Volume {draft.sourceVolumeId} (v{draft.sourceEditionVersion})</span>
                <span>Altheara Vault Edition</span>
              </div>
            </div>
          </div>

          <p className="font-serif italic text-xs text-[var(--color-text-graphite)]/70 text-center px-4">
            The bookstore listing combines your approved visual artwork with dynamic literary typography, ensuring optimal rendering across mobile and desktop catalogs.
          </p>
        </aside>
      </div>

      {/* Bottom Step Flow Navigation Actions */}
      <footer className="w-full flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-[var(--color-text-graphite)]/15">
        <button
          type="button"
          onClick={() => router.push(`/profile/volume-editor/editor?pubDraftId=${encodeURIComponent(pubDraftId)}&edit=1`)}
          className="py-2.5 px-5 rounded-full border border-[var(--color-text-graphite)]/25 text-[var(--color-text-ink)] hover:bg-white font-sans text-xs tracking-[0.16em] uppercase transition-colors focus:outline-none"
        >
          &larr; Return to Manuscript
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push(`/profile/digital-library?bookId=${encodeURIComponent(draft.sourceVolumeId)}`)}
            className="py-2.5 px-5 rounded-full border border-[var(--color-text-graphite)]/25 text-[var(--color-text-graphite)] hover:text-[var(--color-text-ink)] hover:bg-white font-sans text-xs tracking-[0.16em] uppercase transition-colors focus:outline-none"
          >
            Save Draft &amp; Return to Library
          </button>

          <button
            type="button"
            disabled
            title="Step 3 Author Showcase Video will be implemented in Phase LP2C"
            className="py-2.5 px-6 rounded-full bg-[var(--color-text-ink)]/30 text-white font-sans text-xs tracking-[0.18em] uppercase cursor-not-allowed focus:outline-none"
          >
            Continue to Author Showcase &rarr;
          </button>
        </div>
      </footer>
    </div>
  );
}
