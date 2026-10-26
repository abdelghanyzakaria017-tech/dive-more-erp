# الدليل النهائي لتجهيز Dive More ERP — الكمبيوتر والتابلت (بدون Docker)

## مهم قبل التشغيل الفعلي

هذه الحزمة هي مرشح إصدار لتجهيز الواجهة والنشر، وليست بعدُ نظامًا ماليًا جاهزًا للاعتماد على بيانات حقيقية. تسجيل الدخول وفحص اتصال PostgreSQL موجودان في الـBackend، لكن واجهات كثيرة ما زالت تقرأ وتكتب الحجوزات والدفعات والريفند والبونص والعمولات والسيتيواشن داخل `localStorage`. لذلك يمكن فتح الواجهة على الكمبيوتر والتابلت، لكن هذه العمليات ليست كلها مشتركة بين الأجهزة ولا تُعد سجلات محاسبية مركزية بعد. لا تدخل بيانات تشغيل حقيقية قبل نقل كل هذه المسارات إلى API واختبارها على قاعدة PostgreSQL فعلية.

هذا الدليل منفصل عن واجهة البرنامج؛ لا توجد فيه تعليمات تشغيل معروضة داخل التطبيق.

## التوزيعة النهائية

- **GitHub Private:** مستودع الكود وسجل التعديلات.
- **DigitalOcean App Platform:** تشغيل Backend Node.js عبر Buildpack، بدون Docker.
- **DigitalOcean Managed PostgreSQL:** قاعدة البيانات المركزية.
- **Vercel (اختيارنا للتابلت):** نشر واجهة React كـWeb App قابل للإضافة للشاشة الرئيسية.
- **Windows EXE:** يُبنى محليًا على جهاز Windows من `Build-Installer.bat`.
- لا نستخدم Vercel وNetlify معًا لنفس الواجهة. يمكن استخدام Netlify بدل Vercel فقط، بنفس إعدادات build/output.

## 1) جهّز الملفات بأمان

1. فك ضغط الحزمة.
2. لا ترفع `.env` أو كلمات مرور أو `DATABASE_URL` أو مفاتيح JWT إلى GitHub.
3. ` .env.example` نموذج فقط؛ لا تستخدمه كملف إعداد فعلي.
4. أي كلمة مرور ظهرت في صورة أو محادثة يجب تغييرها، وعدم إعادة استخدامها.
5. استخدم Repository من نوع **Private**.

## 2) ارفع المشروع إلى GitHub

1. أنشئ Repository خاصًا باسم `dive-more-erp`.
2. افتح مجلد المشروع في VS Code.
3. ارفع الملفات إلى الفرع `main` مع استبعاد `node_modules` و`dist` و`release` وأي ملف `.env`.
4. تأكد أن `server/package.json` و`server/src/index.js` و`server/migrations/001_initial_schema.sql` موجودة في المستودع.

## 3) أنشئ قاعدة PostgreSQL في DigitalOcean

1. افتح DigitalOcean → **Databases** → **Create Database Cluster** → PostgreSQL.
2. اختر منطقة قريبة من مكان العمل وخطة مناسبة. لا تستخدم قاعدة Dev للبيانات الإنتاجية.
3. بعد الإنشاء، افتح **Users & Databases** وأنشئ قاعدة ومستخدم تطبيق مخصصًا إن لم يكونا موجودين.
4. من **Connection Details** احصل على عنوان الاتصال، المنفذ، اسم القاعدة، المستخدم، وكلمة المرور.
5. من **Network Access / Trusted Sources** اسمح لخدمة App Platform فقط بالاتصال. لا تفتح قاعدة البيانات لكل الإنترنت.
6. حمّل شهادة CA من إعدادات الاتصال. يجب استخدامها للتحقق من هوية خادم PostgreSQL عبر TLS.

## 4) أنشئ Backend على DigitalOcean من دون Docker

1. افتح **Apps → Create App → GitHub** واربط حساب GitHub.
2. اختر المستودع والفرع `main`.
3. اضبط **Source Directory** إلى `/server`.
4. اختر Node.js Buildpack، وليس Dockerfile أو Container Image.
5. Run Command: `npm start`.
6. HTTP Port: `8080`.
7. ابدأ بنسخة واحدة من الـBackend، لأن محدد محاولات الدخول في هذه النسخة محلي للنسخة الواحدة.
8. أضف Environment Variables في إعدادات App Platform، واجعل الأسرار مشفرة:

| المفتاح | القيمة |
|---|---|
| `PORT` | `8080` |
| `HOST` | `0.0.0.0` |
| `DATABASE_URL` | رابط الاتصال من DigitalOcean، ولا تضعه في GitHub |
| `PGSSL` | `true` |
| `PGSSL_CA_BASE64` | شهادة CA مشفرة Base64 (طريقة توليدها أدناه) |
| `JWT_SECRET` | قيمة عشوائية طويلة، 48 بايت أو أكثر |
| `CORS_ORIGINS` | `null,https://YOUR-VERCEL-DOMAIN` بعد إنشاء موقع Vercel؛ استبدل الدومين بدومينك الحقيقي حرفيًا |
| `BOOTSTRAP_ADMIN_EMAIL` | بريد إداري تملكه وتستطيع الوصول إليه |
| `BOOTSTRAP_ADMIN_PASSWORD` | كلمة مرور فريدة قوية لا تقل عن 12 حرفًا |
| `BOOTSTRAP_ADMIN_NAME` | `Dive More Administrator` |

لإنشاء قيمة Base64 لشهادة CA في PowerShell، بعد تنزيل الشهادة إلى `C:\secure\ca-certificate.crt`:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes('C:\secure\ca-certificate.crt'))
```

انسخ الناتج إلى `PGSSL_CA_BASE64` في إعدادات DigitalOcean فقط. لا تحفظ الشهادة أو الناتج داخل الكود أو مستودع GitHub.

لتوليد JWT secret محليًا:

```powershell
$bytes = New-Object byte[] 48
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($bytes)
[Convert]::ToBase64String($bytes)
$rng.Dispose()
```

ضع الناتج في `JWT_SECRET` على DigitalOcean فقط.

## 5) تحقق من أن الـBackend وقاعدة البيانات متصلان

بعد نجاح النشر، افتح هذا الرابط في المتصفح:

`https://YOUR-DIGITALOCEAN-APP-DOMAIN/api/health`

النتيجة المطلوبة JSON يحتوي على `"status":"ok"` و`"database":"connected"`. إذا ظهر `503` أو فشل النشر، راجع Runtime Logs وتأكد من `DATABASE_URL` وشهادة CA وTrusted Sources.

حساب الأدمن الأولي يُنشأ عند أول تشغيل ناجح فقط إذا لم يكن البريد موجودًا. تغيير `BOOTSTRAP_ADMIN_PASSWORD` بعد وجود الحساب لا يعيد تعيين كلمة المرور الموجودة. لا تنشر كلمة المرور أو ترسلها في محادثة.

## 6) نشر نسخة التابلت على Vercel

1. افتح Vercel، واختر **Add New → Project**، ثم اربط نفس Repository على GitHub.
2. Root Directory: جذر المشروع (المجلد الذي يحتوي على `package.json` و`vite.config.ts`).
3. Framework: Vite أو Other.
4. Build Command: `npm run build`.
5. Output Directory: `dist`.
6. أضف Environment Variable باسم `VITE_API_URL` وقيمته عنوان الـBackend على DigitalOcean، مثل `https://YOUR-DIGITALOCEAN-APP-DOMAIN` بدون `/api` في النهاية.
7. انشر الموقع، ثم انسخ دومين Vercel الفعلي.
8. ارجع إلى DigitalOcean واضبط `CORS_ORIGINS` لتشمل `null` ودومين Vercel بالضبط، مثل `null,https://dive-more-erp.vercel.app`، ثم أعد النشر.
9. افتح دومين Vercel على التابلت. من Chrome على Android اختر **Add to Home screen / Install app**. على iPad افتح الرابط في Safari ثم **Share → Add to Home Screen**.
10. الواجهة تحتاج إنترنت للاتصال بالسيرفر. تخزين شكل التطبيق/ملفاته لا يجعل العمليات المالية تعمل دون اتصال.

### لو فضّلت Netlify بدل Vercel

استورد Repository نفسه، Build Command: `npm run build`، Publish Directory: `dist`، واضبط `VITE_API_URL` في Environment Variables. أضف دومين Netlify الدقيق إلى `CORS_ORIGINS`. لا تستخدم Vercel وNetlify معًا إلا إذا كنت تريد نسختين منفصلتين عمدًا.

## 7) بناء تطبيق Windows للابتوب

1. على Windows، ثبّت Node.js 22 LTS أو إصدار LTS مدعومًا حديثًا.
2. افتح مجلد المشروع واضغط `Build-Installer.bat`.
3. أدخل عنوان الـBackend على DigitalOcean عندما يطلبه السكربت، باستخدام `https://`.
4. السكربت يثبت المكتبات، يشغّل الاختبارات، ثم يبني EXE. إذا فشل أي اختبار، لا يُفترض إنشاء مثبت صالح.
5. بعد نجاح البناء، ابحث عن:

`release\Dive-More-ERP-Setup-0.3.0.exe`

6. ثبّت الملف على اللابتوب. التطبيق يتصل بالـAPI؛ لا تضع بيانات دخول PostgreSQL على أجهزة الموظفين.

## 8) قائمة اختبار قبل الاستخدام الحقيقي

- `/api/health` يثبت اتصال PostgreSQL.
- تسجيل الدخول يعمل من اللابتوب ومن التابلت.
- المستخدم غير المصرح له يحصل على `403` عند محاولة API ممنوعة، وليس مجرد إخفاء زر في الواجهة.
- إنشاء حجز من جهاز وظهوره في جهاز آخر.
- عدم تكرار السيريال عند إنشاء حجزين متزامنين.
- اختبار الدفعة الجزئية والكاملة، العملات وأسعار الصرف، رفض التحصيل، تسليم الكاش، الريفند، البونص والعمولة.
- اختبار السيتيواشن والطباعة من شاشة الكمبيوتر والتابلت.
- اختبار سجل التدقيق وصلاحيات Owner/Admin.
- التأكد من النسخ الاحتياطي والاستعادة، وتجربة استرجاع فعلية قبل اعتماد البيانات.

## حالة الوظائف في هذه النسخة

- تسجيل الدخول: يتصل بالـBackend المركزي.
- Health check: يتصل بقاعدة PostgreSQL.
- بعض مسارات API للحجوزات والتدقيق موجودة.
- **لا تزال عدة وحدات في الواجهة تعتمد على `localStorage`، منها إدارة الحجوزات في الواجهة، الدفعات والتحقق منها، الريفند، البونص، العمولات، أسعار الصرف، والسيتيواشن.** لهذا السبب لا تُعتبر البيانات مشتركة بالكامل بين اللابتوب والتابلت، ولا يجوز استخدام النسخة الحالية كمصدر مالي إنتاجي حتى يتم ربط كل هذه المسارات بالـAPI واختبارها.
- لم يتم نشر شيء إلى حسابات GitHub أو DigitalOcean أو Vercel نيابة عنك، ولم يتم اختبار اتصال قاعدة بيانات حقيقية في هذه البيئة.

## روابط التوثيق الرسمي

- DigitalOcean Node.js Buildpack: https://docs.digitalocean.com/products/app-platform/reference/buildpacks/nodejs/
- DigitalOcean إنشاء التطبيقات: https://docs.digitalocean.com/products/app-platform/how-to/create-apps/
- DigitalOcean ربط قاعدة بيانات Managed PostgreSQL وتحديد Trusted Sources: https://docs.digitalocean.com/products/app-platform/how-to/manage-databases/
- DigitalOcean تأمين PostgreSQL والتحقق من شهادة TLS: https://docs.digitalocean.com/products/databases/postgresql/how-to/secure/
- Vercel + Vite: https://vercel.com/docs/frameworks/frontend/vite
- Netlify إعدادات البناء والمتغيرات: https://docs.netlify.com/build/configure-builds/environment-variables/
