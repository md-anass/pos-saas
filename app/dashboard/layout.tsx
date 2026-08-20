import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { logout } from './actions'
import { LayoutDashboard, Package, Warehouse, ShoppingCart, ReceiptText, FileBarChart, Settings, Wallet, Users, Tags, LogOut } from 'lucide-react'
import ThemeToggle from '@/app/components/ThemeToggle'
import NavLink from '@/app/components/NavLink'
import { dictionaries } from '@/lib/dictionary'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // 1. Try fetching as Owner
    const { data: ownerShops } = await supabase
        .from('shops')
        .select('*')
        .eq('owner_id', user.id)
        .limit(1)

    let shop = ownerShops && ownerShops.length > 0 ? ownerShops[0] : null
    let userRole = 'owner'
    let userPermissions: string[] = []

    // 2. If not Owner, check if they are a Staff Member
    if (!shop) {
        const { data: member } = await supabase
            .from('shop_members')
            .select('shop_id, role, permissions')
            .eq('user_id', user.id)
            .single()

        if (member) {
            userRole = member.role
            userPermissions = member.permissions || []
            const { data: staffShop } = await supabase
                .from('shops')
                .select('*')
                .eq('id', member.shop_id)
                .single()

            if (staffShop) shop = staffShop
        }
    }


    // 3. If still no shop, check if they are an Admin. If not, send to onboarding.
    if (!shop) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('is_platform_admin')
            .eq('id', user.id)
            .single()

        if (profile?.is_platform_admin) {
            redirect('/admin')
        } else {
            redirect('/onboarding')
        }
    }

    // 4. Block Suspended Shops
    if (shop.status === 'suspended') {
        redirect('/login?error=Your shop is suspended. Please contact admin.')
    }

    const cookieStore = await cookies()
    const lang = cookieStore.get('lang')?.value || 'en'
    const t = dictionaries[lang]

    // 5. Role-Based Nav Filtering (Owner sees all, Staff sees only permissions)
    const hasAccess = (module: string) => userRole === 'owner' || userPermissions.includes(module)

    const leftNav = [
        { href: '/dashboard', label: t.nav.dashboard, icon: 'LayoutDashboard', perm: 'dashboard' },
        { href: '/dashboard/products', label: t.nav.products, icon: 'Package', perm: 'products' },
        { href: '/dashboard/categories', label: t.categories.title, icon: 'Tags', perm: 'products' },
        { href: '/dashboard/inventory', label: t.nav.inventory, icon: 'Warehouse', perm: 'inventory' },
    ].filter(link => hasAccess(link.perm))

    const rightNav = [
        { href: '/dashboard/sales', label: t.nav.sales, icon: 'ReceiptText', perm: 'sales' },
        { href: '/dashboard/contacts', label: t.contacts.title, icon: 'Users', perm: 'contacts' },
        { href: '/dashboard/expenses', label: t.expenses.title, icon: 'Wallet', perm: 'expenses' },
        { href: '/dashboard/purchases', label: t.nav.purchases, icon: 'ReceiptText', perm: 'purchases' },
        { href: '/dashboard/reports', label: t.nav.reports, icon: 'FileBarChart', perm: 'reports' },
    ].filter(link => hasAccess(link.perm))

    const showPOS = hasAccess('pos') || hasAccess('sales')

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col transition-colors duration-300">
            {/* Premium Glassmorphism Navbar */}
            <header className="no-print sticky top-0 z-50 bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border-b border-gray-200/80 dark:border-gray-800/80 h-16 flex items-center justify-between px-4 lg:px-6 shadow-sm transition-colors duration-300">

                {/* Left Section */}
                <div className="flex items-center gap-4 lg:gap-6">
                    <div className="flex items-center gap-2.5">
                        {shop.logo_url && (
                            <img src={shop.logo_url} alt="Shop Logo" className="w-9 h-9 rounded-full object-cover border border-gray-200 dark:border-gray-700 shadow-sm flex-shrink-0" />
                        )}
                        <h1 className="text-base font-bold text-gray-900 dark:text-white truncate max-w-[80px] md:max-w-[120px] lg:max-w-[180px] leading-tight tracking-tight">
                            {shop.name}
                        </h1>
                    </div>

                    <nav className="hidden md:flex items-center gap-0.5 lg:gap-1">
                        {leftNav.map((link) => (
                            <NavLink key={link.href} {...link} />
                        ))}
                    </nav>
                </div>

                {/* Center Section (POS) */}
                {showPOS && (
                    <div className="justify-self-center hidden md:flex items-center">
                        <NavLink href="/dashboard/pos" label={t.nav.pos} icon="ShoppingCart" highlight />
                    </div>
                )}

                {/* Right Section */}
                <div className="justify-self-end flex items-center gap-2">
                    <nav className="hidden lg:flex items-center gap-0.5">
                        {rightNav.map((link) => (
                            <NavLink key={link.href} {...link} />
                        ))}
                    </nav>

                    {/* Premium Separated Utility Pills */}
                    <div className="flex items-center gap-2 border-l border-gray-200 dark:border-gray-800 pl-3 lg:pl-4 ml-1">

                        {/* Theme Pill (Language moved to Settings) */}
                        <div className="flex items-center justify-center p-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                            <ThemeToggle />
                        </div>

                        {/* Settings & Avatar (Owner Only) */}
                        {userRole === 'owner' && (
                            <NavLink href="/dashboard/settings" label="" icon="Settings" />
                        )}
                        <div className="h-8 w-8 rounded-full bg-gray-800 dark:bg-gray-200 flex items-center justify-center text-white dark:text-gray-900 font-bold text-xs shadow-md ml-1 hidden sm:flex">
                            {user.email?.charAt(0).toUpperCase()}
                        </div>

                        {/* Logout */}
                        <form action={logout}>
                            <button type="submit" className="p-2 rounded-lg text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors">
                                <LogOut size={18} />
                            </button>
                        </form>
                    </div>
                </div>
            </header>

            <main className="flex-1 w-full max-w-7xl mx-auto p-4 lg:p-6">
                {children}
            </main>
        </div>
    )
}