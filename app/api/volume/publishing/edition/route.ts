import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getAuthenticatedMember, verifyMemberOwnership } from '@/lib/auth';
import { PreservedPublicationEdition } from '@/lib/publishingData';

const VAULT_DIR = path.join(process.cwd(), '.data', 'vault');

function getMemberVaultDir(memberId: string) {
  const sanitized = memberId.replace(/[^a-zA-Z0-9_-]/g, '');
  return path.join(VAULT_DIR, sanitized);
}

/**
 * GET: Retrieve a preserved publication edition or list editions for a publication.
 * Enforces strict authenticated member ownership and vault boundaries.
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
    const publicationId = searchParams.get('publicationId');
    const editionId = searchParams.get('editionId');

    if (!publicationId || typeof publicationId !== 'string') {
      return NextResponse.json(
        { error: 'Publication ID (publicationId) query parameter is required.' },
        { status: 400 }
      );
    }

    const sanitizedPubId = publicationId.replace(/[^a-zA-Z0-9_-]/g, '');
    const editionsDir = path.join(getMemberVaultDir(member.id), 'publications', sanitizedPubId, 'editions');

    if (!fs.existsSync(editionsDir)) {
      return NextResponse.json(
        { error: 'Publication editions repository not found in member vault.' },
        { status: 404 }
      );
    }

    // Single edition retrieval
    if (editionId) {
      const sanitizedEditionId = editionId.replace(/[^a-zA-Z0-9_-]/g, '');
      const editionFilePath = path.join(editionsDir, `${sanitizedEditionId}.json`);

      if (!fs.existsSync(editionFilePath)) {
        return NextResponse.json(
          { error: 'Preserved publication edition not found.' },
          { status: 404 }
        );
      }

      const fileContent = fs.readFileSync(editionFilePath, 'utf-8');
      const edition: PreservedPublicationEdition = JSON.parse(fileContent);

      if (!verifyMemberOwnership(member, edition.memberId)) {
        return NextResponse.json(
          { error: 'Access forbidden. You do not own this publication edition.' },
          { status: 403 }
        );
      }

      return NextResponse.json({
        success: true,
        edition
      });
    }

    // List all editions for publication
    const files = fs.readdirSync(editionsDir).filter(f => f.endsWith('.json'));
    const editions: PreservedPublicationEdition[] = [];

    for (const file of files) {
      try {
        const filePath = path.join(editionsDir, file);
        const data: PreservedPublicationEdition = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        if (verifyMemberOwnership(member, data.memberId)) {
          editions.push(data);
        }
      } catch {
        // Skip malformed files
      }
    }

    // Sort by version descending (newest first)
    editions.sort((a, b) => b.version - a.version);

    return NextResponse.json({
      success: true,
      count: editions.length,
      editions
    });
  } catch (err: unknown) {
    console.error('Error retrieving preserved publication edition:', err);
    return NextResponse.json(
      { error: 'Failed to retrieve preserved publication edition.' },
      { status: 500 }
    );
  }
}
