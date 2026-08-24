import { createClient } from '@/lib/supabase/server'
import { getCurrentShopContext, requireShopModule } from '@/lib/shop-context'
import { cookies } from 'next/headers'

export default async function RestaurantOrdersPage() {
    const context = await getCurrentShopContext()
    requireShopModule(context, 'restaurant_orders')

    const supabase = await createClient()
    await cookies()

    const { data: orders } = await supabase
        .from('restaurant_orders')
        .select('id, status, order_type, total_amount, created_at, notes, table_id')
        .order('created_at', { ascending: false })

    const { data: tables } = await supabase.from('restaurant_tables').select('id, name_or_number')
    const tableMap = new Map((tables || []).map((table) => [table.id, table.name_or_number]))

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Orders</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Restaurant order workflow and kitchen handoff.</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                        <tr>
                            <th className="px-6 py-4 text-left">Order</th>
                            <th className="px-6 py-4 text-left">Table</th>
                            <th className="px-6 py-4 text-left">Type</th>
                            <th className="px-6 py-4 text-left">Status</th>
                            <th className="px-6 py-4 text-left">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                        {orders?.length ? orders.map((order) => (
                            <tr key={order.id}>
                                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{order.id.substring(0, 8)}...</td>
                                <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{tableMap.get(order.table_id) || '-'}</td>
                                <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{order.order_type}</td>
                                <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{order.status}</td>
                                <td className="px-6 py-4 text-gray-500 dark:text-gray-400">Rs. {Number(order.total_amount || 0).toFixed(2)}</td>
                            </tr>
                        )) : (
                            <tr><td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400">No restaurant orders yet.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
