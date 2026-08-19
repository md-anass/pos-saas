import { requestPasswordReset } from './actions'

export default async function ForgotPasswordPage({
    searchParams,
}: {
    searchParams: Promise<{ error?: string; success?: string }>
}) {
    const params = await searchParams

    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-24">
            <div className="w-full max-w-md space-y-8 rounded-lg border p-8 shadow-lg bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                <h2 className="text-center text-2xl font-bold text-gray-900 dark:text-white">Reset Password</h2>

                {params.error && (
                    <div className="rounded bg-red-100 dark:bg-red-900/30 p-3 text-center text-sm text-red-600 dark:text-red-400">
                        {decodeURIComponent(params.error)}
                    </div>
                )}

                {params.success ? (
                    <div className="text-center space-y-4">
                        <div className="rounded bg-green-100 dark:bg-green-900/30 p-4 text-center text-sm text-green-600 dark:text-green-400">
                            Password reset link sent! Please check your email inbox.
                        </div>
                        <a href="/login" className="inline-block text-blue-600 dark:text-blue-400 hover:underline">
                            ← Back to Login
                        </a>
                    </div>
                ) : (
                    <form className="space-y-6">
                        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                            Enter your email address and we will send you a link to reset your password.
                        </p>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                            <input
                                name="email"
                                type="email"
                                required
                                className="mt-1 block w-full rounded-md border p-2 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
                                placeholder="you@example.com"
                            />
                        </div>
                        <button
                            formAction={requestPasswordReset}
                            className="w-full rounded bg-blue-600 p-2 text-white hover:bg-blue-700 transition-colors"
                        >
                            Send Reset Link
                        </button>
                    </form>
                )}
            </div>
        </div>
    )
}