'use client'

import { useState, useCallback, useRef } from 'react'
import Cropper from 'react-easy-crop'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Upload, Check, X } from 'lucide-react'

type Point = { x: number; y: number }
type Area = { x: number; y: number; width: number; height: number }

export default function LogoUploader({ currentLogo, shopId }: { currentLogo?: string, shopId: string }) {
    const inputRef = useRef<HTMLInputElement>(null)
    const [imageSrc, setImageSrc] = useState<string | null>(null)
    const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
    const [zoom, setZoom] = useState(1)
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
    const [isProcessing, setIsProcessing] = useState(false)

    const supabase = createClient()

    const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
        setCroppedAreaPixels(croppedAreaPixels)
    }, [])

    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0]
            const reader = new FileReader()
            reader.readAsDataURL(file)
            reader.onload = () => setImageSrc(reader.result as string)
        }
    }

    const createCroppedImage = async () => {
        if (!imageSrc || !croppedAreaPixels) return null

        const image = new Image()
        image.crossOrigin = "anonymous" // Helps with canvas security
        image.src = imageSrc

        await new Promise((resolve, reject) => {
            image.onload = resolve
            image.onerror = reject
        })

        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')

        if (!ctx) return null

        const size = croppedAreaPixels.width
        canvas.width = size
        canvas.height = size

        ctx.drawImage(
            image,
            croppedAreaPixels.x,
            croppedAreaPixels.y,
            croppedAreaPixels.width,
            croppedAreaPixels.height,
            0,
            0,
            size,
            size
        )

        ctx.globalCompositeOperation = 'destination-in'
        ctx.beginPath()
        ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
        ctx.closePath()
        ctx.fill()

        // FIXED: If toBlob fails, reject the promise so it doesn't hang forever!
        return new Promise<Blob>((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (blob) resolve(blob)
                else reject(new Error('Canvas failed to generate image.'))
            }, 'image/png')
        })
    }

    const handleSave = async () => {
        setIsProcessing(true)

        try {
            toast.info('Processing image...')
            const blob = await createCroppedImage()
            if (!blob) throw new Error('Failed to process image.')

            toast.info('Uploading to storage...')
            // SECURE PATH: Save inside a folder named after the shop_id
            const fileName = `${shopId}/logo-${Date.now()}.png`
            const file = new File([blob], fileName, { type: 'image/png' })

            const { error: uploadError } = await supabase.storage
                .from('shop-logos')
                .upload(fileName, file)

            if (uploadError) throw uploadError

            toast.info('Updating database...')
            const { data: publicUrlData } = supabase.storage
                .from('shop-logos')
                .getPublicUrl(fileName)

            if (!publicUrlData) throw new Error('Failed to get public URL.')

            const { error: updateError } = await supabase
                .from('shops')
                .update({ logo_url: publicUrlData.publicUrl })
                .eq('id', shopId)

            if (updateError) throw updateError

            toast.success('Logo uploaded successfully!')
            setImageSrc(null)
            window.location.reload()

        } catch (error: any) {
            console.error('Logo upload error:', error)
            toast.error(error.message || 'Failed to upload logo.')
            setIsProcessing(false) // Unlock the button if it fails
        } finally {
            // Ensure it unlocks no matter what
            setIsProcessing(false)
        }
    }

    const handleCancel = () => {
        setImageSrc(null)
        if (inputRef.current) inputRef.current.value = ''
    }

    return (
        <div>
            <input
                type="file"
                ref={inputRef}
                onChange={onFileChange}
                accept="image/*"
                className="hidden"
            />

            {!imageSrc && (
                <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden border border-gray-200 dark:border-gray-700 shadow-inner">
                        {currentLogo ? (
                            <img src={currentLogo} alt="Shop Logo" className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-gray-400 text-xs">No Logo</span>
                        )}
                    </div>
                    <div>
                        <button
                            type="button"
                            onClick={() => inputRef.current?.click()}
                            className="flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                        >
                            <Upload size={16} />
                            Upload Circular Logo
                        </button>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">PNG or JPG. Corners will be transparent.</p>
                    </div>
                </div>
            )}

            {imageSrc && (
                <div className="space-y-4">
                    <div className="relative w-full h-64 bg-gray-900 rounded-lg overflow-hidden">
                        <Cropper
                            image={imageSrc}
                            crop={crop}
                            zoom={zoom}
                            aspect={1}
                            onCropChange={setCrop}
                            onZoomChange={setZoom}
                            onCropComplete={onCropComplete}
                            cropShape="round"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Zoom</span>
                        <input
                            type="range"
                            value={zoom}
                            min={1}
                            max={3}
                            step={0.1}
                            onChange={(e) => setZoom(Number(e.target.value))}
                            className="w-full"
                        />
                    </div>

                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={handleCancel}
                            disabled={isProcessing}
                            className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
                        >
                            <X size={14} /> Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={isProcessing}
                            className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700"
                        >
                            <Check size={14} />
                            {isProcessing ? 'Saving...' : 'Save Circular Logo'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}