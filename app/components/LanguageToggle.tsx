'use client'

import { useEffect, useState } from 'react'
import { Languages } from 'lucide-react'

export default function LanguageToggle() {
    const [lang, setLang] = useState('en')

    useEffect(() => {
        // Read from cookie instead of localStorage
        const match = document.cookie.match(/(?:^|; )lang=([^;]*)/)
        const savedLang = match ? decodeURIComponent(match[1]) : 'en'
        setLang(savedLang)
        document.documentElement.dir = savedLang === 'ur' ? 'rtl' : 'ltr'
        document.documentElement.lang = savedLang
    }, [])

    const toggleLanguage = () => {
        const newLang = lang === 'en' ? 'ur' : 'en'
        setLang(newLang)

        // Save to cookie so Server Components can read it
        document.cookie = `lang=${newLang}; path=/; max-age=31536000`
        document.documentElement.dir = newLang === 'ur' ? 'rtl' : 'ltr'

        // Reload to apply changes on the server
        window.location.reload()
    }

    return (
        <button
            onClick={toggleLanguage}
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 hover:scale-105"
        >
            <Languages size={18} />
            {lang === 'en' ? 'اردو' : 'English'}
        </button>
    )
}