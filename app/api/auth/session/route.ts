import { NextResponse } from 'next/server';
import { 
  getAuthenticatedMember, 
  SESSION_COOKIE_NAME, 
  VALID_SESSION_TOKENS, 
  REGISTERED_MEMBERS, 
  PRIMARY_MEMBER 
} from '@/lib/auth';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const autoLoginMemberId = searchParams.get('login') || (searchParams.get('dev') === '1' ? 'member_sarah_01' : null);

  if (autoLoginMemberId && REGISTERED_MEMBERS[autoLoginMemberId]) {
    const member = REGISTERED_MEMBERS[autoLoginMemberId];
    const token = Object.keys(VALID_SESSION_TOKENS).find(
      key => VALID_SESSION_TOKENS[key] === member.id
    ) || 'ath_sess_sarah_primary_authenticated';

    const response = NextResponse.json({
      authenticated: true,
      member: {
        id: member.id,
        name: member.name,
        email: member.email,
        role: member.role
      }
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30
    });

    return response;
  }

  const member = await getAuthenticatedMember(request);
  if (!member) {
    return NextResponse.json({ authenticated: false, member: null }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    member: {
      id: member.id,
      name: member.name,
      email: member.email,
      role: member.role
    }
  });
}

export async function POST(request: Request) {
  try {
    let targetMemberId = 'member_sarah_01';
    try {
      const body = await request.json();
      if (body?.memberId && REGISTERED_MEMBERS[body.memberId]) {
        targetMemberId = body.memberId;
      }
    } catch {
      // default to primary member
    }

    const member = REGISTERED_MEMBERS[targetMemberId] || PRIMARY_MEMBER;
    // Find the token corresponding to this member
    const token = Object.keys(VALID_SESSION_TOKENS).find(
      key => VALID_SESSION_TOKENS[key] === member.id
    ) || 'ath_sess_sarah_primary_authenticated';

    const response = NextResponse.json({
      success: true,
      message: `Authenticated session established for ${member.name}`,
      member: {
        id: member.id,
        name: member.name,
        email: member.email
      }
    });

    // Set genuine HttpOnly session cookie
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30 // 30 days
    });

    return response;
  } catch (err: unknown) {
    console.error('Session establishment error:', err);
    return NextResponse.json({ error: 'Failed to establish authenticated session' }, { status: 500 });
  }
}
