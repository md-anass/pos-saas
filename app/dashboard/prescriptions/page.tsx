import { createClient } from '@/lib/supabase/server'
import { getCurrentShopContext, requireShopModule } from '@/lib/shop-context'
import {
    addPrescriptionItem, createPrescription, dispensePrescription, removePrescriptionItem,
    updatePrescription, updatePrescriptionStatus,
} from '../industry-actions'

type Item = { id: string; prescription_id: string; quantity: number; notes: string | null; products: { name: string } | { name: string }[] | null }

export default async function PrescriptionsPage() {
    const context = await getCurrentShopContext()
    requireShopModule(context, 'prescriptions')
    const supabase = await createClient()
    const [{ data: prescriptions }, { data: customers }, { data: products }, { data: rawItems }] = await Promise.all([
        supabase.from('prescriptions').select('id,prescription_number,customer_id,doctor_name,notes,status,sale_id').order('created_at', { ascending: false }),
        supabase.from('customers').select('id,name').order('name'),
        supabase.from('products').select('id,name').eq('is_active', true).order('name'),
        supabase.from('prescription_items').select('id,prescription_id,quantity,notes,products(name)'),
    ])
    const items = (rawItems || []) as Item[]
    const itemName = (item: Item) => Array.isArray(item.products) ? item.products[0]?.name : item.products?.name

    return <div className="space-y-6">
        <div><h1 className="text-2xl font-bold">Prescriptions</h1><p className="text-sm text-gray-500">Edit patient records, medicines and dispensing lifecycle.</p></div>
        <form action={createPrescription} className="grid gap-2 rounded-2xl border bg-white p-4 md:grid-cols-4 dark:bg-gray-900">
            <input name="prescription_number" required placeholder="Prescription number" className="rounded border p-2" />
            <select name="customer_id" className="rounded border p-2"><option value="">Walk-in patient</option>{customers?.map(customer => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select>
            <input name="doctor_name" placeholder="Doctor" className="rounded border p-2" />
            <input name="notes" placeholder="Notes" className="rounded border p-2" />
            <button className="rounded bg-cyan-700 p-2 text-white md:col-span-4">Create prescription</button>
        </form>
        <div className="space-y-4">{prescriptions?.map(prescription => {
            const editable = ['pending', 'ready'].includes(prescription.status) && !prescription.sale_id
            return <article key={prescription.id} className="rounded-2xl border bg-white p-5 dark:bg-gray-900">
                <div className="flex flex-wrap justify-between gap-3"><div><h2 className="font-bold">{prescription.prescription_number}</h2><p className="text-sm text-gray-500">{prescription.status.toUpperCase()}</p></div>
                    {editable && <form action={updatePrescriptionStatus} className="flex gap-2"><input type="hidden" name="id" value={prescription.id} /><select name="status" defaultValue={prescription.status} className="rounded border p-2"><option value="pending">Pending</option><option value="ready">Ready</option><option value="cancelled">Cancelled</option></select><button className="rounded border px-3">Change status</button></form>}
                </div>
                {editable && <form action={updatePrescription} className="mt-3 grid gap-2 sm:grid-cols-3"><input type="hidden" name="id" value={prescription.id} />
                    <select name="customer_id" defaultValue={prescription.customer_id || ''} className="rounded border p-2"><option value="">Walk-in patient</option>{customers?.map(customer => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select>
                    <input name="doctor_name" defaultValue={prescription.doctor_name || ''} placeholder="Doctor" className="rounded border p-2" />
                    <input name="notes" defaultValue={prescription.notes || ''} placeholder="Notes" className="rounded border p-2" />
                    <button className="rounded border p-2 sm:col-span-3">Save prescription details</button></form>}
                <div className="my-3 space-y-2">{items.filter(item => item.prescription_id === prescription.id).map(item =>
                    <div key={item.id} className="flex justify-between rounded bg-gray-50 p-2 dark:bg-gray-800"><span>{itemName(item)} × {item.quantity}{item.notes && ` · ${item.notes}`}</span>
                        {editable && <form action={removePrescriptionItem}><input type="hidden" name="id" value={item.id} /><button className="text-red-600">Remove</button></form>}</div>)}</div>
                {editable && <form action={addPrescriptionItem} className="flex flex-wrap gap-2"><input type="hidden" name="prescription_id" value={prescription.id} />
                    <select name="product_id" required className="rounded border p-2"><option value="">Medicine</option>{products?.map(product => <option key={product.id} value={product.id}>{product.name}</option>)}</select>
                    <input name="quantity" type="number" min="1" step="1" defaultValue="1" className="w-20 rounded border p-2" />
                    <input name="notes" placeholder="Directions / notes" className="rounded border p-2" />
                    <button className="rounded bg-gray-900 px-3 text-white">Add medicine</button></form>}
                {prescription.status === 'ready' && !prescription.sale_id && <form action={dispensePrescription} className="mt-3 flex gap-2"><input type="hidden" name="id" value={prescription.id} /><select name="payment_method" className="rounded border p-2"><option value="cash">Cash</option><option value="card">Card</option></select><button className="rounded bg-emerald-600 px-4 text-white">Dispense & receipt</button></form>}
            </article>})}</div>
    </div>
}