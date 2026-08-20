export default function KarobarXLogo() {
    return (
        <div className="flex items-center gap-2.5">
            {/* Gold Gradient Box with 'K' */}
            <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-700 flex items-center justify-center shadow-lg shadow-amber-500/20">
                <span className="text-2xl font-black text-black">K</span>
            </div>
            {/* KarobarX Text */}
            <span className="text-xl md:text-2xl font-bold tracking-tight">
                <span className="text-gray-900 dark:text-white">Karobar</span>
                <span className="bg-gradient-to-r from-amber-400 to-yellow-600 bg-clip-text text-transparent">X</span>
            </span>
        </div>
    )
}