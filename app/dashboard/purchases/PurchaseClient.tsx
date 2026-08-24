'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Upload, X, Loader2, Plus, Search, Trash2 } from 'lucide-react'
import { useShopCapabilities } from '@/app/components/ShopCapabilitiesProvider'
import { formatCurrency } from '@/lib/currency'
import type { ShopType } from '@/lib/shop-capabilities'

type Product = { id: string, name: string, purchase_price: number, quantity: number, unit: string }
type Supplier = { id: string, name: string }
type Location = { id: string, name: string }

type CartItem = {
    product_id: string
    name: string
    unit: string
    quantity: number
    unit_price: number
    total_price: number
    batch_number?: string
    expiry_date?: string
}

export default function PurchaseClient({ products, suppliers, locations, shopType = 'retail', t }: { products: Product[], suppliers: Supplier[], locations: Location[], shopType?: ShopType, t: any }) {
    const { shop } = useShopCapabilities()
    const money = (value: number) => formatCurrency(value, shop.currency)
    const [cart, setCart] = useState<CartItem[]>([])
    const [supplierId, setSupplierId] = useState<string>('')
    const [locationId, setLocationId] = useState<string>(locations[0]?.id || '')
    const [notes, setNotes] = useState('')
    const [isProcessing, setIsProcessing] = useState(false)

    const [searchTerm, setSearchTerm] = useState('')
    const [showDropdown, setShowDropdown] = useState(false)
    const [discount, setDiscount] = useState('')
    const [paidAmount, setPaidAmount] = useState('')
    const [invoiceUrl, setInvoiceUrl] = useState<string>('')
    const [isUploading, setIsUploading] = useState(false)
    const [shopId, setShopId] = useState<string>('')
    const [mode, setMode] = useState<'opening' | 'batches'>(shopType === 'pharmacy' ? 'batches' : 'opening')

    const supabase = createClient()
    const router = useRouter()

    useEffect(() => {
        const getShop = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data: shop } = await supabase.from('shops').select('id').eq('owner_id', user.id).single()
                if (shop) setShopId(shop.id)
            }
        }
        getShop()
    }, [supabase])

    const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))

    const addToCart = (product: Product) => {
        const existingItem = cart.find(item => item.product_id === product.id)
        const basePrice = product.purchase_price || 0

        if (existingItem) {
            setCart(cart.map(item =>
                item.product_id === product.id
                    ? { ...item, quantity: item.quantity + 1, total_price: (item.quantity + 1) * item.unit_price }
                    : item
            ))
        } else {
            setCart([...cart, {
                product_id: product.id,
                name: product.name,
                unit: product.unit,
                quantity: 1,
                unit_price: basePrice,
                total_price: basePrice
            }])
        }
        setSearchTerm('')
        setShowDropdown(false)
    }

    const updateCartItem = (id: string, field: keyof CartItem, value: string) => {
        const numValue = parseFloat(value) || 0
        setCart(cart.map(item => {
            if (item.product_id === id) {
                const updatedItem = { ...item, [field]: field === 'batch_number' ? value : numValue }
                updatedItem.total_price = updatedItem.quantity * updatedItem.unit_price
                return updatedItem
            }
            return item
        }))
    }

    const removeFromCart = (id: string) => setCart(cart.filter(item => item.product_id !== id))

    const subtotal = cart.reduce((sum, item) => sum + item.total_price, 0)
    const disc = parseFloat(discount) || 0
    const totalAmount = Math.max(0, subtotal - disc)
    const paid = parseFloat(paidAmount) || 0
    const dueAmount = totalAmount - paid

    const handleInvoiceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !shopId) return

        // 1. FILE SIZE VALIDATION (Max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            toast.error('File is too large. Maximum size is 2MB.')
            return
        }

        // 2. FILE TYPE VALIDATION (Images and PDFs only)
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
        if (!allowedTypes.includes(file.type)) {
            toast.error('Invalid file type. Only images (JPG, PNG) and PDFs are allowed.')
            return
        }

        setIsUploading(true)
        const fileExt = file.name.split('.').pop()
        // 3. SECURE PATH: Store inside a folder named after the shop_id
        const fileName = `${shopId}/inv-${Date.now()}.${fileExt}`

        try {
            const { error } = await supabase.storage.from('purchase-invoices').upload(fileName, file)
            if (error) throw error

            const { data } = supabase.storage.from('purchase-invoices').getPublicUrl(fileName)
            setInvoiceUrl(data.publicUrl)
            toast.success('Invoice uploaded securely!')
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setIsUploading(false)
        }
    }

    const completePurchase = async () => {
        if (cart.length === 0) { toast.error('Cart is empty!'); return }
        if (!locationId) { toast.error('Please select a location.'); return }
        setIsProcessing(true)

        try {
            const dbCart = cart.map(item => ({
                product_id: item.product_id,
                quantity: item.quantity,
                unit_price: item.unit_price,
                total_price: item.total_price,
                batch_number: mode === 'batches' ? item.batch_number || null : null,
                expiry_date: mode === 'batches' ? item.expiry_date || null : null,
            }))

            const { data, error } = await supabase.rpc('process_purchase', {
                p_supplier_id: supplierId || null,
                p_location_id: locationId,
                p_cart: dbCart,
                p_subtotal: subtotal,
                p_discount: disc,
                p_total_amount: totalAmount,
                p_paid_amount: paid,
                p_notes: notes,
                p_invoice_url: invoiceUrl || null,
                p_track_batches: mode === 'batches'
            })

            if (error) throw error

            toast.success('Purchase recorded successfully! Stock has been updated.')
            router.push('/dashboard/purchases')
            router.refresh()
        } catch (error: any) {
            toast.error('Error processing purchase: ' + error.message)
        } finally {
            setIsProcessing(false)
        }
    }

    return (
        <div className="p-4 lg:p-6 space-y-6 bg-gray-50 dark:bg-gray-950 min-h-[calc(100vh-4rem)]">

            {/* Top Header & Mode Toggle */}
            <div className="flex flex-wrap justify-between items-center gap-4 bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                <div><h1 className="text-xl font-bold text-gray-900 dark:text-white">{shopType === 'pharmacy' ? 'Receive Medicine Stock' : t.record_title}</h1>{shopType === 'pharmacy' && <p className="mt-1 text-sm text-gray-500">Batch number and expiry are required for saleable medicine stock.</p>}</div>
                <div className="flex items-center gap-4">
                    <div className="flex border border-gray-300 dark:border-gray-700 rounded-md p-1">
                        {shopType !== 'pharmacy' && <button onClick={() => setMode('opening')} className={`px-3 py-1 text-xs rounded ${mode === 'opening' ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-300'}`}>{t.mode_opening}</button>}
                        <button onClick={() => setMode('batches')} className={`px-3 py-1 text-xs rounded ${mode === 'batches' ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-300'}`}>{shopType === 'pharmacy' ? 'Batch receiving required' : t.mode_batches}</button>
                    </div>
                </div>
            </div>

            {/* Supplier & Location Selection */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">{t.select_supplier}</label>
                    <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="w-full p-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-blue-500">
                        <option value="">Walk-in / Unknown</option>
                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">{t.select_location}</label>
                    <select value={locationId} onChange={(e) => setLocationId(e.target.value)} className="w-full p-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-blue-500">
                        <option value="">Select Location</option>
                        {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">{t.upload_invoice}</label>
                    <div className="flex items-center gap-2">
                        <label className="cursor-pointer flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline">
                            {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                            {isUploading ? 'Uploading...' : 'Upload Bill'}
                            <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleInvoiceUpload} disabled={isUploading} />
                        </label>
                        {invoiceUrl && <img src={invoiceUrl} alt="inv" className="h-8 w-8 rounded object-cover" />}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column: Search & Cart Table */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Product Search */}
                    <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm relative">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder={shopType === 'pharmacy' ? 'Search medicine to receive...' : t.click_to_add}
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); setShowDropdown(true) }}
                                onFocus={() => setShowDropdown(true)}
                                onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                                className="w-full pl-10 p-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            {showDropdown && (
                                <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-lg max-h-48 overflow-y-auto">
                                    {filteredProducts.length > 0 ? filteredProducts.slice(0, 10).map(p => (
                                        <div key={p.id} onMouseDown={() => addToCart(p)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm text-gray-900 dark:text-white flex justify-between">
                                            <span>{p.name}</span> <span className="text-xs text-gray-500">{shopType === 'pharmacy' ? 'Current stock' : 'Stock'}: {p.quantity}</span>
                                        </div>
                                    )) : <div className="p-2 text-sm text-gray-500">{shopType === 'pharmacy' ? 'No medicines found' : 'No products found'}</div>}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Cart Table */}
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 text-xs uppercase">
                                <tr>
                                    <th className="p-3 text-left">{shopType === 'pharmacy' ? 'Medicine' : 'Product'}</th>
                                    <th className="p-3 text-center">Qty</th>
                                    <th className="p-3 text-center">Price</th>
                                    {mode === 'batches' && <th className="p-3 text-center">Batch / Expiry</th>}
                                    <th className="p-3 text-right">Total</th>
                                    <th className="p-3 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                                {cart.length === 0 ? (
                                    <tr><td colSpan={mode === 'batches' ? 6 : 5} className="p-8 text-center text-gray-400">{t.click_to_add}</td></tr>
                                ) : (
                                    cart.map(item => (
                                        <tr key={item.product_id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                                            <td className="p-2 font-medium text-gray-900 dark:text-white">{item.name}<span className="text-xs text-gray-400 block">{item.unit}</span></td>
                                            <td className="p-1 text-center"><input type="number" value={item.quantity} onChange={(e) => updateCartItem(item.product_id, 'quantity', e.target.value)} className="w-16 p-1 text-center border border-gray-200 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-blue-500" /></td>
                                            <td className="p-1 text-center"><input type="number" value={item.unit_price} onChange={(e) => updateCartItem(item.product_id, 'unit_price', e.target.value)} className="w-20 p-1 text-center border border-gray-200 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-blue-500" /></td>

                                            {mode === 'batches' ? (
                                                <td className="p-1 text-center">
                                                    <div className="flex gap-1">
                                                        <input type="text" placeholder="Batch" value={item.batch_number || ''} onChange={(e) => updateCartItem(item.product_id, 'batch_number', e.target.value)} className="w-16 p-1 text-center border border-gray-200 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-blue-500" />
                                                        <input type="date" placeholder="Exp" value={item.expiry_date || ''} onChange={(e) => updateCartItem(item.product_id, 'expiry_date', e.target.value)} className="w-32 p-1 text-center border border-gray-200 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-blue-500" />
                                                    </div>
                                                </td>
                                            ) : null}

                                            <td className="p-2 text-right font-medium text-gray-900 dark:text-white">{money(item.total_price)}</td>
                                            <td className="p-2 text-center"><button onClick={() => removeFromCart(item.product_id)} className="text-red-500 hover:text-red-700"><Trash2 size={14} /></button></td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Right Column: Summary & Payment */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm sticky top-20">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 border-b pb-2">Summary</h3>

                        <div className="space-y-3">
                            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                                <span>Subtotal</span>
                                <span>{money(subtotal)}</span>
                            </div>

                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-600 dark:text-gray-400">{t.discount}</span>
                                <input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0" className="w-20 p-1 text-right border border-gray-200 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-blue-500" />
                            </div>

                            <div className="flex justify-between text-xl font-bold text-gray-900 dark:text-white border-t pt-3 mt-2">
                                <span>{t.grand_total}</span>
                                <span>{money(totalAmount)}</span>
                            </div>

                            <div className="pt-4 mt-2 border-t space-y-3">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-600 dark:text-gray-400">{t.paid_amount}</span>
                                    <input type="number" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} placeholder="0" className="w-24 p-1 text-right border border-gray-200 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-blue-500" />
                                </div>
                                <div className="flex justify-between text-sm text-red-600 dark:text-red-400 font-medium">
                                    <span>{t.due_amount}</span>
                                    <span>{money(dueAmount)}</span>
                                </div>
                            </div>

                            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (Optional)" rows={2} className="w-full p-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-blue-500 mt-2"></textarea>
                        </div>

                        <button onClick={completePurchase} disabled={isProcessing} className="w-full mt-6 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50">
                            {isProcessing ? 'Processing...' : t.save_purchase}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}