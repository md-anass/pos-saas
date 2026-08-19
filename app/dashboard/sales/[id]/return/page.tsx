// Force TS Server re-evaluation
import { createClient } from '@/lib/supabase/server'
import ReturnClient from './ReturnClient'

export default async function ProcessReturnPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const supabase = await createClient()

    // Fetch the original sale items
    const { data: saleItems } = await supabase
        .from('sale_items')
        .select('*')
        .eq('sale_id', id)

    return <ReturnClient saleId={id} items={saleItems || []} />
}