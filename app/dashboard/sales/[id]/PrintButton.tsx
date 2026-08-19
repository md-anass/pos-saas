'use client'

export default function PrintButton() {
    return (
        <button
            onClick={() => window.print()}
            className="text-sm text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-md transition-colors"
        >
            Print Invoice
        </button>
    )
}