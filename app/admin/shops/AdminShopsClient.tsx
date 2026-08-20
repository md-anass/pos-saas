'use client'

import { useEffect, useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { toast } from 'sonner'
import {
    Trash2,
    CalendarPlus,
    UserPlus,
    CalendarDays,
    AlertCircle,
    Copy,
    Mail,
    Link2
} from 'lucide-react'

import {
    inviteShopOwner,
    renewSubscription,
    deleteShop,
    generateSetupLink
} from '../actions'

// ============================================================
// WhatsApp Icon
// ============================================================

const WhatsAppIcon = ({
    size = 14
}: {
    size?: number
}) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="currentColor"
    >
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
)

// ============================================================
// Types
// ============================================================

type Shop = {
    id: string
    name: string
    owner_id: string
    status: string
    subscription_start: string | null
    subscription_end: string | null
    profiles: {
        email: string
    } | null
}

type Props = {
    shops: Shop[]
    initialSuccess?: string
    initialError?: string
    inviteLink?: string
    selectedOwnerId?: string
}

// ============================================================
// Main Component
// ============================================================

export default function AdminShopsClient({
    shops,
    initialSuccess,
    initialError,
    inviteLink,
    selectedOwnerId
}: Props) {
    const [renewingId, setRenewingId] =
        useState<string | null>(null)

    const selectedRowRef =
        useRef<HTMLTableRowElement | null>(null)

    // --------------------------------------------------------
    // Toast messages
    // --------------------------------------------------------

    useEffect(() => {
        if (initialSuccess) {
            toast.success(initialSuccess)
        }

        if (initialError) {
            toast.error(initialError)
        }
    }, [initialSuccess, initialError])

    // --------------------------------------------------------
    // Scroll to selected shop
    // --------------------------------------------------------

    useEffect(() => {
        if (selectedOwnerId && selectedRowRef.current) {
            selectedRowRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            })
        }
    }, [selectedOwnerId])

    // --------------------------------------------------------
    // Copy generated invite/setup link
    // --------------------------------------------------------

    const copyInviteLink = async () => {
        if (!inviteLink) return

        try {
            await navigator.clipboard.writeText(inviteLink)

            toast.success(
                'Setup link copied to clipboard!'
            )
        } catch {
            toast.error(
                'Could not copy the setup link.'
            )
        }
    }

    return (
        <div className="space-y-8 p-4 lg:p-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Shop Management
            </h1>

            {/* ==================================================
                GENERATED INVITE / SETUP LINK
            ================================================== */}

            {inviteLink && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-6 rounded-xl shadow-sm">
                    <h3 className="text-lg font-bold text-blue-800 dark:text-blue-300 mb-2">
                        Secure Setup Link Generated!
                    </h3>

                    <p className="text-sm text-blue-600 dark:text-blue-400 mb-4">
                        Send this secure link to the customer.
                        They can use it to set their password
                        and complete their shop setup.
                    </p>

                    <div className="flex flex-col md:flex-row items-stretch gap-2 bg-white dark:bg-gray-900 p-3 rounded-lg border border-blue-300 dark:border-blue-700">

                        <input
                            type="text"
                            readOnly
                            value={inviteLink}
                            onFocus={(event) =>
                                event.currentTarget.select()
                            }
                            className="flex-1 w-full bg-transparent text-sm text-gray-900 dark:text-white outline-none truncate"
                        />

                        <div className="flex flex-wrap gap-2 justify-end">

                            {/* COPY */}

                            <button
                                type="button"
                                onClick={copyInviteLink}
                                className="flex items-center justify-center gap-1 px-4 py-2 bg-gray-800 text-white text-sm font-bold rounded-lg hover:bg-gray-700 transition-colors"
                            >
                                <Copy size={14} />
                                Copy
                            </button>

                            {/* WHATSAPP */}

                            <a
                                href={`https://wa.me/?text=${encodeURIComponent(
                                    `Welcome to KarobarX! Click this secure link to set your password and complete your shop setup: ${inviteLink}`
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-1 px-4 py-2 bg-[#25D366] text-white text-sm font-bold rounded-lg hover:opacity-90 transition-colors"
                            >
                                <WhatsAppIcon size={14} />
                                WhatsApp
                            </a>

                            {/* EMAIL */}

                            <a
                                href={`mailto:?subject=${encodeURIComponent(
                                    'KarobarX Shop Setup'
                                )}&body=${encodeURIComponent(
                                    `Welcome to KarobarX! Click this secure link to set your password and complete your shop setup: ${inviteLink}`
                                )}`}
                                className="flex items-center justify-center gap-1 px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                <Mail size={14} />
                                Email
                            </a>
                        </div>
                    </div>
                </div>
            )}

            {/* ==================================================
                INVITE NEW SHOP OWNER
            ================================================== */}

            <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    <UserPlus
                        size={20}
                        className="text-amber-500"
                    />

                    Invite New Shop Owner
                </h2>

                <form
                    action={inviteShopOwner}
                    className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end"
                >
                    {/* EMAIL */}

                    <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                            Customer Email
                        </label>

                        <input
                            name="email"
                            type="email"
                            required
                            placeholder="customer@example.com"
                            className="w-full p-2.5 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                        />
                    </div>

                    {/* START DATE */}

                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                            Start Date
                        </label>

                        <input
                            name="subscription_start"
                            type="date"
                            required
                            className="w-full p-2.5 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                        />
                    </div>

                    {/* END DATE */}

                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                            End Date
                        </label>

                        <input
                            name="subscription_end"
                            type="date"
                            required
                            className="w-full p-2.5 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                        />
                    </div>

                    <div className="md:col-span-4 flex justify-end">
                        <SubmitButton />
                    </div>
                </form>
            </div>

            {/* ==================================================
                SHOPS TABLE
            ================================================== */}

            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">

                        <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4 text-left">
                                    Shop Name
                                </th>

                                <th className="px-6 py-4 text-left">
                                    Owner Email
                                </th>

                                <th className="px-6 py-4 text-left">
                                    Subscription
                                </th>

                                <th className="px-6 py-4 text-center">
                                    Status
                                </th>

                                <th className="px-6 py-4 text-right">
                                    Actions
                                </th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">

                            {shops.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="p-8 text-center text-gray-500"
                                    >
                                        No shops found.
                                    </td>
                                </tr>
                            ) : (
                                shops.map((shop) => {

                                    const today = new Date()

                                    const endDate =
                                        shop.subscription_end
                                            ? new Date(
                                                shop.subscription_end
                                            )
                                            : null

                                    const isExpired =
                                        endDate
                                            ? endDate < today
                                            : false

                                    const isExpiringSoon =
                                        endDate
                                            ? endDate > today &&
                                            endDate <
                                            new Date(
                                                today.getTime() +
                                                7 *
                                                24 *
                                                60 *
                                                60 *
                                                1000
                                            )
                                            : false

                                    // IMPORTANT:
                                    // Setup link is ONLY available
                                    // while this shop is pending.
                                    const isPendingSetup =
                                        shop.name ===
                                        'Pending Setup'

                                    const isSelected =
                                        selectedOwnerId ===
                                        shop.owner_id

                                    return (
                                        <tr
                                            key={shop.id}
                                            ref={
                                                isSelected
                                                    ? selectedRowRef
                                                    : undefined
                                            }
                                            className={
                                                isSelected
                                                    ? 'bg-blue-50 dark:bg-blue-950/30 transition-colors'
                                                    : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors'
                                            }
                                        >

                                            {/* SHOP NAME */}

                                            <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                                                {shop.name}
                                            </td>

                                            {/* OWNER EMAIL */}

                                            <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                                                {shop.profiles
                                                    ?.email ||
                                                    'Unknown'}
                                            </td>

                                            {/* SUBSCRIPTION */}

                                            <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                                                <div className="flex items-center gap-2">

                                                    <CalendarDays
                                                        size={14}
                                                    />

                                                    {shop.subscription_start
                                                        ? new Date(
                                                            shop.subscription_start
                                                        ).toLocaleDateString()
                                                        : 'N/A'}

                                                    <span className="text-gray-300 dark:text-gray-600">
                                                        →
                                                    </span>

                                                    {shop.subscription_end
                                                        ? new Date(
                                                            shop.subscription_end
                                                        ).toLocaleDateString()
                                                        : 'N/A'}
                                                </div>
                                            </td>

                                            {/* STATUS */}

                                            <td className="px-6 py-4 text-center">

                                                {/* PENDING SETUP */}

                                                {isPendingSetup ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400">
                                                        <AlertCircle
                                                            size={
                                                                12
                                                            }
                                                        />

                                                        Pending Setup
                                                    </span>
                                                ) : isExpired ? (

                                                    /* EXPIRED */

                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400">
                                                        <AlertCircle
                                                            size={
                                                                12
                                                            }
                                                        />

                                                        Expired
                                                    </span>

                                                ) : isExpiringSoon ? (

                                                    /* EXPIRING */

                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400">
                                                        <AlertCircle
                                                            size={
                                                                12
                                                            }
                                                        />

                                                        Expiring Soon
                                                    </span>

                                                ) : (

                                                    /* ACTIVE */

                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400">
                                                        Active
                                                    </span>
                                                )}
                                            </td>

                                            {/* ACTIONS */}

                                            <td className="px-6 py-4">

                                                <div className="flex flex-wrap justify-end gap-2">

                                                    {/* ==================================
                                                        SHARE LINK

                                                        THIS AUTOMATICALLY DISAPPEARS
                                                        WHEN shop.name IS NO LONGER
                                                        "Pending Setup"
                                                    ================================== */}

                                                    {isPendingSetup && (
                                                        <form
                                                            action={
                                                                generateSetupLink
                                                            }
                                                        >
                                                            <input
                                                                type="hidden"
                                                                name="owner_id"
                                                                value={
                                                                    shop.owner_id
                                                                }
                                                            />

                                                            <SetupLinkButton />
                                                        </form>
                                                    )}

                                                    {/* RENEW */}

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setRenewingId(
                                                                shop.id
                                                            )
                                                        }
                                                        className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 px-3 py-1.5 rounded-md transition-colors border border-blue-200 dark:border-blue-800"
                                                    >
                                                        <CalendarPlus
                                                            size={
                                                                14
                                                            }
                                                        />

                                                        Renew
                                                    </button>

                                                    {/* DELETE */}

                                                    <form
                                                        action={
                                                            deleteShop
                                                        }
                                                    >
                                                        <input
                                                            type="hidden"
                                                            name="shop_id"
                                                            value={
                                                                shop.id
                                                            }
                                                        />

                                                        <input
                                                            type="hidden"
                                                            name="owner_id"
                                                            value={
                                                                shop.owner_id
                                                            }
                                                        />

                                                        <button
                                                            type="submit"
                                                            className="inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 px-3 py-1.5 rounded-md transition-colors border border-red-200 dark:border-red-800"
                                                        >
                                                            <Trash2
                                                                size={
                                                                    14
                                                                }
                                                            />

                                                            Delete
                                                        </button>
                                                    </form>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ==================================================
                RENEW MODAL
            ================================================== */}

            {renewingId && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">

                    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl p-6 w-full max-w-md space-y-4 border border-gray-200 dark:border-gray-800">

                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                            Renew Subscription
                        </h3>

                        <form
                            action={renewSubscription}
                            className="space-y-4"
                        >

                            <input
                                type="hidden"
                                name="shop_id"
                                value={renewingId}
                            />

                            {/* START DATE */}

                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                    New Start Date
                                    (Optional)
                                </label>

                                <input
                                    name="new_start_date"
                                    type="date"
                                    className="w-full p-2.5 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                                />
                            </div>

                            {/* END DATE */}

                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                    New Expiry Date
                                </label>

                                <input
                                    name="new_end_date"
                                    type="date"
                                    required
                                    className="w-full p-2.5 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                                />
                            </div>

                            <div className="flex gap-2 justify-end">

                                <button
                                    type="button"
                                    onClick={() =>
                                        setRenewingId(null)
                                    }
                                    className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                                >
                                    Cancel
                                </button>

                                <RenewSubmitButton />
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

// ============================================================
// Generate New Invite Button
// ============================================================

function SubmitButton() {
    const { pending } = useFormStatus()

    return (
        <button
            type="submit"
            disabled={pending}
            className="px-6 py-2.5 bg-gradient-to-r from-amber-400 to-yellow-600 text-black font-bold rounded-lg hover:opacity-90 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto"
        >
            {pending
                ? 'Generating Link...'
                : 'Generate Invite Link'}
        </button>
    )
}

// ============================================================
// Share Setup Link Button
// ============================================================

function SetupLinkButton() {
    const { pending } = useFormStatus()

    return (
        <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 px-3 py-1.5 rounded-md transition-colors border border-green-200 dark:border-green-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
            <Link2 size={14} />

            {pending
                ? 'Generating...'
                : 'Share Setup Link'}
        </button>
    )
}

// ============================================================
// Renew Submit Button
// ============================================================

function RenewSubmitButton() {
    const { pending } = useFormStatus()

    return (
        <button
            type="submit"
            disabled={pending}
            className="px-4 py-2 text-sm font-bold text-black bg-gradient-to-r from-amber-400 to-yellow-600 rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {pending
                ? 'Saving...'
                : 'Confirm Renewal'}
        </button>
    )
}