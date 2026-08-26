'use client'

import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { dictionaries } from '@/lib/dictionary'
import { TrendingUp, Package } from 'lucide-react'

export default function DashboardCharts({ salesByDay, topProducts, lang }: { salesByDay: Array<{ name: string; Sales: number }>; topProducts: Array<{ name: string; Units: number }>; lang: string }) {
    const t = dictionaries[lang] || dictionaries['en']

    return (
        <div className="grid grid-cols-1 gap-3">

            {/* Sales Analytics Graph */}
            <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col">
                <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white mb-3">
                    <TrendingUp className="text-blue-600 dark:text-blue-400" size={20} /> {t.charts.sales_analytics}
                </h3>
                <div className="flex-1 min-h-[220px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={salesByDay}>
                            <defs>
                                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(120, 120, 120, 0.1)" />
                            <XAxis dataKey="name" stroke="rgba(120, 120, 120, 0.8)" fontSize={12} />
                            <YAxis stroke="rgba(120, 120, 120, 0.8)" fontSize={12} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'rgba(30, 30, 30, 0.9)',
                                    border: 'none',
                                    borderRadius: '8px',
                                    color: '#fff'
                                }}
                            />
                            <Area type="monotone" dataKey="Sales" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Top Selling Products */}
            <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col">
                <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white mb-3">
                    <Package className="text-green-600 dark:text-green-400" size={20} /> {t.charts.top_products}
                </h3>
                {topProducts.length > 0 ? (
                    <div className="flex-1 min-h-[180px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={topProducts} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(120, 120, 120, 0.1)" horizontal={false} />
                                <XAxis type="number" stroke="rgba(120, 120, 120, 0.8)" fontSize={12} />
                                <YAxis dataKey="name" type="category" stroke="rgba(120, 120, 120, 0.8)" fontSize={12} width={80} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'rgba(30, 30, 30, 0.9)',
                                        border: 'none',
                                        borderRadius: '8px',
                                        color: '#fff'
                                    }}
                                    cursor={{ fill: 'rgba(120, 120, 120, 0.1)' }}
                                />
                                <Bar dataKey="Units" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-center text-gray-500 dark:text-gray-400 text-sm">
                        {t.charts.no_sales_data}
                    </div>
                )}
            </div>
        </div>
    )
}