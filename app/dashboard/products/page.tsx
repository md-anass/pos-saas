import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { dictionaries } from '@/lib/dictionary'
import { deleteProduct, updateProductBarcode } from './actions'
import { Plus, Trash2, Image as ImageIcon, AlertTriangle } from 'lucide-react'
import { getCurrentShopContext, requireShopModule } from '@/lib/shop-context'
import { formatCurrency } from '@/lib/currency'

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
    const context = await getCurrentShopContext()
    const money = (value: number) => formatCurrency(value, context.shop.currency)
    requireShopModule(context, 'products')
    const supabase = await createClient()
    const params = await searchParams
    const cookieStore = await cookies()
    const lang = cookieStore.get('lang')?.value || 'en'
    const t = dictionaries[lang]

    const { data: products } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t.products.title}</h1>
                <Link
                    href="/dashboard/products/new"
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-all hover:scale-[1.02] shadow-md shadow-blue-600/20"
                >
                    <Plus size={20} /> {t.products.add_new}
                </Link>
            </div>

            {params.error && (
                <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
                    {decodeURIComponent(params.error)}
                </div>
            )}

            {/* Premium Table Container */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4 text-left w-16">#</th>
                                <th className="px-6 py-4 text-left">{t.products.image}</th>
                                <th className="px-6 py-4 text-left">{t.products.name}</th>
                                <th className="px-6 py-4 text-left">{t.products.sku}</th>
                                <th className="px-6 py-4 text-left">{t.products.unit}</th>
                                <th className="px-6 py-4 text-left">Barcode</th>
                                <th className="px-6 py-4 text-left">{t.products.stock}</th>
                                <th className="px-6 py-4 text-left">{t.products.purchase_price}</th>
                                <th className="px-6 py-4 text-left">{t.products.selling_price}</th>
                                <th className="px-6 py-4 text-right">{t.common.actions}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                            {products && products.length > 0 ? (
                                products.map((product, index) => {
                                    const isLowStock = product.quantity <= product.min_stock
                                    return (
                                        <tr key={product.id} className="group hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">

                                            {/* Numbering */}
                                            <td className="px-6 py-4 text-gray-400 font-medium">
                                                {index + 1}
                                            </td>

                                            {/* Image */}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="h-12 w-12 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden border border-gray-200 dark:border-gray-700">
                                                    {product.image_url ? (
                                                        <img src={product.image_url} alt={product.name} className="h-full w-full object-cover transition-transform group-hover:scale-110" />
                                                    ) : (
                                                        <ImageIcon className="text-gray-300 dark:text-gray-600" size={20} />
                                                    )}
                                                </div>
                                            </td>

                                            {/* Name */}
                                            <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900 dark:text-white">
                                                {product.name}
                                            </td>

                                            {/* SKU */}
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-500 dark:text-gray-400">
                                                {product.sku || '-'}
                                            </td>

                                            {/* Unit */}
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-500 dark:text-gray-400">
                                                {product.unit}
                                            </td>

                                            <td className="px-6 py-4">
                                                <form action={updateProductBarcode} className="flex gap-1">
                                                    <input type="hidden" name="product_id" value={product.id} />
                                                    <input name="barcode" defaultValue={product.barcode || ''} placeholder="Barcode" className="w-32 rounded border px-2 py-1" />
                                                    <button className="rounded border px-2 text-xs">Save</button>
                                                </form>
                                            </td>
                                            {/* Stock with Low Stock Badge */}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <span className={`font-medium ${isLowStock ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                                        {product.quantity}
                                                    </span>
                                                    {isLowStock && (
                                                        <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded-full">
                                                            <AlertTriangle size={10} /> Low
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Purchase Price */}
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-500 dark:text-gray-400">
                                                {money(Number(product.purchase_price))}
                                            </td>


                                            {/* Selling Price */}
                                            <td className="px-6 py-4 whitespace-nowrap font-bold text-gray-900 dark:text-white">
                                                {money(Number(product.selling_price))}
                                            </td>

                                            {/* Actions */}
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <form action={deleteProduct}>
                                                    <input type="hidden" name="product_id" value={product.id} />
                                                    <button
                                                        type="submit"
                                                        className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors opacity-0 group-hover:opacity-100"
                                                        title="Delete Product"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </form>
                                            </td>

                                        </tr>
                                    )
                                })
                            ) : (
                                <tr>
                                    <td colSpan={9} className="px-6 py-16 text-center text-gray-500 dark:text-gray-400">
                                        <ImageIcon className="mx-auto mb-4 text-gray-300 dark:text-gray-600" size={40} />
                                        {t.products.no_products}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
