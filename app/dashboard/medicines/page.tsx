import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/currency'
import { getCurrentShopContext, requireShopModule } from '@/lib/shop-context'
import { archiveMedicine, updateMedicine } from '../industry-actions'

const fieldClass = 'mt-1 w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm dark:border-gray-700 dark:bg-gray-800'
const labelClass = 'text-xs font-semibold uppercase tracking-wide text-gray-500'

export default async function MedicinesPage() {
    const context = await getCurrentShopContext()
    requireShopModule(context, 'medicines')
    const supabase = await createClient()
    const { data: products } = await supabase.from('products').select('id,name,sku,barcode,quantity,min_stock,purchase_price,selling_price').eq('is_active', true).order('name')
    const money = (value: number) => formatCurrency(value, context.shop.currency)

    return <div className="space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold text-cyan-700">MEDICINE CATALOG</p><h1 className="text-2xl font-bold">Medicines</h1><p className="text-sm text-gray-500">Maintain medicine identity and pricing. Stock is received and reconciled through batches.</p></div><Link href="/dashboard/products/new" className="rounded-lg bg-cyan-700 px-4 py-2 text-white">Add medicine</Link></header>
        {!products?.length && <div className="rounded-2xl border border-dashed p-10 text-center"><p className="font-semibold">No medicines yet</p><p className="text-sm text-gray-500">Add a medicine master, then receive its first dated batch.</p></div>}
        <div className="grid gap-4 lg:grid-cols-2">{products?.map(product =>
            <article key={product.id} className="rounded-2xl border bg-white p-5 dark:bg-gray-900">
                <div className="mb-4 flex items-start justify-between"><div><h2 className="text-lg font-bold">{product.name}</h2><p className="text-sm text-gray-500">{product.sku || 'No SKU'} · {product.barcode || 'No barcode'}</p></div><div className="text-right"><p className="font-bold text-cyan-700">{money(product.selling_price)}</p><p className="text-xs text-gray-500">Batch stock {product.quantity}</p></div></div>
                <form action={updateMedicine} className="grid gap-3 sm:grid-cols-2">
                    <input type="hidden" name="id" value={product.id} />
                    <label className={labelClass}>Medicine Name / Strength *<input name="name" required defaultValue={product.name} className={fieldClass} /></label>
                    <label className={labelClass}>SKU<input name="sku" defaultValue={product.sku || ''} placeholder="e.g. MED-PARA-500" className={fieldClass} /></label>
                    <label className={labelClass}>Barcode<input name="barcode" defaultValue={product.barcode || ''} placeholder="Scan or enter barcode" className={fieldClass} /></label>
                    <div className="rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-800"><p className="text-xs font-semibold uppercase text-gray-500">Saleable Batch Stock</p><p className="mt-1 font-bold">{product.quantity}</p></div>
                    <label className={labelClass}>Reference Purchase Cost<input name="cost" type="number" min="0" step=".01" defaultValue={product.purchase_price} className={fieldClass} /></label>
                    <label className={labelClass}>Selling Price *<input name="price" type="number" min="0" step=".01" required defaultValue={product.selling_price} className={fieldClass} /></label>
                    <button className="rounded-lg border p-2.5 font-medium sm:col-span-2">Save medicine</button>
                </form>
                <div className="mt-3 flex items-center justify-between"><Link href="/dashboard/batches" className="text-sm font-medium text-cyan-700">Manage batches & expiry</Link><form action={archiveMedicine}><input type="hidden" name="id" value={product.id} /><button className="text-sm text-red-600">Archive medicine</button></form></div>
            </article>)}</div>
    </div>
}