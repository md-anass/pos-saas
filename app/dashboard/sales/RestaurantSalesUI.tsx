'use client'

import Link from 'next/link'
import { Eye, ReceiptText, Search, ShoppingBag, Utensils, WalletCards } from 'lucide-react'
import { useMemo, useState } from 'react'
import { formatCurrency } from '@/lib/currency'
import { formatRestaurantDate } from '@/lib/date-format'

type RestaurantSale = {
    id: string
    orderNumber: string
    createdAt: string
    orderType: 'dine_in' | 'takeaway'
    tableName: string | null
    paymentMethod: string
    total: number
}

type Props = {
    sales: RestaurantSale[]
    todaySales: number
    todayOrders: number
    dineInCount: number
    takeawayCount: number
}

const serviceLabel = (orderType: RestaurantSale['orderType']) => orderType === 'takeaway' ? 'Takeaway' : 'Dine-in'

export default function RestaurantSalesUI({ sales, todaySales, todayOrders, dineInCount, takeawayCount }: Props) {
    const [search, setSearch] = useState('')
    const [service, setService] = useState('all')
    const [payment, setPayment] = useState('all')
    const paymentMethods = Array.from(new Set(sales.map(sale => sale.paymentMethod).filter(Boolean)))
    const filteredSales = useMemo(() => {
        const query = search.trim().toLowerCase()
        return sales.filter(sale => {
            const matchesSearch = !query || sale.orderNumber.toLowerCase().includes(query) || sale.id.toLowerCase().includes(query)
            const matchesService = service === 'all' || sale.orderType === service
            const matchesPayment = payment === 'all' || sale.paymentMethod === payment
            return matchesSearch && matchesService && matchesPayment
        })
    }, [payment, sales, search, service])
    const money = (value: number) => formatCurrency(value, 'PKR')

    return <div className="space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">Restaurant operations</p>
                <h1 className="mt-1 text-3xl font-black tracking-tight text-gray-950 dark:text-white">Sales</h1>
                <p className="mt-1 text-sm text-gray-500">Track completed orders, payments and receipts.</p>
            </div>
            <Link href="/dashboard/orders" className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700"><ShoppingBag size={16} className="mr-2" />Order / Pay</Link>
        </header>

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Sales summary">
            <SummaryCard label="Today's Sales" value={money(todaySales)} icon={<WalletCards size={17} />} />
            <SummaryCard label="Today's Orders" value={String(todayOrders)} icon={<ShoppingBag size={17} />} />
            <SummaryCard label="Dine-in" value={String(dineInCount)} icon={<Utensils size={17} />} />
            <SummaryCard label="Takeaway" value={String(takeawayCount)} icon={<ShoppingBag size={17} />} />
        </section>

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="border-b border-gray-100 p-4 dark:border-gray-800 sm:p-5">
                <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-bold text-gray-950 dark:text-white">Sales History</h2><p className="text-xs text-gray-500">Completed and paid Restaurant orders</p></div><span className="text-xs font-semibold text-gray-400">{filteredSales.length} record{filteredSales.length === 1 ? '' : 's'}</span></div>
                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_160px_160px]">
                    <label className="relative block"><Search size={16} className="pointer-events-none absolute left-3 top-3 text-gray-400" /><span className="sr-only">Search order or receipt</span><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search order or receipt" className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white" /></label>
                    <label><span className="sr-only">Service</span><select value={service} onChange={event => setService(event.target.value)} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"><option value="all">All services</option><option value="dine_in">Dine-in</option><option value="takeaway">Takeaway</option></select></label>
                    <label><span className="sr-only">Payment</span><select value={payment} onChange={event => setPayment(event.target.value)} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm capitalize dark:border-gray-700 dark:bg-gray-800 dark:text-white"><option value="all">All payments</option>{paymentMethods.map(method => <option key={method} value={method}>{method}</option>)}</select></label>
                </div>
            </div>

            <div className="hidden overflow-x-auto sm:block"><table className="w-full text-sm"><thead className="bg-gray-50 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:bg-gray-800/60"><tr><th className="px-5 py-3">Receipt</th><th className="px-5 py-3">Date &amp; Time</th><th className="px-5 py-3">Service</th><th className="px-5 py-3">Payment</th><th className="px-5 py-3 text-right">Amount</th><th className="px-5 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-gray-100 dark:divide-gray-800">{filteredSales.map(sale => <DesktopRow key={sale.id} sale={sale} money={money} />)}</tbody></table></div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800 sm:hidden">{filteredSales.map(sale => <MobileRow key={sale.id} sale={sale} money={money} />)}</div>
            {!filteredSales.length && <div className="px-5 py-14 text-center"><div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/40"><ReceiptText size={20} /></div><h3 className="font-bold text-gray-900 dark:text-white">{sales.length ? 'No matching sales' : 'No sales yet'}</h3><p className="mt-1 text-sm text-gray-500">{sales.length ? 'Try a different search or filter.' : 'Completed Restaurant orders will appear here after checkout.'}</p>{!sales.length && <Link href="/dashboard/orders" className="mt-4 inline-flex rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white">Create an order</Link>}</div>}
        </section>
    </div>
}

function SummaryCard({ label, value, icon }: { label: string, value: string, icon: React.ReactNode }) {
    return <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"><div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-orange-600 dark:bg-orange-950/30"><span aria-hidden="true">{icon}</span></div><p className="text-xs font-semibold text-gray-500">{label}</p><p className="mt-1 truncate text-xl font-black tracking-tight text-gray-950 dark:text-white">{value}</p></div>
}

function ServiceBadge({ sale }: { sale: RestaurantSale }) {
    return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${sale.orderType === 'takeaway' ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' : 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'}`}>{serviceLabel(sale.orderType)}{sale.tableName ? ` · ${sale.tableName}` : ''}</span>
}

function PaymentBadge({ method }: { method: string }) {
    return <span className="inline-flex rounded-full bg-orange-50 px-2.5 py-1 text-xs font-semibold capitalize text-orange-700 dark:bg-orange-950/30 dark:text-orange-300">{method || 'Recorded'}</span>
}

function Actions({ sale }: { sale: RestaurantSale }) {
    return <div className="flex justify-end gap-2"><Link href={`/dashboard/sales/${sale.id}`} title="View full sale" aria-label={`View sale ${sale.orderNumber}`} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-700 transition hover:border-blue-300 hover:text-blue-600 dark:border-gray-700 dark:text-gray-300"><Eye size={14} />View</Link><Link href={`/dashboard/sales/${sale.id}/receipt`} title="View or print receipt" aria-label={`View receipt ${sale.orderNumber}`} className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 px-2.5 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-50 dark:border-blue-900 dark:text-blue-300"><ReceiptText size={14} />Receipt</Link></div>
}

function DesktopRow({ sale, money }: { sale: RestaurantSale, money: (value: number) => string }) {
    return <tr className="transition hover:bg-gray-50/80 dark:hover:bg-gray-800/40"><td className="px-5 py-4"><Link href={`/dashboard/sales/${sale.id}/receipt`} className="font-bold text-blue-600 hover:underline">#{sale.orderNumber}</Link></td><td className="px-5 py-4 text-gray-500">{formatRestaurantDate(sale.createdAt)}</td><td className="px-5 py-4"><ServiceBadge sale={sale} /></td><td className="px-5 py-4"><PaymentBadge method={sale.paymentMethod} /></td><td className="px-5 py-4 text-right text-base font-black text-gray-950 dark:text-white">{money(sale.total)}</td><td className="px-5 py-4"><Actions sale={sale} /></td></tr>
}

function MobileRow({ sale, money }: { sale: RestaurantSale, money: (value: number) => string }) {
    return <div className="space-y-3 p-4"><div className="flex items-start justify-between gap-3"><div><Link href={`/dashboard/sales/${sale.id}/receipt`} className="font-black text-blue-600">#{sale.orderNumber}</Link><p className="mt-1 text-xs text-gray-500">{formatRestaurantDate(sale.createdAt)}</p></div><p className="text-base font-black text-gray-950 dark:text-white">{money(sale.total)}</p></div><div className="flex flex-wrap gap-2"><ServiceBadge sale={sale} /><PaymentBadge method={sale.paymentMethod} /></div><Actions sale={sale} /></div>
}