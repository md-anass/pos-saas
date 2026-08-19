'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function addCategory(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    const { data: shop } = await supabase
        .from('shops')
        .select('id')
        .eq('owner_id', user.id)
        .single()

    if (!shop) redirect('/onboarding')

    const categoryData = {
        shop_id: shop.id,
        name: formData.get('name') as string,
    }

    const { error } = await supabase.from('categories').insert(categoryData)

    if (error) {
        redirect('/dashboard/categories?error=' + encodeURIComponent(error.message))
    }

    revalidatePath('/dashboard/categories')
    redirect('/dashboard/categories')
}

export async function deleteCategory(formData: FormData) {
    const supabase = await createClient()
    const categoryId = formData.get('category_id') as string

    const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId)

    if (error) {
        redirect('/dashboard/categories?error=' + encodeURIComponent(error.message))
    }

    revalidatePath('/dashboard/categories')
    redirect('/dashboard/categories')
}