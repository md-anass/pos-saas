'use client'

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

type Theme = 'light' | 'dark'
type ThemeContextValue = { resolvedTheme: Theme, setTheme: (theme: Theme) => void }

const ThemeContext = createContext<ThemeContextValue | null>(null)

function applyTheme(theme: Theme) {
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
    root.style.colorScheme = theme
}

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [resolvedTheme, setResolvedTheme] = useState<Theme>(() => {
        if (typeof window === 'undefined') return 'light'
        return window.localStorage.getItem('theme') === 'dark' ? 'dark' : 'light'
    })

    useEffect(() => applyTheme(resolvedTheme), [resolvedTheme])

    const setTheme = useCallback((theme: Theme) => {
        setResolvedTheme(theme)
        window.localStorage.setItem('theme', theme)
        applyTheme(theme)
    }, [])

    return <ThemeContext.Provider value={{ resolvedTheme, setTheme }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
    const context = useContext(ThemeContext)
    if (!context) throw new Error('useTheme must be used inside ThemeProvider')
    return context
}