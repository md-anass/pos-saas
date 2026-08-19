import { createClient } from '@/lib/supabase/server'
import { inviteShopOwner, suspendShop, activateShop, deleteShop } from '../actions'
import { ShieldCheck, Ban, Trash2, UserPlus } from 'lucide-react'

export default async function AdminShopsPage({
    searchParams,
}: {
    searchParams: Promise<{ error?: string }>
}) {
    const supabase = await createClient()
    const params = await searchParams

    const { data: shops } = await supabase
        .from('shops')
        .select('id, name, status, created_at, profiles(email)')
        .order('created_at', { ascending: false })

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Shop Management</h1>

            {params.error && (
                <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded">
                    {decodeURIComponent(params.error)}
                </div>
            )}

            {/* Invite Form */}
            <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <UserPlus size={20} /> Invite New Shop Owner
                </h2>
                <form action={inviteShopOwner} className="flex gap-4">
                    <input
                        name="email"
                        type="email"
                        required
                        placeholder="customer@example.com"
                        className="flex-1 rounded-md border border-gray-300 dark:border-gray-700 p-2 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
                    />
                    <button
                        type="submit"
                        className="px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors"
                    >
                        Send Invite
                    </button>
                </form>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    An email will be sent with a secure link for them to set their password and login.
                </p>
            </div>

            {/* Shops Table */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                    <thead className="bg-gray-50 dark:bg-gray-800/50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Shop Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Owner Email</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                        {shops && shops.length > 0 ? (
                            shops.map((shop: any) => (
                                <tr key={shop.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                        {shop.name}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                        {shop.profiles?.email || 'Unknown'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${shop.status === 'active'
                                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                            }`}>
                                            {shop.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                        {shop.status === 'active' ? (
                                            <form action={suspendShop} className="inline-block">
                                                <input type="hidden" name="shop_id" value={shop.id} />
                                                <button type="submit" className="flex items-center gap-1 text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-300">
                                                    <Ban size={14} /> Suspend
                                                </button>
                                            </form>
                                        ) : (
                                            <form action={activateShop} className="inline-block">
                                                <input type="hidden" name="shop_id" value={shop.id} />
                                                <button type="submit" className="flex items-center gap-1 text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300">
                                                    <ShieldCheck size={14} /> Activate
                                                </button>
                                            </form>
                                        )}

                                        <form action={deleteShop} className="inline-block">
                                            <input type="hidden" name="shop_id" value={shop.id} />
                                            <input type="hidden" name="owner_id" value={shop.owner_id} />
                                            <button type="submit" className="flex items-center gap-1 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 ml-4">
                                                <Trash2 size={14} /> Delete
                                            </button>
                                        </form>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                                    No shops found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}