import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { logout } from '../actions'
import { updateShopProfile, addAccount, addLocation, addStaff, deleteStaff } from './actions'
import { LogOut, Store, User, Wallet, Warehouse, UserPlus, Phone, Mail, CreditCard } from 'lucide-react'
import LogoUploader from './LogoUploader'
import AddAccountForm from './AddAccountForm'
import AddStaffForm from './AddStaffForm'
import { dictionaries } from '@/lib/dictionary'
import { getCurrentShopContext } from '@/lib/shop-context'

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const params = await searchParams
    const t = dictionaries.en
    const context = await getCurrentShopContext()

    // 1. Try fetching as Owner
    const { data: ownerShop } = await supabase.from('shops').select('*').eq('owner_id', user.id).single()
    let shop = ownerShop
    let userRole = 'owner'

    // 2. If not Owner, try fetching as Staff
    if (!shop) {
        const { data: member } = await supabase
            .from('shop_members')
            .select('shop_id, role')
            .eq('user_id', user.id)
            .single()

        if (member) {
            userRole = member.role
            const { data: staffShop } = await supabase
                .from('shops')
                .select('*')
                .eq('id', member.shop_id)
                .single()

            if (staffShop) shop = staffShop
        }
    }

    if (!shop) redirect('/onboarding')

    const shopType = context.shopType
    const shopTypeLabels: Record<string, string> = {
        retail: 'Retail', grocery: 'Grocery / Supermarket', restaurant: 'Restaurant / Cafe', pharmacy: 'Pharmacy',
    }
    const shopTypeLabel = shopTypeLabels[shopType] || 'Retail'
    const enabledModuleRows = context.capabilities.modules.map(moduleKey => ({
        module_key: moduleKey,
        enabled: true,
    }))
    const enabledKeys = new Set([...context.capabilities.modules, 'settings'])
    const permissionLabels: Record<string, string> = {
        pos: shopType === 'restaurant' ? 'POS / Payments' : 'POS / Sales',
        sales: 'Sales', products: shopType === 'pharmacy' ? 'Medicines' : 'Products', categories: 'Categories',
        inventory: 'Inventory', medicine_batches: shopType === 'pharmacy' ? 'Batches & Expiry' : 'Batches',
        medicine_expiry: 'Expiry Alerts', prescriptions: 'Prescriptions', purchases: 'Purchases & Suppliers',
        suppliers: 'Suppliers', customers: shopType === 'restaurant' ? 'Guests / Customers' : 'Customers',
        contacts: 'Contacts', expenses: 'Expenses', reports: 'Reports', menu: 'Menu',
        restaurant_tables: 'Tables', restaurant_orders: 'Orders', settings: 'Settings',
    }
    const staffPermissionModules = Object.entries(permissionLabels)
        .filter(([id]) => enabledKeys.has(id))
        .map(([id, label]) => ({ id, label }))
    // Fetch Accounts & Locations
    const { data: accounts } = await supabase.from('accounts').select('*').eq('shop_id', shop.id).order('created_at', { ascending: true })
    const { data: locations } = await supabase.from('locations').select('*').eq('shop_id', shop.id).order('created_at', { ascending: true })

    // Fetch Staff Members (excluding the owner)
    const { data: staffMembers } = await supabase
        .from('shop_members')
        .select('id, user_id, role, permissions')
        .eq('shop_id', shop.id)
        .neq('role', 'owner')

    // Fetch Profiles for those staff members separately to avoid Supabase join errors
    const staffUserIds = staffMembers?.map(s => s.user_id) || []
    const { data: staffProfiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', staffUserIds)

    // Merge the two lists together
    const staff = staffMembers?.map(sm => ({
        ...sm,
        full_name: staffProfiles?.find(p => p.id === sm.user_id)?.full_name || 'Unknown'
    })) || []

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t.settings.title}</h1>

            {params.error && (
                <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded">
                    {decodeURIComponent(params.error)}
                </div>
            )}

            {/* Shop Profile Section */}
            <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 transition-colors">
                <div className="flex items-center gap-3 mb-6">
                    <Store className="text-gray-500 dark:text-gray-400" size={20} />
                    <h2 className="text-lg font-medium text-gray-900 dark:text-white">{t.settings.shop_profile}</h2>
                </div>

                <form action={updateShopProfile} className="space-y-4">
                    <LogoUploader currentLogo={shop?.logo_url} shopId={shop?.id} />

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t.settings.business_name}</label>
                        <input name="name" type="text" required defaultValue={shop?.name || ''} className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 p-2 shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Shop Phone (For Invoices)</label>
                            <div className="mt-1 relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input name="phone" type="text" defaultValue={shop?.phone || ''} className="block w-full pl-9 rounded-md border border-gray-300 dark:border-gray-700 p-2 shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500" placeholder="+92 300 1234567" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Shop Email (For Invoices)</label>
                            <div className="mt-1 relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input name="email" type="email" defaultValue={shop?.email || ''} className="block w-full pl-9 rounded-md border border-gray-300 dark:border-gray-700 p-2 shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500" placeholder="shop@example.com" />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t.settings.subtitle}</label>
                        <input name="subtitle" type="text" defaultValue={shop?.subtitle || ''} className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 p-2 shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t.settings.address}</label>
                        <textarea name="address" rows={2} defaultValue={shop?.address || ''} className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 p-2 shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t.settings.invoice_note}</label>
                        <input name="invoice_note" type="text" defaultValue={shop?.invoice_note || ''} className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 p-2 shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Business Type</label>
                            <input
                                type="text"
                                readOnly
                                value={shopTypeLabel}
                                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 p-2 shadow-sm bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Enabled Modules</label>
                            <div className="mt-1 flex flex-wrap gap-2 rounded-md border border-gray-300 dark:border-gray-700 p-2 min-h-[42px] bg-white dark:bg-gray-900">
                                {(enabledModuleRows || []).map((module) => (
                                    <span key={module.module_key} className="inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-900/30 px-3 py-1 text-xs font-medium text-blue-700 dark:text-blue-300">
                                        {module.module_key.replaceAll('_', ' ')}
                                    </span>
                                ))}
                                {(!enabledModuleRows || enabledModuleRows.length === 0) && (
                                    <span className="text-sm text-gray-500 dark:text-gray-400">No custom modules configured yet.</span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors">{t.settings.save_profile}</button>
                    </div>
                </form>
            </div>

            {/* Staff Management Section */}
            <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 transition-colors">
                <div className="flex items-center gap-3 mb-6">
                    <UserPlus className="text-gray-500 dark:text-gray-400" size={20} />
                    <h2 className="text-lg font-medium text-gray-900 dark:text-white">Staff & Permissions</h2>
                </div>

                <div className="space-y-3 mb-6">
                    {staff && staff.length > 0 ? (
                        staff.map((s) => (
                            <div key={s.id} className="flex justify-between items-center border-b border-gray-200 dark:border-gray-800 pb-2">
                                <div>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                        {s.full_name} <span className="text-xs text-gray-400 capitalize">({s.role})</span>
                                    </p>
                                    <div className="flex gap-1 mt-1">
                                        {s.permissions?.map((p: string) => (
                                            <span key={p} className="text-[10px] bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded">{permissionLabels[p] || p.replaceAll('_', ' ')}</span>
                                        ))}
                                    </div>
                                </div>
                                <form action={deleteStaff}>
                                    <input type="hidden" name="staff_id" value={s.id} />
                                    <input type="hidden" name="user_id" value={s.user_id} />
                                    <button type="submit" className="text-xs text-red-600 dark:text-red-400 hover:underline border border-red-200 dark:border-red-800 px-2 py-1 rounded-md">Remove</button>
                                </form>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400">No staff members added yet.</p>
                    )}
                </div>

                <AddStaffForm action={addStaff} modules={staffPermissionModules} />
            </div>

            {/* Accounts Section */}
            <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 transition-colors">
                <div className="flex items-center gap-3 mb-6">
                    <Wallet className="text-gray-500 dark:text-gray-400" size={20} />
                    <h2 className="text-lg font-medium text-gray-900 dark:text-white">{t.settings.accounts_title}</h2>
                </div>

                <div className="space-y-4 mb-6">
                    {accounts && accounts.length > 0 ? (
                        accounts.map((acc) => (
                            <div key={acc.id} className="flex justify-between items-center border-b border-gray-200 dark:border-gray-800 pb-2">
                                <div className="flex items-center gap-3">
                                    <CreditCard size={18} className="text-gray-400" />
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-white">{acc.name}</p>
                                        {acc.provider_name && <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{acc.provider_name} {acc.account_number && `| ${acc.account_number}`}</p>}
                                    </div>
                                </div>
                                <span className="text-xs text-gray-500 dark:text-gray-400 capitalize bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{acc.type}</span>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t.settings.no_accounts}</p>
                    )}
                </div>

                <AddAccountForm action={addAccount} />
            </div>

            {/* Locations / Warehouses Section */}
            <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 transition-colors">
                <div className="flex items-center gap-3 mb-6">
                    <Warehouse className="text-gray-500 dark:text-gray-400" size={20} />
                    <h2 className="text-lg font-medium text-gray-900 dark:text-white">{t.locations.title}</h2>
                </div>

                <div className="space-y-4">
                    {locations && locations.length > 0 ? (
                        locations.map((loc) => (
                            <div key={loc.id} className="flex justify-between items-center border-b border-gray-200 dark:border-gray-800 pb-2">
                                <div>
                                    <p className="font-medium text-gray-900 dark:text-white">{loc.name}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{loc.type}</p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t.locations.no_locations}</p>
                    )}
                </div>

                <form action={addLocation} className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-800 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t.locations.name}</label>
                        <input name="name" type="text" required className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 p-2 shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500" placeholder="e.g. Main Warehouse" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t.locations.type}</label>
                        <select name="type" required className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 p-2 shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500">
                            <option value="shop" className="bg-white dark:bg-gray-800">{t.locations.shop}</option>
                            <option value="warehouse" className="bg-white dark:bg-gray-800">{t.locations.warehouse}</option>
                            <option value="other" className="bg-white dark:bg-gray-800">{t.locations.other}</option>
                        </select>
                    </div>
                    <div className="md:col-span-3 flex justify-end">
                        <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors">{t.locations.add_new}</button>
                    </div>
                </form>
            </div>

            {/* Account Section */}
            <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 transition-colors">
                <div className="flex items-center gap-3 mb-4">
                    <User className="text-gray-500 dark:text-gray-400" size={20} />
                    <h2 className="text-lg font-medium text-gray-900 dark:text-white">{t.settings.account_section}</h2>
                </div>
                <div className="flex justify-between items-center">
                    <div>
                        <p className="font-medium text-gray-900 dark:text-white text-sm">{user.email}</p>
                        <p className="text-gray-500 dark:text-gray-400 text-xs capitalize">{userRole}</p>
                    </div>
                    <form action={logout}>
                        <button type="submit" className="flex items-center gap-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105">
                            <LogOut size={16} />
                            {t.common.logout}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}
