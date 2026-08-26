'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function updateShopProfile(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    // STRICT OWNER CHECK: Must be owner to update shop profile
    const { data: shop } = await supabase.from('shops').select('id').eq('owner_id', user.id).single()
    if (!shop) {
        redirect('/dashboard?error=Unauthorized: Only owners can change settings')
    }

    const shopData: Record<string, string> = {
        name: formData.get('name') as string,
        subtitle: formData.get('subtitle') as string,
        address: formData.get('address') as string,
        invoice_note: formData.get('invoice_note') as string,
        phone: formData.get('phone') as string,
        email: formData.get('email') as string,
        currency: 'PKR',
    }

    // Handle Logo Upload
    const logoFile = formData.get('logo') as File
    if (logoFile && logoFile.size > 0) {
        const fileExt = logoFile.name.split('.').pop()
        const fileName = `${shop.id}-${Date.now()}.${fileExt}`
        const { error: uploadError } = await supabase.storage.from('shop-logos').upload(fileName, logoFile)
        if (uploadError) redirect('/dashboard/settings?error=' + encodeURIComponent(uploadError.message))
        const { data: publicUrlData } = supabase.storage.from('shop-logos').getPublicUrl(fileName)
        if (publicUrlData) shopData.logo_url = publicUrlData.publicUrl
    }

    const { error } = await supabase.from('shops').update(shopData).eq('id', shop.id)
    if (error) redirect('/dashboard/settings?error=' + encodeURIComponent(error.message))

    revalidatePath('/dashboard/settings')
    redirect('/dashboard/settings')
}

export async function addAccount(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    // STRICT OWNER CHECK: Must be owner to add financial accounts
    const { data: shop } = await supabase.from('shops').select('id').eq('owner_id', user.id).single()
    if (!shop) {
        redirect('/dashboard?error=Unauthorized: Only owners can add accounts')
    }

    const accountData = {
        shop_id: shop.id,
        name: formData.get('name') as string,
        type: formData.get('type') as string,
        provider_name: formData.get('provider_name') as string || null,
        account_number: formData.get('account_number') as string || null,
        balance: 0, // Initial balance removed as requested, defaulting to 0
    }

    const { error } = await supabase.from('accounts').insert(accountData)
    if (error) redirect('/dashboard/settings?error=' + encodeURIComponent(error.message))

    revalidatePath('/dashboard/settings')
    redirect('/dashboard/settings')
}

export async function addLocation(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    // STRICT OWNER CHECK: Must be owner to add locations
    const { data: shop } = await supabase.from('shops').select('id').eq('owner_id', user.id).single()
    if (!shop) {
        redirect('/dashboard?error=Unauthorized: Only owners can add locations')
    }

    const locationData = {
        shop_id: shop.id,
        name: formData.get('name') as string,
        type: formData.get('type') as string,
    }

    const { error } = await supabase.from('locations').insert(locationData)
    if (error) redirect('/dashboard/settings?error=' + encodeURIComponent(error.message))

    revalidatePath('/dashboard/settings')
    redirect('/dashboard/settings')
}

export async function addStaff(formData: FormData) {
    const supabase = await createClient()
    const adminClient = await createAdminClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    // STRICT OWNER CHECK: Must be owner to add staff
    const { data: shop } = await supabase.from('shops').select('id').eq('owner_id', user.id).single()
    if (!shop) {
        redirect('/dashboard/settings?error=Unauthorized: Only owners can add staff')
    }

    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const fullName = formData.get('full_name') as string
    const role = formData.get('role') as string

    // Get permissions from FormData (checkboxes return 'on' or null)
    const modules = ['pos', 'sales', 'products', 'categories', 'inventory', 'medicine_batches', 'medicine_expiry', 'prescriptions', 'purchases', 'suppliers', 'customers', 'contacts', 'expenses', 'reports', 'menu', 'restaurant_tables', 'restaurant_orders', 'settings']
    const permissions = modules.filter(m => formData.get(`perm_${m}`) === 'on')

    // 1. Create the Auth User securely using Admin Client
    const { data: newUserData, error: authError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName }
    })

    if (authError) {
        redirect('/dashboard/settings?error=' + encodeURIComponent(authError.message))
    }

    // 2. Link them to the Owner's shop with the selected role and permissions
    const { error: memberError } = await supabase.from('shop_members').insert({
        shop_id: shop.id,
        user_id: newUserData.user.id,
        role: role,
        permissions: permissions // Save JSON array of permissions
    })

    if (memberError) {
        redirect('/dashboard/settings?error=' + encodeURIComponent(memberError.message))
    }

    revalidatePath('/dashboard/settings')
    redirect('/dashboard/settings')
}

export async function deleteStaff(formData: FormData) {
    const supabase = await createClient()
    const adminClient = await createAdminClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    // STRICT OWNER CHECK: Must be owner to delete staff
    const { data: shop } = await supabase.from('shops').select('id').eq('owner_id', user.id).single()
    if (!shop) {
        redirect('/dashboard/settings?error=Unauthorized: Only owners can delete staff')
    }

    const staffId = formData.get('staff_id') as string
    const userId = formData.get('user_id') as string

    // 1. Remove them from the shop_members table (Ensuring they belong to THIS shop)
    const { error: dbError } = await supabase
        .from('shop_members')
        .delete()
        .eq('id', staffId)
        .eq('shop_id', shop.id) // Extra backend security check!

    if (dbError) {
        redirect('/dashboard/settings?error=' + encodeURIComponent(dbError.message))
    }

    // 2. Delete their auth account entirely so they can't log in anymore
    const { error: authError } = await adminClient.auth.admin.deleteUser(userId)

    if (authError) {
        redirect('/dashboard/settings?error=' + encodeURIComponent(authError.message))
    }

    revalidatePath('/dashboard/settings')
    redirect('/dashboard/settings')
}
