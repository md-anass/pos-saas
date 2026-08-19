'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function addSupplier(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: shop } = await supabase
        .from('shops')
        .select('id')
        .eq('owner_id', user.id)
        .single()

    if (!shop) {
        redirect('/onboarding')
    }

    const supplierData = {
        shop_id: shop.id,
        name: formData.get('name') as string,
        phone: formData.get('phone') as string,
        company: formData.get('company') as string,
        notes: formData.get('notes') as string,
    }

    const { error } = await supabase.from('suppliers').insert(supplierData)

    if (error) {
        redirect('/dashboard/suppliers?error=' + encodeURIComponent(error.message))
    }

    revalidatePath('/dashboard/suppliers')
    redirect('/dashboard/suppliers')
}

export async function deleteSupplier(formData: FormData) {
    const supabase = await createClient()
    const supplierId = formData.get('supplier_id') as string

    const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', supplierId)

    if (error) {
        redirect('/dashboard/suppliers?error=' + encodeURIComponent(error.message))
    }

    revalidatePath('/dashboard/suppliers')
    redirect('/dashboard/suppliers')
}