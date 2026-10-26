# Dive More ERP — ابدأ من هنا (Phase 46، بدون Docker)

أنت لا تحتاج Docker في هذا المسار. استخدم:
- GitHub لحفظ نسخة الكود الخاصة.
- DigitalOcean App Platform لتشغيل Backend باستخدام Node.js Buildpack.
- DigitalOcean Managed PostgreSQL لقاعدة البيانات المشتركة.
- Windows + Node.js لبناء ملف تثبيت EXE.

## امشِ بالترتيب

1. افتح `DEPLOY_NO_DOCKER_DIGITALOCEAN_AR.md` واتبع مراحل GitHub ثم PostgreSQL ثم App Platform.
2. لا ترفع `.env` أو أي كلمة مرور إلى GitHub. ملف `.env.example` أمثلة فقط؛ لا تضع فيه أسرارًا حقيقية.
3. بعد النشر، اختبر `https://YOUR-APP-DOMAIN/api/health`. لا تكمل قبل ظهور `status: ok` و`database: connected`.
4. شغّل `Build-Installer.bat` من Windows، وأدخل عنوان DigitalOcean API الحقيقي عند السؤال.
5. إذا نجح البناء ستجد ملف التثبيت في `release\Dive-More-ERP-Setup-0.3.0.exe`.

## لو عايز تشغيلًا محليًا بدون Docker

ثبّت PostgreSQL مباشرة من الموقع الرسمي: https://www.postgresql.org/download/windows/ ثم أنشئ قاعدة ومستخدمًا محليين، واضبط `DATABASE_URL` و`JWT_SECRET` ومتغيرات الإدارة في ملف `.env` محليًا، وشغّل `npm install` في جذر المشروع و`npm run server:start`. هذا المسار للاختبار المحلي فقط؛ لا تضع قاعدة بيانات الكمبيوتر المحلي كقاعدة مشتركة لأجهزة الشركة إلا إذا أعددت شبكة آمنة ونسخًا احتياطيًا وإدارة سيرفر مناسبة.

## مهم

لم يتم إنشاء حساب DigitalOcean أو نشر الخدمة من هذه الحزمة؛ ستحتاج إلى تنفيذ خطوات النشر داخل حسابك. كما أن كل وظائف ERP ليست متصلة بقاعدة البيانات المركزية بعد، لذلك لا تستخدم النسخة كمرجع مالي إنتاجي قبل اكتمال نقل جميع مسارات الدفع والريفند والعمولات والبونص والسيتيواشن.


## الدليل النهائي للكمبيوتر والتابلت

راجع `FINAL_GUIDE_AR.md` للحصول على خطوات GitHub + DigitalOcean PostgreSQL/Backend + Vercel للتابلت + بناء EXE على Windows، مع قائمة الاختبارات وحدود النسخة الحالية.
