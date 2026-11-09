import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getAuthenticatedMember, verifyMemberOwnership } from '@/lib/auth';
import { PublishingDraft, BookstoreVideoAsset } from '@/lib/publishingData';
import { validateVideoBuffer } from '@/lib/publishingVideo';

const VAULT_DIR = path.join(process.cwd(), '.data', 'vault');

function getMemberVaultDir(memberId: string) {
  const sanitized = memberId.replace(/[^a-zA-Z0-9_-]/g, '');
  return path.join(VAULT_DIR, sanitized);
}

function getMemberPublishingAssetsDir(memberId: string, publicationId: string) {
  const sanitizedPubId = publicationId.replace(/[^a-zA-Z0-9_-]/g, '');
  const dir = path.join(getMemberVaultDir(memberId), 'publishing_assets', sanitizedPubId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * GET: Stream authenticated bookstore showcase video.
 * Enforces member session, publication isolation, and supports HTTP 206 Range streaming.
 */
export async function GET(request: Request) {
  try {
    const member = await getAuthenticatedMember(request);
    if (!member) {
      return NextResponse.json(
        { error: 'Authentication required. No active member session.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const assetId = searchParams.get('assetId');
    const pubDraftId = searchParams.get('pubDraftId');

    if (!assetId || !pubDraftId) {
      return NextResponse.json(
        { error: 'Both assetId and pubDraftId are required to stream an author video.' },
        { status: 400 }
      );
    }

    const sanitizedPubDraftId = pubDraftId.replace(/[^a-zA-Z0-9_-]/g, '');
    const sanitizedAssetId = assetId.replace(/[^a-zA-Z0-9_-]/g, '');

    // 1. Verify publishing draft ownership
    const draftPath = path.join(getMemberVaultDir(member.id), 'publishing_drafts', `${sanitizedPubDraftId}.json`);
    if (!fs.existsSync(draftPath)) {
      return NextResponse.json(
        { error: 'Publishing draft not found in your vault.' },
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

    // 2. Locate asset metadata
    const assetsDir = getMemberPublishingAssetsDir(member.id, draft.publicationId);
    const metaPath = path.join(assetsDir, `${sanitizedAssetId}.meta.json`);

    if (!fs.existsSync(metaPath)) {
      return NextResponse.json(
        { error: 'Video asset not found for this publication.' },
        { status: 404 }
      );
    }

    const metaRaw = fs.readFileSync(metaPath, 'utf-8');
    const assetMeta: BookstoreVideoAsset = JSON.parse(metaRaw);

    if (assetMeta.memberId !== member.id || assetMeta.publicationId !== draft.publicationId) {
      return NextResponse.json(
        { error: 'Access forbidden. Cross-publication or cross-member asset reference.' },
        { status: 403 }
      );
    }

    const extension = assetMeta.mimeType === 'video/webm' ? 'webm' : assetMeta.mimeType === 'video/quicktime' ? 'mov' : 'mp4';
    const binaryPath = path.join(assetsDir, `${sanitizedAssetId}.${extension}`);

    if (!fs.existsSync(binaryPath)) {
      return NextResponse.json(
        { error: 'Physical video file missing from vault.' },
        { status: 404 }
      );
    }

    const stat = fs.statSync(binaryPath);
    const fileSize = stat.size;
    const rangeHeader = request.headers.get('range');

    // HTTP 206 Partial Content for video seeking
    if (rangeHeader) {
      const parts = rangeHeader.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      const fileBuffer = Buffer.alloc(chunkSize);
      const fd = fs.openSync(binaryPath, 'r');
      fs.readSync(fd, fileBuffer, 0, chunkSize, start);
      fs.closeSync(fd);

      return new Response(fileBuffer, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': String(chunkSize),
          'Content-Type': assetMeta.mimeType,
          'Cache-Control': 'private, max-age=3600'
        }
      });
    }

    // Full content response
    const fullBuffer = fs.readFileSync(binaryPath);
    return new Response(fullBuffer, {
      status: 200,
      headers: {
        'Content-Type': assetMeta.mimeType,
        'Content-Length': String(fileSize),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'private, max-age=3600',
        'Content-Disposition': `inline; filename="${assetMeta.fileName || 'showcase_video.' + extension}"`
      }
    });
  } catch (err: unknown) {
    console.error('Error streaming author showcase video:', err);
    return NextResponse.json(
      { error: 'Failed to stream author showcase video.' },
      { status: 500 }
    );
  }
}

/**
 * POST: Upload and validate authentic author showcase video.
 * Enforces duration bounds (<= 30.0s), file size ceiling (50MB), and isolated storage.
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

    const formData = await request.formData().catch(() => null);
    if (!formData) {
      return NextResponse.json(
        { error: 'Invalid form submission. Multipart form data required.' },
        { status: 400 }
      );
    }

    const pubDraftId = formData.get('pubDraftId') as string | null;
    const file = (formData.get('videoFile') || formData.get('file')) as File | null;
    const rawDuration = formData.get('durationSeconds') as string | null;
    const source = (formData.get('source') as string) || 'member_upload';

    if (!pubDraftId || typeof pubDraftId !== 'string') {
      return NextResponse.json(
        { error: 'Publishing draft ID (pubDraftId) is required.' },
        { status: 400 }
      );
    }

    if (!file) {
      return NextResponse.json(
        { error: 'No video file provided.' },
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

    // 2. Read binary file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const clientDuration = rawDuration ? parseFloat(rawDuration) : undefined;

    // 3. Validate video format, size, and duration
    const validation = validateVideoBuffer(buffer, clientDuration);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.statusCode }
      );
    }

    // 4. Generate unique asset ID and store under publication vault
    const timestamp = Date.now();
    const entropy = Math.random().toString(36).slice(2, 7);
    const assetId = `ast_vid_${timestamp}_${entropy}`;
    const extension = validation.format;

    const assetsDir = getMemberPublishingAssetsDir(member.id, draft.publicationId);
    const binaryFilePath = path.join(assetsDir, `${assetId}.${extension}`);
    const metaFilePath = path.join(assetsDir, `${assetId}.meta.json`);

    fs.writeFileSync(binaryFilePath, buffer);

    const assetRecord: BookstoreVideoAsset = {
      assetId,
      publicationId: draft.publicationId,
      memberId: member.id,
      fileName: file.name ? file.name.slice(0, 100) : `showcase_${timestamp}.${extension}`,
      mimeType: validation.mimeType,
      fileSizeBytes: buffer.length,
      durationSeconds: validation.durationSeconds,
      storagePath: `/api/volume/publishing/video?assetId=${assetId}&pubDraftId=${sanitizedPubDraftId}`,
      uploadedAt: new Date().toISOString()
    };

    fs.writeFileSync(metaFilePath, JSON.stringify(assetRecord, null, 2), 'utf-8');

    return NextResponse.json({
      success: true,
      asset: assetRecord,
      previewUrl: assetRecord.storagePath
    });
  } catch (err: unknown) {
    console.error('Error processing author showcase video upload:', err);
    return NextResponse.json(
      { error: 'Internal error processing author showcase video upload.' },
      { status: 500 }
    );
  }
}
