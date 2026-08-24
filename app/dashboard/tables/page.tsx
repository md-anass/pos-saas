import { createClient } from '@/lib/supabase/server'
import { getCurrentShopContext, requireShopModule } from '@/lib/shop-context'

export default async function RestaurantTablesPage() {
    const context = await getCurrentShopContext()
    requireShopModule(context, 'restaurant_tables')

    const supabase = await createClient()

    const { data: tables } = await supabase.from('restaurant_tables').select('id, name_or_number, capacity, status, created_at').order('created_at', { ascending: false })

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tables</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Track dining room tables and availability.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {tables?.length ? tables.map((table) => (
                    <div key={table.id} className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
                        <p className="text-lg font-bold text-gray-900 dark:text-white">{table.name_or_number}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Capacity: {table.capacity}</p>
                        <p className="mt-4 inline-flex rounded-full px-3 py-1 text-xs font-semibold bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                            {table.status}
                        </p>
                    </div>
                )) : (
                    <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 bg-white/60 dark:bg-gray-900/60 p-8 text-sm text-gray-500 dark:text-gray-400">
                        No tables yet. Add restaurant tables in the database or next settings update.
                    </div>
                )}
            </div>
        </div>
    )
}
