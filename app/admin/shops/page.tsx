import { createAdminClient } from '@/lib/supabase/admin'
import AdminShopsClient from './AdminShopsClient'

export default async function AdminShopsPage({ searchParams }: { searchParams: Promise<{ error?: string, success?: string }> }) {
    const adminClient = await createAdminClient()
    const params = await searchParams

    // 1. Fetch ALL shops (Admin client bypasses RLS)
    const { data: shops } = await adminClient
        .from('shops')
        .select('id, name, owner_id, status, subscription_start, subscription_end')
        .order('created_at', { ascending: false })

    // 2. Fetch ALL users to get their emails (Admin client can read auth.users)
    const { data: usersData } = await adminClient.auth.admin.listUsers()
    const users = usersData?.users || []

    // 3. Merge shops with user emails
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
        />
    )
}