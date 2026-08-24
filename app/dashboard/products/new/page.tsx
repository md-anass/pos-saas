import { createClient } from '@/lib/supabase/server'
import { addProduct } from '../actions'
import Link from 'next/link'
import ProductImageUploader from './ProductImageUploader'
import { cookies } from 'next/headers'
import { dictionaries } from '@/lib/dictionary'
import { getCurrentShopContext, requireShopModule } from '@/lib/shop-context'

export default async function AddProductPage() {
    const context = await getCurrentShopContext()
    requireShopModule(context, 'products')
    const supabase = await createClient()
    const pharmacy = context.shopType === 'pharmacy'

    const cookieStore = await cookies()
    const lang = cookieStore.get('lang')?.value || 'en'
    const t = dictionaries[lang]

    // Fetch categories for the dropdown
    const { data: categories } = await supabase
        .from('categories')
        .select('id, name')
        .order('name', { ascending: true })

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">{pharmacy ? 'Add Medicine' : t.products.add_title}</h1>{pharmacy && <p className="mt-1 text-sm text-gray-500">Create the medicine master record, then receive saleable stock through a dated batch.</p>}</div>
                <Link href="/dashboard/products" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
                    ← {t.common.back}
                </Link>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6 transition-colors">
                <form action={addProduct} className="space-y-6">

                    {/* Product Image Uploader */}
                    <ProductImageUploader />

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{pharmacy ? 'Medicine Name *' : t.products.product_name}</label>
                        <input
                            name="name"
                            type="text"
                            required
                            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 p-2 shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
                            placeholder={pharmacy ? 'e.g. Paracetamol 500 mg' : 'e.g. Premium Rice 5 kg'}
                        />
                    </div>

                    {/* Category Dropdown */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t.categories.select_category}</label>
                        <select
                            name="category_id"
                            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 p-2 shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
                        >
                            <option value="">None</option>
                            {categories?.map((cat) => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>
                    </div>


                    {!pharmacy && <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"><input type="checkbox" name="allows_decimal_quantity" /> Allow decimal quantities</div>}
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Barcode (Optional)</label>
                            <input
                                name="barcode"
                                type="text"
                                autoComplete="off"
                                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 p-2 shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
                                placeholder="Scan or enter barcode"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t.products.sku_optional}</label>
                            <input
                                name="sku"
                                type="text"
                                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 p-2 shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
                                placeholder={pharmacy ? 'e.g. MED-PARA-500' : 'e.g. ITEM-001'}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t.products.unit}</label>
                            <select
                                name="unit"
                                required
                                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 p-2 shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
                            >
                                <option value="Piece">Piece</option>
                                <option value="Kg">Kg</option>
                                <option value="Gram">Gram</option>
                                <option value="Liter">Liter</option>
                                <option value="Meter">Meter</option>
                                <option value="Box">Box</option>
                                <option value="Pack">Pack</option>
                                <option value="Dozen">Dozen</option>
                                <option value="Bottle">Bottle</option>
                                <option value="Plate">Plate</option>
                            </select>
                        </div>
                    </div>


                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t.products.purchase_price}</label>
                            <input
                                name="purchase_price"
                                type="number"
                                step="0.01"
                                required
                                min="0"
                                placeholder="0.00"
                                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 p-2 shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t.products.selling_price}</label>
                            <input
                                name="selling_price"
                                type="number"
                                step="0.01"
                                required
                                min="0"
                                placeholder="0.00"
                                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 p-2 shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
                            />
                        </div>
                    </div>


                    <div className="grid grid-cols-2 gap-6">
                        {pharmacy ? <input type="hidden" name="quantity" value="0" /> : <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t.products.initial_stock}</label>
                            <input name="quantity" type="number" step="0.01" required min="0" placeholder="0" className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 p-2 shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500" />
                        </div>}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t.products.min_stock_alert}</label>
                            <input
                                name="min_stock"
                                type="number"
                                step="0.01"
                                required
                                min="0"
                                placeholder="0.00"
                                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 p-2 shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {pharmacy && <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-900 dark:border-cyan-900 dark:bg-cyan-950/30 dark:text-cyan-100">Stock starts at zero. After saving, use <strong>Batches</strong> to record batch number, supplier, quantity, cost and required expiry date atomically.</div>}

                    <div className="flex justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                        <Link href="/dashboard/products" className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800">
                            {t.common.cancel}
                        </Link>
                        <button
                            type="submit"
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                        >
                            {t.common.save}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    )
}
