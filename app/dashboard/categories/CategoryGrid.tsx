'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Tags, Trash2 } from 'lucide-react'

type Category = { id: string; name: string }
type CategoryTranslations = { no_categories: string }
const gradients = ['from-blue-500 to-cyan-400','from-purple-500 to-pink-400','from-green-500 to-emerald-400','from-orange-500 to-red-400','from-indigo-500 to-blue-400','from-rose-500 to-pink-400','from-amber-500 to-orange-400']

export default function CategoryGrid({ categories, deleteAction, translations }: {
    categories: Category[]
    deleteAction: (formData: FormData) => Promise<void>
    translations: CategoryTranslations
}) {
    if (!categories.length) return <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 py-16 text-center dark:border-gray-700 dark:bg-gray-900"><Tags className="mx-auto mb-4 text-gray-400" size={40} /><p className="text-gray-500 dark:text-gray-400">{translations.no_categories}</p></div>

    return <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {categories.map((category, index) => <motion.article key={category.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: index * 0.05 }} whileHover={{ y: -5 }} className="group relative rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:border-blue-500 hover:shadow-xl dark:border-gray-800 dark:bg-gray-900">
            <Link href={`/dashboard/categories/${category.id}`} className="block rounded-2xl p-6 pr-16 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" aria-label={`View items in ${category.name}`}>
                <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${gradients[index % gradients.length]} shadow-md transition-transform group-hover:scale-110`}><Tags className="text-white" size={24} /></div>
                <h2 className="break-words text-lg font-semibold text-gray-900 dark:text-white">{category.name}</h2>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-blue-600">View items <ArrowRight size={14} /></span>
            </Link>
            <form action={deleteAction} className="absolute right-4 top-4 z-10">
                <input type="hidden" name="category_id" value={category.id} />
                <button type="submit" className="rounded-full bg-red-50 p-2 text-red-600 transition-colors hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50" title="Delete category" aria-label={`Delete ${category.name}`}><Trash2 size={16} /></button>
            </form>
        </motion.article>)}
    </div>
}
