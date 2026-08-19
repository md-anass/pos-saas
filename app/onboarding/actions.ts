'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createShop(formData: FormData) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        redirect('/login')
    }

    const shopData = {
        owner_id: user.id,
        name: formData.get('name') as string,
        business_type: formData.get('business_type') as string,
        currency: formData.get('currency') as string,
    }

    const { error } = await supabase.from('shops').insert(shopData)

    if (error) {
        redirect('/onboarding?error=' + encodeURIComponent(error.message))
    }

    revalidatePath('/')
    redirect('/dashboard')
}