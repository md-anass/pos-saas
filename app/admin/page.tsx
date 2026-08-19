import { createClient } from '@/lib/supabase/server'

export default async function AdminDashboard() {
    const supabase = await createClient()

    // Fetch platform-wide stats
    const { count: totalShops } = await supabase.from('shops').select('*', { count: 'exact', head: true })
    const { count: totalUsers } = await supabase.from('profiles').select('*', { count: 'exact', head: true })

    // Fetch all sales across all shops for platform revenue
    const { data: allSales } = await supabase.from('sales').select('total_amount')
    const totalRevenue = allSales?.reduce((sum, sale) => sum + sale.total_amount, 0) || 0

    // Fetch recent shops
    const { data: recentShops } = await supabase
        .from('shops')
        .select('name, business_type, created_at')
        .order('created_at', { ascending: false })
        .limit(5)

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-800">Platform Overview</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <h3 className="text-sm font-medium text-gray-500">Total Shops</h3>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{totalShops || 0}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <h3 className="text-sm font-medium text-gray-500">Total Users</h3>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{totalUsers || 0}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <h3 className="text-sm font-medium text-gray-500">Total Platform Revenue</h3>
                    <p className="text-3xl font-bold text-green-600 mt-2">Rs. {totalRevenue.toFixed(2)}</p>
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-medium text-gray-800 mb-4">Recent Shops</h3>
                <div className="space-y-3">
                    {recentShops && recentShops.length > 0 ? (
                        recentShops.map((shop) => (
                            <div key={shop.name} className="flex justify-between items-center border-b pb-2">
                                <div>
                                    <p className="font-medium text-gray-900">{shop.name}</p>
                                    <p className="text-xs text-gray-500 capitalize">{shop.business_type}</p>
                                </div>
                                <p className="text-xs text-gray-400">
                                    {new Date(shop.created_at).toLocaleDateString()}
                                </p>
                            </div>
                        ))
                    ) : (
                        <p className="text-gray-500 text-sm">No shops registered yet.</p>
                    )}
                </div>
            </div>
        </div>
    )
}