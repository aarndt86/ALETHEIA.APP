'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PublishingDraft, PublishingAuthorVideoAsset } from '@/lib/publishingData';

interface StoryPreviewStepProps {
  draft: PublishingDraft;
  pubDraftId: string;
  onDraftUpdate: (updated: PublishingDraft) => void;
}

export function StoryPreviewStep({ draft, pubDraftId, onDraftUpdate }: StoryPreviewStepProps) {
  const router = useRouter();

  // Mode: initial selection based on draft
  const initialChoice = draft.videoChoice || (draft.authorVideo ? 'included' : 'undecided');
  const [videoChoice, setVideoChoice] = useState<'none' | 'included' | 'undecided'>(initialChoice);

  // Tab for video provision: 'record' | 'upload'
  const [activeTab, setActiveTab] = useState<'record' | 'upload'>('record');

  // Video state
  const currentVideo: PublishingAuthorVideoAsset | null | undefined = draft.authorVideo;
  const [consentConfirmed, setConsentConfirmed] = useState(Boolean(currentVideo?.consentConfirmed));
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // In-browser MediaRecorder state
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [deviceError, setDeviceError] = useState<string | null>(null);

  const videoLiveRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cleanup media stream and URLs on unmount
  useEffect(() => {
    return () => {
      cleanupRecording();
      if (localPreviewUrl) {
        URL.revokeObjectURL(localPreviewUrl);
      }
    };
  }, [localPreviewUrl]);

  const cleanupRecording = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
  };

  // -------------------------------------------------------------
  // CHOICE 1: "No, continue without a video"
  // -------------------------------------------------------------
  const handleSelectNoVideo = async () => {
    setVideoChoice('none');
    setErrorMessage(null);
    setSuccessMessage(null);
    cleanupRecording();

    try {
      setIsSaving(true);
      const res = await fetch('/api/volume/publishing/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pubDraftId,
          draft: {
            ...draft,
            videoChoice: 'none',
            authorVideo: null,
            currentStep: 3
          }
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update video choice.');
      }

      onDraftUpdate(data.draft);
      setSuccessMessage('Video showcase skipped. You may proceed directly to Final Review.');
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error updating video selection.');
    } finally {
      setIsSaving(false);
    }
  };

  // -------------------------------------------------------------
  // CHOICE 2: "Yes, create a 30-second showcase"
  // -------------------------------------------------------------
  const handleSelectYesVideo = () => {
    setVideoChoice('included');
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  // -------------------------------------------------------------
  // RECORDING HANDLERS
  // -------------------------------------------------------------
  const startRecording = async () => {
    setDeviceError(null);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: true
      });

      mediaStreamRef.current = stream;
      if (videoLiveRef.current) {
        videoLiveRef.current.srcObject = stream;
        videoLiveRef.current.play().catch(() => {});
      }

      recordedChunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : MediaRecorder.isTypeSupported('video/webm')
        ? 'video/webm'
        : 'video/mp4';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const fullBlob = new Blob(recordedChunksRef.current, { type: mimeType });
        setRecordedBlob(fullBlob);
        const url = URL.createObjectURL(fullBlob);
        setLocalPreviewUrl(url);
      };

      recorder.start(500); // 500ms timeslices
      setIsRecording(true);
      setRecordSeconds(0);

      // Start 30-second timer
      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        setRecordSeconds(Math.min(30, Math.round(elapsed * 10) / 10));

        // Auto-stop exactly at 30 seconds
        if (elapsed >= 30.0) {
          stopRecording();
        }
      }, 100);
    } catch (err: unknown) {
      console.error('Camera/mic error:', err);
      setDeviceError('Unable to access camera or microphone. Please check browser permissions or use the Upload tab.');
      cleanupRecording();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    cleanupRecording();
  };

  // -------------------------------------------------------------
  // UPLOAD FILE HANDLER
  // -------------------------------------------------------------
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    setSuccessMessage(null);
    setDeviceError(null);

    // Initial client check for 50MB ceiling
    if (file.size > 50 * 1024 * 1024) {
      setErrorMessage(`Video file (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the 50 MB ceiling.`);
      return;
    }

    // Inspect duration using a temporary video element
    const tempUrl = URL.createObjectURL(file);
    const tempVideo = document.createElement('video');
    tempVideo.preload = 'metadata';
    tempVideo.src = tempUrl;

    tempVideo.onloadedmetadata = async () => {
      URL.revokeObjectURL(tempUrl);
      const duration = tempVideo.duration;

      if (duration > 30.5) {
        setErrorMessage(`Video duration (${duration.toFixed(1)}s) exceeds the maximum 30.0-second limit for bookstore previews.`);
        return;
      }

      await uploadVideoBlob(file, duration, 'member_upload');
    };

    tempVideo.onerror = async () => {
      URL.revokeObjectURL(tempUrl);
      // Fallback: upload directly to server validation
      await uploadVideoBlob(file, 0, 'member_upload');
    };
  };

  // -------------------------------------------------------------
  // UPLOAD RECORDED OR SELECTED VIDEO TO SERVER
  // -------------------------------------------------------------
  const uploadVideoBlob = async (blobOrFile: Blob | File, durationSec: number, source: 'member_recording' | 'member_upload') => {
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const formData = new FormData();
      formData.append('videoFile', blobOrFile, source === 'member_recording' ? 'showcase_take.webm' : (blobOrFile as File).name);
      formData.append('pubDraftId', pubDraftId);
      formData.append('durationSeconds', String(durationSec || recordSeconds || 1));
      formData.append('source', source);

      const res = await fetch('/api/volume/publishing/video', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload author showcase video.');
      }

      // Attach unapproved video asset to publishing draft
      const newVideoConfig: PublishingAuthorVideoAsset = {
        assetId: data.asset.assetId,
        mediaType: 'video',
        mimeType: data.asset.mimeType,
        durationSeconds: data.asset.durationSeconds,
        fileSizeBytes: data.asset.fileSizeBytes,
        storagePath: data.asset.storagePath,
        recordedAt: data.asset.uploadedAt,
        isApproved: false,
        consentConfirmed: false,
        source
      };

      const saveRes = await fetch('/api/volume/publishing/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pubDraftId,
          draft: {
            ...draft,
            videoChoice: 'included',
            authorVideo: newVideoConfig,
            currentStep: 3
          }
        })
      });

      const saveData = await saveRes.json();
      if (!saveRes.ok) {
        throw new Error(saveData.error || 'Failed to update publishing draft with video.');
      }

      onDraftUpdate(saveData.draft);
      setRecordedBlob(null);
      setSuccessMessage(`Showcase clip ready (${data.asset.durationSeconds}s). Confirm the rights consent below and click Approve to finalize.`);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error uploading video.');
    } finally {
      setIsSaving(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // -------------------------------------------------------------
  // APPROVE VIDEO WITH EXPLICIT MEMBER CONSENT
  // -------------------------------------------------------------
  const handleApproveVideo = async () => {
    if (!currentVideo?.assetId) return;

    if (!consentConfirmed) {
      setErrorMessage('Please confirm rights and consent before approving your video preview.');
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSaving(true);

    try {
      const approvedConfig: PublishingAuthorVideoAsset = {
        ...currentVideo,
        isApproved: true,
        approvedAt: new Date().toISOString(),
        consentConfirmed: true
      };

      const res = await fetch('/api/volume/publishing/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pubDraftId,
          draft: {
            ...draft,
            videoChoice: 'included',
            authorVideo: approvedConfig,
            currentStep: 3
          }
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to approve showcase video.');
      }

      onDraftUpdate(data.draft);
      setSuccessMessage('Showcase video successfully approved and attached to your digital publication.');
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to approve video.');
    } finally {
      setIsSaving(false);
    }
  };

  // -------------------------------------------------------------
  // REMOVE VIDEO
  // -------------------------------------------------------------
  const handleRemoveVideo = async () => {
    cleanupRecording();
    setRecordedBlob(null);
    if (localPreviewUrl) {
      URL.revokeObjectURL(localPreviewUrl);
      setLocalPreviewUrl(null);
    }
    setConsentConfirmed(false);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      setIsSaving(true);
      const res = await fetch('/api/volume/publishing/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pubDraftId,
          draft: {
            ...draft,
            videoChoice: 'none',
            authorVideo: null,
            currentStep: 3
          }
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to remove showcase video.');
      }

      onDraftUpdate(data.draft);
      setVideoChoice('none');
      setSuccessMessage('Video removed. You may continue without a video or create a new one.');
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to remove video.');
    } finally {
      setIsSaving(false);
    }
  };

  const isStepComplete = videoChoice === 'none' || (videoChoice === 'included' && currentVideo?.isApproved === true);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 flex flex-col gap-8">
      {/* Top Breadcrumb & Step Navigation */}
      <nav aria-label="Publishing Progress" className="w-full flex items-center justify-between border-b border-[var(--color-text-graphite)]/15 pb-4">
        <button
          type="button"
          onClick={() => router.push(`/profile/legacy-publisher?pubDraftId=${encodeURIComponent(pubDraftId)}&step=2`)}
          className="group flex items-center gap-2 font-sans text-xs tracking-[0.16em] uppercase text-[var(--color-text-graphite)] hover:text-[var(--color-text-ink)] transition-colors focus:outline-none"
        >
          <span className="group-hover:-translate-x-1 transition-transform duration-200">&larr;</span>
          <span>Return to Bookstore Image</span>
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
          <span className="text-[var(--color-accent-clay)] font-semibold border-b border-[var(--color-accent-clay)] pb-0.5">
            Step 3: Story Preview
          </span>
          <span className="text-[var(--color-text-graphite)]/40 cursor-not-allowed uppercase" title="Available in Phase LP2D">
            Step 4: Review
          </span>
        </div>
      </nav>

      {/* Header */}
      <header className="flex flex-col gap-2 max-w-3xl">
        <span className="font-sans text-[11px] tracking-[0.25em] uppercase text-[var(--color-accent-clay)] font-semibold">
          Legacy Publisher &bull; Step 3 of 4
        </span>
        <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl text-[var(--color-text-ink)] font-normal tracking-tight">
          My Story Preview
        </h1>
        <p className="font-serif italic text-sm sm:text-base text-[var(--color-text-graphite)] leading-relaxed">
          An optional 30-second author showcase allows future bookstore visitors to hear from you directly.
        </p>
      </header>

      {/* Alerts */}
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

      {/* PRIMARY CHOICE: QUESTION CARD */}
      <section className="w-full p-6 sm:p-8 rounded-2xl bg-white/70 border border-[var(--color-text-graphite)]/15 shadow-sm flex flex-col gap-6">
        <div className="flex flex-col gap-1.5">
          <span className="font-sans text-[10px] tracking-[0.22em] uppercase text-[var(--color-text-graphite)] font-semibold">
            Member Choice
          </span>
          <h2 className="font-serif text-xl sm:text-2xl text-[var(--color-text-ink)] font-normal">
            Would you like to include a short video preview of your story?
          </h2>
          <p className="font-serif italic text-xs sm:text-sm text-[var(--color-text-graphite)]">
            A showcase video gives your readers a personal window into your inspiration. Video is completely optional.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Choice 1: No */}
          <button
            type="button"
            onClick={handleSelectNoVideo}
            disabled={isSaving}
            className={`p-6 rounded-xl border text-left flex flex-col gap-2 transition-all focus:outline-none ${
              videoChoice === 'none'
                ? 'bg-[var(--color-canvas-stone)]/60 border-[var(--color-text-ink)] ring-2 ring-[var(--color-text-ink)]/15'
                : 'bg-white hover:bg-[var(--color-canvas-linen)]/40 border-[var(--color-text-graphite)]/20'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="font-serif text-base sm:text-lg font-medium text-[var(--color-text-ink)]">
                No, continue without a video
              </span>
              <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${videoChoice === 'none' ? 'border-[var(--color-text-ink)] bg-[var(--color-text-ink)]' : 'border-[var(--color-text-graphite)]/40'}`}>
                {videoChoice === 'none' && <span className="w-1.5 h-1.5 rounded-full bg-white"></span>}
              </span>
            </div>
            <p className="font-serif italic text-xs text-[var(--color-text-graphite)]">
              Your book will be presented with its written manuscript, chapter excerpts, and curated digital bookstore image.
            </p>
          </button>

          {/* Choice 2: Yes */}
          <button
            type="button"
            onClick={handleSelectYesVideo}
            disabled={isSaving}
            className={`p-6 rounded-xl border text-left flex flex-col gap-2 transition-all focus:outline-none ${
              videoChoice === 'included'
                ? 'bg-[var(--color-canvas-stone)]/60 border-[var(--color-text-ink)] ring-2 ring-[var(--color-text-ink)]/15'
                : 'bg-white hover:bg-[var(--color-canvas-linen)]/40 border-[var(--color-text-graphite)]/20'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="font-serif text-base sm:text-lg font-medium text-[var(--color-text-ink)]">
                Yes, create a 30-second showcase
              </span>
              <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${videoChoice === 'included' ? 'border-[var(--color-text-ink)] bg-[var(--color-text-ink)]' : 'border-[var(--color-text-graphite)]/40'}`}>
                {videoChoice === 'included' && <span className="w-1.5 h-1.5 rounded-full bg-white"></span>}
              </span>
            </div>
            <p className="font-serif italic text-xs text-[var(--color-text-graphite)]">
              Record a personal 30-second take from your camera or upload an authentic video clip from your device.
            </p>
          </button>
        </div>
      </section>

      {/* WHEN CHOICE 2 IS ACTIVE: SHOWCASE STUDIO */}
      {videoChoice === 'included' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Left Column: Creator / Uploader (col-span-7) */}
          <section className="lg:col-span-7 flex flex-col gap-6 bg-white/60 p-6 sm:p-8 rounded-2xl border border-[var(--color-text-graphite)]/10 shadow-sm">
            {/* Mode Tabs: Record vs Upload */}
            <div className="flex border-b border-[var(--color-text-graphite)]/15 gap-4">
              <button
                type="button"
                onClick={() => { setActiveTab('record'); cleanupRecording(); }}
                className={`pb-3 font-sans text-xs tracking-[0.18em] uppercase transition-all focus:outline-none ${
                  activeTab === 'record'
                    ? 'border-b-2 border-[var(--color-text-ink)] text-[var(--color-text-ink)] font-semibold'
                    : 'text-[var(--color-text-graphite)]/70 hover:text-[var(--color-text-ink)]'
                }`}
              >
                Record Take
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('upload'); cleanupRecording(); }}
                className={`pb-3 font-sans text-xs tracking-[0.18em] uppercase transition-all focus:outline-none ${
                  activeTab === 'upload'
                    ? 'border-b-2 border-[var(--color-text-ink)] text-[var(--color-text-ink)] font-semibold'
                    : 'text-[var(--color-text-graphite)]/70 hover:text-[var(--color-text-ink)]'
                }`}
              >
                Upload File
              </button>
            </div>

            {/* TAB A: RECORD AUTHENTIC VIDEO */}
            {activeTab === 'record' && (
              <div className="flex flex-col gap-5">
                {deviceError && (
                  <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs font-sans">
                    {deviceError}
                  </div>
                )}

                {/* Viewfinder Frame */}
                <div className="w-full aspect-video rounded-xl bg-black relative overflow-hidden shadow-inner flex items-center justify-center">
                  <video
                    ref={videoLiveRef}
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${isRecording ? 'opacity-100' : 'opacity-0'}`}
                  />

                  {!isRecording && !recordedBlob && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-white/80 gap-3 bg-zinc-900/90">
                      <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center text-white/60">
                        <span className="w-3 h-3 rounded-full bg-red-500"></span>
                      </div>
                      <span className="font-serif text-base font-normal">Authentic 30-Second Video Take</span>
                      <p className="font-serif italic text-xs text-white/60 max-w-sm">
                        Speak directly to future readers about why you wrote this book. Recording stops automatically at 30 seconds.
                      </p>
                    </div>
                  )}

                  {/* Live Recording Overlay */}
                  {isRecording && (
                    <div className="absolute top-4 left-4 right-4 flex items-center justify-between text-white text-xs font-mono bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse"></span>
                        <span className="uppercase tracking-widest text-[10px]">Recording Live</span>
                      </div>
                      <span className="font-semibold text-amber-300">{recordSeconds.toFixed(1)}s / 30.0s</span>
                    </div>
                  )}
                </div>

                {/* Recording Controls */}
                <div className="flex flex-wrap items-center gap-3">
                  {!isRecording ? (
                    <button
                      type="button"
                      onClick={startRecording}
                      disabled={isSaving}
                      className="py-2.5 px-6 rounded-full bg-[var(--color-text-ink)] text-[var(--color-canvas-linen)] hover:bg-[var(--color-text-ink)]/90 font-sans text-xs tracking-[0.16em] uppercase transition-all focus:outline-none shadow-sm active:scale-95 disabled:opacity-40"
                    >
                      Start Recording &bull; 30s Max
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="py-2.5 px-6 rounded-full bg-red-700 text-white hover:bg-red-800 font-sans text-xs tracking-[0.16em] uppercase transition-all focus:outline-none shadow-sm active:scale-95"
                    >
                      Finish Recording ({recordSeconds.toFixed(1)}s)
                    </button>
                  )}

                  {recordedBlob && !isRecording && (
                    <button
                      type="button"
                      onClick={() => uploadVideoBlob(recordedBlob, recordSeconds, 'member_recording')}
                      disabled={isSaving}
                      className="py-2.5 px-6 rounded-full bg-[var(--color-accent-clay)] text-white hover:opacity-90 font-sans text-xs tracking-[0.16em] uppercase transition-all focus:outline-none shadow-sm disabled:opacity-40"
                    >
                      {isSaving ? 'Uploading Take...' : 'Use This Recording &rarr;'}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* TAB B: UPLOAD VIDEO FILE */}
            {activeTab === 'upload' && (
              <div className="flex flex-col gap-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="author-video-input"
                />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-[var(--color-text-graphite)]/25 hover:border-[var(--color-accent-clay)] p-8 sm:p-12 rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-[var(--color-canvas-linen)]/30 hover:bg-[var(--color-canvas-linen)]/60 group"
                >
                  <div className="w-12 h-12 rounded-full border border-[var(--color-text-graphite)]/20 flex items-center justify-center text-[var(--color-text-graphite)] group-hover:text-[var(--color-accent-clay)] group-hover:border-[var(--color-accent-clay)] transition-colors mb-3">
                    <span className="font-serif text-lg font-light">+</span>
                  </div>
                  <span className="font-serif text-base sm:text-lg text-[var(--color-text-ink)] font-medium mb-1">
                    Select Video from Your Device
                  </span>
                  <p className="font-serif italic text-xs sm:text-sm text-[var(--color-text-graphite)] max-w-sm mb-4">
                    Provide a pre-recorded clip introducing your story.
                  </p>
                  <span className="font-sans text-[10px] tracking-[0.2em] uppercase text-[var(--color-text-graphite)]/60">
                    MP4 &bull; WebM &bull; MOV &bull; Max 30.0 Seconds &bull; Up to 50 MB
                  </span>
                </div>
              </div>
            )}

            {/* Consent & Rights Statement */}
            <div className="mt-2 pt-5 border-t border-[var(--color-text-graphite)]/15 flex flex-col gap-3">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={consentConfirmed}
                  onChange={(e) => setConsentConfirmed(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-[var(--color-text-graphite)]/30 text-[var(--color-text-ink)] focus:ring-[var(--color-accent-clay)]"
                />
                <span className="font-serif italic text-xs text-[var(--color-text-ink)] leading-relaxed">
                  I confirm that I hold all necessary rights and explicit consent for all identifiable persons, voices, photographs, and media included in this video preview.
                </span>
              </label>

              <p className="font-sans text-[10px] text-[var(--color-text-graphite)]/70 leading-normal pl-7">
                Bookstore showcases are public-facing promotional previews. Altheara never automatically imports your private family reflections or personal Echoes.
              </p>
            </div>

            {/* AI Generator Limitation Note (Pursuant to specifications) */}
            <div className="p-3.5 rounded-lg bg-[var(--color-canvas-linen)]/60 border border-[var(--color-text-graphite)]/15 text-[11px] font-sans text-[var(--color-text-graphite)]">
              <strong>Authentic Media Standard:</strong> Altheara features genuine author media. AI-generated avatars, synthesized likenesses, and voice cloning are not connected or simulated in this experience.
            </div>
          </section>

          {/* Right Column: Video Preview & Approval Card (col-span-5) */}
          <aside className="lg:col-span-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="font-sans text-[10px] tracking-[0.25em] uppercase text-[var(--color-text-graphite)] font-semibold">
                Storefront Video Preview
              </span>
              <span className="font-sans text-[9px] tracking-[0.18em] uppercase text-[var(--color-accent-clay)]">
                {currentVideo?.isApproved ? 'Approved' : 'Review Required'}
              </span>
            </div>

            <div className="w-full bg-[var(--color-canvas-linen)] border border-[var(--color-text-graphite)]/15 rounded-2xl p-6 flex flex-col gap-5 shadow-sm">
              {/* Media Player */}
              <div className="w-full aspect-video rounded-xl bg-black overflow-hidden relative shadow-md">
                {currentVideo?.storagePath || localPreviewUrl ? (
                  <video
                    src={currentVideo?.storagePath || localPreviewUrl || ''}
                    controls
                    playsInline
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-white/50 gap-2">
                    <span className="font-serif italic text-xs text-white/60">No showcase clip attached yet</span>
                    <span className="font-sans text-[9px] uppercase tracking-wider text-white/40">Record or upload a take</span>
                  </div>
                )}
              </div>

              {/* Clip Metadata & Details */}
              {currentVideo && (
                <div className="flex flex-col gap-3 pt-2 border-t border-[var(--color-text-graphite)]/10 text-xs font-sans">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-graphite)]/70">Duration</span>
                    <span className="font-mono text-[var(--color-text-ink)] font-semibold">{currentVideo.durationSeconds}s / 30.0s</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-graphite)]/70">Format</span>
                    <span className="font-mono text-[var(--color-text-ink)] uppercase">{currentVideo.mimeType.replace('video/', '')}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-graphite)]/70">Status</span>
                    <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${currentVideo.isApproved ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                      {currentVideo.isApproved ? 'Approved for Showcase' : 'Pending Consent & Approval'}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 pt-2">
                    {!currentVideo.isApproved ? (
                      <button
                        type="button"
                        onClick={handleApproveVideo}
                        disabled={isSaving || !consentConfirmed}
                        className="w-full py-2.5 px-4 rounded-full bg-[var(--color-text-ink)] text-[var(--color-canvas-linen)] hover:bg-[var(--color-text-ink)]/90 font-sans text-xs tracking-[0.16em] uppercase transition-all focus:outline-none shadow-sm disabled:opacity-40"
                      >
                        {isSaving ? 'Preserving Approval...' : 'Approve Video Showcase'}
                      </button>
                    ) : (
                      <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs text-center font-sans">
                        Showcase video approved and saved to your private publishing draft.
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleRemoveVideo}
                      disabled={isSaving}
                      className="w-full py-2 px-4 rounded-full border border-[var(--color-text-graphite)]/25 text-[var(--color-text-graphite)] hover:text-red-700 hover:border-red-300 font-sans text-xs tracking-[0.14em] uppercase transition-colors focus:outline-none disabled:opacity-40"
                    >
                      Remove Video Showcase
                    </button>
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* Bottom Step Flow Navigation Actions */}
      <footer className="w-full flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-[var(--color-text-graphite)]/15">
        <button
          type="button"
          onClick={() => router.push(`/profile/legacy-publisher?pubDraftId=${encodeURIComponent(pubDraftId)}&step=2`)}
          className="py-2.5 px-5 rounded-full border border-[var(--color-text-graphite)]/25 text-[var(--color-text-ink)] hover:bg-white font-sans text-xs tracking-[0.16em] uppercase transition-colors focus:outline-none"
        >
          &larr; Return to Bookstore Image
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/profile/legacy-publisher')}
            className="py-2.5 px-5 rounded-full border border-[var(--color-text-graphite)]/25 text-[var(--color-text-graphite)] hover:text-[var(--color-text-ink)] hover:bg-white font-sans text-xs tracking-[0.16em] uppercase transition-colors focus:outline-none"
          >
            Save Draft &amp; Return to My Publications
          </button>

          <button
            type="button"
            onClick={() => router.push(`/profile/legacy-publisher?pubDraftId=${encodeURIComponent(pubDraftId)}&step=4`)}
            disabled={!isStepComplete}
            title={!isStepComplete ? 'Please select an option (Skip video or Approve your video showcase) to continue' : 'Proceed to Final Publication Review'}
            className={`py-2.5 px-6 rounded-full font-sans text-xs tracking-[0.18em] uppercase transition-all duration-200 active:scale-[0.98] focus:outline-none shadow-sm ${
              isStepComplete
                ? 'bg-[var(--color-text-ink)] text-[var(--color-canvas-linen)] hover:bg-[var(--color-text-ink)]/90 cursor-pointer'
                : 'bg-[var(--color-text-ink)]/30 text-white cursor-not-allowed'
            }`}
          >
            Continue to Final Review &rarr;
          </button>
        </div>
      </footer>
    </div>
  );
}
