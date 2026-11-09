import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getAuthenticatedMember, verifyMemberOwnership } from '@/lib/auth';
import { PreservedVolumeEdition } from '@/lib/volumeData';
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

export async function POST(request: Request) {
  try {
    // 1. Authenticate member from genuine session token
    const member = await getAuthenticatedMember(request);
    if (!member) {
      return NextResponse.json(
        { error: 'Authentication required. No active member session.' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const editionId = body?.editionId;
    if (!editionId || typeof editionId !== 'string') {
      return NextResponse.json(
        { error: 'Preserved edition ID is required to branch a publication draft.' },
        { status: 400 }
      );
    }

    const sanitizedEditionId = editionId.replace(/[^a-zA-Z0-9_-]/g, '');

    // 2. Locate historical edition snapshot in member vault
    const editionsDir = path.join(VAULT_DIR, member.id, 'editions');
    const editionFilePath = path.join(editionsDir, `${sanitizedEditionId}.json`);

    if (!fs.existsSync(editionFilePath)) {
      return NextResponse.json(
        { error: 'Preserved edition not found in your private vault.' },
        { status: 404 }
      );
    }

    const raw = fs.readFileSync(editionFilePath, 'utf-8');
    const edition: PreservedVolumeEdition = JSON.parse(raw);

    // 3. Verify member ownership
    if (!verifyMemberOwnership(member, edition.memberId)) {
      return NextResponse.json(
        { error: 'Access forbidden. You do not own this preserved edition.' },
        { status: 403 }
      );
    }

    // 4. Generate stable publicationId & unique publishingDraftId
    // Requirement 2: A single source volume can support multiple distinct publications
    const timestamp = Date.now();
    const entropy = Math.random().toString(36).slice(2, 7);
    const publicationId = body?.publicationId && typeof body.publicationId === 'string'
      ? body.publicationId.replace(/[^a-zA-Z0-9_-]/g, '')
      : `pub_${edition.sourceVolumeId}_${timestamp}_${entropy}`;

    const publishingDraftId = `pub_draft_${publicationId}_${timestamp}`;

    // 5. Deep clone manuscript chapters and preserve historical provenance
    const clonedChapters = JSON.parse(JSON.stringify(edition.chapters || []));

    const newPublishingDraft: PublishingDraft = {
      publishingDraftId,
      publicationId,
      memberId: member.id,
      sourceVolumeId: edition.sourceVolumeId,
      sourceEditionId: edition.editionId,
      sourceEditionVersion: edition.version,
      bookTitle: body?.bookTitle || edition.bookTitle,
      subtitle: body?.subtitle !== undefined ? body.subtitle : (edition.subtitle || ''),
      authorDisplayName: body?.authorDisplayName || edition.authorName || 'Author',
      publicationDescription: '',
      dedication: '',
      chapters: clonedChapters,
      status: 'draft',
      currentStep: 2, // Step 2 is Refine My Story in the Editor
      createdAt: new Date().toISOString(),
      lastSavedAt: new Date().toISOString(),
      version: 1,
      isDirty: false
    };

    // 6. Write strictly to member-scoped publishing_drafts directory
    // Requirement 3: Never touches .data/drafts/ or .data/vault/{memberId}/editions/
    const pubDraftsDir = getMemberPublishingDraftsDir(member.id);
    const targetDraftPath = path.join(pubDraftsDir, `${publishingDraftId}.json`);
    fs.writeFileSync(targetDraftPath, JSON.stringify(newPublishingDraft, null, 2), 'utf-8');

    return NextResponse.json({
      success: true,
      publicationId,
      publishingDraftId,
      sourceEditionId: edition.editionId,
      sourceEditionVersion: edition.version,
      draft: newPublishingDraft
    });
  } catch (err: unknown) {
    console.error('Error creating publishing draft from edition:', err);
    return NextResponse.json(
      { error: 'Failed to create publishing draft from preserved edition.' },
      { status: 500 }
    );
  }
}
