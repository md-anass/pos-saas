import { createShop } from './actions'

export default async function OnboardingPage({
    searchParams,
}: {
    searchParams: Promise<{ error?: string }>
}) {
    const params = await searchParams

    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-24">
            <div className="w-full max-w-md space-y-8 rounded-lg border p-8 shadow-lg">
                <h2 className="text-center text-2xl font-bold">Setup your Shop</h2>

                {params.error && (
                    <div className="rounded bg-red-100 p-3 text-center text-sm text-red-600">
                        {decodeURIComponent(params.error)}
                    </div>
                )}

                <form className="space-y-6" action={createShop}>
                    <div>
                        <label className="block text-sm font-medium">Shop Name</label>
                        <input
                            name="name"
                            type="text"
                            required
                            className="mt-1 block w-full rounded border p-2"
                            placeholder="e.g. Iron World"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium">Business Type</label>
                        <select
                            name="business_type"
                            required
                            className="mt-1 block w-full rounded border p-2"
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
                        <label className="block text-sm font-medium">Currency</label>
                        <input
                            name="currency"
                            type="text"
                            required
                            defaultValue="PKR"
                            className="mt-1 block w-full rounded border p-2"
                            placeholder="e.g. PKR, USD, EUR"
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full rounded bg-blue-600 p-2 text-white hover:bg-blue-700"
                    >
                        Create Shop
                    </button>
                </form>
            </div>
        </div>
    )
}