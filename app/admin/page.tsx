import { createAdminClient } from '@/lib/supabase/admin'
import { Building, Users, DollarSign, TrendingUp } from 'lucide-react'

export default async function AdminOverview() {
    // Use Admin Client to bypass RLS and see ALL platform data
    const supabase = await createAdminClient()

    // Fetch stats
    const { count: totalShops } = await supabase.from('shops').select('*', { count: 'exact', head: true })
    const { count: totalUsers } = await supabase.from('profiles').select('*', { count: 'exact', head: true })

    // Use 'any' to bypass TS nested join strictness
    const { data: allSales } = await supabase.from('sales').select('total_amount') as any
    const totalRevenue = allSales?.reduce((sum: number, sale: any) => sum + (sale.total_amount || 0), 0) || 0

    const { data: recentShops } = await supabase
        .from('shops')
        .select('name, business_type, created_at')
        .order('created_at', { ascending: false })
        .limit(5) as any

    return (
        <div className="space-y-8 p-4 lg:p-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Platform Overview</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-amber-500/10 rounded-xl"><Building className="text-amber-500" size={24} /></div>
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Total Shops</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalShops || 0}</p>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-blue-500/10 rounded-xl"><Users className="text-blue-500" size={24} /></div>
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Total Users</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalUsers || 0}</p>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-green-500/10 rounded-xl"><DollarSign className="text-green-500" size={24} /></div>
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Platform Revenue</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">Rs. {totalRevenue.toFixed(0)}</p>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
                <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white mb-4">
                    <TrendingUp size={20} className="text-amber-500" /> Recent Registrations
                </h3>
                <div className="space-y-3">
                    {recentShops && recentShops.length > 0 ? (
                        recentShops.map((shop: any) => (
                            <div key={shop.name} className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 pb-2">
                                <div>
                                    <p className="font-medium text-gray-900 dark:text-white">{shop.name}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{shop.business_type}</p>
                                </div>
                                <p className="text-xs text-gray-400 dark:text-gray-500">
                                    {new Date(shop.created_at).toLocaleDateString()}
                                </p>
                            </div>
                        ))
                    ) : (
                        <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">No shops registered yet.</p>
                    )}
                </div>
            </div>
        </div>
    )
}