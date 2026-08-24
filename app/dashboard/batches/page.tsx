import { createClient } from '@/lib/supabase/server'
import { getCurrentShopContext, requireShopModule } from '@/lib/shop-context'
import { archiveBatch, createBatch, updateBatch } from '../industry-actions'

type Batch = {
    id: string; batch_number: string; manufacture_date?: string | null; expiry_date: string | null
    quantity: number; purchase_price?: number; selling_price?: number; supplier_id?: string | null
    products: { name: string } | { name: string }[] | null
}

export default async function BatchesPage() {
    const context = await getCurrentShopContext()
    requireShopModule(context, 'medicine_batches')
    const supabase = await createClient()
    const pharmacy = context.shopType === 'pharmacy'
    const table = pharmacy ? 'medicine_batches' : 'product_batches'
    const select = pharmacy
        ? 'id,batch_number,manufacture_date,expiry_date,quantity,purchase_price,selling_price,supplier_id,products(name)'
        : 'id,batch_number,expiry_date,quantity,products(name)'
    const [{ data: raw }, { data: products }, { data: suppliers }] = await Promise.all([
        supabase.from(table).select(select).eq('is_active', true).order('created_at', { ascending: false }),
        supabase.from('products').select('id,name,quantity,track_batches').eq('is_active', true).order('name'),
        supabase.from('suppliers').select('id,name').order('name'),
    ])
    const batches = (raw || []) as unknown as Batch[]
    const productName = (batch: Batch) => Array.isArray(batch.products) ? batch.products[0]?.name : batch.products?.name

    return <div className="space-y-6">
        <div><h1 className="text-2xl font-bold">{pharmacy ? 'Medicine' : 'Grocery'} Batches</h1><p className="text-sm text-gray-500">Every quantity change reconciles shared stock atomically.</p></div>
        <form action={createBatch} className="grid gap-2 rounded-2xl border bg-white p-4 md:grid-cols-4 dark:bg-gray-900">
            <select name="product_id" required className="rounded border p-2"><option value="">Select product</option>{products?.map(product => <option key={product.id} value={product.id}>{product.name} ({product.quantity} in stock{product.track_batches ? ', batch tracked' : ''})</option>)}</select>
            <input name="batch_number" required placeholder="Batch number" className="rounded border p-2" />
            {pharmacy && <input name="manufacture_date" type="date" className="rounded border p-2" />}
            <input name="expiry_date" type="date" required={pharmacy} className="rounded border p-2" />
            {!pharmacy && <select name="stock_intent" className="rounded border p-2"><option value="receive">Receive new stock</option><option value="allocate">Allocate existing stock</option></select>}
            <input name="quantity" type="number" min="0" step=".01" required placeholder={pharmacy ? 'Quantity received' : 'Quantity received or allocated'} className="rounded border p-2" />
            {pharmacy && <><select name="supplier_id" className="rounded border p-2"><option value="">Supplier</option>{suppliers?.map(supplier => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select>
                <input name="purchase_price" type="number" min="0" step=".01" placeholder="Purchase price" className="rounded border p-2" />
                <input name="selling_price" type="number" min="0" step=".01" placeholder="Sale price" className="rounded border p-2" /></>}
            <button className="rounded bg-cyan-700 p-2 text-white">Create batch</button>
        </form>
        <div className="grid gap-4 lg:grid-cols-2">{batches.map(batch =>
            <article key={batch.id} className="rounded-2xl border bg-white p-4 dark:bg-gray-900">
                <h2 className="mb-3 font-bold">{productName(batch)}</h2>
                <form action={updateBatch} className="grid gap-2 sm:grid-cols-2">
                    <input type="hidden" name="id" value={batch.id} />
                    <input name="batch_number" required defaultValue={batch.batch_number} className="rounded border p-2" />
                    {pharmacy && <input name="manufacture_date" type="date" defaultValue={batch.manufacture_date || ''} className="rounded border p-2" />}
                    <input name="expiry_date" type="date" required={pharmacy} defaultValue={batch.expiry_date || ''} className="rounded border p-2" />
                    <input name="quantity" type="number" min="0" step=".01" required defaultValue={batch.quantity} className="rounded border p-2" />
                    {pharmacy && <><select name="supplier_id" defaultValue={batch.supplier_id || ''} className="rounded border p-2"><option value="">Supplier</option>{suppliers?.map(supplier => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select>
                        <input name="purchase_price" type="number" min="0" step=".01" defaultValue={batch.purchase_price || 0} className="rounded border p-2" />
                        <input name="selling_price" type="number" min="0" step=".01" defaultValue={batch.selling_price || 0} className="rounded border p-2" /></>}
                    <button className="rounded border p-2">Save batch and stock delta</button>
                </form>
                <form action={archiveBatch} className="mt-2"><input type="hidden" name="id" value={batch.id} /><button className="text-sm text-red-600">Archive batch and remove remaining stock</button></form>
            </article>)}</div>
    </div>
}