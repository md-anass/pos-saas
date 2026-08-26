import { cookies } from 'next/headers'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getCurrentShopContext } from '@/lib/shop-context'
import DashboardCharts from './DashboardCharts'
import { dictionaries } from '@/lib/dictionary'
import { renderDashboardWidget } from '@/lib/dashboard-widgets'
import { ArrowRight, AlertTriangle } from 'lucide-react'

type ProductRow = { id: string; name: string; quantity: number; min_stock: number; category_id?: string | null }
type SaleRow = { id: string; total_amount: number | null; created_at: string; customer_name?: string | null }
type PurchaseRow = { id: string; total_amount: number | null; created_at: string; suppliers?: { name: string }[] | { name: string } | null }
type TableRow = { id: string; name_or_number: string; capacity: number; status: string }
type OrderRow = { id: string; status: string; total_amount: number | null; created_at: string; table_id: string | null }
type BatchRow = { id: string; batch_number: string; expiry_date: string | null; quantity: number; products?: { name: string }[] | { name: string } | null }
type PrescriptionRow = { id: string; prescription_number: string; doctor_name?: string | null; created_at: string }

function sum(values: Array<number | null | undefined>): number {
    let total = 0
    for (const value of values) {
        total += Number(value || 0)
    }
    return total
}

export default async function IndustryDashboard() {
    const supabase = await createClient()
    const cookieStore = await cookies()
    const lang = cookieStore.get('lang')?.value || 'en'
    const t = dictionaries[lang] || dictionaries.en
    const context = await getCurrentShopContext()
    const { shopType, capabilities } = context

    const today = new Date()
    const startOfDay = new Date(today)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(today)
    endOfDay.setHours(23, 59, 59, 999)
    const startOfMonth = new Date(today)
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const [
        { data: todaysSalesRaw },
        { data: monthSalesRaw },
        { data: monthExpensesRaw },
        { data: productsRaw },
        { data: recentSalesRaw },
        { data: saleItemsRaw },
        { data: recentPurchasesRaw },
        { data: restaurantTablesRaw },
        { data: restaurantOrdersRaw },
        { count: openRestaurantOrdersCount },
        { data: medicineBatchesRaw },
        { data: recentPrescriptionsRaw },
        { data: categoriesRaw },
        { data: groceryBatchesRaw },
    ] = await Promise.all([
        supabase.from('sales').select('id, total_amount, created_at, customer_name').gte('created_at', startOfDay.toISOString()).lte('created_at', endOfDay.toISOString()).eq('status', 'completed').order('created_at', { ascending: false }),
        supabase.from('sales').select('total_amount').gte('created_at', startOfMonth.toISOString()).eq('status', 'completed'),
        supabase.from('expenses').select('amount').gte('created_at', startOfMonth.toISOString()),
        supabase.from('products').select('id, name, quantity, min_stock, category_id').order('name', { ascending: true }),
        supabase.from('sales').select('id, total_amount, created_at, customer_name').eq('status', 'completed').order('created_at', { ascending: false }).limit(10),
        supabase.from('sale_items').select('product_id, product_name, quantity').gte('created_at', startOfMonth.toISOString()),
        supabase.from('purchases').select('id, total_amount, created_at, suppliers(name)').order('created_at', { ascending: false }).limit(10),
        supabase.from('restaurant_tables').select('id, name_or_number, capacity, status').order('created_at', { ascending: false }),
        supabase.from('restaurant_orders').select('id, status, total_amount, created_at, table_id, restaurant_tables(name_or_number)').gte('created_at', startOfDay.toISOString()).lte('created_at', endOfDay.toISOString()).order('created_at', { ascending: false }),
        supabase.from('restaurant_orders').select('id', { count: 'exact', head: true }).eq('status', 'pending').is('sale_id', null),
        supabase.from('medicine_batches').select('id, batch_number, expiry_date, quantity, product_id, products(name)').order('created_at', { ascending: false }),
        supabase.from('prescriptions').select('id, prescription_number, doctor_name, created_at').order('created_at', { ascending: false }).limit(10),
        supabase.from('categories').select('id, name').order('name', { ascending: true }),
        supabase.from('product_batches').select('id, batch_number, expiry_date, quantity, product_id, products(name)').order('expiry_date', { ascending: true }),
    ])

    const todaysSales = (todaysSalesRaw || []) as SaleRow[]
    const monthSales = (monthSalesRaw || []) as Array<{ total_amount: number | null }>
    const monthExpenses = (monthExpensesRaw || []) as Array<{ amount: number | null }>
    const products = (productsRaw || []) as ProductRow[]
    const recentSales = (recentSalesRaw || []) as SaleRow[]
    const saleItems = (saleItemsRaw || []) as Array<{ product_id?: string | null; product_name: string | null; quantity: number | null }>
    const recentPurchases = (recentPurchasesRaw || []) as PurchaseRow[]
    const restaurantTables = (restaurantTablesRaw || []) as TableRow[]
    const restaurantOrders = (restaurantOrdersRaw || []) as OrderRow[]
    const medicineBatches = (medicineBatchesRaw || []) as BatchRow[]
    const recentPrescriptions = (recentPrescriptionsRaw || []) as PrescriptionRow[]
    const categories = (categoriesRaw || []) as Array<{ id: string; name: string }>
    const groceryBatches = (groceryBatchesRaw || []) as BatchRow[]

    const salesTodayRevenue = Number(sum(todaysSales?.map((sale) => sale.total_amount) || []))
    const salesTodayCount = todaysSales?.length || 0
    const revenueMonth = Number(sum(monthSales?.map((sale) => sale.total_amount) || []))
    const expenseMonth = Number(sum(monthExpenses?.map((expense) => expense.amount) || []))
    const profitMonth = revenueMonth - expenseMonth

    const lowStockItems = products.filter((product) => Number(product.quantity || 0) <= Number(product.min_stock || 0))
    const outOfStockItems = products.filter((product) => Number(product.quantity || 0) <= 0)
    const topProductsMap: Record<string, number> = {}
    saleItems?.forEach((item) => {
        const name = item.product_name || 'Unknown'
        topProductsMap[name] = (topProductsMap[name] || 0) + Number(item.quantity || 0)
    })
    const topProducts = Object.entries(topProductsMap)
        .map(([name, Units]) => ({ name, Units }))
        .sort((a, b) => b.Units - a.Units)
        .slice(0, 5)

    const categoryNames = new Map(categories.map((category) => [category.id, category.name]))
    const productCategoryMap = new Map(products.map((product) => [product.id, product.category_id ? categoryNames.get(product.category_id) || 'Uncategorized' : 'Uncategorized']))
    const topCategoriesMap: Record<string, number> = {}
    saleItems?.forEach((item) => {
        const category = item.product_id ? productCategoryMap.get(item.product_id) || 'Uncategorized' : 'Uncategorized'
        topCategoriesMap[category] = (topCategoriesMap[category] || 0) + Number(item.quantity || 0)
    })
    const topCategories = Object.entries(topCategoriesMap)
        .map(([name, Units]) => ({ name, Units }))
        .sort((a, b) => b.Units - a.Units)
        .slice(0, 5)
    const purchaseCountMonth = recentPurchases.length || 0
    const purchaseTotalMonth = sum(recentPurchases.map((purchase) => purchase.total_amount))

    const ordersTodayCount = restaurantOrders.length
    const ordersTodayRevenue = Number(sum(restaurantOrders.map((order) => order.total_amount)))
    const activeTablesCount = restaurantTables.filter((table) => ['occupied', 'reserved'].includes(table.status)).length
    const openOrdersCount = openRestaurantOrdersCount || 0
    const averageOrderValue = ordersTodayCount > 0 ? ordersTodayRevenue / ordersTodayCount : 0
    const averageBasketValue = salesTodayCount > 0 ? salesTodayRevenue / salesTodayCount : 0
    const topMenuItems = shopType === 'restaurant' ? topProducts : []
    const topMedicines = topProducts

    const expiringMedicines = medicineBatches.filter((batch) => {
        if (!batch.expiry_date) return false
        const expiry = new Date(batch.expiry_date)
        const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        return diffDays >= 0 && diffDays <= 30
    })
    const expiredMedicines = medicineBatches.filter((batch) => batch.expiry_date && new Date(batch.expiry_date) < today)
    const expiringProducts = groceryBatches.filter((batch) => {
        if (!batch.expiry_date) return false
        const diffDays = Math.ceil((new Date(batch.expiry_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        return diffDays >= 0 && diffDays <= 30
    })
    const expiredProducts = groceryBatches.filter((batch) => batch.expiry_date && new Date(batch.expiry_date) < today)
    const batchAlerts = [...expiringMedicines, ...expiredMedicines]
        .map((batch) => ({
            id: batch.id,
            product_name: Array.isArray(batch.products) ? batch.products[0]?.name || 'Unknown medicine' : batch.products?.name || 'Unknown medicine',
            batch_number: batch.batch_number,
            expiry_date: batch.expiry_date,
            quantity: Number(batch.quantity || 0),
        }))
        .slice(0, 8)

    const expiringMedicineSummary = expiringMedicines.map((batch) => ({
        id: batch.id,
        name: Array.isArray(batch.products) ? batch.products[0]?.name || 'Unknown medicine' : batch.products?.name || 'Unknown medicine',
        expiry_date: batch.expiry_date,
        quantity: Number(batch.quantity || 0),
    }))
    const expiredMedicineSummary = expiredMedicines.map((batch) => ({
        id: batch.id,
        name: Array.isArray(batch.products) ? batch.products[0]?.name || 'Unknown medicine' : batch.products?.name || 'Unknown medicine',
        expiry_date: batch.expiry_date,
        quantity: Number(batch.quantity || 0),
    }))
    const lowStockMedicineSummary = lowStockItems.map((product) => ({
        id: product.id,
        name: product.name,
        quantity: Number(product.quantity || 0),
        min_stock: Number(product.min_stock || 0),
    }))

    const tableMap = new Map(restaurantTables.map((table) => [table.id, table.name_or_number]))

    const recentOrders = restaurantOrders.map((order) => ({
        id: order.id,
        status: order.status,
        total_amount: order.total_amount,
        created_at: order.created_at,
        table_name: order.table_id ? tableMap.get(order.table_id) || null : null,
    }))

    const processedRecentPurchases = recentPurchases.map((purchase) => {
        const supplier = Array.isArray(purchase.suppliers)
            ? purchase.suppliers[0]
            : purchase.suppliers

        return {
            id: purchase.id,
            total_amount: Number(purchase.total_amount || 0),
            created_at: purchase.created_at,
            supplier_name: supplier?.name || null,
        }
    })

    const dashboardData = {
        salesTodayRevenue,
        salesTodayCount,
        revenueMonth,
        expenseMonth,
        profitMonth,
        lowStockCount: lowStockItems.length,
        lowStockItems,
        topProducts,
        recentSales: recentSales || [],
        purchaseCountMonth,
        purchaseTotalMonth,
        recentPurchases: processedRecentPurchases,
        ordersTodayCount,
        ordersTodayRevenue,
        activeTablesCount,
        openOrdersCount,
        averageOrderValue,
        recentOrders,
        topMenuItems,
        lowStockMedicines: lowStockMedicineSummary,
        expiringMedicines: expiringMedicineSummary,
        expiredMedicines: expiredMedicineSummary,
        batchAlerts,
        recentPrescriptions: recentPrescriptions || [],
        topMedicines,
        transactionsToday: salesTodayCount,
        averageBasketValue,
        outOfStockCount: outOfStockItems.length,
        expiringProducts: expiringProducts.map((batch) => ({ id: batch.id, name: Array.isArray(batch.products) ? batch.products[0]?.name || 'Unknown product' : batch.products?.name || 'Unknown product', expiry_date: batch.expiry_date, quantity: Number(batch.quantity || 0) })),
        expiredProducts: expiredProducts.map((batch) => ({ id: batch.id, name: Array.isArray(batch.products) ? batch.products[0]?.name || 'Unknown product' : batch.products?.name || 'Unknown product', expiry_date: batch.expiry_date, quantity: Number(batch.quantity || 0) })),
        topCategories,
    }

    const subtitleByShopType: Record<string, string> = {
        retail: "Welcome back, here's what's happening with your business today.",
        restaurant: "Track today's sales, open orders, tables and billing activity.",
        pharmacy: 'Monitor medicine sales and stock at a glance.',
        grocery: 'Keep checkout fast and stay ahead of stock alerts.',
    }

    const attentionItems = lowStockItems.slice(0, 6).map((product) => ({
        id: product.id,
        title: product.name,
        meta: `Stock: ${product.quantity}`,
        amount: `Min: ${product.min_stock}`,
    }))

    const salesByDay: { name: string; Sales: number }[] = []
    const recentSalesWindowStart = new Date(today)
    recentSalesWindowStart.setDate(recentSalesWindowStart.getDate() - 6)
    recentSalesWindowStart.setHours(0, 0, 0, 0)
    const sevenDaySales = (await supabase.from('sales').select('total_amount, created_at').gte('created_at', recentSalesWindowStart.toISOString()).eq('status', 'completed')).data || []

    for (let i = 6; i >= 0; i -= 1) {
        const day = new Date(today)
        day.setDate(day.getDate() - i)
        day.setHours(0, 0, 0, 0)
        const nextDay = new Date(day)
        nextDay.setDate(nextDay.getDate() + 1)
        const dayTotal = sevenDaySales
            .filter((sale) => {
                const saleDate = new Date(sale.created_at)
                return saleDate >= day && saleDate < nextDay
            })
            .reduce((total, sale) => total + Number(sale.total_amount || 0), 0)
        salesByDay.push({
            name: day.toLocaleDateString(lang === 'ur' ? 'ur-PK' : 'en-US', { weekday: 'short' }),
            Sales: Number(dayTotal.toFixed(2)),
        })
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t.dashboard.title}</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {subtitleByShopType[shopType] || subtitleByShopType.retail}
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {capabilities.dashboardWidgets.map((widgetKey) => renderDashboardWidget(widgetKey, dashboardData, capabilities.terminology, context.shop.currency))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <DashboardCharts salesByDay={salesByDay} topProducts={topProducts} lang={lang} />
                </div>

                <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
                    <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100 dark:border-gray-800">
                        <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
                            <AlertTriangle className="text-orange-500" size={20} />
                            Needs Attention
                        </h3>
                        <Link href="/dashboard/inventory" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                            View All <ArrowRight size={12} />
                        </Link>
                    </div>

                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                        {attentionItems.length > 0 ? (
                            attentionItems.map((item) => (
                                <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 dark:border-gray-800 p-3">
                                    <div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">{item.title}</p>
                                        {item.meta ? <p className="text-xs text-gray-500 dark:text-gray-400">{item.meta}</p> : null}
                                    </div>
                                    <p className="text-xs font-semibold text-gray-900 dark:text-white">{item.amount}</p>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-gray-500 dark:text-gray-400">Nothing needs attention right now.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
