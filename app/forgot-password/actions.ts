'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'

const MAX_RESET_REQUESTS = 2
const RESET_WINDOW_HOURS = 2

export async function requestPasswordReset(formData: FormData) {
    const emailValue = formData.get('email')

    if (!emailValue || typeof emailValue !== 'string') {
        redirect(
            '/forgot-password?error=' +
            encodeURIComponent('Please enter a valid email address.')
        )
    }

    const email = emailValue.trim().toLowerCase()

    if (!email) {
        redirect(
            '/forgot-password?error=' +
            encodeURIComponent('Please enter a valid email address.')
        )
    }

    const supabase = await createClient()

    // Use admin client only for our internal rate-limit table.
    // Never expose this client/service-role key to the browser.
    const adminClient = await createAdminClient()

    // ---------------------------------------------------------
    // 1. Calculate beginning of rolling 2-hour window
    // ---------------------------------------------------------

    const windowStart = new Date(
        Date.now() -
        RESET_WINDOW_HOURS * 60 * 60 * 1000
    ).toISOString()

    // ---------------------------------------------------------
    // 2. Count successful reset requests in last 2 hours
    // ---------------------------------------------------------

    const { count, error: countError } = await adminClient
        .from('password_reset_attempts')
        .select('id', {
            count: 'exact',
            head: true,
        })
        .eq('email', email)
        .gte('created_at', windowStart)

    if (countError) {
        console.error(
            'Failed to check password reset limit:',
            countError.message
        )

        redirect(
            '/forgot-password?error=' +
            encodeURIComponent(
                'Unable to process your request. Please try again.'
            )
        )
    }

    // ---------------------------------------------------------
    // 3. Block after 2 requests within rolling 2 hours
    // ---------------------------------------------------------

    if ((count ?? 0) >= MAX_RESET_REQUESTS) {
        redirect(
            '/forgot-password?error=' +
            encodeURIComponent(
                'Password reset limit reached. You can request a maximum of 2 reset links within 2 hours. Please try again later.'
            )
        )
    }

    // ---------------------------------------------------------
    // 4. Ask Supabase to send password recovery email
    // ---------------------------------------------------------

    const { error } =
        await supabase.auth.resetPasswordForEmail(email, {
            redirectTo:
                `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/update-password`,
        })

    if (error) {
        console.error(
            'Supabase password reset error:',
            error.message
        )

        redirect(
            '/forgot-password?error=' +
            encodeURIComponent(error.message)
        )
    }

    // ---------------------------------------------------------
    // 5. Record only successful requests
    // ---------------------------------------------------------

    const { error: insertError } = await adminClient
        .from('password_reset_attempts')
        .insert({
            email,
        })

    if (insertError) {
        console.error(
            'Failed to record password reset attempt:',
            insertError.message
        )
    }

    // ---------------------------------------------------------
    // 6. Success
    // ---------------------------------------------------------

    redirect('/forgot-password?success=true')
}