import { type EmailOtpType } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
    const tokenHash = request.nextUrl.searchParams.get('token_hash')

    const type = request.nextUrl.searchParams.get(
        'type'
    ) as EmailOtpType | null

    const next =
        request.nextUrl.searchParams.get('next') ||
        '/update-password'

    const safeNext =
        next.startsWith('/') && !next.startsWith('//')
            ? next
            : '/update-password'

    const redirectTo = request.nextUrl.clone()

    redirectTo.pathname = safeNext
    redirectTo.searchParams.delete('token_hash')
    redirectTo.searchParams.delete('type')
    redirectTo.searchParams.delete('next')

    if (tokenHash && type) {
        const supabase = await createClient()

        const { data, error } =
            await supabase.auth.verifyOtp({
                token_hash: tokenHash,
                type
            })

        if (!error && data.session) {
            const response =
                NextResponse.redirect(redirectTo)

            response.headers.set(
                'Cache-Control',
                'private, no-store'
            )

            return response
        }

        console.error(
            'verifyOtp failed:',
            error?.message
        )
    }

    const errorUrl = request.nextUrl.clone()

    errorUrl.pathname = '/update-password'
    errorUrl.search = ''

    errorUrl.searchParams.set(
        'error',
        'Setup link is invalid or expired. Please ask the administrator for a new link.'
    )

    return NextResponse.redirect(errorUrl)
}