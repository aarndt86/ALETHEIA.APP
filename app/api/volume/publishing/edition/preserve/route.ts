import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getAuthenticatedMember, verifyMemberOwnership } from '@/lib/auth';
import { 
  PublishingDraft, 
  PreservedPublicationEdition, 
  PublicationSummary,
  PublishingRightsConfirmations 
} from '@/lib/publishingData';

const VAULT_DIR = path.join(process.cwd(), '.data', 'vault');

function getMemberVaultDir(memberId: string) {
  const sanitized = memberId.replace(/[^a-zA-Z0-9_-]/g, '');
  return path.join(VAULT_DIR, sanitized);
}

function getPublicationEditionsDir(memberId: string, publicationId: string) {
  const sanitizedPubId = publicationId.replace(/[^a-zA-Z0-9_-]/g, '');
  const dir = path.join(getMemberVaultDir(memberId), 'publications', sanitizedPubId, 'editions');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function computeContentHash(data: unknown): string {
  const str = JSON.stringify(data);
  return crypto.createHash('sha256').update(str).digest('hex');
}

/**
 * POST: Preserve an independent immutable publication edition in the member's private vault.
 * 
 * CRITICAL ARCHITECTURAL GUARANTEE:
 * Preserve My Publication !== Publish to Bookstore.
 * Status is strictly 'preserved_private' and isPubliclyListed is FALSE.
 * Never exposes the publication to the public without a subsequent separate authorization.
 */
export async function POST(request: Request) {
  try {
    const member = await getAuthenticatedMember(request);
    if (!member) {
      return NextResponse.json(
        { error: 'Authentication required. No active member session.' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const pubDraftId = body?.pubDraftId;
    const authorDisplayName = body?.authorDisplayName?.trim();
    const confirmations: PublishingRightsConfirmations | undefined = body?.rightsConfirmations;

    if (!pubDraftId || typeof pubDraftId !== 'string') {
      return NextResponse.json(
        { error: 'Publishing draft ID (pubDraftId) is required for preservation.' },
        { status: 400 }
      );
    }

    const sanitizedPubDraftId = pubDraftId.replace(/[^a-zA-Z0-9_-]/g, '');

    // 1. Verify publishing draft ownership
    const draftPath = path.join(getMemberVaultDir(member.id), 'publishing_drafts', `${sanitizedPubDraftId}.json`);
    if (!fs.existsSync(draftPath)) {
      return NextResponse.json(
        { error: 'Target publishing draft not found in your vault.' },
        { status: 404 }
      );
    }

    const draftRaw = fs.readFileSync(draftPath, 'utf-8');
    const draft: PublishingDraft = JSON.parse(draftRaw);

    if (!verifyMemberOwnership(member, draft.memberId)) {
      return NextResponse.json(
        { error: 'Access forbidden. You do not own this publishing draft.' },
        { status: 403 }
      );
    }

    // 2. Validate Manuscript requirements
    if (!draft.bookTitle || draft.bookTitle.trim().length === 0) {
      return NextResponse.json(
        { error: 'Manuscript book title is required.' },
        { status: 400 }
      );
    }

    if (!draft.chapters || draft.chapters.length === 0) {
      return NextResponse.json(
        { error: 'Manuscript must contain at least one chapter before preservation.' },
        { status: 400 }
      );
    }

    // 3. Validate Approved Bookstore Image
    if (!draft.bookstoreImage || !draft.bookstoreImage.isApproved) {
      return NextResponse.json(
        { error: 'Approved bookstore listing artwork is required before preserving your publication.' },
        { status: 400 }
      );
    }

    const imageAssetMetaPath = path.join(
      getMemberVaultDir(member.id),
      'publishing_assets',
      draft.publicationId,
      `${draft.bookstoreImage.assetId}.meta.json`
    );

    if (!fs.existsSync(imageAssetMetaPath)) {
      return NextResponse.json(
        { error: 'Referenced bookstore image asset file missing from publication vault.' },
        { status: 400 }
      );
    }

    // 4. Validate Video Optionality
    if (draft.videoChoice === 'included') {
      if (!draft.authorVideo || !draft.authorVideo.isApproved) {
        return NextResponse.json(
          { error: 'You selected to include a showcase video, but no approved video is attached.' },
          { status: 400 }
        );
      }

      const videoAssetMetaPath = path.join(
        getMemberVaultDir(member.id),
        'publishing_assets',
        draft.publicationId,
        `${draft.authorVideo.assetId}.meta.json`
      );

      if (!fs.existsSync(videoAssetMetaPath)) {
        return NextResponse.json(
          { error: 'Referenced author showcase video asset missing from publication vault.' },
          { status: 400 }
        );
      }
    } else if (draft.videoChoice === 'undecided') {
      return NextResponse.json(
        { error: 'Please choose whether to include or skip a story preview video before preserving.' },
        { status: 400 }
      );
    }

    // 5. Validate Author Display Name / Pen Name
    const finalAuthorName = authorDisplayName || draft.authorDisplayName;
    if (!finalAuthorName || finalAuthorName.trim().length === 0) {
      return NextResponse.json(
        { error: 'Author display name (or pen name) is required for public readership presentation.' },
        { status: 400 }
      );
    }

    // 6. Validate Privacy & Rights Confirmations
    if (
      !confirmations ||
      !confirmations.personalInfoReviewed ||
      !confirmations.intellectualPropertyConfirmed ||
      !confirmations.thirdPartyPermissionsConfirmed
    ) {
      return NextResponse.json(
        { error: 'All three publishing rights and privacy confirmations must be explicitly acknowledged.' },
        { status: 400 }
      );
    }

    // 7. Calculate total word count
    let totalWordCount = 0;
    for (const chap of draft.chapters) {
      for (const p of chap.paragraphs || []) {
        if (p.text) {
          totalWordCount += p.text.trim().split(/\s+/).filter(Boolean).length;
        }
      }
    }

    // 8. Compute Canonical Content Hash for Idempotency
    const contentPayload = {
      publicationId: draft.publicationId,
      sourceVolumeId: draft.sourceVolumeId,
      sourcePrivateEditionId: draft.sourceEditionId,
      bookTitle: draft.bookTitle,
      subtitle: draft.subtitle || '',
      authorDisplayName: finalAuthorName,
      chapters: draft.chapters.map(c => ({
        number: c.number,
        title: c.title,
        paragraphs: (c.paragraphs || []).map(p => p.text)
      })),
      bookstoreImageAssetId: draft.bookstoreImage.assetId,
      authorVideoAssetId: draft.authorVideo?.assetId || null,
      rightsConfirmations: {
        personalInfoReviewed: confirmations.personalInfoReviewed,
        intellectualPropertyConfirmed: confirmations.intellectualPropertyConfirmed,
        thirdPartyPermissionsConfirmed: confirmations.thirdPartyPermissionsConfirmed
      }
    };

    const contentHash = computeContentHash(contentPayload);

    // 9. Check for Existing Preserved Editions / Idempotency
    const editionsDir = getPublicationEditionsDir(member.id, draft.publicationId);
    const existingEditionFiles = fs.readdirSync(editionsDir).filter(f => f.endsWith('.json'));

    for (const f of existingEditionFiles) {
      const existingRaw = fs.readFileSync(path.join(editionsDir, f), 'utf-8');
      try {
        const existingEd: PreservedPublicationEdition = JSON.parse(existingRaw);
        if (existingEd.contentHash === contentHash) {
          // Idempotency: return existing preserved edition
          return NextResponse.json({
            success: true,
            preservedEdition: existingEd,
            isRepeatPreservation: true,
            message: 'Identical publication edition already preserved in your vault.'
          });
        }
      } catch {
        // continue
      }
    }

    // 10. Determine Next Version Number
    const nextVersion = existingEditionFiles.length + 1;
    const timestamp = Date.now();
    const publicationEditionId = `pub_ed_${draft.publicationId}_v${nextVersion}_${timestamp}`;

    const preservedEdition: PreservedPublicationEdition = {
      publicationEditionId,
      publicationId: draft.publicationId,
      memberId: member.id,
      version: nextVersion,
      sourceVolumeId: draft.sourceVolumeId,
      sourcePrivateEditionId: draft.sourceEditionId,
      sourcePrivateEditionVersion: draft.sourceEditionVersion,
      publishingDraftId: draft.publishingDraftId,
      bookTitle: draft.bookTitle,
      subtitle: draft.subtitle,
      authorDisplayName: finalAuthorName,
      publicationDescription: draft.publicationDescription,
      dedication: draft.dedication,
      chapters: JSON.parse(JSON.stringify(draft.chapters)),
      totalWordCount,
      chapterCount: draft.chapters.length,
      bookstoreImage: JSON.parse(JSON.stringify(draft.bookstoreImage)),
      authorVideo: draft.authorVideo ? JSON.parse(JSON.stringify(draft.authorVideo)) : null,
      videoChoice: (draft.videoChoice as 'none' | 'included') || 'none',
      rightsConfirmations: {
        ...confirmations,
        confirmedAt: confirmations.confirmedAt || new Date().toISOString()
      },
      contentHash,
      preservedAt: new Date().toISOString(),
      status: 'preserved_private',
      isPubliclyListed: false // Stays private by default
    };

    // 11. Write Immutable Preserved Edition File
    const targetEditionPath = path.join(editionsDir, `${publicationEditionId}.json`);
    fs.writeFileSync(targetEditionPath, JSON.stringify(preservedEdition, null, 2), 'utf-8');

    // 12. Update Publication Summary
    const pubRootDir = path.join(getMemberVaultDir(member.id), 'publications', draft.publicationId);
    const summaryPath = path.join(pubRootDir, 'summary.json');
    const summary: PublicationSummary = {
      publicationId: draft.publicationId,
      memberId: member.id,
      sourceVolumeId: draft.sourceVolumeId,
      sourceEditionId: draft.sourceEditionId,
      sourceEditionVersion: draft.sourceEditionVersion,
      bookTitle: draft.bookTitle,
      subtitle: draft.subtitle,
      authorDisplayName: finalAuthorName,
      activeDraftId: draft.publishingDraftId,
      latestPreservedEditionId: publicationEditionId,
      createdAt: draft.createdAt,
      lastSavedAt: new Date().toISOString(),
      sealedEditionCount: nextVersion,
      status: 'preserved'
    };
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf-8');

    // 13. Update Publishing Draft provenance and latest edition link
    const updatedDraft: PublishingDraft = {
      ...draft,
      authorDisplayName: finalAuthorName,
      rightsConfirmations: preservedEdition.rightsConfirmations,
      latestPreservedEditionId: publicationEditionId,
      currentStep: 4,
      lastSavedAt: new Date().toISOString(),
      isDirty: false
    };
    fs.writeFileSync(draftPath, JSON.stringify(updatedDraft, null, 2), 'utf-8');

    return NextResponse.json({
      success: true,
      preservedEdition,
      isRepeatPreservation: false,
      message: 'Publication edition preserved privately in your vault. It has not been published to the bookstore.'
    });
  } catch (err: unknown) {
    console.error('Error preserving publication edition:', err);
    return NextResponse.json(
      { error: 'Failed to preserve publication edition in vault.' },
      { status: 500 }
    );
  }
}
