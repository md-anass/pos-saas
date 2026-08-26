'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { normalizeShopType } from '@/lib/shop-capabilities'

function redirectWithError(message: string): never {
    redirect('/onboarding?error=' + encodeURIComponent(message))
}

export async function createShop(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: existingShop, error: existingShopError } = await supabase
        .from('shops')
        .select('id, name')
        .eq('owner_id', user.id)
        .limit(1)
        .maybeSingle()

    if (existingShopError) {
        redirectWithError(existingShopError.message)
    }

    if (existingShop && existingShop.name !== 'Pending Setup') {
        redirect('/dashboard')
    }

    if (!existingShop) {
        const { data: membership, error: membershipError } = await supabase
            .from('shop_members')
            .select('shop_id')
            .eq('user_id', user.id)
            .limit(1)
            .maybeSingle()

        if (membershipError) {
            redirectWithError(membershipError.message)
        }

        if (membership) {
            redirect('/dashboard')
        }
    }

    const shopType = normalizeShopType(formData.get('shop_type') as string | null)
    const name = String(formData.get('name') || '').trim()
    const currency = 'PKR'

    if (!name) {
        redirectWithError('Shop name is required.')
    }

    const { data: shopId, error: createError } = await supabase.rpc(
        'complete_shop_onboarding',
        {
            p_name: name,
            p_shop_type: shopType,
            p_currency: currency,
        }
    )

    if (createError) {
        redirectWithError(createError.message)
    }

    if (!shopId) {
        redirectWithError('Shop creation completed without returning a shop ID.')
    }

    const { data: shop, error: shopError } = await supabase
        .from('shops')
        .select('id, owner_id, shop_type')
        .eq('id', shopId)
        .maybeSingle()

    if (shopError) {
        redirectWithError(shopError.message)
    }

    if (!shop) {
        redirectWithError('The created shop could not be resolved.')
    }

    const { data: membership, error: membershipError } = await supabase
        .from('shop_members')
        .select('role')
        .eq('shop_id', shop.id)
        .eq('user_id', user.id)
        .maybeSingle()

    if (membershipError) {
        redirectWithError(membershipError.message)
    }

    if (!membership) {
        redirectWithError('Shop membership was not established.')
    }

    if (shop.owner_id === user.id && shop.shop_type !== shopType) {
        redirectWithError('The selected shop type was not persisted.')
    }

    const { count: moduleCount, error: modulesError } = await supabase
        .from('shop_modules')
        .select('id', { count: 'exact', head: true })
        .eq('shop_id', shop.id)
        .eq('enabled', true)

    if (modulesError) {
        redirectWithError(modulesError.message)
    }

    if (!moduleCount) {
        redirectWithError('Shop modules were not initialized.')
    }

    const { data: resolvedShopId, error: resolutionError } = await supabase.rpc(
        'get_user_shop_id'
    )
    if (resolutionError) {
        redirectWithError(resolutionError.message)
    }

    const { data: isMember, error: memberCheckError } = await supabase.rpc(
        'user_is_shop_member',
        { check_shop_id: shop.id }
    )
    if (memberCheckError) {
        redirectWithError(memberCheckError.message)
    }

    if (resolvedShopId !== shop.id || isMember !== true) {
        redirectWithError('The created shop is not available to the current session.')
    }

    revalidatePath('/onboarding')
    revalidatePath('/dashboard', 'layout')
    redirect('/dashboard')
}
