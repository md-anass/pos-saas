import { createClient } from '@/lib/supabase/server'
import PurchaseClient from '../PurchaseClient'
import { cookies } from 'next/headers'
import { dictionaries } from '@/lib/dictionary'

export default async function NewPurchasePage() {
    const supabase = await createClient()

    const cookieStore = await cookies()
    const lang = cookieStore.get('lang')?.value || 'en'
    const t = dictionaries[lang] || dictionaries['en']

    // Fetch products, suppliers, and locations
    const { data: products } = await supabase.from('products').select('*').order('name', { ascending: true })
    const { data: suppliers } = await supabase.from('suppliers').select('id, name').order('name', { ascending: true })
    const { data: locations } = await supabase.from('locations').select('id, name, type').order('name', { ascending: true })

    return <PurchaseClient products={products || []} suppliers={suppliers || []} locations={locations || []} t={t.purchases} />
}