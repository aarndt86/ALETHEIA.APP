import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getAuthenticatedMember, verifyMemberOwnership } from '@/lib/auth';
import { 
  PreservedVolumeEdition, 
  PreservedBook, 
  PreservedBookCover, 
  PreservedVolumeEditionSummary,
  SOURCE_VOLUMES, 
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
      const files = fs.readdirSync(editionsDir).filter(f => f.endsWith('.json') && !f.startsWith('.'));
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

    // Sort all editions by preservedAt desc (newest first)
    editions.sort((a, b) => new Date(b.preservedAt).getTime() - new Date(a.preservedAt).getTime());

    // 4. Aggregate editions into unique books (Brief Section 4: One card per book)
    const booksMap = new Map<string, PreservedVolumeEdition[]>();
    for (const ed of editions) {
      const bookKey = ed.sourceVolumeId || 'vol-unknown';
      if (!booksMap.has(bookKey)) {
        booksMap.set(bookKey, []);
      }
      booksMap.get(bookKey)!.push(ed);
    }

    const books: PreservedBook[] = [];
    for (const [bookId, bookEditions] of booksMap.entries()) {
      // Sort editions for this book by version desc (newest first)
      bookEditions.sort((a, b) => (b.version || 0) - (a.version || 0));
      const latestEdition = bookEditions[0];

      // Match immutable source volume if available for year and base artwork
      const sourceMeta = SOURCE_VOLUMES.find(v => v.id === bookId);
      
      // Extract year
      let year: number | undefined = sourceMeta?.year;
      if (!year) {
        const yearMatch = bookId.match(/\b(19\d\d|20\d\d)\b/);
        if (yearMatch) {
          year = parseInt(yearMatch[1], 10);
        } else {
          year = new Date(latestEdition.preservedAt).getFullYear();
        }
      }

      // Determine book type
      const isLifeBook = bookId.startsWith('life-') || latestEdition.sourceVolumeId.includes('life-book');
      const bookType: 'annual_volume' | 'life_book' = isLifeBook ? 'life_book' : 'annual_volume';

      // Determine exact preserved cover styling:
      // Priority 1: Preserved Signature Linen configuration (if member chose Signature Linen)
      // Priority 2: Source volume cover accent (e.g. Terracotta #8B5A42)
      // Priority 3: Fallback classic canvas
      let cover: PreservedBookCover;
      const linenCfg = latestEdition.preservationFormats?.signatureLinen;
      if (linenCfg?.configured) {
        const annualDesign = (year && ANNUAL_LINEN_DESIGNS[year]) || ANNUAL_LINEN_DESIGNS[2025];
        cover = {
          type: 'signature_linen',
          baseColor: annualDesign.baseColor || '#E8E2D9',
          spineFoilColor: annualDesign.spineFoilColor || '#3B3128',
          coverFinish: linenCfg.coverFinish || 'Archival Oatmeal Linen with Bronze Foil Spine',
          accentColor: sourceMeta?.coverAccent || '#8B5A42',
          embellishment: annualDesign.coverEmbellishment || 'Debossed botanical accent',
          customizedTitle: linenCfg.customizedTitle || latestEdition.bookTitle,
          annualDesignId: linenCfg.annualDesignId || annualDesign.designId
        };
      } else if (sourceMeta?.coverAccent) {
        cover = {
          type: 'custom_accent',
          baseColor: sourceMeta.coverAccent,
          spineFoilColor: '#FAF8F5',
          accentColor: sourceMeta.coverAccent,
          coverFinish: `${sourceMeta.title} Tailored Binding`
        };
      } else {
        cover = {
          type: 'classic_canvas',
          baseColor: '#8B5A42', // Warm terracotta default
          spineFoilColor: '#FAF8F5',
          accentColor: '#8B5A42',
          coverFinish: 'Archival Hardcover Binding'
        };
      }

      const editionSummaries: PreservedVolumeEditionSummary[] = bookEditions.map(e => ({
        editionId: e.editionId,
        version: e.version,
        preservedAt: e.preservedAt,
        bookTitle: e.bookTitle,
        subtitle: e.subtitle,
        totalChapters: e.totalChapters,
        totalWords: e.totalWords,
        hasAuthenticRecording: Boolean(e.authenticRecording),
        recordingMediaType: e.authenticRecording?.mediaType,
        preservationFormats: e.preservationFormats
      }));

      const hasAuthenticRecording = bookEditions.some(e => Boolean(e.authenticRecording));
      const latestRecordingMediaType = latestEdition.authenticRecording?.mediaType;

      books.push({
        bookId,
        bookType,
        year,
        displayTitle: latestEdition.bookTitle || sourceMeta?.title || 'Preserved Book',
        subtitle: latestEdition.subtitle || sourceMeta?.subtitle,
        authorName: latestEdition.authorName || member.name,
        cover,
        latestEdition,
        editions: editionSummaries,
        totalEditions: bookEditions.length,
        hasAuthenticRecording,
        latestRecordingMediaType,
        lastPreservedAt: latestEdition.preservedAt
      });
    }

    // Sort books: newest preserved first (or by year desc)
    books.sort((a, b) => {
      if (a.year && b.year && a.year !== b.year) return b.year - a.year;
      return new Date(b.lastPreservedAt).getTime() - new Date(a.lastPreservedAt).getTime();
    });

    return NextResponse.json({
      books,
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
