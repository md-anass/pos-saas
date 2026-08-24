import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { dictionaries } from '@/lib/dictionary'
import { Eye, FileText, ReceiptText } from 'lucide-react'
import { getCurrentShopContext, requireShopModule } from '@/lib/shop-context'
import { formatCurrency } from '@/lib/currency'

export default async function SalesPage() {
    const context = await getCurrentShopContext()
    const money = (value: number) => formatCurrency(value, context.shop.currency)
    requireShopModule(context, 'sales')
    const supabase = await createClient()
    const cookieStore = await cookies()
    const lang = cookieStore.get('lang')?.value || 'en'
    const t = dictionaries[lang]

    const { data: sales } = await supabase
        .from('sales')
        .select('*')
        .order('created_at', { ascending: false })

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t.sales.title}</h1>
            </div>

            {/* Premium Table Container */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4 text-left w-16">#</th>
                                <th className="px-6 py-4 text-left">{t.sales.invoice_id}</th>
                                <th className="px-6 py-4 text-left">{t.sales.date}</th>
                                <th className="px-6 py-4 text-left">{t.sales.customer}</th>
                                <th className="px-6 py-4 text-left">{t.sales.total_amount}</th>
                                <th className="px-6 py-4 text-center">{t.sales.status}</th>
                                <th className="px-6 py-4 text-right">Print Options</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                            {sales && sales.length > 0 ? (
                                sales.map((sale, index) => (
                                    <tr key={sale.id} className="group hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">

                                        {/* Numbering */}
                                        <td className="px-6 py-4 text-gray-400 font-medium">
                                            {index + 1}
                                        </td>

                                        {/* Invoice ID */}
                                        <td className="px-6 py-4 whitespace-nowrap font-medium text-blue-600 dark:text-blue-400 hover:underline">
                                            <Link href={`/dashboard/sales/${sale.id}`} className="flex items-center gap-2">
                                                <Eye size={14} />
                                                {sale.id.substring(0, 8)}...
                                            </Link>
                                        </td>

                                        {/* Date */}
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-500 dark:text-gray-400">
                                            {new Date(sale.created_at).toLocaleDateString()}
                                        </td>

                                        {/* Customer */}
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white font-medium">
                                            {sale.customer_name}
                                        </td>

                                        {/* Total Amount */}
                                        <td className="px-6 py-4 whitespace-nowrap font-bold text-gray-900 dark:text-white">
                                            <span dir="ltr">{money(sale.total_amount)}</span>
                                        </td>

                                        {/* Status Pills */}
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${sale.status === 'completed'
                                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                                                    : sale.status === 'quotation'
                                                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400'
                                                        : 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400'
                                                }`}>
                                                {sale.status}
                                            </span>
                                        </td>

                                        {/* Print Actions (Invoice vs Receipt) */}
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="flex items-center gap-1.5 justify-end">
                                                {/* Full Invoice Button */}
                                                <Link
                                                    href={`/dashboard/sales/${sale.id}`}
                                                    className="inline-flex items-center gap-1 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 px-2.5 py-1.5 rounded-md transition-colors"
                                                    title="View / Print Full Invoice (A4)"
                                                >
                                                    <FileText size={14} /> <span className="hidden sm:inline">Invoice</span>
                                                </Link>

                                                {/* Thermal Receipt Button */}
                                                <Link
                                                    href={`/dashboard/sales/${sale.id}/receipt`}
                                                    className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 px-2.5 py-1.5 rounded-md transition-colors"
                                                    title="Print Thermal Receipt (80mm)"
                                                >
                                                    <ReceiptText size={14} /> <span className="hidden sm:inline">Receipt</span>
                                                </Link>
                                            </div>
                                        </td>

                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="px-6 py-16 text-center text-gray-500 dark:text-gray-400">
                                        <ReceiptText className="mx-auto mb-4 text-gray-300 dark:text-gray-600" size={40} />
                                        {t.sales.no_sales}
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
