'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function updatePassword(formData: FormData) {
    const supabase = await createClient()

    // Explicitly get the session first to ensure cookies are read
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
        redirect('/update-password?error=Session expired. Please click the email link again.')
    }

    const newPassword = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string

    if (newPassword !== confirmPassword) {
        redirect('/update-password?error=Passwords do not match')
    }

    if (newPassword.length < 6) {
        redirect('/update-password?error=Password must be at least 6 characters')
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword })

    if (error) {
        redirect('/update-password?error=' + encodeURIComponent(error.message))
    }

    redirect('/dashboard')
}