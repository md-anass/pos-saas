import { createClient } from '@/lib/supabase/server'
import { getCurrentShopContext, requireShopModule } from '@/lib/shop-context'
import { archiveTable, createTable, restoreTable, updateTable } from '../industry-actions'
import RestaurantTablesUI from './RestaurantTablesUI'

type TableRow = { id: string, name_or_number: string, capacity: number, status: string }
type OrderRow = { id: string, order_number: number, table_id: string | null, status: string }

export default async function RestaurantTablesPage({ searchParams }: { searchParams?: Promise<{ archived?: string }> }) {
    const { archived } = await searchParams || {}
    const context = await getCurrentShopContext()
    requireShopModule(context, 'restaurant_tables')
    const db = await createClient()
    const [{ data: tables }, { data: activeOrders }] = await Promise.all([
        db.from('restaurant_tables').select('id,name_or_number,capacity,status').order('name_or_number'),
        db.from('restaurant_orders').select('id,order_number,table_id,status').eq('status', 'pending').is('sale_id', null),
    ])
    const allTables = (tables || []) as TableRow[]
    const visible = allTables.filter(table => archived ? table.status === 'inactive' : table.status !== 'inactive')
    const orders = (activeOrders || []) as OrderRow[]
    const orderByTable = Object.fromEntries(orders.filter(order => order.table_id).map(order => [order.table_id as string, { id: order.id, order_number: order.order_number }]))
    const activeTables = allTables.filter(table => table.status !== 'inactive')

    return <RestaurantTablesUI
        tables={visible}
        orderByTable={orderByTable}
        archived={Boolean(archived)}
        totalTables={activeTables.length}
        availableCount={activeTables.filter(table => table.status === 'available').length}
        occupiedCount={activeTables.filter(table => table.status === 'occupied' || orderByTable[table.id]).length}
        totalCapacity={activeTables.reduce((total, table) => total + Number(table.capacity || 0), 0)}
        createTable={createTable}
        updateTable={updateTable}
        archiveTable={archiveTable}
        restoreTable={restoreTable}
    />
}