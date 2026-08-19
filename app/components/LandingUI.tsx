'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingCart, Warehouse, FileBarChart, ShieldCheck, Check, Menu, X, ChevronDown, Mail, MapPin, Sparkles, Building, Store, ArrowRight } from 'lucide-react'
import ThemeToggle from './ThemeToggle'

// Custom Real Social Media SVG Icons
const WhatsAppIcon = ({ size = 28 }: { size?: number }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
)

const InstagramIcon = ({ size = 24 }: { size?: number }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.85-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>
)

const FacebookIcon = ({ size = 24 }: { size?: number }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z" /></svg>
)

export default function LandingUI() {
    const [scrolled, setScrolled] = useState(false)
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20)
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    return (
        <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white overflow-x-hidden transition-colors duration-300 relative">

            {/* Premium Background Grid */}
            <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_0%,#000_70%,transparent_110%)] pointer-events-none z-0"></div>

            {/* Navbar */}
            <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 py-3' : 'py-6 bg-transparent'}`}>
                <div className="max-w-7xl mx-auto px-6 flex justify-between items-center relative z-10">
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }} className="flex items-center gap-2 text-xl font-bold">
                        <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                            <Store size={20} />
                        </div>
                        <span className="bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">POS SaaS Pro</span>
                    </motion.div>

                    <div className="hidden md:flex items-center gap-8">
                        {['Features', 'About', 'Pricing', 'FAQ', 'Contact'].map((item) => (
                            <a key={item} href={`#${item.toLowerCase()}`} className="text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors relative group">
                                {item}
                                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-600 group-hover:w-full transition-all duration-300"></span>
                            </a>
                        ))}
                    </div>

                    <div className="flex items-center gap-4">
                        <ThemeToggle />
                        <Link href="/login" className="hidden md:block px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-all hover:scale-105 shadow-lg shadow-blue-600/20">Login</Link>
                        <button className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>
                </div>

                <AnimatePresence>
                    {mobileMenuOpen && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="md:hidden bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 mt-3 overflow-hidden">
                            <div className="flex flex-col p-6 gap-4">
                                {['Features', 'About', 'Pricing', 'FAQ', 'Contact'].map((item) => (
                                    <a key={item} href={`#${item.toLowerCase()}`} onClick={() => setMobileMenuOpen(false)} className="text-gray-600 dark:text-gray-300 hover:text-blue-600">{item}</a>
                                ))}
                                <Link href="/login" className="px-5 py-2 bg-blue-600 text-white text-center font-medium rounded-lg">Login</Link>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </nav>

            {/* Hero Section */}
            <section className="relative min-h-screen flex flex-col items-center justify-center p-8 text-center overflow-hidden pt-20 z-10">
                <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-blue-500/20 dark:bg-blue-500/10 blur-[120px] rounded-full pointer-events-none"></motion.div>
                <motion.div animate={{ scale: [1.2, 1, 1.2], opacity: [0.5, 0.3, 0.5] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }} className="absolute bottom-20 right-1/4 w-[400px] h-[400px] bg-cyan-500/20 dark:bg-cyan-500/10 blur-[120px] rounded-full pointer-events-none"></motion.div>

                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="inline-flex items-center gap-2 px-4 py-1.5 border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/50 rounded-full text-sm text-blue-600 dark:text-blue-400 font-medium mb-8 z-10">
                    <Sparkles size={14} /> Enterprise Grade Multi-Tenant Platform
                </motion.div>

                <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }} className="text-5xl md:text-7xl font-extrabold tracking-tight max-w-4xl z-10">
                    The Ultimate <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">POS & Inventory</span> SaaS
                </motion.h1>

                <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mt-6 z-10">
                    Empower your business with real-time inventory tracking, lightning-fast POS, and powerful analytics. Built for retail, pharmacies, and hardware stores.
                </motion.p>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }} className="flex flex-col sm:flex-row justify-center gap-4 pt-8 z-10">
                    <motion.a href="#pricing" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="px-8 py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/30 text-lg flex items-center justify-center gap-2">
                        Get Started Now <ArrowRight size={20} />
                    </motion.a>
                    <motion.a href="#features" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="px-8 py-4 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-white font-semibold rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-lg">
                        Explore Features
                    </motion.a>
                </motion.div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-24 px-8 bg-gray-50 dark:bg-gray-900 transition-colors duration-300 relative z-10">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="text-4xl font-bold">Everything you need to run your business</motion.h2>
                        <p className="text-gray-500 dark:text-gray-400 mt-4">Powerful tools designed for modern retail</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            { icon: ShoppingCart, title: "Lightning POS", desc: "Process sales in seconds with automatic stock deduction and receipt generation." },
                            { icon: Warehouse, title: "Smart Inventory", desc: "Track batches, expiry dates, and manage stock across multiple warehouses." },
                            { icon: FileBarChart, title: "Analytics & Profit", desc: "Know your true net profit with expense tracking and visual sales charts." },
                            { icon: ShieldCheck, title: "Secure & Cloud", desc: "Bank-level security with cloud backup. Access your data from anywhere." },
                            { icon: Check, title: "CRM & Suppliers", desc: "Manage customers, track supplier payments, and record purchases easily." },
                            { icon: Building, title: "Multi-Language", desc: "Full English and Urdu (RTL) support with Dark Mode for eye comfort." }
                        ].map((feature, i) => (
                            <motion.div key={i} initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.1 }} whileHover={{ y: -10, boxShadow: "0 20px 25px -5px rgb(59 130 246 / 0.1), 0 8px 10px -6px rgb(59 130 246 / 0.1)" }} className="bg-white dark:bg-gray-800 p-8 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-blue-500 transition-all group">
                                <motion.div whileHover={{ rotate: 10, scale: 1.1 }} className="w-12 h-12 bg-blue-50 dark:bg-blue-950 rounded-xl flex items-center justify-center mb-6 transition-transform">
                                    <feature.icon className="text-blue-600 dark:text-blue-400" size={24} />
                                </motion.div>
                                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                                <p className="text-gray-500 dark:text-gray-400">{feature.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* About Section */}
            <section id="about" className="py-24 px-8 relative z-10">
                <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
                    <motion.div initial={{ opacity: 0, x: -50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
                        <h2 className="text-4xl font-bold mb-6">Why choose our platform?</h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-8 text-lg">We provide a complete ecosystem for your business. From the moment a customer walks in, to the moment you calculate your monthly profit, our system handles it all seamlessly.</p>
                        <ul className="space-y-4">
                            {['No hardware required, runs on any device', 'Offline capabilities coming soon', 'Dedicated support team', 'Regular updates and new features'].map((item, i) => (
                                <motion.li key={item} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="flex items-center gap-3">
                                    <div className="w-6 h-6 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center"><Check className="text-green-600 dark:text-green-400" size={14} /></div>
                                    {item}
                                </motion.li>
                            ))}
                        </ul>
                    </motion.div>

                    {/* Upgraded Animated Black Box (Dashboard Mockup) */}
                    <motion.div initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="relative">
                        <motion.div animate={{ y: [0, -15, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} className="bg-gradient-to-br from-blue-600 to-cyan-500 p-1 rounded-2xl shadow-2xl shadow-blue-500/30">
                            <div className="bg-gray-900 rounded-xl p-8 aspect-video flex flex-col gap-4">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="h-3 w-24 bg-gray-700 rounded-full"></div>
                                    <div className="h-3 w-12 bg-gray-700 rounded-full"></div>
                                </div>
                                <div className="grid grid-cols-3 gap-4 w-full flex-grow">
                                    <div className="bg-gradient-to-br from-gray-800 to-gray-700 rounded-lg p-3 flex flex-col justify-end h-24">
                                        <div className="h-2 w-full bg-blue-500/50 rounded mb-1"></div>
                                        <div className="h-3 w-1/2 bg-blue-400 rounded"></div>
                                    </div>
                                    <div className="bg-gradient-to-br from-gray-800 to-gray-700 rounded-lg p-3 flex flex-col justify-end h-24">
                                        <div className="h-2 w-full bg-cyan-500/50 rounded mb-1"></div>
                                        <div className="h-3 w-2/3 bg-cyan-400 rounded"></div>
                                    </div>
                                    <div className="bg-gradient-to-br from-gray-800 to-gray-700 rounded-lg p-3 flex flex-col justify-end h-24">
                                        <div className="h-2 w-full bg-green-500/50 rounded mb-1"></div>
                                        <div className="h-3 w-3/4 bg-green-400 rounded"></div>
                                    </div>
                                </div>
                                <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-lg h-16 w-full mt-4 relative overflow-hidden">
                                    <motion.div animate={{ x: ["-100%", "100%"] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} className="absolute inset-0 w-1/3 bg-gradient-to-r from-transparent via-blue-500/20 to-transparent"></motion.div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Floating Badges around the box */}
                        <motion.div animate={{ y: [0, 10, 0] }} transition={{ duration: 4, repeat: Infinity, delay: 0.5 }} className="absolute -top-6 -right-6 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 flex items-center gap-2">
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center"><Check className="text-green-600" size={16} /></div>
                            <div><p className="text-xs text-gray-500">Profit Today</p><p className="text-sm font-bold text-gray-900 dark:text-white">Rs. 15k</p></div>
                        </motion.div>
                        <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 5, repeat: Infinity, delay: 1 }} className="absolute -bottom-6 -left-6 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center"><ShoppingCart className="text-blue-600" size={16} /></div>
                            <div><p className="text-xs text-gray-500">New Sale</p><p className="text-sm font-bold text-gray-900 dark:text-white">Invoice #1024</p></div>
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className="py-24 px-8 bg-gray-50 dark:bg-gray-900 transition-colors duration-300 relative z-10">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="text-4xl font-bold">Simple, transparent pricing</motion.h2>
                        <p className="text-gray-500 dark:text-gray-400 mt-4">Choose the plan that fits your business size</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
                        {/* Starter Plan */}
                        <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.1 }} whileHover={{ y: -10 }} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl p-8 space-y-6 flex flex-col">
                            <div className="space-y-2"><h3 className="text-2xl font-bold text-gray-900 dark:text-white">Starter</h3><p className="text-gray-500 dark:text-gray-400">For small shops getting started</p></div>
                            <div><span className="text-5xl font-extrabold text-gray-900 dark:text-white">Rs. 20k</span><span className="text-gray-500 dark:text-gray-400">/year</span></div>
                            <ul className="space-y-3 text-left flex-grow">
                                {['Up to 500 Products', 'Single Location', 'Basic POS & Invoicing', 'Email Support'].map((feature) => (
                                    <li key={feature} className="flex items-center gap-3 text-gray-700 dark:text-gray-300"><Check className="text-green-500 flex-shrink-0" size={18} />{feature}</li>
                                ))}
                            </ul>
                            <motion.a href="#contact" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="block w-full py-3 px-6 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-bold rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all text-center">Get Started</motion.a>
                        </motion.div>

                        {/* Pro Plan (Highlighted) */}
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.2 }} whileHover={{ y: -10 }} className="bg-white dark:bg-gray-800 border-2 border-blue-500 rounded-2xl shadow-2xl shadow-blue-500/20 p-8 space-y-6 flex flex-col relative scale-105 z-10">
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">MOST POPULAR</div>
                            <div className="space-y-2"><h3 className="text-2xl font-bold text-gray-900 dark:text-white">Pro</h3><p className="text-gray-500 dark:text-gray-400">For growing businesses</p></div>
                            <div><span className="text-5xl font-extrabold text-blue-600 dark:text-blue-400">Rs. 45k</span><span className="text-gray-500 dark:text-gray-400">/Package Installation</span></div>
                            <ul className="space-y-3 text-left flex-grow">
                                {['Unlimited Products', 'Multi-Warehouse Tracking', 'Premium Analytics Dashboard', '50% Before installation', 'Remaining 50% after installation', 'Customer & Supplier CRM', 'Priority Support'].map((feature) => (
                                    <li key={feature} className="flex items-center gap-3 text-gray-700 dark:text-gray-300"><Check className="text-blue-500 flex-shrink-0" size={18} />{feature}</li>
                                ))}
                            </ul>
                            <motion.a href="#contact" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="block w-full py-3 px-6 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 text-center">Subscribe & Get Access</motion.a>
                        </motion.div>

                        {/* Enterprise Plan */}
                        <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.3 }} whileHover={{ y: -10 }} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl p-8 space-y-6 flex flex-col">
                            <div className="space-y-2"><h3 className="text-2xl font-bold text-gray-900 dark:text-white">Enterprise</h3><p className="text-gray-500 dark:text-gray-400">For large chains & franchises</p></div>
                            <div><span className="text-5xl font-extrabold text-gray-900 dark:text-white">Custom</span></div>
                            <ul className="space-y-3 text-left flex-grow">
                                {['Everything in Pro', 'Multiple Branches', 'API Access & Integrations', 'Dedicated Account Manager', '24/7 Phone Support'].map((feature) => (
                                    <li key={feature} className="flex items-center gap-3 text-gray-700 dark:text-gray-300"><Check className="text-green-500 flex-shrink-0" size={18} />{feature}</li>
                                ))}
                            </ul>
                            <motion.a href="#contact" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="block w-full py-3 px-6 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-bold rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all text-center">Contact Sales</motion.a>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* FAQ Section */}
            <section id="faq" className="py-24 px-8 relative z-10">
                <div className="max-w-3xl mx-auto">
                    <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="text-4xl font-bold text-center mb-16">Frequently Asked Questions</motion.h2>
                    <div className="space-y-4">
                        {[
                            { q: "Do I need to install any software?", a: "No! Our platform runs entirely in your web browser. You can access it from your computer, tablet, or phone." },
                            { q: "Is my data safe?", a: "Absolutely. We use enterprise-grade cloud hosting with daily backups. Your data is encrypted and completely isolated from other shops." },
                            { q: "Can I use it for my specific type of business?", a: "Yes, our system is designed to be flexible. It works perfectly for retail stores, pharmacies, hardware stores, and restaurants." },
                            { q: "What if I need help setting it up?", a: "We offer full onboarding support. Once you subscribe, our team will contact you to help set up your shop and train your staff." }
                        ].map((item, i) => <FAQItem key={i} q={item.q} a={item.a} />)}
                    </div>
                </div>
            </section>

            {/* Contact Section */}
            <section id="contact" className="py-24 px-8 bg-gray-50 dark:bg-gray-900 transition-colors duration-300 relative z-10">
                <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16">
                    <div>
                        <h2 className="text-4xl font-bold mb-6">Get in touch</h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-8">Ready to upgrade your business? Send us a message and we will get back to you within 24 hours.</p>

                        <div className="space-y-6 mb-12">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center"><Mail className="text-blue-600 dark:text-blue-400" size={20} /></div>
                                <div><p className="font-medium">Email</p><p className="text-gray-500 dark:text-gray-400">muhammadanaskhalid59@gmail.com</p></div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center"><WhatsAppIcon size={20} /></div>
                                <div><p className="font-medium">WhatsApp</p><p className="text-gray-500 dark:text-gray-400">+92 313 0735342</p></div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center"><MapPin className="text-orange-600 dark:text-orange-400" size={20} /></div>
                                <div><p className="font-medium">Location</p><p className="text-gray-500 dark:text-gray-400">Sargodha, Pakistan</p></div>
                            </div>
                        </div>

                        {/* Social Media Circular Toggles */}
                        <div className="flex gap-4">
                            <motion.a href="https://wa.me/923130735342" target="_blank" rel="noopener noreferrer" whileHover={{ scale: 1.1, y: -4 }} whileTap={{ scale: 0.9 }} className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-gray-700 dark:text-gray-300 hover:bg-green-500 hover:text-white transition-colors duration-300 shadow-md">
                                <WhatsAppIcon size={22} />
                            </motion.a>
                            <motion.a href="https://instagram.com" target="_blank" rel="noopener noreferrer" whileHover={{ scale: 1.1, y: -4 }} whileTap={{ scale: 0.9 }} className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-gray-700 dark:text-gray-300 hover:bg-gradient-to-tr hover:from-yellow-400 hover:via-pink-500 hover:to-purple-600 hover:text-white transition-colors duration-300 shadow-md">
                                <InstagramIcon size={22} />
                            </motion.a>
                            <motion.a href="https://facebook.com" target="_blank" rel="noopener noreferrer" whileHover={{ scale: 1.1, y: -4 }} whileTap={{ scale: 0.9 }} className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-gray-700 dark:text-gray-300 hover:bg-blue-600 hover:text-white transition-colors duration-300 shadow-md">
                                <FacebookIcon size={22} />
                            </motion.a>
                        </div>
                    </div>

                    {/* Contact Form */}
                    <form className="bg-white dark:bg-gray-800 p-8 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-6 shadow-xl">
                        <div><label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Your Name</label><input type="text" placeholder="John Doe" className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" /></div>
                        <div><label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Email</label><input type="email" placeholder="you@example.com" className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" /></div>
                        <div><label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Business Type</label><select className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"><option>Retail / Grocery</option><option>Pharmacy</option><option>Hardware / Iron</option><option>Restaurant / Food</option><option>Other</option></select></div>
                        <div><label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Message</label><textarea rows={4} placeholder="Tell us about your business needs..." className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"></textarea></div>
                        <motion.button type="submit" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20">Send Message</motion.button>
                    </form>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 px-8 border-t border-gray-200 dark:border-gray-800 text-center relative z-10">
                <p className="text-gray-500 dark:text-gray-400">© 2024 POS SaaS Pro. All rights reserved.</p>
            </footer>

            {/* Floating WhatsApp Button (Real Icon) */}
            <a href="https://wa.me/923130735342" target="_blank" rel="noopener noreferrer" className="fixed bottom-8 right-8 z-50 group">
                <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-20"></div>
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="relative w-16 h-16 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/30 text-white">
                    <WhatsAppIcon size={32} />
                </motion.div>
            </a>

        </div>
    )
}

// FAQ Item Component
function FAQItem({ q, a }: { q: string, a: string }) {
    const [open, setOpen] = useState(false)
    return (
        <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.3 }} className={`border rounded-xl overflow-hidden bg-white dark:bg-gray-800 transition-colors duration-300 ${open ? 'border-blue-500 shadow-lg' : 'border-gray-200 dark:border-gray-700'}`}>
            <button onClick={() => setOpen(!open)} className="w-full p-6 flex justify-between items-center text-left">
                <span className="font-medium text-lg text-gray-900 dark:text-white">{q}</span>
                <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.3, ease: "easeInOut" }} className={open ? 'text-blue-500' : 'text-gray-400'}>
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
        </motion.div>
    )
}