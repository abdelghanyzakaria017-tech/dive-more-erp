# Dive More ERP — النشر بدون Docker (GitHub + DigitalOcean)

هذه هي طريقة النشر المقترحة إذا كنت لا تريد Docker. استخدم GitHub لحفظ الكود، وDigitalOcean App Platform لتشغيل الـAPI عبر Node.js Buildpack، وDigitalOcean Managed PostgreSQL لقاعدة البيانات. لا تحتاج Vercel أو Netlify لتطبيق Windows؛ استخدم أحدهما فقط إذا أردت لاحقًا نسخة تعمل في متصفح الويب.

## تنبيه أمني مهم قبل الرفع

- لا تضع كلمات المرور أو `DATABASE_URL` أو `JWT_SECRET` في GitHub.
- ` .env.example` ملف أمثلة فقط، وليس ملف إعدادات تشغيل. أعد `BOOTSTRAP_ADMIN_PASSWORD` فيه إلى قيمة placeholder، ولا تضع كلمة مرور حقيقية داخله.
- إذا ظهرت كلمة مرور حقيقية في لقطة شاشة أو أُضيفت إلى `.env.example`، غيّرها قبل النشر.
- لا ترفع ملف `.env`. ملف `.gitignore` يستبعده.

## المرحلة 1 — رفع المشروع إلى GitHub

1. فك ضغط `Dive_More_Phase46_No_Docker_DigitalOcean.zip`.
2. افتح مجلد `Dive_More_Phase45_Windows_Desktop_Build_Kit` في VS Code.
3. أنشئ Repository خاصًا (Private) في GitHub.
4. ارفع ملفات المشروع إلى الفرع `main`، مع استبعاد `node_modules` و`dist` و`release` وأي ملف `.env`.
5. تأكد أن الملفات التالية موجودة في GitHub:
   - `server/package.json`
   - `server/src/index.js`
   - `server/src/migrate.js`
   - `server/migrations/001_initial_schema.sql`

## المرحلة 2 — إنشاء قاعدة PostgreSQL في DigitalOcean

1. افتح DigitalOcean Control Panel ثم **Databases → Create Database Cluster**.
2. اختر PostgreSQL وحدد المنطقة والخطة المناسبة. اختر Production للبيانات الحقيقية، لا Dev Database.
3. بعد إنشاء القاعدة، افتح تبويب **Users & Databases** وأنشئ قاعدة/مستخدمًا للتطبيق إذا لزم الأمر.
4. احتفظ ببيانات الاتصال من زر **Connection Details**. استخدم عنوان الاتصال الخاص (Private) عندما يكون التطبيق وقاعدة البيانات ضمن نفس الشبكة/المنطقة ويدعم الإعداد ذلك.
5. في **Network Access / Trusted Sources** اسمح لتطبيق App Platform الذي ستنشئه في الخطوة التالية بالوصول إلى قاعدة البيانات. لا تسمح بكل عناوين الإنترنت.
6. لن تحتاج إلى تثبيت PostgreSQL أو Docker على جهازك إذا كانت القاعدة ستعمل على DigitalOcean.

## المرحلة 3 — نشر Backend على App Platform بدون Docker

1. افتح **Apps → Create App → GitHub** واربط حساب GitHub.
2. اختر Repository الخاص بالمشروع والفرع `main`.
3. اضبط **Source Directory** على `/server` حتى يبني DigitalOcean خدمة الـNode من `server/package.json` فقط.
4. اختر Node.js / Buildpack، وليس Dockerfile أو Container Image. تم حذف ملف Dockerfile من هذه الحزمة لتفادي اختيار Docker بالخطأ.
5. اضبط Run Command على `npm start`، ومنفذ HTTP على `8080`، واجعل عدد النسخ 1 أثناء إنشاء حساب الإدارة الأولي.
6. أضف متغيرات البيئة من إعدادات الخدمة. استخدم **Encrypt** للقيم السرية:

   | Key | Value |
   |---|---|
   | `PORT` | `8080` |
   | `API_PORT` | `8080` |
   | `DATABASE_URL` | انسخ connection string من DigitalOcean Database؛ لا تكتبها في الكود أو GitHub |
   | `PGSSL` | `true` |
   | `JWT_SECRET` | سلسلة عشوائية سرية لا تقل عن 32 حرفًا؛ أنشئها محليًا ولا تشاركها |
   | `BOOTSTRAP_ADMIN_EMAIL` | بريد إداري تتحكم فيه فعلًا |
   | `BOOTSTRAP_ADMIN_PASSWORD` | كلمة مرور قوية عشوائية لا تقل عن 12 حرفًا |
   | `BOOTSTRAP_ADMIN_NAME` | `Dive More Administrator` |
   | `CORS_ORIGINS` | `null` لتطبيق Electron فقط؛ أضف دومين Vercel/Netlify بدقة فقط إذا نشرت واجهة ويب |

7. احفظ الإعدادات ثم اضغط Deploy. راقب **Runtime Logs**. عند أول تشغيل يطبق السيرفر مخطط قاعدة البيانات وينشئ حساب الإدارة إذا لم يكن موجودًا.
8. افتح `https://YOUR-APP-DOMAIN/api/health`. النتيجة المطلوبة هي `{"status":"ok","database":"connected",...}`. لا تعتبر النشر ناجحًا لمجرد أن صفحة الـApp تقول Live؛ افحص نتيجة health.

### إنشاء JWT_SECRET على Windows PowerShell

نفّذ محليًا هذا الأمر للحصول على قيمة عشوائية، ثم انسخ الناتج إلى متغير البيئة المشفر في DigitalOcean فقط:

```powershell
$bytes = New-Object byte[] 48
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($bytes)
[Convert]::ToBase64String($bytes)
$rng.Dispose()
```

استخدم مولد كلمات مرور موثوقًا لكلمة مرور الإدارة. لا تعِد استخدام كلمة المرور التي ظهرت في صورة أو محادثة.

## المرحلة 4 — بناء تطبيق Windows والاتصال بالسيرفر

1. على جهاز Windows المخصص للبناء، ثبّت Node.js 20 أو أحدث.
2. افتح مجلد المشروع واضغط `Build-Installer.bat`.
3. عندما يسأل عن API URL، أدخل عنوان DigitalOcean الحقيقي باستخدام `https://`، مثل `https://اسم-التطبيق.ondigitalocean.app` (استبدل المثال بعنوانك الفعلي).
4. إذا نجح `npm install` والاختبارات والبناء، سيظهر المثبّت في `release\Dive-More-ERP-Setup-0.3.0.exe`.
5. ثبّت الملف على أجهزة الموظفين. لا تضع `DATABASE_URL` أو أي كلمة مرور لقاعدة البيانات على أجهزة الموظفين؛ البرنامج يتصل بالـAPI فقط.

## هل نحتاج Vercel أو Netlify؟

- لتطبيق Windows فقط: **لا**. GitHub + DigitalOcean App Platform + DigitalOcean PostgreSQL كافية للبنية المستضافة.
- إذا أردت واجهة ويب بجانب Windows: اختر **Vercel أو Netlify، وليس الاثنين لنفس الواجهة**، وانشر React كـStatic Site من نفس Repository. Build command: `npm run build`، وOutput Directory: `dist`، ومتغير `VITE_API_URL` هو عنوان API على DigitalOcean. أضف دومين الويب الدقيق إلى `CORS_ORIGINS` في App Platform.

## حدود النسخة الحالية

تم تجهيز API لتسجيل الدخول، فحص صحة القاعدة، جزء من عمليات الحجوزات، وبعض التحقق والصلاحيات. **ليست كل وحدات ERP مرتبطة بالـAPI/PostgreSQL بعد**؛ لا تستخدمها كمصدر مالي إنتاجي حتى تُنقل الدفعات والريفند والبونص والعمولات والسيتيواشن إلى endpoints مركزية وتُختبر مع مستخدمين متزامنين. لا يُعد هذا الدليل إثباتًا أن خدمة DigitalOcean قد نُشرت؛ النشر والاتصال الفعليان يجب تأكيدهما في حسابك.
