import { createClient } from '@/lib/supabase/server'
import { getCurrentShopContext, requireShopModule } from '@/lib/shop-context'

export default async function KitchenPage() {
    const context = await getCurrentShopContext()
    requireShopModule(context, 'kitchen')

    const supabase = await createClient()
    const { data: orders } = await supabase
        .from('restaurant_orders')
        .select('id, status, created_at, table_id')
        .in('status', ['pending', 'confirmed', 'preparing'])
        .order('created_at', { ascending: false })

    const { data: tables } = await supabase.from('restaurant_tables').select('id, name_or_number')
    const tableMap = new Map((tables || []).map((table) => [table.id, table.name_or_number]))

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Kitchen</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Tickets currently waiting for preparation.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {orders?.length ? orders.map((order) => (
                    <div key={order.id} className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
                        <p className="text-lg font-bold text-gray-900 dark:text-white">{tableMap.get(order.table_id) || 'Walk-in order'}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{order.status}</p>
                    </div>
                )) : (
                    <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 bg-white/60 dark:bg-gray-900/60 p-8 text-sm text-gray-500 dark:text-gray-400">
                        Nothing is waiting in the kitchen queue.
                    </div>
                )}
            </div>
        </div>
    )
}
