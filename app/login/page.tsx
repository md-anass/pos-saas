import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { login } from './actions'
import LoginUI from '@/app/components/LoginUI'

export default async function LoginPage({
    searchParams,
}: {
    searchParams: Promise<{ error?: string }>
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // If user is already logged in, send them to their dashboard
    if (user) {
        const { data: shops } = await supabase
            .from('shops')
            .select('id, status')
            .eq('owner_id', user.id)
            .limit(1)

        if (shops && shops.length > 0 && shops[0].status === 'active') {
            redirect('/dashboard')
        } else {
            redirect('/onboarding')
        }
    }

    const params = await searchParams

    return <LoginUI error={params.error} loginAction={login} />
}