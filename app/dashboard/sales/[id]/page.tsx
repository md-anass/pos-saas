import { createClient } from '@/lib/supabase/server'
import PrintButton from './PrintButton'
import InvoiceActions from './InvoiceActions'
import Link from 'next/link'
import { getCurrentShopContext, requireShopModule } from '@/lib/shop-context'
import { formatCurrency } from '@/lib/currency'

export default async function InvoicePage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const context = await getCurrentShopContext()
    requireShopModule(context, 'sales')
    const { id } = await params
    const supabase = await createClient()

    const { data: sale } = await supabase.from('sales').select('*').eq('id', id).single()
    if (!sale) return <div className="p-8">Invoice not found.</div>

    const { data: items } = await supabase.from('sale_items').select('*').eq('sale_id', id)

    // Fetch Shop Details (Including Phone & Email)
    const { data: shop } = await supabase
        .from('shops')
        .select('name, currency, logo_url, subtitle, address, phone, email, invoice_note')
        .eq('id', sale.shop_id)
        .single()
    const money = (value: number) => formatCurrency(value, shop?.currency || context.shop.currency)

    // Fetch Payment Record
    const { data: payment } = await supabase.from('payments').select('amount, method').eq('sale_id', id).single()
    const receivedAmount = payment?.amount || 0
    const changeAmount = receivedAmount - sale.total_amount

    // Fetch Bank/Wallet Accounts for Invoice Footer
    const { data: accounts } = await supabase
        .from('accounts')
        .select('name, type, provider_name, account_number')
        .eq('shop_id', sale.shop_id)
        .in('type', ['bank', 'wallet'])

    const simpleItems = items?.map(i => ({ product_name: i.product_name, quantity: i.quantity, unit_price: i.unit_price })) || []

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex flex-wrap justify-between items-center gap-4 no-print">
                <h1 className="text-2xl font-bold text-gray-800">Invoice</h1>
                <div className="flex flex-wrap gap-2">
                    <Link href="/dashboard/sales" className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2 border rounded-md">← Back to Sales</Link>
                    {sale.status !== 'quotation' && (
                        <Link href={`/dashboard/sales/${sale.id}/return`} className="text-sm text-white bg-orange-600 hover:bg-orange-700 px-4 py-2 rounded-md">Process Return</Link>
                    )}
                    <PrintButton />
                    <InvoiceActions saleId={sale.id} totalAmount={sale.total_amount} shopName={shop?.name || 'Store'} items={simpleItems} />
                </div>
            </div>

            <div id="invoice-capture" className="bg-white text-gray-900 p-8 rounded-lg shadow-sm border">
                {/* Invoice Header */}
                <div className="flex justify-between border-b pb-6 mb-6">
                    <div className="flex gap-4 items-start">
                        {shop?.logo_url && <img src={shop.logo_url} alt="Logo" className="w-20 h-20 object-contain" />}
                        <div>
                            <h2 className="text-2xl font-bold">{shop?.name}</h2>
                            {shop?.subtitle && <p className="text-sm text-gray-500 mt-1">{shop.subtitle}</p>}
                            {shop?.address && <p className="text-sm text-gray-500 mt-1 whitespace-pre-line">{shop.address}</p>}
                            {shop?.phone && <p className="text-sm text-gray-500 mt-1">Phone: {shop.phone}</p>}
                            {shop?.email && <p className="text-sm text-gray-500 mt-1">Email: {shop.email}</p>}
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-lg font-bold uppercase">{sale.status}</p>
                        <p className="text-sm text-gray-500 mt-1">#: {sale.id.substring(0, 8).toUpperCase()}</p>
                        <p className="text-sm text-gray-500">Date: {new Date(sale.created_at).toLocaleString()}</p>
                    </div>
                </div>

                {/* Bill To */}
                <div className="mb-6">
                    <p className="text-xs font-medium text-gray-500 uppercase">Bill To</p>
                    <p className="text-sm font-medium text-gray-900">{sale.customer_name}</p>
                </div>

                {/* Items Table */}
                <table className="w-full text-sm mb-6">
                    <thead>
                        <tr className="border-b text-left text-gray-500">
                            <th className="pb-2">Product</th>
                            <th className="pb-2 text-center">Qty</th>
                            <th className="pb-2 text-right">Price</th>
                            <th className="pb-2 text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items?.map((item) => (
                            <tr key={item.id} className="border-b">
                                <td className="py-3 text-gray-900">{item.product_name}</td>
                                <td dir="ltr" className="py-3 text-center text-gray-600">{item.quantity}</td>
                                <td dir="ltr" className="py-3 text-right text-gray-600">{money(item.unit_price)}</td>
                                <td dir="ltr" className="py-3 text-right font-medium text-gray-900">{money(item.total_price)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Totals */}
                <div className="flex justify-end">
                    <div className="w-full max-w-xs space-y-2">
                        <div className="flex justify-between text-sm text-gray-600"><span>Subtotal</span><span dir="ltr">{money(sale.subtotal)}</span></div>
                        <div className="flex justify-between text-sm text-gray-600"><span>Discount</span><span dir="ltr">- {money(sale.discount)}</span></div>
                        {sale.delivery_charges > 0 && <div className="flex justify-between text-sm text-gray-600"><span>Delivery</span><span dir="ltr">+ {money(sale.delivery_charges)}</span></div>}
                        <div className="flex justify-between text-sm text-gray-600"><span>Tax</span><span dir="ltr">+ {money(sale.tax)}</span></div>
                        <div className="flex justify-between text-lg font-bold text-gray-900 border-t pt-2 mt-2"><span>Total</span><span dir="ltr">{money(sale.total_amount)}</span></div>

                        {payment && (
                            <div className="mt-4 pt-4 border-t">
                                <div className="flex justify-between text-sm text-gray-600"><span>Received ({payment.method})</span><span dir="ltr">{money(receivedAmount)}</span></div>
                                <div className="flex justify-between text-sm font-bold text-green-600 mt-1"><span>Change / Return</span><span dir="ltr">{money(changeAmount)}</span></div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer & Payment Methods */}
                <div className="mt-8 pt-6 border-t">
                    {accounts && accounts.length > 0 && (
                        <div className="mb-4">
                            <p className="text-xs font-bold text-gray-500 uppercase mb-2">Payment Methods</p>
                            <div className="flex flex-wrap gap-4">
                                {accounts.map((acc, i) => (
                                    <div key={i} className="text-xs text-gray-600 bg-gray-50 px-3 py-2 rounded border border-gray-100">
                                        <span className="font-bold">{acc.provider_name || acc.name}:</span> {acc.account_number}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    <p className="text-center text-xs text-gray-400">{shop?.invoice_note || 'Thank you for your business!'}</p>
                </div>
            </div>
        </div>
    )
}