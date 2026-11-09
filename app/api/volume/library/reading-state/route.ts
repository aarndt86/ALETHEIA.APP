import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getAuthenticatedMember, verifyMemberOwnership } from '@/lib/auth';
import { PreservedVolumeEdition } from '@/lib/volumeData';

const VAULT_DIR = path.join(process.cwd(), '.data', 'vault');

function getMemberReadingStateDir(memberId: string) {
  const dir = path.join(VAULT_DIR, memberId, 'reading_state');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function getMemberEditionsDir(memberId: string) {
  return path.join(VAULT_DIR, memberId, 'editions');
}

export interface ReadingStateRecord {
  memberId: string;
  editionId: string;
  chapterIndex: number;
  paragraphId?: string;
  scrollPercentage?: number;
  lastReadAt: string;
}

export async function GET(request: Request) {
  try {
    // 1. Authenticate member from genuine session
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
        { error: 'editionId parameter is required.' },
        { status: 400 }
      );
    }

    // 2. Validate edition exists and member owns it
    const editionPath = path.join(getMemberEditionsDir(member.id), `${editionId}.json`);
    if (!fs.existsSync(editionPath)) {
      return NextResponse.json(
        { error: 'Preserved edition not found in your vault.' },
        { status: 404 }
      );
    }

    try {
      const rawEd = fs.readFileSync(editionPath, 'utf-8');
      const edition: PreservedVolumeEdition = JSON.parse(rawEd);
      if (!verifyMemberOwnership(member, edition.memberId)) {
        return NextResponse.json(
          { error: 'Access forbidden: You do not own this vault edition.' },
          { status: 403 }
        );
      }
    } catch {
      return NextResponse.json({ error: 'Failed to verify edition ownership.' }, { status: 500 });
    }

    // 3. Locate reading state record
    const statePath = path.join(getMemberReadingStateDir(member.id), `${editionId}.json`);
    if (!fs.existsSync(statePath)) {
      // Return clean default initial reading state
      return NextResponse.json({
        readingState: {
          memberId: member.id,
          editionId,
          chapterIndex: 0,
          paragraphId: undefined,
          scrollPercentage: 0,
          lastReadAt: new Date().toISOString()
        },
        isNew: true
      });
    }

    const rawState = fs.readFileSync(statePath, 'utf-8');
    const readingState: ReadingStateRecord = JSON.parse(rawState);

    return NextResponse.json({
      readingState,
      isNew: false
    });

  } catch (err: unknown) {
    console.error('Reading state GET error:', err);
    return NextResponse.json(
      { error: 'Failed to retrieve reading state.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // 1. Authenticate member from genuine session
    const member = await getAuthenticatedMember(request);
    if (!member) {
      return NextResponse.json(
        { error: 'Authentication required. No active member session.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { editionId, chapterIndex, paragraphId, scrollPercentage } = body;

    if (!editionId || typeof chapterIndex !== 'number') {
      return NextResponse.json(
        { error: 'editionId and chapterIndex are required.' },
        { status: 400 }
      );
    }

    // 2. Validate edition exists and member owns it
    const editionPath = path.join(getMemberEditionsDir(member.id), `${editionId}.json`);
    if (!fs.existsSync(editionPath)) {
      return NextResponse.json(
        { error: 'Preserved edition not found in your vault.' },
        { status: 404 }
      );
    }

    const rawEd = fs.readFileSync(editionPath, 'utf-8');
    const edition: PreservedVolumeEdition = JSON.parse(rawEd);
    if (!verifyMemberOwnership(member, edition.memberId)) {
      return NextResponse.json(
        { error: 'Access forbidden: You do not own this vault edition.' },
        { status: 403 }
      );
    }

    // 3. Persist reading state separately from immutable edition
    const stateRecord: ReadingStateRecord = {
      memberId: member.id,
      editionId,
      chapterIndex: Math.max(0, Math.min(chapterIndex, (edition.chapters?.length || 1) - 1)),
      paragraphId: paragraphId ? String(paragraphId).slice(0, 50) : undefined,
      scrollPercentage: typeof scrollPercentage === 'number' ? Math.max(0, Math.min(100, scrollPercentage)) : 0,
      lastReadAt: new Date().toISOString()
    };

    const stateDir = getMemberReadingStateDir(member.id);
    const targetPath = path.join(stateDir, `${editionId}.json`);
    const tmpPath = path.join(stateDir, `.${editionId}.${Date.now()}.tmp`);

    fs.writeFileSync(tmpPath, JSON.stringify(stateRecord, null, 2), 'utf-8');
    fs.renameSync(tmpPath, targetPath);

    return NextResponse.json({
      success: true,
      readingState: stateRecord
    });

  } catch (err: unknown) {
    console.error('Reading state POST error:', err);
    return NextResponse.json(
      { error: 'Failed to save reading progress.' },
      { status: 500 }
    );
  }
}
