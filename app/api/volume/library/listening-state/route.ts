import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getAuthenticatedMember } from '@/lib/auth';
import { ListeningStateRecord } from '@/lib/volumeData';

const VAULT_DIR = path.join(process.cwd(), '.data', 'vault');

function getMemberListeningDir(memberId: string) {
  const dir = path.join(VAULT_DIR, memberId, 'listening_state');
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

    const listeningDir = getMemberListeningDir(member.id);
    const statePath = path.join(listeningDir, `${editionId}.json`);

    if (fs.existsSync(statePath)) {
      const raw = fs.readFileSync(statePath, 'utf-8');
      const state: ListeningStateRecord = JSON.parse(raw);
      return NextResponse.json({ state });
    }

    // Default initial listening state
    const defaultState: ListeningStateRecord = {
      memberId: member.id,
      editionId,
      activeTrackIndex: 0,
      activeChapterNumber: 1,
      trackProgressSeconds: 0,
      totalDurationSeconds: 0,
      totalProgressPercentage: 0,
      playbackRate: 1,
      volume: 1,
      lastListenedAt: new Date().toISOString()
    };

    return NextResponse.json({ state: defaultState });
  } catch (err: unknown) {
    console.error('Listening state fetch error:', err);
    return NextResponse.json(
      { error: 'Failed to retrieve listening state.' },
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

    const body = await request.json();
    const { 
      editionId, 
      activeTrackIndex, 
      activeChapterNumber, 
      trackProgressSeconds, 
      totalDurationSeconds, 
      totalProgressPercentage,
      playbackRate,
      volume 
    } = body;

    if (!editionId) {
      return NextResponse.json(
        { error: 'Preserved edition ID is required.' },
        { status: 400 }
      );
    }

    const stateRecord: ListeningStateRecord = {
      memberId: member.id,
      editionId,
      activeTrackIndex: typeof activeTrackIndex === 'number' ? Math.max(0, activeTrackIndex) : 0,
      activeChapterNumber: typeof activeChapterNumber === 'number' ? Math.max(1, activeChapterNumber) : 1,
      trackProgressSeconds: typeof trackProgressSeconds === 'number' ? Math.max(0, trackProgressSeconds) : 0,
      totalDurationSeconds: typeof totalDurationSeconds === 'number' ? Math.max(0, totalDurationSeconds) : 0,
      totalProgressPercentage: typeof totalProgressPercentage === 'number' ? Math.min(100, Math.max(0, totalProgressPercentage)) : 0,
      playbackRate: typeof playbackRate === 'number' ? playbackRate : 1,
      volume: typeof volume === 'number' ? volume : 1,
      lastListenedAt: new Date().toISOString()
    };

    // 2. Persist to isolated listening_state directory
    const listeningDir = getMemberListeningDir(member.id);
    const statePath = path.join(listeningDir, `${editionId}.json`);
    const tempPath = `${statePath}.tmp.${Date.now()}`;

    fs.writeFileSync(tempPath, JSON.stringify(stateRecord, null, 2), 'utf-8');
    fs.renameSync(tempPath, statePath);

    return NextResponse.json({
      success: true,
      state: stateRecord
    });
  } catch (err: unknown) {
    console.error('Listening state save error:', err);
    return NextResponse.json(
      { error: 'Failed to persist listening progress.' },
      { status: 500 }
    );
  }
}
