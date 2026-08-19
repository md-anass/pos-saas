import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ThemeToggle from '@/app/components/ThemeToggle'
import Link from 'next/link'
import { ShieldAlert, LogOut, ArrowLeft } from 'lucide-react'
import { logout } from '../dashboard/actions' // Reuse the logout action

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Securely check if the user is a platform admin
    const { data: profile } = await supabase
        .from('profiles')
        .select('is_platform_admin')
        .eq('id', user.id)
        .single()

    if (!profile || !profile.is_platform_admin) {
        // If they are not an admin, kick them out to the normal dashboard
        redirect('/dashboard')
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col transition-colors duration-300">
            <header className="no-print sticky top-0 z-50 bg-gray-900 text-white border-b border-gray-800 h-16 flex items-center justify-between px-6 lg:px-8 shadow-sm transition-colors duration-300">

                <div className="flex items-center gap-8">
                    <div className="flex items-center gap-2 text-red-500">
                        <ShieldAlert size={24} />
                        <h1 className="text-xl font-bold tracking-wide">Admin Panel</h1>
                    </div>

                    <nav className="hidden md:flex items-center gap-1">
                        <Link href="/admin" className="px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors">
                            Overview
                        </Link>
                        <Link href="/admin/shops" className="px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors">
                            Shops
                        </Link>
                    </nav>
                </div>

                <div className="flex items-center gap-4">
                    <ThemeToggle />
                    <Link href="/dashboard" className="flex items-center gap-2 text-sm font-medium text-gray-300 hover:text-white border border-gray-700 hover:bg-gray-800 px-3 py-1.5 rounded-md transition-colors">
                        <ArrowLeft size={16} /> Exit to App
                    </Link>
                    <form action={logout}>
                        <button type="submit" className="flex items-center gap-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-md transition-colors">
                            <LogOut size={16} /> Logout
                        </button>
                    </form>
                </div>
            </header>

            <main className="flex-1 w-full max-w-7xl mx-auto p-6 lg:p-8">
                {children}
            </main>
        </div>
    )
}