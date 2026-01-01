
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Truck,
    CalendarClock,
    User,
    MapPin,
    Phone,
    MessageCircle,
    AlertCircle,
    ShoppingCart
} from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { toast } from 'sonner';
import { formatCurrency } from '@/utils/format';
import { getColorByName } from '@/constants/colors';
import { Product, ProductSize, ProductAddon } from '@/types/product';
import { createOrderAndUpdateProductQuantitiesAtomically } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

interface DirectCheckoutModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    product: Product;
    quantity: number;
    selectedSize: ProductSize | null;
    selectedColor: string;
    selectedAddons: ProductAddon[];
    finalPrice: number;
}

interface DeliveryFormData {
    fullName: string;
    phoneNumber: string;
    address: string;
    city: string;
    notes?: string;
}

interface ReservationFormData {
    fullName: string;
    phoneNumber: string;
    appointmentDate: string;
    appointmentTime: string;
    notes?: string;
}

export function DirectCheckoutModal({
    open,
    onOpenChange,
    product,
    quantity,
    selectedSize,
    selectedColor,
    selectedAddons,
    finalPrice
}: DirectCheckoutModalProps) {
    const { t } = useTranslation();
    const { userProfile } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [orderType, setOrderType] = useState<"online_purchase" | "reservation">("online_purchase");

    // Delivery Form
    const {
        register,
        handleSubmit,
        formState: { errors, isValid },
        reset,
    } = useForm<DeliveryFormData>({
        mode: 'onChange'
    });

    // Reservation Form
    const {
        register: registerReservation,
        handleSubmit: handleSubmitReservation,
        formState: { errors: reservationErrors, isValid: isReservationValid },
        reset: resetReservation,
    } = useForm<ReservationFormData>({
        mode: 'onChange'
    });

    const totalAmount = finalPrice * quantity;

    // Helper to format order item text
    const formatOrderItemText = () => {
        const lines: string[] = [];
        lines.push(`1. ${product.name}`);
        lines.push(`   الكمية: ${quantity}`);
        if (selectedSize) lines.push(`   الحجم: ${selectedSize.label}`);
        if (selectedColor) {
            const colorName = getColorByName(selectedColor).name || selectedColor;
            lines.push(`   اللون: ${colorName}`);
        }
        if (selectedAddons.length > 0) {
            lines.push(`   الإضافات: ${selectedAddons.map(a => a.label).join(', ')}`);
        }
        lines.push(`   السعر: ${formatCurrency(totalAmount, 'جنيه')}`);
        return lines.join('\n');
    };

    const processOrder = async (orderData: any, message: string) => {
        const whatsappNumber = "201025423389";
        const deductions = [{
            productId: product.id,
            quantityToDeduct: quantity
        }];

        try {
            await createOrderAndUpdateProductQuantitiesAtomically(orderData, deductions);

            toast.success(orderData.type === 'reservation' ? 'تم إرسال طلب الحجز بنجاح' : 'تم حفظ الطلب بنجاح');

            const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
            window.open(whatsappUrl, '_blank');

            onOpenChange(false);
            reset();
            resetReservation();

        } catch (error) {
            console.error('Error processing order:', error);
            toast.error(error instanceof Error ? error.message : 'حدث خطأ في حفظ الطلب');
        } finally {
            setIsSubmitting(false);
        }
    };

    const onDeliverySubmit = async (data: DeliveryFormData) => {
        setIsSubmitting(true);

        const orderItem = {
            productId: product.id,
            productName: product.name,
            quantity: quantity,
            price: finalPrice,
            totalPrice: totalAmount,
            image: product.images[0],
            selectedSize: selectedSize ? {
                id: selectedSize.id,
                label: selectedSize.label,
                price: selectedSize.price
            } : null,
            selectedAddons: selectedAddons.map(addon => ({
                id: addon.id,
                label: addon.label,
                price_delta: addon.price_delta
            })),
            selectedColor: selectedColor
        };

        const deliveryInfo = {
            fullName: data.fullName,
            phoneNumber: data.phoneNumber,
            address: data.address,
            city: data.city,
            notes: data.notes || ''
        };

        const orderData = {
            userId: userProfile?.uid || `guest-${Date.now()}`,
            items: [orderItem],
            total: totalAmount,
            status: 'pending',
            type: 'online_purchase', // Explicitly set type
            deliveryInfo,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const orderLines = formatOrderItemText();
        const deliverySection = [
            `👤 الاسم: ${deliveryInfo.fullName}`,
            `🏙 المحافظة: ${deliveryInfo.city}`,
            `📍 العنوان: ${deliveryInfo.address}`,
            `📱 الهاتف: ${deliveryInfo.phoneNumber}`,
            deliveryInfo.notes ? `📝 ملاحظات: ${deliveryInfo.notes}` : null,
        ].filter(Boolean).join('\n');

        const message = [
            '🚀 طلب جديد (شراء أونلاين - مباشر)',
            '========================',
            orderLines,
            '========================',
            '*بيانات الشحن:*',
            deliverySection,
            '========================',
            `💰 إجمالي المبلغ: ${formatCurrency(totalAmount, 'جنيه')}`,
            `📅 التاريخ: ${new Date().toLocaleDateString('ar-EG')}`,
            '========================',
            'يرجى تأكيد الطلب ومراجعة تكاليف الشحن'
        ].join('\n');

        await processOrder(orderData, message);
    };

    const handleReservationSubmit = async (data: ReservationFormData) => {
        setIsSubmitting(true);

        const selectedDate = new Date(data.appointmentDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const maxDate = new Date(today);
        maxDate.setDate(today.getDate() + 2); // Max 2 days in advance

        if (selectedDate > maxDate) {
            toast.error("عذراً، لا يمكن الحجز لأكثر من يومين مقدماً");
            setIsSubmitting(false);
            return;
        }
        if (selectedDate < today) {
            toast.error("تاريخ الحجز لا يمكن أن يكون في الماضي");
            setIsSubmitting(false);
            return;
        }

        const orderItem = {
            productId: product.id,
            productName: product.name,
            quantity: quantity,
            price: finalPrice,
            totalPrice: totalAmount,
            image: product.images[0],
            selectedSize: selectedSize ? {
                id: selectedSize.id,
                label: selectedSize.label,
                price: selectedSize.price
            } : null,
            selectedAddons: selectedAddons.map(addon => ({
                id: addon.id,
                label: addon.label,
                price_delta: addon.price_delta
            })),
            selectedColor: selectedColor
        };

        const reservationInfo = {
            fullName: data.fullName,
            phoneNumber: data.phoneNumber,
            appointmentDate: data.appointmentDate,
            appointmentTime: data.appointmentTime,
            notes: data.notes || ''
        };

        const orderData = {
            userId: userProfile?.uid || `guest-${Date.now()}`,
            items: [orderItem],
            total: totalAmount,
            status: 'pending',
            type: 'reservation',
            reservationInfo,
            deliveryInfo: { // Dummy delivery info for schema compatibility if needed
                fullName: data.fullName,
                phoneNumber: data.phoneNumber,
                address: 'استلام من المحل',
                city: 'لا يوجد',
                notes: `حجز موعد: ${data.appointmentDate}`
            },
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const orderLines = formatOrderItemText();
        const reservationDetails = [
            `👤 الاسم: ${reservationInfo.fullName}`,
            `📱 الهاتف: ${reservationInfo.phoneNumber}`,
            `📅 التاريخ: ${reservationInfo.appointmentDate}`,
            `⏰ الوقت: ${reservationInfo.appointmentTime}`,
            reservationInfo.notes ? `📝 ملاحظات: ${reservationInfo.notes}` : null,
        ].filter(Boolean).join('\n');

        const message = [
            '📅 طلب حجز منتج (مباشر)',
            '========================',
            orderLines,
            '========================',
            '*تفاصيل الحجز:*',
            reservationDetails,
            '========================',
            `💰 إجمالي المبلغ: ${formatCurrency(totalAmount, 'جنيه')}`,
            '========================',
            'سأرسل العربون بعد هذه الرسالة *'
        ].join('\n');

        await processOrder(orderData, message);
    };

    // Date constraints
    const todayDate = new Date();
    const maxDate = new Date();
    maxDate.setDate(todayDate.getDate() + 2);
    const minDateStr = todayDate.toISOString().split('T')[0];
    const maxDateStr = maxDate.toISOString().split('T')[0];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>إتمام الطلب</DialogTitle>
                </DialogHeader>

                <Tabs defaultValue="online_purchase" onValueChange={(v) => setOrderType(v as any)} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-4 h-12 p-1 bg-gray-100/80">
                        <TabsTrigger value="online_purchase" className="h-full data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">
                            <Truck className="h-4 w-4 mr-2" />
                            شراء أونلاين
                        </TabsTrigger>
                        <TabsTrigger value="reservation" className="h-full data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">
                            <CalendarClock className="h-4 w-4 mr-2" />
                            حجز منتج
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="online_purchase" className="space-y-4">
                        {/* Shipping Policy Info */}
                        <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg p-4 border border-yellow-100 mb-4 shadow-sm">
                            <div className="flex gap-3">
                                <div className="p-2 bg-white rounded-lg h-fit shadow-sm border border-yellow-100">
                                    <Truck className="h-5 w-5 text-yellow-600" />
                                </div>
                                <div className="space-y-2 text-sm text-yellow-900 flex-1">
                                    <p className="font-bold flex items-center gap-2">
                                        سياسة الشحن والتوصيل
                                    </p>
                                    <div className="grid grid-cols-1 gap-2 pt-1">
                                        <div className="flex justify-between items-center bg-white/50 p-2 rounded border border-yellow-100/50">
                                            <p className="font-medium flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.4)]" />
                                                داخل القاهرة
                                            </p>
                                            <div className="text-right">
                                                <p className="font-bold text-yellow-800">100 ج.م</p>
                                                <p className="text-[10px] text-yellow-600">(24 ساعة)</p>
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center bg-white/50 p-2 rounded border border-yellow-100/50">
                                            <p className="font-medium flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_4px_rgba(59,130,246,0.4)]" />
                                                جميع المحافظات
                                            </p>
                                            <div className="text-right">
                                                <p className="font-bold text-yellow-800">170 ج.م</p>
                                                <p className="text-[10px] text-yellow-600">(48 ساعة)</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Payment Info */}
                        <div className="bg-purple-50/50 rounded-lg p-4 border border-purple-100 mb-6 shadow-sm">
                            <div className="flex gap-3">
                                <div className="p-2 bg-white rounded-lg h-fit shadow-sm border border-purple-100">
                                    <MessageCircle className="h-5 w-5 text-purple-600" />
                                </div>
                                <div className="space-y-3 text-sm text-purple-900 flex-1">
                                    <p className="font-bold text-base flex items-center gap-2">
                                        طرق الدفع
                                    </p>
                                    <div className="bg-white/60 p-3 rounded border border-purple-100/50 space-y-2">
                                        <div className="flex items-center gap-2 font-medium text-purple-800">
                                            <Phone className="h-4 w-4" /> فودافون كاش / انستا باي
                                        </div>
                                        <p className="text-lg font-bold font-mono dir-ltr text-left text-purple-700 select-all">01025423389</p>
                                    </div>
                                    <div className="text-xs text-purple-700 font-medium bg-purple-100/50 p-2 rounded flex items-start gap-2">
                                        <span className="mt-0.5 block w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                                        يتم أخذ سكرين شوت للتحويل وإرساله على الواتساب لنفس الرقم لتأكيد الطلب.
                                    </div>
                                </div>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit(onDeliverySubmit)} className="space-y-6">
                            <Card className="border-gray-200 shadow-sm">
                                <CardHeader className="py-3 px-4 border-b bg-gray-50/50">
                                    <CardTitle className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                        <User className="h-4 w-4 text-primary" /> بيانات العميل
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-4 space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="fullName" className="text-xs font-semibold text-gray-600">الاسم بالكامل <span className="text-red-500">*</span></Label>
                                        <Input
                                            id="fullName"
                                            placeholder="أدخل اسمك الكامل"
                                            {...register('fullName', { required: 'هذا الحقل إلزامي' })}
                                            className={errors.fullName ? 'border-red-500' : ''}
                                        />
                                        {errors.fullName && <p className="text-xs text-red-500">{errors.fullName.message}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="phoneNumber" className="text-xs font-semibold text-gray-600">رقم الهاتف <span className="text-red-500">*</span></Label>
                                        <Input
                                            id="phoneNumber"
                                            type="tel"
                                            placeholder="01XXXXXXXXX"
                                            {...register('phoneNumber', {
                                                required: 'هذا الحقل إلزامي',
                                                pattern: {
                                                    value: /^01[0-9]{9,}$/,
                                                    message: 'رقم هاتف غير صحيح'
                                                }
                                            })}
                                            className={errors.phoneNumber ? 'border-red-500' : ''}
                                        />
                                        {errors.phoneNumber && <p className="text-xs text-red-500">{errors.phoneNumber.message}</p>}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-gray-200 shadow-sm">
                                <CardHeader className="py-3 px-4 border-b bg-gray-50/50">
                                    <CardTitle className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                        <MapPin className="h-4 w-4 text-primary" /> عنوان التوصيل
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-4 space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="city" className="text-xs font-semibold text-gray-600">المحافظة <span className="text-red-500">*</span></Label>
                                        <Input
                                            id="city"
                                            placeholder="القاهرة، الجيزة، إلخ"
                                            {...register('city', { required: 'هذا الحقل إلزامي' })}
                                            className={errors.city ? 'border-red-500' : ''}
                                        />
                                        {errors.city && <p className="text-xs text-red-500">{errors.city.message}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="address" className="text-xs font-semibold text-gray-600">العنوان بالتفصيل <span className="text-red-500">*</span></Label>
                                        <Input
                                            id="address"
                                            placeholder="الشارع، رقم العمارة، الشقة"
                                            {...register('address', { required: 'هذا الحقل إلزامي' })}
                                            className={errors.address ? 'border-red-500' : ''}
                                        />
                                        {errors.address && <p className="text-xs text-red-500">{errors.address.message}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="notes" className="text-xs font-semibold text-gray-600">ملاحظات <span className="text-gray-400 text-xs">(اختياري)</span></Label>
                                        <Textarea
                                            id="notes"
                                            placeholder="تعليمات إضافية للتوصيل..."
                                            className="resize-none min-h-[80px]"
                                            {...register('notes')}
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            <Button
                                type="submit"
                                disabled={!isValid || isSubmitting}
                                className="w-full h-14 text-lg bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-300"
                            >
                                {isSubmitting ? 'جاري الإرسال...' : (
                                    <span className="flex items-center gap-2">
                                        <ShoppingCart className="h-6 w-6" /> شراء / حجز الآن
                                    </span>
                                )}
                            </Button>
                        </form>
                    </TabsContent>

                    <TabsContent value="reservation" className="space-y-4">
                        <form onSubmit={handleSubmitReservation(handleReservationSubmit)} className="space-y-6">
                            <Card className="border-gray-200 shadow-sm">
                                <CardHeader className="py-3 px-4 border-b bg-gray-50/50">
                                    <CardTitle className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                        <User className="h-4 w-4 text-primary" /> بيانات الحجز
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-4 space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="res-fullName" className="text-xs font-semibold text-gray-600">الاسم بالكامل <span className="text-red-500">*</span></Label>
                                        <Input
                                            id="res-fullName"
                                            placeholder="الاسم"
                                            {...registerReservation("fullName", { required: "مطلوب" })}
                                        />
                                        {reservationErrors.fullName && <p className="text-xs text-red-500">{reservationErrors.fullName.message}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="res-phone" className="text-xs font-semibold text-gray-600">رقم الهاتف <span className="text-red-500">*</span></Label>
                                        <Input
                                            id="res-phone"
                                            placeholder="01XXXXXXXXX"
                                            {...registerReservation("phoneNumber", {
                                                required: "مطلوب",
                                                pattern: { value: /^01[0-9]{9,}$/, message: "رقم غير صحيح" }
                                            })}
                                        />
                                        {reservationErrors.phoneNumber && <p className="text-xs text-red-500">{reservationErrors.phoneNumber.message}</p>}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-gray-200 shadow-sm">
                                <CardHeader className="py-3 px-4 border-b bg-gray-50/50">
                                    <CardTitle className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                        <CalendarClock className="h-4 w-4 text-primary" /> الموعد والتأكيد
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-4 space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-semibold text-gray-600">التاريخ <span className="text-red-500">*</span></Label>
                                            <Input
                                                type="date"
                                                min={minDateStr}
                                                max={maxDateStr}
                                                {...registerReservation("appointmentDate", { required: "مطلوب" })}
                                            />
                                            {reservationErrors.appointmentDate && <p className="text-xs text-red-500">مطلوب</p>}
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-semibold text-gray-600">الوقت <span className="text-red-500">*</span></Label>
                                            <Input
                                                type="time"
                                                {...registerReservation("appointmentTime", { required: "مطلوب" })}
                                            />
                                            {reservationErrors.appointmentTime && <p className="text-xs text-red-500">مطلوب</p>}
                                        </div>
                                    </div>

                                    <div className="pt-2">
                                        <div className="bg-blue-50/50 rounded-lg p-4 border border-blue-100 mb-4">
                                            <div className="flex gap-3">
                                                <div className="p-2 bg-white rounded-lg h-fit shadow-sm border border-blue-100">
                                                    <AlertCircle className="h-5 w-5 text-blue-600" />
                                                </div>
                                                <div className="space-y-3 text-sm text-blue-900 flex-1">
                                                    <div>
                                                        <p className="font-bold text-base mb-1">تأكيد جدية الحجز</p>
                                                        <p className="text-blue-800 leading-relaxed">
                                                            لضمان الحجز، يفضل دفع مبلغ <span className="font-bold text-blue-700">200 جنيه</span> كجدية حجز.
                                                        </p>
                                                    </div>
                                                    <div className="bg-white/60 p-3 rounded border border-blue-100/50 space-y-2">
                                                        <p className="font-semibold text-blue-800 flex items-center gap-2">
                                                            <Phone className="h-4 w-4" /> طرق الدفع المتاحة:
                                                        </p>
                                                        <div className="grid gap-1 pr-6">
                                                            <p className="font-medium">فودافون كاش / انستا باي</p>
                                                            <p className="text-lg font-bold font-mono dir-ltr text-left text-blue-700 select-all">01025423389</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-xs text-blue-700 font-medium bg-blue-100/50 p-2 rounded">
                                                        بعد التحويل، يرجى إرسال صورة التحويل (سكرين شوت) على نفس الرقم عبر واتساب.
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2 pt-2">
                                        <Label className="text-xs font-semibold text-gray-600">ملاحظات إضافية</Label>
                                        <Textarea
                                            placeholder="تفاصيل أخرى..."
                                            {...registerReservation("notes")}
                                            className="min-h-[60px]"
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            <Button
                                type="submit"
                                disabled={!isReservationValid || isSubmitting}
                                className="w-full h-14 text-lg bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-300"
                            >
                                {isSubmitting ? 'جاري الحجز...' : (
                                    <span className="flex items-center gap-2">
                                        <ShoppingCart className="h-6 w-6" /> شراء / حجز الآن
                                    </span>
                                )}
                            </Button>
                        </form>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
