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

    // 1. Check if user already exists to prevent duplicate emails
    const { data: existingUsers } = await adminClient.auth.admin.listUsers()
    const userExists = existingUsers?.users.find(u => u.email === email)

    if (userExists) {
        redirect(`/admin/shops?error=${encodeURIComponent('This email is already registered. Use the Renew button or delete the user first.')}`)
    }

    // 2. Send the invite
    const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/update-password`
    })

    if (error) {
        redirect(`/admin/shops?error=${encodeURIComponent(error.message)}`)
    }

    // 3. Create their shop record with dates
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
    const newStartDate = formData.get('new_start_date') as string
    const newEndDate = formData.get('new_end_date') as string
    const supabase = await createClient()

    const updateData: any = {
        subscription_end: newEndDate,
        status: 'active'
    }

    // If admin provided a start date, update it too (fixes N/A issue for old shops)
    if (newStartDate) {
        updateData.subscription_start = newStartDate
    }

    const { error } = await supabase
        .from('shops')
        .update(updateData)
        .eq('id', shopId)

    if (error) {
        redirect(`/admin/shops?error=${encodeURIComponent(error.message)}`)
    }

    revalidatePath('/admin/shops')
    redirect('/admin/shops?success=Subscription renewed successfully!')
}

// 3. Delete a Shop & Remove Access (Wipes ALL data and Staff Accounts)
export async function deleteShop(formData: FormData) {
    const shopId = formData.get('shop_id') as string
    const ownerId = formData.get('owner_id') as string
    const adminClient = await createAdminClient()

    // 1. Fetch ALL staff members for this shop (so we can delete their auth accounts too)
    const { data: staffMembers } = await adminClient
        .from('shop_members')
        .select('user_id')
        .eq('shop_id', shopId)

    const staffUserIds = staffMembers?.map(m => m.user_id) || []

    // 2. Delete the Shop from the database
    // This triggers ON DELETE CASCADE, which instantly wipes ALL related data 
    // (products, sales, expenses, customers, suppliers, payments, etc.)
    const { error: dbError } = await adminClient
        .from('shops')
        .delete()
        .eq('id', shopId)

    if (dbError) {
        redirect(`/admin/shops?error=${encodeURIComponent(dbError.message)}`)
    }

    // 3. Delete the Owner's Auth Account
    const { error: ownerAuthError } = await adminClient.auth.admin.deleteUser(ownerId)
    if (ownerAuthError) {
        console.error('Failed to delete owner auth account:', ownerAuthError.message)
    }

    // 4. Delete ALL Staff Auth Accounts
    for (const userId of staffUserIds) {
        if (userId !== ownerId) { // Don't try to delete owner twice
            const { error: staffAuthError } = await adminClient.auth.admin.deleteUser(userId)
            if (staffAuthError) {
                console.error(`Failed to delete staff auth account (${userId}):`, staffAuthError.message)
            }
        }
    }

    revalidatePath('/admin/shops')
    redirect('/admin/shops?success=Shop, all related data, and staff accounts deleted successfully!')
}