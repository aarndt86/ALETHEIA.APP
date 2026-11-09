import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getAuthenticatedMember, verifyMemberOwnership } from '@/lib/auth';
import { PublishingDraft, BookstoreImageAsset } from '@/lib/publishingData';
import { validateImageBuffer } from '@/lib/publishingImage';

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
 * GET: Stream authenticated bookstore image asset.
 * Enforces member-level vault isolation and publication scoping.
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
        { error: 'Both assetId and pubDraftId are required to retrieve an asset.' },
        { status: 400 }
      );
    }

    const sanitizedPubDraftId = pubDraftId.replace(/[^a-zA-Z0-9_-]/g, '');
    const sanitizedAssetId = assetId.replace(/[^a-zA-Z0-9_-]/g, '');

    // 1. Verify publishing draft belongs to this authenticated member
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

    // 2. Locate asset in member-isolated publishing assets folder
    const assetsDir = getMemberPublishingAssetsDir(member.id, draft.publicationId);
    const metaPath = path.join(assetsDir, `${sanitizedAssetId}.meta.json`);

    if (!fs.existsSync(metaPath)) {
      return NextResponse.json(
        { error: 'Image asset not found for this publication.' },
        { status: 404 }
      );
    }

    const metaRaw = fs.readFileSync(metaPath, 'utf-8');
    const assetMeta: BookstoreImageAsset = JSON.parse(metaRaw);

    if (assetMeta.memberId !== member.id || assetMeta.publicationId !== draft.publicationId) {
      return NextResponse.json(
        { error: 'Access forbidden. Cross-publication or cross-member asset reference.' },
        { status: 403 }
      );
    }

    const extension = assetMeta.mimeType === 'image/jpeg' ? 'jpg' : assetMeta.mimeType === 'image/png' ? 'png' : 'webp';
    const binaryPath = path.join(assetsDir, `${sanitizedAssetId}.${extension}`);

    if (!fs.existsSync(binaryPath)) {
      return NextResponse.json(
        { error: 'Physical image asset file missing from vault.' },
        { status: 404 }
      );
    }

    const binaryBuffer = fs.readFileSync(binaryPath);

    return new Response(binaryBuffer, {
      status: 200,
      headers: {
        'Content-Type': assetMeta.mimeType,
        'Content-Length': String(binaryBuffer.length),
        'Cache-Control': 'private, max-age=3600',
        'Content-Disposition': `inline; filename="${assetMeta.fileName || 'bookstore_image.' + extension}"`
      }
    });
  } catch (err: unknown) {
    console.error('Error streaming bookstore image asset:', err);
    return NextResponse.json(
      { error: 'Failed to stream bookstore image asset.' },
      { status: 500 }
    );
  }
}

/**
 * POST: Upload and validate bookstore artwork image.
 * Validates dimensions (400x560 to 6000x8400), format (JPEG/PNG/WebP), and size (max 10MB).
 * Stores safely in member's vault under publishing_assets/{publicationId}/.
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
    const file = (formData.get('imageFile') || formData.get('file')) as File | null;

    if (!pubDraftId || typeof pubDraftId !== 'string') {
      return NextResponse.json(
        { error: 'Publishing draft ID (pubDraftId) is required.' },
        { status: 400 }
      );
    }

    if (!file) {
      return NextResponse.json(
        { error: 'No image file uploaded.' },
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

    // 2. Read file into binary buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 3. Strict format, dimension, and size validation
    const validation = validateImageBuffer(buffer);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.statusCode }
      );
    }

    // 4. Generate asset ID and save to isolated publishing assets dir
    const timestamp = Date.now();
    const entropy = Math.random().toString(36).slice(2, 7);
    const assetId = `ast_img_${timestamp}_${entropy}`;
    const extension = validation.format === 'jpeg' ? 'jpg' : validation.format;

    const assetsDir = getMemberPublishingAssetsDir(member.id, draft.publicationId);
    const binaryFilePath = path.join(assetsDir, `${assetId}.${extension}`);
    const metaFilePath = path.join(assetsDir, `${assetId}.meta.json`);

    fs.writeFileSync(binaryFilePath, buffer);

    const assetRecord: BookstoreImageAsset = {
      assetId,
      publicationId: draft.publicationId,
      memberId: member.id,
      fileName: file.name ? file.name.slice(0, 100) : `artwork_${timestamp}.${extension}`,
      mimeType: validation.mimeType,
      fileSizeBytes: buffer.length,
      width: validation.width,
      height: validation.height,
      storagePath: `/api/volume/publishing/image?assetId=${assetId}&pubDraftId=${sanitizedPubDraftId}`,
      uploadedAt: new Date().toISOString()
    };

    fs.writeFileSync(metaFilePath, JSON.stringify(assetRecord, null, 2), 'utf-8');

    return NextResponse.json({
      success: true,
      asset: assetRecord,
      previewUrl: assetRecord.storagePath
    });
  } catch (err: unknown) {
    console.error('Error processing bookstore image upload:', err);
    return NextResponse.json(
      { error: 'Internal error processing bookstore image upload.' },
      { status: 500 }
    );
  }
}
