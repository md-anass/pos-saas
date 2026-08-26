import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  request.cookies.set('lang', 'en')
  const response = await updateSession(request)
  response.cookies.set('lang', 'en', { path: '/', sameSite: 'lax' })
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - auth (Supabase auth callback - we will add this later)
     */
    '/((?!_next/static|_next/image|favicon.ico|auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}