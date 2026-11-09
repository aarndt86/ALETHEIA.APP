// ============================================================
// ALTHEARA LEGACY PUBLISHER — CORE DATA CONTRACTS & SCHEMAS
// ============================================================
// Foundation for transforming preserved private volume editions
// into finished, publication-ready works.
// Pure literary typography, strict tenant isolation, zero emojis.
// ============================================================

import { ManuscriptChapter } from './volumeData';

export type PublishingStep = 1 | 2 | 3 | 4 | 5;

/**
 * Verified Bookstore Listing Image Asset.
 * Stored securely in member's vault publishing_assets directory.
 */
export interface BookstoreImageAsset {
  assetId: string;
  publicationId: string;
  memberId: string;
  fileName: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  fileSizeBytes: number;
  width: number;
  height: number;
  storagePath: string; // /api/volume/publishing/image?assetId=...&pubDraftId=...
  uploadedAt: string;
}

/**
 * Bookstore Listing Image configuration on the publishing draft.
 * Represents pure visual artwork, decoupled from bookstore typographic listing metadata.
 */
export interface BookstoreImageConfig {
  assetId: string;
  source: 'member_upload' | 'ai_generated';
  storagePath: string;
  mimeType: string;
  width: number;
  height: number;
  isApproved: boolean;
  approvedAt?: string;
}

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

/**
 * Verified Author Video Asset record.
 * Stored in member vault publishing_assets directory.
 */
export interface BookstoreVideoAsset {
  assetId: string;
  publicationId: string;
  memberId: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  durationSeconds: number;
  storagePath: string; // /api/volume/publishing/video?assetId=...&pubDraftId=...
  uploadedAt: string;
}

export interface PublishingAuthorVideoAsset {
  assetId: string;
  mediaType: 'video';
  mimeType: string;
  durationSeconds: number;
  fileSizeBytes?: number;
  storagePath: string; // /api/volume/publishing/video?assetId=...&pubDraftId=...
  recordedAt: string;
  isApproved: boolean;
  approvedAt?: string;
  consentConfirmed?: boolean;
  source?: 'member_recording' | 'member_upload';
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
  bookstoreImage?: BookstoreImageConfig;
  coverConfig?: PublishingCoverConfig;
  videoChoice?: 'none' | 'included' | 'undecided';
  authorVideo?: PublishingAuthorVideoAsset | null;
  rightsConfirmations?: PublishingRightsConfirmations;
  latestPreservedEditionId?: string;
  status: 'draft';
  currentStep: PublishingStep;
  createdAt: string;
  lastSavedAt: string;
  version: number; // Draft revision counter
  isDirty?: boolean;
}

/**
 * Explicit member publishing rights and privacy confirmation records.
 * Required before preserving a publication edition.
 */
export interface PublishingRightsConfirmations {
  personalInfoReviewed: boolean;
  intellectualPropertyConfirmed: boolean;
  thirdPartyPermissionsConfirmed: boolean;
  confirmedAt: string;
}

/**
 * Immutable Preserved Publication Edition.
 * Archived strictly in the member's private vault (publications/{publicationId}/editions/).
 * CRITICAL ARCHITECTURAL BOUNDARY:
 * Preserved Private Edition !== Public Bookstore Listing.
 * isPubliclyListed is FALSE by default and cannot be exposed without a separate authorization.
 */
export interface PreservedPublicationEdition {
  publicationEditionId: string; // pub_ed_{publicationId}_v{version}_{timestamp}
  publicationId: string; // Stable publication identity
  memberId: string;
  version: number; // 1, 2, ...
  sourceVolumeId: string; // vol-2025
  sourcePrivateEditionId: string; // ed_vol-2025_v4_...
  sourcePrivateEditionVersion: number; // 4
  publishingDraftId: string;
  bookTitle: string;
  subtitle?: string;
  authorDisplayName: string; // Public display name / pen name
  publicationDescription?: string;
  dedication?: string;
  chapters: ManuscriptChapter[];
  totalWordCount: number;
  chapterCount: number;
  bookstoreImage: BookstoreImageConfig;
  authorVideo?: PublishingAuthorVideoAsset | null;
  videoChoice: 'none' | 'included';
  rightsConfirmations: PublishingRightsConfirmations;
  contentHash: string; // SHA-256 fingerprint
  preservedAt: string;
  status: 'preserved_private';
  isPubliclyListed: false; // Never publicly listed without separate release authorization
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
  latestPreservedEditionId?: string;
  createdAt: string;
  lastSavedAt: string;
  sealedEditionCount: number;
  status: 'draft' | 'preserved';
}
