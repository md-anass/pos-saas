'use client'

import { createContext, useContext } from 'react'
import type { CurrentShopContext } from '@/lib/shop-context'

const ShopCapabilitiesContext = createContext<CurrentShopContext | null>(null)

export function ShopCapabilitiesProvider({
    value,
    children,
}: {
    value: CurrentShopContext
    children: React.ReactNode
}) {
    return <ShopCapabilitiesContext.Provider value={value}>{children}</ShopCapabilitiesContext.Provider>
}

export function useShopCapabilities() {
    const context = useContext(ShopCapabilitiesContext)

    if (!context) {
        throw new Error('useShopCapabilities must be used within a ShopCapabilitiesProvider')
    }

    return context
}
