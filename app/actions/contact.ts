'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'

export async function submitContactForm(formData: FormData) {
    const adminClient = await createAdminClient()

    const name = formData.get('name') as string
    const email = formData.get('email') as string
    const businessType = formData.get('business_type') as string
    const message = formData.get('message') as string

    // 1. Save to Database (Backup)
    await adminClient.from('contact_messages').insert({
        name, email, business_type: businessType, message
    })

    // 2. Redirect to WhatsApp with pre-filled message
    const whatsappText = `*New Lead from KarobarX Website*%0A%0A*Name:* ${name}%0A*Email:* ${email}%0A*Business:* ${businessType}%0A%0A*Message:*%0A${message}`
    redirect(`https://wa.me/923167456949?text=${whatsappText}`)
}