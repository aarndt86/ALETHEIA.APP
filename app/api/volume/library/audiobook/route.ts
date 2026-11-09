import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getAuthenticatedMember, verifyMemberOwnership } from '@/lib/auth';
import { 
  AudiobookPackage, 
  PreservedVolumeEdition 
} from '@/lib/volumeData';

const VAULT_DIR = path.join(process.cwd(), '.data', 'vault');

function getMemberAudiobooksDir(memberId: string) {
  const dir = path.join(VAULT_DIR, memberId, 'audiobooks');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function getMemberEditionsDir(memberId: string) {
  const dir = path.join(VAULT_DIR, memberId, 'editions');
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
    const editionId = searchParams.get('editionId');

    if (!editionId) {
      return NextResponse.json(
        { error: 'Preserved edition ID is required.' },
        { status: 400 }
      );
    }

    // 2. Check if a dedicated audiobook package exists for this edition
    const audiobooksDir = getMemberAudiobooksDir(member.id);
    const packagePath = path.join(audiobooksDir, `${editionId}.json`);

    if (fs.existsSync(packagePath)) {
      const raw = fs.readFileSync(packagePath, 'utf-8');
      const pkg: AudiobookPackage = JSON.parse(raw);
      return NextResponse.json({ package: pkg });
    }

    // 3. Fallback: Locate preserved manuscript edition to determine honest audio status
    const editionsDir = getMemberEditionsDir(member.id);
    const editionFiles = fs.existsSync(editionsDir)
      ? fs.readdirSync(editionsDir).filter(f => f.endsWith('.json'))
      : [];

    let targetEdition: PreservedVolumeEdition | null = null;
    for (const f of editionFiles) {
      try {
        const ed: PreservedVolumeEdition = JSON.parse(fs.readFileSync(path.join(editionsDir, f), 'utf-8'));
        if (ed.editionId === editionId) {
          targetEdition = ed;
          break;
        }
      } catch {
        // ignore
      }
    }

    if (!targetEdition) {
      return NextResponse.json(
        { error: 'Preserved edition not found in your vault.' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (!verifyMemberOwnership(member, targetEdition.memberId)) {
      return NextResponse.json(
        { error: 'Access forbidden. You do not own this edition.' },
        { status: 403 }
      );
    }

    // 4. Synthesize honest package descriptor based on preserved recordings
    const rec = targetEdition.authenticRecording;

    if (rec && rec.assetId) {
      // Edition has an authentic passage reading take (e.g. Sarah's 42s take)
      const firstChapter = targetEdition.chapters[0];
      const fallbackPackage: AudiobookPackage = {
        editionId: targetEdition.editionId,
        sourceVolumeId: targetEdition.sourceVolumeId,
        bookTitle: targetEdition.bookTitle,
        authorName: targetEdition.authorName,
        narrationSource: 'passage_take_only',
        availabilityStatus: 'passage_take_only',
        narratorCredit: `Preserved Author Reading by ${targetEdition.authorName}`,
        isAiGenerated: false,
        totalDurationSeconds: rec.durationSeconds || 42,
        totalChapters: targetEdition.totalChapters || targetEdition.chapters.length,
        completedChapters: 0, // Not a full complete book
        tracks: [
          {
            trackId: `trk_passage_${rec.assetId}`,
            chapterId: firstChapter?.id || 'c1',
            chapterNumber: firstChapter?.number || 1,
            chapterRoman: firstChapter?.romanNumeral || 'I',
            chapterTitle: firstChapter?.title || 'Preserved Reading Passage',
            audioAssetId: rec.assetId,
            storagePath: `${rec.storagePath}&editionId=${targetEdition.editionId}`,
            mimeType: rec.mimeType || 'audio/webm',
            durationSeconds: rec.durationSeconds || 42,
            fileSizeBytes: rec.fileSizeBytes || 4124,
            status: 'approved_by_author'
          }
        ],
        createdAt: targetEdition.preservedAt,
        updatedAt: targetEdition.preservedAt
      };
      return NextResponse.json({ package: fallbackPackage });
    }

    // Edition has no audio at all (e.g. Edition v2)
    const emptyPackage: AudiobookPackage = {
      editionId: targetEdition.editionId,
      sourceVolumeId: targetEdition.sourceVolumeId,
      bookTitle: targetEdition.bookTitle,
      authorName: targetEdition.authorName,
      narrationSource: 'unrecorded',
      availabilityStatus: 'not_available',
      narratorCredit: 'Unrecorded',
      isAiGenerated: false,
      totalDurationSeconds: 0,
      totalChapters: targetEdition.totalChapters || targetEdition.chapters.length,
      completedChapters: 0,
      tracks: [],
      createdAt: targetEdition.preservedAt,
      updatedAt: targetEdition.preservedAt
    };

    return NextResponse.json({ package: emptyPackage });
  } catch (err: unknown) {
    console.error('Audiobook fetch error:', err);
    return NextResponse.json(
      { error: 'Failed to retrieve audiobook package.' },
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

    const body: AudiobookPackage = await request.json();
    if (!body || !body.editionId || !Array.isArray(body.tracks)) {
      return NextResponse.json(
        { error: 'Invalid audiobook package submission.' },
        { status: 400 }
      );
    }

    // 2. Locate preserved manuscript edition to verify match and chapter completeness
    const editionsDir = getMemberEditionsDir(member.id);
    const editionFiles = fs.existsSync(editionsDir)
      ? fs.readdirSync(editionsDir).filter(f => f.endsWith('.json'))
      : [];

    let targetEdition: PreservedVolumeEdition | null = null;
    for (const f of editionFiles) {
      try {
        const ed: PreservedVolumeEdition = JSON.parse(fs.readFileSync(path.join(editionsDir, f), 'utf-8'));
        if (ed.editionId === body.editionId) {
          targetEdition = ed;
          break;
        }
      } catch {
        // ignore
      }
    }

    if (!targetEdition) {
      return NextResponse.json(
        { error: 'Preserved edition not found in your vault.' },
        { status: 404 }
      );
    }

    if (!verifyMemberOwnership(member, targetEdition.memberId)) {
      return NextResponse.json(
        { error: 'Access forbidden. You do not own this edition.' },
        { status: 403 }
      );
    }

    // 3. Enforce Audiobook Completion Integrity (Requirement 3)
    // "An audiobook may be marked complete only when every required chapter has approved narration"
    const totalRequiredChapters = targetEdition.totalChapters || targetEdition.chapters.length;
    const allChaptersCovered = body.tracks.length >= totalRequiredChapters &&
      body.tracks.every(t => t.status === 'approved_by_author' && t.durationSeconds > 0);

    const verifiedStatus = allChaptersCovered ? 'complete' : 'partial';

    const cleanPackage: AudiobookPackage = {
      ...body,
      editionId: targetEdition.editionId,
      sourceVolumeId: targetEdition.sourceVolumeId,
      availabilityStatus: verifiedStatus,
      completedChapters: body.tracks.filter(t => t.durationSeconds > 0).length,
      totalChapters: totalRequiredChapters,
      updatedAt: new Date().toISOString()
    };

    // 4. Save to dedicated vault audiobooks directory
    const audiobooksDir = getMemberAudiobooksDir(member.id);
    const packagePath = path.join(audiobooksDir, `${body.editionId}.json`);
    fs.writeFileSync(packagePath, JSON.stringify(cleanPackage, null, 2), 'utf-8');

    return NextResponse.json({
      success: true,
      package: cleanPackage
    });
  } catch (err: unknown) {
    console.error('Audiobook package save error:', err);
    return NextResponse.json(
      { error: 'Failed to persist audiobook package.' },
      { status: 500 }
    );
  }
}
