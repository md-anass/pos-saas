import { createClient } from '@/lib/supabase/server'
import { getCurrentShopContext, requireShopModule } from '@/lib/shop-context'

export default async function PrescriptionsPage() {
    const context = await getCurrentShopContext()
    requireShopModule(context, 'prescriptions')

    const supabase = await createClient()
    const { data: prescriptions } = await supabase.from('prescriptions').select('id, prescription_number, doctor_name, created_at').order('created_at', { ascending: false })

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Prescriptions</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Record prescription references alongside sales.</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                        <tr>
                            <th className="px-6 py-4 text-left">Prescription</th>
                            <th className="px-6 py-4 text-left">Doctor</th>
                            <th className="px-6 py-4 text-left">Date</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                        {prescriptions?.length ? prescriptions.map((prescription) => (
                            <tr key={prescription.id}>
                                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{prescription.prescription_number}</td>
                                <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{prescription.doctor_name || '-'}</td>
                                <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{new Date(prescription.created_at).toLocaleDateString()}</td>
                            </tr>
                        )) : (
                            <tr><td colSpan={3} className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400">No prescriptions yet.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
