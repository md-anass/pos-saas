import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import ReceiptPrintButton from './ReceiptPrintButton'
import { getCurrentShopContext, requireShopModule } from '@/lib/shop-context'
import { formatCurrency } from '@/lib/currency'

export default async function ThermalReceiptPage({ params }: { params: Promise<{ id: string }> }) {
    const context = await getCurrentShopContext()
    requireShopModule(context, 'sales')
    const { id } = await params
    const supabase = await createClient()

    const { data: sale } = await supabase.from('sales').select('*').eq('id', id).single()
    if (!sale) return <div className="p-8">Receipt not found.</div>

    const { data: items } = await supabase.from('sale_items').select('*').eq('sale_id', id)

    // Fetch Shop Details & Accounts
    const { data: shop } = await supabase.from('shops').select('name, subtitle, address, phone, email, currency, invoice_note').eq('id', sale.shop_id).single()
    const money = (value: number) => formatCurrency(value, shop?.currency || context.shop.currency)
    const { data: accounts } = await supabase.from('accounts').select('name, type, provider_name, account_number').eq('shop_id', sale.shop_id).in('type', ['bank', 'wallet'])
    const { data: payment } = await supabase.from('payments').select('amount, method').eq('sale_id', id).single()

    const received = payment?.amount || 0
    const change = received - sale.total_amount

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-950 flex flex-col items-center justify-center p-4">
            <div className="no-print mb-4 flex gap-2">
                <ReceiptPrintButton />
                <Link href={`/dashboard/sales/${sale.id}`} className="px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-white rounded-md text-sm">View Full Invoice</Link>
            </div>

            {/* 80mm Thermal Receipt Layout */}
            <div id="receipt-capture" className="bg-white text-black p-4 w-[80mm] font-mono text-xs">
                <div className="text-center mb-4">
                    <h2 className="font-bold text-lg uppercase">{shop?.name}</h2>
                    {shop?.subtitle && <p>{shop.subtitle}</p>}
                    {shop?.address && <p className="whitespace-pre-line">{shop.address}</p>}
                    {shop?.phone && <p>Phone: {shop.phone}</p>}
                    {shop?.email && <p>{shop.email}</p>}
                </div>

                <div className="border-t border-b border-dashed border-gray-400 py-2 mb-2">
                    <p>Invoice: #{sale.id.substring(0, 8).toUpperCase()}</p>
                    <p>Date: {new Date(sale.created_at).toLocaleString()}</p>
                    <p>Customer: {sale.customer_name}</p>
                </div>

                <table className="w-full mb-2">
                    <thead>
                        <tr className="border-b border-dashed border-gray-400">
                            <th className="text-left pb-1">Item</th>
                            <th className="text-center pb-1">Qty</th>
                            <th className="text-right pb-1">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items?.map(item => (
                            <tr key={item.id}>
                                <td className="py-1">{item.product_name}</td>
                                <td dir="ltr" className="text-center py-1">{item.quantity}</td>
                                <td dir="ltr" className="text-right py-1">{money(item.total_price)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="border-t border-dashed border-gray-400 pt-2 space-y-1">
                    <div className="flex justify-between"><span>Subtotal:</span><span dir="ltr">{money(sale.subtotal)}</span></div>
                    {sale.discount > 0 && <div className="flex justify-between"><span>Discount:</span><span dir="ltr">- {money(sale.discount)}</span></div>}
                    {sale.delivery_charges > 0 && <div className="flex justify-between"><span>Delivery:</span><span dir="ltr">+ {money(sale.delivery_charges)}</span></div>}
                    <div className="flex justify-between font-bold text-sm border-t border-dashed border-gray-400 pt-1"><span>TOTAL:</span><span dir="ltr">{money(sale.total_amount)}</span></div>
                </div>

                {payment && (
                    <div className="mt-2 pt-2 border-t border-dashed border-gray-400 space-y-1">
                        <div className="flex justify-between"><span>Paid ({payment.method}):</span><span dir="ltr">{money(received)}</span></div>
                        <div className="flex justify-between font-bold"><span>Change:</span><span dir="ltr">{money(change)}</span></div>
                    </div>
                )}

                <div className="text-center mt-4 pt-2 border-t border-dashed border-gray-400">
                    {accounts && accounts.length > 0 && (
                        <div className="text-left mb-2">
                            <p className="font-bold mb-1">Payment Methods:</p>
                            {accounts.map((acc, i) => (
                                <p key={i} className="text-xs">{acc.provider_name || acc.name}: {acc.account_number}</p>
                            ))}
                        </div>
                    )}
                    <p>{shop?.invoice_note || 'Thank you for your business!'}</p>
                </div>
            </div>
        </div>
    )
}