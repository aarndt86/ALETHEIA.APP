"use client";

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { VolumeDraft, ManuscriptChapter, ManuscriptParagraph, SOURCE_VOLUMES } from '@/lib/volumeData';
import { MASTER_STYLES, MasterStyleId, StyleDefinition } from '@/lib/manuscriptStyles';
import { PublishingDraft } from '@/lib/publishingData';
import VolumeCompletionModal, { CompletionStage } from '@/components/VolumeCompletionModal';

type SaveStatus = 'saved' | 'saving' | 'dirty' | 'error';

interface RefineTarget {
  chapterId: string;
  paragraphId: string;
  text: string;
  paragraphIndex: number;
}

interface RefineResult {
  revisedText: string;
  summary: string;
  styleLabel: string;
  styleSubtitle: string;
  numeral: string;
  badgeColor: string;
}

function ManuscriptEditorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const volumeId = searchParams.get('volumeId') || 'vol-2025';
  const draftId = searchParams.get('draftId');
  const pubDraftId = searchParams.get('pubDraftId');
  const isPublishingMode = Boolean(pubDraftId);

  const initialEditMode = searchParams.get('edit') === '1';
  const initialTocOpen = searchParams.get('toc') === '1';
  const initialStyleModal = searchParams.get('styleModal') === '1';
  const initialStyleTab = searchParams.get('styleTab') === '1';
  const initialStyleParam = (searchParams.get('style') as MasterStyleId) || 'warm';
  const initialStageParam = (searchParams.get('stage') as CompletionStage) || 'presence';

  const [draft, setDraft] = useState<VolumeDraft | null>(null);
  const [publishingDraft, setPublishingDraft] = useState<PublishingDraft | null>(null);
  const [activeChapterId, setActiveChapterId] = useState<string>('');
  const [editingParagraphId, setEditingParagraphId] = useState<string | null>(null);
  const [editingTitleChapterId, setEditingTitleChapterId] = useState<string | null>(null);
  const [activeStyleTabParagraphId, setActiveStyleTabParagraphId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [lastSavedTimeText, setLastSavedTimeText] = useState('Just now');
  const [mobileTocOpen, setMobileTocOpen] = useState(initialTocOpen);
  const [isExiting, setIsExiting] = useState(false);

  // Five-Stage Volume Completion Flow modal state
  const [completionModalOpen, setCompletionModalOpen] = useState(searchParams.get('complete') === '1');
  const [completionStage, setCompletionStage] = useState<CompletionStage>(initialStageParam);

  // Five Master Styles Refinement & Diff Modal state
  const [refineModalOpen, setRefineModalOpen] = useState(false);
  const [refineTarget, setRefineTarget] = useState<RefineTarget | null>(null);
  const [refineScope, setRefineScope] = useState<'passage' | 'chapter'>('passage');
  const [selectedStyle, setSelectedStyle] = useState<MasterStyleId>('reflective');
  const [refineResult, setRefineResult] = useState<RefineResult | null>(null);
  const [isRefining, setIsRefining] = useState(false);
  const [customInstruction, setCustomInstruction] = useState('');
  const [refineError, setRefineError] = useState<string | null>(null);

  // Auto-save debounce timer
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load working draft on mount
  useEffect(() => {
    let isMounted = true;
    async function loadDraft() {
      try {
        setSaveStatus('saving');

        // STRICT REPOSITORY ISOLATION:
        // When pubDraftId is present, the editor loads exclusively from the publishing endpoint
        if (isPublishingMode && pubDraftId) {
          const fetchUrl = `/api/volume/publishing/draft?pubDraftId=${encodeURIComponent(pubDraftId)}`;
          const res = await fetch(fetchUrl);
          if (!res.ok) throw new Error('Failed to load publishing draft');
          const data = await res.json();
          if (isMounted && data.draft) {
            const pubD: PublishingDraft = data.draft;
            setPublishingDraft(pubD);
            const adaptedDraft: VolumeDraft = {
              draftId: pubD.publishingDraftId,
              sourceVolumeId: pubD.sourceVolumeId,
              year: pubD.sourceVolumeId === 'vol-2025' ? 2025 : 2026,
              bookTitle: pubD.bookTitle,
              originalBookTitle: pubD.bookTitle,
              subtitle: pubD.subtitle || '',
              authorName: pubD.authorDisplayName || 'Author',
              chapters: pubD.chapters,
              lastSavedAt: pubD.lastSavedAt,
              version: pubD.version,
              isDirty: false,
              clonedFromEditionId: pubD.sourceEditionId,
              clonedFromVersion: pubD.sourceEditionVersion,
            };
            setDraft(adaptedDraft);
            if (pubD.chapters && pubD.chapters.length > 0) {
              const chapterQuery = searchParams.get('chapter');
              const targetChap = chapterQuery 
                ? pubD.chapters.find((c: ManuscriptChapter) => c.number.toString() === chapterQuery || c.id === chapterQuery || c.romanNumeral === chapterQuery)
                : pubD.chapters[0];
              setActiveChapterId(targetChap ? targetChap.id : pubD.chapters[0].id);
              if (initialEditMode && pubD.chapters[0].paragraphs && pubD.chapters[0].paragraphs.length > 0) {
                setEditingParagraphId(pubD.chapters[0].paragraphs[0].id);
              }
              if (initialStyleTab && pubD.chapters[0].paragraphs && pubD.chapters[0].paragraphs.length > 0) {
                setActiveStyleTabParagraphId(pubD.chapters[0].paragraphs[0].id);
              }
            }
            setSaveStatus('saved');
            setLastSavedTimeText('Loaded from Vault');
          }
          return;
        }

        const fetchUrl = draftId
          ? `/api/volume/draft?volumeId=${volumeId}&draftId=${draftId}`
          : `/api/volume/draft?volumeId=${volumeId}`;
        const res = await fetch(fetchUrl);
        if (!res.ok) throw new Error('Failed to load draft');
        const data = await res.json();
        if (isMounted && data.draft) {
          setDraft(data.draft);
          if (data.draft.chapters && data.draft.chapters.length > 0) {
            const chapterQuery = searchParams.get('chapter');
            const targetChap = chapterQuery 
              ? data.draft.chapters.find((c: ManuscriptChapter) => c.number.toString() === chapterQuery || c.id === chapterQuery || c.romanNumeral === chapterQuery)
              : data.draft.chapters[0];
            setActiveChapterId(targetChap ? targetChap.id : data.draft.chapters[0].id);
            if (initialEditMode && data.draft.chapters[0].paragraphs && data.draft.chapters[0].paragraphs.length > 0) {
              setEditingParagraphId(data.draft.chapters[0].paragraphs[0].id);
            }
            if (initialStyleTab && data.draft.chapters[0].paragraphs && data.draft.chapters[0].paragraphs.length > 0) {
              setActiveStyleTabParagraphId(data.draft.chapters[0].paragraphs[0].id);
            }
          }
          setSaveStatus('saved');
          setLastSavedTimeText('Loaded from Vault');
        }
      } catch (err) {
        console.error('Error fetching draft:', err);
        setSaveStatus('error');
      }
    }
    loadDraft();
    return () => {
      isMounted = false;
    };
  }, [volumeId, draftId, pubDraftId, isPublishingMode, initialEditMode]);

  // Save function to server
  const saveDraftToServer = useCallback(async (draftToSave: VolumeDraft) => {
    try {
      setSaveStatus('saving');

      // STRICT REPOSITORY ISOLATION:
      // When in publishing mode, saving sends EXCLUSIVELY to /api/volume/publishing/draft.
      // It can never touch /api/volume/draft or write to .data/drafts/
      if (isPublishingMode && pubDraftId) {
        const res = await fetch('/api/volume/publishing/draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pubDraftId,
            draft: {
              bookTitle: draftToSave.bookTitle,
              subtitle: draftToSave.subtitle,
              chapters: draftToSave.chapters,
            }
          }),
        });
        if (!res.ok) throw new Error('Publishing save failed');
        const data = await res.json();
        setSaveStatus('saved');
        setLastSavedTimeText('Just now');
        // STRICT LOCALSTORAGE ISOLATION (Requirement 4)
        try {
          localStorage.setItem(`altheara_pub_draft_${pubDraftId}`, JSON.stringify(data.draft));
        } catch {
          // storage fallback
        }
        return;
      }

      const res = await fetch('/api/volume/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draftToSave),
      });
      if (!res.ok) throw new Error('Save failed');
      const data = await res.json();
      setSaveStatus('saved');
      setLastSavedTimeText('Just now');
      // Sync local storage as reliable secondary backup
      try {
        const storageKey = draftToSave.draftId || draftToSave.sourceVolumeId;
        localStorage.setItem(`altheara_draft_${storageKey}`, JSON.stringify(data.draft));
      } catch {
        // storage fallback
      }
    } catch (err) {
      console.error('Save error:', err);
      setSaveStatus('error');
    }
  }, [isPublishingMode, pubDraftId]);

  // Trigger debounced auto-save whenever draft changes
  const queueAutoSave = useCallback((updatedDraft: VolumeDraft) => {
    setSaveStatus('dirty');
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = setTimeout(() => {
      saveDraftToServer(updatedDraft);
    }, 1200);
  }, [saveDraftToServer]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, []);

  // Paragraph manual editing handlers
  const handleParagraphChange = (chapterId: string, paragraphId: string, newText: string) => {
    if (!draft) return;

    const updatedChapters = draft.chapters.map((chap) => {
      if (chap.id !== chapterId) return chap;
      return {
        ...chap,
        paragraphs: chap.paragraphs.map((p) => {
          if (p.id !== paragraphId) return p;
          return {
            ...p,
            text: newText,
            isModified: newText !== p.originalText,
          };
        }),
      };
    });

    const updatedDraft: VolumeDraft = {
      ...draft,
      chapters: updatedChapters,
      isDirty: true,
    };

    setDraft(updatedDraft);
    queueAutoSave(updatedDraft);
  };

  const handleRevertParagraph = (chapterId: string, paragraphId: string) => {
    if (!draft) return;

    const updatedChapters = draft.chapters.map((chap) => {
      if (chap.id !== chapterId) return chap;
      return {
        ...chap,
        paragraphs: chap.paragraphs.map((p) => {
          if (p.id !== paragraphId) return p;
          return {
            ...p,
            text: p.originalText,
            isModified: false,
          };
        }),
      };
    });

    const updatedDraft: VolumeDraft = {
      ...draft,
      chapters: updatedChapters,
      isDirty: true,
    };

    setDraft(updatedDraft);
    queueAutoSave(updatedDraft);
  };

  const handleAddParagraph = (chapterId: string, afterIdx: number) => {
    if (!draft) return;

    const newParagraph: ManuscriptParagraph = {
      id: `p-${Date.now()}`,
      text: "Write your reflection or memory here...",
      originalText: "",
      isModified: true,
    };

    const updatedChapters = draft.chapters.map((chap) => {
      if (chap.id !== chapterId) return chap;
      const newParagraphs = [...chap.paragraphs];
      newParagraphs.splice(afterIdx + 1, 0, newParagraph);
      return {
        ...chap,
        paragraphs: newParagraphs,
      };
    });

    const updatedDraft: VolumeDraft = {
      ...draft,
      chapters: updatedChapters,
      isDirty: true,
    };

    setDraft(updatedDraft);
    queueAutoSave(updatedDraft);
    setEditingParagraphId(newParagraph.id);
  };

  const handleDeleteParagraph = (chapterId: string, paragraphId: string) => {
    if (!draft) return;

    const updatedChapters = draft.chapters.map((chap) => {
      if (chap.id !== chapterId) return chap;
      return {
        ...chap,
        paragraphs: chap.paragraphs.filter((p) => p.id !== paragraphId),
      };
    });

    const updatedDraft: VolumeDraft = {
      ...draft,
      chapters: updatedChapters,
      isDirty: true,
    };

    setDraft(updatedDraft);
    queueAutoSave(updatedDraft);
    setEditingParagraphId(null);
  };

  // Chapter Title editing handler
  const handleChapterTitleChange = (chapterId: string, newTitle: string) => {
    if (!draft) return;

    const updatedChapters = draft.chapters.map((chap) => {
      if (chap.id !== chapterId) return chap;
      return {
        ...chap,
        title: newTitle,
        isTitleModified: newTitle !== chap.originalTitle,
      };
    });

    const updatedDraft: VolumeDraft = {
      ...draft,
      chapters: updatedChapters,
      isDirty: true,
    };

    setDraft(updatedDraft);
    queueAutoSave(updatedDraft);
  };

  // ============================================================
  // FIVE MASTER STYLES REFINEMENT & COMPARISON LOGIC
  // ============================================================

  const fetchRefinement = async (text: string, style: MasterStyleId, scope: 'passage' | 'chapter', instruction?: string) => {
    setIsRefining(true);
    setRefineError(null);
    try {
      const res = await fetch('/api/volume/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          style,
          scope,
          customInstruction: instruction,
        }),
      });
      if (!res.ok) throw new Error('Failed to refine');
      const data = await res.json();
      setRefineResult({
        revisedText: data.revisedText,
        summary: data.summary,
        styleLabel: data.styleLabel,
        styleSubtitle: data.styleSubtitle,
        numeral: data.numeral,
        badgeColor: data.badgeColor,
      });
    } catch (err) {
      console.error('Refinement error:', err);
      setRefineError('Failed to generate revision. Please try again.');
    } finally {
      setIsRefining(false);
    }
  };

  // Open refinement modal directly for a given style & target
  const handleOpenRefine = useCallback(async (
    chapterId: string,
    paragraphId: string,
    text: string,
    paragraphIndex: number,
    initialStyle: MasterStyleId = 'reflective'
  ) => {
    setRefineTarget({ chapterId, paragraphId, text, paragraphIndex });
    setRefineScope('passage');
    setSelectedStyle(initialStyle);
    setCustomInstruction('');
    setRefineModalOpen(true);
    await fetchRefinement(text, initialStyle, 'passage', '');
  }, []);

  // Auto-open modal if styleModal=1 in URL (for previews/QA testing)
  useEffect(() => {
    if (initialStyleModal && draft && draft.chapters.length > 0 && draft.chapters[0].paragraphs.length > 0) {
      const p = draft.chapters[0].paragraphs[0];
      handleOpenRefine(draft.chapters[0].id, p.id, p.text, 0, initialStyleParam);
    }
  }, [initialStyleModal, draft, initialStyleParam, handleOpenRefine]);

  // Switch style inside the modal
  const handleSwitchModalStyle = async (newStyle: MasterStyleId) => {
    if (!refineTarget) return;
    setSelectedStyle(newStyle);
    await fetchRefinement(refineTarget.text, newStyle, refineScope, customInstruction);
  };

  // Apply custom instruction in modal
  const handleApplyCustomInstruction = async () => {
    if (!refineTarget) return;
    await fetchRefinement(refineTarget.text, selectedStyle, refineScope, customInstruction);
  };

  // Accept and apply revision to manuscript
  const handleApplyRefinement = () => {
    if (!refineTarget || !refineResult || !draft) return;

    const { chapterId, paragraphId } = refineTarget;
    const updatedChapters = draft.chapters.map((chap) => {
      if (chap.id !== chapterId) return chap;
      return {
        ...chap,
        paragraphs: chap.paragraphs.map((p) => {
          if (p.id !== paragraphId) return p;
          return {
            ...p,
            text: refineResult.revisedText,
            isModified: true,
          };
        }),
      };
    });

    const updatedDraft: VolumeDraft = {
      ...draft,
      chapters: updatedChapters,
      isDirty: true,
    };

    setDraft(updatedDraft);
    queueAutoSave(updatedDraft);
    setRefineModalOpen(false);
    setRefineTarget(null);
    setRefineResult(null);
    setEditingParagraphId(null);
  };

  // Handle Exit / Return
  const handleExitToVolumes = async () => {
    if (draft && saveStatus === 'dirty') {
      await saveDraftToServer(draft);
    }
    setIsExiting(true);
    setTimeout(() => {
      if (isPublishingMode) {
        router.push(`/profile/digital-library?bookId=${draft?.sourceVolumeId || volumeId}`);
      } else {
        router.push('/profile/volume-editor');
      }
    }, 400);
  };

  // Handle Proceed to Book Cover in Publishing Mode
  const handleProceedToCover = async () => {
    if (draft && saveStatus === 'dirty') {
      await saveDraftToServer(draft);
    }
    setIsExiting(true);
    setTimeout(() => {
      router.push(`/profile/digital-library?bookId=${draft?.sourceVolumeId || volumeId}&step=3&pubDraftId=${encodeURIComponent(pubDraftId || '')}`);
    }, 400);
  };

  // Handle Volume Completion Flow (Private Mode only)
  const handleStartCompletionFlow = async () => {
    if (draft && saveStatus === 'dirty') {
      await saveDraftToServer(draft);
    }
    setCompletionStage('presence');
    setCompletionModalOpen(true);
  };

  if (!draft || !draft.chapters || draft.chapters.length === 0) {
    return (
      <main className="min-h-[100dvh] w-full flex flex-col items-center justify-center p-8 bg-[var(--color-canvas-linen)]">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-8 h-8 rounded-full border-2 border-[var(--color-accent-clay)] border-t-transparent animate-spin"></div>
          <span className="font-serif italic text-base text-[var(--color-text-graphite)]">
            Opening your manuscript...
          </span>
        </div>
      </main>
    );
  }

  const currentChapter = draft.chapters.find((c) => c.id === activeChapterId) || draft.chapters[0];
  if (!currentChapter) {
    return null;
  }
  const sourceMeta = SOURCE_VOLUMES.find((v) => v.id === draft.sourceVolumeId);

  return (
    <main
      className={`min-h-[100dvh] w-full flex flex-col bg-[var(--color-canvas-linen)] text-[var(--color-text-ink)] overflow-x-hidden transition-opacity duration-500 selection:bg-[var(--color-canvas-stone)]
      ${isExiting ? 'opacity-0 scale-[0.99]' : 'opacity-100 scale-100'}
    `}
    >
      {/* ============================================================
          TOP STUDIO CONTROL BAR (Quiet, Non-intrusive, Literary)
          ============================================================ */}
      <nav className="sticky top-0 z-40 w-full bg-[var(--color-canvas-linen)]/95 backdrop-blur-md border-b border-[var(--color-text-graphite)]/10 px-3 sm:px-8 py-3 sm:py-3.5 flex items-center justify-between">
        {/* Left: Back to Volumes or Library */}
        <button
          type="button"
          onClick={handleExitToVolumes}
          className="group flex items-center gap-1.5 font-sans text-[10px] sm:text-[11px] tracking-[0.18em] uppercase text-[var(--color-text-graphite)] hover:text-[var(--color-text-ink)] transition-colors focus:outline-none shrink-0"
        >
          <span className="group-hover:-translate-x-1 transition-transform duration-300">&larr;</span>
          <span>{isPublishingMode ? 'Library' : 'Volumes'}</span>
        </button>

        {/* Center: Book & Year Title */}
        <div className="hidden md:flex flex-col items-center text-center">
          <span className="font-serif font-medium text-xs sm:text-sm tracking-wide text-[var(--color-text-ink)]">
            {draft.bookTitle} &bull; {isPublishingMode ? 'Legacy Publisher' : draft.year}
          </span>
          <span className="font-sans text-[9px] tracking-[0.25em] uppercase text-[var(--color-text-graphite)]/60">
            {isPublishingMode
              ? `Publishing Draft \u2022 Derived from Edition v${draft.clonedFromVersion || 1}`
              : (draft.clonedFromVersion ? `Branching from Edition v${draft.clonedFromVersion}` : 'Private Working Edition')}
          </span>
        </div>

        {/* Right: Saving Status & Save Action */}
        <div className="flex items-center gap-2.5 sm:gap-6 shrink-0">
          {/* Status Indicator */}
          <div className="flex items-center gap-1.5 font-sans text-[9px] sm:text-[11px] tracking-wider text-[var(--color-text-graphite)]/80">
            {saveStatus === 'saved' && (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent-sage)]"></span>
                <span className="hidden sm:inline">Saved to Vault</span>
                <span className="sm:hidden">Saved</span>
              </>
            )}
            {saveStatus === 'saving' && (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent-clay)] animate-pulse"></span>
                <span>Saving&hellip;</span>
              </>
            )}
            {saveStatus === 'dirty' && (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent-clay)]"></span>
                <span className="hidden sm:inline">Unsaved changes</span>
                <span className="sm:hidden">Unsaved</span>
              </>
            )}
            {saveStatus === 'error' && (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                <span>Paused</span>
              </>
            )}
          </div>

          {/* Continue Later Action */}
          <button
            type="button"
            onClick={handleExitToVolumes}
            className="py-1 px-2.5 sm:py-1.5 sm:px-4 rounded-full border border-[var(--color-text-graphite)]/25 hover:border-[var(--color-text-ink)] text-[var(--color-text-ink)] font-sans text-[9px] sm:text-[11px] tracking-[0.14em] uppercase transition-all duration-300 active:scale-[0.98] focus:outline-none whitespace-nowrap"
          >
            <span className="hidden sm:inline">Continue Later</span>
            <span className="sm:hidden">Later</span>
          </button>

          {/* Action: Finish Volume (Private Mode) or Proceed to Book Cover (Publishing Mode) */}
          {isPublishingMode ? (
            <button
              type="button"
              onClick={handleProceedToCover}
              className="py-1 px-3 sm:py-1.5 sm:px-4 rounded-full bg-[var(--color-text-ink)] text-[var(--color-canvas-linen)] hover:bg-[var(--color-text-ink)]/90 font-sans text-[9px] sm:text-[11px] tracking-[0.14em] uppercase transition-all duration-300 active:scale-[0.98] focus:outline-none whitespace-nowrap shadow-sm"
            >
              <span className="hidden sm:inline">Proceed to Book Cover &rarr;</span>
              <span className="sm:hidden">Next Step &rarr;</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStartCompletionFlow}
              className="py-1 px-3 sm:py-1.5 sm:px-4 rounded-full bg-[var(--color-text-ink)] text-[var(--color-canvas-linen)] hover:bg-[var(--color-text-ink)]/90 font-sans text-[9px] sm:text-[11px] tracking-[0.14em] uppercase transition-all duration-300 active:scale-[0.98] focus:outline-none whitespace-nowrap shadow-sm"
            >
              <span className="hidden sm:inline">Finish My Volume</span>
              <span className="sm:hidden">Finish</span>
            </button>
          )}
        </div>
      </nav>

      {/* ============================================================
          MAIN STUDIO WORKSPACE
          Desktop: 2-Column (Discreet Left TOC + Centered Book Page)
          Mobile: Single Column (Drawer TOC + Full-width Reading)
          ============================================================ */}
      <div className="flex-1 w-full max-w-6xl mx-auto flex flex-col md:flex-row relative px-4 sm:px-6 md:px-12 py-6 sm:py-12">
        {/* ==========================================================
            DESKTOP LEFT COLUMN: Discreet Archival Table of Contents
            ========================================================== */}
        <aside className="hidden md:flex flex-col w-64 shrink-0 pr-8 sticky top-20 self-start max-h-[calc(100vh-8rem)] overflow-y-auto no-scrollbar">
          <div className="mb-6 pb-3 border-b border-[var(--color-text-graphite)]/15">
            <span className="font-sans text-[9px] tracking-[0.25em] uppercase text-[var(--color-text-graphite)]/70 block">
              Contents
            </span>
          </div>

          <ul className="flex flex-col gap-5">
            {draft.chapters.map((chap) => {
              const isActive = chap.id === currentChapter.id;
              const hasModifications = chap.paragraphs.some((p) => p.isModified) || chap.isTitleModified;
              const totalWords = chap.paragraphs.reduce((acc, p) => acc + p.text.split(/\s+/).filter(Boolean).length, 0);

              return (
                <li key={chap.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveChapterId(chap.id);
                      setEditingParagraphId(null);
                      setEditingTitleChapterId(null);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={`w-full text-left group flex flex-col gap-1 transition-all focus:outline-none ${
                      isActive ? 'opacity-100' : 'opacity-50 hover:opacity-85'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-sans text-[10px] tracking-[0.2em] uppercase text-[var(--color-accent-clay)] font-medium">
                        Chapter {chap.romanNumeral}
                      </span>
                      {hasModifications && (
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent-sage)]"
                          title="Contains custom edits"
                        />
                      )}
                    </div>

                    <span
                      className={`font-serif text-[15px] leading-snug transition-colors ${
                        isActive
                          ? 'text-[var(--color-text-ink)] font-medium'
                          : 'text-[var(--color-text-graphite)] group-hover:text-[var(--color-text-ink)]'
                      }`}
                    >
                      {chap.title}
                    </span>

                    <span className="font-sans text-[10px] text-[var(--color-text-graphite)]/50 tracking-wider">
                      ~{totalWords} words &bull; {chap.paragraphs.length} passages
                    </span>

                    {isActive && (
                      <div className="w-8 h-[1px] bg-[var(--color-accent-clay)] mt-1 animate-[fadeIn_0.4s_ease-out_forwards]" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Book Archival Summary Box */}
          <div className="mt-12 p-4 rounded-lg bg-[var(--color-canvas-stone)]/40 border border-[var(--color-text-graphite)]/10 text-[11px] font-sans text-[var(--color-text-graphite)]/80 flex flex-col gap-2">
            <span className="tracking-[0.15em] uppercase text-[9px] text-[var(--color-text-graphite)]/50 font-medium">
              Source Preservation
            </span>
            <p className="font-serif italic text-xs leading-relaxed text-[var(--color-text-graphite)]">
              &ldquo;Editing this working draft never alters your original Echoes, Reflections, or source Volume.&rdquo;
            </p>
          </div>
        </aside>

        {/* ==========================================================
            MOBILE CHAPTER SELECTOR PILL (Sticky or Tap-to-expand)
            ========================================================== */}
        <div className="md:hidden w-full mb-6 flex flex-col">
          <button
            type="button"
            onClick={() => setMobileTocOpen(!mobileTocOpen)}
            className="w-full py-2.5 px-4 rounded-xl bg-[var(--color-canvas-stone)]/60 border border-[var(--color-text-graphite)]/15 flex items-center justify-between text-left focus:outline-none"
          >
            <div>
              <span className="font-sans text-[9px] tracking-[0.2em] uppercase text-[var(--color-accent-clay)] block">
                Chapter {currentChapter?.romanNumeral || 'I'}
              </span>
              <span className="font-serif text-sm font-medium text-[var(--color-text-ink)]">
                {currentChapter?.title || 'Chapter I'}
              </span>
            </div>
            <span className="font-sans text-xs text-[var(--color-text-graphite)]">
              {mobileTocOpen ? '▲' : '▼'}
            </span>
          </button>

          {/* Mobile TOC Drawer */}
          {mobileTocOpen && (
            <div className="mt-2 p-4 rounded-xl bg-[var(--color-canvas-stone)]/95 border border-[var(--color-text-graphite)]/20 shadow-xl flex flex-col gap-3 animate-[fadeIn_0.3s_ease-out_forwards]">
              <span className="font-sans text-[9px] tracking-[0.25em] uppercase text-[var(--color-text-graphite)]/60 mb-1">
                Jump to Chapter
              </span>
              {draft.chapters.map((chap) => (
                <button
                  key={chap.id}
                  type="button"
                  onClick={() => {
                    setActiveChapterId(chap.id);
                    setMobileTocOpen(false);
                    setEditingParagraphId(null);
                  }}
                  className={`text-left p-2 rounded-lg transition-colors flex items-center justify-between ${
                    chap.id === currentChapter?.id
                      ? 'bg-[var(--color-canvas-linen)] text-[var(--color-text-ink)] font-medium shadow-sm'
                      : 'text-[var(--color-text-graphite)] hover:text-[var(--color-text-ink)]'
                  }`}
                >
                  <span className="font-serif text-sm">
                    {chap.romanNumeral}. {chap.title}
                  </span>
                  <span className="font-sans text-[10px] text-[var(--color-text-graphite)]/60">
                    {chap.paragraphs?.length || 0} passages
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ==========================================================
            RIGHT / CENTER: THE AUTHENTIC LITERARY BOOK SHEET
            ========================================================== */}
        <article className="w-full flex-1 max-w-[720px] mx-auto flex flex-col bg-transparent px-4 sm:px-6 md:px-8">
          {/* Archival Folio Running Header */}
          <div className="w-full flex flex-col items-center mb-10 sm:mb-16 select-none opacity-60">
            <span className="font-sans text-[8px] sm:text-[9px] tracking-[0.2em] sm:tracking-[0.35em] uppercase text-[var(--color-text-graphite)] text-center px-2">
              Altheara &bull; Volume {draft.year} &bull; Chapter {currentChapter?.romanNumeral || 'I'}
            </span>
            <div className="w-16 h-[1px] bg-[var(--color-text-graphite)]/20 mt-3"></div>
          </div>

          {/* Chapter Opening: Roman Numeral & Editable Title */}
          <header className="mb-12 sm:mb-16 text-center flex flex-col items-center">
            <span className="font-sans text-[11px] sm:text-xs tracking-[0.3em] uppercase text-[var(--color-accent-clay)] font-medium mb-3">
              Chapter {currentChapter?.romanNumeral || 'I'}
            </span>

            {/* Editable Chapter Title */}
            {editingTitleChapterId === currentChapter?.id ? (
              <div className="w-full max-w-md flex flex-col items-center gap-2">
                <input
                  type="text"
                  defaultValue={currentChapter?.title}
                  autoFocus
                  onBlur={(e) => {
                    handleChapterTitleChange(currentChapter.id, e.target.value.trim() || currentChapter.originalTitle);
                    setEditingTitleChapterId(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleChapterTitleChange(currentChapter.id, e.currentTarget.value.trim() || currentChapter.originalTitle);
                      setEditingTitleChapterId(null);
                    }
                    if (e.key === 'Escape') setEditingTitleChapterId(null);
                  }}
                  className="w-full text-center font-serif text-2xl sm:text-3xl lg:text-4xl text-[var(--color-text-ink)] bg-transparent border-b border-[var(--color-accent-clay)] py-1 focus:outline-none"
                />
                <span className="font-sans text-[9px] tracking-wider text-[var(--color-text-graphite)]/60">
                  Press Enter or click away to save title
                </span>
              </div>
            ) : (
              <div
                onClick={() => setEditingTitleChapterId(currentChapter?.id || '')}
                className="group cursor-pointer flex items-center justify-center gap-3 relative px-4 py-1 rounded hover:bg-[var(--color-canvas-stone)]/40 transition-colors"
                title="Click to rename chapter"
              >
                <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl text-[var(--color-text-ink)] tracking-tight">
                  {currentChapter?.title}
                </h1>
                <span className="opacity-0 group-hover:opacity-60 transition-opacity font-sans text-[9px] tracking-widest uppercase text-[var(--color-text-graphite)]">
                  Rename
                </span>
              </div>
            )}

            {/* Decorative Book Flourish / Fleuron */}
            <div className="flex items-center justify-center gap-2 mt-6 opacity-40 select-none">
              <span className="w-8 h-[1px] bg-[var(--color-text-graphite)]"></span>
              <span className="font-serif text-xs text-[var(--color-text-graphite)]">&#10086;</span>
              <span className="w-8 h-[1px] bg-[var(--color-text-graphite)]"></span>
            </div>
          </header>

          {/* ========================================================
              MANUSCRIPT READING & EDITING SURFACE
              Genuine Book Prose with Inline Master Writing Styles
              ======================================================== */}
          <div className="flex flex-col gap-10 sm:gap-14 leading-[2.2] sm:leading-[2.4]">
            {currentChapter?.paragraphs?.map((p, pIdx) => {
              const isEditing = editingParagraphId === p.id;
              const isFirstParagraph = pIdx === 0;

              return (
                <div key={p.id} className="group relative flex flex-col">
                  {/* ========================================================
                      TOP ACTION BAR (When In Manual Edit Mode)
                      ======================================================== */}
                  {isEditing && (
                    <div className="flex flex-col gap-2.5 mb-3 select-none animate-[fadeIn_0.2s_ease-out_forwards]">
                      {/* Top Action Row: Title, Writing Style tab, Insert Passage, and Actions */}
                      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                        <div className="flex items-center gap-2">
                          <span className="font-sans text-[10px] tracking-[0.2em] uppercase text-[var(--color-accent-clay)] font-semibold">
                            Passage {pIdx + 1}
                          </span>
                          <span className="font-serif italic font-normal text-[11px] text-[var(--color-text-graphite)]/70">
                            &bull; manual editing
                          </span>
                          {p.isModified && (
                            <span className="text-[9px] font-normal text-[var(--color-accent-sage)] bg-[var(--color-accent-sage)]/10 px-1.5 py-0.5 rounded">
                              Edited
                            </span>
                          )}
                        </div>

                        {/* Companion Buttons: Writing Style Tab + Insert Passage + Done */}
                        <div className="flex items-center gap-2">
                          {/* Writing Style Tab Button — Same Pill Style */}
                          <button
                            type="button"
                            onClick={() =>
                              setActiveStyleTabParagraphId(activeStyleTabParagraphId === p.id ? null : p.id)
                            }
                            className={`py-1 px-3.5 rounded-full border font-sans text-[9px] tracking-[0.16em] uppercase transition-all flex items-center gap-1 focus:outline-none active:scale-95 shadow-sm ${
                              activeStyleTabParagraphId === p.id
                                ? 'bg-[var(--color-text-ink)] text-[var(--color-canvas-linen)] border-[var(--color-text-ink)] font-medium'
                                : 'bg-[var(--color-canvas-stone)]/90 hover:bg-[var(--color-canvas-stone)] border-[var(--color-text-graphite)]/25 text-[var(--color-text-graphite)] hover:text-[var(--color-text-ink)]'
                            }`}
                          >
                            <span>Writing Style</span>
                            <span className="text-[8px] opacity-60 ml-0.5">
                              {activeStyleTabParagraphId === p.id ? '▲' : '▾'}
                            </span>
                          </button>

                          {/* Insert Passage Button — Same Pill Style */}
                          <button
                            type="button"
                            onClick={() => handleAddParagraph(currentChapter.id, pIdx)}
                            className="py-1 px-3.5 rounded-full bg-[var(--color-canvas-stone)]/90 hover:bg-[var(--color-canvas-stone)] border border-[var(--color-text-graphite)]/25 font-sans text-[9px] tracking-[0.16em] uppercase text-[var(--color-text-graphite)] hover:text-[var(--color-text-ink)] transition-colors focus:outline-none active:scale-95 shadow-sm flex items-center gap-1"
                          >
                            <span>+</span>
                            <span>Insert Passage</span>
                          </button>

                          {p.isModified && (
                            <button
                              type="button"
                              onClick={() => handleRevertParagraph(currentChapter.id, p.id)}
                              className="font-sans text-[10px] tracking-wider text-[var(--color-text-graphite)] hover:text-[var(--color-text-ink)] underline transition-colors px-1"
                            >
                              Revert
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDeleteParagraph(currentChapter.id, p.id)}
                            className="font-sans text-[10px] tracking-wider text-red-500/70 hover:text-red-700 transition-colors px-1"
                          >
                            Remove
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setEditingParagraphId(null);
                              setActiveStyleTabParagraphId(null);
                            }}
                            className="py-1 px-3.5 rounded-full bg-[var(--color-text-ink)] text-[var(--color-canvas-linen)] font-sans text-[9px] tracking-wider uppercase transition-transform active:scale-95 shadow-sm"
                          >
                            Done
                          </button>
                        </div>
                      </div>

                      {/* EXPANDABLE FIVE PRESET WRITING OPTIONS (When Tab Opened In Edit Mode) */}
                      {activeStyleTabParagraphId === p.id && (
                        <div className="p-3.5 rounded-xl bg-[var(--color-canvas-stone)]/80 border border-[var(--color-text-graphite)]/15 shadow-sm flex flex-col gap-2.5 animate-[fadeIn_0.2s_ease-out_forwards]">
                          <div className="flex items-center justify-between px-1">
                            <span className="font-sans text-[9px] sm:text-[10px] tracking-[0.2em] uppercase text-[var(--color-accent-clay)] font-semibold">
                              Five Preset Writing Options
                            </span>
                            <span className="font-sans text-[9px] text-[var(--color-text-graphite)]/70 hidden sm:inline">
                              Change from how Altheara initially wrote this passage
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                            {MASTER_STYLES.map((style) => (
                              <button
                                key={style.id}
                                type="button"
                                onClick={() => handleOpenRefine(currentChapter.id, p.id, p.text, pIdx, style.id)}
                                className="group text-left p-2.5 rounded-lg bg-[var(--color-canvas-linen)] hover:bg-white border border-[var(--color-text-graphite)]/15 hover:border-[var(--color-accent-clay)] transition-all flex flex-col gap-0.5 shadow-sm active:scale-[0.98]"
                                title={style.description}
                              >
                                <div className="flex items-center gap-1.5">
                                  <span className="font-sans text-[9px] font-semibold text-[var(--color-accent-clay)] tracking-wider shrink-0">
                                    {style.numeral}.
                                  </span>
                                  <span className="font-sans text-[10px] sm:text-[11px] font-medium text-[var(--color-text-ink)] group-hover:text-[var(--color-accent-clay)] transition-colors truncate">
                                    {style.label}
                                  </span>
                                </div>
                                <span className="font-sans text-[8px] text-[var(--color-text-graphite)]/70 truncate">
                                  {style.subtitle}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Active Inline Editor vs Idle Literary Paragraph */}
                  {isEditing ? (
                    <div className="relative -mx-3 p-3 rounded-[8px] bg-[var(--color-canvas-stone)]/40 ring-1 ring-[var(--color-accent-clay)]/40 transition-all">
                      <textarea
                        defaultValue={p.text}
                        autoFocus
                        rows={Math.max(3, Math.ceil(p.text.length / 55))}
                        onChange={(e) => handleParagraphChange(currentChapter.id, p.id, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') setEditingParagraphId(null);
                        }}
                        className="w-full bg-transparent resize-y outline-none font-serif text-[19px] sm:text-[21px] lg:text-[22px] leading-[2.2] sm:leading-[2.4] text-[var(--color-text-ink)] p-0 m-0 border-0 focus:ring-0 focus:outline-none"
                      />
                      <div className="mt-2 flex justify-between items-center text-[10px] font-sans text-[var(--color-text-graphite)]/60 select-none">
                        <span>Click outside or tap Done when finished manual editing</span>
                        <span>{p.text.split(/\s+/).filter(Boolean).length} words</span>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => setEditingParagraphId(p.id)}
                      className={`relative -mx-3 p-3 rounded-[8px] cursor-text transition-all duration-300 hover:bg-[var(--color-canvas-stone)]/30
                        ${p.isModified ? 'border-l-2 border-[var(--color-accent-sage)]' : ''}
                      `}
                      title="Click to edit manually, or use the buttons below to change writing style or insert a passage"
                    >
                      <p
                        className={`font-serif text-[18px] sm:text-[21px] lg:text-[22px] leading-[2.1] sm:leading-[2.4] text-[var(--color-text-ink)]/90 tracking-normal break-words text-left
                          ${isFirstParagraph ? 'first-letter:font-serif first-letter:text-4xl sm:first-letter:text-5xl first-letter:font-medium first-letter:float-left first-letter:mr-2.5 sm:first-letter:mr-3 first-letter:leading-none first-letter:text-[var(--color-text-ink)]' : ''}
                        `}
                      >
                        {p.text}
                      </p>

                      {/* Subtle hover cue for manual editing */}
                      <span className="absolute top-2 right-2 opacity-0 group-hover:opacity-40 transition-opacity font-sans text-[9px] tracking-widest uppercase text-[var(--color-text-graphite)] select-none">
                        Click to Edit
                      </span>
                    </div>
                  )}

                  {/* ========================================================
                      COMPANION BUTTONS: Writing Style Tab + Insert Passage
                      Using the exact same clean pill button style
                      ======================================================== */}
                  <div className="w-full flex flex-col items-center py-2.5 select-none">
                    <div className="flex items-center gap-2">
                      {/* Writing Style Tab Button */}
                      <button
                        type="button"
                        onClick={() =>
                          setActiveStyleTabParagraphId(activeStyleTabParagraphId === p.id ? null : p.id)
                        }
                        className={`py-1 px-3.5 rounded-full border font-sans text-[9px] tracking-[0.16em] uppercase transition-all flex items-center gap-1 focus:outline-none active:scale-95 shadow-sm ${
                          activeStyleTabParagraphId === p.id
                            ? 'bg-[var(--color-text-ink)] text-[var(--color-canvas-linen)] border-[var(--color-text-ink)] font-medium'
                            : 'bg-[var(--color-canvas-stone)]/80 hover:bg-[var(--color-canvas-stone)] border-[var(--color-text-graphite)]/20 text-[var(--color-text-graphite)] hover:text-[var(--color-text-ink)]'
                        }`}
                      >
                        <span>Writing Style</span>
                        <span className="text-[8px] opacity-60 ml-0.5">
                          {activeStyleTabParagraphId === p.id ? '▲' : '▾'}
                        </span>
                      </button>

                      {/* + Insert Passage Button */}
                      <button
                        type="button"
                        onClick={() => handleAddParagraph(currentChapter.id, pIdx)}
                        className="py-1 px-3.5 rounded-full bg-[var(--color-canvas-stone)]/80 hover:bg-[var(--color-canvas-stone)] border border-[var(--color-text-graphite)]/20 font-sans text-[9px] tracking-[0.16em] uppercase text-[var(--color-text-graphite)] hover:text-[var(--color-text-ink)] transition-colors focus:outline-none active:scale-95 shadow-sm flex items-center gap-1"
                      >
                        <span>+</span>
                        <span>Insert Passage</span>
                      </button>
                    </div>

                    {/* Expandable 5 Preset Options (When Writing Style tab is toggled outside manual edit) */}
                    {!isEditing && activeStyleTabParagraphId === p.id && (
                      <div className="w-full max-w-2xl mt-3 p-3.5 rounded-xl bg-[var(--color-canvas-stone)]/90 border border-[var(--color-text-graphite)]/15 shadow-md flex flex-col gap-2.5 animate-[fadeIn_0.2s_ease-out_forwards]">
                        <div className="flex items-center justify-between px-1">
                          <div className="flex items-center gap-2">
                            <span className="font-sans text-[9px] tracking-[0.2em] uppercase text-[var(--color-accent-clay)] font-semibold">
                              Five Preset Writing Options
                            </span>
                            <span className="text-[10px] text-[var(--color-text-graphite)]/40">&bull;</span>
                            <span className="font-serif italic text-xs text-[var(--color-text-graphite)]">
                              Change from how Altheara initially wrote this
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setActiveStyleTabParagraphId(null)}
                            className="text-xs text-[var(--color-text-graphite)] hover:text-[var(--color-text-ink)] px-1"
                          >
                            &times;
                          </button>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                          {MASTER_STYLES.map((style) => (
                            <button
                              key={style.id}
                              type="button"
                              onClick={() => handleOpenRefine(currentChapter.id, p.id, p.text, pIdx, style.id)}
                              className="group text-left p-2.5 rounded-lg bg-[var(--color-canvas-linen)] hover:bg-white border border-[var(--color-text-graphite)]/15 hover:border-[var(--color-accent-clay)] transition-all flex flex-col gap-0.5 shadow-sm active:scale-[0.98]"
                              title={style.description}
                            >
                              <div className="flex items-center gap-1.5">
                                <span className="font-sans text-[9px] font-semibold text-[var(--color-accent-clay)] tracking-wider shrink-0">
                                  {style.numeral}.
                                </span>
                                <span className="font-sans text-[10px] sm:text-[11px] font-medium text-[var(--color-text-ink)] group-hover:text-[var(--color-accent-clay)] transition-colors truncate">
                                  {style.label}
                                </span>
                              </div>
                              <span className="font-sans text-[8px] text-[var(--color-text-graphite)]/70 truncate">
                                {style.subtitle}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* End of Chapter Mark */}
          <footer className="mt-20 pt-10 border-t border-[var(--color-text-graphite)]/15 flex flex-col items-center gap-6">
            <span className="font-sans text-[10px] tracking-[0.25em] uppercase text-[var(--color-text-graphite)]/50">
              End of Chapter {currentChapter?.romanNumeral || 'I'}
            </span>

            {/* Chapter Navigation Buttons */}
            <div className="flex items-center gap-6">
              {draft.chapters.findIndex((c) => c.id === currentChapter?.id) > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const prevIdx = draft.chapters.findIndex((c) => c.id === currentChapter?.id) - 1;
                    if (draft.chapters[prevIdx]) {
                      setActiveChapterId(draft.chapters[prevIdx].id);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }}
                  className="font-sans text-xs tracking-wider uppercase text-[var(--color-text-graphite)] hover:text-[var(--color-text-ink)] transition-colors"
                >
                  &larr; Previous Chapter
                </button>
              )}

              {draft.chapters.findIndex((c) => c.id === currentChapter?.id) < draft.chapters.length - 1 && (
                <button
                  type="button"
                  onClick={() => {
                    const nextIdx = draft.chapters.findIndex((c) => c.id === currentChapter?.id) + 1;
                    if (draft.chapters[nextIdx]) {
                      setActiveChapterId(draft.chapters[nextIdx].id);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }}
                  className="py-2 px-5 rounded-full bg-[var(--color-text-ink)] text-[var(--color-canvas-linen)] font-sans text-[10px] tracking-[0.2em] uppercase hover:bg-[var(--color-text-ink)]/90 transition-all active:scale-[0.98]"
                >
                  Next Chapter &rarr;
                </button>
              )}
            </div>

            {/* If on final chapter, show Finish My Volume call to action */}
            {draft.chapters.findIndex((c) => c.id === currentChapter?.id) === draft.chapters.length - 1 && (
              <div className="w-full mt-8 p-6 sm:p-8 rounded-2xl bg-[var(--color-canvas-stone)]/50 border border-[var(--color-text-graphite)]/20 text-center flex flex-col items-center gap-3">
                <span className="font-sans text-[9px] sm:text-[10px] tracking-[0.25em] uppercase text-[var(--color-accent-clay)] font-semibold">
                  Manuscript Complete
                </span>
                <h3 className="font-serif text-2xl sm:text-3xl text-[var(--color-text-ink)]">
                  Ready to preserve your volume?
                </h3>
                <p className="font-serif italic text-sm text-[var(--color-text-graphite)] max-w-md">
                  Seal your chapters, personal edits, and authentic voice into an immutable keepsake in your private vault.
                </p>
                <button
                  type="button"
                  onClick={handleStartCompletionFlow}
                  className="mt-2 py-2.5 px-6 sm:py-3 sm:px-8 rounded-full bg-[var(--color-text-ink)] text-[var(--color-canvas-linen)] font-sans text-[10px] sm:text-xs tracking-[0.2em] uppercase hover:bg-[var(--color-text-ink)]/90 transition-all active:scale-[0.98] shadow-md"
                >
                  Finish My Volume &rarr;
                </button>
              </div>
            )}
          </footer>
        </article>
      </div>

      {/* ============================================================
          LITERARY DIFF & COMPARISON REVIEW MODAL
          Side-by-Side Original vs. Master Style Revision
          ============================================================ */}
      {refineModalOpen && refineTarget && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.25s_ease-out_forwards]"
        >
          <div
            className="w-full max-w-4xl flex flex-col rounded-2xl bg-[var(--color-canvas-linen)] border border-[var(--color-text-graphite)]/20 shadow-2xl overflow-hidden my-auto"
            style={{ maxHeight: 'min(620px, 78vh)' }}
          >
            {/* Modal Top Bar */}
            <header className="shrink-0 px-5 sm:px-8 py-3.5 sm:py-4 border-b border-[var(--color-text-graphite)]/15 flex items-center justify-between bg-[var(--color-canvas-stone)]/40">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-sans text-[10px] tracking-[0.25em] uppercase text-[var(--color-accent-clay)] font-semibold">
                    Altheara Editorial Studio
                  </span>
                  <span className="text-xs text-[var(--color-text-graphite)]/40">&bull;</span>
                  <span className="font-sans text-[10px] tracking-wider text-[var(--color-text-graphite)]">
                    Passage {refineTarget.paragraphIndex + 1}
                  </span>
                </div>
                <h2 className="font-serif text-lg sm:text-xl font-medium text-[var(--color-text-ink)]">
                  Compare Master Writing Styles
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setRefineModalOpen(false)}
                className="w-8 h-8 rounded-full border border-[var(--color-text-graphite)]/20 flex items-center justify-center text-[var(--color-text-graphite)] hover:text-[var(--color-text-ink)] hover:border-[var(--color-text-ink)] transition-colors text-sm focus:outline-none"
              >
                &times;
              </button>
            </header>

            {/* Five Master Styles Selector Tabs */}
            <div className="shrink-0 px-4 sm:px-8 py-2.5 sm:py-3 bg-[var(--color-canvas-stone)]/60 border-b border-[var(--color-text-graphite)]/10 overflow-x-auto no-scrollbar">
              <div className="flex items-center gap-2 min-w-max">
                <span className="font-sans text-[9px] tracking-[0.2em] uppercase text-[var(--color-text-graphite)]/70 mr-1">
                  Styles:
                </span>
                {MASTER_STYLES.map((style) => {
                  const isSelected = selectedStyle === style.id;
                  return (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => handleSwitchModalStyle(style.id)}
                      className={`px-3 py-1.5 rounded-full font-sans text-[10px] sm:text-[11px] tracking-wider transition-all flex items-center gap-1.5 focus:outline-none ${
                        isSelected
                          ? 'bg-[var(--color-text-ink)] text-[var(--color-canvas-linen)] shadow-md font-medium'
                          : 'bg-[var(--color-canvas-linen)] text-[var(--color-text-graphite)] hover:text-[var(--color-text-ink)] border border-[var(--color-text-graphite)]/15'
                      }`}
                    >
                      <span className="font-sans text-[9px] font-semibold opacity-60 mr-1">{style.numeral}.</span>
                      <span>{style.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Modal Body: Side-by-Side Comparison */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 flex flex-col gap-4 sm:gap-5">
              {/* Style Description Banner */}
              {refineResult && (
                <div className="p-3.5 rounded-xl bg-[var(--color-canvas-stone)]/40 border border-[var(--color-text-graphite)]/10 flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-[var(--color-accent-clay)]/10 border border-[var(--color-accent-clay)]/30 flex items-center justify-center font-sans text-[10px] font-semibold text-[var(--color-accent-clay)] shrink-0 mt-0.5">
                    {refineResult.numeral}
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-serif font-medium text-sm text-[var(--color-text-ink)]">
                        {refineResult.styleLabel}
                      </span>
                      <span className="font-sans text-[9px] tracking-wider uppercase text-[var(--color-accent-clay)] font-medium">
                        &bull; {refineResult.styleSubtitle}
                      </span>
                    </div>
                    <p className="font-serif italic text-xs text-[var(--color-text-graphite)] leading-relaxed">
                      {refineResult.summary}
                    </p>
                  </div>
                </div>
              )}

              {/* Side-by-Side Columns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {/* Column 1: How Altheara Initially Wrote It */}
                <div className="flex flex-col gap-2 p-4 rounded-xl bg-[var(--color-canvas-stone)]/30 border border-[var(--color-text-graphite)]/15">
                  <div className="flex items-center justify-between pb-2 border-b border-[var(--color-text-graphite)]/10">
                    <span className="font-sans text-[9px] tracking-[0.2em] uppercase text-[var(--color-text-graphite)]/70 font-medium">
                      How Altheara Initially Wrote It
                    </span>
                    <span className="font-sans text-[9px] text-[var(--color-text-graphite)]/50">
                      {refineTarget.text.split(/\s+/).filter(Boolean).length} words
                    </span>
                  </div>
                  <p className="font-serif text-[16px] sm:text-[17px] leading-[2.1] text-[var(--color-text-graphite)] italic">
                    &ldquo;{refineTarget.text}&rdquo;
                  </p>
                </div>

                {/* Column 2: Revised in Preset Style */}
                <div className="flex flex-col gap-2 p-4 rounded-xl bg-white border border-[var(--color-accent-clay)]/30 shadow-sm relative">
                  <div className="flex items-center justify-between pb-2 border-b border-[var(--color-accent-clay)]/20">
                    <span className="font-sans text-[9px] tracking-[0.2em] uppercase text-[var(--color-accent-clay)] font-semibold">
                      Revised in {refineResult?.styleLabel || 'Preset'} Style
                    </span>
                    {refineResult && (
                      <span className="font-sans text-[9px] text-[var(--color-text-graphite)]/60">
                        {refineResult.revisedText.split(/\s+/).filter(Boolean).length} words
                      </span>
                    )}
                  </div>

                  {isRefining ? (
                    <div className="min-h-[140px] flex flex-col items-center justify-center gap-3 text-center py-8">
                      <div className="w-6 h-6 rounded-full border-2 border-[var(--color-accent-clay)] border-t-transparent animate-spin"></div>
                      <span className="font-serif italic text-xs text-[var(--color-text-graphite)]">
                        Applying {MASTER_STYLES.find((s) => s.id === selectedStyle)?.label} refinement&hellip;
                      </span>
                    </div>
                  ) : refineError ? (
                    <div className="min-h-[140px] flex flex-col items-center justify-center gap-2 text-center py-6 text-red-600">
                      <span className="text-sm">{refineError}</span>
                      <button
                        type="button"
                        onClick={() => handleSwitchModalStyle(selectedStyle)}
                        className="font-sans text-[10px] underline tracking-wider uppercase"
                      >
                        Try Again
                      </button>
                    </div>
                  ) : (
                    <p className="font-serif text-[17px] sm:text-[18px] leading-[2.2] text-[var(--color-text-ink)]">
                      {refineResult?.revisedText}
                    </p>
                  )}
                </div>
              </div>

              {/* Optional Custom Refinement Note to Editor */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-3 rounded-xl bg-[var(--color-canvas-stone)]/40 border border-[var(--color-text-graphite)]/15">
                <input
                  type="text"
                  value={customInstruction}
                  onChange={(e) => setCustomInstruction(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleApplyCustomInstruction();
                  }}
                  placeholder="Or give a custom note (e.g. 'Make this more subtle' or 'Focus on family')..."
                  className="flex-1 bg-transparent border-0 font-serif text-xs sm:text-sm text-[var(--color-text-ink)] placeholder:text-[var(--color-text-graphite)]/50 focus:outline-none focus:ring-0 px-1 py-1"
                />
                <button
                  type="button"
                  onClick={handleApplyCustomInstruction}
                  disabled={!customInstruction.trim() || isRefining}
                  className="py-1 px-3 rounded-lg bg-[var(--color-text-ink)] text-[var(--color-canvas-linen)] font-sans text-[9px] tracking-wider uppercase disabled:opacity-40 transition-opacity whitespace-nowrap self-end sm:self-auto"
                >
                  Apply Note
                </button>
              </div>
            </div>

            {/* Modal Action Footer */}
            <footer className="shrink-0 px-5 sm:px-8 py-3.5 sm:py-4 border-t border-[var(--color-text-graphite)]/15 bg-[var(--color-canvas-stone)]/40 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setRefineModalOpen(false)}
                className="w-full sm:w-auto font-sans text-[10px] sm:text-[11px] tracking-[0.16em] uppercase text-[var(--color-text-graphite)] hover:text-[var(--color-text-ink)] transition-colors py-2 px-3 order-3 sm:order-1"
              >
                Keep Original
              </button>

              <div className="flex items-center gap-3 w-full sm:w-auto order-1 sm:order-2">
                {/* Try Another Style Button */}
                <button
                  type="button"
                  onClick={() => {
                    const currentIdx = MASTER_STYLES.findIndex((s) => s.id === selectedStyle);
                    const nextStyle = MASTER_STYLES[(currentIdx + 1) % MASTER_STYLES.length];
                    handleSwitchModalStyle(nextStyle.id);
                  }}
                  disabled={isRefining}
                  className="flex-1 sm:flex-initial py-2 sm:py-2.5 px-4 rounded-full border border-[var(--color-text-graphite)]/30 hover:border-[var(--color-text-ink)] text-[var(--color-text-ink)] font-sans text-[10px] sm:text-[11px] tracking-[0.15em] uppercase transition-all active:scale-[0.98] disabled:opacity-40"
                >
                  Try Another Style
                </button>

                {/* Accept & Apply Button */}
                <button
                  type="button"
                  onClick={handleApplyRefinement}
                  disabled={!refineResult || isRefining}
                  className="flex-1 sm:flex-initial py-2 sm:py-2.5 px-5 sm:px-6 rounded-full bg-[var(--color-text-ink)] hover:bg-[var(--color-text-ink)]/90 text-[var(--color-canvas-linen)] font-sans text-[10px] sm:text-[11px] tracking-[0.18em] uppercase transition-all shadow-md active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-1.5"
                >
                  <span>Accept &amp; Apply</span>
                </button>
              </div>
            </footer>
          </div>
        </div>
      )}
      {/* ============================================================
          FIVE-STAGE VOLUME COMPLETION & PRESERVATION MODAL
          ============================================================ */}
      {draft && (
        <VolumeCompletionModal
          isOpen={completionModalOpen}
          onClose={() => setCompletionModalOpen(false)}
          draft={draft}
          initialStage={completionStage}
        />
      )}
    </main>
  );
}

export default function FullManuscriptEditor() {
  return (
    <Suspense
      fallback={
        <main className="min-h-[100dvh] w-full flex flex-col items-center justify-center p-8 bg-[var(--color-canvas-linen)]">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-8 h-8 rounded-full border-2 border-[var(--color-accent-clay)] border-t-transparent animate-spin"></div>
            <span className="font-serif italic text-base text-[var(--color-text-graphite)]">
              Opening your manuscript...
            </span>
          </div>
        </main>
      }
    >
      <ManuscriptEditorContent />
    </Suspense>
  );
}
