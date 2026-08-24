import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getCurrentShopContext, requireShopModule } from '@/lib/shop-context'
import { archiveMenuItem, createMenuItem, updateMenuItem } from '../industry-actions'

export default async function MenuPage() {
    const context = await getCurrentShopContext()
    requireShopModule(context, 'menu')
    const supabase = await createClient()
    const { data: items } = await supabase.from('products')
        .select('id,name,sku,quantity,purchase_price,selling_price').eq('is_active', true).order('name')

    return <div className="space-y-6">
        <header className="flex flex-wrap justify-between gap-3">
            <div><h1 className="text-2xl font-bold">Restaurant Menu</h1><p className="text-sm text-gray-500">Create, price, edit and archive orderable items.</p></div>
            <Link href="/dashboard/orders" className="rounded-lg bg-orange-600 px-4 py-2 text-white">Take an order</Link>
        </header>
        <form action={createMenuItem} className="grid gap-3 rounded-2xl border bg-white p-4 md:grid-cols-6 dark:bg-gray-900">
            <input name="name" required placeholder="Menu item" className="rounded border p-2" />
            <input name="sku" placeholder="SKU" className="rounded border p-2" />
            <input name="cost" type="number" min="0" step=".01" placeholder="Cost" className="rounded border p-2" />
            <input name="price" required type="number" min="0" step=".01" placeholder="Price" className="rounded border p-2" />
            <input name="quantity" required type="number" min="0" step="1" defaultValue="0" className="rounded border p-2" />
            <button className="rounded bg-orange-600 text-white">Add item</button>
        </form>
        <div className="grid gap-3 lg:grid-cols-2">{items?.map(item =>
            <article key={item.id} className="rounded-2xl border bg-white p-4 dark:bg-gray-900">
                <form action={updateMenuItem} className="grid gap-2 sm:grid-cols-2">
                    <input type="hidden" name="id" value={item.id} />
                    <input name="name" required defaultValue={item.name} className="rounded border p-2 font-medium" />
                    <input name="sku" defaultValue={item.sku || ''} placeholder="SKU" className="rounded border p-2" />
                    <input name="cost" type="number" min="0" step=".01" defaultValue={item.purchase_price} className="rounded border p-2" />
                    <input name="price" type="number" min="0" step=".01" defaultValue={item.selling_price} className="rounded border p-2" />
                    <button className="rounded border px-3 py-2">Save changes</button>
                </form>
                <div className="mt-3 flex items-center justify-between text-sm text-gray-500"><span>Current stock: {item.quantity}</span>
                    <form action={archiveMenuItem}><input type="hidden" name="id" value={item.id} /><button className="text-red-600">Archive</button></form>
                </div>
            </article>)}</div>
    </div>
}