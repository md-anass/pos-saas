export const DEFAULT_CURRENCY = 'PKR'

export function normalizeCurrency(_currency?: string | null): string {
    void _currency
    return DEFAULT_CURRENCY
}

export function formatCurrency(
    value: number | string | null | undefined,
    _currency?: string | null,
): string {
    void _currency
    const parsed = typeof value === 'number' ? value : Number(value || 0)
    const safeAmount = Number.isFinite(parsed) ? parsed : 0
    const formatted = Math.abs(safeAmount).toLocaleString('en-PK', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })
    return (safeAmount < 0 ? '-' : '') + 'Rs. ' + formatted
}