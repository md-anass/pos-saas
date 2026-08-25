'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getCurrentShopContext, requireShopModule } from '@/lib/shop-context'

export async function addCategory(formData: FormData) {
    const context = await getCurrentShopContext()
    requireShopModule(context, 'categories')
    const supabase = await createClient()
    const categoryData = {
        shop_id: context.shop.id,
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
    const context = await getCurrentShopContext()
    requireShopModule(context, 'categories')

    const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId)
        .eq('shop_id', context.shop.id)

    if (error) {
        redirect('/dashboard/categories?error=' + encodeURIComponent(error.message))
    }

    revalidatePath('/dashboard/categories')
    redirect('/dashboard/categories')
}