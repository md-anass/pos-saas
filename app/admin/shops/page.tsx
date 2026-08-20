import { createClient } from '@/lib/supabase/server'
import AdminShopsClient from './AdminShopsClient'

export default async function AdminShopsPage({ searchParams }: { searchParams: Promise<{ error?: string, success?: string }> }) {
    const supabase = await createClient()
    const params = await searchParams

    // Fetch shops with nested profiles(email)
    // We cast to 'any' to bypass TypeScript's strict nested join typing
    const { data: shops } = await supabase
        .from('shops')
        .select('id, name, owner_id, status, subscription_start, subscription_end, profiles(email)')
        .order('created_at', { ascending: false }) as any

    return (
        <AdminShopsClient
            shops={shops || []}
            initialSuccess={params.success}
            initialError={params.error}
        />
    )
}