'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function addCustomer(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    const { data: shop } = await supabase
        .from('shops')
        .select('id')
        .eq('owner_id', user.id)
        .single()

    if (!shop) redirect('/onboarding')

    const customerData = {
        shop_id: shop.id,
        name: formData.get('name') as string,
        phone: formData.get('phone') as string,
        email: formData.get('email') as string,
        address: formData.get('address') as string,
    }

    const { error } = await supabase.from('customers').insert(customerData)

    if (error) {
        redirect('/dashboard/customers/new?error=' + encodeURIComponent(error.message))
    }

    revalidatePath('/dashboard/contacts')
    redirect('/dashboard/contacts')
}

export async function deleteCustomer(formData: FormData) {
    const supabase = await createClient()
    const customerId = formData.get('customer_id') as string

    const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerId)

    if (error) {
        redirect('/dashboard/contacts?error=' + encodeURIComponent(error.message))
    }

    revalidatePath('/dashboard/contacts')
    redirect('/dashboard/contacts')
}
export async function collectCustomerPayment(formData: FormData) {
    const supabase = await createClient()
    const customerId = formData.get('customer_id') as string
    const amount = parseFloat(formData.get('amount') as string)

    if (!customerId || isNaN(amount) || amount <= 0) {
        redirect('/dashboard/contacts?error=Invalid payment amount')
        return
    }

    const { data: customer } = await supabase.from('customers').select('balance').eq('id', customerId).single()
    if (!customer) {
        redirect('/dashboard/contacts?error=Customer not found')
        return
    }

    const newBalance = Math.max(0, (customer.balance || 0) - amount)

    const { error } = await supabase.from('customers').update({ balance: newBalance }).eq('id', customerId)

    if (error) {
        redirect('/dashboard/contacts?error=' + encodeURIComponent(error.message))
    }

    revalidatePath('/dashboard/contacts')
    redirect('/dashboard/contacts')
}