import { updatePassword } from './actions'
import UpdatePasswordUI from '@/app/components/UpdatePasswordUI'

export default async function UpdatePasswordPage({
    searchParams,
}: {
    searchParams: Promise<{ error?: string }>
}) {
    const params = await searchParams
    return <UpdatePasswordUI error={params.error} updateAction={updatePassword} />
}