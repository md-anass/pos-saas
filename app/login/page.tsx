import { login } from './actions'
import LoginUI from '@/app/components/LoginUI'

export default async function LoginPage({
    searchParams,
}: {
    searchParams: Promise<{ error?: string }>
}) {
    const params = await searchParams

    // We removed the "if user is logged in, redirect" logic here
    // so it ALWAYS shows the login form when you click the Login button.

    return <LoginUI error={params.error} loginAction={login} />
}