import { createAdminClient } from '@/lib/supabase/admin'
import {
    Building,
    Users,
    Banknote,
    TrendingUp,
    Clock,
    ArrowRight
} from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function AdminOverview() {
    const supabase = await createAdminClient()

    // ========================================================
    // Platform stats
    // ========================================================

    const { count: totalShops } = await supabase
        .from('shops')
        .select('*', {
            count: 'exact',
            head: true
        })

    const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', {
            count: 'exact',
            head: true
        })

    const { data: allSales } = await supabase
        .from('sales')
        .select('total_amount')

    const totalRevenue =
        allSales?.reduce(
            (sum, sale) =>
                sum +
                Number(sale.total_amount || 0),
            0
        ) || 0

    // ========================================================
    // Recent shops
    // ========================================================

    const { data: recentShops } = await supabase
        .from('shops')
        .select(
            'id, name, business_type, created_at'
        )
        .order('created_at', {
            ascending: false
        })
        .limit(5)

    // ========================================================
    // Pending Setup shops
    // ========================================================

    const { data: pendingShopsData } =
        await supabase
            .from('shops')
            .select(
                'id, owner_id, created_at'
            )
            .eq('name', 'Pending Setup')
            .order('created_at', {
                ascending: false
            })

    // ========================================================
    // Get customer emails from Supabase Auth
    // ========================================================

    const { data: usersData } =
        await supabase.auth.admin.listUsers()

    const users = usersData?.users || []

    const pendingData =
        pendingShopsData?.map((shop) => {
            const user = users.find(
                (user) =>
                    user.id === shop.owner_id
            )

            return {
                ...shop,
                email:
                    user?.email || 'Unknown'
            }
        }) || []

    return (
        <div className="space-y-8 p-4 lg:p-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Platform Overview
            </h1>

            {/* ==================================================
                STATS
            ================================================== */}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Total Shops */}

                <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-amber-500/10 rounded-xl">
                        <Building
                            className="text-amber-500"
                            size={24}
                        />
                    </div>

                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Total Shops
                        </p>

                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {totalShops || 0}
                        </p>
                    </div>
                </div>

                {/* Total Users */}

                <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-blue-500/10 rounded-xl">
                        <Users
                            className="text-blue-500"
                            size={24}
                        />
                    </div>

                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Total Users
                        </p>

                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {totalUsers || 0}
                        </p>
                    </div>
                </div>

                {/* Revenue */}

                <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-green-500/10 rounded-xl">
                        <Banknote
                            className="text-green-500"
                            size={24}
                        />
                    </div>

                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Platform Revenue
                        </p>

                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            Rs.{' '}
                            {totalRevenue.toFixed(0)}
                        </p>
                    </div>
                </div>
            </div>

            {/* ==================================================
                PENDING REGISTRATIONS
            ================================================== */}

            <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
                <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white mb-4">
                    <Clock
                        size={20}
                        className="text-orange-500"
                    />

                    Pending Setup
                </h3>

                <div className="space-y-3">
                    {pendingData.length > 0 ? (
                        pendingData.map(
                            (shop) => (
                                <div
                                    key={shop.id}
                                    className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-gray-100 dark:border-gray-800 pb-3"
                                >
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-white">
                                            {
                                                shop.email
                                            }
                                        </p>

                                        <p className="text-xs text-gray-400 dark:text-gray-500">
                                            Invited:{' '}
                                            {new Date(
                                                shop.created_at
                                            ).toLocaleDateString()}
                                        </p>
                                    </div>

                                    <Link
                                        href={`/admin/shops?owner_id=${encodeURIComponent(
                                            shop.owner_id
                                        )}`}
                                        className="flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap"
                                    >
                                        Generate
                                        Setup Link

                                        <ArrowRight
                                            size={12}
                                        />
                                    </Link>
                                </div>
                            )
                        )
                    ) : (
                        <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">
                            No pending
                            registrations. All
                            shops have completed
                            setup.
                        </p>
                    )}
                </div>
            </div>

            {/* ==================================================
                RECENT SHOPS
            ================================================== */}

            <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
                <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white mb-4">
                    <TrendingUp
                        size={20}
                        className="text-amber-500"
                    />

                    Recent Registrations
                </h3>

                <div className="space-y-3">
                    {recentShops &&
                        recentShops.length > 0 ? (
                        recentShops.map(
                            (shop) => (
                                <div
                                    key={shop.id}
                                    className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 pb-2"
                                >
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-white">
                                            {
                                                shop.name
                                            }
                                        </p>

                                        <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                                            {
                                                shop.business_type
                                            }
                                        </p>
                                    </div>

                                    <p className="text-xs text-gray-400 dark:text-gray-500">
                                        {new Date(
                                            shop.created_at
                                        ).toLocaleDateString()}
                                    </p>
                                </div>
                            )
                        )
                    ) : (
                        <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">
                            No shops registered
                            yet.
                        </p>
                    )}
                </div>
            </div>
        </div>
    )
}