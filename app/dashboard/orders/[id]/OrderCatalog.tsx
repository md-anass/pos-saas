'use client'

import { useState } from 'react'
import { addDealToOrder, addOrderItem } from '../../industry-actions'
import { formatCurrency } from '@/lib/currency'

type Product = { id: string; name: string; selling_price: number; category_id: string | null }
type Category = { id: string; name: string }
type Deal = { id: string; name: string; deal_price: number; summary: string }

export default function OrderCatalog({ orderId, products, categories, deals, currency }: { orderId: string; products: Product[]; categories: Category[]; deals: Deal[]; currency: string }) {
    const [category, setCategory] = useState('')
    const [search, setSearch] = useState('')
    const visible = products.filter(product => (!category || product.category_id === category) && product.name.toLowerCase().includes(search.trim().toLowerCase()))
    return <section className="space-y-4 rounded-2xl border bg-white p-4 dark:bg-gray-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-orange-600">Add to order</p><h2 className="text-lg font-bold">Menu catalog</h2></div><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search menu items" className="w-full rounded-lg border bg-white p-2.5 text-sm sm:max-w-xs dark:bg-gray-800" aria-label="Search menu items" /></div>
        <div className="flex gap-2 overflow-x-auto pb-1"><button type="button" onClick={() => setCategory('')} className={`shrink-0 rounded-full px-3 py-1.5 text-sm ${!category ? 'bg-orange-600 text-white' : 'border'}`}>All</button>{categories.map(item => <button type="button" key={item.id} onClick={() => setCategory(item.id)} className={`shrink-0 rounded-full px-3 py-1.5 text-sm ${category === item.id ? 'bg-orange-600 text-white' : 'border'}`}>{item.name}</button>)}</div>
        <div><div className="mb-2 flex items-center justify-between"><h3 className="font-bold">Menu items</h3><span className="text-xs text-gray-500">{visible.length} active</span></div>{!visible.length && <p className="rounded-lg border border-dashed p-5 text-sm text-gray-500">No active menu items match this search.</p>}<div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{visible.map(item => <form key={item.id} action={addOrderItem} className="flex items-center justify-between rounded-lg border p-3"><input type="hidden" name="order_id" value={orderId} /><input type="hidden" name="product_id" value={item.id} /><input type="hidden" name="quantity" value="1" /><div className="min-w-0"><b className="block truncate">{item.name}</b><p className="text-sm text-gray-500">{formatCurrency(item.selling_price, currency)}</p></div><button className="ml-3 rounded-lg bg-gray-900 px-3 py-2 text-sm text-white">Add</button></form>)}</div></div>
        {!!deals.length && <div className="border-t pt-4"><div className="mb-2"><h3 className="font-bold">Deals and combos</h3><p className="text-xs text-gray-500">A deal is charged once at its deal price. Its component items are not separate charges.</p></div><div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{deals.map(deal => <form key={deal.id} action={addDealToOrder} className="rounded-lg border border-orange-200 bg-orange-50/50 p-3 dark:bg-orange-950/20"><input type="hidden" name="order_id" value={orderId} /><input type="hidden" name="deal_id" value={deal.id} /><input type="hidden" name="quantity" value="1" /><div className="flex justify-between gap-2"><div className="min-w-0"><b className="block truncate">{deal.name}</b><p className="text-xs text-gray-500">{deal.summary}</p></div><b className="shrink-0">{formatCurrency(deal.deal_price, currency)}</b></div><button className="mt-2 w-full rounded-lg bg-orange-600 p-2 text-sm text-white">Add deal</button></form>)}</div></div>}
    </section>
}