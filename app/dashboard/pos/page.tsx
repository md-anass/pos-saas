import { createClient } from '@/lib/supabase/server'
import POSClient from './POSClient'
import { cookies } from 'next/headers'
import { dictionaries } from '@/lib/dictionary'
import { getCurrentShopContext, requireShopModule } from '@/lib/shop-context'

export default async function POSPage() {
    const context = await getCurrentShopContext()
    requireShopModule(context, 'pos')
    const supabase = await createClient()

    const cookieStore = await cookies()
    const lang = cookieStore.get('lang')?.value || 'en'
    const t = dictionaries[lang] || dictionaries['en']

    const { data: products } = await supabase.from('products').select('*').eq('is_active', true).order('name', { ascending: true })
    const { data: customers } = await supabase.from('customers').select('id, name, phone, balance').order('name', { ascending: true })

    return <POSClient products={products || []} customers={customers || []} groceryMode={context.shopType === 'grocery'} t={t.pos} />
}
