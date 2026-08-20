import { createAdminClient } from '@/lib/supabase/admin'
import AdminShopsClient from './AdminShopsClient'

// FIX: Force Next.js to always fetch fresh data so renewals update instantly
export const dynamic = 'force-dynamic'

export default async function AdminShopsPage({ searchParams }: { searchParams: Promise<{ error?: string, success?: string, invite_link?: string }> }) {
    const adminClient = await createAdminClient()
    const params = await searchParams

    const { data: shops } = await adminClient
        .from('shops')
        .select('id, name, owner_id, status, subscription_start, subscription_end')
        .order('created_at', { ascending: false })

    const { data: usersData } = await adminClient.auth.admin.listUsers()
    const users = usersData?.users || []

    const mergedShops = shops?.map(shop => {
        const user = users.find(u => u.id === shop.owner_id)
        return {
            ...shop,
            profiles: user ? { email: user.email } : null
        }
    }) || []

    return (
        <AdminShopsClient
            shops={mergedShops as any}
            initialSuccess={params.success}
            initialError={params.error}
            inviteLink={params.invite_link ? decodeURIComponent(params.invite_link) : undefined}
        />
    )
}