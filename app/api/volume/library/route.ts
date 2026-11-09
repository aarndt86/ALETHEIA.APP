import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getAuthenticatedMember, verifyMemberOwnership } from '@/lib/auth';
import { PreservedVolumeEdition } from '@/lib/volumeData';

const VAULT_DIR = path.join(process.cwd(), '.data', 'vault');

function getMemberEditionsDir(memberId: string) {
  const dir = path.join(VAULT_DIR, memberId, 'editions');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export async function GET(request: Request) {
  try {
    // 1. Authenticate member from session (Safeguard 2)
    const member = await getAuthenticatedMember(request);
    if (!member) {
      return NextResponse.json(
        { error: 'Authentication required. No active member session.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const editionId = searchParams.get('editionId');
    const editionsDir = getMemberEditionsDir(member.id);

    // 2. Single edition lookup
    if (editionId) {
      const editionPath = path.join(editionsDir, `${editionId}.json`);
      if (!fs.existsSync(editionPath)) {
        return NextResponse.json(
          { error: 'Preserved edition not found in your vault.' },
          { status: 404 }
        );
      }

      const raw = fs.readFileSync(editionPath, 'utf-8');
      const edition: PreservedVolumeEdition = JSON.parse(raw);

      // Verify member ownership (Safeguard 2)
      if (!verifyMemberOwnership(member, edition.memberId)) {
        return NextResponse.json(
          { error: 'Access forbidden: You do not have permission to view this vault edition.' },
          { status: 403 }
        );
      }

      return NextResponse.json({ edition });
    }

    // 3. List all preserved editions for the authenticated member
    const editions: PreservedVolumeEdition[] = [];
    if (fs.existsSync(editionsDir)) {
      const files = fs.readdirSync(editionsDir).filter(f => f.endsWith('.json'));
      for (const file of files) {
        try {
          const raw = fs.readFileSync(path.join(editionsDir, file), 'utf-8');
          const ed: PreservedVolumeEdition = JSON.parse(raw);
          if (verifyMemberOwnership(member, ed.memberId)) {
            editions.push(ed);
          }
        } catch (parseErr) {
          console.warn('Error reading edition file:', file, parseErr);
        }
      }
    }

    // Sort by preservedAt desc (newest first)
    editions.sort((a, b) => new Date(b.preservedAt).getTime() - new Date(a.preservedAt).getTime());

    return NextResponse.json({
      editions,
      member: {
        id: member.id,
        name: member.name
      },
      storageNotice: 'Preserved in isolated local vault. Development mode.'
    });

  } catch (err: unknown) {
    console.error('Digital library route error:', err);
    return NextResponse.json(
      { error: 'Failed to retrieve vault editions.' },
      { status: 500 }
    );
  }
}
