import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getAuthenticatedMember, verifyMemberOwnership } from '@/lib/auth';
import { PublishingDraft } from '@/lib/publishingData';

const VAULT_DIR = path.join(process.cwd(), '.data', 'vault');

function getMemberPublishingDraftsDir(memberId: string) {
  const sanitized = memberId.replace(/[^a-zA-Z0-9_-]/g, '');
  const dir = path.join(VAULT_DIR, sanitized, 'publishing_drafts');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export async function GET(request: Request) {
  try {
    // 1. Authenticate member from session
    const member = await getAuthenticatedMember(request);
    if (!member) {
      return NextResponse.json(
        { error: 'Authentication required. No active member session.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const pubDraftId = searchParams.get('pubDraftId');
    if (!pubDraftId) {
      return NextResponse.json(
        { error: 'Publishing draft ID (pubDraftId) is required.' },
        { status: 400 }
      );
    }

    const sanitizedPubDraftId = pubDraftId.replace(/[^a-zA-Z0-9_-]/g, '');
    const pubDraftsDir = getMemberPublishingDraftsDir(member.id);
    const draftPath = path.join(pubDraftsDir, `${sanitizedPubDraftId}.json`);

    if (!fs.existsSync(draftPath)) {
      return NextResponse.json(
        { error: 'Publishing draft not found in your vault.' },
        { status: 404 }
      );
    }

    const raw = fs.readFileSync(draftPath, 'utf-8');
    const draft: PublishingDraft = JSON.parse(raw);

    // Verify ownership
    if (!verifyMemberOwnership(member, draft.memberId)) {
      return NextResponse.json(
        { error: 'Access forbidden. You do not own this publishing draft.' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      draft
    });
  } catch (err: unknown) {
    console.error('Error fetching publishing draft:', err);
    return NextResponse.json(
      { error: 'Failed to retrieve publishing draft.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // 1. Authenticate member from session
    const member = await getAuthenticatedMember(request);
    if (!member) {
      return NextResponse.json(
        { error: 'Authentication required. No active member session.' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    // Support either direct PublishingDraft payload or { pubDraftId, draft } wrapper
    const draftPayload: PublishingDraft = body?.draft || body;
    const targetDraftId = body?.pubDraftId || draftPayload?.publishingDraftId;

    if (!targetDraftId || typeof targetDraftId !== 'string') {
      return NextResponse.json(
        { error: 'Publishing draft ID is required for persistence.' },
        { status: 400 }
      );
    }

    if (!draftPayload || !Array.isArray(draftPayload.chapters)) {
      return NextResponse.json(
        { error: 'Invalid publishing draft format. Chapters must be present.' },
        { status: 400 }
      );
    }

    const sanitizedPubDraftId = targetDraftId.replace(/[^a-zA-Z0-9_-]/g, '');
    const pubDraftsDir = getMemberPublishingDraftsDir(member.id);
    const draftPath = path.join(pubDraftsDir, `${sanitizedPubDraftId}.json`);

    if (!fs.existsSync(draftPath)) {
      return NextResponse.json(
        { error: 'Target publishing draft does not exist to update.' },
        { status: 404 }
      );
    }

    // Read existing to enforce immutable identifiers (publicationId, sourceEditionId, memberId)
    const existingRaw = fs.readFileSync(draftPath, 'utf-8');
    const existingDraft: PublishingDraft = JSON.parse(existingRaw);

    if (!verifyMemberOwnership(member, existingDraft.memberId)) {
      return NextResponse.json(
        { error: 'Access forbidden. You do not own this publishing draft.' },
        { status: 403 }
      );
    }

    // SERVER-SIDE ASSET VALIDATION (Phase LP2B - Correction 3)
    // The draft must only reference verified assets belonging to this member and publication.
    let updatedBookstoreImage = existingDraft.bookstoreImage;
    if (draftPayload.bookstoreImage !== undefined) {
      if (draftPayload.bookstoreImage === null) {
        updatedBookstoreImage = undefined;
      } else {
        const candidate = draftPayload.bookstoreImage;
        if (!candidate.assetId || typeof candidate.assetId !== 'string') {
          return NextResponse.json(
            { error: 'Invalid bookstore image configuration. Asset ID is required.' },
            { status: 400 }
          );
        }

        const sanitizedAssetId = candidate.assetId.replace(/[^a-zA-Z0-9_-]/g, '');
        const assetMetaPath = path.join(
          VAULT_DIR,
          member.id,
          'publishing_assets',
          existingDraft.publicationId,
          `${sanitizedAssetId}.meta.json`
        );

        if (!fs.existsSync(assetMetaPath)) {
          return NextResponse.json(
            { error: 'Referenced bookstore image asset does not exist or does not belong to this publication.' },
            { status: 400 }
          );
        }

        const assetMeta = JSON.parse(fs.readFileSync(assetMetaPath, 'utf-8'));
        if (assetMeta.memberId !== member.id || assetMeta.publicationId !== existingDraft.publicationId) {
          return NextResponse.json(
            { error: 'Access forbidden. Referenced asset belongs to a different member or publication.' },
            { status: 403 }
          );
        }

        updatedBookstoreImage = {
          assetId: sanitizedAssetId,
          source: candidate.source || 'member_upload',
          storagePath: `/api/volume/publishing/image?assetId=${sanitizedAssetId}&pubDraftId=${sanitizedPubDraftId}`,
          mimeType: assetMeta.mimeType,
          width: assetMeta.width,
          height: assetMeta.height,
          isApproved: Boolean(candidate.isApproved),
          approvedAt: candidate.isApproved
            ? candidate.approvedAt || new Date().toISOString()
            : undefined
        };
      }
    }

    // Merge updates while protecting core identity & provenance
    const updatedDraft: PublishingDraft = {
      ...existingDraft,
      bookTitle: draftPayload.bookTitle || existingDraft.bookTitle,
      subtitle: draftPayload.subtitle !== undefined ? draftPayload.subtitle : existingDraft.subtitle,
      authorDisplayName: draftPayload.authorDisplayName || existingDraft.authorDisplayName,
      publicationDescription: draftPayload.publicationDescription !== undefined ? draftPayload.publicationDescription : existingDraft.publicationDescription,
      dedication: draftPayload.dedication !== undefined ? draftPayload.dedication : existingDraft.dedication,
      chapters: JSON.parse(JSON.stringify(draftPayload.chapters)),
      bookstoreImage: updatedBookstoreImage,
      coverConfig: draftPayload.coverConfig || existingDraft.coverConfig,
      authorVideo: draftPayload.authorVideo !== undefined ? draftPayload.authorVideo : existingDraft.authorVideo,
      currentStep: draftPayload.currentStep || existingDraft.currentStep,
      lastSavedAt: new Date().toISOString(),
      isDirty: false,
      version: (existingDraft.version || 1) + 1
    };

    fs.writeFileSync(draftPath, JSON.stringify(updatedDraft, null, 2), 'utf-8');

    return NextResponse.json({
      success: true,
      pubDraftId: sanitizedPubDraftId,
      draft: updatedDraft
    });
  } catch (err: unknown) {
    console.error('Error saving publishing draft:', err);
    return NextResponse.json(
      { error: 'Failed to save publishing draft.' },
      { status: 500 }
    );
  }
}
