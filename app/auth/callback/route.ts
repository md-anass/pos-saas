import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const requestUrl = new URL(request.url)

    const code = requestUrl.searchParams.get('code')
    const flowId = requestUrl.searchParams.get('sb_flow_id')
    const next =
        requestUrl.searchParams.get('next') || '/update-password'

    if (!code) {
        const errorUrl = new URL(
            '/update-password',
            requestUrl.origin
        )

        errorUrl.searchParams.set(
            'error',
            'Invalid or expired setup link. Please generate a new link.'
        )

        const response = NextResponse.redirect(errorUrl)
        response.headers.set('Cache-Control', 'private, no-store')

        return response
    }

    const supabase = await createClient()

    const { data, error } =
        await supabase.auth.exchangeCodeForSession(
            code,
            flowId ? { flowId } : undefined
        )

    if (error || !data.session) {
        console.error(
            'exchangeCodeForSession failed:',
            error?.message
        )

        const errorUrl = new URL(
            '/update-password',
            requestUrl.origin
        )

        errorUrl.searchParams.set(
            'error',
            'Session expired or invalid. Please generate a new setup link.'
        )

        const response = NextResponse.redirect(errorUrl)
        response.headers.set('Cache-Control', 'private, no-store')

        return response
    }

    const safeNext =
        next.startsWith('/') && !next.startsWith('//')
            ? next
            : '/update-password'

    const response = NextResponse.redirect(
        new URL(safeNext, requestUrl.origin)
    )

    response.headers.set('Cache-Control', 'private, no-store')

    return response
}