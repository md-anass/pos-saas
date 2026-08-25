import { logout } from './actions'
import { dictionaries } from '@/lib/dictionary'
import { getCurrentShopContext } from '@/lib/shop-context'
import { ShopCapabilitiesProvider } from '@/app/components/ShopCapabilitiesProvider'
import ThemeToggle from '@/app/components/ThemeToggle'
import NavLink from '@/app/components/NavLink'
import MobileNavigation from '@/app/components/MobileNavigation'
import { LogOut } from 'lucide-react'
import type { ShopModule } from '@/lib/shop-capabilities'

export const dynamic = 'force-dynamic'

const leftNavOrder: Record<string, ShopModule[]> = {
    retail: ['dashboard', 'products', 'categories', 'inventory'],
    restaurant: ['dashboard', 'menu', 'restaurant_tables', 'restaurant_orders', 'kitchen'],
    pharmacy: ['dashboard', 'medicines', 'categories', 'medicine_batches', 'medicine_expiry', 'prescriptions'],
    grocery: ['dashboard', 'products', 'categories', 'inventory', 'medicine_batches', 'medicine_expiry'],
}

const rightNavOrder: Record<string, ShopModule[]> = {
    retail: [
        'sales',
        'purchases',
        'suppliers',
        'customers',
        'expenses',
        'reports',
    ],
    restaurant: ['customers', 'expenses', 'reports'],
    pharmacy: ['sales', 'purchases', 'suppliers', 'customers', 'reports'],
    grocery: ['sales', 'purchases', 'suppliers', 'customers', 'expenses', 'reports'],
}

function isDefined<T>(
    value: T | null | undefined
): value is T {
    return Boolean(value)
}

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const context = await getCurrentShopContext()
    const { shop, shopType, capabilities } = context

    const today = new Date()
        .toISOString()
        .split('T')[0]

    if (
        shop.subscription_end &&
        shop.subscription_end < today
    ) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center p-8 text-center">
                <div className="max-w-md space-y-4">
                    <h1 className="text-3xl font-bold text-red-600 dark:text-red-400">
                        Subscription Expired
                    </h1>

                    <p className="text-gray-600 dark:text-gray-400">
                        Your subscription expired on{' '}
                        {new Date(
                            shop.subscription_end
                        ).toLocaleDateString()}.
                    </p>

                    <p className="text-gray-500 dark:text-gray-500 text-sm">
                        Please contact KarobarX support to renew
                        your subscription and regain access to
                        your dashboard.
                    </p>

                    <form action={logout}>
                        <button
                            type="submit"
                            className="mt-4 px-6 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
                        >
                            Logout
                        </button>
                    </form>
                </div>
            </div>
        )
    }

    const t = dictionaries.en

    const navMap = new Map(
        capabilities.navigation.map(
            (item) => [
                item.moduleKey,
                item,
            ]
        )
    )

    const leftNav = (
        leftNavOrder[shopType] ||
        leftNavOrder.retail
    )
        .map((key) => navMap.get(key))
        .filter(isDefined)

    const rightNav = (
        rightNavOrder[shopType] ||
        rightNavOrder.retail
    )
        .map((key) => navMap.get(key))
        .filter(isDefined)

    const showPOS =
        capabilities.modules.includes('pos')

    const normalizeLink = (item: {
        path: string
        label: string
        icon: string
    }) => ({
        href: item.path,
        label: item.label,
        icon: item.icon,
    })

    const settingsLink = {
        href: '/dashboard/settings',
        label: t.nav.settings,
        icon: 'Settings',
    }

    const mobileLinks = [
        ...capabilities.navigation.filter(item => item.moduleKey !== 'pos').map(normalizeLink),
        ...(showPOS ? [{ href: '/dashboard/pos', label: t.nav.pos, icon: 'ShoppingCart', highlight: true }] : []),
        settingsLink,
    ]

    return (
        <ShopCapabilitiesProvider value={context}>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col transition-colors duration-300">

                <header className="no-print sticky top-0 z-50 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-b border-gray-200/80 dark:border-gray-800/80 shadow-sm transition-colors duration-300">

                    <div className="h-16 px-3 xl:px-5 flex items-center gap-3">

                        {/* SHOP */}
                        <div className="flex items-center gap-2 min-w-0 shrink-0">

                            {shop.logo_url && (
                                <img
                                    src={shop.logo_url}
                                    alt="Shop Logo"
                                    className="w-8 h-8 rounded-full object-cover border border-gray-200 dark:border-gray-700 shadow-sm shrink-0"
                                />
                            )}

                            <div className="min-w-0">
                                <h1 className="text-sm font-bold text-gray-900 dark:text-white truncate max-w-[80px] xl:max-w-[110px] leading-tight">
                                    {shop.name}
                                </h1>

                                <p className="text-[9px] uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500 truncate">
                                    {shopType}
                                </p>
                            </div>
                        </div>

                        {/* DESKTOP NAVIGATION */}
                        <div className="hidden md:flex flex-1 items-center min-w-0 overflow-x-auto overscroll-x-contain scroll-smooth [scrollbar-width:thin]">

                            {/* LEFT NAV */}
                            <nav className="flex items-center gap-0.5 shrink-0">
                                {leftNav.map((link) => (
                                    <NavLink
                                        key={link.path}
                                        {...normalizeLink(link)}
                                    />
                                ))}
                            </nav>

                            {/* FLEXIBLE GAP */}
                            <div className="flex-1 min-w-2" />

                            {/* CENTER POS */}
                            {showPOS && (
                                <div className="shrink-0 px-1 lg:px-2">
                                    <NavLink
                                        href="/dashboard/pos"
                                        label={t.nav.pos}
                                        icon="ShoppingCart"
                                        highlight
                                    />
                                </div>
                            )}

                            {/* FLEXIBLE GAP */}
                            <div className="flex-1 min-w-2" />

                            {/* RIGHT NAV */}
                            <nav className="flex items-center gap-0.5 shrink-0">
                                {rightNav.map((link) => (
                                    <NavLink
                                        key={link.path}
                                        {...normalizeLink(link)}
                                    />
                                ))}


                            </nav>
                        </div>

                        {/* RIGHT ACTIONS */}
                        <div className="ml-auto flex items-center gap-1 shrink-0 pl-1.5 md:ml-0 xl:pl-2 border-l border-gray-200 dark:border-gray-700">

                            <MobileNavigation links={mobileLinks} />
                            <div className="hidden md:block"><NavLink href={settingsLink.href} label={settingsLink.label} icon={settingsLink.icon} showLabel /></div>

                            <ThemeToggle />

                            <form action={logout}>
                                <button
                                    type="submit"
                                    className="p-2 rounded-lg text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                                    title={t.common.logout}
                                >
                                    <LogOut size={18} />
                                </button>
                            </form>
                        </div>
                    </div>
                </header>

                <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto min-w-0">
                    {children}
                </main>
            </div>
        </ShopCapabilitiesProvider>
    )
}
