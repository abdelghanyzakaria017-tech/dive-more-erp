# Phase 50 — Supabase Auth للوجين Dive More ERP

وصلنا صفحة اللوجين بـ Supabase Auth: دخول حقيقي، نسيت كلمة المرور
برابط بريد، تغيير كلمة المرور لكل الأدوار — من غير ما تحتاج تشغّل
سيرفر API عندك.

## ترتيب الأوضاع (أول واحد يتحقق يشتغل)

1. **Supabase mode** — لو `VITE_SUPABASE_URL` و `VITE_SUPABASE_ANON_KEY`
   موجودين في `.env`.
2. **API mode** — لو `VITE_API_URL` موجود (السيرفر المركزي Phase 41).
3. **Demo mode** — لو ولا واحد موجود (دخول تجريبي محلي).

## خطوات التشغيل (مرة واحدة)

1. **اعمل مشروع Supabase**: من https://supabase.com/dashboard اختار
   منظمتك (saidqaly2@gmail.com's Org) → New project → اسم مثلاً
   `dive-more-erp` وكلمة مرور للداتابيز (احفظها عندك).
2. **شغّل السكيما**: SQL Editor → New query → الصق محتوى
   `supabase/schema.sql` كله → Run. ده بيعمل الجداول والإندكسات
   و RLS وتريجر إنشاء البروفايل تلقائيًا.
3. **خد المفاتيح**: Project Settings → API → انسخ
   - Project URL → `VITE_SUPABASE_URL`
   - anon public key → `VITE_SUPABASE_ANON_KEY`
4. **حطهم في `.env`** (انسخ `.env.example` لـ `.env` واملأ السطرين).
   الـ anon key آمن في المتصفح — الحماية الحقيقية من RLS.
5. **اسمح برابط الرجوع**: Authentication → URL Configuration →
   Redirect URLs → ضيف عنوان التطبيق عندك، مثلاً:
   - `http://localhost:5173/**` (للتطوير المحلي)
   - عنوان النشر بتاعك لما تنشر (مثلاً `https://YOUR-DOMAIN/**`)
   من غير الخطوة دي رابط استعادة كلمة المرور مش هيرجع للتطبيق.
6. **اعمل حسابات الموظفين**: Authentication → Users → Add user
   (إيميل + باسورد لكل موظف). البروفايل بيتنشأ تلقائيًا بدور `sales`؛
   عدّل الأدوار من SQL Editor:
   ```sql
   update public.profiles set role = 'owner' where email = 'you@example.com';
   ```
   الأدوار المتاحة: owner, admin, accounting-manager, accountant,
   finance, operation, sales.
7. **شغّل التطبيق**: `npm run dev` — لو كل حاجة صح هتشوف فوق فورم
   الدخول «تسجيل الدخول عبر Supabase».

## إزاي كل حاجة بتشتغل

- **الدخول**: `signInWithPassword`، وبعدين الدور والاسم من جدول
  `profiles`. لو مفيش بروفايل، بيقع على استنتاج الدور من الإيميل
  (نفس قواعد Phase 20/22).
- **نسيت كلمة المرور**: بيتبعت رابط استعادة بالبريد. فتح الرابط
  بيرجعك للتطبيق بجلسة استعادة وبيظهر فورم كلمة المرور الجديدة.
- **تغيير كلمة المرور**: بيتحقق من الحالية الأول (إعادة دخول) وبعدين
  بيحدّثها — لكل الأدوار، من غير بوابة دور.
- **الجلسة**: بتفضل شغالة بعد تحديث الصفحة (restoreSession)،
  وتسجيل الخروج بيقفلها من Supabase.

## ملاحظات أمان

- ما تحطش الـ `service_role` key في الفرونت أبدًا — الـ anon بس.
- سياسات RLS الحالية بداية: أي موظف مسجل دخول يقدر يقرأ ويكتب.
  شدّدها بعدين حسب الدور (مثلاً المدفوعات للمالية والمحاسبة بس).
- قواعد الأداء في `PERFORMANCE_RULES.md` لسه سارية: باجينيشن 20 من
  السيرفر، استعلام واحد للعلاقات (ممنوع N+1)، كاش للبيانات الثابتة.
