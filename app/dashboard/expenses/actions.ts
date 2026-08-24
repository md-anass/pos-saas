'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getCurrentShopContext, requireShopModule } from '@/lib/shop-context'

export async function addExpense(formData: FormData) {
    const context = await getCurrentShopContext()
    requireShopModule(context, 'expenses')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    const { data: shop } = await supabase
        .from('shops')
        .select('id')
        .eq('owner_id', user.id)
        .single()

    if (!shop) redirect('/onboarding')

    const expenseData = {
        shop_id: shop.id,
        user_id: user.id,
        category: formData.get('category') as string,
        amount: parseFloat(formData.get('amount') as string),
        description: formData.get('description') as string,
    }

    const { error } = await supabase.from('expenses').insert(expenseData)

    if (error) {
        redirect('/dashboard/expenses?error=' + encodeURIComponent(error.message))
    }

    revalidatePath('/dashboard/expenses')
    redirect('/dashboard/expenses')
}

export async function deleteExpense(formData: FormData) {
    const context = await getCurrentShopContext()
    requireShopModule(context, 'expenses')
    const supabase = await createClient()
    const expenseId = formData.get('expense_id') as string

    const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId)

    if (error) {
        redirect('/dashboard/expenses?error=' + encodeURIComponent(error.message))
    }

    revalidatePath('/dashboard/expenses')
    redirect('/dashboard/expenses')
}
export async function addEmployee(formData: FormData) {
    const supabase = await createClient()
    const context = await getCurrentShopContext()
    requireShopModule(context, 'expenses')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: shop } = await supabase.from('shops').select('id').eq('owner_id', user.id).single()
    if (!shop) redirect('/onboarding')

    const { error } = await supabase.from('employees').insert({
        shop_id: shop.id,
        name: formData.get('name') as string,
        role: formData.get('role') as string,
        phone: formData.get('phone') as string,
        salary: parseFloat(formData.get('salary') as string) || 0,
    })

    if (error) redirect('/dashboard/expenses?error=' + encodeURIComponent(error.message))
    revalidatePath('/dashboard/expenses')
    redirect('/dashboard/expenses')
}

export async function toggleEmployeeStatus(formData: FormData) {
    const context = await getCurrentShopContext()
    requireShopModule(context, 'expenses')
    const supabase = await createClient()
    const empId = formData.get('emp_id') as string
    const currentStatus = formData.get('is_active') === 'true'

    const { error } = await supabase
        .from('employees')
        .update({ is_active: !currentStatus })
        .eq('id', empId)

    if (error) redirect('/dashboard/expenses?error=' + encodeURIComponent(error.message))
    revalidatePath('/dashboard/expenses')
    redirect('/dashboard/expenses')
}

export async function deleteEmployee(formData: FormData) {
    const context = await getCurrentShopContext()
    requireShopModule(context, 'expenses')
    const supabase = await createClient()
    const empId = formData.get('emp_id') as string

    const { error } = await supabase.from('employees').delete().eq('id', empId)

    if (error) redirect('/dashboard/expenses?error=' + encodeURIComponent(error.message))
    revalidatePath('/dashboard/expenses')
    redirect('/dashboard/expenses')
}