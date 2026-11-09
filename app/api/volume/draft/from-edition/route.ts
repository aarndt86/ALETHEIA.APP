import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getAuthenticatedMember, verifyMemberOwnership } from '@/lib/auth';
import { PreservedVolumeEdition, VolumeDraft } from '@/lib/volumeData';

const VAULT_DIR = path.join(process.cwd(), '.data', 'vault');
const DATA_DIR = path.join(process.cwd(), '.data', 'drafts');

function getMemberDraftsDir(memberId: string) {
  const sanitized = memberId.replace(/[^a-zA-Z0-9_-]/g, '');
  const dir = path.join(VAULT_DIR, sanitized, 'drafts');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export async function POST(request: Request) {
  try {
    // 1. Authenticate member from session (Requirement 1 & Safeguard 2)
    const member = await getAuthenticatedMember(request);
    if (!member) {
      return NextResponse.json(
        { error: 'Authentication required. No active member session.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const editionId = body?.editionId;
    if (!editionId || typeof editionId !== 'string') {
      return NextResponse.json(
        { error: 'Preserved edition ID is required to branch a new edition.' },
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

    // 4. Generate unique, isolated draftId (Requirement 2: Never overwrite existing drafts)
    const timestamp = Date.now();
    const draftId = `draft_${edition.sourceVolumeId}_from_v${edition.version}_${timestamp}`;

    // 5. Deep clone historical edition content and attach provenance
    const clonedChapters = JSON.parse(JSON.stringify(edition.chapters || []));

    const newDraft: VolumeDraft = {
      draftId,
      sourceVolumeId: edition.sourceVolumeId,
      year: edition.sourceVolumeId === 'vol-2025' ? 2025 : 2026,
      bookTitle: edition.bookTitle,
      originalBookTitle: edition.bookTitle,
      subtitle: edition.subtitle || '',
      authorName: edition.authorName,
      chapters: clonedChapters,
      lastSavedAt: new Date().toISOString(),
      version: 1, // Working revision counter for this draft
      isDirty: false,
      clonedFromEditionId: edition.editionId,
      clonedFromVersion: edition.version
    };

    // 6. Write to member-isolated drafts directory
    const memberDraftsDir = getMemberDraftsDir(member.id);
    const targetDraftPath = path.join(memberDraftsDir, `${draftId}.json`);
    fs.writeFileSync(targetDraftPath, JSON.stringify(newDraft, null, 2), 'utf-8');

    // Also persist to general drafts dir for development accessibility
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(path.join(DATA_DIR, `${draftId}.json`), JSON.stringify(newDraft, null, 2), 'utf-8');

    return NextResponse.json({
      success: true,
      draftId,
      volumeId: edition.sourceVolumeId,
      clonedFromVersion: edition.version,
      clonedFromEditionId: edition.editionId,
      draft: newDraft
    });
  } catch (err: unknown) {
    console.error('Error creating draft from edition:', err);
    return NextResponse.json(
      { error: 'Failed to create new edition draft from preserved edition.' },
      { status: 500 }
    );
  }
}
