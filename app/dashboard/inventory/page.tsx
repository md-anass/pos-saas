import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { dictionaries } from '@/lib/dictionary'
import { Boxes, AlertTriangle, DollarSign, Pencil, PackageSearch, CalendarX, Clock } from 'lucide-react'

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
    const supabase = await createClient()
    const params = await searchParams
    const cookieStore = await cookies()
    const lang = cookieStore.get('lang')?.value || 'en'
    const t = dictionaries[lang]

    // Fetch products
    const { data: products } = await supabase.from('products').select('id, name, quantity, min_stock, unit, purchase_price').order('name', { ascending: true })

    // Fetch Batches with Expiry Dates
    const { data: batches } = await supabase.from('product_batches').select('id, batch_number, expiry_date, quantity, products(name)').not('expiry_date', 'is', null)

    // Calculate Summary Stats
    const totalItems = products?.length || 0
    const lowStockItems = products?.filter(p => p.quantity <= p.min_stock).length || 0
    const inventoryValue = products?.reduce((sum, p) => sum + (p.quantity * p.purchase_price), 0) || 0

    // Expiry Calculation Logic
    const today = new Date()
    const expiredItems = batches?.filter((b: any) => new Date(b.expiry_date) < today) || []
    const expiringSoonItems = batches?.filter((b: any) => {
        const expDate = new Date(b.expiry_date)
        const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        return diffDays >= 0 && diffDays <= 30 // Expiring in next 30 days
    }) || []

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t.inventory.title}</h1>
            </div>

            {params.error && (
                <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
                    {decodeURIComponent(params.error)}
                </div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg"><Boxes className="text-blue-600 dark:text-blue-400" size={24} /></div>
                    <div><p className="text-sm text-gray-500 dark:text-gray-400">Total Products</p><p className="text-2xl font-bold text-gray-900 dark:text-white">{totalItems}</p></div>
                </div>
                <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-lg"><DollarSign className="text-green-600 dark:text-green-400" size={24} /></div>
                    <div><p className="text-sm text-gray-500 dark:text-gray-400">Inventory Value</p><p className="text-2xl font-bold text-gray-900 dark:text-white">Rs. {inventoryValue.toFixed(0)}</p></div>
                </div>
                <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-lg"><AlertTriangle className="text-red-600 dark:text-red-400" size={24} /></div>
                    <div><p className="text-sm text-gray-500 dark:text-gray-400">Low Stock Alerts</p><p className="text-2xl font-bold text-red-600 dark:text-red-400">{lowStockItems}</p></div>
                </div>
            </div>

            {/* Expiry Tracker Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Expired Items */}
                <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-red-200 dark:border-red-900/50 shadow-sm">
                    <h3 className="flex items-center gap-2 text-lg font-bold text-red-600 dark:text-red-400 mb-4 pb-2 border-b border-red-100 dark:border-red-900/30">
                        <CalendarX size={20} /> Expired Stock ({expiredItems.length})
                    </h3>
                    <div className="space-y-3 max-h-48 overflow-y-auto">
                        {expiredItems.length > 0 ? (
                            expiredItems.map((b: any) => (
                                <div key={b.id} className="flex justify-between items-center p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                                    <div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">{b.products?.name || 'Unknown'}</p>
                                        <p className="text-xs text-gray-500">Batch: {b.batch_number || 'N/A'}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-red-600">{b.quantity} Units</p>
                                        <p className="text-xs text-red-500">Expired: {new Date(b.expiry_date).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            ))
                        ) : <p className="text-sm text-gray-500 text-center py-4">No expired items.</p>}
                    </div>
                </div>

                {/* Expiring Soon (Next 30 Days) */}
                <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-orange-200 dark:border-orange-900/50 shadow-sm">
                    <h3 className="flex items-center gap-2 text-lg font-bold text-orange-600 dark:text-orange-400 mb-4 pb-2 border-b border-orange-100 dark:border-orange-900/30">
                        <Clock size={20} /> Expiring Soon ({expiringSoonItems.length})
                    </h3>
                    <div className="space-y-3 max-h-48 overflow-y-auto">
                        {expiringSoonItems.length > 0 ? (
                            expiringSoonItems.map((b: any) => (
                                <div key={b.id} className="flex justify-between items-center p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                                    <div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">{b.products?.name || 'Unknown'}</p>
                                        <p className="text-xs text-gray-500">Batch: {b.batch_number || 'N/A'}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-orange-600">{b.quantity} Units</p>
                                        <p className="text-xs text-orange-500">Expires: {new Date(b.expiry_date).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            ))
                        ) : <p className="text-sm text-gray-500 text-center py-4">Nothing expiring soon.</p>}
                    </div>
                </div>
            </div>

            {/* Inventory Table */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4 text-left w-16">#</th>
                                <th className="px-6 py-4 text-left">Product Name</th>
                                <th className="px-6 py-4 text-left">Current Stock</th>
                                <th className="px-6 py-4 text-left">Min Stock Alert</th>
                                <th className="px-6 py-4 text-left">Unit Cost</th>
                                <th className="px-6 py-4 text-left">Stock Value</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                            {products && products.length > 0 ? (
                                products.map((product, index) => {
                                    const isLowStock = product.quantity <= product.min_stock
                                    const stockValue = product.quantity * product.purchase_price
                                    return (
                                        <tr key={product.id} className="group hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                            <td className="px-6 py-4 text-gray-400 font-medium">{index + 1}</td>
                                            <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900 dark:text-white">{product.name}<span className="text-xs text-gray-400 block font-normal">{product.unit}</span></td>
                                            <td className="px-6 py-4 whitespace-nowrap font-bold text-gray-900 dark:text-white">{product.quantity}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-500 dark:text-gray-400">{product.min_stock}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-500 dark:text-gray-400">Rs. {Number(product.purchase_price).toFixed(2)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-700 dark:text-gray-300">Rs. {stockValue.toFixed(2)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                {isLowStock ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"><AlertTriangle size={12} /> Low</span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"><Boxes size={12} /> In Stock</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <Link href={`/dashboard/inventory/${product.id}`} className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 px-3 py-1.5 rounded-md transition-colors">
                                                    <Pencil size={14} /> Update
                                                </Link>
                                            </td>
                                        </tr>
                                    )
                                })
                            ) : (
                                <tr><td colSpan={8} className="px-6 py-16 text-center text-gray-500 dark:text-gray-400"><PackageSearch className="mx-auto mb-4 text-gray-300 dark:text-gray-600" size={40} />{t.inventory.no_data}</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}