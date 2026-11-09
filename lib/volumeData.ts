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
  clonedFromEditionId?: string; // Provenance: ID of historical edition branched from
  clonedFromVersion?: number;   // Provenance: Version number branched from (e.g. 1)
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
  clonedFromEditionId?: string; // Provenance: ID of historical edition branched from
  clonedFromVersion?: number;   // Provenance: Version number branched from (e.g. 1)
}

// --- DIGITAL LIBRARY PRESERVED BOOK AGGREGATION ---
// Brief Section 4: One card per book regardless of how many preserved editions exist.
export interface PreservedBookCover {
  type: 'signature_linen' | 'custom_accent' | 'classic_canvas';
  baseColor: string;
  spineFoilColor: string;
  coverFinish?: string;
  accentColor?: string;
  embellishment?: string;
  customizedTitle?: string;
  annualDesignId?: string;
}

export interface PreservedVolumeEditionSummary {
  editionId: string;
  version: number;
  preservedAt: string;
  bookTitle: string;
  subtitle?: string;
  totalChapters: number;
  totalWords: number;
  hasAuthenticRecording: boolean;
  recordingMediaType?: 'voice' | 'video';
  preservationFormats: PreservationFormatConfig;
}

export interface PreservedBook {
  bookId: string; // sourceVolumeId e.g. 'vol-2025'
  bookType: 'annual_volume' | 'life_book';
  year?: number;
  displayTitle: string;
  subtitle?: string;
  authorName: string;
  cover: PreservedBookCover;
  latestEdition: PreservedVolumeEdition;
  editions: PreservedVolumeEditionSummary[];
  totalEditions: number;
  hasAuthenticRecording: boolean;
  latestRecordingMediaType?: 'voice' | 'video';
  lastPreservedAt: string;
}

// --- READING STATE ISOLATION ---
// Brief Section 6 & 10: Reading progress must be separate from immutable manuscript data.
export interface ReadingStateRecord {
  memberId: string;
  editionId: string;
  chapterIndex: number;
  paragraphId?: string;
  scrollPercentage?: number;
  lastReadAt: string;
}

// --- DEDICATED AUDIOBOOK PRESERVATION PACKAGE (Phase D2) ---
// Package is stored in .data/vault/{memberId}/audiobooks/{editionId}.json
// strictly decoupled from immutable manuscript snapshot.
export type NarrationSourceType = 
  | 'authentic_author_recording'       // Genuine human author recording
  | 'authorized_digital_voice_replica' // Separate authorized AI replica
  | 'passage_take_only'                // Author passage excerpt (not full book)
  | 'unrecorded';                      // No audio attached

export type AudiobookAvailabilityStatus = 
  | 'complete'                         // Every required chapter has approved audio
  | 'partial'                          // Multiple tracks exist, but incomplete
  | 'passage_take_only'                // Single preserved passage take
  | 'not_available';                   // No audio recorded for this edition

export interface AudiobookTrack {
  trackId: string;
  chapterId: string;
  chapterNumber: number;
  chapterRoman: string;
  chapterTitle: string;
  audioAssetId: string;
  storagePath: string;                 // URL: /api/volume/recording?assetId=...
  mimeType: string;
  durationSeconds: number;
  fileSizeBytes: number;
  wordCount?: number;
  status: 'approved_by_author' | 'pending_approval';
}

export interface VoiceConsentRecord {
  consentId: string;
  memberId: string;
  sourceVolumeId: string;
  editionId: string;
  authorizedAt: string;
  scope: 'this_edition_only' | 'this_volume_all_editions';
  voiceSampleAssetId: string;
  providerModelId?: string;
  termsVersion: string;
  status: 'active' | 'revoked';
}

export interface AudiobookPackage {
  editionId: string;
  sourceVolumeId: string;
  bookTitle: string;
  authorName: string;
  narrationSource: NarrationSourceType;
  availabilityStatus: AudiobookAvailabilityStatus;
  narratorCredit: string;
  isAiGenerated: boolean;
  totalDurationSeconds: number;
  totalChapters: number;
  completedChapters: number;
  tracks: AudiobookTrack[];
  consentRecordId?: string | null;
  isDevFixture?: boolean;              // Tagged if using legitimate test fixture
  createdAt: string;
  updatedAt: string;
}

// --- LISTENING STATE PERSISTENCE (Phase D2) ---
// Stored in .data/vault/{memberId}/listening_state/{editionId}.json
export interface ListeningStateRecord {
  memberId: string;
  editionId: string;
  activeTrackIndex: number;
  activeChapterNumber: number;
  trackProgressSeconds: number;
  totalDurationSeconds: number;
  totalProgressPercentage: number;
  playbackRate: number;
  volume: number;
  lastListenedAt: string;
}

// --- FUTURE FULL-BOOK AVATAR NARRATION ARCHITECTURE (Phase D Foundation) ---
// Dedicated edition-bound package contract for future avatar integration.
// Decoupled from immutable manuscript snapshots in .data/vault/{memberId}/avatar_packages/{editionId}.json
export type AvatarVideoProvenanceType =
  | 'authentic_author_video'          // Genuine recorded author video footage
  | 'authorized_synthetic_avatar'     // Authorized AI likeness & voice synthesis
  | 'passage_take_only'               // Individual passage take (current status)
  | 'unrecorded';                     // No video preserved

export type AvatarVideoAvailabilityStatus =
  | 'complete'                        // Every chapter has approved video narration
  | 'partial'                         // Multiple chapters present, but incomplete
  | 'passage_take_only'               // Single passage excerpt (current status)
  | 'not_available';                  // No video preserved for this edition

export interface AvatarLikenessConsentRecord {
  consentId: string;
  memberId: string;
  sourceVolumeId: string;
  editionId: string;
  authorizedAt: string;
  scope: 'this_edition_only' | 'this_volume_all_editions';
  likenessReferenceAssetId: string;
  voiceReferenceAssetId: string;
  providerModelId?: string;
  termsVersion: string;
  status: 'active' | 'revoked';
}

export interface AvatarVideoTrack {
  trackId: string;
  chapterId: string;
  chapterNumber: number;
  chapterRoman: string;
  chapterTitle: string;
  videoAssetId: string;
  storagePath: string;                // e.g. /api/volume/recording?assetId=...
  mimeType: string;
  durationSeconds: number;
  fileSizeBytes: number;
  status: 'approved_by_author' | 'pending_approval';
}

export interface AvatarVideoPackage {
  editionId: string;
  sourceVolumeId: string;
  bookTitle: string;
  authorName: string;
  videoProvenance: AvatarVideoProvenanceType;
  availabilityStatus: AvatarVideoAvailabilityStatus;
  avatarCredit: string;
  isSyntheticAvatar: boolean;
  totalDurationSeconds: number;
  totalChapters: number;
  completedChapters: number;
  tracks: AvatarVideoTrack[];
  consentRecordId?: string | null;
  createdAt: string;
  updatedAt: string;
}

// --- PHYSICAL EDITION ORDER & BINDERY MODELS (Phase E) ---
// Dedicated edition-bound physical order ledger decoupled from manuscript snapshots.
// Stored in .data/vault/{memberId}/orders/{orderId}.json

export type PhysicalFormatType = 'signature_linen' | 'custom_hardcover' | 'paperback';

export type BinderyFulfillmentStatus = 
  | 'order_received'          // Order confirmed, waiting for bindery batch
  | 'crafting_at_bindery'     // In active binding, printing, or foil debossing
  | 'quality_inspected'       // Hand-inspected by bindery master
  | 'shipped'                 // Dispatched with carrier tracking
  | 'delivered'               // Safely received by member
  | 'cancelled';              // Cancelled prior to binding

export interface FrozenPrintSpecification {
  formatType: PhysicalFormatType;
  formatDisplayName: string;       // e.g. "Altheara Signature Linen (2025 Annual Collection)"
  trimSize: '6x9';
  paperStock: 'Cream 60# Archival Book';
  bindingType: 'Case-Bound Woven Linen' | 'Case Laminate Matte' | 'Trade Paperback Perfect Bound';
  coverFinish: string;             // e.g. "Archival Oatmeal Linen with Bronze Foil Spine"
  customizedTitle: string;         // Debossed/foil stamped title
  authorName: string;
  spineFoilColor: string;
  baseColor: string;
  annualDesignId?: string;
  estimatedPageCount: number;
}

export interface OrderEvent {
  eventId: string;
  timestamp: string;               // ISO timestamp
  status: BinderyFulfillmentStatus;
  headline: string;
  description: string;
  carrier?: string;
  trackingNumber?: string;
}

export interface BinderyFulfillmentRecord {
  status: BinderyFulfillmentStatus;
  statusUpdatedAt: string;
  statusHeadline: string;          // e.g. "Hand-Crafting at Bindery"
  statusDescription: string;       // e.g. "Your manuscript has been printed on 60# cream archival paper and is undergoing cloth casing and bronze foil stamping."
  carrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  estimatedDelivery?: string;
  destinationSnippet?: string;     // e.g. "Portland, OR 97201" (privacy-safe address snippet)
  binderyFacility?: string;        // e.g. "Altheara Master Bindery, Oregon"
  events: OrderEvent[];            // Append-only event ledger
}

export interface PhysicalOrderPaymentRecord {
  referenceId: string;
  currency: 'USD';
  unitPriceCents: number;
  quantity: number;
  totalCents: number;
  paymentStatus: 'paid' | 'comped_membership_benefit' | 'refunded';
  paidAt: string;
}

export interface PhysicalEditionOrder {
  orderId: string;                 // e.g. "ord_phys_20261109_sarah_01"
  memberId: string;                // Authenticated owner
  editionId: string;               // Exact preserved edition snapshot bound to this order
  sourceVolumeId: string;          // e.g. "vol-2025"
  editionVersion: number;          // e.g. 3
  bookTitle: string;               // Preserved title
  orderedAt: string;               // ISO timestamp
  frozenPrintSpec: FrozenPrintSpecification;
  quantity: number;
  fulfillment: BinderyFulfillmentRecord;
  payment?: PhysicalOrderPaymentRecord;
  isReorderEligible: boolean;
  parentOrderId?: string | null;   // Linked if this order is a reorder
  isDevFixture?: boolean;          // Clearly marked if used in verification fixture
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
