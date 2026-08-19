'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

type SaleItem = {
    id: string
    product_id: string
    product_name: string
    quantity: number
    unit_price: number
    total_price: number
}

export default function ReturnClient({ saleId, items }: { saleId: string, items: SaleItem[] }) {
    const [selectedItems, setSelectedItems] = useState<Record<string, number>>({})
    const [isProcessing, setIsProcessing] = useState(false)

    const supabase = createClient()
    const router = useRouter()

    const handleQuantityChange = (itemId: string, maxQty: number, newQty: number) => {
        if (newQty < 0) newQty = 0
        if (newQty > maxQty) newQty = maxQty

        setSelectedItems({
            ...selectedItems,
            [itemId]: newQty
        })
    }

    const totalRefund = items.reduce((sum, item) => {
        const returnQty = selectedItems[item.id] || 0
        return sum + (returnQty * item.unit_price)
    }, 0)

    const processReturn = async () => {
        const cart = items
            .filter(item => (selectedItems[item.id] || 0) > 0)
            .map(item => ({
                product_id: item.product_id,
                quantity: selectedItems[item.id],
                unit_price: item.unit_price,
                total_price: selectedItems[item.id] * item.unit_price
            }))

        if (cart.length === 0) {
            toast.error('Please select at least one item to return.')
            return
        }

        setIsProcessing(true)

        try {
            const { error } = await supabase.rpc('process_return', {
                p_sale_id: saleId,
                p_cart: cart,
                p_total_refund: totalRefund
            })

            if (error) throw error

            toast.success('Return processed successfully! Stock has been updated.')
            router.push('/dashboard/sales')
            router.refresh()

        } catch (error: any) {
            toast.error('Error processing return: ' + error.message)
        } finally {
            setIsProcessing(false)
        }
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Process Return for Sale</h1>

            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6 transition-colors">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Enter the quantity being returned for each item. The stock will be added back to your inventory automatically.</p>

                <div className="space-y-4">
                    {items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-4">
                            <div>
                                <p className="font-medium text-gray-900 dark:text-white">{item.product_name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Original Qty: {item.quantity} @ Rs. {item.unit_price}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="text-sm text-gray-600 dark:text-gray-300">Return Qty:</label>
                                <input
                                    type="number"
                                    min="0"
                                    max={item.quantity}
                                    value={selectedItems[item.id] || 0}
                                    onChange={(e) => handleQuantityChange(item.id, item.quantity, parseInt(e.target.value) || 0)}
                                    className="w-20 p-1 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded text-center focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-6 flex justify-between items-center border-t border-gray-200 dark:border-gray-800 pt-4">
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                        Total Refund: <span className="text-red-600 dark:text-red-400">Rs. {totalRefund.toFixed(2)}</span>
                    </div>
                    <button
                        onClick={processReturn}
                        disabled={isProcessing}
                        className="bg-orange-600 text-white px-6 py-2 rounded-md font-medium hover:bg-orange-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 transition-colors"
                    >
                        {isProcessing ? 'Processing...' : 'Confirm Return'}
                    </button>
                </div>
            </div>
        </div>
    )
}