# ميزة تسجيل الدخول في صفحة السلة

## الوصف
تم إضافة ميزة جديدة لصفحة السلة تطلب من المستخدمين غير المسجلين تسجيل الدخول قبل إكمال الطلب.

## المكونات المضافة

### 1. LoginRequiredModal
- **الملف**: `src/components/LoginRequiredModal.tsx`
- **الوظيفة**: يعرض رسالة تطلب من المستخدم تسجيل الدخول
- **المحتوى**: 
  - رسالة "يجب تسجيل الدخول لأستكمال البيانات"
  - زر "تسجيل الدخول"
  - زر "إلغاء"

### 2. UserLoginModal
- **الملف**: `src/components/UserLoginModal.tsx`
- **الوظيفة**: مودال تسجيل الدخول للمستخدمين العاديين
- **الميزات**:
  - تسجيل الدخول بـ Google (Popup)
  - تسجيل الدخول بـ Google (Redirect)
  - معالجة الأخطاء
  - رسائل النجاح والفشل

## التعديلات على صفحة السلة

### 1. إضافة المكونات الجديدة
```typescript
import LoginRequiredModal from "@/components/LoginRequiredModal";
import UserLoginModal from "@/components/UserLoginModal";
```

### 2. إضافة متغيرات الحالة
```typescript
const [showLoginRequiredModal, setShowLoginRequiredModal] = useState(false);
const [showUserLoginModal, setShowUserLoginModal] = useState(false);
```

### 3. تعديل دالة handleCompleteProfile
```typescript
const handleCompleteProfile = () => {
  // Check if user is logged in
  if (!userProfile) {
    setShowLoginRequiredModal(true);
    return;
  }
  navigate("/settings");
};
```

### 4. إضافة دالة handleLoginClick
```typescript
const handleLoginClick = () => {
  setShowLoginRequiredModal(false);
  setShowUserLoginModal(true);
};
```

## تدفق العمل

1. **المستخدم غير مسجل الدخول** يضغط على زر "إكمال المعلومات"
2. **يظهر مودال LoginRequiredModal** مع رسالة "يجب تسجيل الدخول لأستكمال البيانات"
3. **المستخدم يضغط على "تسجيل الدخول"**
4. **يظهر مودال UserLoginModal** مع خيارات تسجيل الدخول
5. **بعد تسجيل الدخول بنجاح**، يتم إغلاق المودال ويتم توجيه المستخدم إلى صفحة الإعدادات

## الميزات

- ✅ واجهة مستخدم بديهية
- ✅ معالجة الأخطاء
- ✅ رسائل واضحة للمستخدم
- ✅ دعم تسجيل الدخول بـ Google
- ✅ تصميم متجاوب
- ✅ تكامل مع نظام المصادقة الحالي

## الملفات المعدلة

1. `src/pages/Cart.tsx` - إضافة المودالات وتعديل المنطق
2. `src/components/LoginRequiredModal.tsx` - مكون جديد
3. `src/components/UserLoginModal.tsx` - مكون جديد

## الاختبار

لاختبار الميزة:
1. تأكد من عدم تسجيل الدخول
2. اذهب إلى صفحة السلة
3. أضف منتجات إلى السلة
4. اضغط على زر "إكمال المعلومات"
5. يجب أن يظهر مودال "تسجيل الدخول مطلوب"
6. اضغط على "تسجيل الدخول"
7. يجب أن يظهر مودال تسجيل الدخول
