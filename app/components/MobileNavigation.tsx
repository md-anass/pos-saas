'use client'

import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import NavLink from './NavLink'

type MobileLink = { href: string; label: string; icon: string; highlight?: boolean }

export default function MobileNavigation({ links }: { links: MobileLink[] }) {
    const [open, setOpen] = useState(false)
    const pathname = usePathname()

    return <div className="md:hidden">
        <button type="button" onClick={() => setOpen(value => !value)} aria-expanded={open} aria-controls="mobile-dashboard-navigation" className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-300" title="Open navigation">
            {open ? <X size={20} /> : <Menu size={20} />}
        </button>
        {open && <div className="fixed inset-x-0 top-16 z-50 border-b border-gray-200 bg-white/98 p-3 shadow-xl backdrop-blur-xl dark:border-gray-800 dark:bg-gray-900/98" id="mobile-dashboard-navigation">
            <p className="mb-2 px-1 text-xs font-bold uppercase tracking-[0.18em] text-gray-400">Shop navigation</p>
            <nav className="grid max-h-[calc(100vh-7rem)] grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
                {links.map((link, index) => <div key={`${link.href}-${link.label}-${index}`} onClick={() => setOpen(false)} className={'[&>div]:w-full [&_a]:w-full ' + (pathname === link.href ? 'rounded-xl bg-blue-50 dark:bg-blue-950/30' : '')}><NavLink {...link} showLabel /></div>)}
            </nav>
        </div>}
    </div>
}