import { NextRequest, NextResponse } from 'next/server';

const publicRoutes = ['/', '/sign-in', '/sign-up', '/verify', '/forgot-password', '/reset-password'];

function getRoleFromToken(token: string): string | null {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
    return payload.role ?? null;
  } catch {
    return null;
  }
}

function homeFor(role: string): string {
  if (role === 'SUPER_ADMIN') return '/super/dashboard';
  if (role === 'ADMIN') return '/admin/dashboard';
  if (role === 'TEACHER') return '/teacher/dashboard';
  return '/student/dashboard';
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('token')?.value;

  const legacy: Record<string, string> = {
    '/dashboard': '/student/dashboard',
    '/courses': '/student/courses',
    '/lesson': '/student/lesson',
  };
  if (legacy[pathname]) {
    const url = request.nextUrl.clone();
    url.pathname = legacy[pathname];
    return NextResponse.redirect(url);
  }

  const isPublic = publicRoutes.includes(pathname);

  if (!token) {
    if (isPublic) return NextResponse.next();
    const url = request.nextUrl.clone();
    url.pathname = '/sign-in';
    return NextResponse.redirect(url);
  }

  const role = getRoleFromToken(token);

  if (isPublic && pathname !== '/' && role) {
    const url = request.nextUrl.clone();
    url.pathname = homeFor(role);
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith('/super') && role !== 'SUPER_ADMIN') {
    const url = request.nextUrl.clone();
    url.pathname = role ? homeFor(role) : '/sign-in';
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith('/admin') && role !== 'ADMIN') {
    const url = request.nextUrl.clone();
    url.pathname = role ? homeFor(role) : '/sign-in';
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith('/teacher') && role !== 'TEACHER' && role !== 'ADMIN') {
    const url = request.nextUrl.clone();
    url.pathname = role ? homeFor(role) : '/sign-in';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};