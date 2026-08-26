import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { dictionaries } from '@/lib/dictionary'
import { Eye, FileText, ReceiptText } from 'lucide-react'
import { getCurrentShopContext, requireShopModule } from '@/lib/shop-context'
import { formatCurrency } from '@/lib/currency'
import RestaurantSalesUI from './RestaurantSalesUI'

export default async function SalesPage() {
    const context = await getCurrentShopContext()
    requireShopModule(context, 'sales')
    const supabase = await createClient()
    const lang = (await cookies()).get('lang')?.value || 'en'
    const t = dictionaries[lang]
    let salesQuery = supabase.from('sales').select('*').order('created_at', { ascending: false })
    if (context.shopType === 'restaurant') salesQuery = salesQuery.eq('status', 'completed')
    const { data: sales } = await salesQuery
    const restaurantOrders = context.shopType === 'restaurant' ? (await supabase.from('restaurant_orders').select('sale_id,order_number,order_type,restaurant_tables(name_or_number)').not('sale_id', 'is', null)).data || [] : []
    const payments = context.shopType === 'restaurant' ? (await supabase.from('payments').select('sale_id,method')).data || [] : []
    const orderBySale = new Map(restaurantOrders.map(order => [order.sale_id, order]))
    const paymentBySale = new Map(payments.map(payment => [payment.sale_id, payment]))
    const money = (value: number) => formatCurrency(value, context.shop.currency)
    if (String(context.shopType) === 'restaurant') {
        const restaurantSales = (sales || []).map(sale => {
            const order = orderBySale.get(sale.id)
            const payment = paymentBySale.get(sale.id)
            const table = order?.restaurant_tables && (Array.isArray(order.restaurant_tables) ? order.restaurant_tables[0] : order.restaurant_tables)
            return {
                id: sale.id,
                orderNumber: String(order?.order_number || sale.id.slice(0, 8)),
                createdAt: sale.created_at,
                orderType: order?.order_type === 'takeaway' ? 'takeaway' as const : 'dine_in' as const,
                tableName: table?.name_or_number || null,
                paymentMethod: payment?.method || 'Recorded',
                total: Number(sale.total_amount || 0),
            }
        })
        const today = new Date().toDateString()
        const todayRows = restaurantSales.filter(sale => new Date(sale.createdAt).toDateString() === today)
        return <RestaurantSalesUI
            sales={restaurantSales}
            todaySales={todayRows.reduce((total, sale) => total + sale.total, 0)}
            todayOrders={todayRows.length}
            dineInCount={todayRows.filter(sale => sale.orderType === 'dine_in').length}
            takeawayCount={todayRows.filter(sale => sale.orderType === 'takeaway').length}
        />
    }

    return <div className="space-y-6">
        <header><p className="text-sm font-semibold text-orange-600">{context.shopType === 'restaurant' ? 'RESTAURANT OPERATIONS' : 'SALES'}</p><h1 className="text-2xl font-bold">{context.shopType === 'restaurant' ? 'Restaurant Sales' : t.sales.title}</h1><p className="text-sm text-gray-500">{context.shopType === 'restaurant' ? 'Completed and paid orders only. Open orders remain in Orders.' : 'Review completed sales and receipts.'}</p></header>
        <div className="overflow-hidden rounded-xl border bg-white shadow-sm dark:bg-gray-900"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500 dark:bg-gray-800/50"><tr><th className="px-4 py-3">#</th><th className="px-4 py-3">{context.shopType === 'restaurant' ? 'Order / Receipt' : t.sales.invoice_id}</th><th className="px-4 py-3">Date / Time</th>{context.shopType === 'restaurant' && <><th className="px-4 py-3">Service</th><th className="px-4 py-3">Payment</th></>}<th className="px-4 py-3">{t.sales.total_amount}</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y dark:divide-gray-800">{sales?.length ? sales.map((sale, index) => { const order = orderBySale.get(sale.id); const payment = paymentBySale.get(sale.id); const table = order?.restaurant_tables && (Array.isArray(order.restaurant_tables) ? order.restaurant_tables[0] : order.restaurant_tables); return <tr key={sale.id}><td className="px-4 py-3 text-gray-400">{index + 1}</td><td className="px-4 py-3 font-semibold"><Link href={`/dashboard/sales/${sale.id}/receipt`} className="text-blue-600 hover:underline">{context.shopType === 'restaurant' ? `Order #${order?.order_number || sale.id.slice(0, 8)}` : `${sale.id.slice(0, 8)}...`}</Link></td><td className="whitespace-nowrap px-4 py-3 text-gray-500">{new Date(sale.created_at).toLocaleString()}</td>{context.shopType === 'restaurant' && <><td className="px-4 py-3">{order?.order_type === 'takeaway' ? 'Takeaway' : `Dine-in${table?.name_or_number ? ` · ${table.name_or_number}` : ''}`}</td><td className="px-4 py-3 capitalize">{payment?.method || 'Recorded'}</td></>}<td className="px-4 py-3 font-bold">{money(sale.total_amount)}</td><td className="px-4 py-3 text-right"><div className="flex justify-end gap-2"><Link href={`/dashboard/sales/${sale.id}`} title="View invoice" className="rounded border p-2"><Eye size={14} /></Link><Link href={`/dashboard/sales/${sale.id}/receipt`} title="View or print receipt" className="rounded border p-2 text-blue-600"><ReceiptText size={14} /></Link>{context.shopType !== 'restaurant' && <Link href={`/dashboard/sales/${sale.id}`} title="Invoice" className="rounded border p-2"><FileText size={14} /></Link>}</div></td></tr> }) : <tr><td colSpan={context.shopType === 'restaurant' ? 7 : 5} className="px-4 py-12 text-center text-gray-500">{context.shopType === 'restaurant' ? 'No completed Restaurant sales yet.' : t.sales.no_sales}</td></tr>}</tbody></table></div></div>
    </div>
}