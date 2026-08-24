import { createClient } from '@/lib/supabase/server'
import { getCurrentShopContext, requireShopModule } from '@/lib/shop-context'

type BatchRow = { id: string; batch_number: string; expiry_date: string | null; quantity: number; products?: { name: string }[] | { name: string } | null }

export default async function MedicineExpiryPage() {
    const context = await getCurrentShopContext()
    requireShopModule(context, 'medicine_expiry')

    const supabase = await createClient()
    const { data: batchesRaw } = await supabase
        .from('medicine_batches')
        .select('id, batch_number, expiry_date, quantity, products(name)')
        .not('expiry_date', 'is', null)
        .order('expiry_date', { ascending: true })
    const batches = (batchesRaw || []) as BatchRow[]

    const today = new Date()
    const expired = batches.filter((batch) => batch.expiry_date && new Date(batch.expiry_date) < today)
    const expiringSoon = batches.filter((batch) => {
        if (!batch.expiry_date) return false
        const diffDays = Math.ceil((new Date(batch.expiry_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        return diffDays >= 0 && diffDays <= 30
    })

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Expiry</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Monitor expiring and expired medicines.</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
                    <h2 className="text-lg font-bold text-orange-600 dark:text-orange-400 mb-4">Expiring Soon ({expiringSoon.length})</h2>
                    <div className="space-y-3">
                        {expiringSoon.length ? expiringSoon.map((batch) => (
                            <div key={batch.id} className="rounded-xl border border-orange-100 dark:border-orange-900/40 p-3">
                                <p className="font-medium text-gray-900 dark:text-white">{Array.isArray(batch.products) ? batch.products[0]?.name || 'Unknown' : batch.products?.name || 'Unknown'}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{batch.batch_number}</p>
                            </div>
                        )) : <p className="text-sm text-gray-500 dark:text-gray-400">No expiring batches.</p>}
                    </div>
                </div>
                <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
                    <h2 className="text-lg font-bold text-red-600 dark:text-red-400 mb-4">Expired ({expired.length})</h2>
                    <div className="space-y-3">
                        {expired.length ? expired.map((batch) => (
                            <div key={batch.id} className="rounded-xl border border-red-100 dark:border-red-900/40 p-3">
                                <p className="font-medium text-gray-900 dark:text-white">{Array.isArray(batch.products) ? batch.products[0]?.name || 'Unknown' : batch.products?.name || 'Unknown'}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{batch.batch_number}</p>
                            </div>
                        )) : <p className="text-sm text-gray-500 dark:text-gray-400">No expired batches.</p>}
                    </div>
                </div>
            </div>
        </div>
    )
}
