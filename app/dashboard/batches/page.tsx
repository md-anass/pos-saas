/* eslint-disable react-hooks/purity -- request-time status labels are computed in this server component */
import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/currency'
import { getCurrentShopContext, requireShopModule } from '@/lib/shop-context'
import { archiveBatch, createBatch, updateBatch } from '../industry-actions'

type Batch = { id: string; batch_number: string; manufacture_date?: string | null; expiry_date: string | null; quantity: number; purchase_price?: number; selling_price?: number; supplier_id?: string | null; products: { name: string } | { name: string }[] | null }
const fieldClass = 'mt-1 w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm dark:border-gray-700 dark:bg-gray-800'
const labelClass = 'text-xs font-semibold uppercase tracking-wide text-gray-500'

export default async function BatchesPage() {
    const context = await getCurrentShopContext()
    requireShopModule(context, 'medicine_batches')
    const supabase = await createClient()
    const pharmacy = context.shopType === 'pharmacy'
    const table = pharmacy ? 'medicine_batches' : 'product_batches'
    const select = pharmacy ? 'id,batch_number,manufacture_date,expiry_date,quantity,purchase_price,selling_price,supplier_id,products(name)' : 'id,batch_number,expiry_date,quantity,products(name)'
    const [{ data: raw }, { data: products }, { data: suppliers }] = await Promise.all([
        supabase.from(table).select(select).eq('is_active', true).order('created_at', { ascending: false }),
        supabase.from('products').select('id,name,quantity,track_batches').eq('is_active', true).order('name'),
        supabase.from('suppliers').select('id,name').order('name'),
    ])
    const batches = (raw || []) as unknown as Batch[]
    const productName = (batch: Batch) => Array.isArray(batch.products) ? batch.products[0]?.name : batch.products?.name
    const money = (value: number) => formatCurrency(value, context.shop.currency)
    const status = (batch: Batch) => {
        if (!batch.expiry_date) return pharmacy ? 'Missing expiry' : 'No expiry'
        const days = Math.ceil((new Date(batch.expiry_date).getTime() - Date.now()) / 86400000)
        if (days < 0) return 'Expired'
        if (days <= 30) return 'Expiring soon'
        return 'Active'
    }

    return <div className="space-y-6">
        <div><p className={'text-sm font-semibold ' + (pharmacy ? 'text-cyan-700' : 'text-emerald-700')}>{pharmacy ? 'PHARMACY INVENTORY' : 'GROCERY INVENTORY'}</p><h1 className="text-2xl font-bold">{pharmacy ? 'Medicine Batches' : 'Product Batches'}</h1><p className="text-sm text-gray-500">Batch changes reconcile shared stock atomically. {pharmacy && 'Expiry is required for saleable stock.'}</p></div>
        <form action={createBatch} className="rounded-2xl border bg-white p-5 dark:bg-gray-900">
            <h2 className="mb-4 font-semibold">{pharmacy ? 'Receive medicine batch' : 'Create or receive batch'}</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <label className={labelClass}>{pharmacy ? 'Medicine' : 'Product'} *<select name="product_id" required className={fieldClass}><option value="">Select {pharmacy ? 'medicine' : 'product'}</option>{products?.map(product => <option key={product.id} value={product.id}>{product.name} ({product.quantity} in stock)</option>)}</select></label>
                <label className={labelClass}>Batch Number *<input name="batch_number" required placeholder="e.g. BATCH-2026-01" className={fieldClass} /></label>
                {pharmacy && <label className={labelClass}>Manufacturing Date<input name="manufacture_date" type="date" className={fieldClass} /></label>}
                <label className={labelClass}>Expiry Date {pharmacy && '*'}<input name="expiry_date" type="date" required={pharmacy} className={fieldClass} /></label>
                {!pharmacy && <label className={labelClass}>Stock Intent<select name="stock_intent" className={fieldClass}><option value="receive">Receive new stock</option><option value="allocate">Allocate existing stock</option></select></label>}
                <label className={labelClass}>Quantity *<input name="quantity" type="number" min="0" step=".01" required placeholder="0" className={fieldClass} /></label>
                {pharmacy && <><label className={labelClass}>Supplier<select name="supplier_id" className={fieldClass}><option value="">Select supplier</option>{suppliers?.map(supplier => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></label><label className={labelClass}>Purchase Price<input name="purchase_price" type="number" min="0" step=".01" placeholder="0.00" className={fieldClass} /></label><label className={labelClass}>Selling Price<input name="selling_price" type="number" min="0" step=".01" placeholder="0.00" className={fieldClass} /></label></>}
            </div>
            <button className={'mt-4 rounded-lg px-5 py-2.5 text-white ' + (pharmacy ? 'bg-cyan-700' : 'bg-emerald-700')}>Save batch & reconcile stock</button>
        </form>
        {!batches.length && <div className="rounded-2xl border border-dashed p-10 text-center text-gray-500">No active batches. Receive the first batch above.</div>}
        <div className="grid gap-4 lg:grid-cols-2">{batches.map(batch => <article key={batch.id} className="rounded-2xl border bg-white p-5 dark:bg-gray-900">
            <div className="mb-4 flex items-start justify-between"><div><h2 className="font-bold">{productName(batch)}</h2><p className="text-sm text-gray-500">Batch {batch.batch_number} · Qty {batch.quantity}</p></div><span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold dark:bg-gray-800">{status(batch)}</span></div>
            <form action={updateBatch} className="grid gap-3 sm:grid-cols-2">
                <input type="hidden" name="id" value={batch.id} />
                <label className={labelClass}>Batch Number *<input name="batch_number" required defaultValue={batch.batch_number} className={fieldClass} /></label>
                {pharmacy && <label className={labelClass}>Manufacturing Date<input name="manufacture_date" type="date" defaultValue={batch.manufacture_date || ''} className={fieldClass} /></label>}
                <label className={labelClass}>Expiry Date {pharmacy && '*'}<input name="expiry_date" type="date" required={pharmacy} defaultValue={batch.expiry_date || ''} className={fieldClass} /></label>
                <label className={labelClass}>Quantity *<input name="quantity" type="number" min="0" step=".01" required defaultValue={batch.quantity} className={fieldClass} /></label>
                {pharmacy && <><label className={labelClass}>Supplier<select name="supplier_id" defaultValue={batch.supplier_id || ''} className={fieldClass}><option value="">Select supplier</option>{suppliers?.map(supplier => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></label><label className={labelClass}>Purchase Price<input name="purchase_price" type="number" min="0" step=".01" defaultValue={batch.purchase_price ?? ''} className={fieldClass} /></label><label className={labelClass}>Selling Price<input name="selling_price" type="number" min="0" step=".01" defaultValue={batch.selling_price ?? ''} className={fieldClass} /></label></>}
                <button className="rounded-lg border p-2.5 font-medium sm:col-span-2">Save batch & stock delta</button>
            </form>
            {pharmacy && <p className="mt-3 text-sm text-gray-500">Purchase {money(batch.purchase_price || 0)} · Sale {money(batch.selling_price || 0)}</p>}
            <form action={archiveBatch} className="mt-3 text-right"><input type="hidden" name="id" value={batch.id} /><button className="text-sm text-red-600">Archive batch & remove remaining stock</button></form>
        </article>)}</div>
    </div>
}