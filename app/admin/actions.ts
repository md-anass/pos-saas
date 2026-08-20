'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// 1. Invite a new Shop Owner by Email + Subscription Dates
export async function inviteShopOwner(formData: FormData) {
    const email = formData.get('email') as string
    const startDate = formData.get('subscription_start') as string
    const endDate = formData.get('subscription_end') as string
    const adminClient = await createAdminClient()

    const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/update-password`
    })

    if (error) {
        redirect(`/admin/shops?error=${encodeURIComponent(error.message)}`)
    }

    const { error: shopError } = await adminClient
        .from('shops')
        .insert({
            owner_id: data.user.id,
            name: 'Pending Setup',
            business_type: 'other',
            status: 'active',
            subscription_start: startDate,
            subscription_end: endDate
        })

    if (shopError) {
        redirect(`/admin/shops?error=${encodeURIComponent(shopError.message)}`)
    }

    revalidatePath('/admin/shops')
    redirect('/admin/shops?success=Shop added and invite email sent successfully!')
}

// 2. Renew Subscription
export async function renewSubscription(formData: FormData) {
    const shopId = formData.get('shop_id') as string
    const newEndDate = formData.get('new_end_date') as string
    const supabase = await createClient()

    const { error } = await supabase
        .from('shops')
        .update({
            subscription_end: newEndDate,
            status: 'active'
        })
        .eq('id', shopId)

    if (error) {
        redirect(`/admin/shops?error=${encodeURIComponent(error.message)}`)
    }

    revalidatePath('/admin/shops')
    redirect('/admin/shops?success=Subscription renewed successfully!')
}

// 3. Delete a Shop & Remove Access
export async function deleteShop(formData: FormData) {
    const shopId = formData.get('shop_id') as string
    const ownerId = formData.get('owner_id') as string
    const adminClient = await createAdminClient()

    const { error: dbError } = await adminClient
        .from('shops')
        .delete()
        .eq('id', shopId)

    if (dbError) {
        redirect(`/admin/shops?error=${encodeURIComponent(dbError.message)}`)
    }

    const { error: authError } = await adminClient.auth.admin.deleteUser(ownerId)

    if (authError) {
        redirect(`/admin/shops?error=${encodeURIComponent(authError.message)}`)
    }

    revalidatePath('/admin/shops')
    redirect('/admin/shops?success=Shop deleted successfully!')
}