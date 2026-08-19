'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

export default function LoginUI({ error, loginAction }: { error?: string, loginAction: (formData: FormData) => Promise<void> }) {
    const [showPassword, setShowPassword] = useState(false)

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-blue-500/10 blur-[100px] rounded-full pointer-events-none"></div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md space-y-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 shadow-xl z-10"
            >
                <div className="text-center space-y-2">
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Welcome Back</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Log in to your dashboard</p>
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
                            autoComplete="username"
                            className="block w-full rounded-lg border p-3 bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            placeholder="you@example.com"
                        />
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                            <Link href="/forgot-password" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                                Forgot Password?
                            </Link>
                        </div>
                        <div className="relative">
                            <input
                                name="password"
                                type={showPassword ? 'text' : 'password'}
                                required
                                autoComplete="current-password"
                                className="block w-full rounded-lg border p-3 pr-10 bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <button
                        formAction={loginAction}
                        className="w-full rounded-lg bg-blue-600 p-3 text-white font-semibold hover:bg-blue-700 transition-all hover:scale-[1.02] shadow-lg shadow-blue-600/20"
                    >
                        Log In
                    </button>
                </form>

                <div className="text-center text-xs text-gray-500 dark:text-gray-400 pt-4 border-t border-gray-100 dark:border-gray-800">
                    Invited by the Admin? Please click <Link href="/forgot-password" className="text-blue-600 dark:text-blue-400 font-medium hover:underline">"Forgot Password"</Link> to set your password for the first time.
                </div>
            </motion.div>
        </div>
    )
}