'use client'

import Link from 'next/link'
import { useRef, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/currency'
import { addDealToOrder, addOrderItem, adjustOrderItem, payRestaurantOrder } from '../industry-actions'

type Product = { id: string; name: string; selling_price: number; category_id: string | null }
type Category = { id: string; name: string }
type Deal = { id: string; name: string; deal_price: number; summary: string }
type OrderItem = { id: string; product_id: string; quantity: number; unit_price: number; notes: string | null; products: { name: string } | { name: string }[] | null }
type Order = { id: string; order_number: number; status: string; order_type: string; guest_count: number | null; notes: string | null; total_amount: number; sale_id: string | null; restaurant_tables: { name_or_number: string } | { name_or_number: string }[] | null }

export default function RestaurantPOSWorkspace({ order, items: initialItems, products, categories, deals, currency }: { order: Order; items: OrderItem[]; products: Product[]; categories: Category[]; deals: Deal[]; currency: string }) {
    const router = useRouter()
    const [items, setItems] = useState<OrderItem[]>(initialItems)
    const [category, setCategory] = useState('')
    const [search, setSearch] = useState('')
    const [pending, setPending] = useState(0)
    const [error, setError] = useState('')
    const [checkoutBusy, setCheckoutBusy] = useState(false)
    const queues = useRef(new Map<string, Promise<void>>())
    const open = !order.sale_id && order.status === 'pending'
    const table = Array.isArray(order.restaurant_tables) ? order.restaurant_tables[0] : order.restaurant_tables
    const money = (value: number) => formatCurrency(value, currency)
    const visible = products.filter(product => (!category || product.category_id === category) && product.name.toLowerCase().includes(search.trim().toLowerCase()))
    const total = items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unit_price), 0)

    const optimisticDelta = (productId: string, delta: number, product?: Product) => {
        setItems(current => {
            const existing = current.find(item => item.product_id === productId && !item.notes?.startsWith('Deal:'))
            if (!existing && product && delta > 0) {
                return [...current, { id: `optimistic-${productId}`, product_id: productId, quantity: delta, unit_price: product.selling_price, notes: null, products: { name: product.name } }]
            }
            return current.flatMap(item => {
                if (item.product_id !== productId || item.notes?.startsWith('Deal:')) return [item]
                const quantity = Number(item.quantity) + delta
                return quantity > 0 ? [{ ...item, quantity }] : []
            })
        })
    }

    const queueDelta = (productId: string, delta: number, product?: Product) => {
        if (!open) return
        optimisticDelta(productId, delta, product)
        const key = `${order.id}:${productId}`
        const previous = queues.current.get(key) || Promise.resolve()
        const next = previous.catch(() => undefined).then(async () => {
            setPending(value => value + 1)
            const data = new FormData()
            data.set('order_id', order.id)
            data.set('product_id', productId)
            data.set('defer_refresh', 'true')
            if (product) {
                data.set('quantity', String(delta))
                await addOrderItem(data)
            } else {
                data.set('delta', String(delta))
                await adjustOrderItem(data)
            }
        }).catch((caught) => {
            setError('Could not update this item. Please try again.')
            router.refresh()
            throw caught
        }).finally(() => {
            setPending(value => Math.max(0, value - 1))
            if (queues.current.get(key) === next) queues.current.delete(key)
        })
        queues.current.set(key, next)
        void next.catch(() => undefined)
    }

    const flushPending = async () => {
        await Promise.all(Array.from(queues.current.values()))
    }

    const handleCheckout = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (checkoutBusy) return
        const form = event.currentTarget
        setCheckoutBusy(true)
        setError('')
        try {
            await flushPending()
            await payRestaurantOrder(new FormData(form))
        } catch (caught) {
            const digest = caught && typeof caught === 'object' && 'digest' in caught ? String((caught as { digest?: unknown }).digest || '') : ''
            if (digest.startsWith('NEXT_REDIRECT')) throw caught
            setCheckoutBusy(false)
            setError('Payment could not be completed. Please try again.')
        }
    }

    return <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4 rounded-2xl border bg-white p-4 dark:bg-gray-900">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-orange-600">Add to order</p><h2 className="text-lg font-bold">Menu catalog</h2></div><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search menu items" className="h-10 w-full rounded-lg border px-3 text-sm sm:max-w-xs dark:border-gray-700 dark:bg-gray-800" aria-label="Search menu items" /></div>
            <div className="flex gap-2 overflow-x-auto pb-1"><button type="button" onClick={() => setCategory('')} className={`shrink-0 rounded-full px-3 py-1.5 text-sm ${!category ? 'bg-orange-600 text-white' : 'border'}`}>All</button>{categories.map(item => <button type="button" key={item.id} onClick={() => setCategory(item.id)} className={`shrink-0 rounded-full px-3 py-1.5 text-sm ${category === item.id ? 'bg-orange-600 text-white' : 'border'}`}>{item.name}</button>)}</div>
            <div><div className="mb-2 flex items-center justify-between"><h3 className="font-bold">Menu items</h3><span className="text-xs text-gray-500">{visible.length} active</span></div>{!visible.length && <p className="rounded-lg border border-dashed p-5 text-sm text-gray-500">No active menu items match this search.</p>}<div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{visible.map(item => <button type="button" key={item.id} onClick={() => queueDelta(item.id, 1, item)} className="flex items-center justify-between rounded-lg border p-3 text-left transition hover:border-orange-400 hover:bg-orange-50/50 disabled:opacity-60 dark:hover:bg-orange-950/20"><span className="min-w-0"><b className="block truncate">{item.name}</b><span className="text-sm text-gray-500">{money(item.selling_price)}</span></span><span className="ml-3 shrink-0 rounded-lg bg-gray-900 px-3 py-2 text-sm text-white">Add</span></button>)}</div></div>
            {!!deals.length && <div className="border-t pt-4"><div className="mb-2"><h3 className="font-bold">Deals and combos</h3><p className="text-xs text-gray-500">A deal is charged once at its deal price. Its component items are not separate charges.</p></div><div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{deals.map(deal => <form key={deal.id} action={addDealToOrder} className="rounded-lg border border-orange-200 bg-orange-50/50 p-3 dark:bg-orange-950/20"><input type="hidden" name="order_id" value={order.id} /><input type="hidden" name="deal_id" value={deal.id} /><input type="hidden" name="quantity" value="1" /><div className="flex justify-between gap-2"><div className="min-w-0"><b className="block truncate"><span className="mr-1 rounded bg-orange-200 px-1 text-[10px] text-orange-800">DEAL</span>{deal.name}</b><p className="text-xs text-gray-500">{deal.summary}</p></div><b className="shrink-0">{money(deal.deal_price)}</b></div><button className="mt-2 w-full rounded-lg bg-orange-600 p-2 text-sm text-white">Add deal</button></form>)}</div></div>}
        </div>
        <aside className="h-fit rounded-2xl border bg-white p-4 shadow-sm dark:bg-gray-900 lg:sticky lg:top-24">
            <div className="flex items-start justify-between gap-3 border-b pb-3"><div><p className="text-xs font-bold uppercase tracking-wider text-orange-600">Active cart</p><h2 className="text-lg font-black">Order #{order.order_number}</h2><p className="text-sm text-gray-500">{order.order_type === 'takeaway' ? 'Takeaway' : `Dine-in${table?.name_or_number ? ` · ${table.name_or_number}` : ''}`}{order.guest_count ? ` · ${order.guest_count} guests` : ''}</p></div><span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-bold uppercase text-orange-700">{open ? 'Open' : 'Paid'}</span></div>
            {pending > 0 && <p className="mt-2 text-xs text-orange-600">Saving latest changes...</p>}
            {error && <p role="alert" className="mt-2 rounded-lg bg-red-50 p-2 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</p>}
            {order.notes && <p className="my-3 rounded-lg bg-yellow-50 p-2 text-xs">Note: {order.notes}</p>}
            {!items.length && <p className="py-8 text-center text-sm text-gray-500">Add menu items or a deal to begin.</p>}
            <div className="my-3 space-y-2">{items.map(item => { const name = Array.isArray(item.products) ? item.products[0]?.name : item.products?.name; const deal = item.notes?.startsWith('Deal:'); return <div key={item.id} className="rounded-lg border p-2"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-sm font-semibold">{deal && <span className="mr-1 rounded bg-orange-100 px-1 text-[10px] text-orange-700">DEAL</span>}{name}</p><p className="text-xs text-gray-500">{money(Number(item.unit_price))} each{deal ? ` · ${item.notes}` : ''}</p></div><b className="shrink-0 text-sm">{money(Number(item.quantity) * Number(item.unit_price))}</b></div>{open && !deal && <div className="mt-2 flex items-center justify-end gap-2"><button type="button" aria-label={`Decrease ${name}`} onClick={() => queueDelta(item.product_id, -1)} className="h-7 w-7 rounded border">-</button><span className="min-w-5 text-center text-sm font-bold">{item.quantity}</span><button type="button" aria-label={`Increase ${name}`} onClick={() => queueDelta(item.product_id, 1)} className="h-7 w-7 rounded border">+</button></div>}</div> })}</div>
            <div className="border-t pt-3"><div className="flex justify-between text-lg font-black"><span>Total</span><span>{money(total)}</span></div>{open && items.length > 0 && <form onSubmit={handleCheckout} className="mt-3 grid gap-2"><input type="hidden" name="id" value={order.id} /><select name="payment_method" className="rounded-lg border p-2.5"><option value="cash">Cash</option><option value="card">Card</option><option value="bank">Bank transfer</option></select><button disabled={checkoutBusy} className="rounded-lg bg-emerald-600 px-4 py-3 font-bold text-white disabled:opacity-60">{checkoutBusy ? 'Processing...' : `Pay ${money(total)}`}</button></form>}{order.sale_id && <Link href={`/dashboard/sales/${order.sale_id}/receipt`} className="mt-3 block rounded-lg bg-emerald-600 px-4 py-3 text-center font-bold text-white">View / print receipt</Link>}</div>
        </aside>
    </section>
}
