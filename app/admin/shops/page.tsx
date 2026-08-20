import { createAdminClient } from '@/lib/supabase/admin'
import AdminShopsClient from './AdminShopsClient'

export const dynamic = 'force-dynamic'

type SearchParams = {
    error?: string
    success?: string
    invite_link?: string
    owner_id?: string
}

export default async function AdminShopsPage({
    searchParams
}: {
    searchParams: Promise<SearchParams>
}) {
    const adminClient = await createAdminClient()
    const params = await searchParams

    // --------------------------------------------------------
    // Fetch shops
    // --------------------------------------------------------

    const { data: shops, error: shopsError } =
        await adminClient
            .from('shops')
            .select(
                'id, name, owner_id, status, subscription_start, subscription_end'
            )
            .order('created_at', { ascending: false })

    // --------------------------------------------------------
    // Fetch Auth users so we can display owner emails
    // --------------------------------------------------------

    const { data: usersData } =
        await adminClient.auth.admin.listUsers()

    const users = usersData?.users || []

    const mergedShops =
        shops?.map((shop) => {
            const user = users.find(
                (user) => user.id === shop.owner_id
            )

            return {
                ...shop,
                profiles: user?.email
                    ? {
                        email: user.email
                    }
                    : null
            }
        }) || []

    return (
        <AdminShopsClient
            shops={mergedShops}
            initialSuccess={params.success}
            initialError={
                params.error ||
                (shopsError
                    ? shopsError.message
                    : undefined)
            }
            inviteLink={
                params.invite_link
                    ? decodeURIComponent(params.invite_link)
                    : undefined
            }
            selectedOwnerId={params.owner_id}
        />
    )
}