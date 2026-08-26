import Link from 'next/link'
import {
    AlertTriangle,
    ArrowRight,
    Armchair,
    Boxes,
    ClipboardList,
    Clock3,
    Banknote,
    FileText,
    Package,
    Pill,
    ReceiptText,
    TrendingDown,
    TrendingUp,
    Wallet,
    type LucideIcon,
} from 'lucide-react'
import type { DashboardWidgetKey, ShopTerminology } from './shop-capabilities'
import { formatCurrency } from './currency'

type DashboardWidgetData = {
    salesTodayRevenue: number
    salesTodayCount: number
    revenueMonth: number
    expenseMonth: number
    profitMonth: number
    lowStockCount: number
    lowStockItems: Array<{ id: string; name: string; quantity: number; min_stock?: number }>
    topProducts: Array<{ name: string; Units: number }>
    recentSales: Array<{ id: string; total_amount: number | null; created_at: string; customer_name?: string | null }>
    purchaseCountMonth: number
    purchaseTotalMonth: number
    recentPurchases: Array<{ id: string; total_amount: number; created_at: string; supplier_name?: string | null }>
    ordersTodayCount: number
    ordersTodayRevenue: number
    activeTablesCount: number
    openOrdersCount: number
    averageOrderValue: number
    recentOrders: Array<{ id: string; status: string; total_amount?: number | null; created_at: string; table_name?: string | null }>
    topMenuItems: Array<{ name: string; Units: number }>
    lowStockMedicines: Array<{ id: string; name: string; quantity: number; min_stock?: number }>
    expiringMedicines: Array<{ id: string; name: string; expiry_date: string | null; quantity: number }>
    expiredMedicines: Array<{ id: string; name: string; expiry_date: string | null; quantity: number }>
    batchAlerts: Array<{ id: string; product_name: string; batch_number: string; expiry_date: string | null; quantity: number }>
    recentPrescriptions: Array<{ id: string; prescription_number: string; doctor_name?: string | null; created_at: string }>
    topMedicines: Array<{ name: string; Units: number }>
    transactionsToday: number
    averageBasketValue: number
    outOfStockCount: number
    expiringProducts: Array<{ id: string; name: string; expiry_date: string | null; quantity: number }>
    expiredProducts: Array<{ id: string; name: string; expiry_date: string | null; quantity: number }>
    topCategories: Array<{ name: string; Units: number }>
}

const cardStyles: Record<'blue' | 'green' | 'red' | 'orange' | 'purple' | 'slate', string> = {
    blue: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    green: 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    red: 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    orange: 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
    purple: 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
    slate: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300',
}

function StatCard({
    title,
    value,
    subtitle,
    icon: Icon,
    tone = 'slate',
    href,
}: {
    title: string
    value: string
    subtitle?: string
    icon: LucideIcon
    tone?: keyof typeof cardStyles
    href?: string
}) {
    const content = (
        <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-3">
                <div className={`p-2 rounded-lg ${cardStyles[tone]}`}>
                    <Icon size={20} />
                </div>
                {subtitle ? <span className="text-xs font-medium text-gray-400">{subtitle}</span> : null}
            </div>
            <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
            </div>
        </div>
    )

    if (!href) return content

    return (
        <Link href={href} className="block">
            {content}
        </Link>
    )
}

function ListCard({
    title,
    icon: Icon,
    items,
    emptyText,
    href,
}: {
    title: string
    icon: LucideIcon
    items: Array<{ id: string; title: string; meta?: string; amount?: string }>
    emptyText: string
    href?: string
}) {
    const body = (
        <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
            <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-100 dark:border-gray-800">
                <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
                    <Icon className="text-blue-500" size={20} /> {title}
                </h3>
                {href ? (
                    <span className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                        View All <ArrowRight size={12} />
                    </span>
                ) : null}
            </div>

            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-2">
                {items.length > 0 ? (
                    items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 dark:border-gray-800 p-2.5">
                            <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.title}</p>
                                {item.meta ? <p className="text-xs text-gray-500 dark:text-gray-400">{item.meta}</p> : null}
                            </div>
                            {item.amount ? <p className="text-sm font-semibold text-gray-900 dark:text-white">{item.amount}</p> : null}
                        </div>
                    ))
                ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">{emptyText}</p>
                )}
            </div>
        </div>
    )

    if (!href) return body

    return <Link href={href} className="block">{body}</Link>
}

export function renderDashboardWidget(
    widgetKey: DashboardWidgetKey,
    data: DashboardWidgetData,
    terminology: ShopTerminology,
    currency: string,
) {
    switch (widgetKey) {
        case 'sales_today':
            return (
                <StatCard
                    key={widgetKey}
                    title={`Today's ${terminology.sales.toLowerCase()}`}
                    value={formatCurrency(data.salesTodayRevenue, currency)}
                    subtitle={`${data.salesTodayCount} ${terminology.orders.toLowerCase()}`}
                    icon={Banknote}
                    tone="blue"
                    href="/dashboard/sales"
                />
            )
        case 'revenue':
            return (
                <StatCard
                    key={widgetKey}
                    title="Monthly Revenue"
                    value={formatCurrency(data.revenueMonth, currency)}
                    subtitle="Current month"
                    icon={TrendingUp}
                    tone="green"
                />
            )
        case 'profit':
            return (
                <StatCard
                    key={widgetKey}
                    title="Profit"
                    value={formatCurrency(data.profitMonth, currency)}
                    subtitle={`Expenses: ${formatCurrency(data.expenseMonth, currency)}`}
                    icon={Wallet}
                    tone={data.profitMonth >= 0 ? 'green' : 'red'}
                />
            )
        case 'low_stock':
            return (
                <StatCard
                    key={widgetKey}
                    title={`Low stock ${terminology.products.toLowerCase()}`}
                    value={String(data.lowStockCount)}
                    subtitle="Needs attention"
                    icon={AlertTriangle}
                    tone="orange"
                    href="/dashboard/inventory"
                />
            )
        case 'top_products':
            return (
                <ListCard
                    key={widgetKey}
                    title={`Top ${terminology.products.toLowerCase()}`}
                    icon={Package}
                    items={data.topProducts.map((item) => ({
                        id: item.name,
                        title: item.name,
                        amount: `${item.Units} sold`,
                    }))}
                    emptyText={`No ${terminology.products.toLowerCase()} sold yet.`}
                    href="/dashboard/reports"
                />
            )
        case 'recent_sales':
            return (
                <ListCard
                    key={widgetKey}
                    title={`Recent ${terminology.sales.toLowerCase()}`}
                    icon={ReceiptText}
                    items={data.recentSales.map((sale) => ({
                        id: sale.id,
                        title: sale.customer_name || 'Walk-in customer',
                        meta: new Date(sale.created_at).toLocaleString(),
                        amount: formatCurrency(sale.total_amount, currency),
                    }))}
                    emptyText={`No ${terminology.sales.toLowerCase()} yet.`}
                    href="/dashboard/sales"
                />
            )
        case 'purchase_activity':
            return (
                <ListCard
                    key={widgetKey}
                    title="Purchase activity"
                    icon={TrendingDown}
                    items={data.recentPurchases.map((purchase) => ({
                        id: purchase.id,
                        title: purchase.supplier_name || 'Unknown supplier',
                        meta: new Date(purchase.created_at).toLocaleString(),
                        amount: formatCurrency(purchase.total_amount, currency),
                    }))}
                    emptyText="No purchases yet."
                    href="/dashboard/purchases"
                />
            )
        case 'orders_today':
            return (
                <StatCard
                    key={widgetKey}
                    title="Today's orders"
                    value={String(data.ordersTodayCount)}
                    subtitle={formatCurrency(data.ordersTodayRevenue, currency)}
                    icon={ClipboardList}
                    tone="blue"
                    href="/dashboard/orders"
                />
            )
        case 'active_tables':
            return (
                <StatCard
                    key={widgetKey}
                    title="Active tables"
                    value={String(data.activeTablesCount)}
                    subtitle="Restaurant floor"
                    icon={Armchair}
                    tone="purple"
                    href="/dashboard/tables"
                />
            )
        case 'open_orders':
            return (
                <StatCard
                    key={widgetKey}
                    title="Open orders"
                    value={String(data.openOrdersCount)}
                    subtitle="Awaiting payment"
                    icon={ClipboardList}
                    tone="orange"
                    href="/dashboard/orders"
                />
            )
        case 'average_order_value':
            return (
                <StatCard
                    key={widgetKey}
                    title="Average order value"
                    value={formatCurrency(data.averageOrderValue, currency)}
                    subtitle="Today"
                    icon={Banknote}
                    tone="green"
                />
            )
        case 'top_menu_items':
            return (
                <ListCard
                    key={widgetKey}
                    title={`Top ${terminology.menu.toLowerCase()}`}
                    icon={Package}
                    items={data.topMenuItems.map((item) => ({
                        id: item.name,
                        title: item.name,
                        amount: `${item.Units} sold`,
                    }))}
                    emptyText={`No ${terminology.menu.toLowerCase()} items sold yet.`}
                    href="/dashboard/menu"
                />
            )
        case 'recent_orders':
            return (
                <ListCard
                    key={widgetKey}
                    title="Recent orders"
                    icon={ClipboardList}
                    items={data.recentOrders.map((order) => ({
                        id: order.id,
                        title: order.table_name ? `Table ${order.table_name}` : 'Walk-in order',
                        meta: `${order.status} · ${new Date(order.created_at).toLocaleString()}`,
                        amount: formatCurrency(order.total_amount, currency),
                    }))}
                    emptyText="No restaurant orders yet."
                    href="/dashboard/orders"
                />
            )
        case 'low_stock_medicines':
            return (
                <StatCard
                    key={widgetKey}
                    title={`Low stock ${terminology.medicines.toLowerCase()}`}
                    value={String(data.lowStockMedicines.length)}
                    subtitle="Needs review"
                    icon={Pill}
                    tone="orange"
                    href="/dashboard/inventory"
                />
            )
        case 'expiring_medicines':
            return (
                <StatCard
                    key={widgetKey}
                    title="Expiring soon"
                    value={String(data.expiringMedicines.length)}
                    subtitle="Next 30 days"
                    icon={Clock3}
                    tone="orange"
                    href="/dashboard/expiry"
                />
            )
        case 'expired_medicines':
            return (
                <StatCard
                    key={widgetKey}
                    title="Expired"
                    value={String(data.expiredMedicines.length)}
                    subtitle="Remove from stock"
                    icon={AlertTriangle}
                    tone="red"
                    href="/dashboard/expiry"
                />
            )
        case 'batch_alerts':
            return (
                <ListCard
                    key={widgetKey}
                    title="Batch alerts"
                    icon={Boxes}
                    items={data.batchAlerts.map((batch) => ({
                        id: batch.id,
                        title: batch.product_name,
                        meta: `${batch.batch_number}${batch.expiry_date ? ` · ${new Date(batch.expiry_date).toLocaleDateString()}` : ''}`,
                        amount: `${batch.quantity} in stock`,
                    }))}
                    emptyText="No batch alerts."
                    href="/dashboard/batches"
                />
            )
        case 'recent_prescriptions':
            return (
                <ListCard
                    key={widgetKey}
                    title="Recent prescriptions"
                    icon={FileText}
                    items={data.recentPrescriptions.map((prescription) => ({
                        id: prescription.id,
                        title: prescription.prescription_number,
                        meta: prescription.doctor_name || new Date(prescription.created_at).toLocaleString(),
                    }))}
                    emptyText="No prescriptions recorded yet."
                    href="/dashboard/prescriptions"
                />
            )
        case 'top_medicines':
            return (
                <ListCard
                    key={widgetKey}
                    title={`Top ${terminology.medicines.toLowerCase()}`}
                    icon={Pill}
                    items={data.topMedicines.map((item) => ({
                        id: item.name,
                        title: item.name,
                        amount: `${item.Units} sold`,
                    }))}
                    emptyText={`No ${terminology.medicines.toLowerCase()} sold yet.`}
                    href="/dashboard/medicines"
                />
            )
        case 'transactions_today':
            return <StatCard key={widgetKey} title="Today's transactions" value={String(data.transactionsToday)} subtitle="Completed sales" icon={ReceiptText} tone="blue" href="/dashboard/sales" />
        case 'average_basket_value':
            return <StatCard key={widgetKey} title="Average basket value" value={formatCurrency(data.averageBasketValue, currency)} subtitle="Today" icon={Banknote} tone="green" />
        case 'out_of_stock':
            return <StatCard key={widgetKey} title="Out-of-stock products" value={String(data.outOfStockCount)} subtitle="Needs replenishment" icon={AlertTriangle} tone="red" href="/dashboard/inventory" />
        case 'expiring_products':
            return <StatCard key={widgetKey} title="Expiring soon" value={String(data.expiringProducts.length)} subtitle="Next 30 days" icon={Clock3} tone="orange" href="/dashboard/inventory" />
        case 'expired_products':
            return <StatCard key={widgetKey} title="Expired products" value={String(data.expiredProducts.length)} subtitle="Remove from stock" icon={AlertTriangle} tone="red" href="/dashboard/inventory" />
        case 'top_categories':
            return <ListCard key={widgetKey} title="Top categories" icon={Package} items={data.topCategories.map((item) => ({ id: item.name, title: item.name, amount: item.Units + " sold" }))} emptyText="No category sales yet." href="/dashboard/categories" />
        default:
            return null
    }
}
