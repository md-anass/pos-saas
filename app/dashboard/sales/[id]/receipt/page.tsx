import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import ReceiptPrintButton from './ReceiptPrintButton'
import AutoPrintReceipt from './AutoPrintReceipt'
import { getCurrentShopContext, requireShopModule } from '@/lib/shop-context'
import { formatCurrency } from '@/lib/currency'
import { formatRestaurantDate } from '@/lib/date-format'

export default async function ThermalReceiptPage({ params, searchParams }: { params: Promise<{ id: string }>, searchParams?: Promise<{ autoprint?: string | string[] }> }) {
    const context = await getCurrentShopContext()
    requireShopModule(context, 'sales')
    const { id } = await params
    const query = searchParams ? await searchParams : undefined
    const autoPrint = query?.autoprint === '1'
    const supabase = await createClient()
    const { data: sale } = await supabase.from('sales').select('*').eq('id', id).single()
    if (!sale) return <div className="p-8">Receipt not found.</div>
    const [{ data: items }, { data: restaurantOrder }, { data: shop }, { data: accounts }, { data: payment }] = await Promise.all([
        supabase.from('sale_items').select('*').eq('sale_id', id),
        supabase.from('restaurant_orders').select('order_number,order_type,restaurant_tables(name_or_number)').eq('sale_id', id).maybeSingle(),
        supabase.from('shops').select('name,subtitle,address,phone,email,currency,invoice_note').eq('id', sale.shop_id).single(),
        supabase.from('accounts').select('name,type,provider_name,account_number').eq('shop_id', sale.shop_id).in('type', ['bank', 'wallet']),
        supabase.from('payments').select('amount,method').eq('sale_id', id).single(),
    ])
    const money = (value: number) => formatCurrency(value, shop?.currency || context.shop.currency)
    const received = payment?.amount || 0
    const change = received - sale.total_amount
    const table = restaurantOrder?.restaurant_tables && (Array.isArray(restaurantOrder.restaurant_tables) ? restaurantOrder.restaurant_tables[0] : restaurantOrder.restaurant_tables)

    return <div id="receipt-page" className="flex min-h-screen flex-col items-center justify-center bg-gray-100 p-4 dark:bg-gray-950">
        <AutoPrintReceipt enabled={autoPrint} />
        <div className="no-print mb-4 flex gap-2"><ReceiptPrintButton /><Link href={`/dashboard/sales/${sale.id}`} className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 dark:border-gray-700 dark:text-white">View Full Invoice</Link></div>
        <div id="receipt-capture" className="w-[80mm] bg-white p-4 font-mono text-xs text-black">
            <div className="mb-4 text-center"><h2 className="text-lg font-bold uppercase">{shop?.name}</h2>{shop?.subtitle && <p>{shop.subtitle}</p>}{shop?.address && <p className="whitespace-pre-line">{shop.address}</p>}{shop?.phone && <p>Phone: {shop.phone}</p>}{shop?.email && <p>{shop.email}</p>}</div>
            <div className="mb-2 border-y border-dashed border-gray-400 py-2"><p>Receipt: #{restaurantOrder?.order_number || sale.id.substring(0, 8).toUpperCase()}</p><p>Date: {formatRestaurantDate(sale.created_at)}</p>{restaurantOrder && <p>{restaurantOrder.order_type === 'takeaway' ? 'Takeaway' : `Dine-in: ${table?.name_or_number || 'Table'}`}</p>}<p>Customer: {sale.customer_name}</p></div>
            <table className="mb-2 w-full"><thead><tr className="border-b border-dashed border-gray-400"><th className="pb-1 text-left">Item</th><th className="pb-1 text-center">Qty</th><th className="pb-1 text-right">Total</th></tr></thead><tbody>{items?.map(item => <tr key={item.id}><td className="py-1">{item.product_name}</td><td dir="ltr" className="py-1 text-center">{item.quantity}</td><td dir="ltr" className="py-1 text-right">{money(item.total_price)}</td></tr>)}</tbody></table>
            <div className="space-y-1 border-t border-dashed border-gray-400 pt-2"><div className="flex justify-between"><span>Subtotal:</span><span dir="ltr">{money(sale.subtotal)}</span></div>{sale.discount > 0 && <div className="flex justify-between"><span>Discount:</span><span dir="ltr">- {money(sale.discount)}</span></div>}<div className="flex justify-between border-t border-dashed border-gray-400 pt-1 text-sm font-bold"><span>TOTAL:</span><span dir="ltr">{money(sale.total_amount)}</span></div></div>
            {payment && <div className="mt-2 space-y-1 border-t border-dashed border-gray-400 pt-2"><div className="flex justify-between"><span>Paid ({payment.method}):</span><span dir="ltr">{money(received)}</span></div><div className="flex justify-between font-bold"><span>Change:</span><span dir="ltr">{money(change)}</span></div></div>}
            <div className="mt-4 border-t border-dashed border-gray-400 pt-2 text-center">{accounts && accounts.length > 0 && <div className="mb-2 text-left"><p className="mb-1 font-bold">Payment Methods:</p>{accounts.map((account, index) => <p key={index}>{account.provider_name || account.name}: {account.account_number}</p>)}</div>}<p>{shop?.invoice_note || 'Thank you for your business!'}</p></div>
        </div>
    </div>
}