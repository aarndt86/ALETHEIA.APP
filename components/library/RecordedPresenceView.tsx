"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  PreservedBook,
  PreservedVolumeEdition,
  ANNUAL_LINEN_DESIGNS,
} from '@/lib/volumeData';

interface RecordedPresenceViewProps {
  book: PreservedBook;
  selectedEdition: PreservedVolumeEdition;
  onSelectEdition: (editionId: string) => void;
  onOpenReaderAtChapter: (chapterNumber: number) => void;
  onBackToDetail: () => void;
  onBackToBookshelf: () => void;
}

// Find if the excerpt connects to an authentic chapter and paragraph in the preserved manuscript
function findPassageContext(
  chapters: PreservedVolumeEdition['chapters'] = [],
  excerpt?: string
) {
  if (!excerpt || !excerpt.trim()) return null;
  const cleanExcerpt = excerpt.trim().toLowerCase();

  for (const chapter of chapters) {
    const paras = chapter.paragraphs || [];
    for (const p of paras) {
      const pText = (p.text || '').trim().toLowerCase();
      // Match if excerpt begins like paragraph, or is contained within it, or paragraph is contained in excerpt
      const snippet = cleanExcerpt.slice(0, 35);
      if (pText.includes(snippet) || cleanExcerpt.includes(pText.slice(0, 35))) {
        return {
          chapterNumber: chapter.number || (chapter as { order?: number }).order || 1,
          chapterTitle: chapter.title,
          fullPassageText: p.text,
        };
      }
    }
  }
  return null;
}

function formatDuration(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export default function RecordedPresenceView({
  book,
  selectedEdition,
  onSelectEdition,
  onOpenReaderAtChapter,
  onBackToDetail,
  onBackToBookshelf,
}: RecordedPresenceViewProps) {
  const router = useRouter();
  const [showNewEditionModal, setShowNewEditionModal] = useState(false);

  // Audio player state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(
    selectedEdition.authenticRecording?.durationSeconds || 0
  );
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  const recording = selectedEdition.authenticRecording;
  const passageContext = findPassageContext(
    selectedEdition.chapters,
    recording?.selectedPassageExcerpt
  );

  // Reset player when selected edition changes
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setPlaybackError(null);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (selectedEdition.authenticRecording?.durationSeconds) {
      setDuration(selectedEdition.authenticRecording.durationSeconds);
    }
  }, [selectedEdition.editionId]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      setPlaybackError(null);
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.warn('Audio playback error:', err);
          setPlaybackError('Unable to stream recording from vault. Please check session.');
          setIsPlaying(false);
        });
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = Number(e.target.value);
    setCurrentTime(targetTime);
    if (audioRef.current) {
      audioRef.current.currentTime = targetTime;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
      if (val === 0) {
        setIsMuted(true);
      } else if (isMuted) {
        setIsMuted(false);
      }
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

  const toggleSpeed = () => {
    const speeds = [1, 1.25, 0.85];
    const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    const nextSpeed = speeds[nextIdx];
    setPlaybackSpeed(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  // Cover styling
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

  const formattedRecordedDate = recording?.recordedAt
    ? new Date(recording.recordedAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : formattedPreservedDate;

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

        {/* Preserved Editions Selector */}
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
        {/* Left Column: Tactile Book Centerpiece */}
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
              onClick={() => onOpenReaderAtChapter(passageContext?.chapterNumber || 1)}
              className="mt-3 py-1.5 px-4 rounded-full border border-[var(--color-text-graphite)]/25 text-[var(--color-text-graphite)] hover:text-[var(--color-text-ink)] hover:border-[var(--color-text-ink)] font-sans text-[9px] tracking-widest uppercase transition-colors"
            >
              Read in eBook Reader &rarr;
            </button>
          </div>
        </div>

        {/* Right Column: Recorded Presence Listening / Viewing Sanctuary */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Header Title Section */}
          <div className="flex flex-col gap-1.5 border-b border-[var(--color-text-graphite)]/15 pb-5">
            <span className="font-sans text-[10px] tracking-[0.28em] uppercase text-[var(--color-accent-clay)] font-semibold">
              Archival Living Memory
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl text-[var(--color-text-ink)] tracking-tight">
              Experience Recorded Presence
            </h1>
            <p className="font-serif italic text-sm sm:text-base text-[var(--color-text-graphite)]/85">
              An intimate voice preserved alongside your written volume, capturing the authentic resonance of your story.
            </p>
          </div>

          {/* CONDITIONAL BRANCH: RECORDING EXISTS vs HONEST EMPTY STATE */}
          {recording ? (
            <div className="flex flex-col gap-6">
              {/* Contextual Connection Card (Requirement 3) */}
              {passageContext ? (
                <div className="p-6 sm:p-7 rounded-2xl bg-white/70 border border-[var(--color-text-graphite)]/15 shadow-sm flex flex-col gap-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[var(--color-text-graphite)]/10 text-[10px] font-sans tracking-widest uppercase text-[var(--color-accent-clay)] font-semibold">
                    <span>Passage Read in this Recording</span>
                    <span>{passageContext.chapterTitle}</span>
                  </div>

                  <blockquote className="font-serif italic text-base sm:text-lg text-[var(--color-text-ink)] leading-relaxed pl-4 border-l-2 border-[var(--color-accent-clay)]/50">
                    &ldquo;{recording.selectedPassageExcerpt || passageContext.fullPassageText}&rdquo;
                  </blockquote>

                  <div className="flex items-center justify-between pt-2">
                    <span className="font-sans text-[9px] tracking-wider uppercase text-[var(--color-text-graphite)]/60">
                      Preserved in original manuscript
                    </span>
                    <button
                      type="button"
                      onClick={() => onOpenReaderAtChapter(passageContext.chapterNumber)}
                      className="font-sans text-[10px] tracking-wider uppercase text-[var(--color-text-ink)] hover:text-[var(--color-accent-clay)] transition-colors flex items-center gap-1.5 font-medium"
                    >
                      <span>Open {passageContext.chapterTitle} in Reader</span>
                      <span>&rarr;</span>
                    </button>
                  </div>
                </div>
              ) : recording.selectedPassageExcerpt ? (
                /* Excerpt provided without explicit chapter connection */
                <div className="p-6 sm:p-7 rounded-2xl bg-white/70 border border-[var(--color-text-graphite)]/15 shadow-sm flex flex-col gap-3">
                  <span className="text-[10px] font-sans tracking-widest uppercase text-[var(--color-accent-clay)] font-semibold">
                    Selected Reading Excerpt
                  </span>
                  <blockquote className="font-serif italic text-base sm:text-lg text-[var(--color-text-ink)] leading-relaxed pl-4 border-l-2 border-[var(--color-accent-clay)]/50">
                    &ldquo;{recording.selectedPassageExcerpt}&rdquo;
                  </blockquote>
                </div>
              ) : null}

              {/* MEDIA PLAYER: VOICE (Audio) OR VIDEO */}
              {recording.mediaType === 'video' ? (
                /* Video Player */
                <div className="p-6 sm:p-8 rounded-3xl bg-[var(--color-canvas-stone)]/50 border border-[var(--color-text-graphite)]/15 flex flex-col gap-5">
                  <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black/90 shadow-md">
                    <video
                      controls
                      playsInline
                      src={`${recording.storagePath}&editionId=${selectedEdition.editionId}`}
                      className="w-full h-full object-contain"
                    />
                  </div>

                  {/* Archival Security & Authenticity Certificate */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[var(--color-text-graphite)]/15 font-sans text-[9px] tracking-widest uppercase text-[var(--color-text-graphite)]">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                      <strong className="text-[var(--color-text-ink)]">Authentic Video Take</strong>
                      <span>&bull; Recorded {formattedRecordedDate}</span>
                    </div>
                    <span>Vault Asset ID: {recording.assetId}</span>
                  </div>
                </div>
              ) : (
                /* Archival Voice Audio Player */
                <div className="p-6 sm:p-8 rounded-3xl bg-[var(--color-canvas-stone)]/50 border border-[var(--color-text-graphite)]/15 flex flex-col gap-6 shadow-sm">
                  {/* Hidden Native Audio Element */}
                  <audio
                    ref={audioRef}
                    src={`${recording.storagePath}&editionId=${selectedEdition.editionId}`}
                    preload="none"
                    onTimeUpdate={() => {
                      if (audioRef.current) {
                        setCurrentTime(audioRef.current.currentTime);
                      }
                    }}
                    onLoadedMetadata={() => {
                      if (audioRef.current && audioRef.current.duration) {
                        setDuration(audioRef.current.duration);
                      }
                    }}
                    onEnded={() => {
                      setIsPlaying(false);
                      setCurrentTime(0);
                    }}
                    onError={(e) => {
                      const el = e.currentTarget;
                      if (el.error && el.error.code === 2) {
                        setPlaybackError('Network interruption while streaming audio from vault.');
                      }
                      setIsPlaying(false);
                    }}
                  />

                  {/* Player Top Status */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-accent-clay)] animate-pulse" />
                      <span className="font-sans text-[10px] tracking-[0.2em] uppercase font-semibold text-[var(--color-text-ink)]">
                        Authentic Voice Take &bull; {selectedEdition.authorName}
                      </span>
                    </div>
                    <span className="font-sans text-[10px] tracking-wider uppercase text-[var(--color-text-graphite)]/70">
                      {recording.mimeType || 'audio/webm'}
                    </span>
                  </div>

                  {playbackError && (
                    <div className="p-3 rounded-xl bg-red-50 text-red-800 text-xs font-serif text-center">
                      {playbackError}
                    </div>
                  )}

                  {/* Primary Controller Track */}
                  <div className="flex items-center gap-4 sm:gap-6 py-2">
                    {/* Large Play/Pause Button */}
                    <button
                      type="button"
                      onClick={togglePlay}
                      aria-label={isPlaying ? 'Pause authentic voice recording' : 'Play authentic voice recording'}
                      className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[var(--color-text-ink)] text-[var(--color-canvas-linen)] flex items-center justify-center shadow-lg hover:scale-[1.03] active:scale-[0.97] transition-all shrink-0 focus:outline-none"
                    >
                      {isPlaying ? (
                        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                          <rect x="6" y="4" width="4" height="16" rx="1" />
                          <rect x="14" y="4" width="4" height="16" rx="1" />
                        </svg>
                      ) : (
                        <svg className="w-6 h-6 translate-x-0.5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M5 3.869v16.262a1 1 0 0 0 1.52.852l13.01-8.131a1 1 0 0 0 0-1.704L6.52 3.017A1 1 0 0 0 5 3.87z" />
                        </svg>
                      )}
                    </button>

                    {/* Progress Slider & Elapsed / Total Duration */}
                    <div className="flex-1 flex flex-col gap-2">
                      <div className="flex items-center justify-between font-sans text-xs text-[var(--color-text-graphite)] font-medium">
                        <span>{formatDuration(currentTime)}</span>
                        <span>{formatDuration(duration)}</span>
                      </div>

                      <div className="relative flex items-center">
                        <input
                          type="range"
                          min={0}
                          max={duration || 1}
                          step={0.1}
                          value={currentTime}
                          onChange={handleSeek}
                          aria-label="Seek recording"
                          className="w-full h-2 rounded-lg bg-[var(--color-text-graphite)]/20 accent-[var(--color-accent-clay)] cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bottom Secondary Controls: Mute, Volume, Speed */}
                  <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[var(--color-text-graphite)]/15">
                    {/* Volume & Mute */}
                    <div className="flex items-center gap-3">
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
                        onChange={handleVolumeChange}
                        aria-label="Volume slider"
                        className="w-20 sm:w-24 h-1.5 rounded-lg bg-[var(--color-text-graphite)]/20 accent-[var(--color-text-ink)] cursor-pointer"
                      />
                    </div>

                    {/* Speed Selector */}
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={toggleSpeed}
                        className="py-1 px-3 rounded-full border border-[var(--color-text-graphite)]/20 hover:border-[var(--color-text-ink)] text-[var(--color-text-graphite)] hover:text-[var(--color-text-ink)] font-sans text-[10px] tracking-wider uppercase transition-colors"
                      >
                        Speed: {playbackSpeed}x
                      </button>
                    </div>
                  </div>

                  {/* Archival Authenticity Statement (Requirement 2: Never synthetic or AI avatar) */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[var(--color-text-graphite)]/10 font-sans text-[9px] tracking-widest uppercase text-[var(--color-text-graphite)]/70">
                    <span>Authentic Human Voice &bull; Unaltered Master Take</span>
                    <span>No Synthetic Avatar &bull; Archival Vault Sealed</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* HONEST EMPTY STATE (Requirement 5) */
            <div className="p-8 sm:p-14 rounded-3xl bg-[var(--color-canvas-stone)]/40 border border-[var(--color-text-graphite)]/15 text-center flex flex-col items-center max-w-xl mx-auto my-4 animate-[fadeIn_0.3s_ease-out]">
              <div className="w-14 h-14 rounded-full bg-white/80 border border-[var(--color-text-graphite)]/20 flex items-center justify-center text-[var(--color-text-graphite)] mb-4">
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                  <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="1.2" />
                </svg>
              </div>

              <h2 className="font-serif text-2xl sm:text-3xl text-[var(--color-text-ink)] mb-3">
                No Recorded Presence Preserved Yet
              </h2>

              <p className="font-serif italic text-sm sm:text-base text-[var(--color-text-graphite)]/90 leading-relaxed mb-6 max-w-md">
                This edition doesn&apos;t include a voice or video recording. Your written story remains safely preserved in your Library.
              </p>

              <button
                type="button"
                onClick={() => setShowNewEditionModal(true)}
                className="py-2.5 px-6 rounded-full border border-[var(--color-text-graphite)]/25 text-[var(--color-text-graphite)] hover:text-[var(--color-text-ink)] hover:border-[var(--color-text-ink)] font-sans text-[10px] tracking-widest uppercase transition-colors"
              >
                Create a New Edition with Recorded Presence &rarr;
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Safe Editor Handoff Modal (Preservation Guard) */}
      {showNewEditionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="w-full max-w-md p-6 sm:p-8 rounded-3xl bg-[#F7F5F0] border border-[var(--color-text-graphite)]/20 shadow-2xl flex flex-col gap-5 text-center">
            <span className="font-sans text-[9px] tracking-[0.25em] uppercase text-[var(--color-accent-clay)] font-semibold">
              Archival Protection &bull; Handoff
            </span>
            <h3 className="font-serif text-2xl text-[var(--color-text-ink)]">
              Create a New Edition
            </h3>
            <p className="font-serif italic text-sm text-[var(--color-text-graphite)] leading-relaxed">
              Opening the Volume Editor creates a <strong>separate, editable working draft</strong> cloned from this volume.
            </p>
            <p className="font-serif text-xs text-[var(--color-text-graphite)]/80 leading-relaxed border-t border-[var(--color-text-graphite)]/15 pt-3">
              Your preserved Library editions (v1, v2, v3) will remain <strong>completely untouched and immutable</strong> in the vault. A new version is sealed only when you explicitly finish preservation again.
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
