'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

export default function AddStaffForm({ action }: { action: (formData: FormData) => Promise<void> }) {
    const [showPassword, setShowPassword] = useState(false)
    const [role, setRole] = useState('cashier')

    const modules = [
        { id: 'pos', label: 'POS / Sales' },
        { id: 'products', label: 'Products & Inventory' },
        { id: 'purchases', label: 'Purchases & Suppliers' },
        { id: 'contacts', label: 'Contacts (CRM)' },
        { id: 'expenses', label: 'Expenses & HR' },
        { id: 'reports', label: 'Reports' },
    ]

    return (
        <form action={action} className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-800 grid grid-cols-1 md:grid-cols-4 gap-4 items-start" autoComplete="off">
            <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Staff Name</label>
                <input name="full_name" type="text" required autoComplete="off" className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 p-2 shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500" placeholder="e.g. Cashier 1" />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Role</label>
                <input name="role" type="text" required value={role} onChange={(e) => setRole(e.target.value)} list="role_list" className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 p-2 shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500" placeholder="e.g. Cashier, Manager" />
                <datalist id="role_list">
                    <option value="cashier" />
                    <option value="manager" />
                    <option value="inventory_manager" />
                    <option value="helper" />
                </datalist>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                <input name="email" type="email" required autoComplete="off" className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 p-2 shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500" placeholder="staff@example.com" />
            </div>
            <div className="md:col-span-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Temporary Password</label>
                <div className="relative mt-1">
                    <input name="password" type={showPassword ? 'text' : 'password'} required minLength={6} autoComplete="new-password" className="block w-full rounded-md border border-gray-300 dark:border-gray-700 p-2 pr-10 shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500" placeholder="Min 6 characters" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400">
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                </div>
            </div>

            {/* Permissions Checkboxes */}
            <div className="md:col-span-4 mt-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Grant Access To:</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {modules.map(mod => (
                        <label key={mod.id} className="flex items-center gap-2 p-2 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                            <input type="checkbox" name={`perm_${mod.id}`} defaultChecked={role === 'manager'} className="rounded text-blue-600 focus:ring-blue-500" />
                            <span className="text-sm text-gray-700 dark:text-gray-300">{mod.label}</span>
                        </label>
                    ))}
                </div>
            </div>

            <div className="md:col-span-4 flex justify-end">
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors">+ Add Staff</button>
            </div>
        </form>
    )
}