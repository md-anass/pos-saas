'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// 1. Invite a new Shop Owner by Email
export async function inviteShopOwner(formData: FormData) {
    const email = formData.get('email') as string
    const adminClient = await createAdminClient()

    // Create user and send them an email to set their password
    const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/update-password`
    })

    if (error) {
        redirect('/admin/shops?error=' + encodeURIComponent(error.message))
    }

    // Create an empty suspended shop for them to fill out later
    const { error: shopError } = await adminClient
        .from('shops')
        .insert({
            owner_id: data.user.id,
            name: 'Pending Setup',
            business_type: 'other',
            status: 'suspended' // Suspended until they finish onboarding
        })

    if (shopError) {
        redirect('/admin/shops?error=' + encodeURIComponent(shopError.message))
    }

    revalidatePath('/admin/shops')
    redirect('/admin/shops')
}

// 2. Suspend a Shop
export async function suspendShop(formData: FormData) {
    const shopId = formData.get('shop_id') as string
    const supabase = await createClient()

    const { error } = await supabase
        .from('shops')
        .update({ status: 'suspended' })
        .eq('id', shopId)

    if (error) {
        redirect('/admin/shops?error=' + encodeURIComponent(error.message))
    }

    revalidatePath('/admin/shops')
    redirect('/admin/shops')
}

// 3. Activate a Shop
export async function activateShop(formData: FormData) {
    const shopId = formData.get('shop_id') as string
    const supabase = await createClient()

    const { error } = await supabase
        .from('shops')
        .update({ status: 'active' })
        .eq('id', shopId)

    if (error) {
        redirect('/admin/shops?error=' + encodeURIComponent(error.message))
    }

    revalidatePath('/admin/shops')
    redirect('/admin/shops')
}

// 4. Delete a Shop & Remove Access
export async function deleteShop(formData: FormData) {
    const shopId = formData.get('shop_id') as string
    const ownerId = formData.get('owner_id') as string
    const adminClient = await createAdminClient()

    // Delete the shop ( cascades to products, sales, etc. )
    const { error: dbError } = await adminClient
        .from('shops')
        .delete()
        .eq('id', shopId)

    if (dbError) {
        redirect('/admin/shops?error=' + encodeURIComponent(dbError.message))
    }

    // Delete the user's auth account entirely
    const { error: authError } = await adminClient.auth.admin.deleteUser(ownerId)

    if (authError) {
        redirect('/admin/shops?error=' + encodeURIComponent(authError.message))
    }

    revalidatePath('/admin/shops')
    redirect('/admin/shops')
}