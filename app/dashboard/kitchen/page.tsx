/* eslint-disable react-hooks/purity -- request-time status labels are computed in this server component */
import { createClient } from '@/lib/supabase/server'
import { getCurrentShopContext, requireShopModule } from '@/lib/shop-context'
import { updateOrderStatus } from '../industry-actions'

const statusStyle: Record<string, string> = {
    pending: 'border-red-500 bg-red-50 text-red-700 dark:bg-red-950/20',
    confirmed: 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950/20',
    preparing: 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/20',
    ready: 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20',
}

export default async function KitchenPage() {
    const context = await getCurrentShopContext()
    requireShopModule(context, 'kitchen')
    const supabase = await createClient()
    const [{ data: orders }, { data: tables }] = await Promise.all([
        supabase.from('restaurant_orders').select('id,status,notes,order_type,table_id,created_at,restaurant_order_items(quantity,notes,products(name))').in('status', ['pending', 'confirmed', 'preparing', 'ready']).order('created_at'),
        supabase.from('restaurant_tables').select('id,name_or_number'),
    ])
    const tableName = new Map(tables?.map(table => [table.id, table.name_or_number]) || [])
    const now = Date.now()

    return <div className="space-y-6">
        <div><p className="text-sm font-semibold text-orange-600">LIVE KITCHEN QUEUE</p><h1 className="text-2xl font-bold">Kitchen Display</h1><p className="text-sm text-gray-500">Oldest tickets appear first. Advance each ticket through preparation and service.</p></div>
        {!orders?.length && <div className="rounded-2xl border border-dashed p-12 text-center"><p className="font-semibold">Kitchen queue is clear</p><p className="text-sm text-gray-500">New orders sent to kitchen will appear here.</p></div>}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{orders?.map(order => {
            const elapsed = Math.max(0, Math.floor((now - new Date(order.created_at).getTime()) / 60000))
            return <article key={order.id} className={'rounded-2xl border-l-4 bg-white p-5 shadow-sm dark:bg-gray-900 ' + (statusStyle[order.status] || 'border-gray-400')}>
                <div className="flex items-start justify-between"><div><h2 className="font-bold">#{order.id.slice(0, 8)}</h2><p className="text-sm">{order.order_type === 'dine_in' ? tableName.get(order.table_id) || 'Dine-in' : 'Takeaway'}</p></div><div className="text-right"><span className="text-xs font-bold">{order.status === 'confirmed' ? 'NEW' : order.status.toUpperCase()}</span><p className="text-xs text-gray-500">{elapsed} min</p></div></div>
                {order.notes && <p className="mt-3 rounded-lg bg-yellow-50 p-2 text-sm text-yellow-900 dark:bg-yellow-950/30 dark:text-yellow-100">{order.notes}</p>}
                <ul className="my-4 space-y-2">{order.restaurant_order_items?.map((item, index) => <li key={index} className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800"><b>{item.quantity} ×</b> {((item.products as unknown as { name?: string } | null)?.name) || 'Item'}{item.notes && <p className="mt-1 text-xs text-gray-500">{item.notes}</p>}</li>)}</ul>
                <form action={updateOrderStatus}><input type="hidden" name="id" value={order.id} /><input type="hidden" name="source" value="kitchen" /><label className="text-xs font-semibold uppercase text-gray-500">Next Status<select name="status" defaultValue={order.status} className="mt-1 w-full rounded-lg border p-2.5"><option value="confirmed">New</option><option value="preparing">Preparing</option><option value="ready">Ready</option><option value="served">Served</option></select></label><button className="mt-2 w-full rounded-lg bg-orange-600 p-2.5 font-medium text-white">Update ticket</button></form>
            </article>
        })}</div>
    </div>
}