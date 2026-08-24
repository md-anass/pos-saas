import { createClient } from '@/lib/supabase/server'
import { getCurrentShopContext, requireShopModule } from '@/lib/shop-context'

type BatchRow = { id: string; batch_number: string; expiry_date: string | null; quantity: number; products?: { name: string }[] | { name: string } | null }

export default async function MedicineBatchesPage() {
    const context = await getCurrentShopContext()
    requireShopModule(context, 'medicine_batches')

    const supabase = await createClient()
    const { data: batchesRaw } = await supabase
        .from('medicine_batches')
        .select('id, batch_number, expiry_date, quantity, products(name)')
        .order('created_at', { ascending: false })
    const batches = (batchesRaw || []) as BatchRow[]

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Batches</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Track medicine stock by batch and expiry date.</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                        <tr>
                            <th className="px-6 py-4 text-left">Medicine</th>
                            <th className="px-6 py-4 text-left">Batch</th>
                            <th className="px-6 py-4 text-left">Expiry</th>
                            <th className="px-6 py-4 text-left">Quantity</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                        {batches.length ? batches.map((batch) => (
                            <tr key={batch.id}>
                                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{Array.isArray(batch.products) ? batch.products[0]?.name || 'Unknown' : batch.products?.name || 'Unknown'}</td>
                                <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{batch.batch_number}</td>
                                <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{batch.expiry_date ? new Date(batch.expiry_date).toLocaleDateString() : '-'}</td>
                                <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{batch.quantity}</td>
                            </tr>
                        )) : (
                            <tr><td colSpan={4} className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400">No batches found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
