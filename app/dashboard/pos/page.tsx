import { createClient } from '@/lib/supabase/server'
import POSClient from './POSClient'
import { cookies } from 'next/headers'
import { dictionaries } from '@/lib/dictionary'

export default async function POSPage() {
    const supabase = await createClient()

    const cookieStore = await cookies()
    const lang = cookieStore.get('lang')?.value || 'en'
    const t = dictionaries[lang] || dictionaries['en']

    const { data: products } = await supabase.from('products').select('*').order('name', { ascending: true })
    const { data: customers } = await supabase.from('customers').select('id, name, phone, balance').order('name', { ascending: true })

    return <POSClient products={products || []} customers={customers || []} t={t.pos} />
}