import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/currency'
import { getCurrentShopContext, requireShopModule } from '@/lib/shop-context'
import { adjustOrderItem, payRestaurantOrder } from '../../industry-actions'
import OrderCatalog from './OrderCatalog'

type Item = {
    id: string
    product_id: string
    quantity: number
    unit_price: number
    notes: string | null
    products: { name: string } | { name: string }[] | null
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const context = await getCurrentShopContext()
    requireShopModule(context, 'restaurant_orders')
    const db = await createClient()
    const [{ data: order }, { data: orderItems }, { data: products }, { data: categories }, { data: deals }] = await Promise.all([
        db.from('restaurant_orders').select('id,order_number,status,order_type,guest_count,notes,total_amount,sale_id,created_at,restaurant_tables(name_or_number)').eq('id', id).single(),
        db.from('restaurant_order_items').select('id,product_id,quantity,unit_price,notes,products(name)').eq('order_id', id).order('created_at'),
        db.from('products').select('id,name,selling_price,category_id').eq('is_active', true).gt('quantity', 0).order('name'),
        db.from('categories').select('id,name').order('name'),
        db.from('restaurant_deals').select('id,name,deal_price,restaurant_deal_items(quantity,products(name))').eq('is_active', true).order('name'),
    ])
    if (!order) notFound()

    const items = (orderItems || []) as Item[]
    const open = !order.sale_id && order.status === 'pending'
    const money = (value: number) => formatCurrency(value, context.shop.currency)
    const table = Array.isArray(order.restaurant_tables) ? order.restaurant_tables[0] : order.restaurant_tables

    return <div className="space-y-5">
        <header className="flex flex-wrap justify-between gap-3">
            <div>
                <Link href="/dashboard/orders" className="text-sm text-orange-600">← All orders</Link>
                <h1 className="text-2xl font-black">Order #{order.order_number}</h1>
                <p className="text-sm text-gray-500">{order.order_type === 'takeaway' ? 'TAKEAWAY' : table?.name_or_number || 'Dine-in'}{order.guest_count ? ` · ${order.guest_count} guests` : ''}</p>
            </div>
            <div className="text-right">
                <b className="rounded-full bg-orange-100 px-3 py-1 text-xs uppercase text-orange-700">{open ? 'Open' : 'Paid'}</b>
                <p className="mt-2 text-2xl font-black">{money(Number(order.total_amount || 0))}</p>
            </div>
        </header>
        {order.notes && <p className="rounded-xl bg-yellow-50 p-3">Order note: {order.notes}</p>}
        <section className="rounded-2xl border p-4">
            <h2 className="mb-3 font-bold">Order items</h2>
            {!items.length && <p className="text-sm text-gray-500">Add menu items or a deal to prepare the bill.</p>}
            <div className="space-y-2">{items.map((item) => {
                const name = Array.isArray(item.products) ? item.products[0]?.name : item.products?.name
                return <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                    <div><b>{item.quantity} × {name}</b><p className="text-xs text-gray-500">{money(item.unit_price)}{item.notes ? ` · ${item.notes}` : ''}</p></div>
                    <div className="flex items-center gap-2">
                        <b>{money(Number(item.quantity) * Number(item.unit_price))}</b>
                        {open && <>
                            <form action={adjustOrderItem}><input type="hidden" name="order_id" value={id}/><input type="hidden" name="product_id" value={item.product_id}/><input type="hidden" name="delta" value="-1"/><button aria-label={`Remove one ${name}`} className="h-8 w-8 rounded border">−</button></form>
                            <span className="min-w-6 text-center font-bold">{item.quantity}</span>
                            <form action={adjustOrderItem}><input type="hidden" name="order_id" value={id}/><input type="hidden" name="product_id" value={item.product_id}/><input type="hidden" name="delta" value="1"/><button aria-label={`Add one ${name}`} className="h-8 w-8 rounded border">+</button></form>
                        </>}
                    </div>
                </div>
            })}</div>
        </section>
        {open && <OrderCatalog orderId={id} products={products || []} categories={categories || []} deals={(deals || []).map((deal) => ({ id: deal.id, name: deal.name, deal_price: deal.deal_price, summary: (deal.restaurant_deal_items || []).map((item) => { const product = Array.isArray(item.products) ? item.products[0] : item.products; return `${item.quantity} × ${product?.name || 'Item'}` }).join(', ') }))} currency={context.shop.currency}/>}
        <section className="flex flex-wrap justify-end gap-2 rounded-2xl border p-4">
            {open && items.length > 0 && <form action={payRestaurantOrder} className="flex"><input type="hidden" name="id" value={id}/><select name="payment_method" className="rounded-l-lg border p-2.5"><option value="cash">Cash</option><option value="card">Card</option><option value="bank_transfer">Bank</option></select><button className="rounded-r-lg bg-emerald-600 px-4 text-white">Generate bill & pay</button></form>}
            {order.sale_id && <Link href={`/dashboard/sales/${order.sale_id}/receipt`} className="rounded-lg bg-emerald-600 px-4 py-2.5 text-white">View / print receipt</Link>}
        </section>
    </div>
}
