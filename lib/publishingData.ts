// ============================================================
// ALTHEARA LEGACY PUBLISHER — CORE DATA CONTRACTS & SCHEMAS
// ============================================================
// Foundation for transforming preserved private volume editions
// into finished, publication-ready works.
// Pure literary typography, strict tenant isolation, zero emojis.
// ============================================================

import { ManuscriptChapter } from './volumeData';

export type PublishingStep = 1 | 2 | 3 | 4 | 5;

export interface PublishingCoverConfig {
  type: 'signature_linen' | 'custom_upload';
  annualDesignId?: string; // e.g. 'linen-2025-oatmeal'
  baseColor?: string;
  spineFoilColor?: string;
  customFoilTitle?: string;
  uploadedAssetPath?: string; // /api/volume/publishing/cover?assetId=...
  textColorScheme?: 'light' | 'dark' | 'gold';
  isApproved: boolean;
}

export interface PublishingAuthorVideoAsset {
  assetId: string;
  mediaType: 'video';
  mimeType: string;
  durationSeconds: number;
  storagePath: string; // /api/volume/publishing/video?assetId=...
  recordedAt: string;
  isApproved: boolean;
}

/**
 * Isolated publishing draft model.
 * Completely segregated from private working volume drafts (vol-2025.json)
 * and immutable historical editions.
 */
export interface PublishingDraft {
  publishingDraftId: string; // pub_draft_{publicationId}_{timestamp}
  publicationId: string; // Stable publication identity: pub_{sourceVolumeId}_{uniqueId}
  memberId: string; // Authenticated member ID
  sourceVolumeId: string; // vol-2025
  sourceEditionId: string; // ed_vol-2025_v4_1794249666399
  sourceEditionVersion: number; // 4
  bookTitle: string;
  subtitle?: string;
  authorDisplayName: string;
  publicationDescription?: string;
  dedication?: string;
  chapters: ManuscriptChapter[];
  coverConfig?: PublishingCoverConfig;
  authorVideo?: PublishingAuthorVideoAsset | null;
  status: 'draft';
  currentStep: PublishingStep;
  createdAt: string;
  lastSavedAt: string;
  version: number; // Draft revision counter
  isDirty?: boolean;
}

/**
 * Summary record representing an active publication work.
 * Supports multiple distinct publications derived from a single source volume.
 */
export interface PublicationSummary {
  publicationId: string;
  memberId: string;
  sourceVolumeId: string;
  sourceEditionId: string;
  sourceEditionVersion: number;
  bookTitle: string;
  subtitle?: string;
  authorDisplayName: string;
  activeDraftId: string;
  createdAt: string;
  lastSavedAt: string;
  sealedEditionCount: number;
  status: 'draft' | 'preserved';
}
