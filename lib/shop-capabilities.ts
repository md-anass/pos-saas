import type { LucideIcon } from 'lucide-react'
import {
    AlertTriangle,
    Armchair,
    Boxes,
    ClipboardList,
    Clock3,
    FileBarChart,
    FileText,
    LayoutDashboard,
    Package,
    Pill,
    ReceiptText,
    Settings,
    ShoppingCart,
    Tags,
    Users,
    Wallet,
    Warehouse,
} from 'lucide-react'

export type ShopType =
    | 'retail'
    | 'restaurant'
    | 'pharmacy'
    | 'grocery'
    | 'clothing'
    | 'electronics'
    | 'salon'
    | 'wholesale'
    | 'services'
    | 'other'

export type ShopModule =
    | 'dashboard'
    | 'pos'
    | 'products'
    | 'categories'
    | 'inventory'
    | 'sales'
    | 'purchases'
    | 'suppliers'
    | 'customers'
    | 'expenses'
    | 'reports'
    | 'menu'
    | 'restaurant_tables'
    | 'restaurant_orders'
    | 'medicines'
    | 'medicine_batches'
    | 'medicine_expiry'
    | 'prescriptions'

export type DashboardWidgetKey =
    | 'sales_today'
    | 'revenue'
    | 'profit'
    | 'low_stock'
    | 'top_products'
    | 'recent_sales'
    | 'purchase_activity'
    | 'orders_today'
    | 'active_tables'
    | 'open_orders'
    | 'average_order_value'
    | 'top_menu_items'
    | 'recent_orders'
    | 'low_stock_medicines'
    | 'expiring_medicines'
    | 'expired_medicines'
    | 'batch_alerts'
    | 'recent_prescriptions'
    | 'top_medicines'
    | 'transactions_today'
    | 'average_basket_value'
    | 'out_of_stock'
    | 'expiring_products'
    | 'expired_products'
    | 'top_categories'

export type ShopFeatureKey =
    | 'grocery_categories'
    | 'expiry_tracking'
    | 'weighted_items'
    | 'stock_alerts'
    | 'fast_checkout'

export type ShopTerminology = {
    product: string
    products: string
    sale: string
    sales: string
    customer: string
    customers: string
    supplier: string
    suppliers: string
    inventory: string
    menu: string
    order: string
    orders: string
    table: string
    tables: string
    medicine: string
    medicines: string
    batch: string
    batches: string
    expiry: string
    prescription: string
    prescriptions: string
}

export type NavigationItem = {
    moduleKey: ShopModule
    path: string
    label: string
    icon: string
}

export type ShopCapabilities = {
    shopType: ShopType
    modules: ShopModule[]
    navigation: NavigationItem[]
    dashboardWidgets: DashboardWidgetKey[]
    terminology: ShopTerminology
    features: ShopFeatureKey[]
    defaultSettings: Record<string, string | number | boolean>
}

export type IndustryPreset = {
    shopType: ShopType
    modules: ShopModule[]
    dashboardWidgets: DashboardWidgetKey[]
    terminology: ShopTerminology
    optionalCapabilities: string[]
    features: ShopFeatureKey[]
    defaultSettings: Record<string, string | number | boolean>
}

export type ModuleDefinition = {
    moduleKey: ShopModule
    path: string
    navLabel: string
    icon: string
}

export const moduleRegistry: Record<ShopModule, ModuleDefinition> = {
    dashboard: { moduleKey: 'dashboard', path: '/dashboard', navLabel: 'Dashboard', icon: 'LayoutDashboard' },
    pos: { moduleKey: 'pos', path: '/dashboard/pos', navLabel: 'POS', icon: 'ShoppingCart' },
    products: { moduleKey: 'products', path: '/dashboard/products', navLabel: 'Products', icon: 'Package' },
    categories: { moduleKey: 'categories', path: '/dashboard/categories', navLabel: 'Categories', icon: 'Tags' },
    inventory: { moduleKey: 'inventory', path: '/dashboard/inventory', navLabel: 'Inventory', icon: 'Warehouse' },
    sales: { moduleKey: 'sales', path: '/dashboard/sales', navLabel: 'Sales', icon: 'ReceiptText' },
    purchases: { moduleKey: 'purchases', path: '/dashboard/purchases', navLabel: 'Purchases', icon: 'ReceiptText' },
    suppliers: { moduleKey: 'suppliers', path: '/dashboard/suppliers', navLabel: 'Suppliers', icon: 'Users' },
    customers: { moduleKey: 'customers', path: '/dashboard/customers', navLabel: 'Customers', icon: 'Users' },
    expenses: { moduleKey: 'expenses', path: '/dashboard/expenses', navLabel: 'Expenses', icon: 'Wallet' },
    reports: { moduleKey: 'reports', path: '/dashboard/reports', navLabel: 'Reports', icon: 'FileBarChart' },
    menu: { moduleKey: 'menu', path: '/dashboard/menu', navLabel: 'Menu', icon: 'Package' },
    restaurant_tables: { moduleKey: 'restaurant_tables', path: '/dashboard/tables', navLabel: 'Tables', icon: 'Armchair' },
    restaurant_orders: { moduleKey: 'restaurant_orders', path: '/dashboard/orders', navLabel: 'Orders', icon: 'ClipboardList' },
    medicines: { moduleKey: 'medicines', path: '/dashboard/medicines', navLabel: 'Medicines', icon: 'Pill' },
    medicine_batches: { moduleKey: 'medicine_batches', path: '/dashboard/batches', navLabel: 'Batches', icon: 'Boxes' },
    medicine_expiry: { moduleKey: 'medicine_expiry', path: '/dashboard/expiry', navLabel: 'Expiry', icon: 'Clock3' },
    prescriptions: { moduleKey: 'prescriptions', path: '/dashboard/prescriptions', navLabel: 'Prescriptions', icon: 'FileText' },
}

const defaultTerminology: ShopTerminology = {
    product: 'Product',
    products: 'Products',
    sale: 'Sale',
    sales: 'Sales',
    customer: 'Customer',
    customers: 'Customers',
    supplier: 'Supplier',
    suppliers: 'Suppliers',
    inventory: 'Inventory',
    menu: 'Menu',
    order: 'Order',
    orders: 'Orders',
    table: 'Table',
    tables: 'Tables',
    medicine: 'Medicine',
    medicines: 'Medicines',
    batch: 'Batch',
    batches: 'Batches',
    expiry: 'Expiry',
    prescription: 'Prescription',
    prescriptions: 'Prescriptions',
}

const retailPresetModules: ShopModule[] = ['dashboard', 'pos', 'products', 'categories', 'inventory', 'sales', 'purchases', 'suppliers', 'customers', 'expenses', 'reports']
const retailPresetWidgets: DashboardWidgetKey[] = ['sales_today', 'revenue', 'profit', 'low_stock', 'top_products', 'recent_sales', 'purchase_activity']
const retailPresetFeatures: ShopFeatureKey[] = ['stock_alerts']
const retailPresetSettings = { expiryWarningDays: 30, allowWeightedProducts: false, lowStockAlerts: true, barcodeMode: 'optional' }

export const industryPresets: Record<ShopType, IndustryPreset> = {
    retail: {
        shopType: 'retail',
        modules: retailPresetModules,
        dashboardWidgets: retailPresetWidgets,
        terminology: defaultTerminology,
        optionalCapabilities: ['sales', 'products', 'inventory'],
        features: retailPresetFeatures,
        defaultSettings: retailPresetSettings,
    },
    restaurant: {
        shopType: 'restaurant',
        modules: ['dashboard', 'pos', 'sales', 'menu', 'restaurant_tables', 'restaurant_orders', 'customers', 'expenses', 'reports'],
        dashboardWidgets: ['sales_today', 'orders_today', 'active_tables', 'open_orders', 'average_order_value', 'top_menu_items', 'recent_orders'],
        terminology: {
            ...defaultTerminology,
            product: 'Menu Item',
            products: 'Menu',
            sale: 'Order',
            sales: 'Sales',
            customer: 'Guest',
            customers: 'Guests',
            inventory: 'Inventory',
            menu: 'Menu',
            order: 'Order',
            orders: 'Orders',
            table: 'Table',
            tables: 'Tables',
        },
        optionalCapabilities: ['sales', 'products', 'inventory'],
        features: retailPresetFeatures,
        defaultSettings: retailPresetSettings,
    },
    pharmacy: {
        shopType: 'pharmacy',
        modules: ['dashboard', 'pos', 'products', 'medicines', 'customers', 'categories', 'medicine_batches', 'medicine_expiry', 'prescriptions', 'suppliers', 'purchases', 'sales', 'reports'],
        dashboardWidgets: ['sales_today', 'low_stock_medicines', 'expiring_medicines', 'expired_medicines', 'batch_alerts', 'recent_prescriptions', 'top_medicines'],
        terminology: {
            ...defaultTerminology,
            product: 'Medicine',
            products: 'Medicines',
            sale: 'Sale',
            sales: 'Sales',
            customer: 'Customer',
            customers: 'Customers',
            inventory: 'Medicine Stock',
            medicine: 'Medicine',
            medicines: 'Medicines',
            batch: 'Batch',
            batches: 'Batches',
            expiry: 'Expiry',
        },
        optionalCapabilities: ['sales', 'products', 'inventory'],
        features: retailPresetFeatures,
        defaultSettings: retailPresetSettings,
    },
    grocery: {
        shopType: 'grocery',
        modules: [...retailPresetModules, 'medicine_batches', 'medicine_expiry'],
        dashboardWidgets: ['sales_today', 'transactions_today', 'average_basket_value', 'low_stock', 'out_of_stock', 'expiring_products', 'expired_products', 'top_products', 'top_categories', 'recent_sales', 'purchase_activity'],
        terminology: defaultTerminology,
        optionalCapabilities: ['sales', 'products', 'inventory', 'grocery_categories', 'weighted_items', 'stock_alerts', 'fast_checkout'],
        features: ['grocery_categories', 'expiry_tracking', 'weighted_items', 'stock_alerts', 'fast_checkout'],
        defaultSettings: { expiryWarningDays: 30, allowWeightedProducts: true, lowStockAlerts: true, barcodeMode: 'optional' },
    },
    clothing: {
        shopType: 'clothing',
        modules: retailPresetModules,
        dashboardWidgets: retailPresetWidgets,
        terminology: defaultTerminology,
        optionalCapabilities: ['sales', 'products', 'inventory'],
        features: retailPresetFeatures,
        defaultSettings: retailPresetSettings,
    },
    electronics: {
        shopType: 'electronics',
        modules: retailPresetModules,
        dashboardWidgets: retailPresetWidgets,
        terminology: defaultTerminology,
        optionalCapabilities: ['sales', 'products', 'inventory'],
        features: retailPresetFeatures,
        defaultSettings: retailPresetSettings,
    },
    salon: {
        shopType: 'salon',
        modules: retailPresetModules,
        dashboardWidgets: retailPresetWidgets,
        terminology: defaultTerminology,
        optionalCapabilities: ['sales', 'products', 'inventory'],
        features: retailPresetFeatures,
        defaultSettings: retailPresetSettings,
    },
    wholesale: {
        shopType: 'wholesale',
        modules: retailPresetModules,
        dashboardWidgets: retailPresetWidgets,
        terminology: defaultTerminology,
        optionalCapabilities: ['sales', 'products', 'inventory'],
        features: retailPresetFeatures,
        defaultSettings: retailPresetSettings,
    },
    services: {
        shopType: 'services',
        modules: retailPresetModules,
        dashboardWidgets: retailPresetWidgets,
        terminology: defaultTerminology,
        optionalCapabilities: ['sales', 'products', 'inventory'],
        features: retailPresetFeatures,
        defaultSettings: retailPresetSettings,
    },
    other: {
        shopType: 'other',
        modules: retailPresetModules,
        dashboardWidgets: retailPresetWidgets,
        terminology: defaultTerminology,
        optionalCapabilities: ['sales', 'products', 'inventory'],
        features: retailPresetFeatures,
        defaultSettings: retailPresetSettings,
    },
}

const moduleAliases: Partial<Record<string, ShopModule>> = {
    contacts: 'customers',
}

const shopTypeAliases: Partial<Record<string, ShopType>> = {
    food: 'restaurant',
    'food/restaurant': 'restaurant',
    cafe: 'restaurant',
    'restaurant/cafe': 'restaurant',
    supermarket: 'grocery',
    'grocery/supermarket': 'grocery',
}

function normalizedShopTypeValue(value?: string | null) {
    return value?.toLowerCase().trim().replace(/\s*\/\s*/g, '/')
}

export function normalizeShopType(value?: string | null): ShopType {
    const supported = normalizedShopTypeValue(value)
    const alias = supported ? shopTypeAliases[supported] : null
    if (alias) {
        return alias
    }
    if (supported && supported in industryPresets) {
        return supported as ShopType
    }
    return 'retail'
}

export function resolveShopType(shopType?: string | null, businessType?: string | null): ShopType {
    const storedType = normalizedShopTypeValue(shopType)
    const legacyType = normalizedShopTypeValue(businessType)
    const legacyIndustryType = legacyType
        ? shopTypeAliases[legacyType]
            ?? (['restaurant', 'grocery', 'pharmacy'].includes(legacyType)
                ? legacyType as ShopType
                : null)
        : null

    // The first industry migration defaulted unknown legacy rows to Retail. A
    // recognized legacy industry remains authoritative only for that state.
    if ((!storedType || storedType === 'retail') && legacyIndustryType) {
        return legacyIndustryType
    }

    return normalizeShopType(storedType || legacyType)
}

export function normalizeModuleKey(value: string): ShopModule | null {
    if (value in moduleRegistry) {
        return value as ShopModule
    }
    const alias = moduleAliases[value]
    return alias ?? null
}

export function getShopPreset(shopType?: string | null): IndustryPreset {
    return industryPresets[normalizeShopType(shopType)]
}

export function getShopTerminology(shopType?: string | null): ShopTerminology {
    return getShopPreset(shopType).terminology
}

export function getShopFeatures(shopType?: string | null): ShopFeatureKey[] {
    return getShopPreset(shopType).features
}

export function hasShopFeature(shopType: string | null | undefined, feature: ShopFeatureKey): boolean {
    return getShopFeatures(shopType).includes(feature)
}

export function tShop(shopType: string | null | undefined, key: keyof ShopTerminology): string {
    return getShopTerminology(shopType)[key]
}

export function resolveEnabledModules({
    shopType,
    shopModuleRows,
    userRole,
    userPermissions,
}: {
    shopType?: string | null
    shopModuleRows?: Array<{ module_key: string; enabled: boolean | null }> | null
    userRole?: string
    userPermissions?: string[]
}): ShopModule[] {
    const preset = getShopPreset(shopType)
    const userIsOwner = userRole === 'owner'
    const permissionSet = new Set(
        (userPermissions || [])
            .map(normalizeModuleKey)
            .filter((moduleKey): moduleKey is ShopModule => Boolean(moduleKey))
    )

    // Categories historically shared the Products permission for staff.
    if (permissionSet.has('products')) {
        permissionSet.add('categories')
    }

    // Restaurant POS is the guarded order-taking/payment workflow.
    if (preset.shopType === 'restaurant' && permissionSet.has('pos')) {
        permissionSet.add('restaurant_orders')
    }

    const enabledByDb = new Map<string, boolean>()

    for (const row of shopModuleRows || []) {
        const normalized = normalizeModuleKey(row.module_key)
        if (!normalized) continue
        enabledByDb.set(normalized, row.enabled !== false)
    }

    const baseModules = new Set<ShopModule>(preset.modules)
    for (const row of shopModuleRows || []) {
        const normalized = normalizeModuleKey(row.module_key)
        if (normalized) {
            baseModules.add(normalized)
        }
    }

    const modules = Array.from(baseModules).filter((moduleKey) => {
        const dbEnabled = enabledByDb.get(moduleKey)
        if (dbEnabled === false) return false
        if (userIsOwner) return true
        return permissionSet.has(moduleKey)
    })

    if (!modules.includes('dashboard')) {
        modules.unshift('dashboard')
    }

    return Array.from(new Set(modules))
}

export function resolveNavigation(modules: ShopModule[], terminology: ShopTerminology): NavigationItem[] {
    return modules
    .filter((moduleKey) => moduleRegistry[moduleKey].path !== '/dashboard/settings')
    .map((moduleKey) => {
            const def = moduleRegistry[moduleKey]
            const navLabel =
                moduleKey === 'products'
                    ? terminology.products
                    : moduleKey === 'sales'
                        ? terminology.sales
                        : moduleKey === 'inventory'
                            ? terminology.inventory
                            : moduleKey === 'customers'
                                ? terminology.customers
                                : moduleKey === 'suppliers'
                                    ? terminology.suppliers
                                    : def.navLabel

            return {
                moduleKey,
                path: def.path,
                label: navLabel,
                icon: def.icon,
            }
        })
}

export function resolveDashboardWidgets(shopType?: string | null, moduleRows?: Array<{ module_key: string; enabled: boolean | null }> | null) {
    const preset = getShopPreset(shopType)
    const enabled = new Set(preset.dashboardWidgets)

    if (moduleRows && moduleRows.length > 0) {
        const moduleKeys = new Set(
            moduleRows
                .filter((row) => row.enabled !== false)
                .map((row) => normalizeModuleKey(row.module_key))
                .filter((value): value is ShopModule => Boolean(value))
        )

        if (!moduleKeys.has('sales') && !moduleKeys.has('products')) {
            enabled.delete('top_products')
        }
    }

    return Array.from(enabled)
}

export const moduleIconMap: Record<string, LucideIcon> = {
    LayoutDashboard,
    Package,
    Warehouse,
    ShoppingCart,
    ReceiptText,
    FileBarChart,
    Settings,
    Wallet,
    Users,
    Tags,
    Armchair,
    ClipboardList,
    Boxes,
    Pill,
    Clock3,
    FileText,
    AlertTriangle,
}
