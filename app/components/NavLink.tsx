'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import {
    LayoutDashboard,
    Package,
    Warehouse,
    ShoppingCart,
    ReceiptText,
    FileBarChart,
    Settings,
    Wallet,
    Users,
    Tags,
    ChefHat,
    Armchair,
    ClipboardList,
    Pill,
    Boxes,
    Clock3,
    FileText,
    type LucideIcon,
} from 'lucide-react'

const iconMap: Record<string, LucideIcon> = {
    LayoutDashboard,
    Package,
    Warehouse,
    ShoppingCart,
    ReceiptText,
    FileBarChart,
    Settings,
    Wallet,
    Users,
    Tags,
    ChefHat,
    Armchair,
    ClipboardList,
    Pill,
    Boxes,
    Clock3,
    FileText,
}

export default function NavLink({
    href,
    label,
    icon,
    highlight,
}: {
    href: string
    label: string
    icon: string
    highlight?: boolean
}) {
    const pathname = usePathname()

    const isActive =
        pathname === href ||
        (href !== '/dashboard' && pathname.startsWith(href))

    const Icon = iconMap[icon] || LayoutDashboard

    if (highlight) {
        return (
            <motion.div
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="relative flex items-center justify-center flex-shrink-0"
            >
                <motion.span
                    className="absolute inline-flex h-full w-full rounded-xl bg-blue-500 opacity-75"
                    animate={{
                        scale: [1, 1.12],
                        opacity: [0.4, 0],
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeOut',
                    }}
                />

                <Link
                    href={href}
                    title={label}
                    className={`
                        relative
                        flex items-center justify-center gap-2
                        px-3 2xl:px-5
                        py-2.5
                        rounded-xl
                        font-bold
                        text-sm
                        whitespace-nowrap
                        transition-all duration-300
                        shadow-lg
                        ${isActive
                            ? 'bg-blue-700 text-white shadow-blue-600/40'
                            : 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-blue-500/30 hover:shadow-blue-500/50'
                        }
                    `}
                >
                    <Icon size={21} className="flex-shrink-0" />

                    <span className="hidden xl:inline">
                        {label}
                    </span>
                </Link>
            </motion.div>
        )
    }

    return (
        <motion.div
            whileHover={{ y: -2 }}
            className="relative z-10 flex-shrink-0"
        >
            <Link
                href={href}
                title={label}
                className={`
                    group
                    flex items-center justify-center gap-1.5
                    px-2 2xl:px-3
                    py-2
                    rounded-lg
                    text-sm
                    font-medium
                    whitespace-nowrap
                    transition-all duration-200
                    relative z-10
                    ${isActive
                        ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                    }
                `}
            >
                <motion.div
                    whileHover={{
                        scale: 1.15,
                        rotate: label === 'Products' ? 5 : 0,
                    }}
                    transition={{
                        type: 'spring',
                        stiffness: 300,
                    }}
                    className="flex-shrink-0"
                >
                    <Icon size={17} />
                </motion.div>

                <span className="hidden xl:inline">
                    {label}
                </span>
            </Link>
        </motion.div>
    )
}