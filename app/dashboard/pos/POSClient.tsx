'use client'

import {
    useState,
    useEffect,
    useEffectEvent,
    useRef,
} from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useShopCapabilities } from '@/app/components/ShopCapabilitiesProvider'
import { formatCurrency } from '@/lib/currency'
import type { ShopType } from '@/lib/shop-capabilities'
import {
    Search,
    Plus,
    Trash2,
    FileText,
    Printer,
    X,
    UserPlus,
    Loader2,
    ShoppingCart,
} from 'lucide-react'

type Product = {
    id: string
    name: string
    selling_price: number
    quantity: number
    unit: string
    unit_type?: string | null
    allows_decimal_quantity?: boolean | null
    barcode?: string | null
    nearest_expiry?: string | null
    category_id?: string | null
}

type Customer = {
    id: string
    name: string
    phone: string | null
    balance: number
}

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
    search_placeholder: string
    current_sale: string
    customer_optional: string
    cart_empty: string
    subtotal: string
    total: string
    cash: string
    card: string
    bank_transfer: string
    other: string
    complete_sale: string
    processing: string
}

const fallbackDict: Translations = {
    search_placeholder: 'Search products...',
    current_sale: 'Current Sale',
    customer_optional: 'Customer Name',
    cart_empty: 'Cart is empty',
    subtotal: 'Subtotal',
    total: 'Total',
    cash: 'Cash',
    card: 'Card',
    bank_transfer: 'Bank Transfer',
    other: 'Other',
    complete_sale: 'Complete Sale',
    processing: 'Processing...',
}

const PrintReceiptIcon = ({
    size = 18,
}: {
    size?: number
}) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d="M6 9V2h12v7" />
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
        <path d="M6 14h12v8H6z" />
        <path d="M9 18h6" />
    </svg>
)

const inputClass =
    'w-full h-9 px-3 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors'

const disabledInputClass =
    'w-full h-9 px-3 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 outline-none'

const tableInputClass =
    'w-full min-w-[58px] h-8 px-2 text-center text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [appearance:textfield]'

function getErrorMessage(error: unknown) {
    if (error instanceof Error) {
        return error.message
    }

    if (
        typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof error.message === 'string'
    ) {
        return error.message
    }

    return 'Unexpected error'
}

export default function POSClient({
    products,
    customers,
    groceryMode = false,
    shopType = 'retail',
    t,
}: {
    products: Product[]
    customers: Customer[]
    groceryMode?: boolean
    shopType?: ShopType
    t: Translations
}) {
    const dict = t || fallbackDict
    const router = useRouter()
    const supabase = createClient()
    const { shop } = useShopCapabilities()
    const money = (value: number) => formatCurrency(value, shop.currency)

    // Sale Info
    const [saleDate, setSaleDate] = useState(
        new Date().toISOString().split('T')[0]
    )
    const [saleType, setSaleType] = useState('Retail')
    const [selectedCustomer, setSelectedCustomer] =
        useState<Customer | null>(null)
    const [customerSearch, setCustomerSearch] = useState('')
    const [showCustomerDropdown, setShowCustomerDropdown] =
        useState(false)
    const [isQuotation, setIsQuotation] = useState(false)

    // Quick Add Customer
    const [showQuickAdd, setShowQuickAdd] = useState(false)
    const [newCustName, setNewCustName] = useState('')
    const [newCustPhone, setNewCustPhone] = useState('')
    const [isAddingCust, setIsAddingCust] = useState(false)

    // Product Entry
    const [productSearch, setProductSearch] = useState('')
    const [showProductDropdown, setShowProductDropdown] =
        useState(false)
    const [activeProduct, setActiveProduct] =
        useState<Product | null>(null)
    const [entryQty, setEntryQty] = useState('1')
    const [entryBonus, setEntryBonus] = useState('')
    const [entryPrice, setEntryPrice] = useState('')

    // Cart
    const [cart, setCart] = useState<CartItem[]>([])

    // Summary
    const [cartDiscountPercent, setCartDiscountPercent] =
        useState('')
    const [cartFixedDiscount, setCartFixedDiscount] =
        useState('')
    const [deliveryCharges, setDeliveryCharges] = useState('')
    const [receivedAmount, setReceivedAmount] = useState('')
    const [paymentMethod, setPaymentMethod] = useState('cash')
    const [isProcessing, setIsProcessing] = useState(false)

    // Dropdown Navigation
    const [
        highlightedProductIndex,
        setHighlightedProductIndex,
    ] = useState(-1)

    const [
        highlightedCustomerIndex,
        setHighlightedCustomerIndex,
    ] = useState(-1)

    // Refs
    const qtyRef = useRef<HTMLInputElement>(null)
    const bonusRef = useRef<HTMLInputElement>(null)

    const updateProductSearch = (value: string) => {
        setProductSearch(value)
        setHighlightedProductIndex(-1)
    }

    const updateCustomerSearch = (value: string) => {
        setCustomerSearch(value)
        setHighlightedCustomerIndex(-1)
    }
    const productSearchRef = useRef<HTMLInputElement>(null)

    const filteredProducts = products.filter((p) => {
        const search = productSearch.toLowerCase()

        return (
            p.name.toLowerCase().includes(search) ||
            Boolean(
                p.barcode &&
                p.barcode.toLowerCase().includes(search)
            )
        )
    })

    const filteredCustomers = customers.filter((c) =>
        c.name
            .toLowerCase()
            .includes(customerSearch.toLowerCase())
    )

    const subtotal = cart.reduce(
        (sum, item) => sum + item.total_price,
        0
    )

    const pDisc =
        parseFloat(cartDiscountPercent) || 0

    const fDisc =
        parseFloat(cartFixedDiscount) || 0

    const delivery =
        parseFloat(deliveryCharges) || 0

    const received =
        parseFloat(receivedAmount) || 0

    const percentDiscountAmount =
        subtotal * (pDisc / 100)

    const totalDiscount =
        percentDiscountAmount + fDisc

    const grandTotal = Math.max(
        0,
        subtotal - totalDiscount + delivery
    )

    const change =
        received - grandTotal

    const dueAmount =
        grandTotal - received

    const handleProductSearchKeyDown = (
        e: React.KeyboardEvent<HTMLInputElement>
    ) => {
        const currentProducts =
            productSearch
                ? filteredProducts
                : products

        if (currentProducts.length === 0)
            return

        if (
            e.key === 'ArrowDown' ||
            e.key === 'PageDown'
        ) {
            e.preventDefault()

            setShowProductDropdown(true)

            setHighlightedProductIndex(
                (prev) =>
                    (prev + 1) %
                    currentProducts.length
            )
        } else if (
            e.key === 'ArrowUp' ||
            e.key === 'PageUp'
        ) {
            e.preventDefault()

            setShowProductDropdown(true)

            setHighlightedProductIndex(
                (prev) =>
                    (prev -
                        1 +
                        currentProducts.length) %
                    currentProducts.length
            )
        } else if (
            e.key === 'Enter' &&
            highlightedProductIndex >= 0 &&
            currentProducts[
            highlightedProductIndex
            ]
        ) {
            e.preventDefault()

            handleSelectProduct(
                currentProducts[
                highlightedProductIndex
                ]
            )
        }
    }

    const handleCustomerSearchKeyDown = (
        e: React.KeyboardEvent<HTMLInputElement>
    ) => {
        const currentCustomers =
            customerSearch
                ? filteredCustomers
                : customers

        if (
            currentCustomers.length === 0
        )
            return

        if (
            e.key === 'ArrowDown' ||
            e.key === 'PageDown'
        ) {
            e.preventDefault()

            setShowCustomerDropdown(true)

            setHighlightedCustomerIndex(
                (prev) =>
                    (prev + 1) %
                    currentCustomers.length
            )
        } else if (
            e.key === 'ArrowUp' ||
            e.key === 'PageUp'
        ) {
            e.preventDefault()

            setShowCustomerDropdown(true)

            setHighlightedCustomerIndex(
                (prev) =>
                    (prev -
                        1 +
                        currentCustomers.length) %
                    currentCustomers.length
            )
        } else if (
            e.key === 'Enter' &&
            highlightedCustomerIndex >= 0 &&
            currentCustomers[
            highlightedCustomerIndex
            ]
        ) {
            e.preventDefault()

            setSelectedCustomer(
                currentCustomers[
                highlightedCustomerIndex
                ]
            )

            updateCustomerSearch('')
            setShowCustomerDropdown(false)
        }
    }

    const handleQuickAddCustomer =
        async () => {
            if (!newCustName) {
                toast.error(
                    'Customer name is required'
                )
                return
            }

            setIsAddingCust(true)

            try {
                const {
                    data: { user },
                } =
                    await supabase.auth.getUser()

                const { data: shop } =
                    await supabase
                        .from('shops')
                        .select('id')
                        .eq(
                            'owner_id',
                            user?.id
                        )
                        .single()

                const {
                    data,
                    error,
                } = await supabase
                    .from('customers')
                    .insert({
                        shop_id: shop?.id,
                        name: newCustName,
                        phone: newCustPhone,
                    })
                    .select(
                        'id, name, phone, balance'
                    )
                    .single()

                if (error) throw error

                customers.push(data)

                setSelectedCustomer(data)
                setShowQuickAdd(false)
                setNewCustName('')
                setNewCustPhone('')

                toast.success(
                    'Customer added!'
                )
            } catch (error: unknown) {
                toast.error(getErrorMessage(error))
            } finally {
                setIsAddingCust(false)
            }
        }

    const handleSelectProduct = (
        p: Product
    ) => {
        setActiveProduct(p)

        updateProductSearch(p.name)

        setEntryPrice(
            p.selling_price.toString()
        )

        setEntryQty('1')
        setEntryBonus('')
        setShowProductDropdown(false)

        setTimeout(
            () =>
                qtyRef.current?.focus(),
            50
        )
    }

    const handleAddToCart = () => {
        if (!activeProduct) {
            toast.error(
                'Select a product first'
            )
            return
        }

        const qty =
            parseFloat(entryQty) || 0

        if (qty <= 0) {
            toast.error(
                'Quantity must be > 0'
            )
            return
        }

        if (
            !activeProduct.allows_decimal_quantity &&
            !Number.isInteger(qty)
        ) {
            toast.error(
                'This product only accepts whole quantities'
            )
            return
        }

        if (
            qty >
            Number(
                activeProduct.quantity || 0
            )
        ) {
            toast.error(
                'Quantity exceeds available stock'
            )
            return
        }

        const price =
            parseFloat(entryPrice) || 0

        const bonus =
            parseFloat(entryBonus) || 0

        const lineTotal =
            qty * price

        const existingItem =
            cart.find(
                (item) =>
                    item.product_id ===
                    activeProduct.id
            )

        if (existingItem) {
            setCart(
                cart.map((item) =>
                    item.product_id ===
                        activeProduct.id
                        ? {
                            ...item,
                            quantity:
                                item.quantity +
                                qty,
                            bonus:
                                item.bonus +
                                bonus,
                            total_price:
                                (item.quantity +
                                    qty) *
                                item.unit_price *
                                (1 -
                                    item.discount_percent /
                                    100),
                        }
                        : item
                )
            )
        } else {
            setCart([
                ...cart,
                {
                    product_id:
                        activeProduct.id,
                    name: activeProduct.name,
                    quantity: qty,
                    bonus,
                    unit_price: price,
                    discount_percent: 0,
                    total_price: lineTotal,
                    unit: activeProduct.unit,
                },
            ])
        }

        setActiveProduct(null)
        updateProductSearch('')
        setEntryQty('1')
        setEntryBonus('')
        setEntryPrice('')

        setTimeout(
            () =>
                productSearchRef.current?.focus(),
            50
        )
    }

    const updateCartItem = (
        id: string,
        field: keyof CartItem,
        value: string
    ) => {
        const numValue =
            parseFloat(value) || 0

        setCart(
            cart.map((item) => {
                if (
                    item.product_id === id
                ) {
                    const updatedItem = {
                        ...item,
                        [field]: numValue,
                    }

                    updatedItem.total_price =
                        updatedItem.quantity *
                        updatedItem.unit_price *
                        (1 -
                            updatedItem.discount_percent /
                            100)

                    return updatedItem
                }

                return item
            })
        )
    }

    const removeFromCart = (
        id: string
    ) =>
        setCart(
            cart.filter(
                (item) =>
                    item.product_id !== id
            )
        )

    const handleCompleteSale = async (
        printType:
            | 'invoice'
            | 'receipt'
            | false = false
    ) => {
        if (cart.length === 0) {
            toast.error(
                'Cart is empty!'
            )
            return
        }

        if (
            !isQuotation &&
            received < grandTotal &&
            !selectedCustomer
        ) {
            toast.error(
                'Received amount is less than total! Select a customer to add to ledger.'
            )
            return
        }

        setIsProcessing(true)

        try {
            const dbCart = cart.map(
                (item) => ({
                    product_id:
                        item.product_id,
                    name: item.name,
                    quantity: item.quantity,
                    unit_price:
                        item.unit_price,
                    total_price:
                        item.total_price,
                })
            )

            const {
                data,
                error,
            } = await supabase.rpc(
                'process_sale',
                {
                    p_customer_id:
                        selectedCustomer?.id ||
                        null,

                    p_customer_name:
                        selectedCustomer?.name ||
                        'Walk-in Customer',

                    p_cart: dbCart,
                    p_subtotal: subtotal,
                    p_discount:
                        totalDiscount,
                    p_tax: 0,
                    p_delivery_charges:
                        delivery,
                    p_total_amount:
                        grandTotal,
                    p_received_amount:
                        received,
                    p_payment_method:
                        paymentMethod,
                    p_is_quotation:
                        isQuotation,
                }
            )

            if (error) throw error

            toast.success(
                isQuotation
                    ? 'Quotation saved successfully!'
                    : 'Sale completed successfully!'
            )

            if (
                dueAmount > 0 &&
                selectedCustomer
            ) {
                toast.info(
                    `${money(dueAmount)} added to ${selectedCustomer.name
                    }'s ledger.`
                )
            }

            if (
                printType === 'invoice'
            ) {
                router.push(
                    `/dashboard/sales/${data}`
                )
            } else if (
                printType === 'receipt'
            ) {
                router.push(
                    `/dashboard/sales/${data}/receipt`
                )
            }

            setCart([])
            setSelectedCustomer(null)
            updateCustomerSearch('')
            setCartDiscountPercent('')
            setCartFixedDiscount('')
            setDeliveryCharges('')
            setReceivedAmount('')
            setIsQuotation(false)
        } catch (error: unknown) {
            toast.error(
                'Error: ' +
                getErrorMessage(error)
            )
        } finally {
            setIsProcessing(false)
        }
    }

    const handleKeyboardShortcut = useEffectEvent(
        (e: KeyboardEvent) => {
            if (!e.altKey) return

            if (e.key === 'q' || e.key === 'Q') {
                e.preventDefault()
                qtyRef.current?.focus()
            }

            if (e.key === 'b' || e.key === 'B') {
                e.preventDefault()
                bonusRef.current?.focus()
            }

            if (e.key === 'a' || e.key === 'A') {
                e.preventDefault()
                handleAddToCart()
            }

            if (e.key === 'p' || e.key === 'P') {
                e.preventDefault()
                handleCompleteSale('receipt')
            }
        }
    )

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            handleKeyboardShortcut(e)
        }

        window.addEventListener('keydown', handleKeyDown)

        return () =>
            window.removeEventListener(
                'keydown',
                handleKeyDown
            )
    }, [])

    return (
        <div className="min-h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-950 px-3 py-3 sm:px-4 lg:px-5">

            <div className="mx-auto w-full max-w-[1280px] space-y-3">

                {/* TOP ACTION BAR */}
                <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:flex-row sm:items-center sm:justify-between">

                    <button
                        type="button"
                        onClick={() =>
                            setIsQuotation(
                                !isQuotation
                            )
                        }
                        title="Toggle Quotation Mode"
                        className={`inline-flex h-9 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition-colors ${isQuotation
                                ? 'bg-purple-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                            }`}
                    >
                        <FileText size={15} />
                        Quotation Mode
                    </button>

                    <div className="flex gap-2">
                        <button
                            onClick={() =>
                                handleCompleteSale(
                                    false
                                )
                            }
                            disabled={
                                isProcessing
                            }
                            className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                            {isProcessing ? (
                                <Loader2
                                    size={15}
                                    className="animate-spin"
                                />
                            ) : (
                                <ShoppingCart
                                    size={15}
                                />
                            )}

                            {isQuotation
                                ? 'Save Quotation'
                                : 'Save Sale'}
                        </button>

                        <button
                            onClick={() =>
                                handleCompleteSale(
                                    'invoice'
                                )
                            }
                            disabled={
                                isProcessing
                            }
                            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                        >
                            <Printer size={15} />
                            Invoice
                        </button>
                    </div>
                </div>

                {/* SALE INFO */}
                <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900">

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[180px_170px_minmax(260px,1fr)_190px]">

                        <div>
                            <label className="mb-1 block text-[11px] font-medium text-gray-500 dark:text-gray-400">
                                Date
                            </label>

                            <input
                                type="date"
                                value={saleDate}
                                onChange={(e) =>
                                    setSaleDate(
                                        e.target
                                            .value
                                    )
                                }
                                className={
                                    inputClass
                                }
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-[11px] font-medium text-gray-500 dark:text-gray-400">
                                Type
                            </label>

                            <select
                                value={saleType}
                                onChange={(e) =>
                                    setSaleType(
                                        e.target
                                            .value
                                    )
                                }
                                className={
                                    inputClass
                                }
                            >
                                <option>
                                    Retail
                                </option>
                                <option>
                                    Wholesale
                                </option>
                            </select>
                        </div>

                        <div className="relative">

                            <div className="mb-1 flex items-center justify-between">

                                <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400">
                                    Customer
                                </label>

                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowQuickAdd(
                                            true
                                        )
                                    }
                                    className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
                                >
                                    <UserPlus
                                        size={11}
                                    />
                                    Add New
                                </button>
                            </div>

                            {selectedCustomer ? (
                                <div className="flex min-h-9 items-center justify-between gap-2 rounded-md border border-blue-300 bg-blue-50 px-3 dark:border-blue-800 dark:bg-blue-950/30">

                                    <div className="min-w-0">
                                        <span className="block truncate text-sm font-medium text-blue-700 dark:text-blue-300">
                                            {
                                                selectedCustomer.name
                                            }
                                        </span>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedCustomer(
                                                null
                                            )
                                            updateCustomerSearch(
                                                ''
                                            )
                                        }}
                                        className="text-gray-400 hover:text-red-500"
                                    >
                                        <X
                                            size={
                                                14
                                            }
                                        />
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <input
                                        type="text"
                                        placeholder="Search customer..."
                                        value={
                                            customerSearch
                                        }
                                        onChange={(
                                            e
                                        ) => {
                                            updateCustomerSearch(
                                                e
                                                    .target
                                                    .value
                                            )
                                            setShowCustomerDropdown(
                                                true
                                            )
                                        }}
                                        onFocus={() =>
                                            setShowCustomerDropdown(
                                                true
                                            )
                                        }
                                        onBlur={() =>
                                            setTimeout(
                                                () =>
                                                    setShowCustomerDropdown(
                                                        false
                                                    ),
                                                150
                                            )
                                        }
                                        onKeyDown={
                                            handleCustomerSearchKeyDown
                                        }
                                        className={
                                            inputClass
                                        }
                                    />

                                    {showCustomerDropdown && (
                                        <div className="absolute z-40 mt-1 max-h-52 w-full overflow-y-auto rounded-md border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">

                                            {(
                                                customerSearch
                                                    ? filteredCustomers
                                                    : customers
                                            ).length >
                                                0 ? (
                                                (
                                                    customerSearch
                                                        ? filteredCustomers
                                                        : customers
                                                ).map(
                                                    (
                                                        c,
                                                        i
                                                    ) => (
                                                        <button
                                                            type="button"
                                                            key={
                                                                c.id
                                                            }
                                                            onMouseDown={() => {
                                                                setSelectedCustomer(
                                                                    c
                                                                )
                                                                updateCustomerSearch(
                                                                    ''
                                                                )
                                                                setShowCustomerDropdown(
                                                                    false
                                                                )
                                                            }}
                                                            className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm ${highlightedCustomerIndex ===
                                                                    i
                                                                    ? 'bg-blue-50 dark:bg-blue-900/40'
                                                                    : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                                                                }`}
                                                        >
                                                            <span className="truncate text-gray-900 dark:text-white">
                                                                {
                                                                    c.name
                                                                }
                                                            </span>

                                                            {c.balance >
                                                                0 && (
                                                                    <span className="shrink-0 text-xs text-red-500">
                                                                        {money(c.balance)}
                                                                    </span>
                                                                )}
                                                        </button>
                                                    )
                                                )
                                            ) : (
                                                <div className="p-3 text-sm text-gray-500">
                                                    No
                                                    customers
                                                    found
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        <div>
                            <label className="mb-1 block text-[11px] font-medium text-gray-500 dark:text-gray-400">
                                Previous Rate
                            </label>

                            <input
                                type="text"
                                disabled
                                placeholder="N/A"
                                className={
                                    disabledInputClass
                                }
                            />
                        </div>
                    </div>

                    {selectedCustomer &&
                        selectedCustomer.balance >
                        0 && (
                            <p className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">
                                Outstanding:
                                {money(selectedCustomer.balance)}
                            </p>
                        )}
                </div>

                {/* PRODUCT ENTRY */}
                <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900">

                    <div className="grid grid-cols-12 items-end gap-2">

                        <div className="relative col-span-12 md:col-span-4">

                            <label className="mb-1 block text-[11px] font-medium text-gray-500 dark:text-gray-400">
                                {shopType === 'pharmacy' ? 'Medicine / Barcode' : shopType === 'restaurant' ? 'Menu item' : 'Product / Barcode'}
                            </label>

                            <div className="relative">
                                <Search
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                                    size={15}
                                />

                                <input
                                    ref={
                                        productSearchRef
                                    }
                                    type="text"
                                    placeholder={
                                        groceryMode
                                            ? shopType === 'pharmacy' ? 'Scan barcode or search medicines...' : 'Scan barcode or search...'
                                            : shopType === 'restaurant' ? 'Search menu items...' : 'Search product...'
                                    }
                                    value={
                                        productSearch
                                    }
                                    onChange={(
                                        e
                                    ) => {
                                        updateProductSearch(
                                            e
                                                .target
                                                .value
                                        )
                                        setShowProductDropdown(
                                            true
                                        )
                                    }}
                                    onFocus={() =>
                                        setShowProductDropdown(
                                            true
                                        )
                                    }
                                    onBlur={() =>
                                        setTimeout(
                                            () =>
                                                setShowProductDropdown(
                                                    false
                                                ),
                                            150
                                        )
                                    }
                                    onKeyDown={
                                        handleProductSearchKeyDown
                                    }
                                    className={`${inputClass} pl-9`}
                                />
                            </div>

                            {showProductDropdown && (
                                <div className="absolute z-40 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">

                                    {(
                                        productSearch
                                            ? filteredProducts
                                            : products
                                    ).length >
                                        0 ? (
                                        (
                                            productSearch
                                                ? filteredProducts
                                                : products
                                        )
                                            .slice(
                                                0,
                                                12
                                            )
                                            .map(
                                                (
                                                    p,
                                                    i
                                                ) => (
                                                    <button
                                                        type="button"
                                                        key={
                                                            p.id
                                                        }
                                                        onMouseDown={() =>
                                                            handleSelectProduct(
                                                                p
                                                            )
                                                        }
                                                        className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm ${highlightedProductIndex ===
                                                                i
                                                                ? 'bg-blue-50 dark:bg-blue-900/40'
                                                                : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                                                            }`}
                                                    >
                                                        <span className="min-w-0">
                                                            <span className="block truncate font-medium text-gray-900 dark:text-white">{p.name}</span>
                                                            {shopType === 'pharmacy' && p.nearest_expiry && <span className="block text-xs text-cyan-700">Nearest expiry: {new Date(p.nearest_expiry).toLocaleDateString()}</span>}
                                                        </span>

                                                        <span className="shrink-0 text-xs text-gray-500 dark:text-gray-400">
                                                            Stock:{' '}
                                                            {
                                                                p.quantity
                                                            }
                                                        </span>
                                                    </button>
                                                )
                                            )
                                    ) : (
                                        <div className="p-3 text-sm text-gray-500">
                                            {shopType === 'pharmacy' ? 'No medicines found' : shopType === 'restaurant' ? 'No menu items found' : 'No products found'}
                                            found
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="col-span-4 md:col-span-2">
                            <label className="mb-1 block text-[11px] font-medium text-gray-500 dark:text-gray-400">
                                Stock
                            </label>

                            <input
                                type="text"
                                disabled
                                value={
                                    activeProduct?.quantity ??
                                    ''
                                }
                                placeholder="-"
                                className={
                                    disabledInputClass
                                }
                            />
                        </div>

                        <div className="col-span-4 md:col-span-1">
                            <label className="mb-1 block text-[11px] font-medium text-gray-500 dark:text-gray-400">
                                Unit
                            </label>

                            <input
                                type="text"
                                disabled
                                value={
                                    activeProduct?.unit ||
                                    ''
                                }
                                placeholder="-"
                                className={
                                    disabledInputClass
                                }
                            />
                        </div>

                        <div className="col-span-4 md:col-span-1">
                            <label className="mb-1 block text-[11px] font-medium text-gray-500 dark:text-gray-400">
                                Qty
                            </label>

                            <input
                                ref={qtyRef}
                                type="number"
                                step={
                                    activeProduct?.allows_decimal_quantity
                                        ? '0.001'
                                        : '1'
                                }
                                min="0"
                                value={entryQty}
                                onChange={(e) =>
                                    setEntryQty(
                                        e.target
                                            .value
                                    )
                                }
                                className={
                                    tableInputClass
                                }
                            />
                        </div>

                        <div className="col-span-4 md:col-span-1">
                            <label className="mb-1 block text-[11px] font-medium text-gray-500 dark:text-gray-400">
                                Bonus
                            </label>

                            <input
                                ref={bonusRef}
                                type="number"
                                value={entryBonus}
                                onChange={(e) =>
                                    setEntryBonus(
                                        e.target
                                            .value
                                    )
                                }
                                placeholder="0"
                                className={
                                    tableInputClass
                                }
                            />
                        </div>

                        <div className="col-span-4 md:col-span-2">
                            <label className="mb-1 block text-[11px] font-medium text-gray-500 dark:text-gray-400">
                                Price
                            </label>

                            <input
                                type="number"
                                value={entryPrice}
                                onChange={(e) =>
                                    setEntryPrice(
                                        e.target
                                            .value
                                    )
                                }
                                placeholder="0"
                                className={
                                    tableInputClass
                                }
                            />
                        </div>

                        <div className="col-span-12 md:col-span-1">
                            <button
                                type="button"
                                onClick={
                                    handleAddToCart
                                }
                                title="Add to cart"
                                className="flex h-9 w-full items-center justify-center rounded-md bg-blue-600 text-white transition-colors hover:bg-blue-700"
                            >
                                <Plus
                                    size={18}
                                />
                            </button>
                        </div>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 border-t border-gray-100 pt-2 text-[10px] text-gray-400 dark:border-gray-800 dark:text-gray-500">
                        <span>
                            <kbd className="rounded bg-gray-100 px-1 dark:bg-gray-800">
                                Alt+Q
                            </kbd>{' '}
                            Qty
                        </span>

                        <span>
                            <kbd className="rounded bg-gray-100 px-1 dark:bg-gray-800">
                                Alt+B
                            </kbd>{' '}
                            Bonus
                        </span>

                        <span>
                            <kbd className="rounded bg-gray-100 px-1 dark:bg-gray-800">
                                Alt+A
                            </kbd>{' '}
                            Add
                        </span>

                        <span>
                            <kbd className="rounded bg-gray-100 px-1 dark:bg-gray-800">
                                Alt+P
                            </kbd>{' '}
                            Receipt
                        </span>

                        <span>
                            <kbd className="rounded bg-gray-100 px-1 dark:bg-gray-800">
                                PgUp/PgDn
                            </kbd>{' '}
                            Search
                        </span>
                    </div>
                </div>

                {/* MAIN WORKSPACE */}
                <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,2fr)_340px]">

                    {/* CART */}
                    <div className="min-w-0 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">

                        <div className="flex h-11 items-center justify-between border-b border-gray-200 px-4 dark:border-gray-800">

                            <div>
                                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                                    Current Sale
                                </h2>
                            </div>

                            <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                                {cart.length}{' '}
                                item
                                {cart.length === 1
                                    ? ''
                                    : 's'}
                            </span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[760px] text-sm">

                                <thead className="bg-gray-50 text-[11px] uppercase tracking-wide text-gray-500 dark:bg-gray-800/60 dark:text-gray-400">
                                    <tr>
                                        <th className="px-4 py-2.5 text-left">
                                            Product
                                        </th>

                                        <th className="w-[85px] px-2 py-2.5 text-center">
                                            Qty
                                        </th>

                                        <th className="w-[85px] px-2 py-2.5 text-center">
                                            Bonus
                                        </th>

                                        <th className="w-[105px] px-2 py-2.5 text-center">
                                            Price
                                        </th>

                                        <th className="w-[90px] px-2 py-2.5 text-center">
                                            Disc %
                                        </th>

                                        <th className="w-[130px] px-4 py-2.5 text-right">
                                            Total
                                        </th>

                                        <th className="w-[44px]" />
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">

                                    {cart.length ===
                                        0 ? (
                                        <tr>
                                            <td
                                                colSpan={
                                                    7
                                                }
                                                className="h-[270px] px-4 py-10 text-center"
                                            >
                                                <div className="flex flex-col items-center justify-center gap-3 text-gray-400">
                                                    <div className="rounded-full bg-gray-50 p-4 dark:bg-gray-800">
                                                        <ShoppingCart
                                                            size={
                                                                30
                                                            }
                                                            className="text-gray-300 dark:text-gray-600"
                                                        />
                                                    </div>

                                                    <div>
                                                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                                            Cart
                                                            is
                                                            empty
                                                        </p>

                                                        <p className="mt-1 text-xs">
                                                            Search
                                                            a
                                                            product
                                                            above
                                                            to
                                                            start
                                                            a
                                                            sale.
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        cart.map(
                                            (
                                                item
                                            ) => (
                                                <tr
                                                    key={
                                                        item.product_id
                                                    }
                                                    className="hover:bg-gray-50/70 dark:hover:bg-gray-800/30"
                                                >
                                                    <td className="px-4 py-2.5">
                                                        <p className="font-medium text-gray-900 dark:text-white">
                                                            {
                                                                item.name
                                                            }
                                                        </p>

                                                        <p className="text-[11px] text-gray-400">
                                                            {
                                                                item.unit
                                                            }
                                                        </p>
                                                    </td>

                                                    <td className="px-2 py-2">
                                                        <input
                                                            type="number"
                                                            value={
                                                                item.quantity
                                                            }
                                                            onChange={(
                                                                e
                                                            ) =>
                                                                updateCartItem(
                                                                    item.product_id,
                                                                    'quantity',
                                                                    e
                                                                        .target
                                                                        .value
                                                                )
                                                            }
                                                            className={
                                                                tableInputClass
                                                            }
                                                        />
                                                    </td>

                                                    <td className="px-2 py-2">
                                                        <input
                                                            type="number"
                                                            value={
                                                                item.bonus
                                                            }
                                                            onChange={(
                                                                e
                                                            ) =>
                                                                updateCartItem(
                                                                    item.product_id,
                                                                    'bonus',
                                                                    e
                                                                        .target
                                                                        .value
                                                                )
                                                            }
                                                            className={
                                                                tableInputClass
                                                            }
                                                        />
                                                    </td>

                                                    <td className="px-2 py-2">
                                                        <input
                                                            type="number"
                                                            value={
                                                                item.unit_price
                                                            }
                                                            onChange={(
                                                                e
                                                            ) =>
                                                                updateCartItem(
                                                                    item.product_id,
                                                                    'unit_price',
                                                                    e
                                                                        .target
                                                                        .value
                                                                )
                                                            }
                                                            className={
                                                                tableInputClass
                                                            }
                                                        />
                                                    </td>

                                                    <td className="px-2 py-2">
                                                        <input
                                                            type="number"
                                                            value={
                                                                item.discount_percent
                                                            }
                                                            onChange={(
                                                                e
                                                            ) =>
                                                                updateCartItem(
                                                                    item.product_id,
                                                                    'discount_percent',
                                                                    e
                                                                        .target
                                                                        .value
                                                                )
                                                            }
                                                            className={
                                                                tableInputClass
                                                            }
                                                        />
                                                    </td>

                                                    <td className="whitespace-nowrap px-4 py-2.5 text-right font-semibold text-gray-900 dark:text-white">
                                                        {money(item.total_price)}
                                                    </td>

                                                    <td className="px-2 py-2 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                removeFromCart(
                                                                    item.product_id
                                                                )
                                                            }
                                                            className="rounded-md p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-600 dark:text-gray-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                                                        >
                                                            <Trash2
                                                                size={
                                                                    15
                                                                }
                                                            />
                                                        </button>
                                                    </td>
                                                </tr>
                                            )
                                        )
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* SUMMARY */}
                    <div className="min-w-0">

                        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 xl:sticky xl:top-20">

                            <h3 className="mb-3 border-b border-gray-100 pb-3 text-base font-bold text-gray-900 dark:border-gray-800 dark:text-white">
                                Summary
                            </h3>

                            <div className="space-y-2.5">

                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-500 dark:text-gray-400">
                                        Subtotal
                                    </span>

                                    <span className="font-medium text-gray-900 dark:text-white">
                                        {money(subtotal)}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between gap-3 text-sm">
                                    <span className="text-gray-500 dark:text-gray-400">
                                        Discount %
                                    </span>

                                    <input
                                        type="number"
                                        value={
                                            cartDiscountPercent
                                        }
                                        onChange={(
                                            e
                                        ) =>
                                            setCartDiscountPercent(
                                                e
                                                    .target
                                                    .value
                                            )
                                        }
                                        placeholder="0"
                                        className={`${tableInputClass} !w-20 !text-right`}
                                    />
                                </div>

                                <div className="flex items-center justify-between gap-3 text-sm">
                                    <span className="text-gray-500 dark:text-gray-400">
                                        Fixed Disc
                                    </span>

                                    <input
                                        type="number"
                                        value={
                                            cartFixedDiscount
                                        }
                                        onChange={(
                                            e
                                        ) =>
                                            setCartFixedDiscount(
                                                e
                                                    .target
                                                    .value
                                            )
                                        }
                                        placeholder="0"
                                        className={`${tableInputClass} !w-24 !text-right`}
                                    />
                                </div>

                                {!isQuotation && (
                                    <div className="flex items-center justify-between gap-3 text-sm">
                                        <span className="text-gray-500 dark:text-gray-400">
                                            Delivery
                                        </span>

                                        <input
                                            type="number"
                                            value={
                                                deliveryCharges
                                            }
                                            onChange={(
                                                e
                                            ) =>
                                                setDeliveryCharges(
                                                    e
                                                        .target
                                                        .value
                                                )
                                            }
                                            placeholder="0"
                                            className={`${tableInputClass} !w-24 !text-right`}
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="my-4 border-t border-gray-100 dark:border-gray-800" />

                            <div className="flex items-end justify-between gap-3">
                                <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                                    Grand Total
                                </span>

                                <span className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                                    {money(grandTotal)}
                                </span>
                            </div>

                            {!isQuotation && (
                                <>
                                    <div className="my-4 border-t border-gray-100 dark:border-gray-800" />

                                    <div className="space-y-3">

                                        <div className="flex items-center justify-between gap-3 text-sm">
                                            <span className="text-gray-500 dark:text-gray-400">
                                                Received
                                            </span>

                                            <input
                                                type="number"
                                                value={
                                                    receivedAmount
                                                }
                                                onChange={(
                                                    e
                                                ) =>
                                                    setReceivedAmount(
                                                        e
                                                            .target
                                                            .value
                                                    )
                                                }
                                                placeholder="0"
                                                className={`${tableInputClass} !w-28 !text-right`}
                                            />
                                        </div>

                                        {change >
                                            0 && (
                                                <div className="flex items-center justify-between text-sm font-semibold text-green-600 dark:text-green-400">
                                                    <span>
                                                        Change
                                                    </span>

                                                    <span>
                                                        {money(change)}
                                                    </span>
                                                </div>
                                            )}

                                        {dueAmount >
                                            0 &&
                                            selectedCustomer && (
                                                <div className="flex items-center justify-between text-sm font-semibold text-red-600 dark:text-red-400">
                                                    <span>
                                                        Ledger
                                                    </span>

                                                    <span>
                                                        {money(dueAmount)}
                                                    </span>
                                                </div>
                                            )}

                                        <div>
                                            <label className="mb-1 block text-[11px] font-medium text-gray-500 dark:text-gray-400">
                                                Payment
                                                Method
                                            </label>

                                            <select
                                                value={
                                                    paymentMethod
                                                }
                                                onChange={(
                                                    e
                                                ) =>
                                                    setPaymentMethod(
                                                        e
                                                            .target
                                                            .value
                                                    )
                                                }
                                                className={
                                                    inputClass
                                                }
                                            >
                                                <option value="cash">
                                                    {
                                                        dict.cash
                                                    }
                                                </option>

                                                <option value="card">
                                                    {
                                                        dict.card
                                                    }
                                                </option>

                                                <option value="bank_transfer">
                                                    {
                                                        dict.bank_transfer
                                                    }
                                                </option>

                                                <option value="other">
                                                    {
                                                        dict.other
                                                    }
                                                </option>
                                            </select>
                                        </div>
                                    </div>
                                </>
                            )}

                            <div className="mt-4 flex gap-2">

                                <button
                                    onClick={() =>
                                        handleCompleteSale(
                                            false
                                        )
                                    }
                                    disabled={
                                        isProcessing
                                    }
                                    className="flex h-10 flex-1 items-center justify-center gap-2 rounded-md bg-blue-600 px-3 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {isProcessing ? (
                                        <Loader2
                                            size={
                                                17
                                            }
                                            className="animate-spin"
                                        />
                                    ) : (
                                        <ShoppingCart
                                            size={
                                                17
                                            }
                                        />
                                    )}

                                    {isQuotation
                                        ? 'Save Quotation'
                                        : 'Complete Sale'}
                                </button>

                                <button
                                    onClick={() =>
                                        handleCompleteSale(
                                            'receipt'
                                        )
                                    }
                                    disabled={
                                        isProcessing
                                    }
                                    title="Print Thermal Receipt (Alt+P)"
                                    className="flex h-10 w-11 items-center justify-center rounded-md bg-green-600 text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                                >
                                    <PrintReceiptIcon
                                        size={18}
                                    />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* QUICK ADD CUSTOMER */}
            {showQuickAdd && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">

                    <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-gray-800 dark:bg-gray-900">

                        <div className="mb-4 flex items-center justify-between">

                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                Quick Add
                                Customer
                            </h3>

                            <button
                                type="button"
                                onClick={() =>
                                    setShowQuickAdd(
                                        false
                                    )
                                }
                                className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-3">

                            <div>
                                <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                                    Name
                                </label>

                                <input
                                    type="text"
                                    value={
                                        newCustName
                                    }
                                    onChange={(
                                        e
                                    ) =>
                                        setNewCustName(
                                            e.target
                                                .value
                                        )
                                    }
                                    className={
                                        inputClass
                                    }
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                                    Phone
                                </label>

                                <input
                                    type="text"
                                    value={
                                        newCustPhone
                                    }
                                    onChange={(
                                        e
                                    ) =>
                                        setNewCustPhone(
                                            e.target
                                                .value
                                        )
                                    }
                                    className={
                                        inputClass
                                    }
                                />
                            </div>

                            <button
                                type="button"
                                onClick={
                                    handleQuickAddCustomer
                                }
                                disabled={
                                    isAddingCust
                                }
                                className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-blue-600 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                                {isAddingCust ? (
                                    <Loader2
                                        size={16}
                                        className="animate-spin"
                                    />
                                ) : (
                                    <UserPlus
                                        size={16}
                                    />
                                )}

                                Save & Select
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}