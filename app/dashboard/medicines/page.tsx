import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getCurrentShopContext, requireShopModule } from '@/lib/shop-context'
import { archiveMedicine, updateMedicine } from '../industry-actions'

export default async function MedicinesPage() {
    const context = await getCurrentShopContext()
    requireShopModule(context, 'medicines')
    const supabase = await createClient()
    const { data: products } = await supabase.from('products')
        .select('id,name,sku,barcode,quantity,min_stock,purchase_price,selling_price').eq('is_active', true).order('name')

    return <div className="space-y-6">
        <header className="flex flex-wrap justify-between gap-3"><div><h1 className="text-2xl font-bold">Medicines</h1><p className="text-sm text-gray-500">Maintain medicine identity, barcode and pricing in the shared catalog.</p></div>
            <Link href="/dashboard/products/new" className="rounded bg-cyan-700 px-4 py-2 text-white">Add medicine</Link></header>
        <div className="grid gap-4 lg:grid-cols-2">{products?.map(product =>
            <article key={product.id} className="rounded-2xl border bg-white p-4 dark:bg-gray-900">
                <form action={updateMedicine} className="grid gap-2 sm:grid-cols-2">
                    <input type="hidden" name="id" value={product.id} />
                    <input name="name" required defaultValue={product.name} className="rounded border p-2 font-medium" />
                    <input name="sku" defaultValue={product.sku || ''} placeholder="SKU" className="rounded border p-2" />
                    <input name="barcode" defaultValue={product.barcode || ''} placeholder="Barcode" className="rounded border p-2" />
                    <span className="rounded bg-gray-50 p-2 text-sm dark:bg-gray-800">Stock: {product.quantity}</span>
                    <input name="cost" type="number" min="0" step=".01" defaultValue={product.purchase_price} className="rounded border p-2" />
                    <input name="price" type="number" min="0" step=".01" defaultValue={product.selling_price} className="rounded border p-2" />
                    <button className="rounded border p-2 sm:col-span-2">Save medicine</button>
                </form>
                <form action={archiveMedicine} className="mt-2"><input type="hidden" name="id" value={product.id} /><button className="text-sm text-red-600">Archive medicine</button></form>
            </article>)}</div>
    </div>
}