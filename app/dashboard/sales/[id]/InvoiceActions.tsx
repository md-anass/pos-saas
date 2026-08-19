'use client'

import { useState } from 'react'
import { toJpeg } from 'html-to-image'
import { Download, MessageCircle } from 'lucide-react'

type Item = { product_name: string, quantity: number, unit_price: number }

export default function InvoiceActions({ saleId, totalAmount, shopName, items }: {
    saleId: string,
    totalAmount: number,
    shopName: string,
    items: Item[]
}) {
    const [isDownloading, setIsDownloading] = useState(false)
    const [phoneNumber, setPhoneNumber] = useState('')

    const handleDownload = async () => {
        setIsDownloading(true)
        const node = document.getElementById('invoice-capture')
        if (node) {
            try {
                const dataUrl = await toJpeg(node, { quality: 0.95, backgroundColor: '#ffffff' })
                const link = document.createElement('a')
                link.download = `invoice-${saleId.substring(0, 8)}.jpg`
                link.href = dataUrl
                link.click()
            } catch (e) {
                console.error('Error generating image:', e)
            } finally {
                setIsDownloading(false)
            }
        }
    }

    const handleWhatsApp = () => {
        let text = `*Invoice from ${shopName}*\n`
        text += `Invoice #: ${saleId.substring(0, 8).toUpperCase()}\n\n`
        text += `*Items:*\n`
        items.forEach(item => {
            text += `${item.quantity} x ${item.product_name} - Rs. ${item.unit_price.toFixed(2)}\n`
        })
        text += `\n*Total: Rs. ${totalAmount.toFixed(2)}*\n\nThank you for your business!`

        const encodedText = encodeURIComponent(text)
        const cleanPhone = phoneNumber.replace(/[^0-9]/g, '')

        if (cleanPhone) {
            window.open(`https://wa.me/${cleanPhone}?text=${encodedText}`, '_blank')
        } else {
            window.open(`https://wa.me/?text=${encodedText}`, '_blank')
        }
    }

    return (
        <div className="flex flex-col sm:flex-row gap-2 no-print w-full sm:w-auto items-end">
            <div className="flex-grow w-full sm:w-auto">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Customer WhatsApp #</label>
                <input
                    type="text"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="e.g. 923131234567"
                    className="w-full p-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                />
            </div>
            <div className="flex gap-2">
                <button
                    onClick={handleWhatsApp}
                    className="flex items-center gap-1 text-sm text-white bg-green-600 hover:bg-green-700 px-4 py-2 rounded-md transition-colors h-[38px]"
                >
                    <MessageCircle size={14} /> Send
                </button>
                <button
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="flex items-center gap-1 text-sm text-white bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-md transition-colors disabled:opacity-50 h-[38px]"
                >
                    <Download size={14} /> {isDownloading ? '...' : 'JPG'}
                </button>
            </div>
        </div>
    )
}