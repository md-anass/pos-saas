'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function updatePassword(formData: FormData) {
    const newPassword = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string

    if (!newPassword || !confirmPassword) {
        redirect(
            '/update-password?error=' +
            encodeURIComponent('Please enter and confirm your password.')
        )
    }

    if (newPassword !== confirmPassword) {
        redirect(
            '/update-password?error=' +
            encodeURIComponent('Passwords do not match.')
        )
    }

    if (newPassword.length < 6) {
        redirect(
            '/update-password?error=' +
            encodeURIComponent(
                'Password must be at least 6 characters.'
            )
        )
    }

    const supabase = await createClient()

    // Verify the authenticated recovery/setup user.
    const {
        data: { user },
        error: userError
    } = await supabase.auth.getUser()

    if (userError || !user) {
        console.error(
            'Password update auth error:',
            userError?.message
        )

        redirect(
            '/update-password?error=' +
            encodeURIComponent(
                'Your setup session is invalid or expired. Please generate a new setup link.'
            )
        )
    }

    // Update password for the authenticated user.
    const { error: updateError } =
        await supabase.auth.updateUser({
            password: newPassword
        })

    if (updateError) {
        console.error(
            'Password update failed:',
            updateError.message
        )

        redirect(
            '/update-password?error=' +
            encodeURIComponent(updateError.message)
        )
    }

    revalidatePath('/', 'layout')

    redirect('/dashboard')
}