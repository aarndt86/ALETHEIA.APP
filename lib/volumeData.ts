// ============================================================
// ALTHEARA VOLUME CREATION & EDITOR - DATA ARCHITECTURE
// ============================================================
// Guiding Principle: "Altheara has preserved your year. Now make the book your own."
// Source volumes are immutable records of preserved years.
// Editable drafts are isolated working copies that never mutate original memories.
// Preserved editions are immutable snapshots committed to the member's private vault.
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
  coverAccent: string; // Tailored palette token
  linenCollection: string;
  hasActiveDraft?: boolean;
  lastDraftUpdated?: string;
  preservedEditionCount?: number;
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

// --- ANNUAL SIGNATURE LINEN DESIGN SYSTEM ---
export interface AnnualLinenDesign {
  designId: string;
  year: number;
  collectionTitle: string;
  collectionSubtitle: string;
  status: 'development_preview' | 'official_release';
  material: string;
  baseColor: string; // Oatmeal linen #E8E2D9
  spineFoilColor: string; // Espresso bronze #3B3128
  spineTypography: string; // Playfair Display Roman
  coverEmbellishment: string; // Debossed botanical filigree accent
  isTitleCustomizable: true; // Only title is member-customizable
  isCoverDesignLocked: true; // Binding, layout, spine locked to annual design
}

export const ANNUAL_LINEN_DESIGNS: Record<number, AnnualLinenDesign> = {
  2025: {
    designId: 'linen-2025-oatmeal',
    year: 2025,
    collectionTitle: '2025 Signature Linen Collection',
    collectionSubtitle: 'Natural Oatmeal & Espresso Bronze Foil',
    status: 'development_preview',
    material: 'Archival oatmeal woven linen cloth',
    baseColor: '#E8E2D9',
    spineFoilColor: '#3B3128',
    spineTypography: 'Archival Playfair Display Roman',
    coverEmbellishment: 'Debossed botanical filigree accent',
    isTitleCustomizable: true,
    isCoverDesignLocked: true
  },
  2026: {
    designId: 'linen-2026-olive-preview',
    year: 2026,
    collectionTitle: '2026 Curated Linen Preview',
    collectionSubtitle: 'Aegean Olive & Warm Muted Gold',
    status: 'development_preview',
    material: 'Natural woven olive linen cloth',
    baseColor: '#5C6B5E',
    spineFoilColor: '#C4A47C',
    spineTypography: 'Archival Playfair Display Roman',
    coverEmbellishment: 'Debossed laurel foliage motif',
    isTitleCustomizable: true,
    isCoverDesignLocked: true
  }
};

// --- AUTHENTIC RECORDED PRESENCE ASSET ---
export interface AuthenticRecordingAsset {
  assetId: string;
  memberId: string;
  mediaType: 'voice' | 'video';
  mimeType: string;
  durationSeconds: number;
  fileSizeBytes: number;
  storagePath: string; // e.g., /api/volume/recording?assetId=...
  selectedPassageExcerpt?: string;
  recordedAt: string;
  status: 'approved_by_member';
  storageType: 'development_local_vault';
}

// --- PRESERVATION EDITIONS CONFIGURATION ---
export interface PreservationFormatConfig {
  ebook: {
    included: true;
    status: 'preserved_digital';
  };
  paperback?: {
    configured: boolean;
    status: 'configured_in_vault';
    trimSize: '6x9';
    paperStock: 'Cream 60# Archival Book';
  };
  customHardcover?: {
    configured: boolean;
    status: 'configured_in_vault';
    binding: 'Case Laminate Matte';
    trimSize: '6x9';
  };
  signatureLinen?: {
    configured: boolean;
    annualDesignId: string;
    customizedTitle: string;
    status: 'configured_in_vault';
    coverFinish: 'Archival Oatmeal Linen with Bronze Foil Spine';
  };
}

// --- IMMUTABLE PRESERVED VOLUME EDITION ---
export interface PreservedVolumeEdition {
  editionId: string; // ed_vol-2025_v1_1741512345
  memberId: string; // Authenticated member ID
  sourceVolumeId: string; // vol-2025
  version: number; // 1, 2, ...
  preservedAt: string; // ISO timestamp
  status: 'preserved_in_vault';
  storageType: 'development_local_vault';
  bookTitle: string;
  subtitle: string;
  authorName: string;
  totalChapters: number;
  totalWords: number;
  chapters: ManuscriptChapter[];
  authenticRecording?: AuthenticRecordingAsset | null;
  preservationFormats: PreservationFormatConfig;
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
    coverAccent: '#8B5A42', // Terracotta linen accent
    linenCollection: '2025 Signature Linen Collection (Natural Oatmeal)'
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
    coverAccent: '#5C6B5E', // Aegean olive accent
    linenCollection: '2026 Aegean Olive Preview'
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
