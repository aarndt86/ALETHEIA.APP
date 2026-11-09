"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  PreservedBook,
  PreservedVolumeEdition,
  PhysicalEditionOrder,
  ANNUAL_LINEN_DESIGNS,
} from '@/lib/volumeData';

interface PhysicalEditionsViewProps {
  book: PreservedBook;
  selectedEdition: PreservedVolumeEdition;
  onSelectEdition: (editionId: string) => void;
  onOpenReader: () => void;
  onBackToDetail: () => void;
  onBackToBookshelf: () => void;
}

export default function PhysicalEditionsView({
  book,
  selectedEdition,
  onSelectEdition,
  onOpenReader,
  onBackToDetail,
  onBackToBookshelf,
}: PhysicalEditionsViewProps) {
  const router = useRouter();
  const [orders, setOrders] = useState<PhysicalEditionOrder[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // 1. Fetch genuine physical orders for this edition
  useEffect(() => {
    let isMounted = true;
    async function fetchOrders() {
      try {
        setIsLoadingOrders(true);
        setFetchError(null);
        const res = await fetch(`/api/volume/library/orders?editionId=${selectedEdition.editionId}`);
        if (!res.ok) {
          throw new Error('Failed to retrieve physical orders from vault.');
        }
        const data = await res.json();
        if (isMounted) {
          setOrders(data.orders || []);
          setIsLoadingOrders(false);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setFetchError(err instanceof Error ? err.message : 'Error accessing orders');
          setIsLoadingOrders(false);
        }
      }
    }

    fetchOrders();
    return () => {
      isMounted = false;
    };
  }, [selectedEdition.editionId]);

  // Derive tactile cover styling from the preserved edition
  const formats = selectedEdition.preservationFormats || {};
  const isSignatureLinen = Boolean(formats.signatureLinen?.configured);
  const linenTitle = formats.signatureLinen?.customizedTitle;
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

  const hasConfiguredFormats = Boolean(
    formats.signatureLinen?.configured ||
    formats.paperback?.configured ||
    formats.customHardcover?.configured
  );

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

      {/* Main Experience Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Left Column: Hand-Bound Tactile Book Artwork */}
        <div className="lg:col-span-4 flex flex-col items-center">
          <div
            className="relative w-full max-w-[250px] aspect-[3/4.2] rounded-[4px] p-6 flex flex-col justify-between overflow-hidden select-none border border-black/10 shadow-[0_16px_34px_-6px_rgba(44,37,35,0.22)] transition-transform duration-500 hover:scale-[1.01]"
            style={{ backgroundColor: coverBaseColor }}
          >
            {/* Subtle Cloth Weave Texture */}
            <div
              className="absolute inset-0 pointer-events-none opacity-25 mix-blend-overlay"
              style={{
                backgroundImage:
                  'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%223%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/%3E%3C/svg%3E")',
              }}
            />

            {/* Hardcover Joint Crease */}
            <div className="absolute top-0 bottom-0 left-6 w-[1px] bg-white/25 shadow-[1px_0_1px_rgba(0,0,0,0.3)] pointer-events-none" />
            <div className="absolute top-0 bottom-0 left-0 w-6 bg-gradient-to-r from-black/25 via-black/10 to-transparent pointer-events-none" />

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

            {/* Top Designation */}
            <div className={`relative z-10 ${isSignatureLinen ? 'pl-8' : 'pl-4'}`}>
              <span
                className={`font-sans text-[8px] tracking-[0.25em] uppercase block font-medium ${
                  isSignatureLinen ? 'text-[#3B3128]/80' : 'text-white/80'
                }`}
              >
                {book.year ? `Volume ${book.year}` : 'Life Book'}
              </span>
            </div>

            {/* Center Motif & Custom Title */}
            <div
              className={`relative z-10 flex flex-col items-center text-center my-auto px-2 ${
                isSignatureLinen ? 'pl-8' : 'pl-4'
              }`}
            >
              <div className="mb-2 opacity-60">
                <svg
                  className={`w-7 h-7 ${isSignatureLinen ? 'text-[#3B3128]' : 'text-white'}`}
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
                className={`font-serif text-base sm:text-lg font-medium leading-snug tracking-tight max-w-[170px] ${
                  isSignatureLinen ? 'text-[#2A231D]' : 'text-white'
                }`}
              >
                {linenTitle || selectedEdition.bookTitle}
              </h3>
            </div>

            {/* Bottom Author & Edition Version */}
            <div
              className={`relative z-10 flex items-center justify-between border-t pt-2.5 ${
                isSignatureLinen
                  ? 'pl-8 border-[#3B3128]/20 text-[#3B3128]/70'
                  : 'pl-4 border-white/20 text-white/70'
              }`}
            >
              <span className="font-sans text-[7px] tracking-[0.2em] uppercase">
                {selectedEdition.authorName}
              </span>
              <span className="font-sans text-[7px] tracking-[0.2em] uppercase">
                Edition v{selectedEdition.version}
              </span>
            </div>
          </div>

          <div className="mt-5 text-center flex flex-col items-center gap-1 max-w-[250px]">
            <h2 className="font-serif text-lg font-medium text-[var(--color-text-ink)] leading-snug">
              {selectedEdition.bookTitle}
            </h2>
            <span className="font-sans text-[9px] tracking-widest uppercase text-[var(--color-accent-clay)]">
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

        {/* Right Column: Physical Editions Archive */}
        <div className="lg:col-span-8 flex flex-col gap-8">
          {/* Header Block */}
          <div className="flex flex-col gap-1.5 border-b border-[var(--color-text-graphite)]/15 pb-5">
            <span className="font-sans text-[10px] tracking-[0.28em] uppercase text-[var(--color-accent-clay)] font-semibold">
              Private Fine-Book Bindery &amp; Keepsake Archive
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl text-[var(--color-text-ink)] tracking-tight">
              My Physical Editions
            </h1>
            <p className="font-serif italic text-sm sm:text-base text-[var(--color-text-graphite)]/85">
              Preserved print specifications and genuine physical keepsake records.
            </p>
          </div>

          {/* 1. Preserved Print Specifications Section */}
          <div className="p-6 sm:p-7 rounded-2xl bg-white border border-[var(--color-text-graphite)]/20 shadow-sm flex flex-col gap-5">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-text-graphite)]/15">
              <span className="font-sans text-[10px] tracking-[0.2em] uppercase text-[var(--color-text-ink)] font-semibold">
                Preserved Print Specifications (Edition v{selectedEdition.version})
              </span>
              <span className="py-0.5 px-2.5 rounded-full bg-[var(--color-canvas-stone)] border border-[var(--color-text-graphite)]/20 font-sans text-[8px] tracking-widest uppercase text-[var(--color-text-graphite)] font-medium">
                Vault Snapshot
              </span>
            </div>

            {hasConfiguredFormats ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Signature Linen Specifications */}
                {formats.signatureLinen?.configured && (
                  <div className="p-4 rounded-xl bg-[#F7F5F0] border border-[#3B3128]/20 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="font-serif text-sm font-medium text-[#2A231D]">
                        Altheara Signature Linen
                      </span>
                      <span className="font-sans text-[8px] tracking-wider uppercase text-[#3B3128] font-semibold">
                        Annual Collectible
                      </span>
                    </div>
                    <ul className="space-y-1 font-sans text-[10px] text-[var(--color-text-graphite)]">
                      <li>&bull; Cloth Finish: Archival Natural Oatmeal Woven Linen</li>
                      <li>&bull; Spine Band: Espresso Bronze Foil with Debossed ATH Stamp</li>
                      <li>&bull; Debossed Accent: Botanical Corner Emblem</li>
                      <li>
                        &bull; Customized Title Stamping:{' '}
                        <strong className="text-[var(--color-text-ink)] font-serif italic">
                          &ldquo;{formats.signatureLinen.customizedTitle}&rdquo;
                        </strong>
                      </li>
                      <li>&bull; Trim Size: 6 &times; 9 Inches</li>
                      <li>&bull; Paper Stock: Cream 60# Archival Book</li>
                    </ul>
                  </div>
                )}

                {/* Trade Paperback Specifications */}
                {formats.paperback?.configured && (
                  <div className="p-4 rounded-xl bg-[var(--color-canvas-stone)]/40 border border-[var(--color-text-graphite)]/15 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="font-serif text-sm font-medium text-[var(--color-text-ink)]">
                        Trade Paperback
                      </span>
                      <span className="font-sans text-[8px] tracking-wider uppercase text-[var(--color-text-graphite)] font-medium">
                        Softcover
                      </span>
                    </div>
                    <ul className="space-y-1 font-sans text-[10px] text-[var(--color-text-graphite)]">
                      <li>&bull; Binding: Perfect Bound Trade Paperback</li>
                      <li>&bull; Trim Size: 6 &times; 9 Inches</li>
                      <li>&bull; Paper Stock: Cream 60# Archival Book</li>
                      <li>&bull; Cover Finish: Velvet Matte Protective Seal</li>
                    </ul>
                  </div>
                )}

                {/* Custom Hardcover Specifications */}
                {formats.customHardcover?.configured && (
                  <div className="p-4 rounded-xl bg-[var(--color-canvas-stone)]/40 border border-[var(--color-text-graphite)]/15 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="font-serif text-sm font-medium text-[var(--color-text-ink)]">
                        Custom Hardcover
                      </span>
                      <span className="font-sans text-[8px] tracking-wider uppercase text-[var(--color-text-graphite)] font-medium">
                        Case Laminate
                      </span>
                    </div>
                    <ul className="space-y-1 font-sans text-[10px] text-[var(--color-text-graphite)]">
                      <li>&bull; Binding: Case Laminate Hardcover</li>
                      <li>&bull; Trim Size: 6 &times; 9 Inches</li>
                      <li>&bull; Finish: Matte Soft-Touch Lamination</li>
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-[var(--color-canvas-stone)]/30 border border-[var(--color-text-graphite)]/15 text-center">
                <p className="font-serif italic text-xs text-[var(--color-text-graphite)]">
                  No physical print formats were configured when this edition was preserved.
                </p>
              </div>
            )}
          </div>

          {/* 2. Order History & Fulfillment Section */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--color-text-graphite)]/15">
              <span className="font-sans text-[10px] tracking-[0.2em] uppercase text-[var(--color-text-ink)] font-semibold">
                Genuine Physical Order Records
              </span>
              <span className="font-sans text-[9px] text-[var(--color-text-graphite)]/60">
                Archival Order Ledger
              </span>
            </div>

            {isLoadingOrders ? (
              <div className="p-8 text-center rounded-2xl bg-[var(--color-canvas-stone)]/30 border border-[var(--color-text-graphite)]/15">
                <span className="font-serif italic text-xs text-[var(--color-text-graphite)]">
                  Accessing vault order records...
                </span>
              </div>
            ) : orders.length === 0 ? (
              /* Approved Empty State (Correction 6) */
              <div className="p-8 sm:p-10 rounded-2xl bg-[var(--color-canvas-stone)]/40 border border-[var(--color-text-graphite)]/20 flex flex-col items-center text-center gap-4">
                <div className="w-10 h-10 rounded-full bg-white border border-[var(--color-text-graphite)]/20 flex items-center justify-center text-[var(--color-accent-clay)]">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                  </svg>
                </div>

                <div className="flex flex-col gap-1.5 max-w-md">
                  <h3 className="font-serif text-xl sm:text-2xl font-medium text-[var(--color-text-ink)]">
                    No Physical Editions Ordered Yet
                  </h3>
                  <p className="font-serif italic text-xs sm:text-sm text-[var(--color-text-graphite)] leading-relaxed">
                    Your book&apos;s print specifications are preserved in your private Library. Physical ordering will become available in a future release.
                  </p>
                </div>

                <div className="mt-2 py-2 px-5 rounded-full bg-white/70 border border-[var(--color-text-graphite)]/15">
                  <span className="font-sans text-[9px] tracking-wider uppercase text-[var(--color-text-graphite)] font-medium">
                    Specifications Preserved in Vault &bull; Ordering Inactive
                  </span>
                </div>
              </div>
            ) : (
              /* When Genuine Orders Exist (Rendered from Event Ledger) */
              <div className="flex flex-col gap-5">
                {orders.map((ord) => {
                  const orderDate = new Date(ord.orderedAt).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  });

                  return (
                    <div
                      key={ord.orderId}
                      className="p-6 sm:p-7 rounded-2xl bg-white border border-[var(--color-text-graphite)]/20 shadow-sm flex flex-col gap-5"
                    >
                      {/* Order Header */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[var(--color-text-graphite)]/15">
                        <div className="flex flex-col">
                          <span className="font-sans text-[9px] tracking-widest uppercase text-[var(--color-accent-clay)] font-semibold">
                            Order #{ord.orderId}
                          </span>
                          <span className="font-serif text-base font-medium text-[var(--color-text-ink)] mt-0.5">
                            {ord.frozenPrintSpec.formatDisplayName}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="py-1 px-3 rounded-full bg-[var(--color-canvas-stone)] border border-[var(--color-text-graphite)]/20 font-sans text-[9px] tracking-widest uppercase font-semibold text-[var(--color-text-ink)]">
                            {ord.fulfillment.statusHeadline}
                          </span>
                          <span className="font-sans text-[9px] text-[var(--color-text-graphite)]/70">
                            Qty: {ord.quantity} &bull; {orderDate}
                          </span>
                        </div>
                      </div>

                      {/* Fulfillment Description */}
                      <div className="flex flex-col gap-1">
                        <span className="font-sans text-[8px] tracking-wider uppercase text-[var(--color-text-graphite)]/70 font-semibold">
                          Bindery Status:
                        </span>
                        <p className="font-serif italic text-xs text-[var(--color-text-graphite)] leading-relaxed">
                          {ord.fulfillment.statusDescription}
                        </p>
                      </div>

                      {/* Event Ledger (Correction 3) */}
                      {ord.fulfillment.events && ord.fulfillment.events.length > 0 && (
                        <div className="pt-3 border-t border-[var(--color-text-graphite)]/10 flex flex-col gap-2">
                          <span className="font-sans text-[8px] tracking-wider uppercase text-[var(--color-text-graphite)]/70 font-semibold">
                            Fulfillment Event Ledger:
                          </span>
                          <div className="space-y-2">
                            {ord.fulfillment.events.map((ev) => (
                              <div
                                key={ev.eventId}
                                className="flex items-start gap-3 text-[10px] font-sans"
                              >
                                <span className="text-[var(--color-text-graphite)]/50 shrink-0">
                                  {new Date(ev.timestamp).toLocaleDateString(undefined, {
                                    month: 'short',
                                    day: 'numeric',
                                  })}
                                </span>
                                <span className="font-medium text-[var(--color-text-ink)]">
                                  {ev.headline}
                                </span>
                                <span className="text-[var(--color-text-graphite)]">
                                  &mdash; {ev.description}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Reorder Information Note */}
                      <div className="pt-3 border-t border-[var(--color-text-graphite)]/10 flex items-center justify-between">
                        <span className="font-sans text-[9px] text-[var(--color-text-graphite)]/70 italic">
                          Physical reordering will be enabled in a future release.
                        </span>
                        <span className="font-sans text-[8px] tracking-widest uppercase text-[var(--color-text-graphite)]/60">
                          Frozen Spec Snapshot
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
