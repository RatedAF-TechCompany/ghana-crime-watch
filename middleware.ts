import { NextResponse, type NextRequest } from 'next/server';

/**
 * Logged-out visitors get a real HTTP redirect from /admin to /auth.
 * The gc_session cookie is only a routing hint set by the client when a session exists;
 * real access control stays in AdminGate (role check) and database RLS.
 */
export function middleware(req: NextRequest) {
  if (!req.cookies.get('gc_session')) {
    const url = req.nextUrl.clone();
    url.pathname = '/auth';
    url.search = '';
    const res = NextResponse.redirect(url, 307);
    res.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return res;
  }
  const res = NextResponse.next();
  res.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return res;
}

export const config = { matcher: ['/admin', '/admin/:path*'] };
