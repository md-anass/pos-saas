'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'

export async function submitContactForm(formData: FormData) {
    const adminClient = await createAdminClient()

    const { error } = await adminClient.from('contact_messages').insert({
        name: formData.get('name'),
        email: formData.get('email'),
        business_type: formData.get('business_type'),
        message: formData.get('message')
    })

    if (error) {
        redirect('/?contact=error')
    }

    redirect('/?contact=success')
}