import { createClient } from '@/lib/supabase/server'
import { getCurrentShopContext, requireShopModule } from '@/lib/shop-context'

export default async function MedicinesPage() {
    const context = await getCurrentShopContext()
    requireShopModule(context, 'medicines')

    const supabase = await createClient()
    const { data: products } = await supabase.from('products').select('id, name, sku, unit, quantity, purchase_price, selling_price').order('name', { ascending: true })

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{context.capabilities.terminology.medicines}</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Medicine catalog powered by the shared product system.</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                        <tr>
                            <th className="px-6 py-4 text-left">Medicine</th>
                            <th className="px-6 py-4 text-left">SKU</th>
                            <th className="px-6 py-4 text-left">Stock</th>
                            <th className="px-6 py-4 text-left">Purchase</th>
                            <th className="px-6 py-4 text-left">Selling</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                        {products?.length ? products.map((product) => (
                            <tr key={product.id}>
                                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{product.name}</td>
                                <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{product.sku || '-'}</td>
                                <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{product.quantity}</td>
                                <td className="px-6 py-4 text-gray-500 dark:text-gray-400">Rs. {Number(product.purchase_price || 0).toFixed(2)}</td>
                                <td className="px-6 py-4 text-gray-500 dark:text-gray-400">Rs. {Number(product.selling_price || 0).toFixed(2)}</td>
                            </tr>
                        )) : (
                            <tr><td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400">No medicines found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
