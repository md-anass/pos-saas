import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { dictionaries } from '@/lib/dictionary'
import { addExpense, deleteExpense, addEmployee, toggleEmployeeStatus, deleteEmployee } from './actions'
import { UserPlus, Trash2, BadgeCheck, UserX, Wallet, Users } from 'lucide-react'
import { getCurrentShopContext, requireShopModule } from '@/lib/shop-context'
import { formatCurrency } from '@/lib/currency'

export default async function ExpensesPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
    const context = await getCurrentShopContext()
    const money = (value: number) => formatCurrency(value, context.shop.currency)
    requireShopModule(context, 'expenses')
    const supabase = await createClient()
    const params = await searchParams
    const cookieStore = await cookies()
    const lang = cookieStore.get('lang')?.value || 'en'
    const { data: expenses } = await supabase.from('expenses').select('*').order('created_at', { ascending: false })
    const { data: employees } = await supabase.from('employees').select('*').order('created_at', { ascending: false })

    // Calculate Payroll
    const activePayroll = employees?.filter(e => e.is_active).reduce((sum, e) => sum + e.salary, 0) || 0

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">HR & Expenses</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage staff payroll and business expenses</p>
                </div>
            </div>

            {params.error && (
                <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
                    {decodeURIComponent(params.error)}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* STAFF & PAYROLL SECTION */}
                <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                    <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100 dark:border-gray-800">
                        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
                            <Users className="text-blue-600 dark:text-blue-400" size={20} /> Staff & Payroll
                        </h2>
                        <span className="text-xs font-medium text-gray-500">Monthly: <span className="font-bold text-gray-900 dark:text-white">{money(activePayroll)}</span></span>
                    </div>

                    {/* Add Employee Form */}
                    <form action={addEmployee} className="grid grid-cols-2 gap-3 mb-6">
                        <input name="name" type="text" required placeholder="Name" className="p-2 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-blue-500" />
                        <input name="role" type="text" placeholder="Role (e.g. Cashier)" className="p-2 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-blue-500" />
                        <input name="phone" type="text" placeholder="Phone" className="p-2 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-blue-500" />
                        <input name="salary" type="number" required placeholder="Salary (Rs)" className="p-2 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-blue-500" />
                        <button type="submit" className="col-span-2 flex items-center justify-center gap-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors">
                            <UserPlus size={16} /> Add Staff Member
                        </button>
                    </form>

                    {/* Employee List */}
                    <div className="space-y-2">
                        {employees && employees.length > 0 ? (
                            employees.map((emp) => (
                                <div key={emp.id} className="group flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border border-gray-100 dark:border-gray-800">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${emp.is_active ? 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400' : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500'}`}>
                                            {emp.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">{emp.name} <span className="text-xs text-gray-400 font-normal">({emp.role || 'N/A'})</span></p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Salary: {money(emp.salary)}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {/* Toggle Active Status */}
                                        <form action={toggleEmployeeStatus}>
                                            <input type="hidden" name="emp_id" value={emp.id} />
                                            <input type="hidden" name="is_active" value={emp.is_active.toString()} />
                                            <button type="submit" className={`p-1.5 rounded-md transition-colors ${emp.is_active ? 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`} title={emp.is_active ? 'Active (Click to Deactivate)' : 'Inactive (Click to Activate)'}>
                                                {emp.is_active ? <BadgeCheck size={16} /> : <UserX size={16} />}
                                            </button>
                                        </form>

                                        {/* Delete */}
                                        <form action={deleteEmployee}>
                                            <input type="hidden" name="emp_id" value={emp.id} />
                                            <button type="submit" className="p-1.5 rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors opacity-0 group-hover:opacity-100" title="Delete">
                                                <Trash2 size={16} />
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                <Users className="mx-auto mb-3 text-gray-300 dark:text-gray-600" size={32} />
                                <p className="text-sm">No staff members added yet.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* BUSINESS EXPENSES SECTION */}
                <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                    <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100 dark:border-gray-800">
                        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
                            <Wallet className="text-red-600 dark:text-red-400" size={20} /> Business Expenses
                        </h2>
                    </div>

                    {/* Add Expense Form */}
                    <form action={addExpense} className="grid grid-cols-2 gap-3 mb-6">
                        <select name="category" required className="p-2 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-blue-500">
                            <option value="Rent">Rent</option>
                            <option value="Utilities">Utilities</option>
                            <option value="Salaries">Salaries</option>
                            <option value="Marketing">Marketing</option>
                            <option value="Miscellaneous">Miscellaneous</option>
                        </select>
                        <input name="amount" type="number" step="0.01" required placeholder="Amount (Rs)" className="p-2 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-blue-500" />
                        <input name="description" type="text" placeholder="Description (Optional)" className="col-span-2 p-2 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-blue-500" />
                        <button type="submit" className="col-span-2 flex items-center justify-center gap-1 bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 transition-colors">
                            <Wallet size={16} /> Record Expense
                        </button>
                    </form>

                    {/* Expenses List */}
                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                        {expenses && expenses.length > 0 ? (
                            expenses.map((exp) => (
                                <div key={exp.id} className="group flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border border-gray-100 dark:border-gray-800">
                                    <div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">{exp.category}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{exp.description || 'No description'} - {new Date(exp.created_at).toLocaleDateString()}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-red-600 dark:text-red-400">- {money(exp.amount)}</span>
                                        <form action={deleteExpense}>
                                            <input type="hidden" name="expense_id" value={exp.id} />
                                            <button type="submit" className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors opacity-0 group-hover:opacity-100" title="Delete">
                                                <Trash2 size={14} />
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                <Wallet className="mx-auto mb-3 text-gray-300 dark:text-gray-600" size={32} />
                                <p className="text-sm">No expenses recorded yet.</p>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    )
}
