import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const next = requestUrl.searchParams.get('next') || '/' // Check for a redirect path

    if (code) {
        const supabase = await createClient()
        // This exchanges the code for a session and saves it in the cookies
        await supabase.auth.exchangeCodeForSession(code)
    }

    // Redirect to the 'next' path (which will be /update-password)
    return NextResponse.redirect(`${requestUrl.origin}${next}`)
}