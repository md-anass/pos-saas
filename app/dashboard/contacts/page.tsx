import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { dictionaries } from '@/lib/dictionary'
import { deleteCustomer, collectCustomerPayment } from '../customers/actions'
import { deleteSupplier } from '../suppliers/actions'
import CollectPaymentForm from './CollectPaymentForm'
import { UserPlus, Truck, Users, Phone, Building, Pencil, Trash2, Wallet } from 'lucide-react'
import { getCurrentShopContext, requireShopModule } from '@/lib/shop-context'
import { formatCurrency } from '@/lib/currency'

export default async function ContactsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
    const context = await getCurrentShopContext()
    const money = (value: number) => formatCurrency(value, context.shop.currency)
    requireShopModule(context, 'customers')
    requireShopModule(context, 'suppliers')
    const supabase = await createClient()
    const params = await searchParams
    const cookieStore = await cookies()
    const lang = cookieStore.get('lang')?.value || 'en'
    const t = dictionaries[lang]

    const { data: customers } = await supabase.from('customers').select('id, name, phone, balance').order('name', { ascending: true })
    const { data: suppliers } = await supabase.from('suppliers').select('id, name, company, phone').order('name', { ascending: true })

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t.contacts.title}</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your customers and suppliers ledger</p>
                </div>
            </div>

            {params.error && (
                <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
                    {decodeURIComponent(params.error)}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Customers Column */}
                <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                    <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100 dark:border-gray-800">
                        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
                            <Users className="text-blue-600 dark:text-blue-400" size={20} />
                            {t.contacts.customers}
                            <span className="text-xs font-normal text-gray-400">({customers?.length || 0})</span>
                        </h2>
                        <Link href="/dashboard/customers/new" className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded-md text-xs font-medium hover:bg-blue-700 transition-colors">
                            <UserPlus size={14} /> {t.customers.add_new}
                        </Link>
                    </div>

                    <div className="space-y-2">
                        {customers && customers.length > 0 ? (
                            customers.map((c) => (
                                <div key={c.id} className="group flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        {/* Avatar */}
                                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-sm">
                                            {c.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">{c.name}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                                <Phone size={10} /> {c.phone || 'No phone'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-end gap-1">
                                        {/* Ledger Balance Badge */}
                                        {c.balance > 0 && (
                                            <span className="text-xs font-bold text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                <Wallet size={10} /> {money(c.balance)}
                                            </span>
                                        )}

                                        {/* Actions */}
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {c.balance > 0 && (
                                                <CollectPaymentForm customerId={c.id} action={collectCustomerPayment} />
                                            )}
                                            <button className="text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 p-1.5 rounded-md transition-colors" title="Edit">
                                                <Pencil size={14} />
                                            </button>
                                            <form action={deleteCustomer}>
                                                <input type="hidden" name="customer_id" value={c.id} />
                                                <button type="submit" className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 p-1.5 rounded-md transition-colors" title="Remove">
                                                    <Trash2 size={14} />
                                                </button>
                                            </form>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                                <Users className="mx-auto mb-3 text-gray-300 dark:text-gray-600" size={32} />
                                <p className="text-sm">{t.customers.no_customers}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Suppliers Column */}
                <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                    <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100 dark:border-gray-800">
                        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
                            <Truck className="text-green-600 dark:text-green-400" size={20} />
                            {t.contacts.suppliers}
                            <span className="text-xs font-normal text-gray-400">({suppliers?.length || 0})</span>
                        </h2>
                        <Link href="/dashboard/suppliers/new" className="flex items-center gap-1 bg-green-600 text-white px-3 py-1.5 rounded-md text-xs font-medium hover:bg-green-700 transition-colors">
                            <UserPlus size={14} /> {t.suppliers.add_new}
                        </Link>
                    </div>

                    <div className="space-y-2">
                        {suppliers && suppliers.length > 0 ? (
                            suppliers.map((s) => (
                                <div key={s.id} className="group flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        {/* Avatar */}
                                        <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center text-green-600 dark:text-green-400 font-bold text-sm">
                                            <Building size={18} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">{s.name}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                                <Building size={10} /> {s.company || 'No company'}
                                                {s.phone && <span className="ml-2 flex items-center gap-1"><Phone size={10} /> {s.phone}</span>}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button className="text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 p-1.5 rounded-md transition-colors" title="Edit">
                                            <Pencil size={14} />
                                        </button>
                                        <form action={deleteSupplier}>
                                            <input type="hidden" name="supplier_id" value={s.id} />
                                            <button type="submit" className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 p-1.5 rounded-md transition-colors" title="Remove">
                                                <Trash2 size={14} />
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                                <Truck className="mx-auto mb-3 text-gray-300 dark:text-gray-600" size={32} />
                                <p className="text-sm">{t.suppliers.no_suppliers}</p>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    )
}