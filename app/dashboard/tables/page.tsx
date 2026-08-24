import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getCurrentShopContext, requireShopModule } from '@/lib/shop-context'
import { archiveTable, createTable, updateTable } from '../industry-actions'

const fieldClass = 'mt-1 w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm dark:border-gray-700 dark:bg-gray-800'
const labelClass = 'text-xs font-semibold uppercase tracking-wide text-gray-500'

export default async function RestaurantTablesPage() {
    const context = await getCurrentShopContext()
    requireShopModule(context, 'restaurant_tables')
    const supabase = await createClient()
    const [{ data: tables }, { data: activeOrders }] = await Promise.all([
        supabase.from('restaurant_tables').select('id,name_or_number,capacity,status').order('name_or_number'),
        supabase.from('restaurant_orders').select('id,table_id,status').in('status', ['pending', 'confirmed', 'preparing', 'ready', 'served']),
    ])
    const orderByTable = new Map(activeOrders?.filter(order => order.table_id).map(order => [order.table_id, order]) || [])

    return <div className="space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold text-orange-600">FLOOR MANAGEMENT</p><h1 className="text-2xl font-bold">Dining Tables</h1><p className="text-sm text-gray-500">See occupancy at a glance and maintain table capacity safely.</p></div><Link href="/dashboard/orders" className="rounded-lg bg-orange-600 px-4 py-2 text-white">Start order</Link></header>
        <form action={createTable} className="grid gap-4 rounded-2xl border bg-white p-5 sm:grid-cols-[1fr_180px_auto] sm:items-end dark:bg-gray-900">
            <label className={labelClass}>Table Name / Number *<input name="name" required placeholder="e.g. Table 5 or Patio A" className={fieldClass} /></label>
            <label className={labelClass}>Capacity *<input name="capacity" type="number" min="1" step="1" required placeholder="4" className={fieldClass} /></label>
            <button className="rounded-lg bg-orange-600 px-5 py-2.5 text-white">Add table</button>
        </form>
        {!tables?.length && <div className="rounded-2xl border border-dashed p-10 text-center text-gray-500">No tables configured. Add your first dining table above.</div>}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{tables?.map(table => {
            const currentOrder = orderByTable.get(table.id)
            return <article key={table.id} className="rounded-2xl border bg-white p-5 dark:bg-gray-900">
                <div className="mb-4 flex items-start justify-between"><div><h2 className="text-lg font-bold">{table.name_or_number}</h2><p className="text-sm text-gray-500">Seats {table.capacity}</p></div><span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold capitalize dark:bg-gray-800">{table.status === 'available' ? 'Available' : table.status}</span></div>
                {currentOrder && <Link href="/dashboard/orders" className="mb-4 block rounded-lg bg-orange-50 p-3 text-sm text-orange-800 dark:bg-orange-950/30 dark:text-orange-200">Current order #{currentOrder.id.slice(0, 8)} · {currentOrder.status}</Link>}
                <form action={updateTable} className="space-y-3">
                    <input type="hidden" name="id" value={table.id} />
                    <label className={labelClass}>Table Name / Number *<input name="name" required defaultValue={table.name_or_number} className={fieldClass} /></label>
                    <div className="grid grid-cols-2 gap-3">
                        <label className={labelClass}>Capacity *<input name="capacity" type="number" min="1" step="1" defaultValue={table.capacity} className={fieldClass} /></label>
                        <label className={labelClass}>Status<select name="status" defaultValue={table.status} className={fieldClass}><option value="available">Available</option><option value="occupied">Occupied</option><option value="reserved">Reserved</option><option value="inactive">Unavailable</option></select></label>
                    </div>
                    <button className="w-full rounded-lg border p-2.5 font-medium">Save table</button>
                </form>
                {table.status !== 'inactive' && <form action={archiveTable} className="mt-3 text-right"><input type="hidden" name="id" value={table.id} /><button className="text-sm text-red-600">Archive table</button></form>}
            </article>
        })}</div>
    </div>
}