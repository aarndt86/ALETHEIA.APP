import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getAuthenticatedMember, verifyMemberOwnership } from '@/lib/auth';
import { AuthenticRecordingAsset } from '@/lib/volumeData';

// Allowed media MIME types for authentic voice and video recording
const ALLOWED_MIME_TYPES = new Set([
  'audio/webm',
  'audio/webm;codecs=opus',
  'audio/mp4',
  'audio/ogg',
  'video/webm',
  'video/webm;codecs=vp8,opus',
  'video/webm;codecs=vp9,opus',
  'video/mp4'
]);

// 50 MB hard limit for authentic reading takes
const MAX_FILE_SIZE = 50 * 1024 * 1024;

const VAULT_DIR = path.join(process.cwd(), '.data', 'vault');

function getMemberMediaDir(memberId: string) {
  const dir = path.join(VAULT_DIR, memberId, 'media');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function getMemberMetaDir(memberId: string) {
  const dir = path.join(VAULT_DIR, memberId, 'media_meta');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export async function POST(request: Request) {
  try {
    // 1. Authenticate member from session (Safeguard 2)
    const member = await getAuthenticatedMember(request);
    if (!member) {
      return NextResponse.json(
        { error: 'Authentication required. No active member session.' },
        { status: 401 }
      );
    }

    // 2. Pre-flight check content-length header (Safeguard 3 & Requirement 2)
    const contentLength = Number(request.headers.get('content-length') || 0);
    if (contentLength > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Media recording exceeds limit of 50MB. (Provided: ${(contentLength / (1024 * 1024)).toFixed(1)}MB)` },
        { status: 413 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('mediaFile') as File | null;
    const mediaType = (formData.get('mediaType') as string) || 'voice';
    const durationSeconds = Number(formData.get('durationSeconds')) || 0;
    const selectedExcerpt = (formData.get('selectedExcerpt') as string) || '';

    if (!file) {
      return NextResponse.json(
        { error: 'Missing media file in recording submission.' },
        { status: 400 }
      );
    }

    // 2. Validate MIME type & file size (Safeguard 3)
    const rawMimeType = file.type || (mediaType === 'video' ? 'video/webm' : 'audio/webm');
    const baseMime = rawMimeType.split(';')[0].toLowerCase();
    
    const isMimeAllowed = Array.from(ALLOWED_MIME_TYPES).some(allowed => 
      rawMimeType.toLowerCase().startsWith(allowed.toLowerCase()) || 
      baseMime === allowed.toLowerCase()
    );

    if (!isMimeAllowed) {
      return NextResponse.json(
        { error: `Unsupported media format: ${rawMimeType}. Only authentic audio/video webm and mp4 are permitted.` },
        { status: 415 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Media recording exceeds limit of 50MB. (Provided: ${(file.size / (1024 * 1024)).toFixed(1)}MB)` },
        { status: 413 }
      );
    }

    // 3. Write binary to durable development vault storage
    const mediaDir = getMemberMediaDir(member.id);
    const metaDir = getMemberMetaDir(member.id);
    const assetId = `rec_${member.id}_${Date.now()}`;
    const extension = mediaType === 'video' ? 'webm' : (file.name?.endsWith('.mp4') ? 'mp4' : 'webm');
    const filename = `${assetId}.${extension}`;
    const filePath = path.join(mediaDir, filename);

    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    // Verify file exists on disk and is non-empty (Safeguard 1)
    if (!fs.existsSync(filePath) || fs.statSync(filePath).size === 0) {
      return NextResponse.json(
        { error: 'Durable storage write failed for authentic recording. The file could not be verified on disk.' },
        { status: 500 }
      );
    }

    // 4. Create authentic asset descriptor
    const asset: AuthenticRecordingAsset = {
      assetId,
      memberId: member.id,
      mediaType: mediaType === 'video' ? 'video' : 'voice',
      mimeType: rawMimeType,
      durationSeconds: Math.round(durationSeconds),
      fileSizeBytes: file.size,
      storagePath: `/api/volume/recording?assetId=${assetId}`,
      selectedPassageExcerpt: selectedExcerpt.slice(0, 500),
      recordedAt: new Date().toISOString(),
      status: 'approved_by_member',
      storageType: 'development_local_vault'
    };

    // Store metadata sidecar for access enforcement and playback verification
    const metaPath = path.join(metaDir, `${assetId}.json`);
    fs.writeFileSync(metaPath, JSON.stringify(asset, null, 2), 'utf-8');

    return NextResponse.json({
      success: true,
      asset,
      notice: 'Authentic recording saved to local development vault. Production-grade permanent cloud storage requires vault backend connection.'
    });
  } catch (err: unknown) {
    console.error('Recording upload error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred while preserving the authentic recording.' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const assetId = searchParams.get('assetId');

    if (!assetId) {
      return NextResponse.json({ error: 'Asset ID is required.' }, { status: 400 });
    }

    // 1. Authenticate member session (Safeguard 2)
    const member = await getAuthenticatedMember(request);
    if (!member) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    // 2. Locate metadata sidecar in member vault
    const metaPath = path.join(getMemberMetaDir(member.id), `${assetId}.json`);
    if (!fs.existsSync(metaPath)) {
      return NextResponse.json({ error: 'Recording asset not found in member vault.' }, { status: 404 });
    }

    const rawMeta = fs.readFileSync(metaPath, 'utf-8');
    const asset: AuthenticRecordingAsset = JSON.parse(rawMeta);

    // 3. Verify member ownership (Safeguard 2)
    if (!verifyMemberOwnership(member, asset.memberId)) {
      return NextResponse.json({ error: 'Access forbidden. You do not own this recording.' }, { status: 403 });
    }

    // 4. Locate binary file
    const mediaDir = getMemberMediaDir(member.id);
    const possibleExts = ['webm', 'mp4', 'ogg'];
    let filePath: string | null = null;
    for (const ext of possibleExts) {
      const p = path.join(mediaDir, `${assetId}.${ext}`);
      if (fs.existsSync(p)) {
        filePath = p;
        break;
      }
    }

    if (!filePath || !fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Media binary missing from vault.' }, { status: 404 });
    }

    const stat = fs.statSync(filePath);
    const fileBuffer = fs.readFileSync(filePath);

    return new Response(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': asset.mimeType || 'audio/webm',
        'Content-Length': stat.size.toString(),
        'Accept-Ranges': 'bytes',
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, max-age=3600'
      }
    });
  } catch (err: unknown) {
    console.error('Recording retrieval error:', err);
    return NextResponse.json({ error: 'Failed to stream media asset.' }, { status: 500 });
  }
}
