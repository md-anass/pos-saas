import Link from 'next/link'
import { formatCurrency } from '@/lib/currency'
import { adjustOrderItem, payRestaurantOrder } from '../industry-actions'
import OrderCatalog from './[id]/OrderCatalog'

type Product = { id: string; name: string; selling_price: number; category_id: string | null }
type Category = { id: string; name: string }
type Deal = { id: string; name: string; deal_price: number; summary: string }
type OrderItem = { id: string; product_id: string; quantity: number; unit_price: number; notes: string | null; products: { name: string } | { name: string }[] | null }
type Order = { id: string; order_number: number; status: string; order_type: string; guest_count: number | null; notes: string | null; total_amount: number; sale_id: string | null; restaurant_tables: { name_or_number: string } | { name_or_number: string }[] | null }

export default function RestaurantPOSWorkspace({ order, items, products, categories, deals, currency }: { order: Order; items: OrderItem[]; products: Product[]; categories: Category[]; deals: Deal[]; currency: string }) {
    const open = !order.sale_id && order.status === 'pending'
    const table = Array.isArray(order.restaurant_tables) ? order.restaurant_tables[0] : order.restaurant_tables
    const money = (value: number) => formatCurrency(value, currency)
    return <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <OrderCatalog orderId={order.id} products={products} categories={categories} deals={deals} currency={currency} />
        <aside className="h-fit rounded-2xl border bg-white p-4 shadow-sm dark:bg-gray-900 lg:sticky lg:top-24">
            <div className="flex items-start justify-between gap-3 border-b pb-3"><div><p className="text-xs font-bold uppercase tracking-wider text-orange-600">Active cart</p><h2 className="text-lg font-black">Order #{order.order_number}</h2><p className="text-sm text-gray-500">{order.order_type === 'takeaway' ? 'Takeaway' : `Dine-in${table?.name_or_number ? ` · ${table.name_or_number}` : ''}`}{order.guest_count ? ` · ${order.guest_count} guests` : ''}</p></div><span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-bold uppercase text-orange-700">{open ? 'Open' : 'Paid'}</span></div>
            {order.notes && <p className="my-3 rounded-lg bg-yellow-50 p-2 text-xs">Note: {order.notes}</p>}
            {!items.length && <p className="py-8 text-center text-sm text-gray-500">Add menu items or a deal to begin.</p>}
            <div className="my-3 space-y-2">{items.map(item => { const name = Array.isArray(item.products) ? item.products[0]?.name : item.products?.name; const deal = item.notes?.startsWith('Deal:'); return <div key={item.id} className="rounded-lg border p-2"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-sm font-semibold">{deal && <span className="mr-1 rounded bg-orange-100 px-1 text-[10px] text-orange-700">DEAL</span>}{name}</p><p className="text-xs text-gray-500">{money(Number(item.unit_price))} each{deal ? ` · ${item.notes}` : ''}</p></div><b className="shrink-0 text-sm">{money(Number(item.quantity) * Number(item.unit_price))}</b></div>{open && <div className="mt-2 flex items-center justify-end gap-2"><form action={adjustOrderItem}><input type="hidden" name="order_id" value={order.id} /><input type="hidden" name="product_id" value={item.product_id} /><input type="hidden" name="delta" value="-1" /><button aria-label={`Decrease ${name}`} className="h-7 w-7 rounded border">-</button></form><span className="min-w-5 text-center text-sm font-bold">{item.quantity}</span><form action={adjustOrderItem}><input type="hidden" name="order_id" value={order.id} /><input type="hidden" name="product_id" value={item.product_id} /><input type="hidden" name="delta" value="1" /><button aria-label={`Increase ${name}`} className="h-7 w-7 rounded border">+</button></form></div>}</div> })}</div>
            <div className="border-t pt-3"><div className="flex justify-between text-lg font-black"><span>Total</span><span>{money(Number(order.total_amount || 0))}</span></div>{open && items.length > 0 && <form action={payRestaurantOrder} className="mt-3 grid gap-2"><input type="hidden" name="id" value={order.id} /><select name="payment_method" className="rounded-lg border p-2.5"><option value="cash">Cash</option><option value="card">Card</option><option value="bank">Bank transfer</option></select><button className="rounded-lg bg-emerald-600 px-4 py-3 font-bold text-white">Pay / Checkout</button></form>}{order.sale_id && <Link href={`/dashboard/sales/${order.sale_id}/receipt`} className="mt-3 block rounded-lg bg-emerald-600 px-4 py-3 text-center font-bold text-white">View / print receipt</Link>}</div>
        </aside>
    </section>
}