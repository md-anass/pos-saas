import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { dictionaries } from '@/lib/dictionary'
import { addCategory, deleteCategory } from './actions'
import CategoryGrid from './CategoryGrid'
import { Plus } from 'lucide-react'

export default async function CategoriesPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
    const supabase = await createClient()
    const params = await searchParams
    const cookieStore = await cookies()
    const lang = cookieStore.get('lang')?.value || 'en'
    const t = dictionaries[lang]

    const { data: categories } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true })

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t.categories.title}</h1>
            </div>

            {params.error && (
                <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
                    {decodeURIComponent(params.error)}
                </div>
            )}

            {/* Premium Inline Add Form */}
            <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">{t.categories.add_new}</h2>
                <form action={addCategory} className="flex gap-3">
                    <input
                        name="name"
                        type="text"
                        required
                        className="flex-1 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        placeholder="e.g. Iron Sheets, Pipes, Groceries..."
                    />
                    <button
                        type="submit"
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-all hover:scale-[1.02] shadow-md shadow-blue-600/20"
                    >
                        <Plus size={20} /> {t.categories.save_category}
                    </button>
                </form>
            </div>

            {/* Animated Category Grid */}
            <CategoryGrid
                categories={categories || []}
                deleteAction={deleteCategory}
                translations={t.categories}
            />
        </div>
    )
}