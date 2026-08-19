'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function updateStock(formData: FormData) {
    const supabase = await createClient()

    const productId = formData.get('product_id') as string
    const adjustmentType = formData.get('adjustment_type') as string // 'add', 'subtract', 'set'
    const amount = parseFloat(formData.get('amount') as string)

    if (isNaN(amount) || amount < 0) {
        redirect('/dashboard/inventory?error=Invalid amount')
    }

    // Fetch current quantity
    const { data: product, error: fetchError } = await supabase
        .from('products')
        .select('quantity')
        .eq('id', productId)
        .single()

    if (fetchError || !product) {
        redirect('/dashboard/inventory?error=Product not found')
    }

    let newQuantity = product.quantity
    if (adjustmentType === 'add') newQuantity += amount
    if (adjustmentType === 'subtract') newQuantity -= amount
    if (adjustmentType === 'set') newQuantity = amount

    if (newQuantity < 0) newQuantity = 0 // Prevent negative stock

    const { error } = await supabase
        .from('products')
        .update({ quantity: newQuantity })
        .eq('id', productId)

    if (error) {
        redirect('/dashboard/inventory?error=' + encodeURIComponent(error.message))
    }

    revalidatePath('/dashboard/inventory')
    redirect('/dashboard/inventory')
}