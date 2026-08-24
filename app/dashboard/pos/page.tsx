import { createClient } from '@/lib/supabase/server'
import POSClient from './POSClient'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { dictionaries } from '@/lib/dictionary'
import { getCurrentShopContext, requireShopModule } from '@/lib/shop-context'

export default async function POSPage() {
    const context = await getCurrentShopContext()
    requireShopModule(context, 'pos')
    if (context.shopType === 'restaurant') redirect('/dashboard/orders')
    const supabase = await createClient()

    const cookieStore = await cookies()
    const lang = cookieStore.get('lang')?.value || 'en'
    const t = dictionaries[lang] || dictionaries['en']

    const { data: products } = await supabase.from('products').select('*').eq('is_active', true).order('name', { ascending: true })
    let saleableProducts = products || []
    if (context.shopType === 'pharmacy') {
        const today = new Date().toISOString().slice(0, 10)
        const { data: validBatches } = await supabase.from('medicine_batches')
            .select('product_id,quantity,expiry_date').eq('is_active', true).gt('quantity', 0).gte('expiry_date', today)
        const availability = new Map<string, { quantity: number; nearestExpiry: string }>()
        for (const batch of validBatches || []) {
            const current = availability.get(batch.product_id)
            availability.set(batch.product_id, {
                quantity: (current?.quantity || 0) + Number(batch.quantity || 0),
                nearestExpiry: !current || batch.expiry_date < current.nearestExpiry ? batch.expiry_date : current.nearestExpiry,
            })
        }
        saleableProducts = saleableProducts
            .filter(product => availability.has(product.id))
            .map(product => ({ ...product, quantity: availability.get(product.id)?.quantity || 0, nearest_expiry: availability.get(product.id)?.nearestExpiry }))
    }
    const { data: customers } = await supabase.from('customers').select('id, name, phone, balance').order('name', { ascending: true })

    return <POSClient products={saleableProducts} customers={customers || []} groceryMode={context.shopType === 'grocery'} shopType={context.shopType} t={t.pos} />
}
