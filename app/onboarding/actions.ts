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

    // Check if user already has a shop
    const { data: existingShop } = await supabase
        .from('shops')
        .select('id')
        .eq('owner_id', user.id)
        .single()

    if (existingShop) {
        redirect('/dashboard')
    }

    // Admin invited users already have a 'Pending Setup' shop. Let's update it.
    const { data: pendingShop } = await supabase
        .from('shops')
        .select('id')
        .eq('owner_id', user.id)
        .eq('name', 'Pending Setup')
        .single()

    const shopData = {
        owner_id: user.id,
        name: formData.get('name') as string,
        business_type: formData.get('business_type') as string,
        currency: formData.get('currency') as string,
        status: 'active' // Ensure they are active once setup is complete
    }

    if (pendingShop) {
        const { error } = await supabase
            .from('shops')
            .update(shopData)
            .eq('id', pendingShop.id)

        if (error) {
            redirect('/onboarding?error=' + encodeURIComponent(error.message))
        }
    } else {
        const { error } = await supabase
            .from('shops')
            .insert(shopData)

        if (error) {
            redirect('/onboarding?error=' + encodeURIComponent(error.message))
        }
    }

    revalidatePath('/dashboard')
    redirect('/dashboard')
}