export const dictionaries: Record<string, any> = {
    en: {
        common: {
            save: 'Save', cancel: 'Cancel', delete: 'Delete', back: 'Back', search: 'Search',
            actions: 'Actions', print: 'Print', logout: 'Logout', edit: 'Edit', remove: 'Remove',
            back_to_contacts: '← Back to Contacts', active: 'Active', inactive: 'Inactive', status: 'Status'
        },
        nav: { dashboard: 'Dashboard', products: 'Products', inventory: 'Inventory', pos: 'POS', sales: 'Sales', suppliers: 'Suppliers', purchases: 'Purchases', reports: 'Reports', settings: 'Settings', expenses: 'Expenses', customers: 'Customers' },
        dashboard: {
            title: 'Dashboard Overview',
            welcome_msg: "Welcome back, here's what's happening with your business today.",
            today_sales: "Today's Sales",
            monthly_sales: 'Monthly Sales',
            total_products: 'Total Products',
            low_stock: 'Low Stock Alerts',
            sales_analytics: 'Sales Analytics (Last 7 Days)',
            top_products: 'Top Selling Products',
            orders_today: 'orders today',
            active_catalog: 'Active in catalog',
            need_restock: 'Need restocking soon',
            no_sales_data: 'No sales data yet.',
            today_expenses: "Monthly Expenses",
            net_profit: "Net Profit (Month)",
            needs_attention: 'Needs Attention',
            view_all: 'View All',
            healthy_stock: 'All stock levels are healthy.'
        },
        charts: {
            sales_analytics: 'Sales Analytics (Last 7 Days)',
            top_products: 'Top Selling Products',
            no_sales_data: 'No sales data yet. Make a sale to see top products!'
        },
        products: {
            title: 'Products', add_new: '+ Add Product', image: 'Image', name: 'Name', sku: 'SKU',
            unit: 'Unit', stock: 'Stock', purchase_price: 'Purchase Price', selling_price: 'Selling Price',
            low_stock_badge: '(Low Stock)', no_products: 'No products found.', add_title: 'Add New Product',
            product_name: 'Product Name', sku_optional: 'SKU (Optional)', min_stock_alert: 'Minimum Stock Alert',
            initial_stock: 'Initial Stock Quantity', product_image: 'Product Image (Optional)', remove_image: 'Remove Image', no_img: 'No img'
        },
        categories: {
            title: 'Categories', add_new: '+ Add Category', name: 'Category Name',
            no_categories: 'No categories found.', save_category: 'Save Category',
            select_category: 'Select Category (Optional)',
            placeholder_eg: 'e.g. Iron Sheets, Pipes, Groceries...'
        },
        inventory: {
            title: 'Inventory Management', product_name: 'Product Name', current_stock: 'Current Stock',
            min_stock_alert: 'Min Stock Alert', in_stock: 'In Stock', low_stock: 'Low', update_stock: 'Update Stock',
            no_data: 'No inventory data.', update_title: 'Update Stock', adjustment_type: 'Adjustment Type',
            add_stock: 'Add Stock', subtract_stock: 'Subtract Stock', set_exact: 'Set Exact Quantity', save_update: 'Save Update',
            inventory_value: 'Inventory Value', unit_cost: 'Unit Cost', stock_value: 'Stock Value',
            expired_stock: 'Expired Stock', expiring_soon: 'Expiring Soon', batch: 'Batch',
            expired: 'Expired', expires: 'Expires', units: 'Units', no_expired: 'No expired items.',
            no_expiring: 'Nothing expiring soon.'
        },
        sales: {
            title: 'Sales History', invoice_id: 'Invoice ID', date: 'Date', customer: 'Customer',
            total_amount: 'Total Amount', status: 'Status', completed: 'completed', refunded: 'refunded',
            no_sales: 'No sales found.', invoice_title: 'Invoice', back_to_sales: '← Back to Sales',
            process_return: 'Process Return', print_invoice: 'Print Invoice', bill_to: 'Bill To:',
            product: 'Product', qty: 'Qty', price: 'Price', subtotal: 'Subtotal', discount: 'Discount',
            tax: 'Tax', total: 'Total', print_options: 'Print Options', invoice_btn: 'Invoice', receipt_btn: 'Receipt'
        },
        pos: {
            quotation_mode: 'Quotation Mode', save_quotation: 'Save Quotation', save_sale: 'Save Sale', invoice: 'Invoice',
            date: 'Date', type: 'Type', retail: 'Retail', wholesale: 'Wholesale', customer: 'Customer',
            add_new: 'Add New', search_customer: 'Search customer...', no_customers: 'No customers found',
            outstanding: 'Outstanding:', previous_rate: 'Previous Rate', na: 'N/A', product_barcode: 'Product / Barcode',
            search: 'Search...', stock: 'Stock', unit: 'Unit', qty: 'Qty', bonus: 'Bonus', price: 'Price',
            disc_percent: 'Disc %', action: 'Action', stk: 'Stk:', cart_empty: 'Cart is empty. Add products to start a sale.',
            summary: 'Summary', subtotal: 'Subtotal', discount_percent: 'Discount %', fixed_disc: 'Fixed Disc',
            delivery: 'Delivery', grand_total: 'Grand Total', received: 'Received', change: 'Change',
            added_to_ledger: 'Added to Ledger', cash: 'Cash', card: 'Card', bank_transfer: 'Bank Transfer',
            other: 'Other', complete_sale: 'Complete Sale', processing: 'Processing...',
            quick_add_customer: 'Quick Add Customer', name: 'Name', phone: 'Phone', save_select: 'Save & Select',
            print_receipt: 'Print Receipt'
        },
        suppliers: {
            title: 'Suppliers', add_new: '+ Add Supplier', company: 'Company', phone: 'Phone',
            no_suppliers: 'No suppliers found.', add_title: 'Add New Supplier', supplier_name: 'Supplier Name',
            company_optional: 'Company (Optional)', phone_optional: 'Phone (Optional)', notes_optional: 'Notes (Optional)',
            save_supplier: 'Save Supplier'
        },
        settings: {
            title: 'Settings', shop_profile: 'Shop Profile & Invoice Setup', business_name: 'Business Name',
            subtitle: 'Subtitle (Optional)', address: 'Business Address', invoice_note: 'Invoice Note / Footer',
            save_profile: 'Save Profile', accounts_title: 'Financial Accounts', account_name: 'Account Name',
            type: 'Type', initial_balance: 'Initial Balance', add_account: '+ Add Account', no_accounts: 'No accounts added yet.',
            account_section: 'Account', logged_in_as: 'Logged in as Shop Owner', staff_permissions: 'Staff & Permissions',
            staff_name: 'Staff Name', role: 'Role', cashier: 'Cashier', manager: 'Manager', email: 'Email',
            temp_password: 'Temporary Password', add_staff: '+ Add Staff', no_staff_members: 'No staff members added yet.'
        },
        locations: {
            title: 'Warehouses & Locations', add_new: '+ Add Location', name: 'Location Name', type: 'Type',
            shop: 'Shop', warehouse: 'Warehouse', other: 'Other', no_locations: 'No locations added yet.', add_title: 'Add New Location'
        },
        purchases: {
            title: 'Purchases History', record_new: '+ Record Purchase', purchase_id: 'Purchase ID', supplier: 'Supplier',
            unknown_supplier: 'Unknown Supplier', no_purchases: 'No purchases found.', record_title: 'Record Purchase',
            select_supplier: 'Select Supplier (Optional)', select_location: 'Select Location', click_to_add: 'Click products to add to purchase',
            grand_total: 'Grand Total', save_purchase: 'Save Purchase & Add Stock', mode_opening: 'Opening Stock', mode_batches: 'Manage Batches',
            batch_number: 'Batch #', expiry_date: 'Expiry Date', discount: 'Discount', paid_amount: 'Paid Amount', due_amount: 'Due Amount',
            upload_invoice: 'Upload Invoice', add_product_fly: '+ Add Product', quick_add_title: 'Quick Add Product', selling_price: 'Selling Price',
            supplier_discount: 'Supplier Discount (%)', calculated_cost: 'Calculated Cost', save_product: 'Save Product',
            search_supplier: 'Search by supplier name...', paid_due: 'Paid / Due', paid: 'Paid', due: 'Due', view: 'View'
        },
        expenses: {
            title: 'HR & Expenses', manage_hr: 'Manage staff payroll and business expenses', staff_payroll: 'Staff & Payroll',
            monthly: 'Monthly:', role_eg: 'Role (e.g. Cashier)', salary_rs: 'Salary (Rs)', add_staff_member: 'Add Staff Member',
            active_deactivate: 'Active (Click to Deactivate)', inactive_activate: 'Inactive (Click to Activate)', no_staff: 'No staff members added yet.',
            business_expenses: 'Business Expenses', amount_rs: 'Amount (Rs)', description_opt: 'Description (Optional)', record_expense: 'Record Expense',
            no_description: 'No description', no_expenses: 'No expenses recorded yet.', add_new: '+ Add Expense', category: 'Category',
            amount: 'Amount', description: 'Description', date: 'Date', rent: 'Rent', utilities: 'Utilities', salaries: 'Salaries',
            marketing: 'Marketing', miscellaneous: 'Miscellaneous', add_title: 'Record New Expense', save_expense: 'Save Expense',
            net_profit: 'Net Profit (Today)', total_expenses: 'Total Expenses (Today)'
        },
        customers: {
            title: 'Customers', add_new: '+ Add Customer', name: 'Name', phone: 'Phone', email: 'Email', address: 'Address',
            balance: 'Balance', no_customers: 'No customers found.', add_title: 'Add New Customer', save_customer: 'Save Customer',
            no_phone: 'No phone', no_company: 'No company', no_details: 'No details', collect: 'Collect'
        },
        contacts: {
            title: 'Contacts', customers: 'Customers', suppliers: 'Suppliers', manage_ledger: 'Manage your customers and suppliers ledger'
        },
        reports: {
            title: 'Reports & Analytics', analyze_perf: 'Analyze your business performance and financial health', print_report: 'Print Report',
            export_csv: 'Export CSV', financial: 'Financial', sales: 'Sales', inventory: 'Inventory', customers: 'Customers', suppliers: 'Suppliers', ledger: 'Ledger',
            profit_loss: 'Profit & Loss Statement', total_sales: 'Total Sales (Revenue)', cogs: 'Cost of Goods Sold (Purchases)', gross_profit: 'Gross Profit',
            operational_expenses: 'Operational Expenses', net_profit: 'Net Profit', product_sales: 'Product Wise Sales', inventory_valuation: 'Inventory Valuation & Low Stock',
            customer_summary: 'Customer Purchase Summary', supplier_payables: 'Supplier Payables & Statements', general_ledger: 'General Ledger (Cash Flow)',
            date: 'Date', description: 'Description', debit: 'Debit (Out)', credit: 'Credit (In)', balance: 'Balance', no_transactions: 'No transactions found.',
            total_in: 'Total In', total_out: 'Total Out', search_ledger: 'Search by customer, supplier, expense...'
        }
    },
    ur: {
        common: {
            save: 'محفوظ کریں', cancel: 'منسوخ', delete: 'حذف کریں', back: 'واپس', search: 'تلاش کریں',
            actions: 'اقدامات', print: 'پرنٹ', logout: 'لاگ آؤٹ', edit: 'ترمیم', remove: 'ہٹائیں',
            back_to_contacts: '← رابطے پر واپس', active: 'فعال', inactive: 'غیر فعال', status: 'حالت'
        },
        nav: { dashboard: 'ڈیش بورڈ', products: 'پروڈکٹس', inventory: 'انوینٹری', pos: 'سیلز پوائنٹ', sales: 'سیلز', suppliers: 'سپلائرز', purchases: 'خریداری', reports: 'رپورٹس', settings: 'سیٹنگز', expenses: 'اخراجات', customers: 'کسٹمرز' },
        dashboard: {
            title: 'ڈیش بورڈ جائزہ',
            welcome_msg: 'خیر مقدم ہے، آج آپ کے کاروبار میں کیا ہو رہا ہے۔',
            today_sales: 'آج کی فروخت',
            monthly_sales: 'ماہانہ فروخت',
            total_products: 'کل پروڈکٹس',
            low_stock: 'اسٹاک کم ہے',
            sales_analytics: 'سیلز اینالیٹکس (پچھلے 7 دن)',
            top_products: 'سب سے زیادہ فروخت ہونے والی اشیاء',
            orders_today: 'آج کے آرڈرز',
            active_catalog: 'کیٹلاگ میں موجود',
            need_restock: 'جلد اسٹاک بھریں',
            no_sales_data: 'ابھی کوئی سیلز ڈیٹا نہیں ہے۔',
            today_expenses: 'ماہانہ اخراجات',
            net_profit: 'خالص منافع (ماہانہ)',
            needs_attention: 'توجہ درکار',
            view_all: 'سب دیکھیں',
            healthy_stock: 'تمام اسٹاک کی سطح صحت مند ہے۔'
        },
        charts: {
            sales_analytics: 'سیلز اینالیٹکس (پچھلے 7 دن)',
            top_products: 'سب سے زیادہ فروخت ہونے والی اشیاء',
            no_sales_data: 'ابھی کوئی سیلز ڈیٹا نہیں ہے۔'
        },
        products: {
            title: 'پروڈکٹس', add_new: '+ پروڈکٹ شامل کریں', image: 'تصویر', name: 'نام', sku: 'کوڈ',
            unit: 'اکائی', stock: 'اسٹاک', purchase_price: 'خریداری قیمت', selling_price: 'فروخت کی قیمت',
            low_stock_badge: '(اسٹاک کم)', no_products: 'کوئی پروڈکٹ نہیں ملی۔', add_title: 'نئی پروڈکٹ شامل کریں',
            product_name: 'پروڈکٹ کا نام', sku_optional: 'کوڈ (اختیاری)', min_stock_alert: 'کم از کم اسٹاک الرٹ',
            initial_stock: 'ابتدائی اسٹاک مقدار', product_image: 'پروڈکٹ کی تصویر (اختیاری)', remove_image: 'تصویر ہٹائیں', no_img: 'کوئی تصویر نہیں'
        },
        categories: {
            title: 'کیٹگریز', add_new: '+ کیٹگری شامل کریں', name: 'کیٹگری کا نام',
            no_categories: 'کوئی کیٹگریز نہیں ملیں۔', save_category: 'کیٹگری محفوظ کریں',
            select_category: 'کیٹگری منتخب کریں (اختیاری)',
            placeholder_eg: 'مثلاً: آئرن شیٹس، پائپس، کریانہ...'
        },
        inventory: {
            title: 'انوینٹری مینجمنٹ', product_name: 'پروڈکٹ کا نام', current_stock: 'موجودہ اسٹاک',
            min_stock_alert: 'کم از کم اسٹاک الرٹ', in_stock: 'اسٹاک میں موجود', low_stock: 'کم', update_stock: 'اسٹاک اپڈیٹ کریں',
            no_data: 'کوئی انوینٹری ڈیٹا نہیں۔', update_title: 'اسٹاک اپڈیٹ کریں', adjustment_type: 'ایڈجسٹمنٹ کی قسم',
            add_stock: 'اسٹاک میں اضافہ کریں', subtract_stock: 'اسٹاک میں کمی کریں', set_exact: 'مقررہ مقدار سیٹ کریں', save_update: 'اپڈیٹ محفوظ کریں',
            inventory_value: 'انوینٹری ویلیو', unit_cost: 'یونٹ لاگت', stock_value: 'اسٹاک ویلیو',
            expired_stock: 'ختم شدہ اسٹاک', expiring_soon: 'جلد ختم ہونے والا', batch: 'بیچ',
            expired: 'ختم شدہ', expires: 'ختم ہونے کی تاریخ', units: 'یونٹس', no_expired: 'کوئی ختم شدہ آئٹم نہیں۔',
            no_expiring: 'کوئی آئٹم جلد ختم نہیں ہو رہا۔'
        },
        sales: {
            title: 'سیلز ہسٹری', invoice_id: 'انوائس آئی ڈی', date: 'تاریخ', customer: 'کسٹمر',
            total_amount: 'کل رقم', status: 'حالت', completed: 'مکمل', refunded: 'واپس',
            no_sales: 'کوئی سیلز نہیں ملی۔', invoice_title: 'انوائس', back_to_sales: '← سیلز کی طرف واپس',
            process_return: 'واپسی پراسیس کریں', print_invoice: 'انوائس پرنٹ کریں', bill_to: 'بل برائے:',
            product: 'پروڈکٹ', qty: 'مقدار', price: 'قیمت', subtotal: 'سب ٹوٹل', discount: 'رعایت',
            tax: 'ٹیکس', total: 'کل', print_options: 'پرنٹ آپشنز', invoice_btn: 'انوائس', receipt_btn: 'رسید'
        },
        pos: {
            quotation_mode: 'کوٹیشن موڈ', save_quotation: 'کوٹیشن محفوظ کریں', save_sale: 'سیل محفوظ کریں', invoice: 'انوائس',
            date: 'تاریخ', type: 'قسم', retail: 'ریٹیل', wholesale: 'تھوک', customer: 'کسٹمر',
            add_new: 'نیا شامل کریں', search_customer: 'کسٹمر تلاش کریں...', no_customers: 'کوئی کسٹمرز نہیں ملے',
            outstanding: 'بقایا:', previous_rate: 'پچھلی قیمت', na: 'ناموجود', product_barcode: 'پروڈکٹ / بارکوڈ',
            search: 'تلاش...', stock: 'اسٹاک', unit: 'اکائی', qty: 'مقدار', bonus: 'بونس', price: 'قیمت',
            disc_percent: 'رعایت %', action: 'ایکشن', stk: 'اسٹاک:', cart_empty: 'کارٹ خالی ہے۔ سیل شروع کرنے کے لیے پروڈکٹس شامل کریں۔',
            summary: 'خلاصہ', subtotal: 'سب ٹوٹل', discount_percent: 'رعایت %', fixed_disc: 'مقررہ رعایت',
            delivery: 'ڈیلیوری', grand_total: 'گرینڈ ٹوٹل', received: 'وصول شدہ', change: 'بقیہ',
            added_to_ledger: 'لیجر میں شامل کیا', cash: 'نقد', card: 'کارڈ', bank_transfer: 'بینک ٹرانسفر',
            other: 'دیگر', complete_sale: 'سیل مکمل کریں', processing: 'پراسیس ہو رہا ہے...',
            quick_add_customer: 'فوری کسٹمر شامل کریں', name: 'نام', phone: 'فون', save_select: 'محفوظ کریں اور منتخب کریں',
            print_receipt: 'رسید پرنٹ کریں'
        },
        suppliers: {
            title: 'سپلائرز', add_new: '+ سپلائر شامل کریں', company: 'کمپنی', phone: 'فون',
            no_suppliers: 'کوئی سپلائرز نہیں ملے۔', add_title: 'نیا سپلائر شامل کریں', supplier_name: 'سپلائر کا نام',
            company_optional: 'کمپنی (اختیاری)', phone_optional: 'فون (اختیاری)', notes_optional: 'نوٹس (اختیاری)',
            save_supplier: 'سپلائر محفوظ کریں'
        },
        settings: {
            title: 'سیٹنگز', shop_profile: 'دکان کی پروفائل اور انوائس سیٹ اپ', business_name: 'کاروبار کا نام',
            subtitle: 'سب ٹائٹل (اختیاری)', address: 'کاروبار کا پتہ', invoice_note: 'انوائس نوٹ / فٹر',
            save_profile: 'پروفائل محفوظ کریں', accounts_title: 'مالی اکاؤنٹس', account_name: 'اکاؤنٹ کا نام',
            type: 'قسم', initial_balance: 'ابتدائی بیلنس', add_account: '+ اکاؤنٹ شامل کریں', no_accounts: 'ابھی تک کوئی اکاؤنٹس شامل نہیں کیے گئے۔',
            account_section: 'اکاؤنٹ', logged_in_as: 'شاپ اونر کے طور پر لاگ ان ہیں', staff_permissions: 'اسٹاف اور پرمیشنز',
            staff_name: 'اسٹاف کا نام', role: 'کردار', cashier: 'کیشیئر', manager: 'منیجر', email: 'ای میل',
            temp_password: 'عارضی پاس ورڈ', add_staff: '+ اسٹاف شامل کریں', no_staff_members: 'ابھی تک کوئی اسٹاف ممبر شامل نہیں کیا گیا۔'
        },
        locations: {
            title: 'گودام اور مقامات', add_new: '+ مقام شامل کریں', name: 'مقام کا نام', type: 'قسم',
            shop: 'دکان', warehouse: 'گودام', other: 'دیگر', no_locations: 'ابھی تک کوئی مقامات شامل نہیں کیے گئے۔', add_title: 'نیا مقام شامل کریں'
        },
        purchases: {
            title: 'خریداری کی ہسٹری', record_new: '+ خریداری ریکارڈ کریں', purchase_id: 'خریداری آئی ڈی', supplier: 'سپلائر',
            unknown_supplier: 'نامعلوم سپلائر', no_purchases: 'کوئی خریداری نہیں ملی۔', record_title: 'خریداری ریکارڈ کریں',
            select_supplier: 'سپلائر منتخب کریں (اختیاری)', select_location: 'مقام منتخب کریں', click_to_add: 'خریداری میں شامل کرنے کے لیے پروڈکٹس پر کلک کریں',
            grand_total: 'گرینڈ ٹوٹل', save_purchase: 'خریداری محفوظ کریں اور اسٹاک میں اضافہ کریں', mode_opening: 'ابتدائی اسٹاک', mode_batches: 'بیچ مینج کریں',
            batch_number: 'بیچ نمبر', expiry_date: 'ختم ہونے کی تاریخ', discount: 'رعایت', paid_amount: 'اداختہ رقم', due_amount: 'بقایا رقم',
            upload_invoice: 'انوائس اپ لوڈ کریں', add_product_fly: '+ پروڈکٹ شامل کریں', quick_add_title: 'فوری پروڈکٹ شامل کریں', selling_price: 'فروخت کی قیمت',
            supplier_discount: 'سپلائر رعایت (%)', calculated_cost: 'کل حسابی لاگت', save_product: 'پروڈکٹ محفوظ کریں',
            search_supplier: 'سپلائر کے نام سے تلاش کریں...', paid_due: 'ادائیگی / بقایا', paid: 'ادا شدہ', due: 'بقایا', view: 'دیکھیں'
        },
        expenses: {
            title: 'ایچ آر اور اخراجات', manage_hr: 'اسٹاف تنخواہیں اور کاروباری اخراجات کا انتظام', staff_payroll: 'اسٹاف اور پے رول',
            monthly: 'ماہانہ:', role_eg: 'کردار (جیسے کیشیئر)', salary_rs: 'تنخواہ (روپے)', add_staff_member: 'اسٹاف ممبر شامل کریں',
            active_deactivate: 'فعال (غیر فعال کرنے کے لیے کلک کریں)', inactive_activate: 'غیر فعال (فعال کرنے کے لیے کلک کریں)', no_staff: 'کوئی اسٹاف ممبر شامل نہیں کیا گیا۔',
            business_expenses: 'کاروباری اخراجات', amount_rs: 'رقم (روپے)', description_opt: 'تفصیل (اختیاری)', record_expense: 'خرچ درج کریں',
            no_description: 'کوئی تفصیل نہیں', no_expenses: 'ابھی تک کوئی اخراجات درج نہیں کیے گئے۔', add_new: '+ خرچ شامل کریں', category: 'قسم',
            amount: 'رقم', description: 'تفصیل', date: 'تاریخ', rent: 'کرایہ', utilities: 'بجلی/پانی', salaries: 'تنخواہیں',
            marketing: 'مارکیٹنگ', miscellaneous: 'متفرق', add_title: 'نیا خرچ درج کریں', save_expense: 'خرچ محفوظ کریں',
            net_profit: 'خالص منافع (آج)', total_expenses: 'کل اخراجات (آج)'
        },
        customers: {
            title: 'کسٹمرز', add_new: '+ کسٹمر شامل کریں', name: 'نام', phone: 'فون', email: 'ای میل', address: 'پتہ',
            balance: 'بیلنس', no_customers: 'کوئی کسٹمرز نہیں ملے۔', add_title: 'نیا کسٹمر شامل کریں', save_customer: 'کسٹمر محفوظ کریں',
            no_phone: 'کوئی فون نہیں', no_company: 'کوئی کمپنی نہیں', no_details: 'کوئی تفصیل نہیں', collect: 'وصول کریں'
        },
        contacts: {
            title: 'رابطے', customers: 'کسٹمرز', suppliers: 'سپلائرز', manage_ledger: 'اپنے کسٹمرز اور سپلائرز کے لیجر کا انتظام کریں'
        },
        reports: {
            title: 'رپورٹس اینڈ اینالیٹکس', analyze_perf: 'اپنے کاروبار کی کارکردگی اور مالی صحت کا تجزیہ کریں', print_report: 'رپورٹ پرنٹ کریں',
            export_csv: 'CSV ایکسپورٹ کریں', financial: 'مالیاتی', sales: 'سیلز', inventory: 'انوینٹری', customers: 'کسٹمرز', suppliers: 'سپلائرز', ledger: 'لیجر',
            profit_loss: 'نفع و نقصان اسٹیٹمنٹ', total_sales: 'کل سیلز (آمدنی)', cogs: 'فروخت کردہ اشیاء کی لاگت (خریداری)', gross_profit: 'خالص منافع',
            operational_expenses: 'آپریشنل اخراجات', net_profit: 'خالص منافع', product_sales: 'پروڈکٹ کے حساب سے سیلز', inventory_valuation: 'انوینٹری ویلیو ایشن اور کم اسٹاک',
            customer_summary: 'کسٹمر خریداری خلاصہ', supplier_payables: 'سپلائرز واجبات اور اسٹیٹمنٹس', general_ledger: 'جنرل لیجر (کیش فلو)',
            date: 'تاریخ', description: 'تفصیل', debit: 'ڈیبٹ (خرچ)', credit: 'کریڈٹ (آمدنی)', balance: 'بیلنس', no_transactions: 'کوئی لین دین نہیں ملا۔',
            total_in: 'کل آمدنی', total_out: 'کل خرچ', search_ledger: 'کسٹمر، سپلائر، خرچ کے حساب سے تلاش کریں...'
        }
    }
};