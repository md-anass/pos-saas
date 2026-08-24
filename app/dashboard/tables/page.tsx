import { createClient } from '@/lib/supabase/server'
import { getCurrentShopContext, requireShopModule } from '@/lib/shop-context'
import { archiveTable, createTable, updateTable } from '../industry-actions'

export default async function RestaurantTablesPage() {
    const context = await getCurrentShopContext()
    requireShopModule(context, 'restaurant_tables')
    const supabase = await createClient()
    const { data: tables } = await supabase.from('restaurant_tables').select('id,name_or_number,capacity,status').order('name_or_number')

    return <div className="space-y-6">
        <div><h1 className="text-2xl font-bold">Dining Tables</h1><p className="text-sm text-gray-500">Edit table details and control availability without deleting history.</p></div>
        <form action={createTable} className="flex flex-wrap gap-3 rounded-2xl border bg-white p-4 dark:bg-gray-900">
            <input name="name" required placeholder="Table name/number" className="min-w-48 flex-1 rounded border p-2" />
            <input name="capacity" type="number" min="1" step="1" defaultValue="4" className="w-24 rounded border p-2" />
            <button className="rounded bg-orange-600 px-4 text-white">Add table</button>
        </form>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{tables?.map(table =>
            <article key={table.id} className="rounded-2xl border bg-white p-5 dark:bg-gray-900">
                <form action={updateTable} className="space-y-3">
                    <input type="hidden" name="id" value={table.id} />
                    <input name="name" required defaultValue={table.name_or_number} className="w-full rounded border p-2 font-bold" />
                    <div className="flex gap-2">
                        <input name="capacity" type="number" min="1" step="1" defaultValue={table.capacity} className="w-24 rounded border p-2" />
                        <select name="status" defaultValue={table.status} className="flex-1 rounded border p-2">
                            <option value="available">Free</option><option value="occupied">Occupied</option>
                            <option value="reserved">Reserved</option><option value="inactive">Inactive</option>
                        </select>
                    </div>
                    <button className="w-full rounded border p-2">Save details</button>
                </form>
                {table.status !== 'inactive' && <form action={archiveTable} className="mt-2"><input type="hidden" name="id" value={table.id} /><button className="text-sm text-red-600">Archive table</button></form>}
            </article>)}</div>
    </div>
}