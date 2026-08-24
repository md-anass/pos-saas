import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { dictionaries } from '@/lib/dictionary'
import { Search, Eye, Truck, Plus } from 'lucide-react'
import { getCurrentShopContext, requireShopModule } from '@/lib/shop-context'

type PurchaseSummary = {
    id: string
    total_amount: number
    paid_amount: number | null
    created_at: string
    suppliers: { name: string } | null
}

export default async function PurchasesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
    const context = await getCurrentShopContext()
    requireShopModule(context, 'purchases')
    const supabase = await createClient()
    const params = await searchParams
    const cookieStore = await cookies()
    const lang = cookieStore.get('lang')?.value || 'en'
    const t = dictionaries[lang]

    // Fetch all purchases with supplier join
    const { data: purchaseData } = await supabase
        .from('purchases')
        .select('id, total_amount, paid_amount, created_at, suppliers(name)')
        .order('created_at', { ascending: false })

    let purchases = purchaseData as PurchaseSummary[] | null

    // Client-side filter for lightning-fast search by supplier name
    // Limit query to 100 characters to prevent excessive query size abuse
    const query = params.q?.toLowerCase().slice(0, 100) || ''
    if (query && purchases) {
        purchases = purchases.filter((purchase) => purchase.suppliers?.name?.toLowerCase().includes(query))
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t.purchases.title}</h1>
                <Link href="/dashboard/purchases/new" className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-all hover:scale-[1.02] shadow-md shadow-blue-600/20">
                    <Plus size={20} /> {t.purchases.record_new}
                </Link>
            </div>

            {/* Premium Search Bar */}
            <form className="relative max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                    type="text"
                    name="q"
                    defaultValue={params.q || ''}
                    placeholder="Search by supplier name..."
                    className="w-full pl-11 pr-4 py-3 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
                />
            </form>

            {/* Premium Table Container */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4 text-left w-16">#</th>
                                <th className="px-6 py-4 text-left">{t.purchases.purchase_id}</th>
                                <th className="px-6 py-4 text-left">{t.purchases.supplier}</th>
                                <th className="px-6 py-4 text-left">{t.sales.date}</th>
                                <th className="px-6 py-4 text-left">{t.sales.total_amount}</th>
                                <th className="px-6 py-4 text-left">Paid / Due</th>
                                <th className="px-6 py-4 text-right">{t.common.actions}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                            {purchases && purchases.length > 0 ? (
                                purchases.map((pur, index) => {
                                    const due = (pur.total_amount || 0) - (pur.paid_amount || 0)
                                    return (
                                        <tr key={pur.id} className="group hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">

                                            <td className="px-6 py-4 text-gray-400 font-medium">{index + 1}</td>

                                            <td className="px-6 py-4 whitespace-nowrap font-medium text-blue-600 dark:text-blue-400 hover:underline">
                                                <Link href={`/dashboard/purchases/${pur.id}`} className="flex items-center gap-2">
                                                    <Eye size={14} /> {pur.id.substring(0, 8)}...
                                                </Link>
                                            </td>

                                            <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900 dark:text-white">
                                                <span className="flex items-center gap-2 mt-2">
                                                    <Truck size={14} className="text-gray-400" /> {pur.suppliers?.name || t.purchases.unknown_supplier}
                                                </span>
                                            </td>

                                            <td className="px-6 py-4 whitespace-nowrap text-gray-500 dark:text-gray-400">
                                                {new Date(pur.created_at).toLocaleDateString()}
                                            </td>

                                            <td className="px-6 py-4 whitespace-nowrap font-bold text-gray-900 dark:text-white">
                                                <span dir="ltr">Rs. {Number(pur.total_amount || 0).toFixed(2)}</span>
                                            </td>

                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-xs font-medium text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400 px-2 py-1 rounded-full mr-1">Paid: {Number(pur.paid_amount || 0).toFixed(0)}</span>
                                                {due > 0 && (
                                                    <span className="text-xs font-medium text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400 px-2 py-1 rounded-full">Due: {due.toFixed(0)}</span>
                                                )}
                                            </td>

                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <Link href={`/dashboard/purchases/${pur.id}`} className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 px-3 py-1.5 rounded-md transition-colors border border-gray-200 dark:border-gray-700">
                                                    <Eye size={14} /> View
                                                </Link>
                                            </td>

                                        </tr>
                                    )
                                })
                            ) : (
                                <tr>
                                    <td colSpan={7} className="px-6 py-16 text-center text-gray-500 dark:text-gray-400">
                                        <Truck className="mx-auto mb-4 text-gray-300 dark:text-gray-600" size={40} />
                                        {t.purchases.no_purchases}
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
