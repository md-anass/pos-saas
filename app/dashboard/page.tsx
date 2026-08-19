import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { dictionaries } from '@/lib/dictionary'
import DashboardCharts from './DashboardCharts'
import { DollarSign, TrendingUp, TrendingDown, Wallet, AlertTriangle, Boxes, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default async function DashboardPage() {
    const supabase = await createClient()
    const cookieStore = await cookies()
    const lang = cookieStore.get('lang')?.value || 'en'
    const t = dictionaries[lang] || dictionaries['en']

    // 1. Date Ranges
    const today = new Date()
    const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString()
    const endOfDay = new Date(new Date().setHours(23, 59, 59, 999)).toISOString()
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    // 2. Fetch Sales & Expenses
    const { data: todaysSales } = await supabase.from('sales').select('total_amount').gte('created_at', startOfDay).lte('created_at', endOfDay).eq('status', 'completed')
    const { data: monthSales } = await supabase.from('sales').select('total_amount').gte('created_at', startOfMonth.toISOString()).eq('status', 'completed')
    const { data: monthExpenses } = await supabase.from('expenses').select('amount').gte('created_at', startOfMonth.toISOString())

    let totalRevenueToday = 0
    if (todaysSales && todaysSales.length > 0) totalRevenueToday = todaysSales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0)
    const totalOrdersToday = todaysSales?.length || 0

    let totalRevenueMonth = 0
    if (monthSales && monthSales.length > 0) totalRevenueMonth = monthSales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0)

    let totalExpensesMonth = 0
    if (monthExpenses && monthExpenses.length > 0) totalExpensesMonth = monthExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0)

    const netProfitMonth = totalRevenueMonth - totalExpensesMonth

    // 3. Fetch Inventory Stats
    const { data: products } = await supabase.from('products').select('id, name, quantity, min_stock, unit')
    const totalProducts = products?.length || 0
    const lowStockProducts = products?.filter(p => p.quantity <= p.min_stock) || []
    const lowStockItems = lowStockProducts.length

    // 4. Fetch Chart Data
    const last7Days: Date[] = []
    const salesByDay: { name: string; Sales: number }[] = []
    for (let i = 6; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        date.setHours(0, 0, 0, 0)
        last7Days.push(date)
    }

    const { data: recentSales } = await supabase.from('sales').select('total_amount, created_at').gte('created_at', last7Days[0].toISOString()).eq('status', 'completed')
    last7Days.forEach(day => {
        const nextDay = new Date(day)
        nextDay.setDate(nextDay.getDate() + 1)
        let dayTotal = 0
        if (recentSales && recentSales.length > 0) {
            dayTotal = recentSales.filter(sale => { const saleDate = new Date(sale.created_at); return saleDate >= day && saleDate < nextDay }).reduce((sum, sale) => sum + (sale.total_amount || 0), 0)
        }
        salesByDay.push({ name: day.toLocaleDateString(lang === 'ur' ? 'ur-PK' : 'en-US', { weekday: 'short' }), Sales: Number(dayTotal.toFixed(2)) })
    })

    // 5. Fetch Top Selling Products
    const { data: recentItems } = await supabase.from('sale_items').select('product_name, quantity')
    const productSales: Record<string, number> = {}
    if (recentItems && recentItems.length > 0) {
        recentItems.forEach(item => {
            const name = item.product_name
            const qty = item.quantity || 0
            if (productSales[name]) productSales[name] += qty
            else productSales[name] = qty
        })
    }
    const topProducts = Object.entries(productSales).map(([name, qty]) => ({ name, Units: qty })).sort((a, b) => b.Units - a.Units).slice(0, 5)

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t.dashboard.title}</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Welcome back, here's what's happening with your business today.</p>
            </div>

            {/* Premium KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">

                {/* Today's Sales */}
                <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 rounded-lg"><DollarSign className="text-blue-600 dark:text-blue-400" size={20} /></div>
                        <span className="text-xs font-medium text-gray-400">{totalOrdersToday} {t.dashboard.orders_today}</span>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t.dashboard.today_sales}</p>
                        <p dir="ltr" className="text-2xl font-bold text-gray-900 dark:text-white mt-1 text-right">Rs. {totalRevenueToday.toFixed(2)}</p>
                    </div>
                </div>

                {/* Monthly Sales */}
                <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2.5 bg-green-50 dark:bg-green-900/30 rounded-lg"><TrendingUp className="text-green-600 dark:text-green-400" size={20} /></div>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t.dashboard.monthly_sales}</p>
                        <p dir="ltr" className="text-2xl font-bold text-gray-900 dark:text-white mt-1 text-right">Rs. {totalRevenueMonth.toFixed(2)}</p>
                    </div>
                </div>

                {/* Monthly Expenses */}
                <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2.5 bg-red-50 dark:bg-red-900/30 rounded-lg"><TrendingDown className="text-red-600 dark:text-red-400" size={20} /></div>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t.dashboard.today_expenses}</p>
                        <p dir="ltr" className="text-2xl font-bold text-gray-900 dark:text-white mt-1 text-right">Rs. {totalExpensesMonth.toFixed(2)}</p>
                    </div>
                </div>

                {/* Net Profit */}
                <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2.5 bg-purple-50 dark:bg-purple-900/30 rounded-lg"><Wallet className="text-purple-600 dark:text-purple-400" size={20} /></div>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t.dashboard.net_profit}</p>
                        <p dir="ltr" className={`text-2xl font-bold mt-1 text-right ${netProfitMonth >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>Rs. {netProfitMonth.toFixed(2)}</p>
                    </div>
                </div>

                {/* Low Stock Alerts */}
                <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2.5 bg-orange-50 dark:bg-orange-900/30 rounded-lg"><AlertTriangle className="text-orange-600 dark:text-orange-400" size={20} /></div>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t.dashboard.low_stock}</p>
                        <p dir="ltr" className={`text-2xl font-bold mt-1 text-right ${lowStockItems > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-gray-900 dark:text-white'}`}>{lowStockItems}</p>
                    </div>
                </div>

            </div>

            {/* Charts & Low Stock List */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Charts (Takes 2 columns) */}
                <div className="lg:col-span-2">
                    <DashboardCharts salesByDay={salesByDay} topProducts={topProducts} lang={lang} />
                </div>

                {/* Needs Attention List (Takes 1 column) */}
                <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
                    <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100 dark:border-gray-800">
                        <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
                            <AlertTriangle className="text-orange-500" size={20} /> Needs Attention
                        </h3>
                        <Link href="/dashboard/inventory" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                            View All <ArrowRight size={12} />
                        </Link>
                    </div>

                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                        {lowStockProducts.length > 0 ? (
                            lowStockProducts.map(p => (
                                <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-orange-50 dark:bg-orange-900/20">
                                    <div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">{p.name}</p>
                                        <p className="text-xs text-gray-500">Min: {p.min_stock} {p.unit}</p>
                                    </div>
                                    <span className="text-sm font-bold text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/40 px-2 py-1 rounded-full">
                                        {p.quantity} {p.unit}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                <Boxes className="mx-auto mb-3 text-gray-300 dark:text-gray-600" size={32} />
                                <p className="text-sm">All stock levels are healthy.</p>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    )
}