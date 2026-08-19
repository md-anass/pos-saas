'use client'

import { useState } from 'react'

export default function AddAccountForm({ action }: { action: (formData: FormData) => Promise<void> }) {
    const [type, setType] = useState('cash')

    return (
        <form action={action} className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-800 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Account Name</label>
                <input name="name" type="text" required className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 p-2 shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500" placeholder="e.g. Main Cash Drawer" />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Type</label>
                <select name="type" required value={type} onChange={(e) => setType(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 p-2 shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500">
                    <option value="cash">Cash</option>
                    <option value="bank">Bank</option>
                    <option value="wallet">Digital Wallet</option>
                    <option value="other">Other</option>
                </select>
            </div>

            {/* Dynamic Fields based on Type */}
            {type === 'bank' && (
                <>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Bank Name</label>
                        <input name="provider_name" type="text" className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 p-2 shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500" placeholder="e.g. HBL" />
                    </div>
                    <div className="md:col-span-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Account Number / IBAN</label>
                        <input name="account_number" type="text" className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 p-2 shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500" placeholder="e.g. PK12HABB0000123" />
                    </div>
                </>
            )}

            {type === 'wallet' && (
                <>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Wallet Type</label>
                        <select name="provider_name" className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 p-2 shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500">
                            <option value="JazzCash">JazzCash</option>
                            <option value="Easypaisa">Easypaisa</option>
                            <option value="Raast">Raast</option>
                            <option value="SadaPay">SadaPay</option>
                            <option value="NayaPay">NayaPay</option>
                        </select>
                    </div>
                    <div className="md:col-span-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Wallet Number</label>
                        <input name="account_number" type="text" className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 p-2 shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500" placeholder="e.g. 03001234567" />
                    </div>
                </>
            )}

            <div className="md:col-span-4 flex justify-end">
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors">+ Add Account</button>
            </div>
        </form>
    )
}