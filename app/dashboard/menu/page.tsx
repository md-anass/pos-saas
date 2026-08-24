import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/currency'
import { getCurrentShopContext, requireShopModule } from '@/lib/shop-context'
import { archiveMenuItem, createMenuItem, updateMenuItem } from '../industry-actions'

const fieldClass = 'mt-1 w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm dark:border-gray-700 dark:bg-gray-800'
const labelClass = 'text-xs font-semibold uppercase tracking-wide text-gray-500'

export default async function MenuPage() {
    const context = await getCurrentShopContext()
    requireShopModule(context, 'menu')
    const supabase = await createClient()
    const { data: items } = await supabase.from('products').select('id,name,sku,quantity,purchase_price,selling_price').eq('is_active', true).order('name')
    const money = (value: number) => formatCurrency(value, context.shop.currency)

    return <div className="space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
            <div><p className="text-sm font-semibold text-orange-600">MENU MANAGEMENT</p><h1 className="text-2xl font-bold">Restaurant Menu</h1><p className="text-sm text-gray-500">Price dishes, manage serving availability and archive retired items.</p></div>
            <Link href="/dashboard/orders" className="rounded-lg bg-orange-600 px-4 py-2 text-white">Take an order</Link>
        </header>
        <form action={createMenuItem} className="rounded-2xl border bg-white p-5 dark:bg-gray-900">
            <h2 className="mb-4 font-semibold">Add menu item</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <label className={labelClass}>Item Name *<input name="name" required placeholder="e.g. Chicken Karahi" className={fieldClass} /></label>
                <label className={labelClass}>SKU<input name="sku" placeholder="e.g. MENU-101" className={fieldClass} /></label>
                <label className={labelClass}>Cost Price<input name="cost" type="number" min="0" step=".01" placeholder="0.00" className={fieldClass} /></label>
                <label className={labelClass}>Selling Price *<input name="price" required type="number" min="0" step=".01" placeholder="0.00" className={fieldClass} /></label>
                <label className={labelClass}>Available Servings *<input name="quantity" required type="number" min="0" step="1" placeholder="0" className={fieldClass} /></label>
            </div>
            <button className="mt-4 rounded-lg bg-orange-600 px-5 py-2.5 font-medium text-white">Add to menu</button>
        </form>
        {!items?.length && <div className="rounded-2xl border border-dashed p-10 text-center text-gray-500">No menu items yet. Add the first dish above.</div>}
        <div className="grid gap-4 lg:grid-cols-2">{items?.map(item =>
            <article key={item.id} className="rounded-2xl border bg-white p-5 dark:bg-gray-900">
                <div className="mb-4 flex items-start justify-between"><div><h2 className="font-bold">{item.name}</h2><p className="text-sm text-gray-500">{money(item.selling_price)} · {item.quantity > 0 ? item.quantity + ' servings available' : 'Sold out'}</p></div><span className={item.quantity > 0 ? 'rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-700' : 'rounded-full bg-red-100 px-2 py-1 text-xs text-red-700'}>{item.quantity > 0 ? 'Available' : 'Sold out'}</span></div>
                <form action={updateMenuItem} className="grid gap-3 sm:grid-cols-2">
                    <input type="hidden" name="id" value={item.id} />
                    <label className={labelClass}>Item Name *<input name="name" required defaultValue={item.name} className={fieldClass} /></label>
                    <label className={labelClass}>SKU<input name="sku" defaultValue={item.sku || ''} className={fieldClass} /></label>
                    <label className={labelClass}>Cost Price<input name="cost" type="number" min="0" step=".01" defaultValue={item.purchase_price} className={fieldClass} /></label>
                    <label className={labelClass}>Selling Price *<input name="price" type="number" min="0" step=".01" defaultValue={item.selling_price} className={fieldClass} /></label>
                    <button className="rounded-lg border px-3 py-2.5 font-medium sm:col-span-2">Save menu item</button>
                </form>
                <form action={archiveMenuItem} className="mt-3 text-right"><input type="hidden" name="id" value={item.id} /><button className="text-sm text-red-600">Archive item</button></form>
            </article>)}</div>
    </div>
}