-- تحديث قاعدة بيانات Supabase لدعم أنواع التوصيل المختلفة

-- 1. إضافة عمود "نوع التوصيل" إلى جدول الطلبات
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_type VARCHAR(100) DEFAULT 'توصيل لباب المنزل';

-- 2. إضافة أعمدة أسعار التوصيل (المنزل، والمكتب)
ALTER TABLE delivery_prices ADD COLUMN IF NOT EXISTS price_home DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE delivery_prices ADD COLUMN IF NOT EXISTS price_office DECIMAL(10, 2) DEFAULT 0;

-- 3. وضع السعر الحالي ليكون هو سعر التوصيل للمنزل مبدئياً (للحفاظ على البيانات القديمة إن وجدت)
UPDATE delivery_prices SET price_home = price WHERE price_home = 0;

-- ملاحظة: لن نحذف عمود price القديم الآن لتجنب أي أخطاء، ولكن سيتم استخدام price_home و price_office من الآن فصاعداً.
