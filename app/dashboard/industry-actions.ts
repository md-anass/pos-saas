'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentShopContext, requireShopModule } from '@/lib/shop-context'
import type { CurrentShopContext } from '@/lib/shop-context'
import type { ShopModule, ShopType } from '@/lib/shop-capabilities'

async function secured(moduleKey: ShopModule, shopType?: ShopType) {
    const context = await getCurrentShopContext()
    requireShopModule(context, moduleKey)
    if (shopType && context.shopType !== shopType) {
        throw new Error('This workflow is not enabled for the current shop type')
    }
    return { context, supabase: await createClient() }
}

const readText = (data: FormData, key: string) => String(data.get(key) || '').trim()
const readNumber = (data: FormData, key: string) => Number(data.get(key) || 0)
const readUuid = (data: FormData, key: string) => readText(data, key) || null
function fail(path: string, message: string): never {
    redirect(`${path}?error=${encodeURIComponent(message)}`)
}

function validateProductInput(data: FormData, path: string) {
    const name = readText(data, 'name')
    const purchasePrice = readNumber(data, 'cost')
    const sellingPrice = readNumber(data, 'price')
    if (!name || purchasePrice < 0 || sellingPrice < 0) fail(path, 'Invalid item details')
    return { name, purchasePrice, sellingPrice }
}

async function updateIndustryProduct(context: CurrentShopContext, data: FormData, path: string) {
    const supabase = await createClient()
    const { name, purchasePrice, sellingPrice } = validateProductInput(data, path)
    const { error } = await supabase
        .from('products')
        .update({ name, sku: readText(data, 'sku') || null, barcode: readText(data, 'barcode') || null, purchase_price: purchasePrice, selling_price: sellingPrice })
        .eq('id', readText(data, 'id'))
        .eq('shop_id', context.shop.id)
        .eq('is_active', true)
    if (error) fail(path, error.message)
    revalidatePath(path)
}

export async function createMenuItem(data: FormData) {
    const { context, supabase } = await secured('menu', 'restaurant')
    const { name, purchasePrice, sellingPrice } = validateProductInput(data, '/dashboard/menu')
    const quantity = readNumber(data, 'quantity')
    if (!Number.isInteger(quantity) || quantity < 0) fail('/dashboard/menu', 'Menu stock must be a non-negative whole number')
    const { error } = await supabase.from('products').insert({
        shop_id: context.shop.id, name, sku: readText(data, 'sku') || null, selling_price: sellingPrice,
        purchase_price: purchasePrice, quantity, min_stock: 0, unit: 'Plate', unit_type: 'piece',
        allows_decimal_quantity: false, is_active: true,
    })
    if (error) fail('/dashboard/menu', error.message)
    revalidatePath('/dashboard/menu')
}

export async function updateMenuItem(data: FormData) {
    const { context } = await secured('menu', 'restaurant')
    await updateIndustryProduct(context, data, '/dashboard/menu')
}

export async function archiveMenuItem(data: FormData) {
    const { context, supabase } = await secured('menu', 'restaurant')
    const productId = readText(data, 'id')
    const { count } = await supabase.from('restaurant_order_items').select('id', { count: 'exact', head: true }).eq('product_id', productId)
    if ((count || 0) > 0) {
        const { error } = await supabase.from('products').update({ is_active: false }).eq('id', productId).eq('shop_id', context.shop.id)
        if (error) fail('/dashboard/menu', error.message)
    } else {
        const { error } = await supabase.from('products').update({ is_active: false }).eq('id', productId).eq('shop_id', context.shop.id)
        if (error) fail('/dashboard/menu', error.message)
    }
    revalidatePath('/dashboard/menu')
}

export async function updateMedicine(data: FormData) {
    const { context } = await secured('medicines', 'pharmacy')
    await updateIndustryProduct(context, data, '/dashboard/medicines')
}

export async function archiveMedicine(data: FormData) {
    const { context, supabase } = await secured('medicines', 'pharmacy')
    const { error } = await supabase.from('products').update({ is_active: false }).eq('id', readText(data, 'id')).eq('shop_id', context.shop.id)
    if (error) fail('/dashboard/medicines', error.message)
    revalidatePath('/dashboard/medicines')
}

export async function createTable(data: FormData) {
    const { context, supabase } = await secured('restaurant_tables', 'restaurant')
    const name = readText(data, 'name')
    const capacity = readNumber(data, 'capacity')
    if (!name || !Number.isInteger(capacity) || capacity < 1) fail('/dashboard/tables', 'Invalid table details')
    const { error } = await supabase.from('restaurant_tables').insert({ shop_id: context.shop.id, name_or_number: name, capacity })
    if (error) fail('/dashboard/tables', error.message)
    revalidatePath('/dashboard/tables')
}

export async function updateTable(data: FormData) {
    const { context, supabase } = await secured('restaurant_tables', 'restaurant')
    const capacity = readNumber(data, 'capacity')
    if (!readText(data, 'name') || !Number.isInteger(capacity) || capacity < 1) fail('/dashboard/tables', 'Invalid table details')
    const { error } = await supabase.from('restaurant_tables').update({
        name_or_number: readText(data, 'name'), capacity, status: readText(data, 'status'),
    }).eq('id', readText(data, 'id')).eq('shop_id', context.shop.id)
    if (error) fail('/dashboard/tables', error.message)
    revalidatePath('/dashboard/tables')
}

export async function archiveTable(data: FormData) {
    const { context, supabase } = await secured('restaurant_tables', 'restaurant')
    const tableId = readText(data, 'id')
    const { count } = await supabase.from('restaurant_orders').select('id', { count: 'exact', head: true })
        .eq('table_id', tableId).in('status', ['pending', 'confirmed', 'preparing', 'ready', 'served'])
    if ((count || 0) > 0) fail('/dashboard/tables', 'Cannot archive a table with an active order')
    const { error } = await supabase.from('restaurant_tables').update({ status: 'inactive' }).eq('id', tableId).eq('shop_id', context.shop.id)
    if (error) fail('/dashboard/tables', error.message)
    revalidatePath('/dashboard/tables')
}

export async function createOrder(data: FormData) {
    const { supabase } = await secured('restaurant_orders', 'restaurant')
    const orderType = readText(data, 'order_type')
    const tableId = readUuid(data, 'table_id')
    if (!['dine_in', 'takeaway'].includes(orderType) || (orderType === 'dine_in' && !tableId)) fail('/dashboard/orders', 'Invalid order type or table')
    const { error } = await supabase.rpc('create_restaurant_order', { p_order_type: orderType, p_table_id: tableId, p_notes: readText(data, 'notes') || null })
    if (error) fail('/dashboard/orders', error.message)
    revalidatePath('/dashboard/orders'); revalidatePath('/dashboard/tables')
}

export async function addOrderItem(data: FormData) {
    const { context, supabase } = await secured('restaurant_orders', 'restaurant')
    const productId = readText(data, 'product_id')
    const quantity = readNumber(data, 'quantity')
    const { data: product } = await supabase.from('products').select('id,selling_price').eq('id', productId).eq('shop_id', context.shop.id).eq('is_active', true).single()
    if (!product || !Number.isInteger(quantity) || quantity <= 0) fail('/dashboard/orders', 'Invalid order item')
    const { error } = await supabase.from('restaurant_order_items').upsert({
        shop_id: context.shop.id, order_id: readText(data, 'order_id'), product_id: productId,
        quantity, unit_price: product.selling_price, notes: readText(data, 'notes') || null,
    }, { onConflict: 'order_id,product_id' })
    if (error) fail('/dashboard/orders', error.message)
    revalidatePath('/dashboard/orders'); revalidatePath('/dashboard/kitchen')
}

export async function removeOrderItem(data: FormData) {
    const { context, supabase } = await secured('restaurant_orders', 'restaurant')
    const { error } = await supabase.from('restaurant_order_items').delete().eq('id', readText(data, 'id')).eq('shop_id', context.shop.id)
    if (error) fail('/dashboard/orders', error.message)
    revalidatePath('/dashboard/orders'); revalidatePath('/dashboard/kitchen')
}

export async function updateOrderStatus(data: FormData) {
    const routeModule = readText(data, 'source') === 'kitchen' ? 'kitchen' : 'restaurant_orders'
    const { supabase } = await secured(routeModule, 'restaurant')
    const { error } = await supabase.rpc('transition_restaurant_order', { p_order_id: readText(data, 'id'), p_status: readText(data, 'status') })
    if (error) fail(routeModule === 'kitchen' ? '/dashboard/kitchen' : '/dashboard/orders', error.message)
    revalidatePath('/dashboard/orders'); revalidatePath('/dashboard/kitchen'); revalidatePath('/dashboard/tables')
}

export async function payRestaurantOrder(data: FormData) {
    const { supabase } = await secured('restaurant_orders', 'restaurant')
    const { data: saleId, error } = await supabase.rpc('complete_restaurant_order', { p_order_id: readText(data, 'id'), p_payment_method: readText(data, 'payment_method') || 'cash' })
    if (error) fail('/dashboard/orders', error.message)
    redirect(`/dashboard/sales/${saleId}/receipt`)
}

export async function createBatch(data: FormData) {
    const { context, supabase } = await secured('medicine_batches')
    if (!['grocery', 'pharmacy'].includes(context.shopType)) throw new Error('Batch workflow is not enabled for this shop type')
    const quantity = readNumber(data, 'quantity')
    if (quantity < 0 || !readText(data, 'batch_number')) fail('/dashboard/batches', 'Invalid batch details')
    const operation = context.shopType === 'grocery' && readText(data, 'stock_intent') === 'allocate' ? 'allocate' : 'create'
    const { error } = await supabase.rpc('manage_inventory_batch', {
        p_kind: context.shopType, p_operation: operation, p_batch_id: null,
        p_product_id: readText(data, 'product_id'), p_batch_number: readText(data, 'batch_number'),
        p_manufacture_date: readUuid(data, 'manufacture_date'), p_expiry_date: readUuid(data, 'expiry_date'),
        p_quantity: quantity, p_supplier_id: readUuid(data, 'supplier_id'),
        p_purchase_price: readNumber(data, 'purchase_price'), p_selling_price: readNumber(data, 'selling_price'),
    })
    if (error) fail('/dashboard/batches', error.message)
    revalidatePath('/dashboard/batches'); revalidatePath('/dashboard/expiry'); revalidatePath('/dashboard/inventory')
}

export async function updateBatch(data: FormData) {
    const { context, supabase } = await secured('medicine_batches')
    if (!['grocery', 'pharmacy'].includes(context.shopType)) throw new Error('Batch workflow is not enabled for this shop type')
    const { error } = await supabase.rpc('manage_inventory_batch', {
        p_kind: context.shopType, p_operation: 'update', p_batch_id: readText(data, 'id'), p_product_id: null,
        p_batch_number: readText(data, 'batch_number'), p_manufacture_date: readUuid(data, 'manufacture_date'),
        p_expiry_date: readUuid(data, 'expiry_date'), p_quantity: readNumber(data, 'quantity'),
        p_supplier_id: readUuid(data, 'supplier_id'), p_purchase_price: readNumber(data, 'purchase_price'),
        p_selling_price: readNumber(data, 'selling_price'),
    })
    if (error) fail('/dashboard/batches', error.message)
    revalidatePath('/dashboard/batches'); revalidatePath('/dashboard/expiry'); revalidatePath('/dashboard/inventory')
}

export async function archiveBatch(data: FormData) {
    const { context, supabase } = await secured('medicine_batches')
    if (!['grocery', 'pharmacy'].includes(context.shopType)) throw new Error('Batch workflow is not enabled for this shop type')
    const { error } = await supabase.rpc('manage_inventory_batch', {
        p_kind: context.shopType, p_operation: 'archive', p_batch_id: readText(data, 'id'), p_product_id: null,
        p_batch_number: null, p_manufacture_date: null, p_expiry_date: null, p_quantity: null,
        p_supplier_id: null, p_purchase_price: 0, p_selling_price: 0,
    })
    if (error) fail('/dashboard/batches', error.message)
    revalidatePath('/dashboard/batches'); revalidatePath('/dashboard/expiry'); revalidatePath('/dashboard/inventory')
}

export async function createPrescription(data: FormData) {
    const { context, supabase } = await secured('prescriptions', 'pharmacy')
    const prescriptionNumber = readText(data, 'prescription_number')
    if (!prescriptionNumber) fail('/dashboard/prescriptions', 'Prescription number is required')
    const { error } = await supabase.from('prescriptions').insert({
        shop_id: context.shop.id, customer_id: readUuid(data, 'customer_id'), prescription_number: prescriptionNumber,
        doctor_name: readText(data, 'doctor_name') || null, notes: readText(data, 'notes') || null, status: 'pending',
    })
    if (error) fail('/dashboard/prescriptions', error.message)
    revalidatePath('/dashboard/prescriptions')
}

export async function updatePrescription(data: FormData) {
    const { context, supabase } = await secured('prescriptions', 'pharmacy')
    const { error } = await supabase.from('prescriptions').update({
        customer_id: readUuid(data, 'customer_id'), doctor_name: readText(data, 'doctor_name') || null,
        notes: readText(data, 'notes') || null,
    }).eq('id', readText(data, 'id')).eq('shop_id', context.shop.id).in('status', ['pending', 'ready'])
    if (error) fail('/dashboard/prescriptions', error.message)
    revalidatePath('/dashboard/prescriptions')
}

export async function addPrescriptionItem(data: FormData) {
    const { context, supabase } = await secured('prescriptions', 'pharmacy')
    const quantity = readNumber(data, 'quantity')
    if (!Number.isInteger(quantity) || quantity <= 0) fail('/dashboard/prescriptions', 'Quantity must be a positive whole number')
    const { error } = await supabase.from('prescription_items').upsert({
        shop_id: context.shop.id, prescription_id: readText(data, 'prescription_id'),
        product_id: readText(data, 'product_id'), quantity, notes: readText(data, 'notes') || null,
    }, { onConflict: 'prescription_id,product_id' })
    if (error) fail('/dashboard/prescriptions', error.message)
    revalidatePath('/dashboard/prescriptions')
}

export async function removePrescriptionItem(data: FormData) {
    const { context, supabase } = await secured('prescriptions', 'pharmacy')
    const { error } = await supabase.from('prescription_items').delete().eq('id', readText(data, 'id')).eq('shop_id', context.shop.id)
    if (error) fail('/dashboard/prescriptions', error.message)
    revalidatePath('/dashboard/prescriptions')
}

export async function updatePrescriptionStatus(data: FormData) {
    const { context, supabase } = await secured('prescriptions', 'pharmacy')
    const { error } = await supabase.from('prescriptions').update({ status: readText(data, 'status') })
        .eq('id', readText(data, 'id')).eq('shop_id', context.shop.id)
    if (error) fail('/dashboard/prescriptions', error.message)
    revalidatePath('/dashboard/prescriptions')
}

export async function dispensePrescription(data: FormData) {
    const { supabase } = await secured('prescriptions', 'pharmacy')
    const { data: saleId, error } = await supabase.rpc('dispense_prescription', {
        p_prescription_id: readText(data, 'id'), p_payment_method: readText(data, 'payment_method') || 'cash',
    })
    if (error) fail('/dashboard/prescriptions', error.message)
    redirect(`/dashboard/sales/${saleId}/receipt`)
}