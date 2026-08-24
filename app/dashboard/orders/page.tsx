import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/currency'
import { getCurrentShopContext, requireShopModule } from '@/lib/shop-context'
import { addOrderItem, createOrder, payRestaurantOrder, removeOrderItem, updateOrderStatus } from '../industry-actions'

type Item = { id: string; order_id: string; quantity: number; notes: string | null; products: { name: string } | { name: string }[] | null }
const fieldClass = 'mt-1 w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm dark:border-gray-700 dark:bg-gray-800'
const labelClass = 'text-xs font-semibold uppercase tracking-wide text-gray-500'

export default async function OrdersPage() {
    const context = await getCurrentShopContext()
    requireShopModule(context, 'restaurant_orders')
    const supabase = await createClient()
    const [{ data: orders }, { data: tables }, { data: products }, { data: rawItems }] = await Promise.all([
        supabase.from('restaurant_orders').select('id,status,order_type,notes,table_id,sale_id,total_amount,created_at').order('created_at', { ascending: false }),
        supabase.from('restaurant_tables').select('id,name_or_number,status').neq('status', 'inactive').order('name_or_number'),
        supabase.from('products').select('id,name,selling_price').eq('is_active', true).gt('quantity', 0).order('name'),
        supabase.from('restaurant_order_items').select('id,order_id,quantity,notes,products(name)'),
    ])
    const items = (rawItems || []) as Item[]
    const tableName = new Map(tables?.map(table => [table.id, table.name_or_number]) || [])
    const money = (value: number) => formatCurrency(value, context.shop.currency)

    return <div className="space-y-6">
        <div><p className="text-sm font-semibold text-orange-600">ORDER TAKING</p><h1 className="text-2xl font-bold">Restaurant Orders</h1><p className="text-sm text-gray-500">Open dine-in or takeaway tickets, send them to kitchen, then collect payment.</p></div>
        <form action={createOrder} className="rounded-2xl border bg-white p-5 dark:bg-gray-900">
            <h2 className="mb-4 font-semibold">New order</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <label className={labelClass}>Service Type *<select name="order_type" className={fieldClass}><option value="dine_in">Dine-in</option><option value="takeaway">Takeaway</option></select></label>
                <label className={labelClass}>Table (dine-in)<select name="table_id" className={fieldClass}><option value="">Select a table</option>{tables?.filter(table => table.status === 'available').map(table => <option key={table.id} value={table.id}>{table.name_or_number}</option>)}</select></label>
                <label className={labelClass}>Guest Count<input name="guest_count" type="number" min="1" step="1" placeholder="e.g. 4" className={fieldClass} /></label><label className={labelClass}>Order Notes<input name="notes" placeholder="e.g. no onions" className={fieldClass} /></label>
            </div>
            <button className="mt-4 rounded-lg bg-orange-600 px-5 py-2.5 text-white">Create order</button>
        </form>
        {!orders?.length && <div className="rounded-2xl border border-dashed p-10 text-center text-gray-500">No orders yet. Create a dine-in or takeaway order above.</div>}
        <div className="space-y-4">{orders?.map(order => {
            const orderItems = items.filter(item => item.order_id === order.id)
            const open = !order.sale_id && order.status !== 'cancelled'
            return <article key={order.id} className="rounded-2xl border bg-white p-5 dark:bg-gray-900">
                <div className="flex flex-wrap justify-between gap-3">
                    <div><div className="flex flex-wrap items-center gap-2"><h2 className="font-bold">Order #{order.id.slice(0, 8)}</h2><span className="rounded-full bg-orange-100 px-2 py-1 text-xs font-semibold text-orange-700">{order.status.toUpperCase()}</span></div><p className="mt-1 text-sm text-gray-500">{order.order_type === 'dine_in' ? tableName.get(order.table_id) || 'Dine-in' : 'Takeaway'} · {new Date(order.created_at).toLocaleString()}{order.notes && ' · ' + order.notes}</p></div>
                    <div className="text-right"><p className="text-xs uppercase text-gray-500">Order total</p><p className="text-lg font-bold">{money(Number(order.total_amount || 0))}</p></div>
                </div>
                <div className="my-4 space-y-2">{orderItems.map(item => <div key={item.id} className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-800"><span><b>{item.quantity} ×</b> {Array.isArray(item.products) ? item.products[0]?.name : item.products?.name}{item.notes && <small className="ml-2 text-gray-500">{item.notes}</small>}</span>{open && <form action={removeOrderItem}><input type="hidden" name="id" value={item.id} /><button className="text-sm text-red-600">Remove</button></form>}</div>)}</div>
                {open && <form action={addOrderItem} className="grid gap-3 rounded-xl border p-4 md:grid-cols-[1fr_110px_1fr_auto] md:items-end">
                    <input type="hidden" name="order_id" value={order.id} />
                    <label className={labelClass}>Menu Item *<select name="product_id" required className={fieldClass}><option value="">Select item</option>{products?.map(product => <option key={product.id} value={product.id}>{product.name} · {money(product.selling_price)}</option>)}</select></label>
                    <label className={labelClass}>Quantity *<input name="quantity" type="number" min="1" step="1" required placeholder="1" className={fieldClass} /></label>
                    <label className={labelClass}>Item Notes<input name="notes" placeholder="e.g. extra spicy" className={fieldClass} /></label>
                    <button className="rounded-lg bg-gray-900 px-4 py-2.5 text-white dark:bg-gray-100 dark:text-gray-900">Add item</button>
                </form>}
                <div className="mt-4 flex flex-wrap justify-end gap-3">
                    {open && <form action={updateOrderStatus} className="flex gap-2"><input type="hidden" name="id" value={order.id} /><select name="status" defaultValue={order.status} className="rounded-lg border p-2.5"><option value="pending">New</option><option value="confirmed">Send to kitchen</option><option value="preparing">Preparing</option><option value="ready">Ready</option><option value="served">Served</option><option value="cancelled">Cancel order</option></select><button className="rounded-lg border px-4">Update status</button></form>}
                    {['ready', 'served'].includes(order.status) && !order.sale_id && <form action={payRestaurantOrder} className="flex gap-2"><input type="hidden" name="id" value={order.id} /><select name="payment_method" className="rounded-lg border p-2.5"><option value="cash">Cash</option><option value="card">Card</option><option value="bank">Bank transfer</option></select><button className="rounded-lg bg-emerald-600 px-4 text-white">Pay & open receipt</button></form>}
                    {order.sale_id && <span className="rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-700">Paid · table released</span>}
                </div>
            </article>
        })}</div>
    </div>
}