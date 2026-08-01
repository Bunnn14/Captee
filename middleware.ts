import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') || '';
  const isVercelPreviewHost = host.includes('vercel.app') && !host.includes('captee.vercel.app');

  if (isVercelPreviewHost) {
    const url = request.nextUrl.clone();
    url.protocol = 'https';
    url.host = 'captee.vercel.app';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}
