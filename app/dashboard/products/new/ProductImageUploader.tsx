'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Loader2, Plus } from 'lucide-react'

export default function ProductImageUploader() {
    const [imageUrl, setImageUrl] = useState<string>('')
    const [isUploading, setIsUploading] = useState(false)
    const [shopId, setShopId] = useState<string>('')
    const supabase = createClient()

    // Fetch the shop ID securely on component mount
    useEffect(() => {
        const getShop = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data: shop } = await supabase
                    .from('shops')
                    .select('id')
                    .eq('owner_id', user.id)
                    .single()

                if (shop) setShopId(shop.id)
            }
        }
        getShop()
    }, [supabase])

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !shopId) {
            toast.error('Shop context not loaded yet. Please wait a moment.')
            return
        }

        // 1. FILE SIZE VALIDATION (Max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            toast.error('File is too large. Maximum size is 2MB.')
            return
        }

        // 2. FILE TYPE VALIDATION (Images only)
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp']
        if (!allowedTypes.includes(file.type)) {
            toast.error('Invalid file type. Only JPG, PNG, or WEBP images are allowed.')
            return
        }

        setIsUploading(true)
        const fileExt = file.name.split('.').pop()

        // 3. SECURE PATH: Save inside a folder named after the shop_id
        // This perfectly matches the Storage RLS policy: (storage.foldername(name))[1] = shop_id
        const fileName = `${shopId}/prod-${Date.now()}.${fileExt}`

        try {
            // Upload directly to Supabase Storage
            const { error } = await supabase.storage
                .from('product-images')
                .upload(fileName, file)

            if (error) throw error

            // Get the public URL
            const { data } = supabase.storage
                .from('product-images')
                .getPublicUrl(fileName)

            setImageUrl(data.publicUrl)
            toast.success('Image uploaded!')
        } catch (error: any) {
            toast.error(error.message || 'Failed to upload image.')
        } finally {
            setIsUploading(false)
        }
    }

    return (
        <div>
            {/* Hidden input to send the URL in the form submission */}
            <input type="hidden" name="image_url" value={imageUrl} />

            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Product Image (Optional)</label>

            <div className="flex items-center gap-4">
                {/* Small compact upload box */}
                <label className={`relative flex items-center justify-center w-20 h-20 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors overflow-hidden ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                    {imageUrl ? (
                        <img src={imageUrl} alt="Product" className="w-full h-full object-cover" />
                    ) : (
                        <div className="flex flex-col items-center justify-center text-gray-400">
                            {isUploading ? (
                                <Loader2 className="animate-spin" size={20} />
                            ) : (
                                <Plus size={24} />
                            )}
                        </div>
                    )}
                    <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={isUploading} />
                </label>

                {/* Remove Image Button */}
                {imageUrl && (
                    <button
                        type="button"
                        onClick={() => setImageUrl('')}
                        className="text-sm text-red-600 dark:text-red-400 hover:underline"
                    >
                        Remove Image
                    </button>
                )}
            </div>
        </div>
    )
}