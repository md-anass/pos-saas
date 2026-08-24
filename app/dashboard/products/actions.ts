'use server'

import { createClient, getShopId, logAction } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getCurrentShopContext, requireShopModule } from '@/lib/shop-context'

export async function addProduct(formData: FormData) {
    const context = await getCurrentShopContext()
    requireShopModule(context, 'products')
    const supabase = await createClient()

    // 1. SECURE AUTH: Get shop_id from backend session (Works for Owners AND Staff)
    const shopId = await getShopId()
    if (!shopId) {
        redirect('/onboarding')
    }

    // 2. INPUT VALIDATION: Parse and validate all inputs
    const name = (formData.get('name') as string).trim()
    const sku = (formData.get('sku') as string).trim()
    const unit = formData.get('unit') as string
    const unitType = ({ piece: 'piece', Piece: 'piece', Kg: 'kg', Gram: 'gram', Liter: 'liter', Meter: 'meter', Box: 'box', Pack: 'pack', Dozen: 'dozen' } as Record<string, string>)[unit] || 'piece'
    const allowsDecimalQuantity = formData.get('allows_decimal_quantity') === 'on' || ['kg', 'gram', 'liter', 'ml', 'meter'].includes(unitType)
    const purchasePrice = parseFloat(formData.get('purchase_price') as string)
    const sellingPrice = parseFloat(formData.get('selling_price') as string)
    const quantity = parseFloat(formData.get('quantity') as string)
    const minStock = parseFloat(formData.get('min_stock') as string)

    if (!name) {
        redirect('/dashboard/products/new?error=Product name is required')
    }
    if (isNaN(purchasePrice) || purchasePrice < 0) {
        redirect('/dashboard/products/new?error=Invalid purchase price')
    }
    if (isNaN(sellingPrice) || sellingPrice < 0) {
        redirect('/dashboard/products/new?error=Invalid selling price')
    }
    if (isNaN(quantity) || quantity < 0) {
        redirect('/dashboard/products/new?error=Invalid quantity')
    }
    if (isNaN(minStock) || minStock < 0) {
        redirect('/dashboard/products/new?error=Invalid minimum stock')
    }

    // 3. SECURE PAYLOAD: Construct the object with the backend-verified shopId
    const productData = {
        shop_id: shopId,
        name: name,
        sku: sku || null,
        barcode: ((formData.get('barcode') as string) || '').trim() || null,
        unit: unit,
        unit_type: unitType,
        allows_decimal_quantity: allowsDecimalQuantity,
        purchase_price: purchasePrice,
        selling_price: sellingPrice,
        quantity: quantity,
        min_stock: minStock,
        image_url: formData.get('image_url') as string || null,
        category_id: formData.get('category_id') as string || null,
    }

    // 4. EXECUTE: Insert into database
    const { error } = await supabase.from('products').insert(productData)

    if (error) {
        // 5. SECURE ERROR HANDLING: Log raw error to server, show generic message to user
        console.error('Add Product Error:', error.message)
        redirect('/dashboard/products/new?error=Failed to save product. Please check your inputs and try again.')
    }

    revalidatePath('/dashboard/products')
    redirect('/dashboard/products')
}

export async function deleteProduct(formData: FormData) {
    const context = await getCurrentShopContext()
    requireShopModule(context, 'products')
    const supabase = await createClient()
    const productId = formData.get('product_id') as string

    // SECURE AUTH: Get shop_id to ensure we only delete products belonging to this shop
    const shopId = await getShopId()
    if (!shopId) {
        redirect('/login')
    }

    // 1. Fetch the product BEFORE deleting (for audit log and to verify ownership)
    const { data: product, error: fetchError } = await supabase
        .from('products')
        .select('id, name, selling_price, quantity')
        .eq('id', productId)
        .eq('shop_id', shopId) // Extra IDOR protection
        .single()

    if (fetchError || !product) {
        console.error('Fetch Product for Deletion Error:', fetchError?.message)
        redirect('/dashboard/products?error=Product not found or unauthorized.')
    }

    // 2. Delete the product (Match both product_id AND shop_id)
    const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId)
        .eq('shop_id', shopId)

    if (error) {
        // 3. SECURE ERROR HANDLING: Log raw error to server, show generic message to user
        console.error('Delete Product Error:', error.message)
        redirect('/dashboard/products?error=Failed to delete product. Please try again.')
    }

    // 4. SECURE AUDIT TRAIL: Log who deleted it and what it was
    await logAction({
        shopId,
        action: 'DELETE',
        entityType: 'product',
        entityId: productId,
        oldValue: product // Contains name, price, quantity before deletion
    })

    revalidatePath('/dashboard/products')
    redirect('/dashboard/products')
}
