import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Barcode, Boxes, PackagePlus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/currency'
import { getCurrentShopContext, requireShopModule } from '@/lib/shop-context'

type Batch = { product_id: string; expiry_date: string | null; quantity: number }

export default async function CategoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const context = await getCurrentShopContext()
    requireShopModule(context, 'categories')
    const supabase = await createClient()
    const { data: category } = await supabase.from('categories').select('id,name').eq('id', id).eq('shop_id', context.shop.id).maybeSingle()
    if (!category) notFound()

    const { data: products } = await supabase.from('products').select('id,name,sku,barcode,unit,selling_price,quantity,min_stock,track_batches').eq('shop_id', context.shop.id).eq('category_id', category.id).eq('is_active', true).order('name')
    const productIds = (products || []).map(product => product.id)
    let batches: Batch[] = []
    if (productIds.length && ['grocery', 'pharmacy'].includes(context.shopType)) {
        const table = context.shopType === 'pharmacy' ? 'medicine_batches' : 'product_batches'
        const { data } = await supabase.from(table).select('product_id,expiry_date,quantity').in('product_id', productIds).eq('is_active', true).gt('quantity', 0)
        batches = (data || []) as Batch[]
    }
    const batchSummary = new Map<string, { count: number; nearestExpiry: string | null }>()
    for (const batch of batches) {
        const current = batchSummary.get(batch.product_id)
        batchSummary.set(batch.product_id, { count: (current?.count || 0) + 1, nearestExpiry: batch.expiry_date && (!current?.nearestExpiry || batch.expiry_date < current.nearestExpiry) ? batch.expiry_date : current?.nearestExpiry || null })
    }
    const itemLabel = context.shopType === 'pharmacy' ? 'Medicine' : 'Product'
    const addHref = '/dashboard/products/new'
    const money = (value: number) => formatCurrency(value, context.shop.currency)

    return <div className="space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4"><div><Link href="/dashboard/categories" className="mb-3 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600"><ArrowLeft size={15} /> Back to Categories</Link><h1 className="text-2xl font-bold">{category.name}</h1><p className="text-sm text-gray-500">{products?.length || 0} {(products?.length || 0) === 1 ? itemLabel.toLowerCase() : itemLabel.toLowerCase() + 's'} in this category</p></div><Link href={addHref} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white"><PackagePlus size={17} /> Add {itemLabel}</Link></header>
        {!products?.length ? <div className="rounded-2xl border border-dashed p-12 text-center"><Boxes className="mx-auto mb-3 text-gray-400" size={36} /><p className="font-semibold">No items in this category yet.</p><p className="mt-1 text-sm text-gray-500">Add a new {itemLabel.toLowerCase()} and assign it to {category.name}.</p></div> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{products.map(product => { const summary=batchSummary.get(product.id); const low=Number(product.quantity)<=Number(product.min_stock); return <article key={product.id} className="rounded-2xl border bg-white p-5 dark:bg-gray-900"><div className="flex items-start justify-between gap-3"><div><h2 className="font-bold">{product.name}</h2><p className="mt-1 text-xs text-gray-500">{product.sku || 'No SKU'}{product.barcode && <span className="ml-2 inline-flex items-center gap-1"><Barcode size={12} />{product.barcode}</span>}</p></div><p className="font-bold text-blue-600">{money(Number(product.selling_price))}</p></div><div className="mt-4 grid grid-cols-2 gap-2 text-sm"><div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800"><p className="text-xs text-gray-500">Stock</p><p className={low?'font-bold text-red-600':'font-bold'}>{product.quantity} {product.unit}</p></div><div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800"><p className="text-xs text-gray-500">Status</p><p className={low?'font-bold text-red-600':'font-bold text-emerald-600'}>{Number(product.quantity)<=0?'Out of stock':low?'Low stock':'In stock'}</p></div></div>{summary && <p className="mt-3 text-xs text-gray-500">{summary.count} active batch{summary.count===1?'':'es'}{summary.nearestExpiry?` · Nearest expiry ${new Date(summary.nearestExpiry).toLocaleDateString()}`:''}</p>}</article>})}</div>}
    </div>
}
