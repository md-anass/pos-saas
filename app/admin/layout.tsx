import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ThemeToggle from '@/app/components/ThemeToggle'
import Link from 'next/link'
import { ShieldAlert, LogOut, Menu, X } from 'lucide-react'
import { logout } from '../dashboard/actions'
import { useState } from 'react'

function AdminNav() {
    const [menuOpen, setMenuOpen] = useState(false)

    return (
        <header className="no-print sticky top-0 z-50 bg-gray-900 text-white border-b border-gray-800 h-16 flex items-center justify-between px-4 lg:px-8 shadow-sm transition-colors duration-300">
            <div className="flex items-center gap-4 lg:gap-8">
                <div className="flex items-center gap-2 text-red-500">
                    <ShieldAlert size={24} />
                    <h1 className="text-xl font-bold tracking-wide hidden sm:block">Admin Panel</h1>
                </div>

                <nav className="hidden md:flex items-center gap-1">
                    <Link href="/admin" className="px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors">Overview</Link>
                    <Link href="/admin/shops" className="px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors">Shops</Link>
                </nav>
            </div>

            <div className="flex items-center gap-4">
                <div className="hidden sm:block"><ThemeToggle /></div>
                <form action={logout}>
                    <button type="submit" className="hidden sm:flex items-center gap-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-md transition-colors">
                        <LogOut size={16} /> Logout
                    </button>
                </form>

                <button className="md:hidden text-gray-300" onClick={() => setMenuOpen(!menuOpen)}>
                    {menuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {menuOpen && (
                <div className="md:hidden absolute top-16 left-0 w-full bg-gray-900 border-b border-gray-800 flex flex-col p-4 gap-2 shadow-lg z-50">
                    <Link href="/admin" onClick={() => setMenuOpen(false)} className="px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white">Overview</Link>
                    <Link href="/admin/shops" onClick={() => setMenuOpen(false)} className="px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white">Shops</Link>
                    <div className="border-t border-gray-800 my-2"></div>
                    <div className="flex justify-between items-center">
                        <ThemeToggle />
                    </div>
                    <form action={logout}>
                        <button type="submit" className="w-full flex items-center justify-center gap-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 px-3 py-2 rounded-md transition-colors mt-2">
                            <LogOut size={16} /> Logout
                        </button>
                    </form>
                </div>
            )}
        </header>
    )
}

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

    const { data: profile } = await supabase
        .from('profiles')
        .select('is_platform_admin')
        .eq('id', user.id)
        .single()

    if (!profile || !profile.is_platform_admin) {
        redirect('/dashboard')
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col transition-colors duration-300">
            <AdminNav />
            <main className="flex-1 w-full max-w-7xl mx-auto p-4 lg:p-8">
                {children}
            </main>
        </div>
    )
}