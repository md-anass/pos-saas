import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getCurrentShopContext, requireShopModule } from '@/lib/shop-context'
import NewOrderForm from './NewOrderForm'
import RestaurantPOSWorkspace from './RestaurantPOSWorkspace'

type SearchParams = { order?: string }

export default async function OrdersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
    const { order: selectedId } = await searchParams
    const context = await getCurrentShopContext()
    requireShopModule(context, 'restaurant_orders')
    const supabase = await createClient()
    const [{ data: orders }, { data: tables }] = await Promise.all([
        supabase.from('restaurant_orders').select('id,order_number,status,order_type,guest_count,table_id,sale_id,total_amount,created_at').order('created_at', { ascending: false }).limit(50),
        supabase.from('restaurant_tables').select('id,name_or_number,status').neq('status', 'inactive').order('name_or_number'),
    ])
    const active = (orders || []).filter(order => !order.sale_id && order.status === 'pending')
    const selected = selectedId && active.some(order => order.id === selectedId) ? selectedId : null
    let workspace = null
    if (selected) {
        const [{ data: order }, { data: items }, { data: products }, { data: categories }, { data: deals }] = await Promise.all([
            supabase.from('restaurant_orders').select('id,order_number,status,order_type,guest_count,notes,total_amount,sale_id,restaurant_tables(name_or_number)').eq('id', selected).single(),
            supabase.from('restaurant_order_items').select('id,product_id,quantity,unit_price,notes,products(name)').eq('order_id', selected).order('created_at'),
            supabase.from('products').select('id,name,selling_price,category_id').eq('shop_id', context.shop.id).eq('is_active', true).gt('quantity', 0).order('name'),
            supabase.from('categories').select('id,name').eq('shop_id', context.shop.id).order('name'),
            supabase.from('restaurant_deals').select('id,name,deal_price,restaurant_deal_items(quantity,products(name))').eq('shop_id', context.shop.id).eq('is_active', true).order('name'),
        ])
        if (order) workspace = <RestaurantPOSWorkspace order={order} items={items || []} products={products || []} categories={categories || []} deals={(deals || []).map(deal => ({ id: deal.id, name: deal.name, deal_price: deal.deal_price, summary: (deal.restaurant_deal_items || []).map(item => { const product = Array.isArray(item.products) ? item.products[0] : item.products; return `${item.quantity} x ${product?.name || 'Item'}` }).join(', ') }))} currency={context.shop.currency} />
    }
    const names = new Map((tables || []).map(table => [table.id, table.name_or_number]))
    return <div className="space-y-5"><header className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold text-orange-600">RESTAURANT POS</p><h1 className="text-2xl font-black">Order / Pay</h1><p className="text-sm text-gray-500">Choose an order, add menu items or deals, then checkout from the cart.</p></div><Link href="/dashboard/sales" className="rounded-lg border px-4 py-2">Sales history</Link></header><NewOrderForm tables={tables || []} />{active.length > 0 && <section><div className="mb-2 flex items-center justify-between"><h2 className="font-bold">Open orders</h2><span className="text-sm text-gray-500">{active.length} active</span></div><div className="flex gap-2 overflow-x-auto pb-1">{active.map(order => <Link key={order.id} href={`/dashboard/orders?order=${order.id}`} className={`min-w-[150px] rounded-xl border p-3 ${selected === order.id ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/30' : 'bg-white dark:bg-gray-900'}`}><b className="block">#{order.order_number}</b><span className="block text-xs text-gray-500">{order.order_type === 'takeaway' ? 'Takeaway' : names.get(order.table_id) || 'Dine-in'}</span><span className="text-sm font-bold">Rs. {Number(order.total_amount || 0).toLocaleString()}</span></Link>)}</div></section>}{workspace || <div className="rounded-2xl border border-dashed p-10 text-center text-gray-500">Create a new order or select an open order to load the POS workspace.</div>}</div>
}