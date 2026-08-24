import { createClient } from '@/lib/supabase/server'
import { getCurrentShopContext, requireShopModule } from '@/lib/shop-context'
import { addPrescriptionItem, createPrescription, dispensePrescription, removePrescriptionItem, updatePrescription, updatePrescriptionStatus } from '../industry-actions'

type Item = { id: string; prescription_id: string; quantity: number; notes: string | null; products: { name: string } | { name: string }[] | null }
const fieldClass = 'mt-1 w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm dark:border-gray-700 dark:bg-gray-800'
const labelClass = 'text-xs font-semibold uppercase tracking-wide text-gray-500'

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
        <div><p className="text-sm font-semibold text-cyan-700">DISPENSING WORKFLOW</p><h1 className="text-2xl font-bold">Prescriptions</h1><p className="text-sm text-gray-500">Record patient prescriptions, prepare medicines and dispense through valid non-expired batches.</p></div>
        <form action={createPrescription} className="rounded-2xl border bg-white p-5 dark:bg-gray-900">
            <h2 className="mb-4 font-semibold">New prescription</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <label className={labelClass}>Prescription Number *<input name="prescription_number" required placeholder="e.g. RX-2026-001" className={fieldClass} /></label>
                <label className={labelClass}>Patient / Customer<select name="customer_id" className={fieldClass}><option value="">Walk-in patient</option>{customers?.map(customer => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label>
                <label className={labelClass}>Prescriber / Doctor<input name="doctor_name" placeholder="Optional" className={fieldClass} /></label>
                <label className={labelClass}>Clinical Directions / Notes<input name="notes" placeholder="Optional dispensing notes" className={fieldClass} /></label>
            </div>
            <button className="mt-4 rounded-lg bg-cyan-700 px-5 py-2.5 text-white">Create prescription</button>
        </form>
        {!prescriptions?.length && <div className="rounded-2xl border border-dashed p-10 text-center text-gray-500">No prescriptions recorded. Create the first prescription above.</div>}
        <div className="space-y-4">{prescriptions?.map(prescription => {
            const editable = ['pending', 'ready'].includes(prescription.status) && !prescription.sale_id
            const prescriptionItems = items.filter(item => item.prescription_id === prescription.id)
            return <article key={prescription.id} className="rounded-2xl border bg-white p-5 dark:bg-gray-900">
                <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-bold">{prescription.prescription_number}</h2><p className="text-sm text-gray-500">{prescriptionItems.length} medicine(s)</p></div><span className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-semibold uppercase text-cyan-700 dark:bg-cyan-950/30">{prescription.status}</span></div>
                {editable && <form action={updatePrescription} className="mt-4 grid gap-3 sm:grid-cols-3"><input type="hidden" name="id" value={prescription.id} /><label className={labelClass}>Patient<select name="customer_id" defaultValue={prescription.customer_id || ''} className={fieldClass}><option value="">Walk-in patient</option>{customers?.map(customer => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label><label className={labelClass}>Prescriber / Doctor<input name="doctor_name" defaultValue={prescription.doctor_name || ''} className={fieldClass} /></label><label className={labelClass}>Directions / Notes<input name="notes" defaultValue={prescription.notes || ''} className={fieldClass} /></label><button className="rounded-lg border p-2.5 font-medium sm:col-span-3">Save prescription details</button></form>}
                <div className="my-4 space-y-2">{prescriptionItems.map(item => <div key={item.id} className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-800"><span><b>{itemName(item)}</b> · Qty {item.quantity}{item.notes && ' · ' + item.notes}</span>{editable && <form action={removePrescriptionItem}><input type="hidden" name="id" value={item.id} /><button className="text-sm text-red-600">Remove</button></form>}</div>)}</div>
                {editable && <form action={addPrescriptionItem} className="grid gap-3 rounded-xl border p-4 sm:grid-cols-[1fr_110px_1fr_auto] sm:items-end"><input type="hidden" name="prescription_id" value={prescription.id} /><label className={labelClass}>Medicine *<select name="product_id" required className={fieldClass}><option value="">Select medicine</option>{products?.map(product => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label><label className={labelClass}>Quantity *<input name="quantity" type="number" min="1" step="1" required placeholder="1" className={fieldClass} /></label><label className={labelClass}>Directions<input name="notes" placeholder="e.g. twice daily" className={fieldClass} /></label><button className="rounded-lg bg-gray-900 px-4 py-2.5 text-white dark:bg-gray-100 dark:text-gray-900">Add medicine</button></form>}
                <div className="mt-4 flex flex-wrap justify-end gap-3">{editable && <form action={updatePrescriptionStatus} className="flex gap-2"><input type="hidden" name="id" value={prescription.id} /><select name="status" defaultValue={prescription.status} className="rounded-lg border p-2.5"><option value="pending">Pending</option><option value="ready">Ready to dispense</option><option value="cancelled">Cancelled</option></select><button className="rounded-lg border px-4">Update status</button></form>}{prescription.status === 'ready' && !prescription.sale_id && <form action={dispensePrescription} className="flex gap-2"><input type="hidden" name="id" value={prescription.id} /><select name="payment_method" className="rounded-lg border p-2.5"><option value="cash">Cash</option><option value="card">Card</option><option value="bank">Bank transfer</option></select><button className="rounded-lg bg-emerald-600 px-4 text-white">Dispense & open receipt</button></form>}{prescription.sale_id && <span className="rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-700">Dispensed</span>}</div>
            </article>
        })}</div>
    </div>
}