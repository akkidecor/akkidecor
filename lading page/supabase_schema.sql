-- إنطاقاً من هيكل البيانات في (localStorage)، هذا هو الكود لإنشاء الجداول في قواعد بيانات Supabase

-- 1. إنشاء نوع بيانات لحالة الطلب لضمان القيم الصحيحة
CREATE TYPE order_status AS ENUM ('جديد', 'مؤكد', 'تم الشحن', 'مستلم', 'مرفوض', 'ملغى');

-- 2. جدول المنتجات الأساسي (يخزن معلومات المنتج مثل الاسم، الوصف والسعر الرئيسي)
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. جدول صور المنتج (لحفظ صور متعددة للمنتج وربطها به)
CREATE TABLE product_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. جدول نماذج/موديلات المنتج (بما فيها أسماء الموديلات والصور المرتبطة بها)
CREATE TABLE product_models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. جدول أسعار التوصيل (للولايات الـ 58)
CREATE TABLE delivery_prices (
    id SERIAL PRIMARY KEY,
    wilaya_name VARCHAR(100) UNIQUE NOT NULL,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. جدول الطلبات (لحفظ تفاصيل طلبات الزبائن)
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    model_name VARCHAR(255),
    customer_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(50) NOT NULL,
    wilaya VARCHAR(100) NOT NULL,
    product_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    delivery_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    total_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    status order_status DEFAULT 'جديد',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- سياسات الحماية (Row Level Security - RLS)
-- لتأمين قاعدة البيانات والسماح للمستخدمين بالوصول للبيانات الصحيحة فقط
-- ==========================================

-- تفعيل RLS على كل الجداول
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- 1. السماح للجميع بقراءة (SELECT) المنتجات وصورها والموديلات وأسعار التوصيل ليتم عرضها في صفحة الهبوط
CREATE POLICY "أسعار التوصيل متاحة للجميع للرؤية" ON delivery_prices FOR SELECT USING (true);
CREATE POLICY "المنتجات متاحة للجميع للرؤية" ON products FOR SELECT USING (true);
CREATE POLICY "صور المنتجات متاحة للجميع للرؤية" ON product_images FOR SELECT USING (true);
CREATE POLICY "الموديلات متاحة للجميع للرؤية" ON product_models FOR SELECT USING (true);

-- 2. السماح للجميع بإنشاء (إرسال) طلبيات جديدة (INSERT) من صفحة الهبوط
CREATE POLICY "السماح للجميع بإضافة طلبات جديدة" ON orders FOR INSERT WITH CHECK (true);

-- ملاحظة: بالنسبة لتعديل وحذف المنتجات أو استعراض جميع الطلبات من لوحة التحكم، 
-- ستحتاج إلى إعداد ميزة (Supabase Auth) لتوثيق دخول مدير المتجر وإضافة سياسات للمدير فقط.
