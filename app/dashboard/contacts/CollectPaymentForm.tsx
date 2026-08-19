'use client'

import { useState } from 'react'

export default function CollectPaymentForm({ customerId, action }: { customerId: string, action: (formData: FormData) => Promise<void> }) {
    const [show, setShow] = useState(false)

    return (
        <div className="flex items-center gap-1">
            {show ? (
                <form action={action} className="flex items-center gap-1">
                    <input type="hidden" name="customer_id" value={customerId} />
                    <input
                        type="number"
                        name="amount"
                        required
                        step="0.01"
                        placeholder="Amount"
                        className="w-20 p-1 text-xs border border-gray-300 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button type="submit" className="text-green-600 dark:text-green-400 text-xs font-bold hover:underline">Save</button>
                    <button type="button" onClick={() => setShow(false)} className="text-gray-500 dark:text-gray-400 text-xs hover:underline">X</button>
                </form>
            ) : (
                <button onClick={() => setShow(true)} className="text-green-600 dark:text-green-400 hover:underline">Collect</button>
            )}
        </div>
    )
}