import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getAuthenticatedMember, verifyMemberOwnership } from '@/lib/auth';
import { PhysicalEditionOrder } from '@/lib/volumeData';

const VAULT_DIR = path.join(process.cwd(), '.data', 'vault');

function getMemberOrdersDir(memberId: string) {
  // Prevent directory traversal
  const sanitizedMemberId = memberId.replace(/[^a-zA-Z0-9_-]/g, '');
  return path.join(VAULT_DIR, sanitizedMemberId, 'orders');
}

export async function GET(request: Request) {
  try {
    // 1. Authenticate member from session (Requirement 8)
    const member = await getAuthenticatedMember(request);
    if (!member) {
      return NextResponse.json(
        { error: 'Authentication required. No active member session.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const editionId = searchParams.get('editionId');
    const bookId = searchParams.get('bookId');
    const includeDevFixtures = searchParams.get('includeDevFixtures') === 'true';

    // 2. Locate orders directory in authenticated member's vault
    const ordersDir = getMemberOrdersDir(member.id);
    if (!fs.existsSync(ordersDir)) {
      return NextResponse.json({ orders: [] });
    }

    // 3. Read and filter physical orders
    const files = fs.readdirSync(ordersDir).filter(f => f.endsWith('.json') && !f.startsWith('.'));
    const orders: PhysicalEditionOrder[] = [];

    for (const f of files) {
      try {
        const filePath = path.join(ordersDir, f);
        const raw = fs.readFileSync(filePath, 'utf-8');
        const order: PhysicalEditionOrder = JSON.parse(raw);

        // Security check: Verify order ownership matches authenticated member
        if (!verifyMemberOwnership(member, order.memberId)) {
          continue;
        }

        // Requirement 3 & 7: Development fixtures must be excluded from normal member views
        if (order.isDevFixture && !includeDevFixtures) {
          continue;
        }

        // Filter by edition if requested
        if (editionId && order.editionId !== editionId) {
          continue;
        }

        // Filter by source volume if requested
        if (bookId && order.sourceVolumeId !== bookId) {
          continue;
        }

        orders.push(order);
      } catch (fileErr) {
        // Skip malformed files safely
        console.warn(`Could not parse order file ${f}:`, fileErr);
      }
    }

    // Sort by order date descending (most recent first)
    orders.sort((a, b) => new Date(b.orderedAt).getTime() - new Date(a.orderedAt).getTime());

    return NextResponse.json({ orders });
  } catch (err: unknown) {
    console.error('Physical orders fetch error:', err);
    return NextResponse.json(
      { error: 'Failed to retrieve physical orders.' },
      { status: 500 }
    );
  }
}

// 4. Strict API Scope: Reject order creation and mutations (Corrections 2 & 5)
// "Do not create a member-accessible order POST endpoint."
export async function POST() {
  return NextResponse.json(
    { error: 'Order creation is restricted. Physical ordering will become available in a future release.' },
    { status: 405, headers: { Allow: 'GET' } }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Order modification is restricted. Orders are preserved in an immutable event ledger.' },
    { status: 405, headers: { Allow: 'GET' } }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Order deletion is forbidden. Physical order history is an indelible record.' },
    { status: 405, headers: { Allow: 'GET' } }
  );
}
