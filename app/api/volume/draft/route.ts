import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { createInitialDraft, VolumeDraft } from '@/lib/volumeData';

const DATA_DIR = path.join(process.cwd(), '.data', 'drafts');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function getDraftFilePath(volumeId: string) {
  return path.join(DATA_DIR, `${volumeId}.json`);
}

// In-memory fallback if file system write has sandboxing constraints
const memoryDraftStore = new Map<string, VolumeDraft>();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const volumeId = searchParams.get('volumeId') || 'vol-2025';

    // 1. Try reading from filesystem
    try {
      ensureDataDir();
      const filePath = getDraftFilePath(volumeId);
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const draft: VolumeDraft = JSON.parse(raw);
        return NextResponse.json({ draft, source: 'persisted_disk' });
      }
    } catch (fsErr) {
      console.warn('Filesystem read failed, checking memory store:', fsErr);
    }

    // 2. Check memory store
    if (memoryDraftStore.has(volumeId)) {
      return NextResponse.json({ draft: memoryDraftStore.get(volumeId), source: 'memory' });
    }

    // 3. Initialize fresh draft cloned from immutable source
    const freshDraft = createInitialDraft(volumeId);
    
    // Store it
    try {
      ensureDataDir();
      fs.writeFileSync(getDraftFilePath(volumeId), JSON.stringify(freshDraft, null, 2), 'utf-8');
    } catch {
      memoryDraftStore.set(volumeId, freshDraft);
    }

    return NextResponse.json({ draft: freshDraft, source: 'initial_clone' });
  } catch (error) {
    console.error('Failed to get volume draft:', error);
    return NextResponse.json({ error: 'Failed to retrieve manuscript draft' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body: VolumeDraft = await request.json();
    if (!body || !body.sourceVolumeId) {
      return NextResponse.json({ error: 'Invalid draft payload' }, { status: 400 });
    }

    const updatedDraft: VolumeDraft = {
      ...body,
      version: (body.version || 1) + 1,
      lastSavedAt: new Date().toISOString(),
      isDirty: false
    };

    // Save to filesystem and memory
    try {
      ensureDataDir();
      fs.writeFileSync(getDraftFilePath(body.sourceVolumeId), JSON.stringify(updatedDraft, null, 2), 'utf-8');
    } catch (fsErr) {
      console.warn('Filesystem write failed, using memory store:', fsErr);
    }

    memoryDraftStore.set(body.sourceVolumeId, updatedDraft);

    return NextResponse.json({
      success: true,
      draft: updatedDraft,
      savedAt: updatedDraft.lastSavedAt,
      version: updatedDraft.version
    });
  } catch (error) {
    console.error('Failed to persist volume draft:', error);
    return NextResponse.json({ error: 'Failed to save manuscript draft' }, { status: 500 });
  }
}
