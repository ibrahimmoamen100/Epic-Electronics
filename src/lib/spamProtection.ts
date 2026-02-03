import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from './firebase';

export interface SpamCheckParams {
    orderType: 'online_purchase' | 'reservation';
    fullName: string;
    phoneNumber: string;
    address?: string;
    appointmentDate?: string;
    appointmentTime?: string;
    productId: string;
    selectedSize?: { id?: string; label?: string; price?: number } | null;
    selectedAddons?: { id?: string; label?: string; price_delta?: number }[];
    selectedColor?: string | null;
}

export interface SpamCheckResult {
    isSpam: boolean;
    message?: string;
}

export const checkOrderSpam = async (params: SpamCheckParams): Promise<SpamCheckResult> => {
    try {
        const { orderType, fullName, phoneNumber, address, appointmentDate, appointmentTime, productId, selectedSize, selectedAddons, selectedColor } = params;

        console.log('🔍 بدء فحص التكرار للطلب:', { orderType, fullName, phoneNumber, productId, selectedSize, selectedAddons, selectedColor });

        // 1. حساب الفترة الزمنية (30 دقيقة ماضية)
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
        const thresholdTimestamp = Timestamp.fromDate(thirtyMinutesAgo);

        // 2. استعلام بسيط: جلب جميع الطلبات من آخر 30 دقيقة
        const ordersRef = collection(db, 'orders');
        const q = query(
            ordersRef,
            where('createdAt', '>=', thresholdTimestamp)
        );

        console.log('📊 تنفيذ استعلام Firebase للطلبات الحديثة...');
        const snapshot = await getDocs(q);
        console.log(`✅ تم جلب ${snapshot.docs.length} طلب من آخر 30 دقيقة`);

        if (snapshot.docs.length === 0) {
            console.log('✅ لا توجد طلبات حديثة - السماح بالطلب');
            return { isSpam: false };
        }

        // 3. فلترة يدوية للطلبات بناءً على رقم الهاتف ونوع الطلب
        const recentOrders = snapshot.docs.map(doc => ({
            id: doc.id,
            data: doc.data()
        }));

        console.log('🔎 بدء الفلترة اليدوية للطلبات...');

        // 4. التحقق من التكرار بناءً على نوع الطلب
        if (orderType === 'online_purchase') {
            // قاعدة الشراء أونلاين: نفس الاسم + نفس العنوان + نفس رقم الهاتف + نفس المنتج + نفس المواصفات
            for (const order of recentOrders) {
                const orderData = order.data;

                // التحقق من وجود deliveryInfo والحقول المطلوبة
                const deliveryInfo = orderData.deliveryInfo;
                if (!deliveryInfo) continue;

                // التحقق من تطابق رقم الهاتف
                const orderPhone = deliveryInfo.phoneNumber;
                if (orderPhone !== phoneNumber) continue;

                // التحقق من تطابق الاسم
                const orderName = deliveryInfo.fullName;
                if (orderName !== fullName) continue;

                // التحقق من تطابق العنوان
                const orderAddress = deliveryInfo.address;
                if (orderAddress !== address) continue;

                // إذا وصلنا هنا، فهذا يعني أن البيانات الشخصية متطابقة
                // الآن نتحقق من معلومات المنتج
                const items = orderData.items || [];

                // التحقق من وجود نفس المنتج في الطلب القديم
                const matchingItem = items.find((item: any) => item.productId === productId);

                if (matchingItem) {
                    // التحقق من تطابق الحجم
                    const isSameSize = (!selectedSize && !matchingItem.selectedSize) ||
                        (selectedSize && matchingItem.selectedSize && selectedSize.id === matchingItem.selectedSize.id);

                    // التحقق من تطابق اللون
                    const isSameColor = (!selectedColor && !matchingItem.selectedColor) ||
                        (selectedColor === matchingItem.selectedColor);

                    // التحقق من تطابق الإضافات
                    const orderAddons = matchingItem.selectedAddons || [];
                    const newAddons = selectedAddons || [];
                    const isSameAddons = orderAddons.length === newAddons.length &&
                        orderAddons.every((addon: any) =>
                            newAddons.some(newAddon => newAddon.id === addon.id)
                        );

                    // إذا كانت جميع المواصفات متطابقة، نعتبره طلب مكرر
                    if (isSameSize && isSameColor && isSameAddons) {
                        console.log('🚫 تم اكتشاف طلب مكرر (شراء أونلاين) بنفس المواصفات:', order.id);
                        return {
                            isSpam: true,
                            message: 'لديك طلب مسجل بالفعل بنفس البيانات والمواصفات. يرجى الانتظار قبل إنشاء طلب جديد أو التواصل مع الدعم.'
                        };
                    } else {
                        console.log('✅ نفس المستخدم لكن مواصفات مختلفة - السماح بالطلب');
                    }
                }
            }

        } else if (orderType === 'reservation') {
            // قاعدة الحجز: نفس الاسم + نفس رقم الهاتف + نفس التاريخ + نفس الوقت + نفس المنتج + نفس المواصفات
            for (const order of recentOrders) {
                const orderData = order.data;

                // التحقق من وجود reservationInfo والحقول المطلوبة
                const reservationInfo = orderData.reservationInfo;

                // إذا لم يكن هناك reservationInfo، قد يكون الهاتف في deliveryInfo
                let orderPhone = reservationInfo?.phoneNumber;
                let orderName = reservationInfo?.fullName;
                let orderDate = reservationInfo?.appointmentDate;
                let orderTime = reservationInfo?.appointmentTime;

                // إذا لم نجد المعلومات في reservationInfo، نحاول deliveryInfo
                if (!orderPhone && orderData.deliveryInfo) {
                    orderPhone = orderData.deliveryInfo.phoneNumber;
                    orderName = orderData.deliveryInfo.fullName;
                }

                if (!orderPhone || orderPhone !== phoneNumber) continue;
                if (!orderName || orderName !== fullName) continue;

                // التحقق من تطابق التاريخ والوقت
                if (orderDate !== appointmentDate || orderTime !== appointmentTime) continue;

                // إذا وصلنا هنا، فهذا يعني أن البيانات الشخصية والتوقيت متطابقة
                // الآن نتحقق من معلومات المنتج
                const items = orderData.items || [];

                // التحقق من وجود نفس المنتج في الطلب القديم
                const matchingItem = items.find((item: any) => item.productId === productId);

                if (matchingItem) {
                    // التحقق من تطابق الحجم
                    const isSameSize = (!selectedSize && !matchingItem.selectedSize) ||
                        (selectedSize && matchingItem.selectedSize && selectedSize.id === matchingItem.selectedSize.id);

                    // التحقق من تطابق اللون
                    const isSameColor = (!selectedColor && !matchingItem.selectedColor) ||
                        (selectedColor === matchingItem.selectedColor);

                    // التحقق من تطابق الإضافات
                    const orderAddons = matchingItem.selectedAddons || [];
                    const newAddons = selectedAddons || [];
                    const isSameAddons = orderAddons.length === newAddons.length &&
                        orderAddons.every((addon: any) =>
                            newAddons.some(newAddon => newAddon.id === addon.id)
                        );

                    // إذا كانت جميع المواصفات متطابقة، نعتبره حجز مكرر
                    if (isSameSize && isSameColor && isSameAddons) {
                        console.log('🚫 تم اكتشاف حجز مكرر بنفس المواصفات:', order.id);
                        return {
                            isSpam: true,
                            message: 'لديك حجز مسجل بالفعل في نفس التوقيت بنفس المواصفات. لا يمكن تكرار الحجز خلال نفس الفترة الزمنية.'
                        };
                    } else {
                        console.log('✅ نفس المستخدم لكن مواصفات مختلفة - السماح بالحجز');
                    }
                }
            }
        }

        console.log('✅ لم يتم اكتشاف تكرار - السماح بالطلب');
        return { isSpam: false };

    } catch (error) {
        console.error('❌ خطأ أثناء فحص التكرار:', error);
        // في حالة الخطأ، نسمح بالطلب لتجنب منع المستخدمين الشرعيين
        // لكن نسجل الخطأ للمتابعة
        return { isSpam: false };
    }
};
