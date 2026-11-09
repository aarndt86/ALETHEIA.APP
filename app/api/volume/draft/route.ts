import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { createInitialDraft, VolumeDraft } from '@/lib/volumeData';
import { getAuthenticatedMember } from '@/lib/auth';

const VAULT_DIR = path.join(process.cwd(), '.data', 'vault');
const DATA_DIR = path.join(process.cwd(), '.data', 'drafts');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function getMemberDraftsDir(memberId: string) {
  const sanitized = memberId.replace(/[^a-zA-Z0-9_-]/g, '');
  const dir = path.join(VAULT_DIR, sanitized, 'drafts');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

// In-memory fallback if file system write has sandboxing constraints
const memoryDraftStore = new Map<string, VolumeDraft>();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const volumeId = searchParams.get('volumeId') || 'vol-2025';
    const draftId = searchParams.get('draftId');

    const member = await getAuthenticatedMember(request);

    // Case A: Specific isolated draft requested by draftId (e.g. branched edition draft)
    if (draftId) {
      const sanitizedDraftId = draftId.replace(/[^a-zA-Z0-9_-]/g, '');

      // 1. Check member vault drafts directory
      if (member) {
        const memberDir = getMemberDraftsDir(member.id);
        const memberDraftPath = path.join(memberDir, `${sanitizedDraftId}.json`);
        if (fs.existsSync(memberDraftPath)) {
          const raw = fs.readFileSync(memberDraftPath, 'utf-8');
          const draft: VolumeDraft = JSON.parse(raw);
          return NextResponse.json({ draft, source: 'member_vault_draft' });
        }
      }

      // 2. Check general drafts directory
      ensureDataDir();
      const generalPath = path.join(DATA_DIR, `${sanitizedDraftId}.json`);
      if (fs.existsSync(generalPath)) {
        const raw = fs.readFileSync(generalPath, 'utf-8');
        const draft: VolumeDraft = JSON.parse(raw);
        return NextResponse.json({ draft, source: 'persisted_disk' });
      }

      // 3. Check memory store
      if (memoryDraftStore.has(sanitizedDraftId)) {
        return NextResponse.json({ draft: memoryDraftStore.get(sanitizedDraftId), source: 'memory' });
      }

      return NextResponse.json({ error: 'Specified draft not found.' }, { status: 404 });
    }

    // Case B: General unfinished volume draft requested by volumeId
    // 1. Check member vault
    if (member) {
      const memberDir = getMemberDraftsDir(member.id);
      const memberDraftPath = path.join(memberDir, `${volumeId}.json`);
      if (fs.existsSync(memberDraftPath)) {
        const raw = fs.readFileSync(memberDraftPath, 'utf-8');
        const draft: VolumeDraft = JSON.parse(raw);
        if (draft && Array.isArray(draft.chapters) && draft.chapters.length > 0) {
          return NextResponse.json({ draft, source: 'member_vault_draft' });
        }
      }
    }

    // 2. Try reading from general filesystem
    ensureDataDir();
    const filePath = path.join(DATA_DIR, `${volumeId}.json`);
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const draft: VolumeDraft = JSON.parse(raw);
      if (draft && Array.isArray(draft.chapters) && draft.chapters.length > 0) {
        return NextResponse.json({ draft, source: 'persisted_disk' });
      }
    }

    // 3. Check memory store
    if (memoryDraftStore.has(volumeId)) {
      const memDraft = memoryDraftStore.get(volumeId);
      if (memDraft && Array.isArray(memDraft.chapters) && memDraft.chapters.length > 0) {
        return NextResponse.json({ draft: memDraft, source: 'memory' });
      }
    }

    // 4. Initialize fresh draft cloned from immutable source
    const freshDraft = createInitialDraft(volumeId);
    try {
      ensureDataDir();
      fs.writeFileSync(filePath, JSON.stringify(freshDraft, null, 2), 'utf-8');
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
    const member = await getAuthenticatedMember(request);
    const body: VolumeDraft = await request.json();
    if (!body || !body.sourceVolumeId) {
      return NextResponse.json({ error: 'Invalid draft payload' }, { status: 400 });
    }

    // Validate chapters: never overwrite valid chapters with an empty array
    let chaptersToSave = body.chapters;
    if (!Array.isArray(chaptersToSave) || chaptersToSave.length === 0) {
      const fallback = createInitialDraft(body.sourceVolumeId);
      chaptersToSave = fallback.chapters;
    }

    const updatedDraft: VolumeDraft = {
      ...body,
      chapters: chaptersToSave,
      version: (body.version || 1) + 1,
      lastSavedAt: new Date().toISOString(),
      isDirty: false
    };

    // Determine target storage key: prefer specific draftId, fallback to sourceVolumeId
    const targetKey = (body.draftId || body.sourceVolumeId).replace(/[^a-zA-Z0-9_-]/g, '');

    // Save to member vault drafts if member session exists
    if (member) {
      const memberDir = getMemberDraftsDir(member.id);
      fs.writeFileSync(path.join(memberDir, `${targetKey}.json`), JSON.stringify(updatedDraft, null, 2), 'utf-8');
    }

    // Also persist to general drafts dir
    ensureDataDir();
    fs.writeFileSync(path.join(DATA_DIR, `${targetKey}.json`), JSON.stringify(updatedDraft, null, 2), 'utf-8');

    memoryDraftStore.set(targetKey, updatedDraft);

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
