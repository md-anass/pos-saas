export default function RegisterPage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-24 text-center">
            <div className="max-w-md space-y-4 bg-white dark:bg-gray-900 p-8 rounded-lg border border-gray-200 dark:border-gray-800">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Access Restricted</h2>
                <p className="text-gray-500 dark:text-gray-400">
                    Public registration is disabled. Please contact the platform administrator to purchase a subscription and get your account created.
                </p>
                <a href="/login" className="inline-block mt-4 text-blue-600 dark:text-blue-400 hover:underline">
                    ← Back to Login
                </a>
            </div>
        </div>
    )
}