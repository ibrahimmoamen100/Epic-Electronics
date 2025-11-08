# 🔧 إصلاح قواعد Firebase

## المشكلة:
قواعد Firebase الحالية تسمح فقط للمستخدمين المصادق عليهم بالكتابة:
```javascript
allow read, write: if request.auth != null;
```

## الحل:

### 1. اذهب إلى Firebase Console:
1. اذهب إلى [Firebase Console](https://console.firebase.google.com/)
2. اختر مشروع `epic-electronics-274dd`
3. اذهب إلى **Firestore Database**
4. اضغط على تبويب **"Rules"**

### 2. استبدل القواعد الحالية بهذه:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // السماح بالقراءة والكتابة لجميع المستخدمين (للمشروع الحالي فقط)
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

### 3. أو للقواعد الأكثر أماناً:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // السماح بالقراءة والكتابة لمجموعة admin_config فقط
    match /admin_config/{document} {
      allow read, write: if true;
    }
    
    // السماح بالقراءة والكتابة لمجموعة admin_sessions فقط
    match /admin_sessions/{document} {
      allow read, write: if true;
    }
    
    // السماح بالقراءة والكتابة لمجموعة products
    match /products/{document} {
      allow read, write: if true;
    }
    
    // السماح بالقراءة والكتابة لمجموعة cashier-sales
    match /cashier-sales/{document} {
      allow read, write: if true;
    }
    
    // رفض جميع المجموعات الأخرى
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### 4. اضغط "Publish" لحفظ القواعد

## ⚠️ تحذير أمني:
هذه القواعد تسمح بالوصول العام. للمشاريع الإنتاجية، استخدم قواعد أكثر أماناً.

## بعد التحديث:
1. جرب زر **"تهيئة إعدادات الإدارة"**
2. يجب أن يعمل الآن بدون أخطاء
3. جرب تسجيل الدخول بكلمة المرور: `45086932`

## بديل آمن (اختياري):
إذا كنت تريد أماناً أكثر، يمكنك استخدام القواعد التالية:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // السماح بالقراءة والكتابة من نفس النطاق فقط
    match /{document=**} {
      allow read, write: if request.headers.origin.matches('https://.*\\.vercel\\.app') 
                      || request.headers.origin.matches('http://localhost:.*');
    }
  }
}
```
