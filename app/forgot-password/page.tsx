import { requestPasswordReset } from './actions'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import KarobarXLogo from '../components/KarobarXLogo'

export default async function ForgotPasswordPage({
    searchParams,
}: {
    searchParams: Promise<{ error?: string; success?: string }>
}) {
    const params = await searchParams

    return (
        <div className="min-h-screen bg-white dark:bg-black flex flex-col items-center justify-center p-4 relative overflow-hidden transition-colors duration-300">
            {/* Background Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-amber-500/10 blur-[120px] rounded-full pointer-events-none"></div>

            <div className="w-full max-w-md space-y-6 rounded-2xl border border-amber-500/20 bg-white dark:bg-gray-950 p-8 shadow-2xl z-10">
                <div className="text-center space-y-4">
                    <div className="flex justify-center">
                        <KarobarXLogo />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Reset Password</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Enter your email to receive a reset link</p>
                </div>

                {params.error && (
                    <div className="rounded-md bg-red-50 dark:bg-red-900/30 p-3 text-center text-sm text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800">
                        {decodeURIComponent(params.error)}
                    </div>
                )}

                {params.success ? (
                    <div className="text-center space-y-4">
                        <div className="rounded-md bg-green-50 dark:bg-green-900/30 p-4 text-center text-sm text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800">
                            Password reset link sent! Please check your email inbox.
                        </div>
                        <Link href="/login" className="inline-block text-amber-600 dark:text-amber-400 font-medium hover:underline">
                            ← Back to Login
                        </Link>
                    </div>
                ) : (
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
                        <button
                            formAction={requestPasswordReset}
                            className="w-full rounded-lg bg-gradient-to-r from-amber-400 to-yellow-600 p-3 text-black font-bold hover:opacity-90 transition-all hover:scale-[1.02] shadow-lg shadow-amber-500/20"
                        >
                            Send Reset Link
                        </button>
                    </form>
                )}
            </div>
        </div>
    )
}