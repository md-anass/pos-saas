'use client'

import { motion } from 'framer-motion'
import { Tags, Trash2 } from 'lucide-react'

const gradients = [
    'from-blue-500 to-cyan-400',
    'from-purple-500 to-pink-400',
    'from-green-500 to-emerald-400',
    'from-orange-500 to-red-400',
    'from-indigo-500 to-blue-400',
    'from-rose-500 to-pink-400',
    'from-amber-500 to-orange-400'
]

export default function CategoryGrid({ categories, deleteAction, translations }: {
    categories: any[],
    deleteAction: (formData: FormData) => Promise<void>,
    translations: any
}) {
    if (categories.length === 0) {
        return (
            <div className="text-center py-16 bg-gray-50 dark:bg-gray-900 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                <Tags className="mx-auto text-gray-400 mb-4" size={40} />
                <p className="text-gray-500 dark:text-gray-400">{translations.no_categories}</p>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {categories.map((cat, i) => (
                <motion.div
                    key={cat.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                    whileHover={{ y: -5 }}
                    className="group relative bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-xl hover:border-blue-500 transition-all duration-300"
                >
                    {/* Gradient Icon */}
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradients[i % gradients.length]} flex items-center justify-center mb-4 shadow-md group-hover:scale-110 transition-transform`}>
                        <Tags className="text-white" size={24} />
                    </div>

                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">{cat.name}</h3>

                    {/* Delete Button (Appears on Hover) */}
                    <form action={deleteAction} className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <input type="hidden" name="category_id" value={cat.id} />
                        <button
                            type="submit"
                            className="p-2 rounded-full bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                            title="Delete Category"
                        >
                            <Trash2 size={16} />
                        </button>
                    </form>
                </motion.div>
            ))}
        </div>
    )
}