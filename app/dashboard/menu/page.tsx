import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { getCurrentShopContext, requireShopModule } from '@/lib/shop-context'
import { dictionaries } from '@/lib/dictionary'

export default async function MenuPage() {
    const context = await getCurrentShopContext()
    requireShopModule(context, 'menu')

    const supabase = await createClient()
    const cookieStore = await cookies()
    const lang = cookieStore.get('lang')?.value || 'en'
    const t = dictionaries[lang] || dictionaries.en
    const terminology = context.capabilities.terminology

    const { data: products } = await supabase.from('products').select('id, name, sku, unit, quantity, selling_price').order('name', { ascending: true })

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{terminology.menu}</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage the items that appear in restaurant POS and orders.</p>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                        <tr>
                            <th className="px-6 py-4 text-left">{terminology.product}</th>
                            <th className="px-6 py-4 text-left">SKU</th>
                            <th className="px-6 py-4 text-left">Unit</th>
                            <th className="px-6 py-4 text-left">Stock</th>
                            <th className="px-6 py-4 text-left">Price</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                        {products?.length ? products.map((product) => (
                            <tr key={product.id}>
                                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{product.name}</td>
                                <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{product.sku || '-'}</td>
                                <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{product.unit}</td>
                                <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{product.quantity}</td>
                                <td className="px-6 py-4 text-gray-500 dark:text-gray-400">Rs. {Number(product.selling_price || 0).toFixed(2)}</td>
                            </tr>
                        )) : (
                            <tr><td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400">{t.products.no_products}</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
