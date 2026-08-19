export function exportToCSV(filename: string, headers: string[], rows: any[]) {
    const csvRows = []

    // Add headers
    csvRows.push(headers.join(','))

    // Add rows
    for (const row of rows) {
        const values = headers.map(header => {
            // Handle nested properties like 'suppliers.name'
            const keys = header.split('.')
            let value: any = row
            for (const key of keys) {
                value = value?.[key]
            }

            // Escape quotes and wrap in quotes if contains comma
            const stringValue = String(value ?? '')
            return stringValue.includes(',') ? `"${stringValue.replace(/"/g, '""')}"` : stringValue
        })
        csvRows.push(values.join(','))
    }

    // Create blob and download
    const csvString = csvRows.join('\n')
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
}