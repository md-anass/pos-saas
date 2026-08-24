import { createShop } from './actions'
import Link from 'next/link'
import { ArrowLeft, ShoppingBasket, Store, UtensilsCrossed, Pill } from 'lucide-react'
import KarobarXLogo from '../components/KarobarXLogo'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

const businessTypes = [
    {
        value: 'retail',
        title: 'Retail',
        description: 'POS, products, inventory, suppliers and sales management.',
        icon: Store,
    },
    {
        value: 'restaurant',
        title: 'Restaurant / Cafe',
        description: 'Tables, menu, kitchen workflow, orders and inventory.',
        icon: UtensilsCrossed,
    },
    {
        value: 'pharmacy',
        title: 'Pharmacy',
        description: 'Medicines, batches, expiry tracking, prescriptions and sales.',
        icon: Pill,
    },
    {
        value: 'grocery',
        title: 'Grocery / Supermarket',
        description: 'Fast checkout, inventory, categories, expiry tracking, suppliers and stock management.',
        icon: ShoppingBasket,
    },
] as const

export default async function OnboardingPage({
    searchParams,
}: {
    searchParams: Promise<{ error?: string }>
}) {
    const params = await searchParams
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    let databaseError: string | null = null
    const { data: existingShop, error: existingShopError } = await supabase
        .from('shops')
        .select('id, name, shop_type')
        .eq('owner_id', user.id)
        .limit(1)
        .maybeSingle()

    if (existingShopError) {
        databaseError = existingShopError.message
    } else if (existingShop && existingShop.name !== 'Pending Setup') {
        redirect('/dashboard')
    } else if (!existingShop) {
        const { data: membership, error: membershipError } = await supabase
            .from('shop_members')
            .select('shop_id')
            .eq('user_id', user.id)
            .limit(1)
            .maybeSingle()

        if (membershipError) {
            databaseError = membershipError.message
        } else if (membership) {
            redirect('/dashboard')
        }
    }

    const errorMessage = params.error
        ? decodeURIComponent(params.error)
        : databaseError

    return (
        <div className="min-h-screen bg-white dark:bg-black flex flex-col items-center justify-center p-4 relative overflow-hidden transition-colors duration-300">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-amber-500/10 blur-[120px] rounded-full pointer-events-none"></div>

            <div className="w-full max-w-2xl space-y-6 rounded-2xl border border-amber-500/20 bg-white dark:bg-gray-950 p-8 md:p-10 shadow-2xl z-10">
                <div className="text-center space-y-4">
                    <div className="flex justify-center">
                        <KarobarXLogo />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Setup your Shop</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Choose the business type so KarobarX can tailor the dashboard and features.</p>
                </div>

                {errorMessage && (
                    <div className="rounded-md bg-red-50 dark:bg-red-900/30 p-3 text-center text-sm text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800">
                        {errorMessage}
                    </div>
                )}

                <form action={createShop} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Shop Name</label>
                        <input
                            name="name"
                            type="text"
                            required
                            className="block w-full rounded-lg border p-3 bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
                            placeholder="e.g. Iron World"
                        />
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">What type of business do you operate?</label>
                            <span className="text-xs uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">Required</span>
                        </div>
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                            {businessTypes.map((type, index) => {
                                const Icon = type.icon
                                return (
                                    <label
                                        key={type.value}
                                        className="group relative cursor-pointer rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-amber-300 dark:hover:border-amber-500/50 hover:shadow-md"
                                    >
                                        <input
                                            type="radio"
                                            name="shop_type"
                                            value={type.value}
                                            defaultChecked={index === 0}
                                            className="sr-only peer"
                                            required
                                        />
                                        <div className="flex items-start gap-3">
                                            <div className="rounded-xl bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400">
                                                <Icon size={20} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-semibold text-gray-900 dark:text-white">{type.title}</p>
                                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{type.description}</p>
                                            </div>
                                        </div>
                                        <div className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-transparent transition-all peer-checked:ring-amber-500 peer-checked:bg-amber-50/50 dark:peer-checked:bg-amber-500/10"></div>
                                    </label>
                                )
                            })}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Currency</label>
                        <select
                            name="currency"
                            required
                            className="block w-full rounded-lg border p-3 bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
                        >
                            <option value="PKR">Pakistani Rupee (PKR)</option>
                            <option value="USD">US Dollar (USD)</option>
                            <option value="EUR">Euro (EUR)</option>
                            <option value="GBP">British Pound (GBP)</option>
                            <option value="AED">UAE Dirham (AED)</option>
                            <option value="SAR">Saudi Riyal (SAR)</option>
                            <option value="INR">Indian Rupee (INR)</option>
                            <option value="CAD">Canadian Dollar (CAD)</option>
                            <option value="AUD">Australian Dollar (AUD)</option>
                        </select>
                    </div>

                    <button
                        type="submit"
                        disabled={Boolean(databaseError)}
                        className="w-full rounded-lg bg-gradient-to-r from-amber-400 to-yellow-600 p-3.5 text-black font-bold hover:opacity-90 transition-all hover:scale-[1.01] shadow-lg shadow-amber-500/20 text-lg disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                    >
                        Create Shop & Go to Dashboard
                    </button>
                </form>

                <div className="text-center pt-4 border-t border-gray-100 dark:border-gray-800">
                    <Link href="/" className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-amber-500 transition-colors">
                        <ArrowLeft size={14} /> Back to Website
                    </Link>
                </div>
            </div>
        </div>
    )
}
