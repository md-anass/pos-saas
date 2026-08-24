import { createClient } from '@/lib/supabase/server'
import { updateStock } from '../actions'
import Link from 'next/link'
import { getCurrentShopContext, requireShopModule } from '@/lib/shop-context'

export default async function UpdateStockPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const context = await getCurrentShopContext()
    requireShopModule(context, 'inventory')
    const { id } = await params
    const supabase = await createClient()

    const { data: product } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single()

    if (!product) {
        return <div className="p-8 text-gray-900 dark:text-white">Product not found.</div>
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Update Stock</h1>
                <Link href="/dashboard/inventory" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
                    ← Back to Inventory
                </Link>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6 transition-colors">
                <div className="mb-6">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-white">{product.name}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Current Stock: {product.quantity} {product.unit}</p>
                </div>

                <form action={updateStock} className="space-y-6">
                    <input type="hidden" name="product_id" value={product.id} />

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Adjustment Type</label>
                        <select
                            name="adjustment_type"
                            required
                            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 p-2 shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
                        >
                            <option value="add" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Add Stock (Damaged/Lost/Correction)</option>
                            <option value="subtract" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Subtract Stock (Damaged/Lost/Correction)</option>
                            <option value="set" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Set Exact Quantity (Stocktake)</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Quantity</label>
                        <input
                            name="amount"
                            type="number"
                            step="0.01"
                            required
                            min="0"
                            defaultValue="0"
                            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 p-2 shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
                        />
                    </div>

                    <div className="flex justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                        <Link href="/dashboard/inventory" className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800">
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                        >
                            Save Update
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}