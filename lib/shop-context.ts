import { createClient } from '@/lib/supabase/server'
import {
    getShopPreset,
    getShopFeatures,
    getShopTerminology,
    normalizeShopType,
    resolveDashboardWidgets,
    resolveEnabledModules,
    resolveNavigation,
    type ShopCapabilities,
    type ShopModule,
    type ShopType,
} from './shop-capabilities'
import { redirect } from 'next/navigation'

type ShopRecord = {
    id: string
    owner_id: string
    name: string
    shop_type?: string | null
    business_type?: string | null
    logo_url?: string | null
    status: string
    subscription_end?: string | null
}

type ShopMemberRecord = {
    shop_id: string
    role: string
    permissions: string[] | null
}

export type CurrentShopContext = {
    shop: ShopRecord
    shopType: ShopType
    userRole: string
    userPermissions: string[]
    capabilities: ShopCapabilities
}

export async function getCurrentShopContext(): Promise<CurrentShopContext> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: ownerShop, error: ownerShopError } = await supabase
        .from('shops')
        .select('id, owner_id, name, shop_type, business_type, status, subscription_end')
        .eq('owner_id', user.id)
        .limit(1)

    if (ownerShopError) {
        throw new Error(`Unable to resolve the current shop: ${ownerShopError.message}`)
    }

    let shop = (ownerShop && ownerShop[0]) as ShopRecord | null
    let userRole = 'owner'
    let userPermissions: string[] = []

    if (!shop) {
        const { data: member, error: memberError } = await supabase
            .from('shop_members')
            .select('shop_id, role, permissions')
            .eq('user_id', user.id)
            .limit(1)
            .maybeSingle()

        if (memberError) {
            throw new Error(`Unable to resolve shop membership: ${memberError.message}`)
        }

        const memberRecord = member as ShopMemberRecord | null
        if (memberRecord) {
            userRole = memberRecord.role
            userPermissions = memberRecord.permissions || []

            const { data: staffShop, error: staffShopError } = await supabase
                .from('shops')
                .select('id, owner_id, name, shop_type, business_type, status, subscription_end')
                .eq('id', memberRecord.shop_id)
                .maybeSingle()

            if (staffShopError) {
                throw new Error(`Unable to resolve the member shop: ${staffShopError.message}`)
            }

            if (staffShop) {
                shop = staffShop as ShopRecord
            }
        }
    }

    if (!shop) {
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('is_platform_admin')
            .eq('id', user.id)
            .maybeSingle()

        if (profileError) {
            throw new Error(`Unable to resolve the user profile: ${profileError.message}`)
        }

        if (profile?.is_platform_admin) {
            redirect('/admin')
        }

        redirect('/onboarding')
    }

    if (shop.status === 'suspended') {
        redirect('/login?error=Your shop is suspended. Please contact admin.')
    }

    const shopType = normalizeShopType(shop.shop_type || shop.business_type || 'retail')
    const preset = getShopPreset(shopType)

    const { data: moduleRows, error: moduleRowsError } = await supabase
        .from('shop_modules')
        .select('module_key, enabled, configuration, updated_at')
        .eq('shop_id', shop.id)
        .order('module_key', { ascending: true })

    if (moduleRowsError) {
        throw new Error(`Unable to resolve shop modules: ${moduleRowsError.message}`)
    }

    const modules = resolveEnabledModules({
        shopType,
        shopModuleRows: moduleRows || [],
        userRole,
        userPermissions,
    })

    const terminology = getShopTerminology(shopType)
    const navigation = resolveNavigation(modules, terminology)
    const dashboardWidgets = resolveDashboardWidgets(shopType, moduleRows || [])
    const features = getShopFeatures(shopType)

    return {
        shop,
        shopType,
        userRole,
        userPermissions,
        capabilities: {
            shopType,
            modules,
            navigation,
            dashboardWidgets,
            terminology,
            features,
            defaultSettings: preset.defaultSettings,
        },
    }
}

export function hasShopModule(capabilities: CurrentShopContext | ShopCapabilities, moduleKey: ShopModule) {
    const modules = 'capabilities' in capabilities
        ? capabilities.capabilities.modules
        : capabilities.modules

    return modules.includes(moduleKey)
}

export function requireShopModule(context: CurrentShopContext | ShopCapabilities, moduleKey: ShopModule) {
    const modules = 'capabilities' in context
        ? context.capabilities.modules
        : context.modules

    if (!modules.includes(moduleKey)) {
        redirect('/dashboard')
    }
}

export function moduleLabel(shopType: string | null | undefined, key: keyof ReturnType<typeof getShopTerminology>) {
    return getShopTerminology(shopType)[key]
}
