'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Search, Plus, Trash2, FileText, Printer, X, UserPlus, Loader2, ShoppingCart, ArrowRight } from 'lucide-react'

type Product = { id: string, name: string, selling_price: number, quantity: number, unit: string }
type Customer = { id: string, name: string, phone: string | null, balance: number }
type CartItem = {
    product_id: string
    name: string
    quantity: number
    bonus: number
    unit_price: number
    discount_percent: number
    total_price: number
    unit: string
}

type Translations = {
    search_placeholder: string; current_sale: string; customer_optional: string; cart_empty: string; subtotal: string; total: string;
    cash: string; card: string; bank_transfer: string; other: string; complete_sale: string; processing: string;
}

const fallbackDict: Translations = {
    search_placeholder: 'Search products...', current_sale: 'Current Sale', customer_optional: 'Customer Name', cart_empty: 'Cart is empty', subtotal: 'Subtotal', total: 'Total', cash: 'Cash', card: 'Card', bank_transfer: 'Bank Transfer', other: 'Other', complete_sale: 'Complete Sale', processing: 'Processing...'
}

// Custom Printer Receipt Icon
const PrintReceiptIcon = ({ size = 18 }: { size?: number }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9V2h12v7" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><path d="M6 14h12v8H6z" /><path d="M9 18h6" />
    </svg>
)

// Reusable input class for clean tables
const tableInputClass = "w-full p-1 text-center border border-gray-200 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [appearance:textfield]"

export default function POSClient({ products, customers, t }: { products: Product[], customers: Customer[], t: Translations }) {
    const dict = t || fallbackDict;
    const supabase = createClient();

    // Sale Info State
    const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0])
    const [saleType, setSaleType] = useState('Retail')
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
    const [customerSearch, setCustomerSearch] = useState('')
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
    const [isQuotation, setIsQuotation] = useState(false)

    // Quick Add Customer State
    const [showQuickAdd, setShowQuickAdd] = useState(false)
    const [newCustName, setNewCustName] = useState('')
    const [newCustPhone, setNewCustPhone] = useState('')
    const [isAddingCust, setIsAddingCust] = useState(false)

    // Product Entry State
    const [productSearch, setProductSearch] = useState('')
    const [showProductDropdown, setShowProductDropdown] = useState(false)
    const [activeProduct, setActiveProduct] = useState<Product | null>(null)
    const [entryQty, setEntryQty] = useState('1')
    const [entryBonus, setEntryBonus] = useState('')
    const [entryPrice, setEntryPrice] = useState('')

    // Cart State
    const [cart, setCart] = useState<CartItem[]>([])

    // Summary State
    const [cartDiscountPercent, setCartDiscountPercent] = useState('')
    const [cartFixedDiscount, setCartFixedDiscount] = useState('')
    const [deliveryCharges, setDeliveryCharges] = useState('')
    const [receivedAmount, setReceivedAmount] = useState('')
    const [paymentMethod, setPaymentMethod] = useState('cash')
    const [isProcessing, setIsProcessing] = useState(false)

    // Dropdown Navigation State
    const [highlightedProductIndex, setHighlightedProductIndex] = useState(-1)
    const [highlightedCustomerIndex, setHighlightedCustomerIndex] = useState(-1)

    // Refs
    const qtyRef = useRef<HTMLInputElement>(null)
    const bonusRef = useRef<HTMLInputElement>(null)
    const productSearchRef = useRef<HTMLInputElement>(null)

    const filteredProducts = products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()))
    const filteredCustomers = customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()))

    const subtotal = cart.reduce((sum, item) => sum + item.total_price, 0)
    const pDisc = parseFloat(cartDiscountPercent) || 0
    const fDisc = parseFloat(cartFixedDiscount) || 0
    const delivery = parseFloat(deliveryCharges) || 0
    const received = parseFloat(receivedAmount) || 0

    const percentDiscountAmount = subtotal * (pDisc / 100)
    const totalDiscount = percentDiscountAmount + fDisc
    const grandTotal = Math.max(0, (subtotal - totalDiscount) + delivery)
    const change = received - grandTotal
    const dueAmount = grandTotal - received

    useEffect(() => { setHighlightedProductIndex(-1) }, [productSearch])
    useEffect(() => { setHighlightedCustomerIndex(-1) }, [customerSearch])

    // Global Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.altKey) {
                if (e.key === 'q' || e.key === 'Q') { e.preventDefault(); qtyRef.current?.focus(); }
                if (e.key === 'b' || e.key === 'B') { e.preventDefault(); bonusRef.current?.focus(); }
                if (e.key === 'a' || e.key === 'A') { e.preventDefault(); handleAddToCart(); }
                if (e.key === 'p' || e.key === 'P') { e.preventDefault(); handleCompleteSale('receipt'); }
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [cart, isQuotation, paymentMethod, receivedAmount, activeProduct, entryQty, entryBonus, entryPrice])

    const handleProductSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        const currentProducts = productSearch ? filteredProducts : products
        if (currentProducts.length === 0) return
        if (e.key === 'ArrowDown' || e.key === 'PageDown') {
            e.preventDefault(); setShowProductDropdown(true)
            setHighlightedProductIndex(prev => (prev + 1) % currentProducts.length)
        } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
            e.preventDefault(); setShowProductDropdown(true)
            setHighlightedProductIndex(prev => (prev - 1 + currentProducts.length) % currentProducts.length)
        } else if (e.key === 'Enter' && highlightedProductIndex >= 0 && currentProducts[highlightedProductIndex]) {
            e.preventDefault(); handleSelectProduct(currentProducts[highlightedProductIndex])
        }
    }

    const handleCustomerSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        const currentCustomers = customerSearch ? filteredCustomers : customers
        if (currentCustomers.length === 0) return
        if (e.key === 'ArrowDown' || e.key === 'PageDown') {
            e.preventDefault(); setShowCustomerDropdown(true)
            setHighlightedCustomerIndex(prev => (prev + 1) % currentCustomers.length)
        } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
            e.preventDefault(); setShowCustomerDropdown(true)
            setHighlightedCustomerIndex(prev => (prev - 1 + currentCustomers.length) % currentCustomers.length)
        } else if (e.key === 'Enter' && highlightedCustomerIndex >= 0 && currentCustomers[highlightedCustomerIndex]) {
            e.preventDefault()
            setSelectedCustomer(currentCustomers[highlightedCustomerIndex])
            setCustomerSearch(''); setShowCustomerDropdown(false)
        }
    }

    const handleQuickAddCustomer = async () => {
        if (!newCustName) { toast.error('Customer name is required'); return }
        setIsAddingCust(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            const { data: shop } = await supabase.from('shops').select('id').eq('owner_id', user?.id).single()

            const { data, error } = await supabase.from('customers').insert({
                shop_id: shop?.id, name: newCustName, phone: newCustPhone
            }).select('id, name, phone, balance').single()

            if (error) throw error
            customers.push(data) // Add to local list
            setSelectedCustomer(data)
            setShowQuickAdd(false); setNewCustName(''); setNewCustPhone('')
            toast.success('Customer added!')
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setIsAddingCust(false)
        }
    }

    const handleSelectProduct = (p: Product) => {
        setActiveProduct(p); setProductSearch(p.name); setEntryPrice(p.selling_price.toString())
        setEntryQty('1'); setEntryBonus(''); setShowProductDropdown(false)
        setTimeout(() => qtyRef.current?.focus(), 50)
    }

    const handleAddToCart = () => {
        if (!activeProduct) { toast.error('Select a product first'); return }
        const qty = parseFloat(entryQty) || 0
        if (qty <= 0) { toast.error('Quantity must be > 0'); return }
        const price = parseFloat(entryPrice) || 0
        const bonus = parseFloat(entryBonus) || 0
        const lineTotal = qty * price

        const existingItem = cart.find(item => item.product_id === activeProduct.id)
        if (existingItem) {
            setCart(cart.map(item => item.product_id === activeProduct.id ? { ...item, quantity: item.quantity + qty, bonus: item.bonus + bonus, total_price: (item.quantity + qty) * item.unit_price * (1 - item.discount_percent / 100) } : item))
        } else {
            setCart([...cart, { product_id: activeProduct.id, name: activeProduct.name, quantity: qty, bonus, unit_price: price, discount_percent: 0, total_price: lineTotal, unit: activeProduct.unit }])
        }
        setActiveProduct(null); setProductSearch(''); setEntryQty('1'); setEntryBonus(''); setEntryPrice('')
        setTimeout(() => productSearchRef.current?.focus(), 50)
    }

    const updateCartItem = (id: string, field: keyof CartItem, value: string) => {
        const numValue = parseFloat(value) || 0
        setCart(cart.map(item => {
            if (item.product_id === id) {
                const updatedItem = { ...item, [field]: numValue }
                updatedItem.total_price = updatedItem.quantity * updatedItem.unit_price * (1 - updatedItem.discount_percent / 100)
                return updatedItem
            }
            return item
        }))
    }

    const removeFromCart = (id: string) => setCart(cart.filter(item => item.product_id !== id))

    const handleCompleteSale = async (printType: 'invoice' | 'receipt' | false = false) => {
        if (cart.length === 0) { toast.error('Cart is empty!'); return }
        if (!isQuotation && received < grandTotal && !selectedCustomer) {
            toast.error('Received amount is less than total! Select a customer to add to ledger.')
            return
        }

        setIsProcessing(true)
        try {
            const dbCart = cart.map(item => ({ product_id: item.product_id, name: item.name, quantity: item.quantity, unit_price: item.unit_price, total_price: item.total_price }))
            const { data, error } = await supabase.rpc('process_sale', {
                p_customer_id: selectedCustomer?.id || null,
                p_customer_name: selectedCustomer?.name || 'Walk-in Customer',
                p_cart: dbCart, p_subtotal: subtotal, p_discount: totalDiscount, p_tax: 0,
                p_delivery_charges: delivery, p_total_amount: grandTotal, p_received_amount: received,
                p_payment_method: paymentMethod, p_is_quotation: isQuotation
            })

            if (error) throw error
            toast.success(isQuotation ? 'Quotation saved successfully!' : 'Sale completed successfully!')
            if (dueAmount > 0 && selectedCustomer) {
                toast.info(`Rs. ${dueAmount.toFixed(2)} added to ${selectedCustomer.name}'s ledger.`)
            }

            if (printType === 'invoice') window.location.href = `/dashboard/sales/${data}`
            else if (printType === 'receipt') window.location.href = `/dashboard/sales/${data}/receipt`

            // Reset POS
            setCart([]); setSelectedCustomer(null); setCustomerSearch('')
            setCartDiscountPercent(''); setCartFixedDiscount(''); setDeliveryCharges(''); setReceivedAmount(''); setIsQuotation(false)
        } catch (error: any) {
            toast.error('Error: ' + error.message)
        } finally {
            setIsProcessing(false)
        }
    }

    return (
        <div className="p-4 lg:p-6 space-y-6 bg-gray-50 dark:bg-gray-950 min-h-[calc(100vh-4rem)]">

            {/* Premium Top Action Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-center bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm gap-4">
                <div className="flex items-center gap-3">
                    <button onClick={() => setIsQuotation(!isQuotation)} title="Toggle Quotation Mode" className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${isQuotation ? 'bg-purple-600 text-white shadow-md shadow-purple-500/30' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                        <FileText size={16} /> Quotation Mode
                    </button>
                </div>
                <div className="flex w-full sm:w-auto gap-2">
                    <button onClick={() => handleCompleteSale(false)} disabled={isProcessing} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-all disabled:opacity-50 shadow-md shadow-blue-600/20">
                        {isProcessing ? <Loader2 className="animate-spin" size={16} /> : <ShoppingCart size={16} />}
                        {isQuotation ? 'Save Quotation' : 'Save Sale'}
                    </button>
                    <button onClick={() => handleCompleteSale('invoice')} disabled={isProcessing} className="flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50">
                        <Printer size={16} /> <span className="hidden sm:inline">Invoice</span>
                    </button>
                </div>
            </div>

            {/* Sale Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Date</label>
                    <input type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} className="w-full p-2 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Type</label>
                    <select value={saleType} onChange={(e) => setSaleType(e.target.value)} className="w-full p-2 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all">
                        <option>Retail</option><option>Wholesale</option>
                    </select>
                </div>
                <div className="relative">
                    <div className="flex justify-between items-center mb-1">
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">Customer</label>
                        <button type="button" onClick={() => setShowQuickAdd(true)} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 flex items-center gap-1 text-xs font-medium"><UserPlus size={12} /> Add New</button>
                    </div>
                    {selectedCustomer ? (
                        <div className="p-2 border border-blue-500 rounded-md bg-blue-50 dark:bg-blue-950/30">
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">{selectedCustomer.name}</span>
                                <button onClick={() => { setSelectedCustomer(null); setCustomerSearch('') }} className="text-red-500 hover:text-red-700"><X size={14} /></button>
                            </div>
                            {selectedCustomer.balance > 0 && (
                                <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-medium">Outstanding: Rs. {selectedCustomer.balance.toFixed(2)}</p>
                            )}
                        </div>
                    ) : (
                        <>
                            <input type="text" placeholder="Search customer..." value={customerSearch} onChange={(e) => { setCustomerSearch(e.target.value); setShowCustomerDropdown(true) }} onFocus={() => setShowCustomerDropdown(true)} onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 150)} onKeyDown={handleCustomerSearchKeyDown} className="w-full p-2 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                            {showCustomerDropdown && (
                                <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-40 overflow-y-auto">
                                    {(customerSearch ? filteredCustomers : customers).length > 0 ? (customerSearch ? filteredCustomers : customers).map((c, i) => (
                                        <div key={c.id} onMouseDown={() => { setSelectedCustomer(c); setCustomerSearch(''); setShowCustomerDropdown(false) }} className={`p-2 cursor-pointer text-sm text-gray-900 dark:text-white flex justify-between ${highlightedCustomerIndex === i ? 'bg-blue-50 dark:bg-blue-900/50' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                                            <span>{c.name} {c.phone && <span className="text-xs text-gray-500">({c.phone})</span>}</span>
                                            {c.balance > 0 && <span className="text-xs text-red-600">Owes: Rs. {c.balance.toFixed(2)}</span>}
                                        </div>
                                    )) : <div className="p-2 text-sm text-gray-500">No customers found</div>}
                                </div>
                            )}
                        </>
                    )}
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Previous Rate</label>
                    <input type="text" disabled placeholder="N/A" className="w-full p-2 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 outline-none" />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column: Search & Cart */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Premium Product Entry */}
                    <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                        <div className="grid grid-cols-12 gap-3 items-end">
                            <div className="col-span-12 md:col-span-4 relative">
                                <label className="block text-xs font-medium text-gray-500 mb-1">Product / Barcode</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <input ref={productSearchRef} type="text" placeholder="Search..." value={productSearch} onChange={(e) => { setProductSearch(e.target.value); setShowProductDropdown(true) }} onFocus={() => setShowProductDropdown(true)} onBlur={() => setTimeout(() => setShowProductDropdown(false), 150)} onKeyDown={handleProductSearchKeyDown} className="w-full pl-9 p-2 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                                </div>
                                {showProductDropdown && (
                                    <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-48 overflow-y-auto">
                                        {(productSearch ? filteredProducts : products).length > 0 ? (productSearch ? filteredProducts : products).slice(0, 10).map((p, i) => (
                                            <div key={p.id} onMouseDown={() => handleSelectProduct(p)} className={`p-2 cursor-pointer text-sm text-gray-900 dark:text-white flex justify-between ${highlightedProductIndex === i ? 'bg-blue-50 dark:bg-blue-900/50' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                                                <span>{p.name}</span> <span className="text-xs text-gray-500">Stk: {p.quantity}</span>
                                            </div>
                                        )) : <div className="p-2 text-sm text-gray-500">No products found</div>}
                                    </div>
                                )}
                            </div>
                            <div className="col-span-4 md:col-span-2"><label className="block text-xs font-medium text-gray-500 mb-1">Stock</label><input type="text" disabled value={activeProduct?.quantity || ''} placeholder="-" className="w-full p-2 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-500 outline-none" /></div>
                            <div className="col-span-4 md:col-span-1"><label className="block text-xs font-medium text-gray-500 mb-1">Unit</label><input type="text" disabled value={activeProduct?.unit || ''} placeholder="-" className="w-full p-2 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-500 outline-none" /></div>
                            <div className="col-span-4 md:col-span-1"><label className="block text-xs font-medium text-gray-500 mb-1">Qty</label><input ref={qtyRef} type="number" value={entryQty} onChange={(e) => setEntryQty(e.target.value)} className={`${tableInputClass} !px-2`} /></div>
                            <div className="col-span-4 md:col-span-1"><label className="block text-xs font-medium text-gray-500 mb-1">Bonus</label><input ref={bonusRef} type="number" value={entryBonus} onChange={(e) => setEntryBonus(e.target.value)} placeholder="0" className={`${tableInputClass} !px-2`} /></div>
                            <div className="col-span-4 md:col-span-2"><label className="block text-xs font-medium text-gray-500 mb-1">Price</label><input type="number" value={entryPrice} onChange={(e) => setEntryPrice(e.target.value)} placeholder="0" className={`${tableInputClass} !px-2`} /></div>
                            <div className="col-span-12 md:col-span-1"><button onClick={handleAddToCart} className="w-full h-[38px] flex items-center justify-center bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm shadow-blue-600/20"><Plus size={18} /></button></div>
                        </div>
                        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-gray-400 dark:text-gray-500">
                            <span><kbd className="bg-gray-100 dark:bg-gray-800 px-1 rounded">Alt+Q</kbd> Qty</span><span><kbd className="bg-gray-100 dark:bg-gray-800 px-1 rounded">Alt+B</kbd> Bonus</span><span><kbd className="bg-gray-100 dark:bg-gray-800 px-1 rounded">Alt+A</kbd> Add to Cart</span><span><kbd className="bg-gray-100 dark:bg-gray-800 px-1 rounded">Alt+P</kbd> Print Receipt</span><span><kbd className="bg-gray-100 dark:bg-gray-800 px-1 rounded">PgUp/PgDn</kbd> Navigate Search</span>
                        </div>
                    </div>

                    {/* Premium Cart Table */}
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                                    <tr>
                                        <th className="p-3 text-left">Product</th>
                                        <th className="p-3 text-center">Qty</th>
                                        <th className="p-3 text-center">Bonus</th>
                                        <th className="p-3 text-center">Price</th>
                                        <th className="p-3 text-center">Disc %</th>
                                        <th className="p-3 text-right">Total</th>
                                        <th className="p-3 text-center"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                                    {cart.length === 0 ? (
                                        <tr><td colSpan={7} className="p-12 text-center text-gray-400">
                                            <div className="flex flex-col items-center gap-2">
                                                <ShoppingCart size={32} className="text-gray-300 dark:text-gray-600" />
                                                <span>Cart is empty. Add products to start a sale.</span>
                                            </div>
                                        </td></tr>
                                    ) : (
                                        cart.map(item => (
                                            <tr key={item.product_id} className="group hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                                                <td className="p-3 font-medium text-gray-900 dark:text-white">{item.name}<span className="text-xs text-gray-400 block font-normal">{item.unit}</span></td>
                                                <td className="p-2 text-center"><input type="number" value={item.quantity} onChange={(e) => updateCartItem(item.product_id, 'quantity', e.target.value)} className={tableInputClass} /></td>
                                                <td className="p-2 text-center"><input type="number" value={item.bonus} onChange={(e) => updateCartItem(item.product_id, 'bonus', e.target.value)} className={tableInputClass} /></td>
                                                <td className="p-2 text-center"><input type="number" value={item.unit_price} onChange={(e) => updateCartItem(item.product_id, 'unit_price', e.target.value)} className={tableInputClass} /></td>
                                                <td className="p-2 text-center"><input type="number" value={item.discount_percent} onChange={(e) => updateCartItem(item.product_id, 'discount_percent', e.target.value)} className={tableInputClass} /></td>
                                                <td className="p-3 text-right font-bold text-gray-900 dark:text-white whitespace-nowrap">Rs. {item.total_price.toFixed(2)}</td>
                                                <td className="p-3 text-center"><button onClick={() => removeFromCart(item.product_id)} className="text-gray-300 hover:text-red-600 dark:text-gray-600 dark:hover:text-red-400 transition-colors"><Trash2 size={16} /></button></td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Right Column: Summary & Payment */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm sticky top-20 flex flex-col gap-4">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white border-b pb-2">Summary</h3>

                        <div className="space-y-3">
                            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400"><span>Subtotal</span><span dir="ltr">Rs. {subtotal.toFixed(2)}</span></div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-600 dark:text-gray-400">Discount %</span>
                                <input type="number" value={cartDiscountPercent} onChange={(e) => setCartDiscountPercent(e.target.value)} placeholder="0" className={`${tableInputClass} !text-right w-16`} />
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-600 dark:text-gray-400">Fixed Disc</span>
                                <input type="number" value={cartFixedDiscount} onChange={(e) => setCartFixedDiscount(e.target.value)} placeholder="0" className={`${tableInputClass} !text-right w-20`} />
                            </div>
                            {!isQuotation && (
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-600 dark:text-gray-400">Delivery</span>
                                    <input type="number" value={deliveryCharges} onChange={(e) => setDeliveryCharges(e.target.value)} placeholder="0" className={`${tableInputClass} !text-right w-20`} />
                                </div>
                            )}
                        </div>

                        <div className="flex justify-between text-2xl font-extrabold text-gray-900 dark:text-white border-t pt-3">
                            <span>Grand Total</span><span dir="ltr">Rs. {grandTotal.toFixed(2)}</span>
                        </div>

                        {!isQuotation && (
                            <div className="border-t pt-4 space-y-3">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-600 dark:text-gray-400">Received</span>
                                    <input type="number" value={receivedAmount} onChange={(e) => setReceivedAmount(e.target.value)} placeholder="0" className={`${tableInputClass} !text-right w-24`} />
                                </div>
                                {change > 0 && (
                                    <div className="flex justify-between text-sm text-green-600 dark:text-green-400 font-bold">
                                        <span>Change</span><span dir="ltr">Rs. {change.toFixed(2)}</span>
                                    </div>
                                )}
                                {dueAmount > 0 && selectedCustomer && (
                                    <div className="flex justify-between text-sm text-red-600 dark:text-red-400 font-bold">
                                        <span>Added to Ledger</span><span dir="ltr">Rs. {dueAmount.toFixed(2)}</span>
                                    </div>
                                )}
                                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full p-2 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all">
                                    <option value="cash">{dict.cash}</option><option value="card">{dict.card}</option><option value="bank_transfer">{dict.bank_transfer}</option><option value="other">{dict.other}</option>
                                </select>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-2 mt-auto pt-4">
                            <button onClick={() => handleCompleteSale(false)} disabled={isProcessing} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                                {isProcessing ? <Loader2 className="animate-spin" size={18} /> : <ShoppingCart size={18} />} {isQuotation ? 'Save Quotation' : 'Complete Sale'}
                            </button>
                            <button onClick={() => handleCompleteSale('receipt')} disabled={isProcessing} title="Print Thermal Receipt (Alt+P)" className="flex items-center justify-center py-3 px-4 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50">
                                <PrintReceiptIcon size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Add Customer Modal */}
            {showQuickAdd && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl p-6 w-full max-w-md space-y-4 border border-gray-200 dark:border-gray-800">
                        <div className="flex justify-between items-center"><h3 className="text-lg font-bold text-gray-900 dark:text-white">Quick Add Customer</h3><button onClick={() => setShowQuickAdd(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"><X size={20} /></button></div>
                        <div><label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Name</label><input type="text" value={newCustName} onChange={(e) => setNewCustName(e.target.value)} className="w-full p-2 text-sm border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" /></div>
                        <div><label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Phone</label><input type="text" value={newCustPhone} onChange={(e) => setNewCustPhone(e.target.value)} className="w-full p-2 text-sm border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" /></div>
                        <button onClick={handleQuickAddCustomer} disabled={isAddingCust} className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 flex items-center justify-center gap-2 transition-colors">{isAddingCust ? <Loader2 className="animate-spin" size={16} /> : <UserPlus size={16} />} Save & Select</button>
                    </div>
                </div>
            )}
        </div>
    )
}