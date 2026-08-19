'use client'

export default function ReceiptPrintButton() {
    return (
        <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors no-print"
        >
            Print Receipt
        </button>
    )
}