"use client";

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { VolumeDraft, ManuscriptChapter, ManuscriptParagraph, SOURCE_VOLUMES } from '@/lib/volumeData';

type SaveStatus = 'saved' | 'saving' | 'dirty' | 'error';

function ManuscriptEditorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const volumeId = searchParams.get('volumeId') || 'vol-2025';
  const initialEditMode = searchParams.get('edit') === '1';
  const initialTocOpen = searchParams.get('toc') === '1';

  const [draft, setDraft] = useState<VolumeDraft | null>(null);
  const [activeChapterId, setActiveChapterId] = useState<string>('');
  const [editingParagraphId, setEditingParagraphId] = useState<string | null>(null);
  const [editingTitleChapterId, setEditingTitleChapterId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [lastSavedTimeText, setLastSavedTimeText] = useState('Just now');
  const [mobileTocOpen, setMobileTocOpen] = useState(initialTocOpen);
  const [isExiting, setIsExiting] = useState(false);

  // Auto-save debounce timer
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load working draft on mount
  useEffect(() => {
    let isMounted = true;
    async function loadDraft() {
      try {
        setSaveStatus('saving');
        const res = await fetch(`/api/volume/draft?volumeId=${volumeId}`);
        if (!res.ok) throw new Error('Failed to load draft');
        const data = await res.json();
        if (isMounted && data.draft) {
          setDraft(data.draft);
          if (data.draft.chapters.length > 0) {
            setActiveChapterId(data.draft.chapters[0].id);
            if (initialEditMode && data.draft.chapters[0].paragraphs.length > 0) {
              setEditingParagraphId(data.draft.chapters[0].paragraphs[0].id);
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
  }, [volumeId, initialEditMode]);

  // Save function to server
  const saveDraftToServer = useCallback(async (draftToSave: VolumeDraft) => {
    try {
      setSaveStatus('saving');
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
        localStorage.setItem(`altheara_draft_${draftToSave.sourceVolumeId}`, JSON.stringify(data.draft));
      } catch {
        // storage fallback
      }
    } catch (err) {
      console.error('Save error:', err);
      setSaveStatus('error');
    }
  }, []);

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

  // Update a paragraph's text inline
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

  // Revert a paragraph to original source text
  const handleRevertParagraph = (chapterId: string, paragraphId: string) => {
    if (!draft) return;
    const targetChap = draft.chapters.find((c) => c.id === chapterId);
    const targetP = targetChap?.paragraphs.find((p) => p.id === paragraphId);
    if (!targetP) return;

    handleParagraphChange(chapterId, paragraphId, targetP.originalText);
    setEditingParagraphId(null);
  };

  // Add a new passage to chapter
  const handleAddParagraph = (chapterId: string, afterParagraphIndex: number) => {
    if (!draft) return;
    const newId = `p-${Date.now()}`;
    const newParagraph: ManuscriptParagraph = {
      id: newId,
      text: '',
      originalText: '',
      isModified: true,
    };

    const updatedChapters = draft.chapters.map((chap) => {
      if (chap.id !== chapterId) return chap;
      const newParagraphs = [...chap.paragraphs];
      newParagraphs.splice(afterParagraphIndex + 1, 0, newParagraph);
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
    setEditingParagraphId(newId);
    queueAutoSave(updatedDraft);
  };

  // Delete a passage from chapter
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
    setEditingParagraphId(null);
    queueAutoSave(updatedDraft);
  };

  // Update a chapter's title
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

  // Handle Exit / Return
  const handleExitToVolumes = async () => {
    if (draft && saveStatus === 'dirty') {
      await saveDraftToServer(draft);
    }
    setIsExiting(true);
    setTimeout(() => {
      router.push('/profile/volume-editor');
    }, 400);
  };

  if (!draft) {
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
        {/* Left: Back to Volumes */}
        <button
          type="button"
          onClick={handleExitToVolumes}
          className="group flex items-center gap-1.5 font-sans text-[10px] sm:text-[11px] tracking-[0.18em] uppercase text-[var(--color-text-graphite)] hover:text-[var(--color-text-ink)] transition-colors focus:outline-none shrink-0"
        >
          <span className="group-hover:-translate-x-1 transition-transform duration-300">&larr;</span>
          <span>Volumes</span>
        </button>

        {/* Center: Book & Year Title */}
        <div className="hidden md:flex flex-col items-center text-center">
          <span className="font-serif font-medium text-xs sm:text-sm tracking-wide text-[var(--color-text-ink)]">
            {draft.bookTitle} &bull; {draft.year}
          </span>
          <span className="font-sans text-[9px] tracking-[0.25em] uppercase text-[var(--color-text-graphite)]/60">
            Private Working Edition
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
                Chapter {currentChapter.romanNumeral}
              </span>
              <span className="font-serif text-sm font-medium text-[var(--color-text-ink)]">
                {currentChapter.title}
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
                    chap.id === currentChapter.id
                      ? 'bg-[var(--color-canvas-linen)] text-[var(--color-text-ink)] font-medium shadow-sm'
                      : 'text-[var(--color-text-graphite)] hover:text-[var(--color-text-ink)]'
                  }`}
                >
                  <span className="font-serif text-sm">
                    {chap.romanNumeral}. {chap.title}
                  </span>
                  <span className="font-sans text-[10px] text-[var(--color-text-graphite)]/60">
                    {chap.paragraphs.length} passages
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
              Altheara &bull; Volume {draft.year} &bull; Chapter {currentChapter.romanNumeral}
            </span>
            <div className="w-16 h-[1px] bg-[var(--color-text-graphite)]/20 mt-3"></div>
          </div>

          {/* Chapter Opening: Roman Numeral & Editable Title */}
          <header className="mb-14 sm:mb-20 text-center flex flex-col items-center">
            <span className="font-sans text-[11px] sm:text-xs tracking-[0.3em] uppercase text-[var(--color-accent-clay)] font-medium mb-3">
              Chapter {currentChapter.romanNumeral}
            </span>

            {/* Editable Chapter Title */}
            {editingTitleChapterId === currentChapter.id ? (
              <div className="w-full max-w-md flex flex-col items-center gap-2">
                <input
                  type="text"
                  defaultValue={currentChapter.title}
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
                onClick={() => setEditingTitleChapterId(currentChapter.id)}
                className="group cursor-pointer flex items-center justify-center gap-3 relative px-4 py-1 rounded hover:bg-[var(--color-canvas-stone)]/40 transition-colors"
                title="Click to rename chapter"
              >
                <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl text-[var(--color-text-ink)] tracking-tight">
                  {currentChapter.title}
                </h1>
                <span className="opacity-0 group-hover:opacity-60 transition-opacity font-sans text-xs text-[var(--color-text-graphite)]">
                  ✎
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
              Genuine Book Prose - No Ugly Form Boxes!
              ======================================================== */}
          <div className="flex flex-col gap-10 sm:gap-14 leading-[2.2] sm:leading-[2.4]">
            {currentChapter.paragraphs.map((p, pIdx) => {
              const isEditing = editingParagraphId === p.id;
              const isFirstParagraph = pIdx === 0;

              return (
                <div key={p.id} className="group relative flex flex-col">
                  {/* Contextual Toolbar when actively editing this paragraph */}
                  {isEditing && (
                    <div className="flex items-center justify-between mb-2 px-1 select-none animate-[fadeIn_0.2s_ease-out_forwards]">
                      <span className="font-sans text-[10px] tracking-[0.2em] uppercase text-[var(--color-accent-clay)] font-medium">
                        Editing Passage {pIdx + 1}
                      </span>
                      <div className="flex items-center gap-3">
                        {p.isModified && (
                          <button
                            type="button"
                            onClick={() => handleRevertParagraph(currentChapter.id, p.id)}
                            className="font-sans text-[10px] tracking-wider text-[var(--color-text-graphite)] hover:text-[var(--color-text-ink)] underline transition-colors"
                          >
                            Revert to original
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteParagraph(currentChapter.id, p.id)}
                          className="font-sans text-[10px] tracking-wider text-red-500/70 hover:text-red-700 transition-colors"
                        >
                          Remove passage
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingParagraphId(null)}
                          className="py-0.5 px-2.5 rounded-full bg-[var(--color-text-ink)] text-[var(--color-canvas-linen)] font-sans text-[9px] tracking-wider uppercase transition-transform active:scale-95"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Active Inline Editor vs Idle Literary Paragraph */}
                  {isEditing ? (
                    <div className="relative -mx-3 p-3 rounded-[6px] bg-[var(--color-canvas-stone)]/40 ring-1 ring-[var(--color-accent-clay)]/30 transition-all">
                      <textarea
                        defaultValue={p.text}
                        autoFocus
                        rows={Math.max(3, Math.ceil(p.text.length / 55))}
                        onChange={(e) => handleParagraphChange(currentChapter.id, p.id, e.target.value)}
                        onBlur={() => {
                          // Keep editing active or close gracefully
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') setEditingParagraphId(null);
                        }}
                        className="w-full bg-transparent resize-y outline-none font-serif text-[19px] sm:text-[21px] lg:text-[22px] leading-[2.2] sm:leading-[2.4] text-[var(--color-text-ink)] p-0 m-0 border-0 focus:ring-0 focus:outline-none"
                      />
                      <div className="mt-2 flex justify-between items-center text-[10px] font-sans text-[var(--color-text-graphite)]/60 select-none">
                        <span>Click outside or tap Done when finished</span>
                        <span>{p.text.split(/\s+/).filter(Boolean).length} words</span>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => setEditingParagraphId(p.id)}
                      className={`relative -mx-3 p-3 rounded-[6px] cursor-text transition-all duration-300 hover:bg-[var(--color-canvas-stone)]/30
                        ${p.isModified ? 'border-l-2 border-[var(--color-accent-sage)]' : ''}
                      `}
                      title="Click anywhere to edit word, sentence, or passage"
                    >
                      <p
                        className={`font-serif text-[18px] sm:text-[21px] lg:text-[22px] leading-[2.1] sm:leading-[2.4] text-[var(--color-text-ink)]/90 tracking-normal break-words text-left
                          ${isFirstParagraph ? 'first-letter:font-serif first-letter:text-4xl sm:first-letter:text-5xl first-letter:font-medium first-letter:float-left first-letter:mr-2.5 sm:first-letter:mr-3 first-letter:leading-none first-letter:text-[var(--color-text-ink)]' : ''}
                        `}
                      >
                        {p.text}
                      </p>

                      {/* Subtle hover edit cue */}
                      <span className="absolute top-3 right-3 opacity-0 group-hover:opacity-40 transition-opacity font-sans text-[10px] tracking-widest uppercase text-[var(--color-text-graphite)] select-none">
                        ✎ Edit
                      </span>
                    </div>
                  )}

                  {/* Insert Passage Divider Button (+ between paragraphs) */}
                  <div className="w-full flex justify-center py-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 select-none">
                    <button
                      type="button"
                      onClick={() => handleAddParagraph(currentChapter.id, pIdx)}
                      className="py-1 px-3 rounded-full bg-[var(--color-canvas-stone)]/80 hover:bg-[var(--color-canvas-stone)] border border-[var(--color-text-graphite)]/20 font-sans text-[9px] tracking-[0.18em] uppercase text-[var(--color-text-graphite)] hover:text-[var(--color-text-ink)] transition-colors focus:outline-none"
                    >
                      + Insert Passage
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* End of Chapter Mark */}
          <footer className="mt-20 pt-10 border-t border-[var(--color-text-graphite)]/15 flex flex-col items-center gap-6">
            <span className="font-sans text-[10px] tracking-[0.25em] uppercase text-[var(--color-text-graphite)]/50">
              End of Chapter {currentChapter.romanNumeral}
            </span>

            {/* Chapter Navigation Buttons */}
            <div className="flex items-center gap-6">
              {draft.chapters.findIndex((c) => c.id === currentChapter.id) > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const prevIdx = draft.chapters.findIndex((c) => c.id === currentChapter.id) - 1;
                    setActiveChapterId(draft.chapters[prevIdx].id);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="font-sans text-xs tracking-wider uppercase text-[var(--color-text-graphite)] hover:text-[var(--color-text-ink)] transition-colors"
                >
                  &larr; Previous Chapter
                </button>
              )}

              {draft.chapters.findIndex((c) => c.id === currentChapter.id) < draft.chapters.length - 1 && (
                <button
                  type="button"
                  onClick={() => {
                    const nextIdx = draft.chapters.findIndex((c) => c.id === currentChapter.id) + 1;
                    setActiveChapterId(draft.chapters[nextIdx].id);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="py-2 px-5 rounded-full bg-[var(--color-text-ink)] text-[var(--color-canvas-linen)] font-sans text-[10px] tracking-[0.2em] uppercase hover:bg-[var(--color-text-ink)]/90 transition-all active:scale-[0.98]"
                >
                  Next Chapter &rarr;
                </button>
              )}
            </div>
          </footer>
        </article>
      </div>
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

