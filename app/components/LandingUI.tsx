'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingCart, Warehouse, FileBarChart, ShieldCheck, Check, Menu, X, ChevronDown, Mail, MapPin, Sparkles, TrendingUp, Banknote, AlertTriangle } from 'lucide-react'
import ThemeToggle from './ThemeToggle'
import { toast } from 'sonner'
import KarobarXLogo from './KarobarXLogo'

// Custom Real Social Media SVG Icons
const WhatsAppIcon = ({ size = 28 }: { size?: number }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
)

const InstagramIcon = ({ size = 24 }: { size?: number }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>
)

const FacebookIcon = ({ size = 24 }: { size?: number }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z" /></svg>
)

export default function LandingUI({ contactAction }: { contactAction: (formData: FormData) => Promise<void> }) {
    const [scrolled, setScrolled] = useState(false)
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20)
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    const handleContactSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        toast.success('Redirecting to WhatsApp...')
        await contactAction(formData)
    }

    return (
        <div className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white overflow-x-hidden relative transition-colors duration-300">

            {/* Premium Background Grid & Glows */}
            <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_0%,#000_70%,transparent_110%)] pointer-events-none z-0"></div>

            <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-amber-500/10 blur-[150px] rounded-full pointer-events-none" />

            {/* Navbar */}
            <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-amber-500/10 py-3' : 'py-6 bg-transparent'}`}>
                <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
                        <KarobarXLogo />
                    </motion.div>

                    <div className="hidden md:flex items-center gap-8">
                        {['Features', 'About', 'Pricing', 'FAQ', 'Contact'].map((item) => (
                            <a key={item} href={`#${item.toLowerCase()}`} className="text-sm text-gray-600 dark:text-gray-300 hover:text-amber-500 dark:hover:text-amber-400 transition-colors relative group">
                                {item}
                                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-amber-500 group-hover:w-full transition-all duration-300"></span>
                            </a>
                        ))}
                    </div>

                    <div className="flex items-center gap-4">
                        <ThemeToggle />
                        <Link href="/login" className="hidden md:block px-5 py-2 bg-gradient-to-r from-amber-400 to-yellow-600 text-black text-sm font-bold rounded-lg hover:opacity-90 transition-all hover:scale-105">Login</Link>
                        <button className="md:hidden text-gray-600 dark:text-white" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>
                </div>

                <AnimatePresence>
                    {mobileMenuOpen && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="md:hidden bg-white dark:bg-black border-t border-amber-500/10 mt-3 overflow-hidden">
                            <div className="flex flex-col p-6 gap-4">
                                {['Features', 'About', 'Pricing', 'FAQ', 'Contact'].map((item) => (
                                    <a key={item} href={`#${item.toLowerCase()}`} onClick={() => setMobileMenuOpen(false)} className="text-gray-600 dark:text-gray-300 hover:text-amber-500 dark:hover:text-amber-400">{item}</a>
                                ))}
                                <Link href="/login" className="px-5 py-2 bg-amber-500 text-black text-center font-bold rounded-lg">Login</Link>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </nav>

            {/* Hero Section */}
            <section className="relative min-h-screen flex flex-col items-center justify-center p-8 text-center overflow-hidden pt-20 z-10">
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="inline-flex items-center gap-2 px-4 py-1.5 border border-amber-500/20 bg-amber-500/5 rounded-full text-sm text-amber-600 dark:text-amber-400 font-medium mb-8 z-10">
                    <Sparkles size={14} /> MANAGE • GROW • SUCCEED
                </motion.div>

                <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }} className="text-5xl md:text-7xl font-extrabold tracking-tight max-w-4xl z-10 text-gray-900 dark:text-white">
                    The Ultimate <span className="bg-gradient-to-r from-amber-200 to-yellow-600 bg-clip-text text-transparent">POS & Inventory</span> SaaS
                </motion.h1>

                <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mt-6 z-10">
                    Empower your business with real-time inventory tracking, lightning-fast POS, and powerful analytics. Built for retail, pharmacies, and hardware stores.
                </motion.p>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }} className="flex flex-col sm:flex-row justify-center gap-4 pt-8 z-10">
                    <a href="#pricing" className="px-8 py-4 bg-gradient-to-r from-amber-400 to-yellow-600 text-black font-semibold rounded-lg hover:opacity-90 transition-all hover:scale-105 shadow-lg shadow-amber-500/20 text-lg">Get Started Now</a>
                    <a href="#features" className="px-8 py-4 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900/50 text-gray-700 dark:text-gray-300 font-semibold rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all hover:scale-105 text-lg">Explore Features</a>
                </motion.div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-24 px-8 bg-gray-50 dark:bg-black border-t border-amber-500/10 transition-colors duration-300">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="text-4xl font-bold text-gray-900 dark:text-white">Everything you need to run your business</motion.h2>
                        <p className="text-gray-500 dark:text-gray-400 mt-4">Powerful tools designed for modern retail</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            { icon: ShoppingCart, title: "Lightning POS", desc: "Process sales in seconds with automatic stock deduction and receipt generation." },
                            { icon: Warehouse, title: "Smart Inventory", desc: "Track batches, expiry dates, and manage stock across multiple warehouses." },
                            { icon: FileBarChart, title: "Analytics & Profit", desc: "Know your true net profit with expense tracking and visual sales charts." },
                            { icon: ShieldCheck, title: "Secure & Cloud", desc: "Bank-level security with cloud backup. Access your data from anywhere." },
                            { icon: Check, title: "CRM & Suppliers", desc: "Manage customers, track supplier payments, and record purchases easily." },
                            { icon: Sparkles, title: "Multi-Language", desc: "Full English and Urdu (RTL) support with Dark Mode for eye comfort." }
                        ].map((feature, i) => (
                            <motion.div key={i} initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.1 }} whileHover={{ y: -5, borderColor: 'rgba(251, 191, 36, 0.3)' }} className="bg-white dark:bg-gray-900/50 p-8 rounded-2xl border border-gray-200 dark:border-gray-800 transition-all group">
                                <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                    <feature.icon className="text-amber-500 dark:text-amber-400" size={24} />
                                </div>
                                <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">{feature.title}</h3>
                                <p className="text-gray-500 dark:text-gray-400">{feature.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* About Section */}
            <section id="about" className="py-24 px-8">
                <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
                    <motion.div initial={{ opacity: 0, x: -50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
                        <h2 className="text-4xl font-bold mb-6 text-gray-900 dark:text-white">Why choose KarobarX?</h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-8 text-lg">We provide a complete ecosystem for your business. From the moment a customer walks in, to the moment you calculate your monthly profit, our system handles it all seamlessly.</p>
                        <ul className="space-y-4">
                            {['No hardware required, runs on any device', 'Offline capabilities coming soon', 'Dedicated support team', 'Regular updates and new features'].map((item) => (
                                <li key={item} className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                                    <div className="w-6 h-6 bg-amber-500/20 rounded-full flex items-center justify-center"><Check className="text-amber-500 dark:text-amber-400" size={14} /></div>
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </motion.div>

                    {/* Realistic Dashboard Mockup */}
                    <motion.div initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.6 }} whileHover={{ scale: 1.02 }} className="bg-gradient-to-br from-amber-500/20 to-yellow-700/20 p-1 rounded-2xl shadow-2xl shadow-amber-500/10">
                        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 aspect-video flex flex-col gap-4">
                            <div className="grid grid-cols-3 gap-4">
                                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg flex flex-col gap-1">
                                    <Banknote size={16} className="text-green-500" />
                                    <p className="text-[10px] text-gray-500 dark:text-gray-400">Today&apos;s Sales</p>
                                    <p className="text-sm font-bold text-gray-900 dark:text-white">Rs. 15,400</p>
                                </div>
                                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg flex flex-col gap-1">
                                    <TrendingUp size={16} className="text-blue-500" />
                                    <p className="text-[10px] text-gray-500 dark:text-gray-400">Monthly Sales</p>
                                    <p className="text-sm font-bold text-gray-900 dark:text-white">Rs. 450k</p>
                                </div>
                                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg flex flex-col gap-1">
                                    <AlertTriangle size={16} className="text-red-500" />
                                    <p className="text-[10px] text-gray-500 dark:text-gray-400">Low Stock</p>
                                    <p className="text-sm font-bold text-gray-900 dark:text-white">3 Items</p>
                                </div>
                            </div>
                            <div className="flex-1 bg-gray-50 dark:bg-gray-800 rounded-lg p-3 flex flex-col gap-2">
                                <p className="text-[10px] text-gray-500 dark:text-gray-400">Sales Analytics</p>
                                <div className="flex-1 flex items-end gap-2">
                                    <div className="w-full bg-blue-500/80 rounded-t" style={{ height: '40%' }}></div>
                                    <div className="w-full bg-blue-500/80 rounded-t" style={{ height: '60%' }}></div>
                                    <div className="w-full bg-blue-500/80 rounded-t" style={{ height: '80%' }}></div>
                                    <div className="w-full bg-blue-500/80 rounded-t" style={{ height: '50%' }}></div>
                                    <div className="w-full bg-blue-500/80 rounded-t" style={{ height: '90%' }}></div>
                                    <div className="w-full bg-blue-500/80 rounded-t" style={{ height: '70%' }}></div>
                                    <div className="w-full bg-blue-500/80 rounded-t" style={{ height: '100%' }}></div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className="py-24 px-8 bg-gray-50 dark:bg-black border-t border-amber-500/10 transition-colors duration-300">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="text-4xl font-bold text-gray-900 dark:text-white">Simple, transparent pricing</motion.h2>
                        <p className="text-gray-500 dark:text-gray-400 mt-4">Choose the plan that fits your business size</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
                        {/* 3 Months Plan */}
                        <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.1 }} whileHover={{ y: -10 }} className="bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl p-8 space-y-6 flex flex-col">
                            <div className="space-y-2"><h3 className="text-2xl font-bold text-gray-900 dark:text-white">3 Months Plan</h3><p className="text-gray-600 dark:text-gray-400">For small shops getting started</p></div>
                            <div>
                                <span className="text-4xl font-extrabold text-gray-900 dark:text-white">Rs. 15k</span>
                                <span className="text-gray-600 dark:text-gray-400"> / Setup</span>
                                <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">Then Rs. 10,000 / 3 months</p>
                            </div>
                            <ul className="space-y-3 text-left flex-grow">
                                {['Up to 500 Products', 'Single Location', 'Basic POS & Invoicing', 'Email Support'].map((feature) => (
                                    <li key={feature} className="flex items-center gap-3 text-gray-700 dark:text-gray-300"><Check className="text-amber-500 dark:text-amber-400 flex-shrink-0" size={18} />{feature}</li>
                                ))}
                            </ul>
                            <a href="#contact" className="block w-full py-3 px-6 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-bold rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-all">Get Started</a>
                        </motion.div>

                        {/* 1 Year Plan (Highlighted) */}
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.2 }} whileHover={{ y: -10 }} className="bg-white dark:bg-gray-900/80 border-2 border-amber-500 rounded-2xl shadow-2xl shadow-amber-500/20 p-8 space-y-6 flex flex-col relative scale-105 z-10">
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-amber-500 text-black text-xs font-bold px-3 py-1 rounded-full">MOST POPULAR</div>
                            <div className="space-y-2"><h3 className="text-2xl font-bold text-gray-900 dark:text-white">1 Year Plan</h3><p className="text-gray-600 dark:text-gray-300">For growing businesses</p></div>
                            <div>
                                <span className="text-4xl font-extrabold text-amber-600 dark:text-amber-400">Rs. 25k</span>
                                <span className="text-gray-600 dark:text-gray-300"> / Setup</span>
                                <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">Then Rs. 20,000 / year</p>
                            </div>
                            <ul className="space-y-3 text-left flex-grow">
                                {['Unlimited Products', 'Multi-Warehouse Tracking', 'Premium Analytics Dashboard', 'Customer & Supplier CRM', 'Priority Support'].map((feature) => (
                                    <li key={feature} className="flex items-center gap-3 text-gray-700 dark:text-gray-200"><Check className="text-amber-500 dark:text-amber-400 flex-shrink-0" size={18} />{feature}</li>
                                ))}
                            </ul>
                            <a href="#contact" className="block w-full py-3 px-6 bg-gradient-to-r from-amber-400 to-yellow-600 text-black font-bold rounded-lg hover:opacity-90 transition-all shadow-lg shadow-amber-500/20">Subscribe & Get Access</a>
                        </motion.div>

                        {/* 6 Months Plan */}
                        <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.3 }} whileHover={{ y: -10 }} className="bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl p-8 space-y-6 flex flex-col">
                            <div className="space-y-2"><h3 className="text-2xl font-bold text-gray-900 dark:text-white">6 Months Plan</h3><p className="text-gray-600 dark:text-gray-400">For established shops</p></div>
                            <div>
                                <span className="text-4xl font-extrabold text-gray-900 dark:text-white">Rs. 15k</span>
                                <span className="text-gray-600 dark:text-gray-400"> / Setup</span>
                                <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">Then Rs. 15,000 / 6 months</p>
                            </div>
                            <ul className="space-y-3 text-left flex-grow">
                                {['Up to 2000 Products', 'Single Location', 'Advanced POS & Invoicing', 'Phone Support'].map((feature) => (
                                    <li key={feature} className="flex items-center gap-3 text-gray-700 dark:text-gray-300"><Check className="text-amber-500 dark:text-amber-400 flex-shrink-0" size={18} />{feature}</li>
                                ))}
                            </ul>
                            <a href="#contact" className="block w-full py-3 px-6 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-bold rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-all">Get Started</a>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* FAQ Section */}
            <section id="faq" className="py-24 px-8">
                <div className="max-w-3xl mx-auto">
                    <h2 className="text-4xl font-bold text-center mb-16 text-gray-900 dark:text-white">Frequently Asked Questions</h2>
                    <div className="space-y-4">
                        {[
                            { q: "Do I need to install any software?", a: "No! KarobarX runs entirely in your web browser. You can access it from your computer, tablet, or phone." },
                            { q: "Is my data safe?", a: "Absolutely. We use enterprise-grade cloud hosting with daily backups. Your data is encrypted and completely isolated from other shops." },
                            { q: "Can I use it for my specific type of business?", a: "Yes, our system is designed to be flexible. It works perfectly for retail stores, pharmacies, hardware stores, and restaurants." },
                            { q: "What if I need help setting it up?", a: "We offer full onboarding support. Once you subscribe, our team will contact you to help set up your shop and train your staff." }
                        ].map((item, i) => <FAQItem key={i} q={item.q} a={item.a} />)}
                    </div>
                </div>
            </section>

            {/* Contact Section */}
            <section id="contact" className="py-24 px-8 bg-gray-50 dark:bg-black border-t border-amber-500/10 transition-colors duration-300">
                <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16">
                    <div>
                        <h2 className="text-4xl font-bold mb-6 text-gray-900 dark:text-white">Get in touch</h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-8">Ready to upgrade your business? Send us a message and we will get back to you within 24 hours.</p>
                        <div className="space-y-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-amber-500/10 rounded-lg flex items-center justify-center"><Mail className="text-amber-500 dark:text-amber-400" size={20} /></div>
                                <div><p className="font-medium text-gray-900 dark:text-white">Email</p><p className="text-gray-500 dark:text-gray-500">karrobarx@gmail.com</p></div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-[#25D366]/10 rounded-lg flex items-center justify-center"><WhatsAppIcon size={20} /></div>
                                <div><p className="font-medium text-gray-900 dark:text-white">WhatsApp</p><p className="text-gray-500 dark:text-gray-500">+92 316 7456949</p></div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-amber-500/10 rounded-lg flex items-center justify-center"><MapPin className="text-amber-500 dark:text-amber-400" size={20} /></div>
                                <div><p className="font-medium text-gray-900 dark:text-white">Location</p><p className="text-gray-500 dark:text-gray-500">Sargodha, Pakistan</p></div>
                            </div>
                        </div>
                        <div className="flex gap-4 mt-8">
                            <motion.a href="https://wa.me/923167456949" target="_blank" rel="noopener noreferrer" whileHover={{ scale: 1.1, y: -4 }} whileTap={{ scale: 0.9 }} className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-[#25D366] hover:text-white hover:border-[#25D366] transition-colors duration-300 shadow-md">
                                <WhatsAppIcon size={22} />
                            </motion.a>
                            <motion.a href="https://instagram.com" target="_blank" rel="noopener noreferrer" whileHover={{ scale: 1.1, y: -4 }} whileTap={{ scale: 0.9 }} className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-gradient-to-tr hover:from-yellow-400 hover:via-pink-500 hover:to-purple-600 hover:text-white hover:border-pink-500 transition-colors duration-300 shadow-md">
                                <InstagramIcon size={22} />
                            </motion.a>
                            <motion.a href="https://facebook.com" target="_blank" rel="noopener noreferrer" whileHover={{ scale: 1.1, y: -4 }} whileTap={{ scale: 0.9 }} className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-[#1877F2] hover:text-white hover:border-[#1877F2] transition-colors duration-300 shadow-md">
                                <FacebookIcon size={22} />
                            </motion.a>
                        </div>
                    </div>

                    <form onSubmit={handleContactSubmit} className="bg-white dark:bg-gray-900/50 p-8 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-6 shadow-xl">
                        <div><label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Your Name</label><input type="text" name="name" required placeholder="John Doe" className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-black text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all" /></div>
                        <div><label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Email</label><input type="email" name="email" required placeholder="you@example.com" className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-black text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all" /></div>
                        <div><label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Business Type</label><select name="business_type" className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-black text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"><option>Retail / Grocery</option><option>Pharmacy</option><option>Hardware / Iron</option><option>Restaurant / Food</option><option>Other</option></select></div>
                        <div><label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Message</label><textarea name="message" required rows={4} placeholder="Tell us about your business needs..." className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-black text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"></textarea></div>
                        <button type="submit" className="w-full py-3 bg-gradient-to-r from-amber-400 to-yellow-600 text-black font-bold rounded-lg hover:opacity-90 transition-all flex items-center justify-center gap-2">
                            <WhatsAppIcon size={18} /> Send via WhatsApp
                        </button>
                    </form>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 px-8 border-t border-amber-500/10 text-center">
                <p className="text-gray-500 dark:text-gray-600">© 2026 KarobarX. All rights reserved.</p>
            </footer>

            {/* Floating WhatsApp Button */}
            <a href="https://wa.me/923167456949" target="_blank" rel="noopener noreferrer" className="fixed bottom-8 right-8 z-50 group">
                <div className="absolute inset-0 bg-[#25D366] rounded-full animate-ping opacity-20"></div>
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="relative w-16 h-16 bg-[#25D366] rounded-full flex items-center justify-center shadow-lg shadow-[#25D366]/30 text-white">
                    <WhatsAppIcon size={32} />
                </motion.div>
            </a>

        </div>
    )
}

function FAQItem({ q, a }: { q: string, a: string }) {
    const [open, setOpen] = useState(false)
    return (
        <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden bg-white dark:bg-gray-900/50">
            <button onClick={() => setOpen(!open)} className="w-full p-6 flex justify-between items-center text-left">
                <span className="font-medium text-lg text-gray-900 dark:text-white">{q}</span>
                <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.3, ease: "easeInOut" }} className={open ? 'text-amber-500 dark:text-amber-400' : 'text-gray-500 dark:text-gray-500'}>
                    <ChevronDown size={20} />
                </motion.div>
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: "easeInOut" }} className="overflow-hidden">
                        <p className="p-6 pt-0 text-gray-600 dark:text-gray-400">{a}</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}