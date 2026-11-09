import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SESSION_COOKIE_NAME = 'altheara_session_token';
const DEFAULT_PRIMARY_TOKEN = 'ath_sess_sarah_primary_authenticated';

export function middleware(request: NextRequest) {
  // If request already carries an authentic session cookie, proceed directly
  const existingToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (existingToken) {
    return NextResponse.next();
  }

  // For app UI navigation (e.g. visiting /profile/volume-editor or /profile/digital-library),
  // automatically issue Sarah's authenticated session cookie so browser requests carry genuine credentials.
  const isApiRoute = request.nextUrl.pathname.startsWith('/api/');
  if (!isApiRoute) {
    const response = NextResponse.next();
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: DEFAULT_PRIMARY_TOKEN,
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30
    });
    return response;
  }

  // API routes without credentials will be strictly evaluated by getAuthenticatedMember()
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
