// ============================================================
// ALTHEARA VOLUME CREATION & EDITOR - DATA ARCHITECTURE
// ============================================================
// Guiding Principle: "Altheara has preserved your year. Now make the book your own."
// Source volumes are immutable records of preserved years.
// Editable drafts are isolated working copies that never mutate original memories.
// ============================================================

import { STORY_CHAPTERS } from './storyData';

export interface VolumeSummary {
  id: string;
  year: number;
  title: string;
  subtitle: string;
  status: 'completed' | 'in_progress';
  completedDate?: string;
  totalMoments: number;
  chapterCount: number;
  wordCount: number;
  coverAccent: string; // Tailored Mediterranean palette token
  linenCollection: string;
  hasActiveDraft?: boolean;
  lastDraftUpdated?: string;
}

export interface ManuscriptParagraph {
  id: string;
  text: string;
  originalText: string;
  isModified: boolean;
}

export interface ManuscriptChapter {
  id: string;
  number: number;
  romanNumeral: string;
  title: string;
  originalTitle: string;
  isTitleModified: boolean;
  paragraphs: ManuscriptParagraph[];
}

export interface VolumeDraft {
  draftId: string;
  sourceVolumeId: string;
  year: number;
  bookTitle: string;
  originalBookTitle: string;
  subtitle: string;
  authorName: string;
  chapters: ManuscriptChapter[];
  lastSavedAt: string;
  version: number;
  isDirty?: boolean;
}

// --- IMMUTABLE SOURCE VOLUMES ---
export const SOURCE_VOLUMES: VolumeSummary[] = [
  {
    id: 'vol-2025',
    year: 2025,
    title: 'The First Year',
    subtitle: 'The accumulation of your presence',
    status: 'completed',
    completedDate: 'December 31, 2025',
    totalMoments: 365,
    chapterCount: 3,
    wordCount: 12450,
    coverAccent: '#8B5A42', // Terracotta linen
    linenCollection: '2025 Mediterranean Terracotta Edition'
  },
  {
    id: 'vol-2026',
    year: 2026,
    title: 'The Current Year',
    subtitle: 'Moments quietly gathered',
    status: 'in_progress',
    totalMoments: 84,
    chapterCount: 1,
    wordCount: 2840,
    coverAccent: '#5C6B5E', // Aegean olive
    linenCollection: '2026 Aegean Olive Edition'
  }
];

const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

/**
 * Creates a brand new, isolated working draft cloned from the immutable source volume.
 * Does not mutate the source volume in any way.
 */
export function createInitialDraft(volumeId: string): VolumeDraft {
  const source = SOURCE_VOLUMES.find(v => v.id === volumeId);
  if (!source) throw new Error(`Source volume ${volumeId} not found`);

  // Clone chapters from STORY_CHAPTERS for vol-2025
  const chapters: ManuscriptChapter[] = STORY_CHAPTERS.map((chap, idx) => ({
    id: `draft-${chap.id}`,
    number: idx + 1,
    romanNumeral: ROMAN_NUMERALS[idx] || `${idx + 1}`,
    title: chap.title.replace(/^Chapter\s+[IVXLCDM]+:\s*/i, ''),
    originalTitle: chap.title.replace(/^Chapter\s+[IVXLCDM]+:\s*/i, ''),
    isTitleModified: false,
    paragraphs: chap.paragraphs.map((text, pIdx) => ({
      id: `p-${idx + 1}-${pIdx + 1}`,
      text: text,
      originalText: text,
      isModified: false
    }))
  }));

  return {
    draftId: `draft_${volumeId}_${Date.now()}`,
    sourceVolumeId: volumeId,
    year: source.year,
    bookTitle: source.title,
    originalBookTitle: source.title,
    subtitle: source.subtitle,
    authorName: 'Sarah', // App member name from onboarding
    chapters,
    lastSavedAt: new Date().toISOString(),
    version: 1,
    isDirty: false
  };
}
