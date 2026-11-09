import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getAuthenticatedMember, verifyMemberOwnership } from '@/lib/auth';
import { 
  PreservedVolumeEdition, 
  VolumeDraft, 
  PreservationFormatConfig, 
  AuthenticRecordingAsset,
  ANNUAL_LINEN_DESIGNS
} from '@/lib/volumeData';

const VAULT_DIR = path.join(process.cwd(), '.data', 'vault');

function getMemberEditionsDir(memberId: string) {
  const dir = path.join(VAULT_DIR, memberId, 'editions');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

interface PreservePayload {
  draft: VolumeDraft;
  authenticRecording?: AuthenticRecordingAsset | null;
  preservationFormats: {
    paperbackSelected?: boolean;
    customHardcoverSelected?: boolean;
    signatureLinenSelected?: boolean;
    customizedLinenTitle?: string;
  };
}

export async function POST(request: Request) {
  try {
    // 1. Authenticate member from genuine session (Safeguard 2 & Requirement 2)
    const member = await getAuthenticatedMember(request);
    if (!member) {
      return NextResponse.json(
        { error: 'Authentication required. No active member session.' },
        { status: 401 }
      );
    }

    const body: PreservePayload = await request.json();
    const { draft, authenticRecording, preservationFormats } = body;

    if (!draft || !draft.sourceVolumeId || !Array.isArray(draft.chapters) || draft.chapters.length === 0) {
      return NextResponse.json(
        { error: 'Invalid manuscript payload. Manuscript must have chapters to be preserved.' },
        { status: 400 }
      );
    }

    // 2. Validate authentic recording ownership if attached (Safeguard 2)
    if (authenticRecording) {
      if (!verifyMemberOwnership(member, authenticRecording.memberId)) {
        return NextResponse.json(
          { error: 'Ownership validation failed: Authentic recording does not belong to your authenticated member vault.' },
          { status: 403 }
        );
      }
    }

    const editionsDir = getMemberEditionsDir(member.id);

    // 3. Scan existing editions for this source volume to determine the next immutable version
    // Synchronous filesystem scan prevents race conditions in isolated storage
    let highestVersion = 0;
    try {
      const existingFiles = fs.readdirSync(editionsDir).filter(f => f.endsWith('.json') && !f.startsWith('.'));
      for (const file of existingFiles) {
        try {
          const raw = fs.readFileSync(path.join(editionsDir, file), 'utf-8');
          const ed: PreservedVolumeEdition = JSON.parse(raw);
          if (ed.sourceVolumeId === draft.sourceVolumeId && typeof ed.version === 'number') {
            if (ed.version > highestVersion) {
              highestVersion = ed.version;
            }
          }
        } catch {
          // ignore unparseable or transient files
        }
      }
    } catch (readDirErr) {
      console.warn('Could not read existing editions directory:', readDirErr);
    }

    const nextVersion = highestVersion + 1;
    const editionTimestamp = Date.now();
    const editionId = `ed_${draft.sourceVolumeId}_v${nextVersion}_${editionTimestamp}`;

    // 4. Calculate total words
    const totalWords = draft.chapters.reduce((acc, chap) => {
      const chapWords = chap.paragraphs.reduce((pAcc, p) => {
        return pAcc + (p.text ? p.text.trim().split(/\s+/).filter(Boolean).length : 0);
      }, 0);
      return acc + chapWords;
    }, 0);

    // 5. Build configurable preservation format structure
    const formatConfig: PreservationFormatConfig = {
      ebook: {
        included: true,
        status: 'preserved_digital'
      }
    };

    if (preservationFormats?.paperbackSelected) {
      formatConfig.paperback = {
        configured: true,
        status: 'configured_in_vault',
        trimSize: '6x9',
        paperStock: 'Cream 60# Archival Book'
      };
    }

    if (preservationFormats?.customHardcoverSelected) {
      formatConfig.customHardcover = {
        configured: true,
        status: 'configured_in_vault',
        binding: 'Case Laminate Matte',
        trimSize: '6x9'
      };
    }

    if (preservationFormats?.signatureLinenSelected) {
      const annualLinen = ANNUAL_LINEN_DESIGNS[draft.year] || ANNUAL_LINEN_DESIGNS[2025];
      formatConfig.signatureLinen = {
        configured: true,
        annualDesignId: annualLinen.designId,
        customizedTitle: (preservationFormats.customizedLinenTitle || draft.bookTitle).trim(),
        status: 'configured_in_vault',
        coverFinish: 'Archival Oatmeal Linen with Bronze Foil Spine'
      };
    }

    // 6. Construct the immutable edition record
    const immutableEdition: PreservedVolumeEdition = {
      editionId,
      memberId: member.id,
      sourceVolumeId: draft.sourceVolumeId,
      version: nextVersion,
      preservedAt: new Date().toISOString(),
      status: 'preserved_in_vault',
      storageType: 'development_local_vault',
      bookTitle: draft.bookTitle,
      subtitle: draft.subtitle,
      authorName: draft.authorName || member.name,
      totalChapters: draft.chapters.length,
      totalWords,
      // Deep clone chapters to guarantee full immutability
      chapters: JSON.parse(JSON.stringify(draft.chapters)),
      authenticRecording: authenticRecording ? { ...authenticRecording } : null,
      preservationFormats: formatConfig
    };

    // 7. Atomic & Safe Disk Persistence (Item 1 & Safeguard 1)
    const targetFilePath = path.join(editionsDir, `${editionId}.json`);
    
    // Strict immutability guarantee: Never overwrite an existing edition file!
    if (fs.existsSync(targetFilePath)) {
      return NextResponse.json(
        { 
          error: `Immutability constraint violation: Edition ${editionId} already exists in vault and cannot be overwritten.`,
          success: false 
        },
        { status: 409 }
      );
    }

    // Atomic staging write via temporary file
    const tmpFilePath = path.join(editionsDir, `.${editionId}.${Date.now()}.tmp`);
    
    try {
      // Write to isolated temporary staging file
      fs.writeFileSync(tmpFilePath, JSON.stringify(immutableEdition, null, 2), {
        encoding: 'utf-8',
        flag: 'wx'
      });

      // Verify non-empty before committing
      const stat = fs.statSync(tmpFilePath);
      if (stat.size === 0) {
        throw new Error('Staging file verification failed: zero bytes written.');
      }

      // Atomic rename commits the edition file in one atomic OS operation
      fs.renameSync(tmpFilePath, targetFilePath);
    } catch (writeErr) {
      if (fs.existsSync(tmpFilePath)) {
        try { fs.unlinkSync(tmpFilePath); } catch {}
      }
      console.error('Fatal vault write error:', writeErr);
      return NextResponse.json(
        { 
          error: 'Durable vault storage failure: Unable to write immutable edition to disk. Your editable draft is safely intact. Preservation was not finalized.',
          success: false 
        },
        { status: 500 }
      );
    }

    // Explicit final disk verification (Safeguard 1)
    if (!fs.existsSync(targetFilePath) || fs.statSync(targetFilePath).size === 0) {
      return NextResponse.json(
        { 
          error: 'Verification failure: Edition file was not found or was zero-byte on vault disk. Your editable draft remains intact.',
          success: false 
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      edition: immutableEdition,
      isNewVersion: nextVersion > 1,
      versionNumber: nextVersion,
      storageNotice: 'Successfully sealed in local development vault. Production storage requires cloud vault integration.'
    });

  } catch (err: unknown) {
    console.error('Preservation route fatal error:', err);
    return NextResponse.json(
      { 
        error: 'An unexpected server error occurred during preservation. Your editable draft has not been modified.',
        success: false 
      },
      { status: 500 }
    );
  }
}
