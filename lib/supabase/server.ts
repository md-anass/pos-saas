import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
    const cookieStore = await cookies()

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch {
                        // The `setAll` method was called from a Server Component.
                    }
                },
            },
        }
    )
}

// SECURE AUTH HELPER: Gets shop_id from backend session (Works for Owners AND Staff)
export async function getShopId() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    // 1. Check if user is an owner
    const { data: shop } = await supabase.from('shops').select('id').eq('owner_id', user.id).single()
    if (shop) return shop.id

    // 2. Check if user is a staff member
    const { data: member } = await supabase.from('shop_members').select('shop_id').eq('user_id', user.id).single()
    return member?.shop_id || null
}

// SECURE AUDIT TRAIL HELPER: Logs actions to the database
export async function logAction({
    shopId,
    action,
    entityType,
    entityId,
    oldValue,
    newValue
}: {
    shopId: string
    action: string
    entityType: string
    entityId?: string
    oldValue?: unknown
    newValue?: unknown
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('audit_logs').insert({
        shop_id: shopId,
        user_id: user.id,
        action,
        entity_type: entityType,
        entity_id: entityId || null,
        old_value: oldValue || null,
        new_value: newValue || null
    })
}
// RATE LIMITER HELPER: Protects against API abuse (e.g., AI, File Uploads)
export async function checkRateLimit(endpoint: string, limit: number = 10, windowMinutes: number = 1) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { allowed: false, error: 'Not authenticated' }

    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString()

    // Count requests in the current time window
    const { count } = await supabase
        .from('rate_limits')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('endpoint', endpoint)
        .gte('created_at', windowStart)

    if (count && count >= limit) {
        return { allowed: false, error: `Rate limit exceeded. Max ${limit} requests per ${windowMinutes} minute(s).` }
    }

    // Log the current request
    await supabase.from('rate_limits').insert({
        user_id: user.id,
        endpoint: endpoint
    })

    return { allowed: true, error: null }
}
