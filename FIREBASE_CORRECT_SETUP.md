# 🔧 الإعداد الصحيح لـ Firebase

## ❌ ما فعلته (غير صحيح):
- Document ID: auto
- Field: admin_config
- Value: 45086932

## ✅ الطريقة الصحيحة:

### 1. إنشاء المجموعة (Collection):
- **Collection ID**: `admin_config`

### 2. إنشاء الوثيقة (Document):
- **Document ID**: `admin` (ليس auto!)

### 3. إضافة الحقول (Fields):
```
Field Name: password
Type: string
Value: 45086932

Field Name: role
Type: string
Value: admin

Field Name: createdAt
Type: timestamp
Value: (اختر التاريخ الحالي)

Field Name: lastLogin
Type: timestamp
Value: (اختر التاريخ الحالي)

Field Name: isActive
Type: boolean
Value: true
```

## 📋 الخطوات التفصيلية:

### في Firebase Console:
1. اذهب إلى **Firestore Database**
2. اضغط **"Start collection"**
3. **Collection ID**: اكتب `admin_config`
4. اضغط **"Next"**
5. **Document ID**: اكتب `admin` (مهم جداً!)
6. اضغط **"Done"**

### إضافة الحقول:
1. اضغط على الوثيقة `admin`
2. اضغط **"Add field"**
3. أضف الحقول التالية:

| Field Name | Type | Value |
|------------|------|-------|
| password | string | 45086932 |
| role | string | admin |
| createdAt | timestamp | الآن |
| lastLogin | timestamp | الآن |
| isActive | boolean | true |

## 🔍 النتيجة النهائية:
```
Collection: admin_config
Document: admin
Fields:
  - password: "45086932"
  - role: "admin"
  - createdAt: [timestamp]
  - lastLogin: [timestamp]
  - isActive: true
```

## ⚠️ ملاحظات مهمة:
- Document ID يجب أن يكون `admin` بالضبط
- لا تستخدم auto-generated ID
- تأكد من أن جميع الحقول موجودة
- تأكد من أن `isActive` هو `true`

## 🧪 للتحقق:
بعد الإعداد الصحيح، جرب تسجيل الدخول بكلمة المرور `45086932`
