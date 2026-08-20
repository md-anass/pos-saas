'use client'

import { motion } from 'framer-motion'

export default function UpdatePasswordUI({ error, updateAction }: { error?: string, updateAction: (formData: FormData) => Promise<void> }) {
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
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Set Your Password</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Enter your new password to access your dashboard</p>
                </div>

                {error && (
                    <div className="rounded-md bg-red-50 dark:bg-red-900/30 p-3 text-center text-sm text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800">
                        {decodeURIComponent(error)}
                    </div>
                )}

                <form className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Create Password</label>
                        <input
                            name="password"
                            type="password"
                            required
                            className="block w-full rounded-lg border p-3 bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
                            placeholder="••••••••"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm Password</label>
                        <input
                            name="confirmPassword"
                            type="password"
                            required
                            className="block w-full rounded-lg border p-3 bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        formAction={updateAction}
                        className="w-full rounded-lg bg-gradient-to-r from-amber-400 to-yellow-600 p-3 text-black font-bold hover:opacity-90 transition-all hover:scale-[1.02] shadow-lg shadow-amber-500/20"
                    >
                        Set Password & Login
                    </button>
                </form>
            </motion.div>
        </div>
    )
}