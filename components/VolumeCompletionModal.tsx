"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  VolumeDraft, 
  AuthenticRecordingAsset, 
  PreservedVolumeEdition,
  ANNUAL_LINEN_DESIGNS 
} from '@/lib/volumeData';

export type CompletionStage = 'presence' | 'editions' | 'review' | 'confirmation';

interface VolumeCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  draft: VolumeDraft;
  initialStage?: CompletionStage;
}

export default function VolumeCompletionModal({
  isOpen,
  onClose,
  draft,
  initialStage = 'presence'
}: VolumeCompletionModalProps) {
  const router = useRouter();

  // Navigation stage
  const [stage, setStage] = useState<CompletionStage>(initialStage);

  // Stage 1: Recorded Presence State
  const [recordingMode, setRecordingMode] = useState<'idle' | 'recording' | 'preview'>('idle');
  const [recordingMediaType, setRecordingMediaType] = useState<'voice' | 'video'>('voice');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedPreviewUrl, setRecordedPreviewUrl] = useState<string | null>(null);
  const [approvedRecordingAsset, setApprovedRecordingAsset] = useState<AuthenticRecordingAsset | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [deviceNotice, setDeviceNotice] = useState<string | null>(null);

  // Excerpt selection for reading
  const defaultExcerpt = draft.chapters[0]?.paragraphs[0]?.text?.slice(0, 240) || 'The year began with quiet intentions...';
  const [selectedExcerpt, setSelectedExcerpt] = useState<string>(defaultExcerpt);

  // Stage 2: Preservation Formats State
  const [formatPaperback, setFormatPaperback] = useState(false);
  const [formatHardcover, setFormatHardcover] = useState(false);
  const [formatSignatureLinen, setFormatSignatureLinen] = useState(true);
  const [customizedLinenTitle, setCustomizedLinenTitle] = useState(draft.bookTitle);

  // Stage 3: Preservation Execution State
  const [isPreserving, setIsPreserving] = useState(false);
  const [preservationError, setPreservationError] = useState<string | null>(null);
  const [sealedEdition, setSealedEdition] = useState<PreservedVolumeEdition | null>(null);

  // MediaRecorder refs
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup media stream and URLs
  const cleanupRecording = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (recordedPreviewUrl) {
      URL.revokeObjectURL(recordedPreviewUrl);
      setRecordedPreviewUrl(null);
    }
    setRecordedBlob(null);
    setRecordingDuration(0);
    setRecordingMode('idle');
  };

  useEffect(() => {
    return () => {
      cleanupRecording();
    };
  }, []);

  if (!isOpen) return null;

  // Total words across draft
  const totalWords = draft.chapters.reduce((acc, chap) => {
    return acc + chap.paragraphs.reduce((pAcc, p) => pAcc + (p.text ? p.text.trim().split(/\s+/).filter(Boolean).length : 0), 0);
  }, 0);

  // --- RECORDING HANDLERS ---
  const startRecording = async (type: 'voice' | 'video') => {
    setMediaError(null);
    setDeviceNotice(null);
    setRecordingMediaType(type);

    try {
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: type === 'video' ? { width: { ideal: 640 }, height: { ideal: 480 } } : false
      };

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('MediaDevices API not supported in this browser environment.');
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;

      const mimeType = type === 'video' 
        ? (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus') ? 'video/webm;codecs=vp8,opus' : 'video/webm')
        : (MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm');

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const finalBlob = new Blob(audioChunksRef.current, { type: mimeType });
        setRecordedBlob(finalBlob);
        const previewUrl = URL.createObjectURL(finalBlob);
        setRecordedPreviewUrl(previewUrl);
        setRecordingMode('preview');
      };

      recorder.start(250);
      setRecordingMode('recording');
      setRecordingDuration(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => {
          if (prev >= 180) { // Max 3 minutes
            stopRecording();
            return 180;
          }
          return prev + 1;
        });
      }, 1000);

    } catch (err: unknown) {
      console.warn('Microphone/Camera capture unavailable:', err);
      setDeviceNotice('Microphone access is unavailable or denied in this environment. You can test durable vault storage by generating an authentic sample take, or choose Maybe Later to skip.');
      setRecordingMode('idle');
    }
  };

  const stopRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
  };

  // Generate authentic sample audio take for testing when hardware mic is absent
  const handleGenerateSampleTake = () => {
    setDeviceNotice(null);
    setMediaError(null);
    try {
      // Create a valid, audible 2-second warm audio chime as an authentic audio/webm blob
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const dest = audioCtx.createMediaStreamDestination();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, audioCtx.currentTime); // A4
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 1.5); // A5

      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 2.0);

      osc.connect(gain);
      gain.connect(dest);

      const recorder = new MediaRecorder(dest.stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const sampleBlob = new Blob(chunks, { type: 'audio/webm' });
        setRecordedBlob(sampleBlob);
        const url = URL.createObjectURL(sampleBlob);
        setRecordedPreviewUrl(url);
        setRecordingMediaType('voice');
        setRecordingDuration(2);
        setRecordingMode('preview');
        audioCtx.close();
      };

      recorder.start();
      osc.start();
      setTimeout(() => {
        osc.stop();
        recorder.stop();
      }, 2000);

    } catch (testErr) {
      console.error('Sample generation failed:', testErr);
      setMediaError('Could not generate sample audio take.');
    }
  };

  // Upload and seal authentic recording to vault
  const handleApproveRecording = async () => {
    if (!recordedBlob) return;
    setIsUploadingMedia(true);
    setMediaError(null);

    try {
      const formData = new FormData();
      const filename = recordingMediaType === 'video' ? 'reading.webm' : 'reading.webm';
      formData.append('mediaFile', recordedBlob, filename);
      formData.append('mediaType', recordingMediaType);
      formData.append('durationSeconds', recordingDuration.toString());
      formData.append('selectedExcerpt', selectedExcerpt);

      const res = await fetch('/api/volume/recording', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload authentic recording.');
      }

      setApprovedRecordingAsset(data.asset);
      cleanupRecording();
      setStage('editions');
    } catch (err: unknown) {
      console.error('Recording upload failed:', err);
      setMediaError(err instanceof Error ? err.message : 'Could not save recording.');
    } finally {
      setIsUploadingMedia(false);
    }
  };

  const handleSkipRecording = () => {
    cleanupRecording();
    setApprovedRecordingAsset(null);
    setStage('editions');
  };

  // --- FINAL PRESERVATION SAVE ---
  const handleExecutePreservation = async () => {
    setIsPreserving(true);
    setPreservationError(null);

    try {
      const payload = {
        draft,
        authenticRecording: approvedRecordingAsset,
        preservationFormats: {
          paperbackSelected: formatPaperback,
          customHardcoverSelected: formatHardcover,
          signatureLinenSelected: formatSignatureLinen,
          customizedLinenTitle: customizedLinenTitle.trim() || draft.bookTitle
        }
      };

      const res = await fetch('/api/volume/preserve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      // Safeguard 1: Failed save must produce an honest error and keep working draft intact
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Preservation failed. Your working draft remains safely intact.');
      }

      setSealedEdition(data.edition);
      setStage('confirmation');
    } catch (err: unknown) {
      console.error('Preservation execution error:', err);
      setPreservationError(err instanceof Error ? err.message : 'Durable preservation failed.');
    } finally {
      setIsPreserving(false);
    }
  };

  const annualLinen = ANNUAL_LINEN_DESIGNS[draft.year] || ANNUAL_LINEN_DESIGNS[2025];

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm"
    >
      <div 
        className="w-full max-w-3xl flex flex-col rounded-2xl bg-[#F7F5F0] border border-[var(--color-text-graphite)]/25 shadow-2xl overflow-hidden my-auto z-10"
        style={{ maxHeight: 'min(760px, 92vh)' }}
      >
        {/* Modal Folio Header */}
        <header className="shrink-0 px-6 sm:px-8 py-4 border-b border-[var(--color-text-graphite)]/15 flex items-center justify-between bg-[var(--color-canvas-stone)]/40">
          <div className="flex flex-col">
            <span className="font-sans text-[9px] tracking-[0.25em] uppercase text-[var(--color-accent-clay)] font-semibold">
              Altheara Preservation Flow
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-serif text-base sm:text-lg font-medium text-[var(--color-text-ink)]">
                {stage === 'presence' && 'Stage 1: Let Them Hear Your Story'}
                {stage === 'editions' && 'Stage 2: Choose Preservation Editions'}
                {stage === 'review' && 'Stage 3: Final Preservation Review'}
                {stage === 'confirmation' && 'Stage 4: Sealed in Vault'}
              </span>
              <span className="font-sans text-[10px] text-[var(--color-text-graphite)]/40">&bull;</span>
              <span className="font-sans text-[10px] text-[var(--color-text-graphite)]">
                {draft.bookTitle}
              </span>
            </div>
          </div>

          {stage !== 'confirmation' && (
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full border border-[var(--color-text-graphite)]/20 flex items-center justify-center text-[var(--color-text-graphite)] hover:text-[var(--color-text-ink)] hover:border-[var(--color-text-ink)] transition-colors text-sm focus:outline-none"
            >
              &times;
            </button>
          )}
        </header>

        {/* Modal Scrollable Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-8 flex flex-col gap-6">

          {/* ============================================================
              STAGE 1: LET THEM HEAR YOUR STORY (Authentic Recorded Presence)
              ============================================================ */}
          {stage === 'presence' && (
            <div className="flex flex-col gap-6">
              <div className="text-center max-w-lg mx-auto flex flex-col items-center gap-2">
                <span className="font-sans text-[10px] tracking-[0.25em] uppercase text-[var(--color-accent-clay)] font-semibold">
                  Optional Recorded Presence
                </span>
                <h2 className="font-serif text-2xl sm:text-3xl text-[var(--color-text-ink)] tracking-tight">
                  Let Them Hear Your Story
                </h2>
                <p className="font-serif italic text-sm text-[var(--color-text-graphite)] leading-relaxed">
                  A future keepsake is more than text on a page. Preserve the sound of your authentic voice or a video message reading a chosen passage from your year.
                </p>
              </div>

              {/* Selected Passage to Read */}
              <div className="p-4 sm:p-5 rounded-xl bg-[var(--color-canvas-stone)]/50 border border-[var(--color-text-graphite)]/15 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-sans text-[9px] tracking-[0.2em] uppercase text-[var(--color-text-graphite)] font-medium">
                    Suggested Passage to Read
                  </span>
                  <span className="font-sans text-[9px] text-[var(--color-text-graphite)]/60">
                    Chapter I Excerpt
                  </span>
                </div>
                <p className="font-serif text-sm sm:text-[15px] leading-relaxed text-[var(--color-text-ink)] italic border-l-2 border-[var(--color-accent-clay)]/50 pl-3">
                  &ldquo;{selectedExcerpt}&rdquo;
                </p>
              </div>

              {/* Recording Status / Controls */}
              {recordingMode === 'idle' && (
                <div className="flex flex-col gap-4">
                  {deviceNotice && (
                    <div className="p-4 rounded-xl bg-[var(--color-canvas-stone)] border border-[var(--color-text-graphite)]/20 text-center flex flex-col items-center gap-2.5 text-xs text-[var(--color-text-graphite)]">
                      <p className="font-serif italic text-[13px]">{deviceNotice}</p>
                      <button
                        type="button"
                        onClick={handleGenerateSampleTake}
                        className="py-1.5 px-4 rounded-full bg-[var(--color-text-ink)] text-[var(--color-canvas-linen)] font-sans text-[9px] tracking-widest uppercase hover:bg-[var(--color-text-ink)]/90 transition-all"
                      >
                        Generate Authentic Test Take &bull; 2s
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => startRecording('voice')}
                      className="group p-5 rounded-xl bg-white hover:bg-[var(--color-canvas-stone)]/40 border border-[var(--color-text-graphite)]/15 hover:border-[var(--color-accent-clay)] transition-all flex flex-col items-center text-center gap-2 shadow-sm active:scale-[0.98]"
                    >
                      <span className="font-sans text-[10px] tracking-[0.2em] uppercase text-[var(--color-accent-clay)] font-semibold">
                        Voice
                      </span>
                      <span className="font-serif text-base text-[var(--color-text-ink)]">
                        Record My Voice
                      </span>
                      <span className="font-sans text-[9px] text-[var(--color-text-graphite)]/60">
                        High-fidelity audio take
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => startRecording('video')}
                      className="group p-5 rounded-xl bg-white hover:bg-[var(--color-canvas-stone)]/40 border border-[var(--color-text-graphite)]/15 hover:border-[var(--color-accent-clay)] transition-all flex flex-col items-center text-center gap-2 shadow-sm active:scale-[0.98]"
                    >
                      <span className="font-sans text-[10px] tracking-[0.2em] uppercase text-[var(--color-accent-clay)] font-semibold">
                        Video
                      </span>
                      <span className="font-serif text-base text-[var(--color-text-ink)]">
                        Record a Video
                      </span>
                      <span className="font-sans text-[9px] text-[var(--color-text-graphite)]/60">
                        Camera &amp; voice message
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSkipRecording}
                      className="group p-5 rounded-xl bg-[var(--color-canvas-stone)]/30 hover:bg-[var(--color-canvas-stone)]/60 border border-[var(--color-text-graphite)]/15 transition-all flex flex-col items-center text-center gap-2 active:scale-[0.98]"
                    >
                      <span className="font-sans text-[10px] tracking-[0.2em] uppercase text-[var(--color-text-graphite)] font-semibold">
                        Text Only
                      </span>
                      <span className="font-serif text-base text-[var(--color-text-ink)]">
                        Maybe Later
                      </span>
                      <span className="font-sans text-[9px] text-[var(--color-text-graphite)]/60">
                        Proceed without recording
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* Live Recording State */}
              {recordingMode === 'recording' && (
                <div className="p-8 rounded-2xl bg-[var(--color-canvas-stone)]/70 border border-[var(--color-accent-clay)]/30 flex flex-col items-center gap-4 text-center animate-[fadeIn_0.2s_ease-out_forwards]">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-500 animate-ping"></span>
                    <span className="font-sans text-[10px] tracking-[0.25em] uppercase text-red-600 font-semibold">
                      Recording {recordingMediaType === 'video' ? 'Video' : 'Voice'} Take
                    </span>
                  </div>

                  <span className="font-serif text-3xl font-medium text-[var(--color-text-ink)]">
                    {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
                  </span>

                  <p className="font-serif italic text-xs text-[var(--color-text-graphite)] max-w-sm">
                    Read at your natural pace. When you finish, stop to review your take.
                  </p>

                  <button
                    type="button"
                    onClick={stopRecording}
                    className="mt-2 py-2.5 px-7 rounded-full bg-[var(--color-text-ink)] text-[var(--color-canvas-linen)] font-sans text-[10px] tracking-[0.2em] uppercase hover:bg-[var(--color-text-ink)]/90 transition-all shadow-md active:scale-95"
                  >
                    Stop Recording
                  </button>
                </div>
              )}

              {/* Preview & Approval State */}
              {recordingMode === 'preview' && recordedPreviewUrl && (
                <div className="p-6 rounded-2xl bg-[var(--color-canvas-stone)]/60 border border-[var(--color-text-graphite)]/20 flex flex-col items-center gap-4 text-center animate-[fadeIn_0.2s_ease-out_forwards]">
                  <span className="font-sans text-[10px] tracking-[0.2em] uppercase text-[var(--color-accent-clay)] font-semibold">
                    Review Your Authentic Take ({recordingDuration}s)
                  </span>

                  {recordingMediaType === 'video' ? (
                    <video
                      controls
                      src={recordedPreviewUrl}
                      className="w-full max-h-56 rounded-xl bg-black object-contain shadow-md"
                    />
                  ) : (
                    <audio
                      controls
                      src={recordedPreviewUrl}
                      className="w-full max-w-md mt-2"
                    />
                  )}

                  {mediaError && (
                    <span className="text-xs text-red-700 font-sans">{mediaError}</span>
                  )}

                  <div className="flex items-center gap-3 mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        cleanupRecording();
                        setRecordingMode('idle');
                      }}
                      disabled={isUploadingMedia}
                      className="py-2 px-5 rounded-full border border-[var(--color-text-graphite)]/30 text-[var(--color-text-graphite)] hover:text-[var(--color-text-ink)] font-sans text-[10px] tracking-wider uppercase transition-colors disabled:opacity-40"
                    >
                      Record Again
                    </button>
                    <button
                      type="button"
                      onClick={handleApproveRecording}
                      disabled={isUploadingMedia}
                      className="py-2 px-6 rounded-full bg-[var(--color-text-ink)] text-[var(--color-canvas-linen)] font-sans text-[10px] tracking-[0.16em] uppercase hover:bg-[var(--color-text-ink)]/90 transition-all shadow-sm active:scale-95 disabled:opacity-40 flex items-center gap-2"
                    >
                      {isUploadingMedia ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Sealing Take...</span>
                        </>
                      ) : (
                        <span>Use This Recording &rarr;</span>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================================================
              STAGE 2: CHOOSE PRESERVATION EDITIONS
              ============================================================ */}
          {stage === 'editions' && (
            <div className="flex flex-col gap-6">
              <div className="text-center max-w-lg mx-auto flex flex-col items-center gap-2">
                <span className="font-sans text-[10px] tracking-[0.25em] uppercase text-[var(--color-accent-clay)] font-semibold">
                  Preservation Formats
                </span>
                <h2 className="font-serif text-2xl sm:text-3xl text-[var(--color-text-ink)] tracking-tight">
                  How Would You Like to Preserve Your Story?
                </h2>
                <p className="font-serif italic text-sm text-[var(--color-text-graphite)] leading-relaxed">
                  Every volume includes permanent private digital archival. You may also configure physical heirloom editions.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. Digital eBook (Included & Locked) */}
                <div className="p-5 rounded-2xl bg-white border-2 border-[var(--color-accent-clay)] shadow-sm flex flex-col justify-between gap-4">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-sans text-[9px] tracking-[0.2em] uppercase text-[var(--color-accent-clay)] font-semibold">
                        Included in Vault
                      </span>
                      <span className="w-4 h-4 rounded-full bg-[var(--color-accent-clay)] text-white flex items-center justify-center text-[10px]">
                        &#10003;
                      </span>
                    </div>
                    <h3 className="font-serif text-xl text-[var(--color-text-ink)]">
                      Digital eBook Edition
                    </h3>
                    <p className="font-serif text-xs text-[var(--color-text-graphite)] leading-relaxed">
                      Sealed archival manuscript with full typography, chapter navigation, and attached authentic voice takes. Accessible anytime in My Digital Library.
                    </p>
                  </div>
                  <span className="font-sans text-[9px] tracking-wider uppercase text-[var(--color-text-graphite)]/60">
                    Always Included &bull; Permanent Vault Archive
                  </span>
                </div>

                {/* 2. Altheara Signature Linen Edition (Approved Natural Oatmeal Design) */}
                <div 
                  className={`p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 relative overflow-hidden ${
                    formatSignatureLinen 
                      ? 'bg-[#F4EFEB] border-[#3B3128] shadow-md ring-1 ring-[#3B3128]/20' 
                      : 'bg-white border-[var(--color-text-graphite)]/20 hover:border-[var(--color-text-graphite)]/40'
                  }`}
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="font-sans text-[9px] tracking-[0.2em] uppercase text-[#3B3128] font-semibold">
                        Annual Collectible &bull; Preview
                      </span>
                      <input
                        type="checkbox"
                        checked={formatSignatureLinen}
                        onChange={(e) => setFormatSignatureLinen(e.target.checked)}
                        className="w-4 h-4 accent-[#3B3128] cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Miniature Book Spine/Cover Visual */}
                      <div className="w-12 h-16 rounded bg-[#E8E2D9] border border-[#3B3128]/20 shadow-inner flex flex-col items-center justify-between p-1 shrink-0">
                        <span className="font-serif text-[7px] text-[#3B3128] tracking-widest uppercase font-semibold">ATH</span>
                        <span className="text-[10px] text-[#3B3128]/60">&#10086;</span>
                        <span className="font-serif text-[6px] text-[#3B3128]/70">2025</span>
                      </div>
                      <div className="flex flex-col">
                        <h3 className="font-serif text-lg text-[var(--color-text-ink)] font-medium">
                          Altheara Signature Linen
                        </h3>
                        <span className="font-sans text-[9px] text-[#3B3128] font-medium tracking-wider">
                          Natural Oatmeal Linen &bull; Bronze Foil Spine
                        </span>
                      </div>
                    </div>

                    <p className="font-serif text-xs text-[var(--color-text-graphite)] leading-relaxed">
                      Official annual collectible. Archival oatmeal woven linen cloth, debossed botanical corner accent, and espresso bronze spine foil.
                    </p>

                    {/* Member-Customizable Title Input */}
                    {formatSignatureLinen && (
                      <div className="mt-1 pt-2 border-t border-[#3B3128]/15 flex flex-col gap-1">
                        <span className="font-sans text-[8px] tracking-[0.16em] uppercase text-[var(--color-text-graphite)] font-medium">
                          Customized Book Title (Spine &amp; Cover):
                        </span>
                        <input
                          type="text"
                          value={customizedLinenTitle}
                          onChange={(e) => setCustomizedLinenTitle(e.target.value)}
                          placeholder={draft.bookTitle}
                          className="w-full text-xs font-serif text-[var(--color-text-ink)] bg-white/80 border border-[#3B3128]/30 rounded px-2.5 py-1 focus:outline-none focus:border-[#3B3128]"
                        />
                        <span className="font-sans text-[8px] text-[var(--color-text-graphite)]/60 italic">
                          Altheara curates binding and materials. You personalize the title.
                        </span>
                      </div>
                    )}
                  </div>

                  <span className="font-sans text-[9px] tracking-wider uppercase text-[#3B3128]/80 font-medium">
                    Print Edition Configured &bull; Production Preview
                  </span>
                </div>

                {/* 3. Custom Hardcover Edition */}
                <div 
                  className={`p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 ${
                    formatHardcover 
                      ? 'bg-white border-[var(--color-text-ink)] shadow-md ring-1 ring-[var(--color-text-ink)]/20' 
                      : 'bg-white border-[var(--color-text-graphite)]/20 hover:border-[var(--color-text-graphite)]/40'
                  }`}
                >
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-sans text-[9px] tracking-[0.2em] uppercase text-[var(--color-text-graphite)] font-semibold">
                        Custom Hardcover
                      </span>
                      <input
                        type="checkbox"
                        checked={formatHardcover}
                        onChange={(e) => setFormatHardcover(e.target.checked)}
                        className="w-4 h-4 accent-[var(--color-text-ink)] cursor-pointer"
                      />
                    </div>
                    <h3 className="font-serif text-lg text-[var(--color-text-ink)]">
                      Case Laminate Hardbound
                    </h3>
                    <p className="font-serif text-xs text-[var(--color-text-graphite)] leading-relaxed">
                      Durable matte hardbound cover featuring your approved manuscript title, subtitle, and custom author name.
                    </p>
                  </div>
                  <span className="font-sans text-[9px] tracking-wider uppercase text-[var(--color-text-graphite)]/60">
                    Print Edition Configured &bull; Production Preview
                  </span>
                </div>

                {/* 4. Paperback Keepsake */}
                <div 
                  className={`p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 ${
                    formatPaperback 
                      ? 'bg-white border-[var(--color-text-ink)] shadow-md ring-1 ring-[var(--color-text-ink)]/20' 
                      : 'bg-white border-[var(--color-text-graphite)]/20 hover:border-[var(--color-text-graphite)]/40'
                  }`}
                >
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-sans text-[9px] tracking-[0.2em] uppercase text-[var(--color-text-graphite)] font-semibold">
                        Paperback Edition
                      </span>
                      <input
                        type="checkbox"
                        checked={formatPaperback}
                        onChange={(e) => setFormatPaperback(e.target.checked)}
                        className="w-4 h-4 accent-[var(--color-text-ink)] cursor-pointer"
                      />
                    </div>
                    <h3 className="font-serif text-lg text-[var(--color-text-ink)]">
                      Archival Softcover Keepsake
                    </h3>
                    <p className="font-serif text-xs text-[var(--color-text-graphite)] leading-relaxed">
                      Lightweight 6x9 trade paperback printed on 60# cream archival book paper. Ideal for gifting to family.
                    </p>
                  </div>
                  <span className="font-sans text-[9px] tracking-wider uppercase text-[var(--color-text-graphite)]/60">
                    Print Edition Configured &bull; Production Preview
                  </span>
                </div>
              </div>

              {/* Development Disclosure Notice */}
              <div className="p-3.5 rounded-xl bg-[var(--color-canvas-stone)]/50 border border-[var(--color-text-graphite)]/15 text-center">
                <p className="font-sans text-[10px] text-[var(--color-text-graphite)]/80 leading-normal">
                  Print specifications configured here are saved into your private vault record. No order is placed and no payment is collected during development.
                </p>
              </div>

              {/* Navigation Actions */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStage('presence')}
                  className="font-sans text-xs tracking-wider uppercase text-[var(--color-text-graphite)] hover:text-[var(--color-text-ink)] transition-colors"
                >
                  &larr; Back to Recording
                </button>
                <button
                  type="button"
                  onClick={() => setStage('review')}
                  className="py-2.5 px-6 rounded-full bg-[var(--color-text-ink)] text-[var(--color-canvas-linen)] font-sans text-[10px] tracking-[0.16em] uppercase hover:bg-[var(--color-text-ink)]/90 transition-all shadow-md active:scale-95"
                >
                  Continue to Final Review &rarr;
                </button>
              </div>
            </div>
          )}

          {/* ============================================================
              STAGE 3: FINAL PRESERVATION REVIEW
              ============================================================ */}
          {stage === 'review' && (
            <div className="flex flex-col gap-6">
              <div className="text-center max-w-lg mx-auto flex flex-col items-center gap-2">
                <span className="font-sans text-[10px] tracking-[0.25em] uppercase text-[var(--color-accent-clay)] font-semibold">
                  Sealing Checkpoint
                </span>
                <h2 className="font-serif text-2xl sm:text-3xl text-[var(--color-text-ink)] tracking-tight">
                  Final Preservation Review
                </h2>
                <p className="font-serif italic text-sm text-[var(--color-text-graphite)] leading-relaxed">
                  Confirm the details of your volume before committing it as an immutable edition in your private vault.
                </p>
              </div>

              {/* Summary Card */}
              <div className="p-6 rounded-2xl bg-white border border-[var(--color-text-graphite)]/20 shadow-sm flex flex-col gap-5">
                <div className="flex flex-col pb-4 border-b border-[var(--color-text-graphite)]/15">
                  <span className="font-sans text-[9px] tracking-[0.2em] uppercase text-[var(--color-accent-clay)] font-semibold">
                    Volume {draft.year} &bull; Final Manuscript
                  </span>
                  <h3 className="font-serif text-2xl text-[var(--color-text-ink)] font-medium mt-1">
                    {formatSignatureLinen && customizedLinenTitle.trim() ? customizedLinenTitle.trim() : draft.bookTitle}
                  </h3>
                  <span className="font-sans text-xs text-[var(--color-text-graphite)] mt-0.5">
                    By {draft.authorName} &bull; {draft.chapters.length} Chapters &bull; ~{totalWords.toLocaleString()} Words
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans">
                  <div className="flex flex-col gap-1">
                    <span className="font-semibold text-[var(--color-text-graphite)] uppercase tracking-wider text-[9px]">
                      Authentic Recorded Presence:
                    </span>
                    <span className="text-[var(--color-text-ink)] font-serif italic text-sm">
                      {approvedRecordingAsset 
                        ? `${approvedRecordingAsset.mediaType === 'video' ? 'Video Message' : 'Voice Take'} (${approvedRecordingAsset.durationSeconds}s)` 
                        : 'None (Skipped for this edition)'
                      }
                    </span>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="font-semibold text-[var(--color-text-graphite)] uppercase tracking-wider text-[9px]">
                      Vault Destination:
                    </span>
                    <span className="text-[var(--color-text-ink)]">
                      Sarah&apos;s Private Vault (Isolated Storage)
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 pt-4 border-t border-[var(--color-text-graphite)]/15">
                  <span className="font-semibold text-[var(--color-text-graphite)] uppercase tracking-wider text-[9px]">
                    Preserved Formats Configured:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <span className="py-1 px-3 rounded-full bg-[var(--color-canvas-stone)] font-sans text-[9px] uppercase tracking-wider text-[var(--color-text-ink)]">
                      Digital eBook (Included)
                    </span>
                    {formatSignatureLinen && (
                      <span className="py-1 px-3 rounded-full bg-[#E8E2D9] border border-[#3B3128]/30 font-sans text-[9px] uppercase tracking-wider text-[#3B3128] font-medium">
                        Signature Linen ({customizedLinenTitle || draft.bookTitle})
                      </span>
                    )}
                    {formatHardcover && (
                      <span className="py-1 px-3 rounded-full bg-[var(--color-canvas-stone)] font-sans text-[9px] uppercase tracking-wider text-[var(--color-text-ink)]">
                        Custom Hardcover
                      </span>
                    )}
                    {formatPaperback && (
                      <span className="py-1 px-3 rounded-full bg-[var(--color-canvas-stone)] font-sans text-[9px] uppercase tracking-wider text-[var(--color-text-ink)]">
                        Paperback
                      </span>
                    )}
                  </div>
                </div>

                {/* Immutability Guarantee Note */}
                <div className="p-3.5 rounded-xl bg-[var(--color-canvas-stone)]/40 border border-[var(--color-text-graphite)]/15">
                  <p className="font-serif italic text-xs text-[var(--color-text-graphite)] leading-relaxed">
                    &ldquo;Sealing this edition saves an immutable snapshot to your library. Your working draft remains available should you wish to publish further revisions in the future.&rdquo;
                  </p>
                </div>
              </div>

              {preservationError && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-center flex flex-col items-center gap-1">
                  <span className="font-sans text-[10px] tracking-widest uppercase text-red-700 font-semibold">
                    Preservation Failed
                  </span>
                  <p className="font-serif text-xs text-red-900">{preservationError}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStage('editions')}
                  disabled={isPreserving}
                  className="font-sans text-xs tracking-wider uppercase text-[var(--color-text-graphite)] hover:text-[var(--color-text-ink)] transition-colors disabled:opacity-40"
                >
                  &larr; Back to Formats
                </button>
                <button
                  type="button"
                  onClick={handleExecutePreservation}
                  disabled={isPreserving}
                  className="py-3 px-8 rounded-full bg-[var(--color-text-ink)] text-[var(--color-canvas-linen)] font-sans text-[10px] sm:text-xs tracking-[0.2em] uppercase hover:bg-[var(--color-text-ink)]/90 transition-all shadow-md active:scale-95 disabled:opacity-40 flex items-center gap-2"
                >
                  {isPreserving ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Sealing into Vault...</span>
                    </>
                  ) : (
                    <span>Save to My Digital Library &rarr;</span>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ============================================================
              STAGE 4: PRESERVATION CONFIRMATION
              ============================================================ */}
          {stage === 'confirmation' && (
            <div className="py-6 flex flex-col items-center text-center gap-6">
              {/* Archival Seal Emblem */}
              <div className="w-16 h-16 rounded-full bg-[var(--color-canvas-stone)] border-2 border-[var(--color-accent-clay)] flex items-center justify-center shadow-md">
                <span className="font-serif text-2xl text-[var(--color-accent-clay)]">&#10086;</span>
              </div>

              <div className="flex flex-col gap-2 max-w-md">
                <span className="font-sans text-[10px] tracking-[0.3em] uppercase text-[var(--color-accent-clay)] font-semibold">
                  Archival Sealed Milestone
                </span>
                <h2 className="font-serif text-2xl sm:text-3xl text-[var(--color-text-ink)]">
                  Your Volume Has Been Preserved
                </h2>
                <p className="font-serif italic text-sm text-[var(--color-text-graphite)] leading-relaxed">
                  Volume {draft.year} &bull; Edition v{sealedEdition?.version || 1} has been safely committed to your private vault. Your words, reflections, and authentic presence are permanently protected.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white border border-[var(--color-text-graphite)]/15 text-xs font-sans text-[var(--color-text-graphite)] flex flex-col gap-1 max-w-sm w-full">
                <div className="flex items-center justify-between">
                  <span className="uppercase tracking-wider text-[9px]">Vault ID:</span>
                  <span className="font-mono text-[10px] text-[var(--color-text-ink)]">{sealedEdition?.editionId || 'ed_vol-2025_v1_1741512000'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="uppercase tracking-wider text-[9px]">Preserved On:</span>
                  <span className="text-[var(--color-text-ink)]">{sealedEdition?.preservedAt ? new Date(sealedEdition.preservedAt).toLocaleDateString() : 'Nov 9, 2026'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="uppercase tracking-wider text-[9px]">Storage:</span>
                  <span className="text-[var(--color-text-ink)]">Local Vault (Development)</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 mt-4 w-full max-w-sm">
                <button
                  type="button"
                  onClick={() => router.push(`/profile/digital-library?editionId=${sealedEdition?.editionId || 'ed_vol-2025_v1_1741512000'}`)}
                  className="w-full py-3 px-6 rounded-full bg-[var(--color-text-ink)] text-[var(--color-canvas-linen)] font-sans text-[10px] tracking-[0.18em] uppercase hover:bg-[var(--color-text-ink)]/90 transition-all shadow-md active:scale-95"
                >
                  View in My Digital Library &rarr;
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/profile/volume-editor')}
                  className="w-full py-3 px-6 rounded-full border border-[var(--color-text-graphite)]/30 hover:border-[var(--color-text-ink)] text-[var(--color-text-ink)] font-sans text-[10px] tracking-[0.18em] uppercase transition-all active:scale-95"
                >
                  Return to My Volumes
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
