'use client'

import { useEffect, useRef } from 'react'

export default function AutoPrintReceipt({ enabled }: { enabled: boolean }) {
    const printed = useRef(false)

    useEffect(() => {
        if (!enabled || printed.current) return

        const frame = window.requestAnimationFrame(() => {
            if (printed.current) return
            printed.current = true
            window.print()
        })

        return () => window.cancelAnimationFrame(frame)
    }, [enabled])

    return null
}