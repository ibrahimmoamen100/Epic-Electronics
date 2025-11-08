import { useStore } from "@/store/useStore";
import { ProductModal } from "@/components/ProductModal";
import LoginRequiredModal from "@/components/LoginRequiredModal";
import { useState, useEffect } from "react";
import { Product } from "@/types/product";
import { Button } from "@/components/ui/button";
import {
  MessageCircle,
  Trash2,
  Eye,
  Plus,
  Minus,
  AlertCircle,
  Settings,
  ShoppingBag,
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
import { toast } from "sonner";
import { DEFAULT_SUPPLIER } from "@/constants/supplier";
import { formatCurrency } from "@/utils/format";
import { getColorByName } from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";
import { addDoc, collection } from "firebase/firestore";
import { db, updateProductQuantitiesAtomically, createOrderAndUpdateProductQuantitiesAtomically } from "@/lib/firebase";
import { useNavigate } from "react-router-dom";

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
  const addToCart = useStore((state) => state.addToCart);
  const updateCartItemQuantity = useStore((state) => state.updateCartItemQuantity);
  const clearCart = useStore((state) => state.clearCart);
  const getCartTotal = useStore((state) => state.getCartTotal);
  const getCartItemPrice = useStore((state) => state.getCartItemPrice);
  const updateProductQuantity = useStore((state) => state.updateProductQuantity);
  const { userProfile, loading: authLoading } = useAuth();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const { t } = useTranslation();
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [showClearCartAlert, setShowClearCartAlert] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLoginRequiredModal, setShowLoginRequiredModal] = useState(false);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid },
    reset,
  } = useForm<DeliveryFormData>({
    mode: 'onChange'
  });

  // Watch form fields for validation
  const notes = watch("notes");

  // Group cart items by supplier for WhatsApp messaging only
  const supplierGroupsForMessaging: SupplierGroup[] = cart.reduce(
    (groups: SupplierGroup[], item) => {
      const supplierName =
        item.product.wholesaleInfo?.supplierName || DEFAULT_SUPPLIER.name;
      const supplierPhone = (
        item.product.wholesaleInfo?.supplierPhone || DEFAULT_SUPPLIER.phone
      ).replace(/^0/, "20");

      const existingGroup = groups.find(
        (group) => group.supplierName === supplierName
      );
      const price = getCartItemPrice(item);

      if (existingGroup) {
        existingGroup.items.push(item);
        existingGroup.total += price * item.quantity;
      } else {
        groups.push({
          supplierName,
          supplierPhone,
          items: [item],
          total: price * item.quantity,
        });
      }

      return groups;
    },
    []
  );

  // Calculate total for display using the new function
  const totalAmount = getCartTotal();

  // Function to send WhatsApp message with order details
  const sendWhatsAppOrderMessage = async (orderData: any, deliveryInfo: any) => {
    try {
  const whatsappNumber = "201024911062";
      
      // Format order items with better structure (size, color, addons)
      const orderItemsText = orderData.items.map((item: any, index: number) => {
        const lines: string[] = [];
        lines.push(`*${index + 1}- ${item.productName}*`);
        lines.push(`   الكمية: ${item.quantity}`);

        if (item.selectedSize) {
          const sizePrice = item.selectedSize.price ? ` (${formatCurrency(item.selectedSize.price, 'جنيه')})` : '';
          lines.push(`   الحجم: ${item.selectedSize.label}${sizePrice}`);
        }

        if (item.selectedColor) {
          // Try to resolve color name if available
          const colorName = getColorByName(item.selectedColor).name || item.selectedColor;
          lines.push(`   اللون: ${colorName}`);
        }

        if (item.selectedAddons && item.selectedAddons.length > 0) {
          lines.push(`   الإضافات:`);
          item.selectedAddons.forEach((addon: any) => {
            const addonPrice = addon.price_delta ? ` (+${formatCurrency(addon.price_delta, 'جنيه')})` : '';
            lines.push(`     - ${addon.label}${addonPrice}`);
          });
        }

        lines.push(`   السعر: ${formatCurrency(item.totalPrice, 'جنيه')}`);
        return lines.join('\n');
      }).join('\n\n');

      // Format delivery information with better structure
      const deliveryText = `*معلومات التوصيل:*
الاسم: ${deliveryInfo.fullName}
الهاتف: ${deliveryInfo.phoneNumber}
العنوان: ${deliveryInfo.address}
المدينة: ${deliveryInfo.city}
${deliveryInfo.notes ? `ملاحظات: ${deliveryInfo.notes}` : ''}`;

      // Create the complete message with improved formatting
      const message = `*طلب جديد من المتجر*

${'='.repeat(30)}

*تفاصيل الطلب:*
${orderItemsText}

${'='.repeat(30)}

*المجموع الكلي: ${formatCurrency(orderData.total, 'جنيه')}*

${'='.repeat(30)}

${deliveryText}

${'='.repeat(30)}

*رقم الطلب:* ${orderData.userId.slice(-8)}
*التاريخ:* ${new Date().toLocaleDateString('ar-EG')}
*الوقت:* ${new Date().toLocaleTimeString('ar-EG')}

${'='.repeat(30)}
${'='.repeat(30)}

*تم إرسال هذا الطلب تلقائياً من نظام المتجر*`;

      // Create WhatsApp URL
      const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
      
      // Open WhatsApp in a new tab
      window.open(whatsappUrl, '_blank');
      
      console.log('WhatsApp message sent successfully');
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      // Don't show error to user as this is not critical
    }
  };

  // Function to save order to Firebase
  const saveOrderToFirebase = async () => {
    if (!userProfile) {
      toast.error("يرجى تسجيل الدخول أولاً");
      return;
    }

    if (!isValid) {
      toast.error("يرجى إكمال جميع حقول معلومات التوصيل");
      return;
    }

    setIsSubmitting(true);
    try {
      console.log('Saving order for user:', userProfile.uid);
      console.log('User profile:', userProfile);
      
      const orderItems = cart.map((item) => {
        return {
          productId: item.product.id,
          productName: item.product.name,
          quantity: item.quantity,
          price: item.unitFinalPrice, // Use the calculated final price
          totalPrice: item.totalPrice,
          image: item.product.images[0],
          selectedSize: item.selectedSize ? {
            id: item.selectedSize.id,
            label: item.selectedSize.label,
            price: item.selectedSize.price
          } : null,
          selectedAddons: item.selectedAddons.map(addon => ({
            id: addon.id,
            label: addon.label,
            price_delta: addon.price_delta
          })),
          selectedColor: item.selectedColor
        };
      });

      const deliveryInfo = {
        fullName: userProfile.displayName,
        phoneNumber: userProfile.phone,
        address: userProfile.address,
        city: userProfile.city,
        notes: notes || "",
      };

      const orderData = {
        userId: userProfile.uid,
        items: orderItems,
        total: totalAmount,
        status: 'pending',
        deliveryInfo: deliveryInfo,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      console.log('Order data to save:', orderData);

      // Try to create order and update quantities atomically on the server
      try {
        if (typeof createOrderAndUpdateProductQuantitiesAtomically === 'function') {
          const deductions = cart.map(item => ({ productId: item.product.id, quantityToDeduct: item.quantity }));
          const orderId = await createOrderAndUpdateProductQuantitiesAtomically(orderData, deductions);
          console.log('Order created atomically with ID:', orderId);
        } else {
          const docRef = await addDoc(collection(db, 'orders'), orderData);
          console.log('Order saved with ID:', docRef.id);
        }
      } catch (err) {
        console.warn('Atomic order creation failed, falling back to plain addDoc', err);
        const docRef = await addDoc(collection(db, 'orders'), orderData);
        console.log('Order saved with ID (fallback):', docRef.id);
      }
      // Note: product quantities are updated when items are added/removed from the cart
      // (optimistic atomic updates happen in the store). To avoid double-deduction
      // we don't re-run the atomic deduction here. If you prefer server-side
      // confirmation at checkout instead, we should implement a reservation/confirm
      // flow or a single transaction that creates the order and updates stock.
      
      toast.success("تم حفظ الطلب بنجاح");
      
      // Send WhatsApp message with order details
      await sendWhatsAppOrderMessage(orderData, deliveryInfo);
      
      // Clear cart after successful order
      clearCart();
      
      // Reload products to ensure we have the latest data
      console.log('Reloading products after order completion...');
      await useStore.getState().loadProducts();
      console.log('Products reloaded successfully');
      
      // Navigate to orders page
      navigate("/orders");
    } catch (error) {
      console.error('Error saving order:', error);
      toast.error("فشل في حفظ الطلب");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (productId: string) => {
    setProductToDelete(productId);
    setShowDeleteAlert(true);
  };

  const handleClearCart = () => {
    setShowClearCartAlert(true);
  };

  const handleCompleteProfile = () => {
    // Check if user is logged in
    if (!userProfile) {
      setShowLoginRequiredModal(true);
      return;
    }
    navigate("/settings");
  };


  const handleWhatsAppOrder = () => {
    // This function is no longer needed as the form handles delivery info
    // and the message is generated directly in the form handler.
    // Keeping it for now in case it's called elsewhere, but it will be removed.
  };

  // Show loading state while authentication is being determined
  // بدلاً من هذا الجزء
  // if (authLoading) { ... جاري التحميل ... }
  // اعرض دائماً محتوى السلة أو رسالة 'عربة التسوق فارغة' مباشرة
  // اعرض دائماً محتوى السلة أو رسالة 'عربة التسوق فارغة' مباشرة
  if (cart.length === 0) {
    return (
      <div className="min-h-screen">
        <main className="container py-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">{t("cart.title")}</h1>
          </div>

          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="bg-white rounded-lg border shadow-sm p-8 max-w-md w-full text-center">
              {/* Empty Cart Icon */}
              <div className="mx-auto mb-6">
                <div className="bg-gray-100 rounded-full p-6 w-20 h-20 mx-auto flex items-center justify-center">
                  <svg 
                    className="w-10 h-10 text-gray-400" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" 
                    />
                  </svg>
                </div>
              </div>
              
              {/* Empty Cart Text */}
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {t("cart.emptyTitle")}
              </h2>
              <p className="text-gray-600 mb-8">
                {t("cart.emptyDescription")}
              </p>
              
              {/* Action Buttons */}
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
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  العودة للرئيسية
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // delivery form handler - save order to Firestore (so admin/orders shows it), update stock atomically, then open WhatsApp to the configured number
  const onDeliverySubmit = async (data: DeliveryFormData) => {
    // Assemble order items (same shape as saveOrderToFirebase)
    const orderItems = cart.map((item) => ({
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
      selectedAddons: item.selectedAddons.map(addon => ({
        id: addon.id,
        label: addon.label,
        price_delta: addon.price_delta
      })),
      selectedColor: item.selectedColor
    }));

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

    // Build the WhatsApp message text (reuse previous formatting)
    const orderLines = orderItems.map((item, i) => {
      const lines: string[] = [];
      lines.push(`${i + 1}- ${item.productName}`);
      lines.push(`  الكمية: ${item.quantity}`);
      if (item.selectedSize) {
        lines.push(`  الحجم: ${item.selectedSize.label} (${formatCurrency(item.selectedSize.price, 'جنيه')})`);
      }
      if (item.selectedColor) {
        const colorName = getColorByName(item.selectedColor).name || item.selectedColor;
        lines.push(`  اللون: ${colorName}`);
      }
      if (item.selectedAddons && item.selectedAddons.length > 0) {
        lines.push(`  الإضافات:`);
        item.selectedAddons.forEach((addon) => {
          const addonPrice = addon.price_delta ? ` (+${formatCurrency(addon.price_delta, 'جنيه')})` : '';
          lines.push(`    - ${addon.label}${addonPrice}`);
        });
      }
      lines.push(`  السعر: ${formatCurrency(item.totalPrice, 'جنيه')}`);
      return lines.join('\n');
    }).join('\n---------\n');

    const deliverySection = [
      `اسم الزبون: ${deliveryInfo.fullName}`,
      `المحافظة: ${deliveryInfo.city}`,
      `العنوان بالتفصيل: ${deliveryInfo.address}`,
      `رقم الهاتف: ${deliveryInfo.phoneNumber}`,
      deliveryInfo.notes ? `ملاحظات: ${deliveryInfo.notes}` : null,
    ].filter(Boolean).join('\n');

    const now = new Date();
    const dateStr = now.toLocaleDateString('ar-EG');
    const timeStr = now.toLocaleTimeString('ar-EG');

    const message = [
      'طلب جديد من المتجر',
      '------------------------------',
      orderLines,
      '------------------------------',
      deliverySection,
      '------------------------------',
      `إجمالي المبلغ: ${formatCurrency(getCartTotal(), 'جنيه')}`,
      `تاريخ الطلب: ${dateStr}`,
      `وقت الطلب: ${timeStr}`,
      '------------------------------',
      'تم إرسال الطلب من الموقع الالكتروني'
    ].join('\n');

    // WhatsApp target number requested: 01024911062 -> international 201024911062
    const whatsappNumber = '201024911062';

    try {
      // Save the order to Firestore so it appears in admin/orders
      const docRef = await addDoc(collection(db, 'orders'), orderData);
      console.log('Order saved with ID (from delivery form):', docRef.id);

      // Update quantities atomically
      // Note: quantities are already deducted when items are added to the cart
      // via optimistic updates in the store. We avoid re-deducting here to prevent
      // double-subtraction. If you need a single atomic server-side operation,
      // we should create a transaction that both writes the order and updates
      // product quantities in one atomic operation.

      toast.success('تم حفظ الطلب بنجاح');
    } catch (error) {
      console.error('Error saving order from delivery form:', error);
      toast.error('تعذر حفظ الطلب في النظام، سيتم فتح واتساب للمتابعة');
      // Proceed to open WhatsApp even if saving failed
    }

    // Open WhatsApp to the configured number with the formatted message
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');

    // Reset form and clear cart
    reset();
    clearCart();

    // Reload products to reflect any quantity changes
    try {
      await useStore.getState().loadProducts();
    } catch (e) {
      console.warn('Failed to reload products after delivery-form order:', e);
    }
  };

  return (
    <div className="min-h-screen">
      <main className="container py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">{t("cart.title")}</h1>
        </div>

        <div className="grid gap-8 md:grid-cols-5">
          <div className="md:col-span-3 space-y-8">
            {/* Products List - Single Group */}
            <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
              {/* Products List */}
              <div className="divide-y">
                {cart.map((item) => {
                  const itemPrice = getCartItemPrice(item);
                  const isSpecialOffer = item.product.specialOffer && 
                    item.product.discountPercentage && 
                    item.product.offerEndsAt &&
                    new Date(item.product.offerEndsAt) > new Date();
                  
                  return (
                    <div
                      key={`${item.product.id}-${item.selectedSize?.id || 'no-size'}-${item.selectedAddons.map(a => a.id).sort().join('-')}`}
                      className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
                    >
                      {(() => {
                        // Get the image for the selected color
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
                          <div className="relative">
                            <img
                              src={displayImage}
                              alt={item.product.name}
                              className="h-20 w-20 rounded-md object-cover cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => navigate(`/product/${item.product.id}`)}
                            />
                            {item.selectedColor && (
                              <div 
                                className="absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white shadow-sm"
                                style={{ backgroundColor: item.selectedColor }}
                              />
                            )}
                          </div>
                        );
                      })()}
                      <div className="flex-1">
                        <h3 
                          className="font-medium cursor-pointer hover:text-primary hover:underline transition-colors"
                          onClick={() => navigate(`/product/${item.product.id}`)}
                        >
                          {item.product.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {item.product.brand}
                        </p>
                        {item.selectedSize && (
                          <p className="text-sm text-blue-600 font-medium">
                            📐 الحجم: {item.selectedSize.label}
                          </p>
                        )}
                        {item.selectedColor && (
                          <p className="text-sm text-purple-600 font-medium flex items-center gap-2">
                            🎨 اللون: 
                            <div 
                              className="w-4 h-4 rounded-full border border-gray-300"
                              style={{ backgroundColor: item.selectedColor }}
                            />
                            {getColorByName(item.selectedColor).name}
                          </p>
                        )}
                        {item.selectedAddons && item.selectedAddons.length > 0 && (
                          <p className="text-sm text-green-600">
                            ➕ الإضافات: {item.selectedAddons.map(addon => addon.label).join(', ')}
                          </p>
                        )}
                        <div className="flex md:flex-row flex-col md:items-center items-start gap-4 mt-2">
                          <div className="flex items-center gap-0">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={async () => {
                                const newQuantity = Math.max(
                                  0,
                                  item.quantity - 1
                                );
                                if (newQuantity === 0) {
                                  handleDeleteClick(item.product.id);
                                } else {
                                  try {
                                    // Use the store function which handles Firebase update
                                    updateCartItemQuantity(item.product.id, newQuantity);
                                  } catch (error) {
                                    toast.error("خطأ في تحديث الكمية", {
                                      description: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
                                    });
                                  }
                                }
                              }}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="w-12 text-center font-medium">
                              {item.quantity}
                            </span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={async () => {
                                try {
                                  // Use the store function which handles Firebase update and stock checking
                                  updateCartItemQuantity(item.product.id, item.quantity + 1);
                                } catch (error) {
                                  toast.error("خطأ في تحديث الكمية", {
                                    description: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
                                  });
                                }
                              }}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-semibold">
                              {formatCurrency(item.totalPrice, 'جنيه')}
                            </span>
                            {isSpecialOffer && (
                              <span className="text-sm text-muted-foreground line-through">
                                {formatCurrency(item.product.price * item.quantity, 'جنيه')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(item.product.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="md:col-span-2">
            <div className="rounded-lg border bg-card p-6 sticky top-20">
              <h2 className="text-xl font-semibold mb-4">معلومات التوصيل</h2>
              <form onSubmit={handleSubmit(onDeliverySubmit)} className="space-y-4">
                <div>
                  <label className="block mb-1">اسم الزبون</label>
                  <input type="text" {...register('fullName', { required: 'إلزامي' })} className="input input-bordered w-full" />
                  {errors.fullName && <span className="text-red-500 text-xs">{errors.fullName.message}</span>}
                </div>
                <div>
                  <label className="block mb-1">المحافظة</label>
                  <input type="text" {...register('city', { required: 'إلزامي' })} className="input input-bordered w-full" />
                  {errors.city && <span className="text-red-500 text-xs">{errors.city.message}</span>}
                </div>
                <div>
                  <label className="block mb-1">العنوان بالتفصيل</label>
                  <input type="text" {...register('address', { required: 'إلزامي' })} className="input input-bordered w-full" />
                  {errors.address && <span className="text-red-500 text-xs">{errors.address.message}</span>}
                </div>
                <div>
                  <label className="block mb-1">رقم الهاتف</label>
                  <input type="tel" {...register('phoneNumber', { required: 'إلزامي', pattern: { value: /^01[0-9]{9,}$/g, message: 'رقم غير صحيح!' } })} className="input input-bordered w-full" />
                  {errors.phoneNumber && <span className="text-red-500 text-xs">{errors.phoneNumber.message}</span>}
                </div>
                <div>
                  <label className="block mb-1">ملاحظات (اختياري)</label>
                  <textarea {...register('notes')} className="input input-bordered w-full resize-none" rows={3} placeholder="أضف أي ملاحظات..."></textarea>
                </div>
                <button type="submit" className="btn btn-primary w-full" disabled={!isValid}>{'إتمام الطلب'}</button>
              </form>
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
                    // Use the store function which handles Firebase update
                    removeFromCart(productToDelete);
                    toast.success("تم حذف المنتج من السلة");
                  } catch (error) {
                    toast.error("خطأ في حذف المنتج", {
                      description: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
                    });
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

        {/* Product Modal */}
        <ProductModal
          product={selectedProduct}
          open={modalOpen}
          onOpenChange={setModalOpen}
          hideAddToCart={true}
        />

        {/* Login Required Modal */}
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
  // Prefer precomputed unit price when available
  if (typeof item?.unitFinalPrice === "number") {
    return item.unitFinalPrice;
  }

  const now = new Date();
  const product = item?.product || {};
  let price = Number(product.price ?? 0);

  // Apply active special offer discount if present and not expired
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

  // Add selected size price (if any)
  if (item?.selectedSize?.price != null) {
    price += Number(item.selectedSize.price);
  }

  // Add addons price deltas
  if (Array.isArray(item?.selectedAddons)) {
    price += item.selectedAddons.reduce((sum: number, addon: any) => {
      return sum + Number(addon.price_delta ?? addon.price ?? 0);
    }, 0);
  }

  // Ensure a numeric value with two decimals
  return Math.round(price * 100) / 100;
}
async function clearCart(): Promise<void> {
  const store = useStore.getState();
  const currentCart = store.cart ?? [];

  // No-op if cart is already empty, but ensure store is cleared
  if (currentCart.length === 0) {
    if (typeof store.clearCart === "function") {
      store.clearCart();
    } else if (typeof (store as any).setCart === "function") {
      (store as any).setCart([]);
    }
    return;
  }

  // Prepare payloads for possible restore/update helpers
  const restorePayload = currentCart.map((item: any) => ({
    productId: item.product.id,
    quantityToRestore: item.quantity,
  }));
  const negativeDeductPayload = currentCart.map((item: any) => ({
    productId: item.product.id,
    quantityToDeduct: -item.quantity,
  }));

  try {
    // Dynamic import so we don't have to modify top-level imports in this file
    const lib = await import("@/lib/firebase");

    // Prefer a dedicated restore function if available
    if (typeof lib.restoreProductQuantitiesAtomically === "function") {
      // try common parameter shapes
      try {
        // preferred shape: { productId, quantityToRestore }
        await lib.restoreProductQuantitiesAtomically(restorePayload);
      } catch {
        // fallback: some older implementations might expect a different shape;
        // cast to any to call it anyway without TS errors
        await lib.restoreProductQuantitiesAtomically(restorePayload as any);
      }
    } else if (typeof lib.updateProductQuantitiesAtomically === "function") {
      // fallback: call update with negative deductions to increment stock back
      await lib.updateProductQuantitiesAtomically(negativeDeductPayload);
    }
  } catch (err) {
    // Log but don't block clearing local state
    console.warn("clearCart: failed to restore quantities atomically", err);
  } finally {
    // Clear local cart state (support common store API variations)
    if (typeof store.clearCart === "function") {
      store.clearCart();
    } else if (typeof (store as any).setCart === "function") {
      (store as any).setCart([]);
    } else if (typeof (store as any).removeAll === "function") {
      (store as any).removeAll();
    }
  }
}

