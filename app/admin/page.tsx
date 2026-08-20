import { createAdminClient } from '@/lib/supabase/admin'
import { Building, Users, DollarSign, TrendingUp, Clock } from 'lucide-react'

// Custom WhatsApp Icon
const WhatsAppIcon = ({ size = 14 }: { size?: number }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
)

export default async function AdminOverview() {
    const supabase = await createAdminClient()

    const { count: totalShops } = await supabase.from('shops').select('*', { count: 'exact', head: true })
    const { count: totalUsers } = await supabase.from('profiles').select('*', { count: 'exact', head: true })

    const { data: allSales } = await supabase.from('sales').select('total_amount') as any
    const totalRevenue = allSales?.reduce((sum: number, sale: any) => sum + (sale.total_amount || 0), 0) || 0

    const { data: recentShops } = await supabase
        .from('shops')
        .select('id, name, owner_id, business_type, created_at')
        .order('created_at', { ascending: false })
        .limit(5) as any

    // Fetch ALL shops to find the ones that are pending setup
    const { data: allShops } = await supabase
        .from('shops')
        .select('id, name, owner_id, created_at')
        .order('created_at', { ascending: false }) as any

    const pendingShops = allShops?.filter((s: any) => s.name === 'Pending Setup') || []

    // Generate secure invite links for pending shops
    const { data: usersData } = await supabase.auth.admin.listUsers()
    const users = usersData?.users || []

    const pendingData = await Promise.all(pendingShops.map(async (shop: any) => {
        const user = users.find(u => u.id === shop.owner_id)
        const email = user?.email || ''

        let inviteLink = ''
        if (email) {
            const { data: linkData } = await supabase.auth.admin.generateLink({
                type: 'invite',
                email: email,
                options: {
                    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/update-password`
                }
            })
            inviteLink = linkData?.properties?.action_link || ''
        }

        return { ...shop, email, inviteLink }
    }))

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

            {/* Pending Registrations & Share Links */}
            <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
                <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white mb-4">
                    <Clock size={20} className="text-orange-500" /> Pending Setup (Share Links)
                </h3>
                <div className="space-y-4">
                    {pendingData.length > 0 ? (
                        pendingData.map((shop: any) => (
                            <div key={shop.id} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-3">
                                <div>
                                    <p className="font-medium text-gray-900 dark:text-white">{shop.email}</p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500">Invited: {new Date(shop.created_at).toLocaleDateString()}</p>
                                </div>
                                {shop.inviteLink && (
                                    <a
                                        href={`https://wa.me/?text=${encodeURIComponent('Welcome to KarobarX! Click this secure link to set your password and activate your shop: ' + shop.inviteLink)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center gap-1 px-4 py-2 bg-[#25D366] text-white text-sm font-bold rounded-lg hover:opacity-90 transition-colors w-full md:w-auto"
                                    >
                                        <WhatsAppIcon size={14} /> Share via WhatsApp
                                    </a>
                                )}
                            </div>
                        ))
                    ) : (
                        <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">No pending registrations. All shops are active!</p>
                    )}
                </div>
            </div>

            {/* Recent Active Shops */}
            <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
                <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white mb-4">
                    <TrendingUp size={20} className="text-amber-500" /> Recent Registrations
                </h3>
                <div className="space-y-3">
                    {recentShops && recentShops.length > 0 ? (
                        recentShops.map((shop: any) => (
                            <div key={shop.id} className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 pb-2">
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