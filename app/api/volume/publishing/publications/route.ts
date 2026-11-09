import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getAuthenticatedMember, verifyMemberOwnership } from '@/lib/auth';
import { PublishingDraft, PublicationSummary, PreservedPublicationEdition } from '@/lib/publishingData';

const VAULT_DIR = path.join(process.cwd(), '.data', 'vault');

function getMemberVaultDir(memberId: string) {
  const sanitized = memberId.replace(/[^a-zA-Z0-9_-]/g, '');
  return path.join(VAULT_DIR, sanitized);
}

export interface PublicationItemWithEditions extends PublicationSummary {
  editions: PreservedPublicationEdition[];
}

/**
 * GET: Retrieve all publishing projects (in-progress drafts and preserved publications)
 * for the authenticated member.
 * Enforces strict member-scoped vault boundaries.
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
    const sourceEditionId = searchParams.get('sourceEditionId');
    const memberVaultDir = getMemberVaultDir(member.id);

    // 1. Fetch In-Progress Publishing Drafts
    const draftsDir = path.join(memberVaultDir, 'publishing_drafts');
    const drafts: PublishingDraft[] = [];

    if (fs.existsSync(draftsDir)) {
      const draftFiles = fs.readdirSync(draftsDir).filter(f => f.endsWith('.json') && !f.startsWith('.'));
      for (const file of draftFiles) {
        try {
          const filePath = path.join(draftsDir, file);
          const raw = fs.readFileSync(filePath, 'utf-8');
          const draft: PublishingDraft = JSON.parse(raw);
          if (verifyMemberOwnership(member, draft.memberId)) {
            if (!sourceEditionId || draft.sourceEditionId === sourceEditionId) {
              drafts.push(draft);
            }
          }
        } catch (e) {
          console.warn('Error reading publishing draft:', file, e);
        }
      }
    }

    // Sort drafts by lastSavedAt desc (newest first)
    drafts.sort((a, b) => new Date(b.lastSavedAt || b.createdAt).getTime() - new Date(a.lastSavedAt || a.createdAt).getTime());

    // 2. Fetch Preserved Publications & Editions
    const pubsRootDir = path.join(memberVaultDir, 'publications');
    const publications: PublicationItemWithEditions[] = [];

    if (fs.existsSync(pubsRootDir)) {
      const pubDirs = fs.readdirSync(pubsRootDir).filter(f => {
        const full = path.join(pubsRootDir, f);
        return fs.statSync(full).isDirectory();
      });

      for (const pubId of pubDirs) {
        const pubDir = path.join(pubsRootDir, pubId);
        const summaryPath = path.join(pubDir, 'summary.json');
        const editionsDir = path.join(pubDir, 'editions');

        let summary: PublicationSummary | null = null;
        if (fs.existsSync(summaryPath)) {
          try {
            summary = JSON.parse(fs.readFileSync(summaryPath, 'utf-8'));
          } catch {
            summary = null;
          }
        }

        const editions: PreservedPublicationEdition[] = [];
        if (fs.existsSync(editionsDir)) {
          const edFiles = fs.readdirSync(editionsDir).filter(f => f.endsWith('.json'));
          for (const edFile of edFiles) {
            try {
              const edRaw = fs.readFileSync(path.join(editionsDir, edFile), 'utf-8');
              const ed: PreservedPublicationEdition = JSON.parse(edRaw);
              if (verifyMemberOwnership(member, ed.memberId)) {
                editions.push(ed);
              }
            } catch {
              // Skip malformed files
            }
          }
        }

        // Sort editions by version desc (newest first)
        editions.sort((a, b) => b.version - a.version);

        if (summary && verifyMemberOwnership(member, summary.memberId)) {
          if (!sourceEditionId || summary.sourceEditionId === sourceEditionId) {
            publications.push({
              ...summary,
              editions
            });
          }
        } else if (editions.length > 0) {
          // If summary missing, construct from latest edition
          const latest = editions[0];
          if (!sourceEditionId || latest.sourcePrivateEditionId === sourceEditionId) {
            publications.push({
              publicationId: pubId,
              memberId: member.id,
              sourceVolumeId: latest.sourceVolumeId,
              sourceEditionId: latest.sourcePrivateEditionId,
              sourceEditionVersion: latest.sourcePrivateEditionVersion,
              bookTitle: latest.bookTitle,
              subtitle: latest.subtitle,
              authorDisplayName: latest.authorDisplayName,
              activeDraftId: latest.publishingDraftId,
              latestPreservedEditionId: latest.publicationEditionId,
              createdAt: latest.preservedAt,
              lastSavedAt: latest.preservedAt,
              sealedEditionCount: editions.length,
              status: 'preserved',
              editions
            });
          }
        }
      }
    }

    // Sort publications by lastSavedAt desc
    publications.sort((a, b) => new Date(b.lastSavedAt || b.createdAt).getTime() - new Date(a.lastSavedAt || a.createdAt).getTime());

    return NextResponse.json({
      success: true,
      draftsCount: drafts.length,
      publicationsCount: publications.length,
      drafts,
      publications
    });
  } catch (err: unknown) {
    console.error('Error listing publishing projects:', err);
    return NextResponse.json(
      { error: 'Failed to retrieve publishing projects from vault.' },
      { status: 500 }
    );
  }
}
