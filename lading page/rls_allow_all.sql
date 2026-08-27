-- سياسات استثنائية لمنح الصلاحيات للوحة التحكم (بدون نظام تسجيل دخول)
-- هام: نسخ هذا الكود بالكامل ولصقه في Supabase (SQL Editor) ثم اضغط Run.

CREATE POLICY "إدارة كاملة لأسعار التوصيل" ON delivery_prices FOR ALL USING (true);
CREATE POLICY "إدارة كاملة للمنتجات" ON products FOR ALL USING (true);
CREATE POLICY "إدارة كاملة لصور المنتجات" ON product_images FOR ALL USING (true);
CREATE POLICY "إدارة كاملة للموديلات" ON product_models FOR ALL USING (true);

-- السماح للوحة التحكم بقراءة وتعديل وحذف الطلبات الواردة
CREATE POLICY "إدارة كاملة للطلبات الواردة" ON orders FOR ALL USING (true);
