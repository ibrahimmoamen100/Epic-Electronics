import { useStore } from "@/store/useStore";
import { ProductModal } from "@/components/ProductModal";
import LoginRequiredModal from "@/components/LoginRequiredModal";
import { useState, useEffect } from "react";
import { Product } from "@/types/product";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  MessageCircle,
  Eye,
  Settings,
  ShoppingBag,
  Truck,
  MapPin,
  CalendarClock,
  User,
  Phone,
  Building,
  AlertCircle,
  Trash2 as Trash2Icon
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { DEFAULT_SUPPLIER } from "@/constants/supplier";
import { formatCurrency } from "@/utils/format";
import { getColorByName } from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";
import { addDoc, collection } from "firebase/firestore";
import { db, updateProductQuantitiesAtomically, createOrderAndUpdateProductQuantitiesAtomically } from "@/lib/firebase";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface ReservationFormData {
  fullName: string;
  phoneNumber: string;
  appointmentDate: string;
  appointmentTime: string;
  depositMethod?: 'vodafone_cash' | 'instapay' | 'store_visit';
  notes?: string;
}

interface DeliveryFormData {
  fullName: string;
  phoneNumber: string;
  address: string;
  city: string;
  notes?: string;
}

interface SupplierGroup {
  supplierName: string;
  supplierPhone: string;
  items: { product: Product; quantity: number }[];
  total: number;
}

const Cart = () => {
  const cart = useStore((state) => state.cart);
  const removeFromCart = useStore((state) => state.removeFromCart);
  const getCartTotal = useStore((state) => state.getCartTotal);
  const getCartItemPrice = useStore((state) => state.getCartItemPrice);
  const updateCartItemQuantity = useStore((state) => state.updateCartItemQuantity);
  const clearCart = useStore((state) => state.clearCart);
  const { userProfile } = useAuth();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const { t } = useTranslation();
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [showClearCartAlert, setShowClearCartAlert] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLoginRequiredModal, setShowLoginRequiredModal] = useState(false);
  const navigate = useNavigate();

  const [orderType, setOrderType] = useState<"online_purchase" | "reservation">("online_purchase");

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid },
    reset,
  } = useForm<DeliveryFormData>({
    mode: 'onChange'
  });

  const notes = watch("notes");

  const totalAmount = getCartTotal();

  if (cart.length === 0) {
    return (
      <div className="min-h-screen">
        <main className="container py-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">{t("cart.title")}</h1>
          </div>

          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="bg-white rounded-lg border shadow-sm p-8 max-w-md w-full text-center">
              <div className="mx-auto mb-6">
                <div className="bg-gray-100 rounded-full p-6 w-20 h-20 mx-auto flex items-center justify-center">
                  <ShoppingBag className="w-10 h-10 text-gray-400" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {t("cart.emptyTitle")}
              </h2>
              <p className="text-gray-600 mb-8">
                {t("cart.emptyDescription")}
              </p>
              <div className="space-y-3">
                <Button
                  onClick={() => navigate("/products")}
                  className="w-full bg-primary hover:bg-primary/90 text-white"
                  size="lg"
                >
                  <ShoppingBag className="w-5 h-5 mr-2" />
                  {t("cart.startShopping")}
                </Button>
                <Button
                  onClick={() => navigate("/")}
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  العودة للرئيسية
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // --- Helper to map cart items ---
  const mapCartItemsToOrderItems = (cartItems: typeof cart) => {
    return cartItems
      .filter((item) => item.product && item.product.id)
      .map((item) => ({
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
        price: item.unitFinalPrice,
        totalPrice: item.totalPrice,
        image: item.product.images[0],
        selectedSize: item.selectedSize ? {
          id: item.selectedSize.id,
          label: item.selectedSize.label,
          price: item.selectedSize.price
        } : null,
        selectedAddons: item.selectedAddons.map((addon: any) => ({
          id: addon.id,
          label: addon.label,
          price_delta: addon.price_delta
        })),
        selectedColor: item.selectedColor
      }));
  };

  const formatOrderLines = (items: any[]) => {
    return items.map((item, i) => {
      const lines: string[] = [];
      lines.push(`${i + 1}. ${item.productName}`);
      lines.push(`   الكمية: ${item.quantity}`);
      if (item.selectedSize) lines.push(`   الحجم: ${item.selectedSize.label}`);
      if (item.selectedColor) {
        const colorName = getColorByName(item.selectedColor).name || item.selectedColor;
        lines.push(`   اللون: ${colorName}`);
      }
      lines.push(`   السعر: ${formatCurrency(item.totalPrice, 'جنيه')}`);
      return lines.join('\n');
    }).join('\n---------\n');
  };

  const processOrder = async (orderData: any, message: string) => {
    const whatsappNumber = "201025423389";
    const deductions = cart
      .filter((item) => item.product && item.product.id)
      .map(item => ({
        productId: item.product.id,
        quantityToDeduct: item.quantity
      }));

    try {
      if (typeof createOrderAndUpdateProductQuantitiesAtomically === 'function') {
        await createOrderAndUpdateProductQuantitiesAtomically(orderData, deductions);
      } else {
        await addDoc(collection(db, 'orders'), orderData);
        if (typeof updateProductQuantitiesAtomically === 'function') {
          await updateProductQuantitiesAtomically(deductions);
        }
      }
      toast.success(orderData.type === 'reservation' ? 'تم إرسال طلب الحجز بنجاح' : 'تم حفظ الطلب بنجاح');

      const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');

      reset();
      // resetReservation is called inside handleReservationSubmit if needed, but we can do a global reload
      await clearCart(true);
      await useStore.getState().loadProducts();
      navigate("/orders");

    } catch (error) {
      console.error('Error processing order:', error);
      toast.error('حدث خطأ في حفظ الطلب');
    } finally {
      setIsSubmitting(false);
    }
  };

  const onDeliverySubmit = async (data: DeliveryFormData) => {
    setIsSubmitting(true);
    const orderItems = mapCartItemsToOrderItems(cart);
    const deliveryInfo = {
      fullName: data.fullName,
      phoneNumber: data.phoneNumber,
      address: data.address,
      city: data.city,
      notes: data.notes || ''
    };

    const orderData = {
      userId: userProfile?.uid || `guest-${Date.now()}`,
      items: orderItems,
      total: getCartTotal(),
      status: 'pending',
      deliveryInfo,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const orderLines = formatOrderLines(orderItems);
    const deliverySection = [
      `👤 الاسم: ${deliveryInfo.fullName}`,
      `🏙 المحافظة: ${deliveryInfo.city}`,
      `📍 العنوان: ${deliveryInfo.address}`,
      `📱 الهاتف: ${deliveryInfo.phoneNumber}`,
      deliveryInfo.notes ? `📝 ملاحظات: ${deliveryInfo.notes}` : null,
    ].filter(Boolean).join('\n');

    const message = [
      '🚀 طلب جديد (شراء أونلاين)',
      '========================',
      orderLines,
      '========================',
      '*بيانات الشحن:*',
      deliverySection,
      '========================',
      `💰 إجمالي المبلغ: ${formatCurrency(getCartTotal(), 'جنيه')}`,
      `📅 التاريخ: ${new Date().toLocaleDateString('ar-EG')}`,
      '========================',
      'يرجى تأكيد الطلب ومراجعة تكاليف الشحن'
    ].join('\n');

    await processOrder(orderData, message);
  };

  const {
    register: registerReservation,
    handleSubmit: handleSubmitReservation,
    setValue: setReservationValue,
    watch: watchReservation,
    formState: { errors: reservationErrors, isValid: isReservationValid },
    reset: resetReservation,
  } = useForm<ReservationFormData>({
    mode: 'onChange',
    defaultValues: {
      depositMethod: 'vodafone_cash'
    }
  });

  const depositMethod = watchReservation("depositMethod");

  const handleReservationSubmit = async (data: ReservationFormData) => {
    setIsSubmitting(true);

    const selectedDate = new Date(data.appointmentDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maxDate = new Date(today);
    maxDate.setDate(today.getDate() + 2);

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

    const orderItems = mapCartItemsToOrderItems(cart);
    const reservationInfo = {
      fullName: data.fullName,
      phoneNumber: data.phoneNumber,
      appointmentDate: data.appointmentDate,
      appointmentTime: data.appointmentTime,
      depositMethod: data.depositMethod,
      notes: data.notes || ''
    };

    const orderData = {
      userId: userProfile?.uid || `guest-${Date.now()}`,
      items: orderItems,
      total: getCartTotal(),
      status: 'pending',
      type: 'reservation',
      reservationInfo,
      deliveryInfo: {
        fullName: data.fullName,
        phoneNumber: data.phoneNumber,
        address: 'استلام من المحل',
        city: 'لا يوجد',
        notes: `حجز موعد: ${data.appointmentDate}`
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const orderLines = formatOrderLines(orderItems);


    const reservationDetails = [
      `👤 الاسم: ${reservationInfo.fullName}`,
      `📱 الهاتف: ${reservationInfo.phoneNumber}`,
      `📅 التاريخ: ${reservationInfo.appointmentDate}`,
      `⏰ الوقت: ${reservationInfo.appointmentTime}`,
      reservationInfo.notes ? `📝 ملاحظات: ${reservationInfo.notes}` : null,
    ].filter(Boolean).join('\n');

    const message = [
      '📅 طلب حجز منتج',
      '========================',
      orderLines,
      '========================',
      '*تفاصيل الحجز:*',
      reservationDetails,
      '========================',
      `💰 إجمالي المبلغ: ${formatCurrency(getCartTotal(), 'جنيه')}`,
      '========================',
      `   سأرسل العربون بعد هذه الرساله  *`,

    ].join('\n');

    // Manually call process logic here because resetReservation is involved
    const deductions = cart
      .filter((item) => item.product && item.product.id)
      .map(item => ({
        productId: item.product.id,
        quantityToDeduct: item.quantity
      }));

    try {
      const whatsappNumber = "201025423389";
      if (typeof createOrderAndUpdateProductQuantitiesAtomically === 'function') {
        await createOrderAndUpdateProductQuantitiesAtomically(orderData, deductions);
      } else {
        await addDoc(collection(db, 'orders'), orderData);
        if (typeof updateProductQuantitiesAtomically === 'function') {
          await updateProductQuantitiesAtomically(deductions);
        }
      }
      toast.success('تم إرسال طلب الحجز بنجاح');
      const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');

      resetReservation();
      await clearCart(true);
      await useStore.getState().loadProducts();
      navigate("/orders");
    } catch (error) {
      console.error(error);
      toast.error('خطأ');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Date constraints
  const todayDate = new Date();
  const maxDate = new Date();
  maxDate.setDate(todayDate.getDate() + 2);
  const minDateStr = todayDate.toISOString().split('T')[0];
  const maxDateStr = maxDate.toISOString().split('T')[0];

  const handleDeleteClick = (productId: string) => {
    setProductToDelete(productId);
    setShowDeleteAlert(true);
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      <main className="container py-8">
        <h1 className="text-3xl font-bold mb-8">{t("cart.title")}</h1>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Right Column: Cart Items & Summary */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="overflow-hidden border-gray-200 shadow-sm">
              <CardHeader className="bg-gray-50/50 py-4 border-b">
                <CardTitle className="text-lg font-medium flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-primary" />
                  محتويات السلة ({cart.reduce((acc, item) => acc + item.quantity, 0)})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-gray-100">
                  {cart
                    .filter((item) => item.product && item.product.id)
                    .map((item) => {
                      return (
                        <div
                          key={`${item.product.id}-${item.selectedSize?.id || 'no-size'}-${item.selectedAddons.map(a => a.id).sort().join('-')}`}
                          className="flex gap-4 p-4 hover:bg-gray-50/50 transition-colors group"
                        >
                          <div className="relative h-24 w-24 flex-shrink-0 rounded-lg border border-gray-200 overflow-hidden bg-white">
                            {(() => {
                              const availableColors = item.product.color ? item.product.color.split(',').map(c => c.trim()) : [];
                              const colorImageMapping: { [key: string]: string } = {};
                              availableColors.forEach((color, index) => {
                                if (item.product.images && item.product.images[index]) {
                                  colorImageMapping[color] = item.product.images[index];
                                }
                              });
                              const displayImage = item.selectedColor && colorImageMapping[item.selectedColor]
                                ? colorImageMapping[item.selectedColor]
                                : item.product.images[0];
                              return (
                                <img
                                  src={displayImage}
                                  alt={item.product.name}
                                  className="h-full w-full object-contain p-1 cursor-pointer"
                                  onClick={() => navigate(`/product/${item.product.id}`)}
                                />
                              );
                            })()}
                          </div>

                          <div className="flex-1 flex flex-col justify-between">
                            <div>
                              <div className="flex justify-between items-start gap-2">
                                <h3
                                  className="font-semibold text-gray-900 md:text-base text-sm line-clamp-2 cursor-pointer hover:text-primary transition-colors"
                                  onClick={() => navigate(`/product/${item.product.id}`)}
                                >
                                  {item.product.name}
                                </h3>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-gray-400 hover:text-red-500 hover:bg-red-50 h-8 w-8 -mt-1 -ml-2 transition-colors"
                                  onClick={() => handleDeleteClick(item.product.id)}
                                >
                                  <Trash2Icon className="h-4 w-4" />
                                </Button>
                              </div>
                              <div className="text-sm text-gray-500 mt-2 space-y-1.5">
                                {item.selectedSize && (
                                  <p className="flex items-center gap-2">
                                    <span className="w-16">الحجم:</span>
                                    <span className="font-medium text-gray-900 bg-gray-100 px-2 py-0.5 rounded text-xs">{item.selectedSize.label}</span>
                                  </p>
                                )}
                                {item.selectedColor && (
                                  <p className="flex items-center gap-2">
                                    <span className="w-16">اللون:</span>
                                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-gray-100 border border-gray-200">
                                      <span className="w-3 h-3 rounded-full border shadow-sm" style={{ backgroundColor: item.selectedColor }} />
                                      <span className="font-medium text-gray-900 text-xs">{getColorByName(item.selectedColor).name}</span>
                                    </span>
                                  </p>
                                )}
                                {item.selectedAddons && item.selectedAddons.length > 0 && (
                                  <p className="flex items-start gap-2">
                                    <span className="w-16 shrink-0 mt-0.5">الإضافات:</span>
                                    <div className="flex flex-wrap gap-1">
                                      {item.selectedAddons.map(a => (
                                        <span key={a.id} className="text-xs bg-green-50 text-green-700 px-1.5 py-0.5 rounded border border-green-100">
                                          {a.label}
                                        </span>
                                      ))}
                                    </div>
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center justify-between mt-4 pt-3 border-t border-dashed border-gray-200">
                              <div className="flex items-center border border-gray-200 rounded-lg bg-white shadow-sm overflow-hidden">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-none hover:bg-gray-100"
                                  onClick={async () => {
                                    const newQuantity = Math.max(0, item.quantity - 1);
                                    if (newQuantity === 0) handleDeleteClick(item.product.id);
                                    else {
                                      updateCartItemQuantity(
                                        item.product.id,
                                        newQuantity,
                                        item.selectedSize?.id || null,
                                        item.selectedAddons?.map(a => a.id) || [],
                                        item.selectedColor
                                      );
                                    }
                                  }}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /></svg>
                                </Button>
                                <span className="w-10 text-center text-sm font-semibold text-gray-900">{item.quantity}</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-none hover:bg-gray-100"
                                  onClick={async () => {
                                    updateCartItemQuantity(
                                      item.product.id,
                                      item.quantity + 1,
                                      item.selectedSize?.id || null,
                                      item.selectedAddons?.map(a => a.id) || [],
                                      item.selectedColor
                                    );
                                  }}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
                                </Button>
                              </div>
                              <div className="font-bold text-sm md:text-base text-primary flex items-center gap-1">
                                {formatCurrency(item.totalPrice, 'جنيه')}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>

                <div className="bg-gray-50/80 p-6 border-t border-gray-100">
                  <div className="space-y-3">
                    <div className="flex justify-between flex-col items-start text-gray-600">
                      <span>إجمالي المنتجات ({cart.reduce((acc, item) => acc + item.quantity, 0)})</span>
                      <div className="flex  justify-between w-full items-center gap-2">

                        <span className="text-lg font-bold flex flex-col items-start " > الإجمالي

                          <span className="text-[12px] text-gray-400"> (غير شامل الشحن) </span>
                        </span>

                        <span className="text-xl font-bold">{formatCurrency(totalAmount, 'جنيه')}</span>
                      </div>
                    </div>

                  </div>

                  <div className="pt-4 mt-2">
                    <Button
                      variant="outline"
                      className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200 transition-colors h-10 text-sm"
                      onClick={() => setShowClearCartAlert(true)}
                    >
                      <Trash2Icon className="h-4 w-4 mr-2" />
                      مسح السلة بالكامل
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>


          </div>

          {/* Left Column: Checkout Forms */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 space-y-6">
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

                  {/* Shipping Policy Info - Integrated */}
                  <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg p-4 border border-yellow-100 mb-4 shadow-sm">
                    <div className="flex gap-3">
                      <div className="p-2 bg-white rounded-lg h-fit shadow-sm border border-yellow-100">
                        <Truck className="h-5 w-5 text-yellow-600" />
                      </div>
                      <div className="space-y-2 text-sm text-yellow-900 flex-1">
                        <p className="font-bold flex items-center gap-2">
                          سياسة الشحن والتوصيل
                          <span className="text-[10px] bg-yellow-100 px-2 py-0.5 rounded-full text-yellow-700">هام</span>
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

                  {/* Payment Info for Online Purchase */}
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
                          <p className="text-lg font-bold font-mono dir-ltr text-left text-purple-700 pl-6 select-all">01025423389</p>
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
                      className="w-full bg-[#25D366] hover:bg-[#20BA5A] text-white py-6 text-lg shadow-md hover:shadow-lg transition-all"
                    >
                      {isSubmitting ? 'جاري الإرسال...' : (
                        <span className="flex items-center gap-2">
                          <FaWhatsapp className="h-5 w-5" /> إتمام الطلب عبر واتساب
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
                          {/* Payment Info / Instructions for Reservation (Replaces RadioGroup) */}
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
                      className="w-full bg-[#25D366] hover:bg-[#20BA5A] text-white py-6 text-lg shadow-md hover:shadow-lg transition-all"
                    >
                      {isSubmitting ? 'جاري الحجز...' : (
                        <span className="flex items-center gap-2">
                          <FaWhatsapp className="h-5 w-5" /> تأكيد الحجز واتساب
                        </span>
                      )}
                    </Button>

                  </form>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>حذف المنتج</AlertDialogTitle>
              <AlertDialogDescription>
                هل أنت متأكد من حذف هذا المنتج من السلة؟
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction onClick={async () => {
                if (productToDelete) {
                  try {
                    removeFromCart(productToDelete);
                    toast.success("تم حذف المنتج من السلة");
                  } catch (error) {
                    toast.error("خطأ في حذف المنتج");
                  }
                }
                setShowDeleteAlert(false);
                setProductToDelete(null);
              }}>
                حذف
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Clear Cart Confirmation Dialog */}
        <AlertDialog open={showClearCartAlert} onOpenChange={setShowClearCartAlert}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>مسح السلة</AlertDialogTitle>
              <AlertDialogDescription>
                هل أنت متأكد من مسح جميع المنتجات من السلة؟ سيتم استعادة الكميات المحفوظة في المخزن.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction onClick={async () => {
                try {
                  await clearCart();
                  setShowClearCartAlert(false);
                  toast.success("تم مسح السلة");
                } catch (error) {
                  console.error('Error clearing cart:', error);
                  toast.error("فشل في مسح السلة");
                }
              }}>
                مسح
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <ProductModal
          product={selectedProduct}
          open={modalOpen}
          onOpenChange={setModalOpen}
          hideAddToCart={true}
        />
        <LoginRequiredModal
          open={showLoginRequiredModal}
          onOpenChange={setShowLoginRequiredModal}
        />
      </main>
    </div>
  );
};

export default Cart;

function getCartItemPrice(item: any) {
  if (typeof item?.unitFinalPrice === "number") {
    return item.unitFinalPrice;
  }
  const now = new Date();
  const product = item?.product || {};
  let price = Number(product.price ?? 0);
  const hasDiscount =
    product.specialOffer &&
    typeof product.discountPercentage === "number" &&
    product.discountPercentage > 0;

  if (hasDiscount) {
    const endsAt = product.offerEndsAt ? new Date(product.offerEndsAt) : null;
    if (!endsAt || endsAt > now) {
      const discount = Number(product.discountPercentage);
      price = price * (1 - discount / 100);
    }
  }

  if (item?.selectedSize?.price != null) {
    price += Number(item.selectedSize.price);
  }

  if (Array.isArray(item?.selectedAddons)) {
    price += item.selectedAddons.reduce((sum: number, addon: any) => {
      return sum + Number(addon.price_delta ?? addon.price ?? 0);
    }, 0);
  }
  return Math.round(price * 100) / 100;
}

async function clearCart(): Promise<void> {
  const store = useStore.getState();
  const currentCart = store.cart ?? [];
  if (currentCart.length === 0) {
    if (typeof store.clearCart === "function") {
      store.clearCart();
    } else if (typeof (store as any).setCart === "function") {
      (store as any).setCart([]);
    }
    return;
  }
  const restorePayload = currentCart
    .filter((item: any) => item.product && item.product.id)
    .map((item: any) => ({
      productId: item.product.id,
      quantityToRestore: item.quantity,
    }));
  const negativeDeductPayload = currentCart
    .filter((item: any) => item.product && item.product.id)
    .map((item: any) => ({
      productId: item.product.id,
      quantityToDeduct: -item.quantity,
    }));

  try {
    const lib = await import("@/lib/firebase");
    if (typeof lib.restoreProductQuantitiesAtomically === "function") {
      try {
        await lib.restoreProductQuantitiesAtomically(restorePayload);
      } catch {
        await lib.restoreProductQuantitiesAtomically(restorePayload as any);
      }
    } else if (typeof lib.updateProductQuantitiesAtomically === "function") {
      await lib.updateProductQuantitiesAtomically(negativeDeductPayload);
    }
  } catch (err) {
    console.warn("clearCart: failed to restore quantities atomically", err);
  } finally {
    if (typeof store.clearCart === "function") {
      store.clearCart();
    } else if (typeof (store as any).setCart === "function") {
      (store as any).setCart([]);
    } else if (typeof (store as any).removeAll === "function") {
      (store as any).removeAll();
    }
  }
}
