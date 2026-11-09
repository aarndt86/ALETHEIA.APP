"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  PreservedBook,
  PreservedVolumeEdition,
  AudiobookPackage,
  AudiobookTrack,
  ListeningStateRecord,
  ANNUAL_LINEN_DESIGNS,
} from '@/lib/volumeData';

interface AudiobookPlayerProps {
  book: PreservedBook;
  selectedEdition: PreservedVolumeEdition;
  onSelectEdition: (editionId: string) => void;
  onOpenReader: () => void;
  onBackToDetail: () => void;
  onBackToBookshelf: () => void;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export default function AudiobookPlayer({
  book,
  selectedEdition,
  onSelectEdition,
  onOpenReader,
  onBackToDetail,
  onBackToBookshelf,
}: AudiobookPlayerProps) {
  const router = useRouter();
  const [audiobookPackage, setAudiobookPackage] = useState<AudiobookPackage | null>(null);
  const [isLoadingPackage, setIsLoadingPackage] = useState(true);
  const [packageError, setPackageError] = useState<string | null>(null);

  // Playback state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [trackProgress, setTrackProgress] = useState(0);
  const [trackDuration, setTrackDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isChapterDrawerOpen, setIsChapterDrawerOpen] = useState(false);
  const [playbackNotice, setPlaybackNotice] = useState<string | null>(null);
  const [showNewEditionModal, setShowNewEditionModal] = useState(false);

  // Sleep timer (minutes)
  const [sleepTimerRemaining, setSleepTimerRemaining] = useState<number | null>(null);

  // 1. Load Audiobook Package & Listening State for this Edition
  useEffect(() => {
    let isMounted = true;
    async function loadAudiobookData() {
      try {
        setIsLoadingPackage(true);
        setPackageError(null);
        setIsPlaying(false);
        setTrackProgress(0);

        // Fetch package
        const pkgRes = await fetch(`/api/volume/library/audiobook?editionId=${selectedEdition.editionId}`);
        if (!pkgRes.ok) {
          throw new Error('Could not load audiobook package from vault.');
        }
        const pkgData = await pkgRes.json();
        const pkg: AudiobookPackage = pkgData.package;

        if (isMounted) {
          setAudiobookPackage(pkg);

          // Fetch saved listening state
          try {
            const stateRes = await fetch(`/api/volume/library/listening-state?editionId=${selectedEdition.editionId}`);
            if (stateRes.ok) {
              const stateData = await stateRes.json();
              const state: ListeningStateRecord = stateData.state;
              if (state && typeof state.activeTrackIndex === 'number') {
                const validIdx = Math.min(state.activeTrackIndex, Math.max(0, (pkg.tracks.length || 1) - 1));
                setCurrentTrackIndex(validIdx);
                setTrackProgress(state.trackProgressSeconds || 0);
                if (typeof state.playbackRate === 'number') {
                  setPlaybackSpeed(state.playbackRate);
                }
              }
            }
          } catch {
            // Ignore listening state load failures
          }

          setIsLoadingPackage(false);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setPackageError(err instanceof Error ? err.message : 'Error accessing audiobook');
          setIsLoadingPackage(false);
        }
      }
    }

    loadAudiobookData();
    return () => {
      isMounted = false;
    };
  }, [selectedEdition.editionId]);

  const activeTrack: AudiobookTrack | undefined = audiobookPackage?.tracks[currentTrackIndex];

  // 2. Persist Listening Progress helper
  const persistProgress = useCallback(
    async (trackIdx: number, seconds: number) => {
      if (!audiobookPackage || !selectedEdition) return;
      try {
        const totalDuration = audiobookPackage.totalDurationSeconds || 1;
        const elapsedPriorTracks = audiobookPackage.tracks
          .slice(0, trackIdx)
          .reduce((sum, t) => sum + (t.durationSeconds || 0), 0);
        const overallProgress = Math.min(
          100,
          Math.round(((elapsedPriorTracks + seconds) / totalDuration) * 100)
        );

        await fetch('/api/volume/library/listening-state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            editionId: selectedEdition.editionId,
            activeTrackIndex: trackIdx,
            activeChapterNumber: activeTrack?.chapterNumber || trackIdx + 1,
            trackProgressSeconds: Math.round(seconds),
            totalDurationSeconds: totalDuration,
            totalProgressPercentage: overallProgress,
            playbackRate: playbackSpeed,
            volume,
          }),
        });
      } catch (err) {
        console.warn('Could not save listening progress:', err);
      }
    },
    [audiobookPackage, selectedEdition, activeTrack, playbackSpeed, volume]
  );

  // Sync audio progress periodically when playing
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      if (audioRef.current) {
        const currentSecs = audioRef.current.currentTime;
        persistProgress(currentTrackIndex, currentSecs);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [isPlaying, currentTrackIndex, persistProgress]);

  // Handle Play/Pause
  const togglePlay = () => {
    if (!audioRef.current || !activeTrack) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      persistProgress(currentTrackIndex, audioRef.current.currentTime);
    } else {
      setPlaybackNotice(null);
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.warn('Audio playback error:', err);
          setIsPlaying(false);
          setPlaybackNotice('Unable to stream track from vault. Please verify member session.');
        });
    }
  };

  // Handle Skip 15s backward / forward
  const skipSeconds = (delta: number) => {
    if (!audioRef.current) return;
    const newTime = Math.max(0, Math.min(trackDuration, audioRef.current.currentTime + delta));
    audioRef.current.currentTime = newTime;
    setTrackProgress(newTime);
    persistProgress(currentTrackIndex, newTime);
  };

  // Chapter Track Selection
  const handleSelectTrack = (trackIdx: number) => {
    if (!audiobookPackage || trackIdx < 0 || trackIdx >= audiobookPackage.tracks.length) return;
    setCurrentTrackIndex(trackIdx);
    setTrackProgress(0);
    setIsPlaying(false);
    setIsChapterDrawerOpen(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    persistProgress(trackIdx, 0);
  };

  // Automatic Advancement on Track End (Requirement 1 & 3)
  const handleTrackEnded = () => {
    if (!audiobookPackage) return;
    const nextIdx = currentTrackIndex + 1;
    if (nextIdx < audiobookPackage.tracks.length) {
      // Auto-advance to next chapter track
      setCurrentTrackIndex(nextIdx);
      setTrackProgress(0);
      persistProgress(nextIdx, 0);
      // Automatically begin playback of next chapter
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current
            .play()
            .then(() => setIsPlaying(true))
            .catch(() => setIsPlaying(false));
        }
      }, 300);
    } else {
      // Reached conclusion of audiobook
      setIsPlaying(false);
      setTrackProgress(0);
      persistProgress(currentTrackIndex, trackDuration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetVal = Number(e.target.value);
    setTrackProgress(targetVal);
    if (audioRef.current) {
      audioRef.current.currentTime = targetVal;
    }
  };

  const handleSeekEnd = () => {
    if (audioRef.current) {
      persistProgress(currentTrackIndex, audioRef.current.currentTime);
    }
  };

  const toggleSpeed = () => {
    const speeds = [0.75, 1, 1.25, 1.5];
    const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    const nextSpeed = speeds[nextIdx];
    setPlaybackSpeed(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    if (isMuted) {
      audioRef.current.muted = false;
      setIsMuted(false);
      audioRef.current.volume = volume || 1;
    } else {
      audioRef.current.muted = true;
      setIsMuted(true);
    }
  };

  // Derive tactile cover styling
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
                  {ed.hasAuthenticRecording && (
                    <span
                      className={`w-1 h-1 rounded-full ${
                        isSelected ? 'bg-amber-300' : 'bg-[var(--color-accent-clay)]'
                      }`}
                      title="Recording attached"
                    />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Experience Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Left Column: Hand-Bound Tactile Book Centerpiece */}
        <div className="lg:col-span-4 flex flex-col items-center">
          <div
            className="relative w-full max-w-[240px] aspect-[3/4.2] rounded-[4px] p-5 flex flex-col justify-between overflow-hidden select-none border border-black/10 shadow-[0_16px_32px_-6px_rgba(44,37,35,0.22)] transition-transform duration-500 hover:scale-[1.01]"
            style={{ backgroundColor: coverBaseColor }}
          >
            {/* Subtle Linen Weave Texture Simulation */}
            <div
              className="absolute inset-0 pointer-events-none opacity-25 mix-blend-overlay"
              style={{
                backgroundImage:
                  'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%223%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/%3E%3C/svg%3E")',
              }}
            />

            {/* Hardcover Joint Crease */}
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

          {/* Book Identity Card & Read Link */}
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

        {/* Right Column: Premium Audiobook Player Surface */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Header Title Section */}
          <div className="flex flex-col gap-1.5 border-b border-[var(--color-text-graphite)]/15 pb-5">
            <span className="font-sans text-[10px] tracking-[0.28em] uppercase text-[var(--color-accent-clay)] font-semibold">
              Archival Living Audio
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl text-[var(--color-text-ink)] tracking-tight">
              Listen to My Book
            </h1>
            <p className="font-serif italic text-sm sm:text-base text-[var(--color-text-graphite)]/85">
              The complete preserved narrative in the author&apos;s own voice, presented chapter by chapter.
            </p>
          </div>

          {/* Loading State */}
          {isLoadingPackage && (
            <div className="p-12 text-center flex flex-col items-center justify-center gap-3 opacity-60">
              <div className="w-5 h-5 border-2 border-[var(--color-accent-clay)] border-t-transparent rounded-full animate-spin" />
              <span className="font-serif italic text-xs text-[var(--color-text-graphite)]">
                Retrieving archival audiobook package...
              </span>
            </div>
          )}

          {/* Error State */}
          {packageError && !isLoadingPackage && (
            <div className="p-6 rounded-2xl bg-red-50 text-red-900 text-sm font-serif text-center">
              {packageError}
            </div>
          )}

          {/* MAIN PLAYER OR HONEST EMPTY STATE */}
          {!isLoadingPackage && !packageError && audiobookPackage && (
            <>
              {/* CONDITION 1: NO AUDIO PRESERVED FOR THIS EDITION (e.g. Edition v2) */}
              {audiobookPackage.availabilityStatus === 'not_available' || audiobookPackage.tracks.length === 0 ? (
                <div className="p-8 sm:p-14 rounded-3xl bg-[var(--color-canvas-stone)]/40 border border-[var(--color-text-graphite)]/15 text-center flex flex-col items-center max-w-xl mx-auto my-4 animate-[fadeIn_0.3s_ease-out]">
                  <div className="w-14 h-14 rounded-full bg-white/80 border border-[var(--color-text-graphite)]/20 flex items-center justify-center text-[var(--color-text-graphite)] mb-4">
                    <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                      <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
                      <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="1.2" />
                    </svg>
                  </div>

                  <h2 className="font-serif text-2xl sm:text-3xl text-[var(--color-text-ink)] mb-3">
                    No Audiobook Preserved Yet
                  </h2>

                  <p className="font-serif italic text-sm sm:text-base text-[var(--color-text-graphite)]/90 leading-relaxed mb-6 max-w-md">
                    This edition does not include recorded audio or audiobook narration. Your written story remains safely preserved in your Library.
                  </p>

                  <button
                    type="button"
                    onClick={() => setShowNewEditionModal(true)}
                    className="py-2.5 px-6 rounded-full border border-[var(--color-text-graphite)]/25 text-[var(--color-text-graphite)] hover:text-[var(--color-text-ink)] hover:border-[var(--color-text-ink)] font-sans text-[10px] tracking-widest uppercase transition-colors"
                  >
                    Create a New Edition with Audio &rarr;
                  </button>
                </div>
              ) : (
                /* CONDITION 2: AUDIO TRACKS EXIST (Complete, Partial, or Passage Take) */
                <div className="flex flex-col gap-6">
                  {/* Honest Availability Notice if Passage Take or Partial */}
                  {audiobookPackage.availabilityStatus === 'passage_take_only' && (
                    <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/70 border border-amber-200/60 flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-amber-600 mt-1.5 shrink-0" />
                      <div className="flex flex-col gap-0.5 text-amber-950">
                        <span className="font-sans text-[10px] tracking-wider uppercase font-semibold text-amber-800">
                          Preserved Author Reading Passage &bull; 42s
                        </span>
                        <p className="font-serif italic text-xs leading-relaxed">
                          This edition contains an authentic passage recording personally read by {audiobookPackage.authorName}. Full-length chapter-by-chapter narration is in progress and will be available once complete.
                        </p>
                      </div>
                    </div>
                  )}

                  {audiobookPackage.availabilityStatus === 'partial' && (
                    <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/70 border border-amber-200/60 flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-amber-600 mt-1.5 shrink-0" />
                      <div className="flex flex-col gap-0.5 text-amber-950">
                        <span className="font-sans text-[10px] tracking-wider uppercase font-semibold text-amber-800">
                          Partial Audiobook Recording &bull; {audiobookPackage.completedChapters} of {audiobookPackage.totalChapters} Chapters
                        </span>
                        <p className="font-serif italic text-xs leading-relaxed">
                          A partial audiobook recording is preserved with this edition. All existing chapters play continuously in sequence.
                        </p>
                      </div>
                    </div>
                  )}

                  {audiobookPackage.availabilityStatus === 'complete' && (
                    <div className="p-3.5 px-4 rounded-xl bg-emerald-50/70 border border-emerald-200/60 flex items-center justify-between text-emerald-950 font-sans text-[10px] tracking-widest uppercase">
                      <div className="flex items-center gap-2 font-medium">
                        <span className="w-2 h-2 rounded-full bg-emerald-600" />
                        <span>Complete Audiobook &bull; All {audiobookPackage.totalChapters} Chapters Preserved</span>
                      </div>
                      <span className="text-emerald-800 font-semibold">
                        {audiobookPackage.isDevFixture ? 'Verified Fixture' : 'Archival Master'}
                      </span>
                    </div>
                  )}

                  {/* Native Audio Element with HTTP 206 Support */}
                  {activeTrack && (
                    <audio
                      ref={audioRef}
                      key={activeTrack.trackId}
                      src={activeTrack.storagePath}
                      preload="none"
                      onTimeUpdate={() => {
                        if (audioRef.current) {
                          setTrackProgress(audioRef.current.currentTime);
                        }
                      }}
                      onLoadedMetadata={() => {
                        if (audioRef.current) {
                          setTrackDuration(audioRef.current.duration || activeTrack.durationSeconds);
                          if (trackProgress > 0) {
                            audioRef.current.currentTime = trackProgress;
                          }
                        }
                      }}
                      onEnded={handleTrackEnded}
                      onError={(e) => {
                        const el = e.currentTarget;
                        if (el.error && el.error.code === 2) {
                          setPlaybackNotice('Network interruption while streaming track.');
                        }
                        setIsPlaying(false);
                      }}
                    />
                  )}

                  {/* Primary Audiobook Controller Deck */}
                  <div className="p-6 sm:p-8 rounded-3xl bg-[var(--color-canvas-stone)]/50 border border-[var(--color-text-graphite)]/15 flex flex-col gap-6 shadow-sm">
                    {/* Track Header & Provenance */}
                    <div className="flex items-start justify-between gap-4 pb-4 border-b border-[var(--color-text-graphite)]/15">
                      <div className="flex flex-col gap-1">
                        <span className="font-sans text-[10px] tracking-[0.2em] uppercase font-semibold text-[var(--color-accent-clay)]">
                          {activeTrack?.chapterRoman ? `Chapter ${activeTrack.chapterRoman}` : 'Preserved Track'} &bull; Track {currentTrackIndex + 1} of {audiobookPackage.tracks.length}
                        </span>
                        <h2 className="font-serif text-2xl text-[var(--color-text-ink)] leading-snug">
                          {activeTrack?.chapterTitle || selectedEdition.bookTitle}
                        </h2>
                      </div>

                      {/* Chapters Drawer Toggle */}
                      {audiobookPackage.tracks.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setIsChapterDrawerOpen(!isChapterDrawerOpen)}
                          className="py-1 px-3 rounded-full border border-[var(--color-text-graphite)]/20 hover:border-[var(--color-text-ink)] font-sans text-[10px] tracking-wider uppercase text-[var(--color-text-graphite)] hover:text-[var(--color-text-ink)] transition-colors shrink-0 flex items-center gap-1.5"
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <line x1="8" y1="6" x2="21" y2="6" />
                            <line x1="8" y1="12" x2="21" y2="12" />
                            <line x1="8" y1="18" x2="21" y2="18" />
                            <line x1="3" y1="6" x2="3.01" y2="6" strokeWidth="2" />
                            <line x1="3" y1="12" x2="3.01" y2="12" strokeWidth="2" />
                            <line x1="3" y1="18" x2="3.01" y2="18" strokeWidth="2" />
                          </svg>
                          <span>Chapters</span>
                        </button>
                      )}
                    </div>

                    {playbackNotice && (
                      <div className="p-3 rounded-xl bg-amber-50 text-amber-900 text-xs font-serif text-center">
                        {playbackNotice}
                      </div>
                    )}

                    {/* Scrubbable Scrubber Track */}
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between font-sans text-xs text-[var(--color-text-graphite)] font-medium">
                        <span>{formatTime(trackProgress)}</span>
                        <span>{formatTime(trackDuration || activeTrack?.durationSeconds || 0)}</span>
                      </div>

                      <div className="relative flex items-center">
                        <input
                          type="range"
                          min={0}
                          max={trackDuration || activeTrack?.durationSeconds || 1}
                          step={0.1}
                          value={trackProgress}
                          onChange={handleSeek}
                          onMouseUp={handleSeekEnd}
                          onTouchEnd={handleSeekEnd}
                          aria-label="Seek track"
                          className="w-full h-2 rounded-lg bg-[var(--color-text-graphite)]/20 accent-[var(--color-accent-clay)] cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Main Transportation Deck */}
                    <div className="flex items-center justify-center gap-5 sm:gap-8 py-2">
                      {/* Skip Backward 15s */}
                      <button
                        type="button"
                        onClick={() => skipSeconds(-15)}
                        aria-label="Rewind 15 seconds"
                        className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--color-text-graphite)] hover:text-[var(--color-text-ink)] hover:bg-black/5 transition-colors focus:outline-none"
                      >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                          <path d="M3 3v5h5" />
                          <text x="12" y="15" fontSize="7" textAnchor="middle" fill="currentColor" fontFamily="sans-serif" fontWeight="600">
                            15
                          </text>
                        </svg>
                      </button>

                      {/* Previous Track */}
                      <button
                        type="button"
                        onClick={() => handleSelectTrack(currentTrackIndex - 1)}
                        disabled={currentTrackIndex === 0}
                        aria-label="Previous chapter"
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors focus:outline-none ${
                          currentTrackIndex === 0
                            ? 'opacity-30 cursor-not-allowed text-[var(--color-text-graphite)]'
                            : 'text-[var(--color-text-graphite)] hover:text-[var(--color-text-ink)] hover:bg-black/5'
                        }`}
                      >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                          <polygon points="19 20 9 12 19 4 19 20" />
                          <line x1="5" y1="19" x2="5" y2="5" stroke="currentColor" strokeWidth="2" />
                        </svg>
                      </button>

                      {/* Large Center Play / Pause */}
                      <button
                        type="button"
                        onClick={togglePlay}
                        aria-label={isPlaying ? 'Pause audiobook' : 'Play audiobook'}
                        className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-[var(--color-text-ink)] text-[var(--color-canvas-linen)] flex items-center justify-center shadow-lg hover:scale-[1.03] active:scale-[0.97] transition-all shrink-0 focus:outline-none"
                      >
                        {isPlaying ? (
                          <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
                            <rect x="6" y="4" width="4" height="16" rx="1" />
                            <rect x="14" y="4" width="4" height="16" rx="1" />
                          </svg>
                        ) : (
                          <svg className="w-7 h-7 translate-x-0.5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M5 3.869v16.262a1 1 0 0 0 1.52.852l13.01-8.131a1 1 0 0 0 0-1.704L6.52 3.017A1 1 0 0 0 5 3.87z" />
                          </svg>
                        )}
                      </button>

                      {/* Next Track */}
                      <button
                        type="button"
                        onClick={() => handleSelectTrack(currentTrackIndex + 1)}
                        disabled={currentTrackIndex >= audiobookPackage.tracks.length - 1}
                        aria-label="Next chapter"
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors focus:outline-none ${
                          currentTrackIndex >= audiobookPackage.tracks.length - 1
                            ? 'opacity-30 cursor-not-allowed text-[var(--color-text-graphite)]'
                            : 'text-[var(--color-text-graphite)] hover:text-[var(--color-text-ink)] hover:bg-black/5'
                        }`}
                      >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                          <polygon points="5 4 15 12 5 20 5 4" />
                          <line x1="19" y1="5" x2="19" y2="19" stroke="currentColor" strokeWidth="2" />
                        </svg>
                      </button>

                      {/* Skip Forward 15s */}
                      <button
                        type="button"
                        onClick={() => skipSeconds(15)}
                        aria-label="Forward 15 seconds"
                        className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--color-text-graphite)] hover:text-[var(--color-text-ink)] hover:bg-black/5 transition-colors focus:outline-none"
                      >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                          <path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                          <path d="M21 3v5h-5" />
                          <text x="12" y="15" fontSize="7" textAnchor="middle" fill="currentColor" fontFamily="sans-serif" fontWeight="600">
                            15
                          </text>
                        </svg>
                      </button>
                    </div>

                    {/* Bottom Secondary Controls: Speed & Volume */}
                    <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[var(--color-text-graphite)]/15">
                      {/* Speed Controller */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={toggleSpeed}
                          className="py-1 px-3 rounded-full border border-[var(--color-text-graphite)]/20 hover:border-[var(--color-text-ink)] text-[var(--color-text-graphite)] hover:text-[var(--color-text-ink)] font-sans text-[10px] tracking-wider uppercase transition-colors"
                        >
                          Speed: {playbackSpeed}x
                        </button>
                      </div>

                      {/* Volume & Mute */}
                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={toggleMute}
                          aria-label={isMuted ? 'Unmute' : 'Mute'}
                          className="text-[var(--color-text-graphite)] hover:text-[var(--color-text-ink)] transition-colors"
                        >
                          {isMuted || volume === 0 ? (
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                              <line x1="23" y1="9" x2="17" y2="15" />
                              <line x1="17" y1="9" x2="23" y2="15" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                            </svg>
                          )}
                        </button>
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.05}
                          value={isMuted ? 0 : volume}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setVolume(val);
                            if (audioRef.current) {
                              audioRef.current.volume = val;
                              setIsMuted(val === 0);
                            }
                          }}
                          aria-label="Volume slider"
                          className="w-20 sm:w-24 h-1.5 rounded-lg bg-[var(--color-text-graphite)]/20 accent-[var(--color-text-ink)] cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Archival Authenticity Statement */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[var(--color-text-graphite)]/10 font-sans text-[9px] tracking-widest uppercase text-[var(--color-text-graphite)]/70">
                      <span>{audiobookPackage.narratorCredit}</span>
                      <span>Archival Audio &bull; Immutable Preservation</span>
                    </div>
                  </div>

                  {/* Chapter Playlist Drawer (When toggled open) */}
                  {isChapterDrawerOpen && (
                    <div className="p-6 rounded-3xl bg-white/80 border border-[var(--color-text-graphite)]/15 shadow-sm flex flex-col gap-3 animate-[fadeIn_0.2s_ease-out]">
                      <div className="flex items-center justify-between pb-3 border-b border-[var(--color-text-graphite)]/15">
                        <span className="font-sans text-[10px] tracking-widest uppercase font-semibold text-[var(--color-accent-clay)]">
                          Audiobook Chapters ({audiobookPackage.tracks.length})
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsChapterDrawerOpen(false)}
                          className="text-xs font-sans text-[var(--color-text-graphite)] hover:text-[var(--color-text-ink)] uppercase tracking-wider"
                        >
                          Close
                        </button>
                      </div>

                      <div className="flex flex-col gap-1.5 max-h-[300px] overflow-y-auto pr-1">
                        {audiobookPackage.tracks.map((trk, idx) => {
                          const isCur = idx === currentTrackIndex;
                          return (
                            <button
                              key={trk.trackId}
                              type="button"
                              onClick={() => handleSelectTrack(idx)}
                              className={`p-3 rounded-xl text-left flex items-center justify-between transition-colors ${
                                isCur
                                  ? 'bg-[var(--color-text-ink)] text-[var(--color-canvas-linen)] font-medium'
                                  : 'hover:bg-black/5 text-[var(--color-text-ink)]'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <span className={`font-serif text-sm ${isCur ? 'text-amber-200' : 'text-[var(--color-accent-clay)]'}`}>
                                  {trk.chapterRoman || String(idx + 1)}
                                </span>
                                <span className="font-serif text-sm line-clamp-1">
                                  {trk.chapterTitle}
                                </span>
                              </div>
                              <span className={`font-sans text-xs shrink-0 ml-3 ${isCur ? 'text-white/80' : 'text-[var(--color-text-graphite)]'}`}>
                                {formatTime(trk.durationSeconds)}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
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
              Create a New Edition with Audio
            </h3>
            <p className="font-serif italic text-sm text-[var(--color-text-graphite)] leading-relaxed">
              Opening the Volume Editor creates an <strong>isolated editable draft</strong> cloned from this volume.
            </p>
            <p className="font-serif text-xs text-[var(--color-text-graphite)]/80 leading-relaxed border-t border-[var(--color-text-graphite)]/15 pt-3">
              Your preserved Library editions will remain <strong>completely untouched and immutable</strong> in the vault. A new edition is sealed only when you explicitly finish preservation again.
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
