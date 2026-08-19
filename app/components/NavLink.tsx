'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { LayoutDashboard, Package, Warehouse, ShoppingCart, ReceiptText, FileBarChart, Settings, Wallet, Users, Tags, LucideIcon } from 'lucide-react'

// Map string names to actual icon components
const iconMap: Record<string, LucideIcon> = {
    LayoutDashboard, Package, Warehouse, ShoppingCart, ReceiptText, FileBarChart, Settings, Wallet, Users, Tags
}

export default function NavLink({ href, label, icon: iconName, highlight }: { href: string, label: string, icon: string, highlight?: boolean }) {
    const pathname = usePathname()
    const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
    const Icon = iconMap[iconName] || LayoutDashboard

    if (highlight) {
        return (
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="relative flex items-center justify-center">
                {/* Breathing Pulse Glow Effect */}
                <motion.span
                    className="absolute inline-flex h-full w-full rounded-xl bg-blue-500 opacity-75"
                    animate={{ scale: [1, 1.15], opacity: [0.5, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                />

                {/* The Actual Button */}
                <Link
                    href={href}
                    className={`relative flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm tracking-wide transition-colors duration-300 shadow-lg
            ${isActive
                            ? 'bg-blue-700 text-white shadow-blue-600/40'
                            : 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-blue-500/30 hover:shadow-blue-500/50'
                        }`}
                >
                    <Icon size={22} className="scale-110" />
                    {label}
                </Link>
            </motion.div>
        )
    }

    // Normal Nav Links
    return (
        <motion.div whileHover={{ y: -2 }} className="relative z-10">
            <Link
                href={href}
                className={`group flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs lg:text-sm font-medium transition-all duration-200 relative z-10
          ${isActive
                        ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                    }`}
            >
                <motion.div whileHover={{ scale: 1.2, rotate: label === 'Products' ? 5 : 0 }} transition={{ type: 'spring', stiffness: 300 }}>
                    <Icon size={16} />
                </motion.div>
                {label}
            </Link>
        </motion.div>
    )
}