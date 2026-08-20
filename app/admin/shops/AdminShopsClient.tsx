'use client'

import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import { toast } from 'sonner'
import { Trash2, CalendarPlus, UserPlus, CalendarDays, AlertCircle } from 'lucide-react'
import { inviteShopOwner, renewSubscription, deleteShop } from '../actions'

type Shop = {
    id: string
    name: string
    owner_id: string
    status: string
    subscription_start: string | null
    subscription_end: string | null
    profiles: { email: string } | null
}

export default function AdminShopsClient({ shops, initialSuccess, initialError }: { shops: Shop[], initialSuccess?: string, initialError?: string }) {
    const [renewingId, setRenewingId] = useState<string | null>(null)

    // Show toasts on initial load if there are success/error messages in the URL
    if (initialSuccess && typeof window !== 'undefined') {
        toast.success(initialSuccess)
    }
    if (initialError && typeof window !== 'undefined') {
        toast.error(initialError)
    }

    return (
        <div className="space-y-8 p-4 lg:p-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Shop Management</h1>

            {/* Invite Form */}
            <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    <UserPlus size={20} className="text-amber-500" /> Invite New Shop Owner
                </h2>
                <form action={inviteShopOwner} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Customer Email</label>
                        <input name="email" type="email" required placeholder="customer@example.com" className="w-full p-2.5 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Start Date</label>
                        <input name="subscription_start" type="date" required className="w-full p-2.5 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">End Date</label>
                        <input name="subscription_end" type="date" required className="w-full p-2.5 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500" />
                    </div>
                    <div className="md:col-span-4 flex justify-end">
                        <SubmitButton />
                    </div>
                </form>
            </div>

            {/* Shops Table */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4 text-left">Shop Name</th>
                                <th className="px-6 py-4 text-left">Owner Email</th>
                                <th className="px-6 py-4 text-left">Subscription</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                            {shops.length === 0 ? (
                                <tr><td colSpan={5} className="p-8 text-center text-gray-500">No shops found.</td></tr>
                            ) : (
                                shops.map((shop) => {
                                    const today = new Date()
                                    const endDate = shop.subscription_end ? new Date(shop.subscription_end) : null
                                    const isExpired = endDate ? endDate < today : false
                                    const isExpiringSoon = endDate ? (endDate > today && endDate < new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)) : false

                                    return (
                                        <tr key={shop.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{shop.name}</td>
                                            <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{shop.profiles?.email || 'Unknown'}</td>
                                            <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                                                <div className="flex items-center gap-2">
                                                    <CalendarDays size={14} />
                                                    {shop.subscription_start ? new Date(shop.subscription_start).toLocaleDateString() : 'N/A'}
                                                    <span className="text-gray-300 dark:text-gray-600">→</span>
                                                    {shop.subscription_end ? new Date(shop.subscription_end).toLocaleDateString() : 'N/A'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {isExpired ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400">
                                                        <AlertCircle size={12} /> Expired
                                                    </span>
                                                ) : isExpiringSoon ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400">
                                                        <AlertCircle size={12} /> Expiring Soon
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400">
                                                        Active
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right space-x-2">
                                                <button
                                                    onClick={() => setRenewingId(shop.id)}
                                                    className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 px-3 py-1.5 rounded-md transition-colors border border-blue-200 dark:border-blue-800"
                                                >
                                                    <CalendarPlus size={14} /> Renew
                                                </button>
                                                <form action={deleteShop} className="inline-block">
                                                    <input type="hidden" name="shop_id" value={shop.id} />
                                                    <input type="hidden" name="owner_id" value={shop.owner_id} />
                                                    <button
                                                        type="submit"
                                                        className="inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 px-3 py-1.5 rounded-md transition-colors border border-red-200 dark:border-red-800"
                                                    >
                                                        <Trash2 size={14} /> Delete
                                                    </button>
                                                </form>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Renew Modal */}
            {renewingId && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl p-6 w-full max-w-md space-y-4 border border-gray-200 dark:border-gray-800">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Renew Subscription</h3>
                        <form action={renewSubscription} className="space-y-4">
                            <input type="hidden" name="shop_id" value={renewingId} />
                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">New Expiry Date</label>
                                <input name="new_end_date" type="date" required className="w-full p-2.5 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500" />
                            </div>
                            <div className="flex gap-2 justify-end">
                                <button type="button" onClick={() => setRenewingId(null)} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</button>
                                <button type="submit" className="px-4 py-2 text-sm font-bold text-black bg-gradient-to-r from-amber-400 to-yellow-600 rounded-lg hover:opacity-90">Confirm Renewal</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

function SubmitButton() {
    const { pending } = useFormStatus()
    return (
        <button
            type="submit"
            disabled={pending}
            className="px-6 py-2.5 bg-gradient-to-r from-amber-400 to-yellow-600 text-black font-bold rounded-lg hover:opacity-90 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {pending ? 'Sending Invite...' : 'Send Invite & Activate'}
        </button>
    )
}