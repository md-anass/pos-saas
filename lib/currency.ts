export const DEFAULT_CURRENCY = 'PKR'

export function normalizeCurrency(currency?: string | null): string {
    const normalized = currency?.trim().toUpperCase()
    return normalized && /^[A-Z]{3}$/.test(normalized)
        ? normalized
        : DEFAULT_CURRENCY
}

export function formatCurrency(
    value: number | string | null | undefined,
    currency?: string | null,
): string {
    const amount = Number(value || 0)
    const safeAmount = Number.isFinite(amount) ? amount : 0
    const currencyCode = normalizeCurrency(currency)

    if (currencyCode === 'PKR') {
        const formatted = new Intl.NumberFormat('en-PK', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(Math.abs(safeAmount))
        return `${safeAmount < 0 ? '-' : ''}Rs. ${formatted}`
    }

    try {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currencyCode,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(safeAmount)
    } catch {
        return `${currencyCode} ${safeAmount.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}`
    }
}
