'use client'

import { useEffect, useRef } from 'react'

export default function AutoPrintReceipt({ enabled, returnTo }: { enabled: boolean; returnTo: string }) {
    const printed = useRef(false)
    const returned = useRef(false)

    useEffect(() => {
        if (!enabled || printed.current) return

        const handleAfterPrint = () => {
            if (returned.current) return
            returned.current = true
            window.location.assign(returnTo)
        }
        window.addEventListener('afterprint', handleAfterPrint)

        const frame = window.requestAnimationFrame(() => {
            if (printed.current) return
            printed.current = true
            window.print()
        })

        return () => {
            window.cancelAnimationFrame(frame)
            window.removeEventListener('afterprint', handleAfterPrint)
        }
    }, [enabled, returnTo])

    return null
}