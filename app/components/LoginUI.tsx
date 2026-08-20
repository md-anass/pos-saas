'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'

export default function LoginUI({ error, loginAction }: { error?: string, loginAction: (formData: FormData) => Promise<void> }) {
    return (
        <div className="min-h-screen bg-white dark:bg-black flex flex-col items-center justify-center p-4 relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-amber-500/10 blur-[120px] rounded-full pointer-events-none"></div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md space-y-6 rounded-2xl border border-amber-500/20 bg-white dark:bg-gray-950 p-8 shadow-2xl z-10"
            >
                <div className="text-center space-y-2">
                    <div className="inline-block w-12 h-12 bg-gradient-to-br from-amber-400 to-yellow-700 rounded-lg flex items-center justify-center text-black font-black text-xl shadow-lg shadow-amber-500/20 mb-2">K</div>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Welcome Back</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Log in to your KarobarX dashboard</p>
                </div>

                {error && (
                    <div className="rounded-md bg-red-50 dark:bg-red-900/30 p-3 text-center text-sm text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800">
                        {decodeURIComponent(error)}
                    </div>
                )}

                <form className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                        <input
                            name="email"
                            type="email"
                            required
                            className="block w-full rounded-lg border p-3 bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
                            placeholder="you@example.com"
                        />
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                            <Link href="/forgot-password" className="text-xs text-amber-600 dark:text-amber-400 hover:underline">
                                Forgot Password?
                            </Link>
                        </div>
                        <input
                            name="password"
                            type="password"
                            required
                            className="block w-full rounded-lg border p-3 bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        formAction={loginAction}
                        className="w-full rounded-lg bg-gradient-to-r from-amber-400 to-yellow-600 p-3 text-black font-bold hover:opacity-90 transition-all hover:scale-[1.02] shadow-lg shadow-amber-500/20"
                    >
                        Log In
                    </button>
                </form>

                <div className="text-center pt-4 border-t border-gray-100 dark:border-gray-800">
                    <Link href="/" className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-amber-500 transition-colors">
                        <ArrowLeft size={14} /> Back to Website
                    </Link>
                </div>
            </motion.div>
        </div>
    )
}