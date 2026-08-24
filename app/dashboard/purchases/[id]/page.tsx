import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { dictionaries } from '@/lib/dictionary'
import { getCurrentShopContext, requireShopModule } from '@/lib/shop-context'

type NamedRelation = { name: string } | null

type PurchaseDetails = {
    id: string
    total_amount: number
    paid_amount: number | null
    discount: number | null
    created_at: string
    notes: string | null
    invoice_url: string | null
    suppliers: NamedRelation
    locations: NamedRelation
}

type PurchaseItem = {
    quantity: number
    unit_price: number
    total_price: number
    batch_number: string | null
    expiry_date: string | null
    products: NamedRelation
}

export default async function PurchaseDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const context = await getCurrentShopContext()
    requireShopModule(context, 'purchases')
    const { id } = await params
    const supabase = await createClient()

    const cookieStore = await cookies()
    const lang = cookieStore.get('lang')?.value || 'en'
    const t = dictionaries[lang]

    const { data: purchaseData } = await supabase
        .from('purchases')
        .select(`
      id, total_amount, paid_amount, discount, created_at, notes, invoice_url,
      suppliers(name),
      locations(name)
    `)
        .eq('id', id)
        .single()

    const purchase = purchaseData as PurchaseDetails | null

    if (!purchase) {
        return <div className="p-8 text-gray-900 dark:text-white">Purchase not found.</div>
    }

    // Fetch Purchase Items (joining products table to get the name securely)
    const { data: itemData } = await supabase
        .from('purchase_items')
        .select(`
      quantity, unit_price, total_price, batch_number, expiry_date,
      products(name)
    `)
        .eq('purchase_id', id)

    const items = itemData as PurchaseItem[] | null
    const hasBatchDetails = items?.some((item) => item.batch_number) ?? false

    const dueAmount = (purchase.total_amount || 0) - (purchase.paid_amount || 0)

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex justify-between items-center no-print">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t.purchases.record_title}</h1>
                <Link href="/dashboard/purchases" className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 px-4 py-2 border rounded-md">
                    ← {t.purchases.title}
                </Link>
            </div>

            <div className="bg-white dark:bg-gray-900 p-8 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
                {/* Header Info */}
                <div className="flex justify-between border-b border-gray-200 dark:border-gray-800 pb-6 mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{purchase.suppliers?.name || t.purchases.unknown_supplier}</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Date: {new Date(purchase.created_at).toLocaleString()}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Location: {purchase.locations?.name || 'N/A'}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Purchase ID</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">#{purchase.id.substring(0, 8).toUpperCase()}</p>
                        {purchase.invoice_url && (
                            <a href={purchase.invoice_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 text-xs hover:underline mt-2 inline-block">
                                View Attached Invoice
                            </a>
                        )}
                    </div>
                </div>

                {/* Items Table */}
                <table className="w-full text-sm mb-6">
                    <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-800 text-left text-gray-500 dark:text-gray-400">
                            <th className="pb-2">{t.sales.product}</th>
                            <th className="pb-2 text-center">{t.sales.qty}</th>
                            <th className="pb-2 text-right">{t.sales.price}</th>
                            <th className="pb-2 text-right">{t.sales.total}</th>
                            {hasBatchDetails && <th className="pb-2 text-right">Batch / Expiry</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {items?.map((item, idx) => (
                            <tr key={idx} className="border-b border-gray-100 dark:border-gray-800">
                                <td className="py-3 text-gray-900 dark:text-white">{item.products?.name || 'Unknown Product'}</td>
                                <td className="py-3 text-center text-gray-600 dark:text-gray-400">{item.quantity}</td>
                                <td className="py-3 text-right text-gray-600 dark:text-gray-400">Rs. {item.unit_price.toFixed(2)}</td>
                                <td className="py-3 text-right font-medium text-gray-900 dark:text-white">Rs. {item.total_price.toFixed(2)}</td>
                                {hasBatchDetails && (
                                    <td className="py-3 text-right text-xs text-gray-500 dark:text-gray-400">
                                        {item.batch_number || '-'} {item.expiry_date ? `(${new Date(item.expiry_date).toLocaleDateString()})` : ''}
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Totals */}
                <div className="flex justify-end">
                    <div className="w-full max-w-xs space-y-2">
                        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                            <span>{t.sales.subtotal}</span>
                            <span>Rs. {(purchase.total_amount + (purchase.discount || 0)).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                            <span>{t.purchases.discount}</span>
                            <span>- Rs. {(purchase.discount || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-white border-t border-gray-200 dark:border-gray-800 pt-2 mt-2">
                            <span>{t.sales.total}</span>
                            <span>Rs. {(purchase.total_amount || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                            <span>{t.purchases.paid_amount}</span>
                            <span>Rs. {(purchase.paid_amount || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-red-600 dark:text-red-400">
                            <span>{t.purchases.due_amount}</span>
                            <span>Rs. {dueAmount.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* Notes */}
                {purchase.notes && (
                    <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800">
                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{purchase.notes}</p>
                    </div>
                )}
            </div>
        </div>
    )
}