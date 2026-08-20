import { createShop } from './actions'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import KarobarXLogo from '../components/KarobarXLogo'

export default async function OnboardingPage({
    searchParams,
}: {
    searchParams: Promise<{ error?: string }>
}) {
    const params = await searchParams

    return (
        <div className="min-h-screen bg-white dark:bg-black flex flex-col items-center justify-center p-4 relative overflow-hidden transition-colors duration-300">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-amber-500/10 blur-[120px] rounded-full pointer-events-none"></div>

            <div className="w-full max-w-2xl space-y-6 rounded-2xl border border-amber-500/20 bg-white dark:bg-gray-950 p-8 md:p-10 shadow-2xl z-10">
                <div className="text-center space-y-4">
                    <div className="flex justify-center">
                        <KarobarXLogo />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Setup your Shop</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Enter your business details to activate your dashboard</p>
                </div>

                {params.error && (
                    <div className="rounded-md bg-red-50 dark:bg-red-900/30 p-3 text-center text-sm text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800">
                        {decodeURIComponent(params.error)}
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Business Type</label>
                            <select
                                name="business_type"
                                required
                                className="block w-full rounded-lg border p-3 bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
                            >
                                <option value="retail">Retail</option>
                                <option value="grocery">Grocery</option>
                                <option value="hardware">Hardware/Iron</option>
                                <option value="food">Food/Restaurant</option>
                                <option value="clothing">Clothing</option>
                                <option value="electronics">Electronics</option>
                                <option value="pharmacy">Pharmacy</option>
                                <option value="other">Other</option>
                            </select>
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
                    </div>

                    <button
                        type="submit"
                        className="w-full rounded-lg bg-gradient-to-r from-amber-400 to-yellow-600 p-3.5 text-black font-bold hover:opacity-90 transition-all hover:scale-[1.01] shadow-lg shadow-amber-500/20 text-lg"
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