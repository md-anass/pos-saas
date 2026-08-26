'use client'

import { useSyncExternalStore } from 'react'
import { useTheme } from './ThemeProvider'
import { Sun, Moon } from 'lucide-react'

export default function ThemeToggle() {
    const mounted = useSyncExternalStore(() => () => {}, () => true, () => false)
    const { resolvedTheme, setTheme } = useTheme()

    if (!mounted) return null

    return (
        <button
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-md text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors duration-200"
            aria-label="Toggle theme"
        >
            {resolvedTheme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
    )
}