import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { dictionaries } from '@/lib/dictionary'
import ReportsUI from './ReportsUI'
import { getCurrentShopContext, requireShopModule } from '@/lib/shop-context'

export default async function ReportsPage() {
    const context = await getCurrentShopContext()
    requireShopModule(context, 'reports')
    const supabase = await createClient()
    const cookieStore = await cookies()
    const lang = cookieStore.get('lang')?.value || 'en'
    const t = dictionaries[lang] || dictionaries['en']

    // 1. Fetch Financials
    const { data: sales } = await supabase.from('sales').select('total_amount').eq('status', 'completed')
    const { data: purchases } = await supabase.from('purchases').select('total_amount')
    const { data: expenses } = await supabase.from('expenses').select('amount')

    const totalSales = sales?.reduce((s, sale) => s + (sale.total_amount || 0), 0) || 0
    const totalPurchases = purchases?.reduce((s, pur) => s + (pur.total_amount || 0), 0) || 0
    const totalExpenses = expenses?.reduce((s, exp) => s + (exp.amount || 0), 0) || 0
    const grossProfit = totalSales - totalPurchases
    const netProfit = grossProfit - totalExpenses

    // 2. Fetch Product Sales
    const { data: saleItems } = await supabase.from('sale_items').select('product_name, quantity, total_price')

    const productMap: Record<string, { qty: number, rev: number }> = {}
    saleItems?.forEach(item => {
        if (!productMap[item.product_name]) productMap[item.product_name] = { qty: 0, rev: 0 }
        productMap[item.product_name].qty += item.quantity
        productMap[item.product_name].rev += item.total_price
    })
    const productSales = Object.entries(productMap).map(([name, val]) => ({ name, total_qty: val.qty, total_rev: val.rev }))

    // 3. Fetch Inventory
    const { data: products } = await supabase.from('products').select('name, quantity, min_stock, purchase_price')
    const inventory = products?.map(p => ({ ...p })) || []

    // 4. Fetch Customers
    const { data: customerSales } = await supabase.from('sales').select('customer_name, total_amount').eq('status', 'completed')
    const customerMap: Record<string, number> = {}
    customerSales?.forEach(sale => {
        const name = sale.customer_name || 'Walk-in Customer'
        if (!customerMap[name]) customerMap[name] = 0
        customerMap[name] += sale.total_amount
    })
    const customers = Object.entries(customerMap).map(([name, total]) => ({ name, total_spent: total }))

    // 5. Fetch Suppliers & Payables
    const { data: supplierPurchases } = await supabase.from('purchases').select('total_amount, paid_amount, suppliers(name)')
    const supplierMap: Record<string, { total: number, paid: number }> = {}
    supplierPurchases?.forEach((pur: any) => {
        const name = pur.suppliers?.name || 'Unknown Supplier'
        if (!supplierMap[name]) supplierMap[name] = { total: 0, paid: 0 }
        supplierMap[name].total += pur.total_amount
        supplierMap[name].paid += pur.paid_amount
    })
    const suppliers = Object.entries(supplierMap).map(([name, val]) => ({ name, total_purchased: val.total, total_paid: val.paid, due: val.total - val.paid }))

    // 6. Fetch Ledger Data
    const { data: ledgerSales } = await supabase.from('sales').select('created_at, total_amount, customer_name').eq('status', 'completed')
    const { data: ledgerPurchases } = await supabase.from('purchases').select('created_at, total_amount, suppliers(name)')
    const { data: ledgerExpenses } = await supabase.from('expenses').select('created_at, amount, category')

    const ledgerEntries: any[] = []
    ledgerSales?.forEach(s => ledgerEntries.push({ date: s.created_at, description: `Sale to ${s.customer_name || 'Walk-in'}`, debit: 0, credit: s.total_amount }))
    ledgerPurchases?.forEach((p: any) => ledgerEntries.push({ date: p.created_at, description: `Purchase from ${p.suppliers?.name || 'Supplier'}`, debit: p.total_amount, credit: 0 }))
    ledgerExpenses?.forEach(e => ledgerEntries.push({ date: e.created_at, description: `Expense: ${e.category}`, debit: e.amount, credit: 0 }))
    ledgerEntries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    const reportData = {
        financial: { totalSales, totalPurchases, totalExpenses, grossProfit, netProfit },
        productSales,
        inventory,
        customers,
        suppliers,
        ledger: ledgerEntries
    }

    return <ReportsUI data={reportData} t={t.reports} />
}
