'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// ============================================================
// 1. Invite a NEW Shop Owner
// ============================================================

export async function inviteShopOwner(formData: FormData) {
    const email = (formData.get('email') as string)?.trim()
    const startDate = formData.get('subscription_start') as string
    const endDate = formData.get('subscription_end') as string

    if (!email || !startDate || !endDate) {
        redirect(
            `/admin/shops?error=${encodeURIComponent(
                'Email, start date, and end date are required.'
            )}`
        )
    }

    const adminClient = await createAdminClient()

    // --------------------------------------------------------
    // Check if user already exists
    // --------------------------------------------------------

    const { data: existingUsers, error: usersError } =
        await adminClient.auth.admin.listUsers()

    if (usersError) {
        redirect(
            `/admin/shops?error=${encodeURIComponent(usersError.message)}`
        )
    }

    const userExists = existingUsers?.users.find(
        (user) => user.email?.toLowerCase() === email.toLowerCase()
    )

    if (userExists) {
        redirect(
            `/admin/shops?error=${encodeURIComponent(
                'This email is already registered. If the shop is still pending, use the Share Setup Link button instead.'
            )}`
        )
    }

    // --------------------------------------------------------
    // Generate secure invite link
    // --------------------------------------------------------

    const { data, error } =
        await adminClient.auth.admin.generateLink({
            type: 'invite',
            email,
            options: {
                redirectTo:
                    `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/update-password`
            }
        })

    if (error) {
        redirect(
            `/admin/shops?error=${encodeURIComponent(error.message)}`
        )
    }

    if (!data?.user?.id) {
        redirect(
            `/admin/shops?error=${encodeURIComponent(
                'User account could not be created.'
            )}`
        )
    }

    const inviteLink = data.properties?.action_link

    if (!inviteLink) {
        // Clean up the generated auth user if no usable link was created.
        await adminClient.auth.admin.deleteUser(data.user.id)

        redirect(
            `/admin/shops?error=${encodeURIComponent(
                'Invite link could not be generated.'
            )}`
        )
    }

    // --------------------------------------------------------
    // Create shop as Pending Setup
    // --------------------------------------------------------

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
        // Avoid leaving an orphan Auth account behind.
        await adminClient.auth.admin.deleteUser(data.user.id)

        redirect(
            `/admin/shops?error=${encodeURIComponent(shopError.message)}`
        )
    }

    revalidatePath('/admin')
    revalidatePath('/admin/shops')

    redirect(
        `/admin/shops?success=${encodeURIComponent(
            'Shop created successfully. Send the secure setup link to the customer.'
        )}&invite_link=${encodeURIComponent(inviteLink)}&owner_id=${encodeURIComponent(data.user.id)}`
    )
}

// ============================================================
// 2. Generate fresh setup link for an EXISTING pending owner
// ============================================================

export async function generateSetupLink(formData: FormData) {
    const ownerId = formData.get('owner_id') as string

    if (!ownerId) {
        redirect(
            `/admin/shops?error=${encodeURIComponent(
                'Shop owner ID is missing.'
            )}`
        )
    }

    const adminClient = await createAdminClient()

    // --------------------------------------------------------
    // Make sure this owner still belongs to a Pending Setup shop
    // --------------------------------------------------------

    const { data: shop, error: shopError } = await adminClient
        .from('shops')
        .select('id, name, owner_id')
        .eq('owner_id', ownerId)
        .maybeSingle()

    if (shopError) {
        redirect(
            `/admin/shops?error=${encodeURIComponent(shopError.message)}`
        )
    }

    if (!shop) {
        redirect(
            `/admin/shops?error=${encodeURIComponent(
                'Shop could not be found.'
            )}`
        )
    }

    if (shop.name !== 'Pending Setup') {
        redirect(
            `/admin/shops?error=${encodeURIComponent(
                'This shop has already completed setup.'
            )}`
        )
    }

    // --------------------------------------------------------
    // Get existing Auth user
    // --------------------------------------------------------

    const { data: userData, error: userError } =
        await adminClient.auth.admin.getUserById(ownerId)

    if (userError || !userData?.user) {
        redirect(
            `/admin/shops?error=${encodeURIComponent(
                userError?.message || 'Shop owner could not be found.'
            )}`
        )
    }

    const email = userData.user.email

    if (!email) {
        redirect(
            `/admin/shops?error=${encodeURIComponent(
                'Shop owner does not have an email address.'
            )}`
        )
    }

    // --------------------------------------------------------
    // Existing Auth user:
    // generate a fresh recovery/setup password link
    // --------------------------------------------------------

    const { data, error } =
        await adminClient.auth.admin.generateLink({
            type: 'recovery',
            email,
            options: {
                redirectTo:
                    `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/update-password`
            }
        })

    if (error) {
        redirect(
            `/admin/shops?error=${encodeURIComponent(error.message)}`
        )
    }

    const setupLink = data.properties?.action_link

    if (!setupLink) {
        redirect(
            `/admin/shops?error=${encodeURIComponent(
                'Could not generate a fresh setup link.'
            )}`
        )
    }

    redirect(
        `/admin/shops?success=${encodeURIComponent(
            'Fresh setup link generated. You can now copy or share it with the customer.'
        )}&invite_link=${encodeURIComponent(setupLink)}&owner_id=${encodeURIComponent(ownerId)}`
    )
}

// ============================================================
// 3. Renew Subscription
// ============================================================

export async function renewSubscription(formData: FormData) {
    const shopId = formData.get('shop_id') as string
    const newStartDate = formData.get('new_start_date') as string
    const newEndDate = formData.get('new_end_date') as string

    if (!shopId || !newEndDate) {
        redirect(
            `/admin/shops?error=${encodeURIComponent(
                'Shop and expiry date are required.'
            )}`
        )
    }

    const supabase = await createClient()

    const updateData: {
        subscription_end: string
        subscription_start?: string
        status: string
    } = {
        subscription_end: newEndDate,
        status: 'active'
    }

    if (newStartDate) {
        updateData.subscription_start = newStartDate
    }

    const { error } = await supabase
        .from('shops')
        .update(updateData)
        .eq('id', shopId)

    if (error) {
        redirect(
            `/admin/shops?error=${encodeURIComponent(error.message)}`
        )
    }

    revalidatePath('/admin')
    revalidatePath('/admin/shops')

    redirect(
        `/admin/shops?success=${encodeURIComponent(
            'Subscription renewed successfully.'
        )}`
    )
}

// ============================================================
// 4. Delete Shop + Owner + Staff Auth Accounts
// ============================================================

export async function deleteShop(formData: FormData) {
    const shopId = formData.get('shop_id') as string
    const ownerId = formData.get('owner_id') as string

    if (!shopId || !ownerId) {
        redirect(
            `/admin/shops?error=${encodeURIComponent(
                'Shop ID or owner ID is missing.'
            )}`
        )
    }

    const adminClient = await createAdminClient()

    // --------------------------------------------------------
    // Fetch staff accounts first
    // --------------------------------------------------------

    const { data: staffMembers, error: staffError } =
        await adminClient
            .from('shop_members')
            .select('user_id')
            .eq('shop_id', shopId)

    if (staffError) {
        redirect(
            `/admin/shops?error=${encodeURIComponent(staffError.message)}`
        )
    }

    const staffUserIds =
        staffMembers?.map((member) => member.user_id) || []

    // --------------------------------------------------------
    // Delete shop
    // Database cascades remove related shop data
    // --------------------------------------------------------

    const { error: dbError } = await adminClient
        .from('shops')
        .delete()
        .eq('id', shopId)

    if (dbError) {
        redirect(
            `/admin/shops?error=${encodeURIComponent(dbError.message)}`
        )
    }

    // --------------------------------------------------------
    // Delete owner Auth account
    // --------------------------------------------------------

    const { error: ownerAuthError } =
        await adminClient.auth.admin.deleteUser(ownerId)

    if (ownerAuthError) {
        console.error(
            'Failed to delete owner auth account:',
            ownerAuthError.message
        )
    }

    // --------------------------------------------------------
    // Delete staff Auth accounts
    // --------------------------------------------------------

    for (const userId of staffUserIds) {
        if (userId === ownerId) {
            continue
        }

        const { error: staffAuthError } =
            await adminClient.auth.admin.deleteUser(userId)

        if (staffAuthError) {
            console.error(
                `Failed to delete staff auth account (${userId}):`,
                staffAuthError.message
            )
        }
    }

    revalidatePath('/admin')
    revalidatePath('/admin/shops')

    redirect(
        `/admin/shops?success=${encodeURIComponent(
            'Shop, related data, and staff accounts deleted successfully.'
        )}`
    )
}