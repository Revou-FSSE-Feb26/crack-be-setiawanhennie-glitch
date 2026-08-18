import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function decodeJwtPayload(token: string): any {
  try {
    const base64Payload = token.split('.')[1];
    const json = Buffer.from(base64Payload, 'base64').toString('utf-8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const tokenCookie = request.cookies.get('token');
  const { pathname } = request.nextUrl;

  const protectedRoutes = ['/dashboard', '/courses', '/lesson', '/teacher', '/admin'];
  const publicRoutes = ['/sign-in', '/sign-up'];

  // Parse role from JWT if present
  let userRole: string | null = null;
  if (tokenCookie?.value) {
    const payload = decodeJwtPayload(tokenCookie.value);
    userRole = payload?.role ?? null;
  }

  // 1. No token → redirect to sign-in
  if (protectedRoutes.some(r => pathname.startsWith(r)) && !tokenCookie) {
    return NextResponse.redirect(new URL('/sign-in', request.url));
  }

  // 2. Already logged in → don't visit auth pages
  if (publicRoutes.some(r => pathname.startsWith(r)) && tokenCookie) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // 3. Role-based access control
  if (tokenCookie && userRole) {
    if (pathname.startsWith('/admin') && userRole !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    if (pathname.startsWith('/teacher') && userRole !== 'TEACHER' && userRole !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/courses/:path*',
    '/lesson/:path*',
    '/teacher/:path*',
    '/admin/:path*',
    '/sign-in',
    '/sign-up',
  ],
};