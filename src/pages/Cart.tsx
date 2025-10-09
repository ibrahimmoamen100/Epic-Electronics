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
import { db, updateProductQuantitiesAtomically } from "@/lib/firebase";
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
    formState: { errors },
  } = useForm<DeliveryFormData>({
    defaultValues: {
      fullName: userProfile?.displayName || "",
      phoneNumber: userProfile?.phone || "",
      address: userProfile?.address || "",
      city: "",
      notes: "",
    },
  });

  // Watch form fields for validation
  const notes = watch("notes");

  // Check if user has complete delivery information
  const hasCompleteDeliveryInfo = userProfile && 
    userProfile.displayName && 
    userProfile.phone && 
    userProfile.address &&
    userProfile.city;

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
      const whatsappNumber = "201008397114";
      
      // Format order items with better structure
      const orderItemsText = orderData.items.map((item: any, index: number) => {
        let itemText = `*${index + 1}-
         ${item.productName}*`;
        itemText += `\n   الكمية: ${item.quantity}`;
        
        if (item.selectedSize) {
          itemText += `\n   الحجم: ${item.selectedSize.label}`;
        }
        
        if (item.selectedColor) {
          itemText += `\n   اللون: ${item.selectedColor}`;
        }
        
        if (item.selectedAddons && item.selectedAddons.length > 0) {
          const addonsText = item.selectedAddons.map((addon: any) => addon.label).join(', ');
          itemText += `\n   الإضافات: ${addonsText}`;
        }
        
        itemText += `\n   السعر: ${formatCurrency(item.totalPrice, 'جنيه')}`;
        
        return itemText;
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

    if (!hasCompleteDeliveryInfo) {
      toast.error("يرجى إكمال معلومات التوصيل في الإعدادات أولاً");
      navigate("/settings");
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

      const docRef = await addDoc(collection(db, 'orders'), orderData);
      console.log('Order saved with ID:', docRef.id);
      
      // Get latest products from store to ensure we have current quantities
      // Prepare quantity updates for atomic transaction
      const quantityUpdates = cart.map(item => ({
        productId: item.product.id,
        quantityToDeduct: item.quantity
      }));

      console.log('Cart: Preparing atomic quantity updates:', quantityUpdates.map(update => ({
        productId: update.productId,
        productName: cart.find(item => item.product.id === update.productId)?.product.name,
        quantityToDeduct: update.quantityToDeduct
      })));
      
      // Update all product quantities atomically to prevent race conditions
      console.log('Cart: Executing atomic quantity update...');
      await updateProductQuantitiesAtomically(quantityUpdates);
      console.log('Cart: Atomic quantity update completed successfully');
      
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
    if (!hasCompleteDeliveryInfo) {
      toast.error("يرجى إكمال معلومات التوصيل في الإعدادات أولاً");
      navigate("/settings");
      return;
    }

    const message = supplierGroupsForMessaging
      .map((group) => {
        const itemsText = group.items
          .map((item) => {
            const price = item.product.price || 0;
            return `• ${item.product.name} - ${item.quantity} × ${formatCurrency(price, 'جنيه')} = ${formatCurrency(price * item.quantity, 'جنيه')}`;
          })
          .join("\n");

        return `🏪 *${group.supplierName}*\n${itemsText}\n💰 *المجموع: ${formatCurrency(group.total, 'جنيه')}*\n📞 ${group.supplierPhone}`;
      })
      .join("\n\n");

    const deliveryInfo = `📦 *معلومات التوصيل*\n👤 ${userProfile?.displayName}\n📱 ${userProfile?.phone}\n🏠 ${userProfile?.address}\n🏙️ ${userProfile?.city}`;

    const fullMessage = `${message}\n\n${deliveryInfo}\n\n💰 *المجموع الكلي: ${formatCurrency(totalAmount, 'جنيه')}*`;

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(fullMessage)}`;
    window.open(whatsappUrl, "_blank");
  };

  // Show loading state while authentication is being determined
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

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
              <h2 className="text-xl font-semibold mb-4">
                معلومات التوصيل
              </h2>

              {/* Delivery Info Display */}
              {hasCompleteDeliveryInfo ? (
                <div className="space-y-4 mb-6">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-green-100 p-2 rounded-full">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-medium text-green-900">معلومات التوصيل مكتملة</h4>
                        <p className="text-sm text-green-700">سيتم استخدام معلوماتك المحفوظة</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">الاسم:</span>
                      <span className="font-medium">{userProfile.displayName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">الهاتف:</span>
                      <span className="font-medium">{userProfile.phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">المدينة:</span>
                      <span className="font-medium">{userProfile.city}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">العنوان:</span>
                      <span className="font-medium">{userProfile.address}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="bg-yellow-100 p-2 rounded-full">
                      <AlertCircle className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-yellow-900">معلومات التوصيل غير مكتملة</h4>
                      <p className="text-sm text-yellow-700 mb-3">
                        يرجى إكمال معلومات التوصيل في الإعدادات أولاً
                      </p>
                      <Button 
                        onClick={handleCompleteProfile}
                        size="sm"
                        className="gap-2"
                      >
                        <Settings className="h-4 w-4" />
                        إكمال المعلومات
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes Field */}
              <div className="mb-6">
                <label
                  htmlFor="notes"
                  className="block text-sm font-medium mb-1"
                >
                  ملاحظات إضافية (اختياري)
                </label>
                <textarea
                  id="notes"
                  {...register("notes")}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                  rows={3}
                  placeholder="أضف أي ملاحظات أو تعليمات خاصة..."
                />
              </div>
                
              {/* Payment Method Section */}
              <div className="space-y-3 mb-6">
                <h3 className="text-lg font-semibold">طريقة الدفع</h3>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-100 p-2 rounded-full">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-medium text-blue-900">الدفع عند الاستلام</h4>
                      <p className="text-sm text-blue-700">ادفع عند استلام طلبك</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Delivery Fee Info */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="bg-yellow-100 p-2 rounded-full">
                    <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-medium text-yellow-900">رسوم التوصيل</h4>
                    <p className="text-sm text-yellow-700">سيتم تحديد رسوم التوصيل من قبل الموصل</p>
                  </div>
                </div>
              </div>

              {/* Total Summary */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3 mb-6">
                <h3 className="text-lg font-semibold">ملخص الطلب</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">مجموع المنتجات:</span>
                    <span className="font-medium">{formatCurrency(totalAmount, 'جنيه')}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">رسوم التوصيل:</span>
                    <span className="text-gray-500">سيحددها الموصل</span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold">المجموع الكلي:</span>
                      <span className="text-xl font-bold text-green-700">{formatCurrency(totalAmount, 'جنيه')}</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">+ رسوم التوصيل</p>
                  </div>
                </div>
              </div>
                
              {/* Complete Order Button */}
              <Button
                type="button"
                size="lg"
                className="w-full gap-2"
                disabled={!hasCompleteDeliveryInfo || isSubmitting}
                onClick={saveOrderToFirebase}
              >
                {isSubmitting ? "جاري إتمام الطلب..." : "إتمام الطلب"}
              </Button>
              
              {/* Spacing */}
              <div className="h-4"></div>
              
              {/* Clear Cart Button */}
              <Button
                type="button"
                size="lg"
                variant="destructive"
                className="w-full gap-2"
                onClick={async () => {
                  try {
                    await clearCart();
                    toast.success("تم مسح السلة");
                  } catch (error) {
                    console.error('Error clearing cart:', error);
                    toast.error("فشل في مسح السلة");
                  }
                }}
              >
                <Trash2 className="h-4 w-4" />
                نظف السلة
              </Button>
              
              {/* Order Info */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 mt-4">
                <div className="flex items-center gap-3 text-blue-800">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="space-y-1">
                    <p className="text-sm">
                      عند النقر على زر "إتمام الطلب"، سيتم حفظ طلبك في صفحة الطلبات
                    </p>
                    <p className="text-sm font-medium">
                      سنقوم بالتواصل معك قريباً
                    </p>
                  </div>
                </div>
              </div>
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
