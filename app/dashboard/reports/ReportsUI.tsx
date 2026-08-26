'use client'
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/immutability */

import { useState, useMemo } from 'react'
import { exportToCSV } from '@/lib/csv'
import { Download, Printer, TrendingUp, Package, Users, Truck, BookOpen, Search, ArrowDownCircle, ArrowUpCircle, Scale } from 'lucide-react'
import { useShopCapabilities } from '@/app/components/ShopCapabilitiesProvider'
import { formatCurrency } from '@/lib/currency'

type Tab = 'financial' | 'sales' | 'inventory' | 'customers' | 'suppliers' | 'ledger'

export default function ReportsUI({ data, t }: { data: any, t: any }) {
    const dict = t || {}
    const { shop } = useShopCapabilities()
    const [activeTab, setActiveTab] = useState<Tab>('financial')

    const tabs = [
        { id: 'financial' as Tab, label: dict.financial || 'Financial', icon: TrendingUp },
        { id: 'sales' as Tab, label: dict.sales || 'Sales', icon: TrendingUp },
        { id: 'inventory' as Tab, label: dict.inventory || 'Inventory', icon: Package },
        { id: 'customers' as Tab, label: dict.customers || 'Customers', icon: Users },
        { id: 'suppliers' as Tab, label: dict.suppliers || 'Suppliers', icon: Truck },
        { id: 'ledger' as Tab, label: dict.ledger || 'Ledger', icon: BookOpen },
    ]

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 no-print">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{dict.title || 'Reports & Analytics'}</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Analyze your business performance and financial health</p>
                </div>
                <button onClick={() => window.print()} className="flex items-center gap-2 bg-gray-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors shadow-sm">
                    <Printer size={16} /> {dict.print_report || 'Print Report'}
                </button>
            </div>

            {/* Premium Tabs */}
            <div className="flex flex-wrap gap-1 border-b border-gray-200 dark:border-gray-800 no-print">
                {tabs.map(tab => {
                    const Icon = tab.icon
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all ${activeTab === tab.id
                                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                                }`}
                        >
                            <Icon size={18} /> {tab.label}
                        </button>
                    )
                })}
            </div>

            {/* Report Content (Printable Area) */}
            <div id="printable-report" className="bg-white dark:bg-gray-900 p-8 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">

                {activeTab === 'financial' && <FinancialReport data={data} t={dict} currency={shop.currency} />}
                {activeTab === 'sales' && <SalesReport data={data} t={dict} currency={shop.currency} />}
                {activeTab === 'inventory' && <InventoryReport data={data} t={dict} />}
                {activeTab === 'customers' && <CustomerReport data={data} t={dict} currency={shop.currency} />}
                {activeTab === 'suppliers' && <SupplierReport data={data} t={dict} currency={shop.currency} />}
                {activeTab === 'ledger' && <LedgerReport data={data.ledger} t={dict} currency={shop.currency} />}

            </div>
        </div>
    )
}

// --- Reusable Header ---
function ReportHeader({ title, onExport, exportData, t }: { title: string, onExport: () => void, exportData?: any[], t: any }) {
    return (
        <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-8 pb-4 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
            {exportData && exportData.length > 0 && (
                <button onClick={onExport} className="mt-3 sm:mt-0 flex items-center gap-2 text-sm bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-4 py-2 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors font-medium no-print">
                    <Download size={16} /> {t?.export_csv || 'Export CSV'}
                </button>
            )}
        </div>
    )
}

// --- Financial Report ---
function FinancialReport({ data, t, currency }: { data: any, t: any, currency: string }) {
    const money = (value: number) => formatCurrency(value, currency)
    const { totalSales, totalPurchases, totalExpenses, grossProfit, netProfit } = data.financial
    return (
        <div>
            <ReportHeader title={t.profit_loss} onExport={() => exportToCSV('profit_loss.csv', ['Metric', 'Amount'], [{ Metric: 'Total Sales', Amount: totalSales }, { Metric: 'Total Purchases', Amount: totalPurchases }, { Metric: 'Gross Profit', Amount: grossProfit }, { Metric: 'Total Expenses', Amount: totalExpenses }, { Metric: 'Net Profit', Amount: netProfit }])} exportData={[1]} t={t} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
                <div className="p-5 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-100 dark:border-green-900/30">
                    <div className="flex items-center gap-3 mb-2"><ArrowUpCircle className="text-green-600" size={24} /><span className="text-sm font-medium text-green-800 dark:text-green-400">{t.total_sales}</span></div>
                    <p dir="ltr" className="text-3xl font-bold text-green-900 dark:text-green-300 text-right">{money(totalSales)}</p>
                </div>

                <div className="p-5 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-900/30">
                    <div className="flex items-center gap-3 mb-2"><ArrowDownCircle className="text-red-600" size={24} /><span className="text-sm font-medium text-red-800 dark:text-red-400">{t.cogs}</span></div>
                    <p dir="ltr" className="text-3xl font-bold text-red-900 dark:text-red-300 text-right">{money(totalPurchases)}</p>
                </div>

                <div className="p-5 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-900/30">
                    <div className="flex items-center gap-3 mb-2"><Scale className="text-blue-600" size={24} /><span className="text-sm font-medium text-blue-800 dark:text-blue-400">{t.gross_profit}</span></div>
                    <p dir="ltr" className="text-3xl font-bold text-blue-900 dark:text-blue-300 text-right">{money(grossProfit)}</p>
                </div>

                <div className="p-5 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-100 dark:border-orange-900/30">
                    <div className="flex items-center gap-3 mb-2"><ArrowDownCircle className="text-orange-600" size={24} /><span className="text-sm font-medium text-orange-800 dark:text-orange-400">{t.operational_expenses}</span></div>
                    <p dir="ltr" className="text-3xl font-bold text-orange-900 dark:text-orange-300 text-right">{money(totalExpenses)}</p>
                </div>
            </div>

            <div className="mt-6 p-6 bg-gray-900 dark:bg-gray-800 rounded-xl flex justify-between items-center">
                <span className="text-lg font-bold text-white flex items-center gap-2"><TrendingUp size={24} /> {t.net_profit}</span>
                <p dir="ltr" className="text-3xl font-extrabold text-white">{money(netProfit)}</p>
            </div>
        </div>
    )
}

// --- Sales Report ---
function SalesReport({ data, t, currency }: { data: any, t: any, currency: string }) {
    const money = (value: number) => formatCurrency(value, currency)
    const rows = data.productSales.map((p: any) => ({ name: p.name, qty: p.total_qty, rev: p.total_rev }))
    return (
        <div>
            <ReportHeader title={t.product_sales} onExport={() => exportToCSV('sales_by_product.csv', ['Product Name', 'Quantity Sold', 'Total Revenue'], rows.map((r: any) => ({ 'Product Name': r.name, 'Quantity Sold': r.qty, 'Total Revenue': r.rev })))} exportData={rows} t={t} />
            <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 text-xs uppercase"><tr><th className="p-4 text-left">Product</th><th className="p-4 text-center">Qty Sold</th><th className="p-4 text-right">Revenue</th></tr></thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800 bg-white dark:bg-gray-900">
                        {rows.map((r: any, i: number) => (
                            <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                <td className="p-4 font-medium text-gray-900 dark:text-white">{r.name}</td>
                                <td dir="ltr" className="p-4 text-center text-gray-600 dark:text-gray-400">{r.qty}</td>
                                <td dir="ltr" className="p-4 text-right font-bold text-gray-900 dark:text-white">{money(r.rev)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

// --- Inventory Report ---
function InventoryReport({ data, t }: { data: any, t: any }) {
    const rows = data.inventory.map((p: any) => ({ name: p.name, qty: p.quantity, min: p.min_stock, status: p.quantity <= p.min_stock ? 'Low' : 'OK', val: p.quantity * p.purchase_price }))
    return (
        <div>
            <ReportHeader title={t.inventory_valuation} onExport={() => exportToCSV('inventory.csv', ['Product Name', 'Stock', 'Min Stock', 'Status', 'Value'], rows.map((r: any) => ({ 'Product Name': r.name, 'Stock': r.qty, 'Min Stock': r.min, 'Status': r.status, 'Value': r.val })))} exportData={rows} t={t} />
            <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 text-xs uppercase"><tr><th className="p-4 text-left">Product</th><th className="p-4 text-center">Stock</th><th className="p-4 text-center">Value (Rs)</th><th className="p-4 text-center">Status</th></tr></thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800 bg-white dark:bg-gray-900">
                        {rows.map((r: any, i: number) => (
                            <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                <td className="p-4 font-medium text-gray-900 dark:text-white">{r.name}</td>
                                <td dir="ltr" className="p-4 text-center text-gray-600 dark:text-gray-400">{r.qty}</td>
                                <td dir="ltr" className="p-4 text-center font-bold text-gray-900 dark:text-white">{r.val.toFixed(2)}</td>
                                <td className="p-4 text-center"><span className={`px-2 py-1 rounded-full text-xs font-semibold ${r.status === 'Low' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' : 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'}`}>{r.status}</span></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

// --- Customer Report ---
function CustomerReport({ data, t, currency }: { data: any, t: any, currency: string }) {
    const money = (value: number) => formatCurrency(value, currency)
    const rows = data.customers.map((c: any) => ({ name: c.name, total: c.total_spent }))
    return (
        <div>
            <ReportHeader title={t.customer_summary} onExport={() => exportToCSV('customers.csv', ['Customer Name', 'Total Purchases'], rows.map((r: any) => ({ 'Customer Name': r.name, 'Total Purchases': r.total })))} exportData={rows} t={t} />
            <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 text-xs uppercase"><tr><th className="p-4 text-left">Customer</th><th className="p-4 text-right">Total Spent</th></tr></thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800 bg-white dark:bg-gray-900">
                        {rows.map((r: any, i: number) => (
                            <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                <td className="p-4 font-medium text-gray-900 dark:text-white">{r.name}</td>
                                <td dir="ltr" className="p-4 text-right font-bold text-gray-900 dark:text-white">{money(r.total)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

// --- Supplier Report ---
function SupplierReport({ data, t, currency }: { data: any, t: any, currency: string }) {
    const money = (value: number) => formatCurrency(value, currency)
    const rows = data.suppliers.map((s: any) => ({ name: s.name, total: s.total_purchased, paid: s.total_paid, due: s.due }))
    return (
        <div>
            <ReportHeader title={t.supplier_payables} onExport={() => exportToCSV('suppliers.csv', ['Supplier Name', 'Total Purchases', 'Total Paid', 'Outstanding Payable'], rows.map((r: any) => ({ 'Supplier Name': r.name, 'Total Purchases': r.total, 'Total Paid': r.paid, 'Outstanding Payable': r.due })))} exportData={rows} t={t} />
            <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 text-xs uppercase"><tr><th className="p-4 text-left">Supplier</th><th className="p-4 text-right">Purchased</th><th className="p-4 text-right">Paid</th><th className="p-4 text-right">Payable</th></tr></thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800 bg-white dark:bg-gray-900">
                        {rows.map((r: any, i: number) => (
                            <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                <td className="p-4 font-medium text-gray-900 dark:text-white">{r.name}</td>
                                <td dir="ltr" className="p-4 text-right text-gray-600 dark:text-gray-400">{money(r.total)}</td>
                                <td dir="ltr" className="p-4 text-right text-green-600 dark:text-green-400">{money(r.paid)}</td>
                                <td dir="ltr" className="p-4 text-right font-bold text-red-600 dark:text-red-400">{money(r.due)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

// --- Ledger Report (With Search) ---
function LedgerReport({ data, t, currency }: { data: any[], t: any, currency: string }) {
    const money = (value: number) => formatCurrency(value, currency)
    const [search, setSearch] = useState('')

    // Pre-calculate running balance on the full dataset
    let runningBalance = 0
    const allRows = data.map((entry: any) => {
        runningBalance += (entry.credit - entry.debit)
        return {
            date: new Date(entry.date).toLocaleString(),
            description: entry.description,
            debit: entry.debit,
            credit: entry.credit,
            balance: runningBalance
        }
    })

    // Filter rows based on search term
    const filteredRows = useMemo(() => {
        if (!search) return allRows
        return allRows.filter(r => r.description.toLowerCase().includes(search.toLowerCase()))
    }, [search, allRows])

    // Calculate totals for the filtered view
    const totalIn = filteredRows.reduce((sum, r) => sum + r.credit, 0)
    const totalOut = filteredRows.reduce((sum, r) => sum + r.debit, 0)

    return (
        <div>
            <ReportHeader title={t.general_ledger} onExport={() => exportToCSV('ledger.csv', ['Date', 'Description', 'Debit', 'Credit', 'Balance'], filteredRows.map((r: any) => ({ 'Date': r.date, 'Description': r.description, 'Debit': r.debit, 'Credit': r.credit, 'Balance': r.balance })))} exportData={filteredRows} t={t} />

            {/* Search & Summary Bar */}
            <div className="flex flex-col md:flex-row gap-4 mb-6 no-print">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search by customer, supplier, expense..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                </div>
                <div className="flex gap-4">
                    <div className="px-4 py-2 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-900/30">
                        <p className="text-xs text-green-700 dark:text-green-400">Total In</p>
                        <p dir="ltr" className="text-sm font-bold text-green-900 dark:text-green-300">{money(totalIn)}</p>
                    </div>
                    <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-900/30">
                        <p className="text-xs text-red-700 dark:text-red-400">Total Out</p>
                        <p dir="ltr" className="text-sm font-bold text-red-900 dark:text-red-300">{money(totalOut)}</p>
                    </div>
                </div>
            </div>

            {/* Ledger Table */}
            <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 max-h-[600px] overflow-y-auto">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 text-xs uppercase sticky top-0">
                        <tr>
                            <th className="p-4 text-left">Date</th>
                            <th className="p-4 text-left">Description</th>
                            <th className="p-4 text-right">Debit (Out)</th>
                            <th className="p-4 text-right">Credit (In)</th>
                            <th className="p-4 text-right">Balance</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800 bg-white dark:bg-gray-900">
                        {filteredRows.length === 0 ? (
                            <tr><td colSpan={5} className="p-8 text-center text-gray-500">{t.no_transactions}</td></tr>
                        ) : (
                            filteredRows.map((r: any, i: number) => (
                                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                    <td dir="ltr" className="p-4 text-gray-500 dark:text-gray-400 whitespace-nowrap text-xs">{r.date}</td>
                                    <td className="p-4 font-medium text-gray-900 dark:text-white">{r.description}</td>
                                    <td dir="ltr" className="p-4 text-right text-red-600 dark:text-red-400">{r.debit > 0 ? money(r.debit) : '-'}</td>
                                    <td dir="ltr" className="p-4 text-right text-green-600 dark:text-green-400">{r.credit > 0 ? money(r.credit) : '-'}</td>
                                    <td dir="ltr" className={`p-4 text-right font-bold ${r.balance >= 0 ? 'text-gray-900 dark:text-white' : 'text-red-600 dark:text-red-400'}`}>{money(r.balance)}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}