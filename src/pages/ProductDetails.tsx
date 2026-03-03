import { useParams, useNavigate } from "react-router-dom";
import { SEOHelmet } from "@/components/SEOHelmet";
import { useStore } from "@/store/useStore";
import { Product, ProductSize, ProductAddon } from "@/types/product";
import { ProductCard } from "@/components/ProductCard";
import { ProductModal } from "@/components/ProductModal";
import { ProductOptions, CheckoutFormData } from "@/components/ProductOptions";
import { useAuth } from "@/contexts/AuthContext";
import { createOrderAndUpdateProductQuantitiesAtomically } from '@/lib/firebase';
import { checkOrderSpam } from '@/lib/spamProtection';
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { analytics } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import {
  ShoppingCart,
  Share2,
  X,
  Plus,
  Minus,
  ChevronLeft,
  ChevronRight,
  Star,
  Truck,
  Shield,
  RotateCcw,
  Package,
  Battery,
  HardDrive,
  Clock,
  CheckCircle,
  Monitor,
  Cpu,
  CircuitBoard,
  Play,
  Film,
  Settings2,
  ClipboardCopy,
  MessageCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Link } from "react-router-dom";
import Footer from "@/components/Footer";
import { formatCurrency } from "@/utils/format";
import { commonColors, getColorByName } from "@/constants/colors";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { createPortal } from "react-dom";

const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { userProfile } = useAuth();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [showShippingPolicy, setShowShippingPolicy] = useState(false);
  const [isBatteryModalOpen, setIsBatteryModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState<ProductSize | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<ProductAddon[]>([]);
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [finalPrice, setFinalPrice] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchaseVisible, setIsPurchaseVisible] = useState(false);
  const [isSpecsVisible, setIsSpecsVisible] = useState(false);
  const [isBuyButtonManuallyHidden, setIsBuyButtonManuallyHidden] = useState(false);
  const [isSpecsButtonManuallyHidden, setIsSpecsButtonManuallyHidden] = useState(false);

  // Order Success Modal State
  const [orderSuccess, setOrderSuccess] = useState<{
    isOpen: boolean;
    type: 'online' | 'reservation';
    governorate?: string;
    whatsappUrl: string;
    totalAmount?: number;
  }>({
    isOpen: false,
    type: 'online',
    whatsappUrl: ''
  });

  const products = useStore((state) => state.products);
  const loading = useStore((state) => state.loading);
  const cart = useStore((state) => state.cart);
  const addToCart = useStore((state) => state.addToCart);
  const removeFromCart = useStore((state) => state.removeFromCart);
  const updateCartItemQuantity = useStore(
    (state) => state.updateCartItemQuantity
  );
  const getCartTotal = useStore((state) => state.getCartTotal);
  const getCartItemPrice = useStore((state) => state.getCartItemPrice);
  const updateProductQuantity = useStore((state) => state.updateProductQuantity);

  // Find current product
  const product = products.find((p) => p.id === id);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Parse available colors and create color-image mapping
  const availableColors = useMemo(() =>
    product?.color ? product.color.split(',').map(c => c.trim()) : [],
    [product?.color]);

  // Ref for the observer to persist across renders
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Reset manual hide state when product changes
  useEffect(() => {
    setIsBuyButtonManuallyHidden(false);
    setIsSpecsButtonManuallyHidden(false);
  }, [id]);

  // Handle loading state and analytics
  useEffect(() => {
    if (products.length > 0) {
      if (product) {
        setIsLoading(false);
        try {
          sessionStorage.setItem('current_product', JSON.stringify({
            id: product.id,
            name: product.name,
            slug: product.id
          }));
        } catch (e) {
          console.warn('Failed to store product in sessionStorage:', e);
        }

        const currentPath = window.location.pathname;
        if (currentPath.startsWith('/product/')) {
          // Debounce analytics to avoid multiple calls
          const trackTimeout = setTimeout(() => {
            analytics.trackPageView(currentPath, product.name).catch(console.error);
          }, 1000);
          return () => clearTimeout(trackTimeout);
        }
      } else {
        const redirectTimeout = setTimeout(() => navigate("/products"), 100);
        return () => clearTimeout(redirectTimeout);
      }
    }
  }, [products, product, navigate, id, location]);

  // Optimized IntersectionObserver
  useEffect(() => {
    // Cleanup previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.target.id === 'checkout-input-fields') {
          setIsPurchaseVisible(entry.isIntersecting);
        }
        if (entry.target.id === 'specs-section') {
          setIsSpecsVisible(entry.isIntersecting);
        }
      });
    };

    observerRef.current = new IntersectionObserver(handleIntersection, {
      threshold: 0.1,
      rootMargin: "-50px 0px 0px 0px"
    });

    const purchaseSection = document.getElementById('checkout-input-fields');
    const specsSection = document.getElementById('specs-section');

    if (purchaseSection) observerRef.current.observe(purchaseSection);
    if (specsSection) observerRef.current.observe(specsSection);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [isLoading, product]); // Re-run only when loading finishes or product changes

  // Create mapping between colors and images
  const colorImageMapping = useMemo(() => {
    const mapping: { [key: string]: string } = {};
    availableColors.forEach((color, index) => {
      if (product?.images && product.images[index]) {
        mapping[color] = product.images[index];
      }
    });
    return mapping;
  }, [availableColors, product?.images]);

  // Combine videos and images into a single media array
  const mediaItems = useMemo(() => {
    const videos = (product?.videoUrls || []).map(url => ({ type: 'video' as const, url }));
    const images = (product?.images || []).map(url => ({ type: 'image' as const, url }));
    return [...videos, ...images];
  }, [product?.videoUrls, product?.images]);

  // Get current image/video based on selected color or selected image index
  const currentMedia = useMemo(() => {
    if (availableColors.length > 1 && selectedColor && colorImageMapping[selectedColor]) {
      return { type: 'image' as const, url: colorImageMapping[selectedColor] };
    }
    return mediaItems[selectedImage] || mediaItems[0];
  }, [selectedColor, colorImageMapping, selectedImage, mediaItems, availableColors.length]);

  const currentImage = currentMedia?.url;
  const isCurrentVideo = currentMedia?.type === 'video';

  // Helper to check if addons match
  const areAddonsMatching = useCallback((itemAddons: ProductAddon[], targetAddons: ProductAddon[]) => {
    if ((!itemAddons || itemAddons.length === 0) && (!targetAddons || targetAddons.length === 0)) return true;
    if (!itemAddons || !targetAddons) return false;
    if (itemAddons.length !== targetAddons.length) return false;
    const itemAddonIds = itemAddons.map(a => a.id).sort();
    const targetAddonIds = targetAddons.map(a => a.id).sort();
    return itemAddonIds.every((id, index) => id === targetAddonIds[index]);
  }, []);

  // Check if product is in cart (considering selected size, color AND addons)
  const cartItem = useMemo(() => cart.find((item) =>
    item.product &&
    item.product.id === id &&
    (selectedSize ? item.selectedSize?.id === selectedSize.id : !item.selectedSize) &&
    (selectedColor ? item.selectedColor === selectedColor : !item.selectedColor) &&
    areAddonsMatching(item.selectedAddons || [], selectedAddons || [])
  ), [cart, id, selectedSize, selectedColor, selectedAddons, areAddonsMatching]);

  // Local quantity for products not in cart
  const [localQuantity, setLocalQuantity] = useState(1);

  // Reset local quantity when selections change and item is not in cart
  useEffect(() => {
    if (!cartItem) {
      setLocalQuantity(1);
    }
  }, [selectedSize, selectedColor, selectedAddons, cartItem]);

  // Determine actual quantity to display
  const currentQuantity = cartItem ? cartItem.quantity : localQuantity;

  const handleQuantityChange = async (newQuantity: number) => {
    if (cartItem) {
      // If item is in cart, update cart immediately
      try {
        await updateCartItemQuantity(
          product!.id,
          newQuantity,
          selectedSize?.id || null,
          selectedAddons.map(a => a.id),
          selectedColor
        );
      } catch (error) {
        toast.error("خطأ في تحديث الكمية");
      }
    } else {
      // If not in cart, just update local state
      setLocalQuantity(newQuantity);
    }
  };

  // Find suggested products (same category, excluding current product)
  const suggestedProducts = products
    .filter(
      (p) =>
        p.category === product?.category &&
        p.id !== product?.id &&
        !p.isArchived
    )
    .slice(0, 4);

  const [undiscountedPrice, setUndiscountedPrice] = useState(0);

  useEffect(() => {
    if (product) {
      // Initialize final price with base price or first size price
      let basePrice = product.price;
      if (product.sizes && product.sizes.length > 0) {
        basePrice = product.sizes[0].price;
      }

      // Initialize undiscounted price
      setUndiscountedPrice(basePrice);

      // Apply special offer discount to the calculated base price
      let finalPrice = basePrice;
      if (product.specialOffer &&
        product.offerEndsAt &&
        new Date(product.offerEndsAt) > new Date()) {
        if (product.discountPercentage) {
          // Calculate discount percentage
          const discountAmount = (basePrice * product.discountPercentage) / 100;
          finalPrice = basePrice - discountAmount;
        } else if (product.discountPrice) {
          // Calculate discount amount based on original product price
          // We assume discountPrice is for the base product
          const discountAmount = Math.max(0, product.price - product.discountPrice);
          finalPrice = Math.max(0, basePrice - discountAmount);
        }
      }

      setFinalPrice(finalPrice);

      // Set first color as default if available and no color is selected
      if (availableColors.length > 0 && !selectedColor) {
        setSelectedColor(availableColors[0]);
      }
    }
  }, [product, availableColors, selectedColor]);

  // Handle selection changes from ProductOptions component
  const handleSelectionChange = useCallback((
    newSelectedSize: ProductSize | null,
    newSelectedAddons: ProductAddon[],
    calculatedPrice: number
  ) => {
    setSelectedSize(newSelectedSize);
    setSelectedAddons(newSelectedAddons);
    setUndiscountedPrice(calculatedPrice);

    // Apply special offer discount to the calculated price (including sizes and addons)
    let finalPrice = calculatedPrice;
    if (product?.specialOffer &&
      product.offerEndsAt &&
      new Date(product.offerEndsAt) > new Date()) {
      if (product.discountPercentage) {
        // Calculate discount percentage on the calculated price
        const discountAmount = (calculatedPrice * product.discountPercentage) / 100;
        finalPrice = calculatedPrice - discountAmount;
      } else if (product.discountPrice) {
        // Calculate discount amount based on original product price
        // We treat discountPrice as defining a fixed saving amount on the base product
        const discountAmount = Math.max(0, product.price - product.discountPrice);
        finalPrice = Math.max(0, calculatedPrice - discountAmount);
      }
    }

    setFinalPrice(finalPrice);
  }, [product]);

  // Show loading state while data is being loaded
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل المنتج...</p>
        </div>
      </div>
    );
  }

  // Show 404 if product not found after loading is complete
  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
          <p className="text-gray-600 mb-8">المنتج غير موجود</p>
          <Button onClick={() => navigate("/products")}>
            العودة إلى المنتجات
          </Button>
        </div>
      </div>
    );
  }

  // SEO: Build dynamic meta info
  const plainDescription = (product.description || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const baseDescription = plainDescription || `${product.brand} - ${product.category}`;
  const metaDescription = baseDescription.length > 160
    ? `${baseDescription.slice(0, 157)}...`
    : baseDescription;
  const canonicalUrl = `${window.location.origin}/product/${product.id}`;

  const handleBuy = async (quantity: number, formData: CheckoutFormData) => {
    if (!product) return;

    // Check if product is out of stock
    const availableQuantity = product.wholesaleInfo?.quantity || 0;
    if (availableQuantity <= 0) {
      toast.error("المنتج غير متوفر حالياً");
      return;
    }

    if (product.sizes && product.sizes.length > 0 && !selectedSize) {
      toast.error("يرجى اختيار حجم المنتج أولاً");
      return;
    }

    if (availableColors.length > 0 && !selectedColor) {
      toast.error("يرجى اختيار لون المنتج أولاً");
      return;
    }

    // Process Order
    try {
      const totalAmount = finalPrice * quantity;

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

      const orderData = {
        userId: userProfile?.uid || `guest-${Date.now()}`,
        items: [orderItem],
        total: totalAmount,
        status: 'pending',
        type: formData.orderType,
        deliveryInfo: {
          fullName: formData.fullName,
          phoneNumber: formData.phoneNumber,
          address: formData.orderType === 'reservation' ? 'استلام من المحل' : formData.address,
          city: formData.orderType === 'reservation' ? 'لا يوجد' : formData.governorate,
          notes: formData.notes || ''
        },
        reservationInfo: formData.orderType === 'reservation' ? {
          fullName: formData.fullName,
          phoneNumber: formData.phoneNumber,
          appointmentDate: formData.appointmentDate || new Date().toISOString().split('T')[0], // Default to today if not specified in simplified form
          appointmentTime: formData.appointmentTime || '12:00', // Default
          notes: formData.notes || ''
        } : null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const deductions = [{
        productId: product.id,
        quantityToDeduct: quantity
      }];

      // Check for spam/duplicate orders
      const spamResult = await checkOrderSpam({
        orderType: formData.orderType === 'reservation' ? 'reservation' : 'online_purchase',
        fullName: formData.fullName,
        phoneNumber: formData.phoneNumber,
        address: formData.address,
        appointmentDate: formData.appointmentDate,
        appointmentTime: formData.appointmentTime,
        productId: product.id,
        selectedSize: selectedSize,
        selectedAddons: selectedAddons,
        selectedColor: selectedColor
      });

      if (spamResult.isSpam) {
        toast.error(spamResult.message);
        return;
      }

      // Save to Firebase
      await createOrderAndUpdateProductQuantitiesAtomically(orderData, deductions);

      // Construct WhatsApp Message
      const whatsappNumber = "201025423389";
      const orderLines = [
        `1. ${product.name}`,
        `   الكمية: ${quantity}`,
        selectedSize ? `   الحجم: ${selectedSize.label}` : '',
        selectedColor ? `   اللون: ${getColorByName(selectedColor).name}` : '',
        selectedAddons.length > 0 ? `   الإضافات:\n${selectedAddons.map(addon => `      - ${addon.label} (+${formatCurrency(addon.price_delta, 'جنيه')})`).join('\n')}` : '',
        `   السعر: ${formatCurrency(totalAmount, 'جنيه')}`
      ].filter(Boolean).join('\n');

      const customerInfo = formData.orderType === 'reservation' ?
        [
          `👤 الاسم: ${formData.fullName}`,
          `📱 الهاتف: ${formData.phoneNumber}`,
          `📅 التاريخ: ${formData.appointmentDate}`,
          `⏰ الوقت: ${formData.appointmentTime}`,
          `🏷 النوع: حجز`,
          formData.notes ? `📝 ملاحظات: ${formData.notes}` : null
        ].filter(Boolean).join('\n') :
        [
          `👤 الاسم: ${formData.fullName}`,
          `🏙 المحافظة: ${formData.governorate}`,
          `📍 العنوان: ${formData.address}`,
          `📱 الهاتف: ${formData.phoneNumber}`,
          `🏷 النوع: شراء أونلاين`,
          formData.notes ? `📝 ملاحظات: ${formData.notes}` : null
        ].filter(Boolean).join('\n');

      const message = [
        formData.orderType === 'reservation' ? '📅 طلب حجز جديد' : '🚀 طلب شراء جديد',
        '========================',
        orderLines,
        '========================',
        '*بيانات العميل:*',
        customerInfo,
        '========================',
        `💰 الإجمالي: ${formatCurrency(totalAmount, 'جنيه')}`,
        '========================',
        formData.orderType === 'reservation'
          ? 'يرجى تأكيد الحجز وإرسال العربون.'
          : 'يرجى تأكيد الطلب وتحديد مصاريف الشحن.'
      ].join('\n');

      // Show Success UI
      // toast.success("سيتم التواصل معك قريبًا لتأكيد الطلب");

      const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

      setOrderSuccess({
        isOpen: true,
        type: formData.orderType === 'reservation' ? 'reservation' : 'online',
        governorate: formData.governorate,
        whatsappUrl,
        totalAmount
      });

    } catch (error) {
      console.error('Order Error:', error);
      toast.error('حدث خطأ أثناء تنفيذ الطلب. يرجى المحاولة لاحقاً.');
    }
  };



  const handleShare = () => {
    const productUrl = `${window.location.origin}/product/${product.id}`;

    // Build selection info
    const selectionInfo = [];
    if (selectedSize) {
      selectionInfo.push(`📐 الحجم: ${selectedSize.label}`);
    }
    if (selectedColor) {
      selectionInfo.push(`🎨 اللون: ${getColorByName(selectedColor).name}`);
    }
    if (selectedAddons.length > 0) {
      selectionInfo.push(`➕ الإضافات: ${selectedAddons.map(addon => addon.label).join(', ')}`);
    }

    const message = [
      `🛍️ *${product.name}*`,
      `🏷️ ${t("products.brand")}: ${product.brand}`,
      ...selectionInfo,
      `💰 السعر النهائي: ${formatCurrency(finalPrice, 'جنيه')}`,
      product.specialOffer &&
        new Date(product.offerEndsAt as string) > new Date()
        ? `🎉 ${t("products.specialOffer")}`
        : null,
      product.description
        ? `📝 ${t("products.description")}: ${product.description.replace(/<[^>]*>/g, '').substring(0, 100)}...`
        : null,
      product.category
        ? `📦 ${t("products.category")}: ${product.category}`
        : null,
      `\n🔗 ${t("common.viewProduct")}: ${productUrl}`,
    ]
      .filter(Boolean)
      .join("\n");

    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`);
  };

  const handleCopySpecs = async () => {
    if (!product) return;

    // 1. Prepare Data
    const brand = product.brand;
    const category = product.subcategory || product.category; // Preference to subcategory/series

    // Convert generation like "9th Generation" / "12th Gen" → "الجيل 9"
    const formatGeneration = (gen: string | undefined): string => {
      if (!gen) return '';
      const match = gen.match(/(\d+)/);
      return match ? `الجيل ${match[1]}` : gen;
    };

    const processor = `${product.processor?.name || ''} ${product.processor?.processorGeneration ? `– ${formatGeneration(product.processor.processorGeneration)}` : ''}`.trim();

    // Graphics
    const internalGpu = product.processor?.integratedGpu || 'غير محدد';
    const externalGpu = product.dedicatedGraphics?.hasDedicatedGraphics
      ? `${product.dedicatedGraphics.dedicatedGpuModel || product.dedicatedGraphics.name || ''} – ${product.dedicatedGraphics.vram ? `${product.dedicatedGraphics.vram}GB VRAM` : ''}`
      : 'غير متوفر';

    // Storage (Extract from name as fallback if not explicit, currently assume part of standard descriptions or name)
    let storage = 'SSD M.2 – 256GB'; // Default fallback

    // Attempt to extract storage from name with better precision
    // 1. Look for patterns like "SSD 256", "SSD 512GB", "HDD 1TB" (Type keyword followed by size)
    const storageTypeFirst = product.name.match(/(?:SSD|HDD|NVMe)\s*[-:]?\s*(\d+\s*(?:GB|TB)?)/i);

    // 2. Look for patterns like "256GB SSD", "512 GB NVMe" (Size with unit followed by type)
    const storageSizeFirst = product.name.match(/(\d+\s*(?:GB|TB))\s*(?:SSD|HDD|NVMe)/i);

    if (storageTypeFirst) {
      let cap = storageTypeFirst[1];
      // If found text is just a number (e.g. "256"), append "GB"
      if (!/g|t/i.test(cap)) {
        cap += 'GB';
      }
      storage = `SSD M.2 – ${cap}`;
    } else if (storageSizeFirst) {
      storage = `SSD M.2 – ${storageSizeFirst[1]}`;
    }

    // Display
    const display = product.display?.sizeInches ? `${product.display.sizeInches} بوصة` : '';

    // Special Features (Static check or dynamic if available)
    const features = product.description?.includes('360') || product.name.includes('360') || product.name.includes('x360')
      ? 'يدعم اللمس واللف 360 درجة'
      : (product.display?.resolution ? `دقة الشاشة ${product.display.resolution}` : '');

    // 2. Format RAM & Prices
    // Sort sizes by price
    const sortedSizes = [...(product.sizes || [])].sort((a, b) => a.price - b.price);

    const ramSection = sortedSizes.length > 0
      ? `\n💾 الرامات والأسعار:\n${sortedSizes.map(size => `• برام ${size.label} بسعر: ${formatCurrency(size.price, 'جنيه')}`).join('\n')}`
      : `\n💰 السعر: ${formatCurrency(finalPrice, 'جنيه')}`;

    // Colors
    const colorsText = availableColors.length > 0
      ? availableColors.map(c => getColorByName(c).name).join(' – ')
      : '';

    // 3. Construct Final Text
    const textLines = [
      `🔹 الاسم: ${brand} ${category} `,
      processor ? `🔹 المعالج: ${processor}` : null,
      `🔹 كرت الشاشة الداخلي: ${internalGpu}`,
      externalGpu !== 'غير متوفر' ? `🔹 كرت الشاشة الخارجي: ${externalGpu}` : null,
      `🔹 التخزين: ${storage}`,
      display ? `🔹 الشاشة: ${display}` : null,
      features ? `🔹 ${features}` : null,
      colorsText ? `🎨 الألوان المتاحة: ${colorsText}` : null,
      ramSection,
      ' ',
      ' ',
      '🛒  للشــراء + المواصفات   👇   ',
      '🛒    👇 ولزياده الهارد + الرامات    ',
      `🔗 ${window.location.href}`,
      '',
      ' ',
      'او اترك اسمك، عنوانك، ورقم تليفونك',
      '',
      ' ',
      '🚚 مصاريف الشحن:',
      '• داخل القاهرة: 100 جنيه – التوصيل خلال 24 ساعة',
      '• باقي المحافظات من 170 الي 200 جنيه – التوصيل خلال 48 ساعة'
    ].filter(Boolean); // Remove null/empty lines

    const finalString = textLines.join('\n');

    // 4. Copy to Clipboard
    try {
      await navigator.clipboard.writeText(finalString);
      toast.success("تم نسخ المواصفات بنجاح");
    } catch (err) {
      console.error('Failed to copy:', err);
      toast.error("حدث خطأ أثناء النسخ");
    }
  };


  return (
    <div className="min-h-screen bg-gray-50">
      <SEOHelmet
        title={`${product.name} - ${product.brand}`}
        description={metaDescription}
        keywords={`${product.brand}, ${product.name}, ${product.category}, ${product.subcategory || ''}, لاب توب, لابتوب, شركة الحمد للابتوبات, ${product.processor?.name || ''}, ${product.dedicatedGraphics?.name || ''}`}
        image={product.images?.[0]}
        url={`/product/${product.id}`}
        type="product"
        productData={{
          name: product.name,
          brand: product.brand,
          price: finalPrice,
          currency: "EGP",
          availability: (product.wholesaleInfo?.quantity || 0) > 0 ? "InStock" : "OutOfStock",
          condition: "NewCondition",
          sku: product.id
        }}
      />
      <main className="container mx-auto py-8 px-4 md:px-8">
        {/* Breadcrumb */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Breadcrumb>
            <BreadcrumbList className="flex items-center text-sm">
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link
                    to="/"
                    className="flex items-center text-muted-foreground hover:text-primary transition-colors"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="mr-1"
                    >
                      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                      <polyline points="9 22 9 12 15 12 15 22" />
                    </svg>
                    {t("navigation.home")}
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>

              <span className="mx-2 text-muted-foreground">&lt;</span>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link
                    to="/products"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    {t("navigation.products")}
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>

              <span className="mx-2 text-muted-foreground">&lt;</span>
              <BreadcrumbItem>
                <BreadcrumbPage className="font-medium text-primary">
                  {product.name}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </motion.div>

        {/* Product Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
          {/* Product Images */}
          <div className="space-y-6">
            {/* Main Image */}
            <div className="aspect-[4/5] w-full rounded-2xl overflow-hidden relative group bg-white ">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentImage}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="h-full w-full flex items-center justify-center bg-black/5"
                >
                  {isCurrentVideo ? (
                    <div className="w-full h-full relative group">
                      <iframe
                        src={currentImage.includes("youtube") || currentImage.includes("youtu.be")
                          ? currentImage.replace("watch?v=", "embed/").replace("youtu.be/", "www.youtube.com/embed/")
                          : currentImage.includes("facebook")
                            ? `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(currentImage)}&show_text=0`
                            : currentImage}
                        title="Product Video"
                        className="w-full h-full rounded-2xl"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    <img
                      src={currentImage}
                      alt={product.name}
                      className="h-full w-full object-contain mix-blend-multiply"
                    />
                  )}
                </motion.div>
              </AnimatePresence>



              {/* Navigation arrows */}
              {product.images.length > 1 && (
                <>
                  <button
                    onClick={() => {
                      if (availableColors.length > 1) {
                        // For products with multiple colors, navigate through colors
                        const currentColorIndex = availableColors.findIndex(color => color === selectedColor);
                        const prevColorIndex = currentColorIndex > 0 ? currentColorIndex - 1 : availableColors.length - 1;
                        setSelectedColor(availableColors[prevColorIndex]);
                      } else {
                        // For products with single color, navigate through images
                        setSelectedImage((prev) =>
                          prev > 0 ? prev - 1 : product.images.length - 1
                        );
                      }
                    }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/90 backdrop-blur-sm p-3 text-gray-700 opacity-0 transition-all duration-200 group-hover:opacity-100 hover:bg-white shadow-lg"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    onClick={() => {
                      if (availableColors.length > 1) {
                        // For products with multiple colors, navigate through colors
                        const currentColorIndex = availableColors.findIndex(color => color === selectedColor);
                        const nextColorIndex = currentColorIndex < availableColors.length - 1 ? currentColorIndex + 1 : 0;
                        setSelectedColor(availableColors[nextColorIndex]);
                      } else {
                        // For products with single color, navigate through images
                        setSelectedImage((prev) =>
                          prev < product.images.length - 1 ? prev + 1 : 0
                        );
                      }
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/90 backdrop-blur-sm p-3 text-gray-700 opacity-0 transition-all duration-200 group-hover:opacity-100 hover:bg-white shadow-lg"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnails - Show all media */}
            {mediaItems.length > 1 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-700">معرض الصور والفيديو</h4>
                  <span className="text-xs text-gray-500">
                    {mediaItems.length} عنصر
                  </span>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                  {mediaItems.map((item, index) => {
                    const isSelected = availableColors.length > 1
                      ? (item.type === 'image' && selectedColor && colorImageMapping[selectedColor] === item.url) ||
                      (!selectedColor && index === selectedImage)
                      : index === selectedImage;

                    return (
                      <motion.button
                        key={index}
                        onClick={() => {
                          if (item.type === 'image' && availableColors.length > 1) {
                            // Find the color that corresponds to this image
                            const correspondingColor = availableColors.find(color =>
                              colorImageMapping[color] === item.url
                            );
                            if (correspondingColor) {
                              setSelectedColor(correspondingColor);
                            } else {
                              setSelectedImage(index);
                              setSelectedColor(""); // Reset color if clicking unrelated image
                            }
                          } else {
                            setSelectedImage(index);
                            if (availableColors.length > 1) setSelectedColor(""); // Reset color if clicking video
                          }
                        }}
                        className={`group relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all duration-200 ${isSelected
                          ? "border-primary ring-1 ring-primary/30 shadow-md"
                          : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
                          }`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {item.type === 'video' ? (
                          <div className="w-full h-full flex items-center justify-center bg-gray-100 relative">
                            <Film className="w-6 h-6 text-gray-500" />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/20 transition-colors">
                              <Play className="w-6 h-6 text-white fill-white opacity-80" />
                            </div>
                          </div>
                        ) : (
                          <img
                            src={item.url}
                            alt={`${product.name} - ${index + 1}`}
                            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                          />
                        )}

                        {/* Selection indicator */}
                        {isSelected && (
                          <motion.div
                            className="absolute inset-0 bg-primary/20 flex items-center justify-center pointer-events-none"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.15 }}
                          >
                            <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center shadow-sm">
                              <CheckCircle className="h-3 w-3 text-white" />
                            </div>
                          </motion.div>
                        )}

                        {/* Color indicator overlay - only for images linked to colors */}
                        {item.type === 'image' && availableColors.length > 1 && availableColors.some(c => colorImageMapping[c] === item.url) && (
                          <div className="absolute bottom-1 right-1 w-3 h-3 rounded-full border border-white shadow-sm"
                            style={{
                              backgroundColor: availableColors.find(c => colorImageMapping[c] === item.url) || '#ccc'
                            }}
                          />
                        )}

                        {/* Image number badge */}
                        <div className="absolute top-1 left-1 w-4 h-4 bg-black/60 text-white text-xs rounded-full flex items-center justify-center font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                          {index + 1}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Product Info */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8"
          >
            {/* Product Header */}
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="text-xs font-medium">
                      {product.category}
                    </Badge>

                    {product.display?.sizeInches && (
                      <Badge variant="outline" className="text-xs gap-1.5 py-1 px-2.5 bg-white/50 backdrop-blur-sm border-gray-200 hover:border-blue-200 transition-colors">
                        <Monitor className="w-3.5 h-3.5 text-blue-500" />
                        <span>{product.display.sizeInches} بوصه</span>
                      </Badge>
                    )}

                    {product.processor?.processorSeries && (
                      <Badge variant="outline" className="text-xs gap-1.5 py-1 px-2.5 bg-white/50 backdrop-blur-sm border-gray-200 hover:border-purple-200 transition-colors">
                        <Cpu className="w-3.5 h-3.5 text-purple-500" />
                        {product.processor.processorSeries}
                      </Badge>
                    )}

                    {product.processor?.processorGeneration && (
                      <Badge variant="outline" className="text-xs py-1 px-2.5 bg-blue-50/50 text-blue-700 border-blue-100 hover:bg-blue-50 transition-colors">
                        {product.processor.processorGeneration.replace(/(\d+)(?:st|nd|rd|th)?\s*Gen(?:eration)?/i, "الجيل $1")}
                      </Badge>
                    )}

                    {product.processor?.integratedGpu && (
                      <Badge variant="outline" className="text-xs gap-1.5 py-1 px-2.5 bg-white/50 backdrop-blur-sm border-gray-200 hover:border-teal-200 transition-colors">
                        <CircuitBoard className="w-3.5 h-3.5 text-teal-500" />
                        {product.processor.integratedGpu}
                      </Badge>
                    )}

                    {product.dedicatedGraphics && (product.dedicatedGraphics.dedicatedGpuModel || product.dedicatedGraphics.name) && (
                      <Badge variant="outline" className="text-xs gap-1.5 py-1 px-2.5 bg-white/50 backdrop-blur-sm border-gray-200 hover:border-green-200 transition-colors">
                        <CircuitBoard className="w-3.5 h-3.5 text-green-500" />
                        {product.dedicatedGraphics.dedicatedGpuModel || product.dedicatedGraphics.name} {product.dedicatedGraphics.vram ? `(${product.dedicatedGraphics.vram} GB)` : ''}
                      </Badge>
                    )}
                  </div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    {product.name}
                  </h1>
                  <p className="text-lg text-gray-600">
                    {product.brand}
                  </p>
                </div>


              </div>

              {/* Price */}
              {/* <div className="space-y-2">
                {product.specialOffer &&
                  new Date(product.offerEndsAt as string) > new Date() &&
                  finalPrice < undiscountedPrice ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl font-bold text-red-600">
                        {formatCurrency(finalPrice, 'جنيه')}
                      </span>
                      <span className="text-xl line-through text-gray-400">
                        {formatCurrency(undiscountedPrice, 'جنيه')}
                      </span>
                      <Badge variant="destructive" className="text-sm">
                        {product.discountPercentage ? `${product.discountPercentage}%` : Math.round(((undiscountedPrice - finalPrice) / undiscountedPrice) * 100) + '%'} خصم
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="animate-pulse"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      <p>
                        ينتهي العرض في {new Date(product.offerEndsAt as string).toLocaleDateString('ar-EG')}
                      </p>
                    </div>
                  </div>
                ) : (
                  <span className="text-3xl font-bold text-gray-900">
                    {formatCurrency(finalPrice, 'جنيه')}
                  </span>
                )}
              </div> */}
            </div>

            <Separator />

            {/* Color Selection */}
            {availableColors.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">اختر اللون</h3>
                  <span className="text-sm text-gray-500">
                    {selectedColor ? getColorByName(selectedColor).name : 'اختر لوناً'}
                  </span>
                </div>
                <div className="flex gap-3">
                  {availableColors.map((color) => {
                    const colorInfo = getColorByName(color);

                    return (
                      <button
                        key={color}
                        onClick={() => setSelectedColor(color)}
                        className={`relative group ${selectedColor === color
                          ? 'ring-2 ring-primary ring-offset-2'
                          : 'ring-1 ring-gray-200 hover:ring-gray-300'
                          } rounded-full p-1 transition-all duration-200`}
                        title={colorInfo.name}
                      >
                        <div
                          className="w-12 h-12 rounded-full border-2 border-white shadow-sm"
                          style={{ backgroundColor: color }}
                        />
                        {selectedColor === color && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-4 h-4 bg-white rounded-full shadow-sm"></div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Available Quantity Display */}
            {/* <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Package className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">الكمية المتاحة</h3>
                  <p className="text-sm text-gray-500">المخزون الحالي</p>
                </div>
              </div>
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    {product.wholesaleInfo?.quantity || 0}
                  </div>
                  <div className="text-sm text-blue-700">
                    قطعة متاحة
                  </div>
                </div>
              </div>
            </div> */}

            {/* Product Options */}
            <ProductOptions
              product={product}
              currentPrice={finalPrice}
              undiscountedPrice={undiscountedPrice}
              maxQuantity={product.wholesaleInfo?.quantity}
              quantity={currentQuantity}
              onSelectionChange={handleSelectionChange}
              onQuantityChange={handleQuantityChange}
              onBuy={handleBuy}
            />

            <Separator className="my-8" />

            {/* Secondary Actions */}
            <div className="flex gap-3">
              <Button
                size="lg"
                variant="outline"
                className="flex-1"
                onClick={handleShare}
              >
                <Share2 className="mr-2 h-5 w-5" />
                مشاركة
              </Button>

              <Button
                size="lg"
                variant="outline"
                className="flex-1 gap-2"
                onClick={handleCopySpecs}
              >
                <ClipboardCopy className="h-5 w-5" />
                نسخ المواصفات
              </Button>
            </div>

            {/* Product Features */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6">
              <motion.div
                className="group relative overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]"
                whileHover={{ y: -2 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-sm group-hover:bg-blue-500/30 transition-all duration-300"></div>
                    <div className="relative bg-blue-500 p-3 rounded-full">
                      <Shield className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-800 group-hover:text-blue-700 transition-colors">ضمان شهرين</p>
                    <p className="text-xs text-gray-600 mt-1">ضد عيوب الصناعة</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                role="button"
                tabIndex={0}
                onClick={() => setIsBatteryModalOpen(true)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setIsBatteryModalOpen(true)}
                className="group relative overflow-hidden bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 rounded-xl p-4 hover:shadow-lg transition-all duration-300 hover:scale-[1.02] cursor-pointer focus:outline-none focus:ring-2 focus:ring-green-200"
                whileHover={{ y: -2 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-green-500/20 rounded-full blur-sm group-hover:bg-green-500/30 transition-all duration-300"></div>
                    <div className="relative bg-green-500 p-3 rounded-full">
                      <Battery className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-800 group-hover:text-green-700 transition-colors">ضمان الشاحن</p>
                    <p className="text-xs text-gray-600 mt-1">والبطارية اسبوعين</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                className="group relative overflow-hidden bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-100 rounded-xl p-4 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]"
                whileHover={{ y: -2 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-sm group-hover:bg-purple-500/30 transition-all duration-300"></div>
                    <div className="relative bg-purple-500 p-3 rounded-full">
                      <HardDrive className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-800 group-hover:text-purple-700 transition-colors">ضمان الهارد</p>
                    <p className="text-xs text-gray-600 mt-1">شهر واحد</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                className="group relative overflow-hidden bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 rounded-xl p-4 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]"
                whileHover={{ y: -2 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-amber-500/20 rounded-full blur-sm group-hover:bg-amber-500/30 transition-all duration-300"></div>
                    <div className="relative bg-amber-500 p-3 rounded-full">
                      <CheckCircle className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-800 group-hover:text-amber-700 transition-colors">جودة عالية</p>
                    <p className="text-xs text-gray-600 mt-1">منتجات أصلية</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Product Description */}
        {product.description && (
          <div className="mb-16">
            <Separator className="mb-8" />
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-bold mb-6 text-gray-900">وصف المنتج</h2>
              <div
                className="prose prose-lg max-w-none
                prose-headings:font-semibold
                prose-p:leading-relaxed
                prose-ul:list-disc prose-ul:pl-4
                prose-ol:list-decimal prose-ol:pl-4
                prose-li:my-1
                prose-strong:text-foreground
                prose-em:text-foreground/80
                prose-ul:marker:text-foreground
                prose-ol:marker:text-foreground"
                dangerouslySetInnerHTML={{ __html: product.description }}
              />
            </div>
          </div>
        )}

        <div id="specs-section" className="mb-16 scroll-mt-24">
          <Separator className="mb-8" />
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-primary/10 rounded-xl">
                <Settings2 className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-gray-900">المواصفات التقنية</h2>
                <p className="text-gray-500 mt-1">المواصفات الفنية الكاملة للجهاز</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100  overflow-hidden divide-y divide-gray-100">

              {/* Processor Section */}
              {product.processor && (
                <div className="p-6 md:p-8 hover:bg-gray-50/50 transition-colors duration-300">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-blue-100/50 rounded-lg">
                      <Cpu className="w-6 h-6 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">المعالج (Processor)</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
                    {product.processor.name && (
                      <div className="group">
                        <h4 className="text-xs font-medium text-gray-500 mb-1 group-hover:text-primary transition-colors">اسم المعالج</h4>
                        <p className="text-base font-semibold text-gray-900">{product.processor.name}</p>
                      </div>
                    )}

                    {product.processor.processorBrand && (
                      <div className="group">
                        <h4 className="text-xs font-medium text-gray-500 mb-1 group-hover:text-primary transition-colors">نوع المعالج</h4>
                        <p className="text-base font-semibold text-gray-900">{product.processor.processorBrand}</p>
                      </div>
                    )}

                    {product.processor.processorGeneration && (
                      <div className="group">
                        <h4 className="text-xs font-medium text-gray-500 mb-1 group-hover:text-primary transition-colors">جيل المعالج</h4>
                        <p className="text-base font-semibold text-gray-900">{product.processor.processorGeneration}</p>
                      </div>
                    )}

                    {product.processor.processorSeries && (
                      <div className="group">
                        <h4 className="text-xs font-medium text-gray-500 mb-1 group-hover:text-primary transition-colors">فئة المعالج</h4>
                        <p className="text-base font-semibold text-gray-900">{product.processor.processorSeries}</p>
                      </div>
                    )}

                    {product.processor.cacheMemory && (
                      <div className="group">
                        <h4 className="text-xs font-medium text-gray-500 mb-1 group-hover:text-primary transition-colors">ذاكرة الكاش</h4>
                        <p className="text-base font-semibold text-gray-900">{product.processor.cacheMemory}</p>
                      </div>
                    )}

                    {product.processor.baseClockSpeed && (
                      <div className="group">
                        <h4 className="text-xs font-medium text-gray-500 mb-1 group-hover:text-primary transition-colors">السرعة الأساسية</h4>
                        <p className="text-base font-semibold text-gray-900">{product.processor.baseClockSpeed} GHz</p>
                      </div>
                    )}

                    {product.processor.maxTurboSpeed && (
                      <div className="group">
                        <h4 className="text-xs font-medium text-gray-500 mb-1 group-hover:text-primary transition-colors">أقصى سرعة</h4>
                        <p className="text-base font-semibold text-gray-900">{product.processor.maxTurboSpeed} GHz</p>
                      </div>
                    )}

                    {product.processor.cores && (
                      <div className="group">
                        <h4 className="text-xs font-medium text-gray-500 mb-1 group-hover:text-primary transition-colors">عدد النوى</h4>
                        <p className="text-base font-semibold text-gray-900">{product.processor.cores} Cores</p>
                      </div>
                    )}

                    {product.processor.threads && (
                      <div className="group">
                        <h4 className="text-xs font-medium text-gray-500 mb-1 group-hover:text-primary transition-colors">عدد المسارات</h4>
                        <p className="text-base font-semibold text-gray-900">{product.processor.threads} Threads</p>
                      </div>
                    )}

                    {product.processor.integratedGpu && (
                      <div className="group sm:col-span-2 lg:col-span-3">
                        <h4 className="text-xs font-medium text-gray-500 mb-1 group-hover:text-primary transition-colors">كرت الشاشة المدمج</h4>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200">
                            {product.processor.integratedGpu}
                          </Badge>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Dedicated Graphics Section */}
              {product.dedicatedGraphics && product.dedicatedGraphics.hasDedicatedGraphics && (
                <div className="p-6 md:p-8 hover:bg-gray-50/50 transition-colors duration-300">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-green-100/50 rounded-lg">
                      <CircuitBoard className="w-6 h-6 text-green-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">كرت الشاشة الخارجي (Graphics Card)</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
                    {product.dedicatedGraphics.name && (
                      <div className="group">
                        <h4 className="text-xs font-medium text-gray-500 mb-1 group-hover:text-primary transition-colors">الموديل</h4>
                        <p className="text-base font-semibold text-gray-900">{product.dedicatedGraphics.name}</p>
                      </div>
                    )}

                    {product.dedicatedGraphics.manufacturer && (
                      <div className="group">
                        <h4 className="text-xs font-medium text-gray-500 mb-1 group-hover:text-primary transition-colors">الشركة المصنعة</h4>
                        <p className="text-base font-semibold text-gray-900">{product.dedicatedGraphics.manufacturer}</p>
                      </div>
                    )}

                    {product.dedicatedGraphics.vram && (
                      <div className="group">
                        <h4 className="text-xs font-medium text-gray-500 mb-1 group-hover:text-primary transition-colors">حجم الذاكرة (VRAM)</h4>
                        <p className="text-base font-semibold text-gray-900">{product.dedicatedGraphics.vram} GB</p>
                      </div>
                    )}

                    {product.dedicatedGraphics.memoryType && (
                      <div className="group">
                        <h4 className="text-xs font-medium text-gray-500 mb-1 group-hover:text-primary transition-colors">نوع الذاكرة</h4>
                        <p className="text-base font-semibold text-gray-900">{product.dedicatedGraphics.memoryType}</p>
                      </div>
                    )}

                    {product.dedicatedGraphics.memorySpeed && (
                      <div className="group">
                        <h4 className="text-xs font-medium text-gray-500 mb-1 group-hover:text-primary transition-colors">سرعة الذاكرة</h4>
                        <p className="text-base font-semibold text-gray-900">{product.dedicatedGraphics.memorySpeed} MHz</p>
                      </div>
                    )}

                    {product.dedicatedGraphics.memoryBusWidth && (
                      <div className="group">
                        <h4 className="text-xs font-medium text-gray-500 mb-1 group-hover:text-primary transition-colors">عرض الناقل</h4>
                        <p className="text-base font-semibold text-gray-900">{product.dedicatedGraphics.memoryBusWidth} bit</p>
                      </div>
                    )}

                    {product.dedicatedGraphics.baseClock && (
                      <div className="group">
                        <h4 className="text-xs font-medium text-gray-500 mb-1 group-hover:text-primary transition-colors">التردد الأساسي</h4>
                        <p className="text-base font-semibold text-gray-900">{product.dedicatedGraphics.baseClock} MHz</p>
                      </div>
                    )}

                    {product.dedicatedGraphics.boostClock && (
                      <div className="group">
                        <h4 className="text-xs font-medium text-gray-500 mb-1 group-hover:text-primary transition-colors">تردد التعزيز</h4>
                        <p className="text-base font-semibold text-gray-900">{product.dedicatedGraphics.boostClock} MHz</p>
                      </div>
                    )}

                    {product.dedicatedGraphics.powerConsumption && (
                      <div className="group">
                        <h4 className="text-xs font-medium text-gray-500 mb-1 group-hover:text-primary transition-colors">استهلاك الطاقة</h4>
                        <p className="text-base font-semibold text-gray-900">{product.dedicatedGraphics.powerConsumption} W</p>
                      </div>
                    )}

                    {product.dedicatedGraphics.powerConnectors && product.dedicatedGraphics.powerConnectors.length > 0 && (
                      <div className="group sm:col-span-2 lg:col-span-3">
                        <h4 className="text-xs font-medium text-gray-500 mb-2 group-hover:text-primary transition-colors">وصلات الطاقة</h4>
                        <div className="flex flex-wrap gap-2">
                          {product.dedicatedGraphics.powerConnectors.map((connector, idx) => (
                            <Badge key={idx} variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                              {connector}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {product.dedicatedGraphics.availablePorts && product.dedicatedGraphics.availablePorts.length > 0 && (
                      <div className="group sm:col-span-2 lg:col-span-3">
                        <h4 className="text-xs font-medium text-gray-500 mb-2 group-hover:text-primary transition-colors">المنافذ</h4>
                        <div className="flex flex-wrap gap-2">
                          {product.dedicatedGraphics.availablePorts.map((port, idx) => (
                            <Badge key={idx} variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                              {port}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {product.dedicatedGraphics.gamingTechnologies && product.dedicatedGraphics.gamingTechnologies.length > 0 && (
                      <div className="group sm:col-span-2 lg:col-span-3">
                        <h4 className="text-xs font-medium text-gray-500 mb-2 group-hover:text-primary transition-colors">تقنيات الألعاب</h4>
                        <div className="flex flex-wrap gap-2">
                          {product.dedicatedGraphics.gamingTechnologies.map((tech, idx) => (
                            <Badge key={idx} variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                              {tech}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Display Section */}
              {product.display && (
                <div className="p-6 md:p-8 hover:bg-gray-50/50 transition-colors duration-300">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-purple-100/50 rounded-lg">
                      <Monitor className="w-6 h-6 text-purple-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">الشاشة (Display)</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
                    {product.display.sizeInches && (
                      <div className="group">
                        <h4 className="text-xs font-medium text-gray-500 mb-1 group-hover:text-primary transition-colors">حجم الشاشة</h4>
                        <p className="text-base font-semibold text-gray-900">{product.display.sizeInches} بوصة</p>
                      </div>
                    )}

                    {product.display.resolution && (
                      <div className="group">
                        <h4 className="text-xs font-medium text-gray-500 mb-1 group-hover:text-primary transition-colors">الدقة</h4>
                        <p className="text-base font-semibold text-gray-900">{product.display.resolution}</p>
                      </div>
                    )}

                    {product.display.panelType && (
                      <div className="group">
                        <h4 className="text-xs font-medium text-gray-500 mb-1 group-hover:text-primary transition-colors">نوع الشاشة (Panel)</h4>
                        <p className="text-base font-semibold text-gray-900">{product.display.panelType}</p>
                      </div>
                    )}

                    {product.display.refreshRate && (
                      <div className="group">
                        <h4 className="text-xs font-medium text-gray-500 mb-1 group-hover:text-primary transition-colors">معدل التحديث</h4>
                        <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200 text-base font-semibold px-3">
                          {product.display.refreshRate}Hz
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>

        {/* Suggested Products */}
        <div className="mb-16">
          <Separator className="mb-8" />
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              منتجات مشابهة
            </h2>
            <p className="text-gray-600">
              اكتشف المزيد من المنتجات المميزة
            </p>
          </div>

          {suggestedProducts.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {suggestedProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onView={() => {
                    setSelectedProduct(product);
                    setModalOpen(true);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </main >

      <ProductModal
        product={selectedProduct}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />

      {/* Sticky Bottom Navigation - Rendered in Portal to avoid parent stacking contexts */}
      {createPortal(
        <AnimatePresence mode="wait">
          {(!isBuyButtonManuallyHidden && !isPurchaseVisible) || (!isSpecsButtonManuallyHidden && !isSpecsVisible) ? (
            <motion.div
              className="fixed bottom-4 left-4 right-4 z-[100] md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-full md:max-w-sm pointer-events-none"
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ duration: 0.4, ease: "circOut" }}
              style={{ willChange: "transform, opacity" }}
            >
              <div className="flex items-center justify-center gap-3">
                <AnimatePresence mode="popLayout">
                  {!isBuyButtonManuallyHidden && !isPurchaseVisible && (
                    <motion.div
                      key="buy-btn"
                      layout
                      initial={{ y: 50, opacity: 0, scale: 0.9 }}
                      animate={{ y: 0, opacity: 1, scale: 1 }}
                      exit={{ y: 50, opacity: 0, scale: 0.9 }}
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                      className="flex-1 pointer-events-auto shadow-2xl rounded-full relative group"
                    >
                      {/* Close button for Buy button */}
                      <motion.button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsBuyButtonManuallyHidden(true);
                        }}
                        className="absolute -top-2 -right-2 bg-red-500/90 backdrop-blur-sm text-white rounded-full p-1.5 hover:bg-red-600 transition-all shadow-lg z-10"
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <X className="h-3 w-3" />
                      </motion.button>

                      <Button
                        onClick={() => scrollToSection('checkout-input-fields')}
                        className="w-full rounded-full h-11 text-sm font-bold shadow-lg bg-primary hover:bg-primary/90 transition-all active:scale-95 border border-primary/20 backdrop-blur-md"
                      >
                        <ShoppingCart className="ml-2 h-4 w-4" />
                        شراء / حجز
                      </Button>
                    </motion.div>
                  )}

                  {!isSpecsButtonManuallyHidden && !isSpecsVisible && (
                    <motion.div
                      key="specs-btn"
                      layout
                      initial={{ y: 50, opacity: 0, scale: 0.9 }}
                      animate={{ y: 0, opacity: 1, scale: 1 }}
                      exit={{ y: 50, opacity: 0, scale: 0.9 }}
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                      className="flex-1 pointer-events-auto shadow-2xl rounded-full relative group"
                    >
                      {/* Close button for Specs button */}
                      <motion.button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsSpecsButtonManuallyHidden(true);
                        }}
                        className="absolute -top-2 -right-2 bg-red-500/90 backdrop-blur-sm text-white rounded-full p-1.5 hover:bg-red-600 transition-all shadow-lg z-10"
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <X className="h-3 w-3" />
                      </motion.button>

                      <Button
                        variant="secondary"
                        onClick={() => scrollToSection('specs-section')}
                        className="w-full rounded-full h-11 text-sm font-bold shadow-lg bg-white/90 hover:bg-white text-gray-800 transition-all active:scale-95 border border-gray-200/50 backdrop-blur-md"
                      >
                        <CheckCircle className="ml-2 h-4 w-4" />
                        المواصفات
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>,
        document.body
      )
      }

      {/* Footer is below */}
      <div className="pb-24">
        <Footer />
      </div>

      <ProductModal
        product={selectedProduct}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />

      <Dialog open={isBatteryModalOpen} onOpenChange={setIsBatteryModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              ضمان الشاحن والبطارية
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-gray-600">
              يغطي الضمان الشاحن والبطارية لمدة أسبوعين من تاريخ الشراء.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border bg-green-50 border-green-100 p-3">
                <p className="text-sm font-semibold text-green-800">مدة التشغيل المتوقعة</p>
                <p className="text-sm text-green-700 mt-1">من ساعتين إلى ٥ ساعات حسب الاستخدام.</p>
              </div>
              <div className="rounded-lg border bg-red-50 border-red-100 p-3">
                <p className="text-sm font-semibold text-red-800">علامة الخلل</p>
                <p className="text-sm text-red-700 mt-1">
                  إذا انخفضت البطارية من 100٪ إلى نفاد كامل في أقل من ساعتين فهذا مؤشر على مشكلة.
                </p>
              </div>
            </div>

            <div className="rounded-lg border p-4 bg-gray-50">
              <p className="text-sm font-semibold text-gray-900 mb-2">شروط الاستبدال</p>
              <ul className="list-disc pr-5 space-y-1 text-sm text-gray-700">
                <li>يمكن استبدال الجهاز أو البطارية ببطارية أخرى خلال أسبوعين من الضمان عند ثبوت المشكلة.</li>
                <li>بعد مرور أسبوعين لا يمكن الاستبدال.</li>
              </ul>
            </div>

            <div className="rounded-lg border p-4">
              <p className="text-sm font-semibold text-gray-900 mb-2">نصائح للحفاظ على عمر البطارية</p>
              <ul className="list-disc pr-5 space-y-1 text-sm text-gray-700">
                <li>استخدم الشاحن الأصلي وتجنب الشواحن غير الموثوقة.</li>
                <li>تجنب استخدام الجهاز أثناء الشحن وتقليل تعرضه للحرارة.</li>
                <li>حافظ على الشحن بين 20٪ و80٪ قدر الإمكان.</li>
              </ul>
            </div>
          </div>

          <DialogFooter className="flex sm:justify-end">
            <Button variant="outline" onClick={() => setIsBatteryModalOpen(false)}>
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Shipping Policy Modal */}
      <Dialog open={showShippingPolicy} onOpenChange={setShowShippingPolicy}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-yellow-700">
              <Truck className="h-5 w-5" /> سياسة الشحن والتوصيل
            </DialogTitle>
            <DialogDescription>
              يرجى مراجعة تفاصيل الشحن أدناه
            </DialogDescription>
          </DialogHeader>

          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg p-4 border border-yellow-100 shadow-sm">
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-white/60 p-3 rounded border border-yellow-100/50">
                <p className="font-medium flex items-center gap-2 text-gray-800">
                  <span className="w-2 h-2 rounded-full bg-green-500 shadow-sm" />
                  داخل القاهرة
                </p>
                <div className="text-right">
                  <p className="font-bold text-yellow-800">100 ج.م</p>
                  <p className="text-xs text-yellow-600">(24 ساعة)</p>
                </div>
              </div>

              <div className="flex justify-between items-center bg-white/60 p-3 rounded border border-yellow-100/50">
                <p className="font-medium flex items-center gap-2 text-gray-800">
                  <span className="w-2 h-2 rounded-full bg-blue-500 shadow-sm" />
                  جميع المحافظات
                </p>
                <div className="text-right">
                  <p className="font-bold text-yellow-800">200 ج.م</p>
                  <p className="text-xs text-yellow-600">(48 ساعة)</p>
                </div>
              </div>
            </div>

            <div className="mt-4 text-xs text-yellow-800 bg-yellow-100/50 p-2 rounded">
              * سيتم تأكيد تكلفة الشحن النهائية عبر واتساب.
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowShippingPolicy(false)} className="w-full">
              حسناً، فهمت
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Success Modal */}
      <Dialog open={orderSuccess.isOpen} onOpenChange={(open) => {
        if (!open) {
          setOrderSuccess(prev => ({ ...prev, isOpen: false }));
          navigate('/products');
        }
      }}>
        <DialogContent className="md:max-w-sm max-w-[90%] rounded-xl p-0 overflow-hidden text-center sm:text-right bg-white border-0 ring-0 outline-none [&>button]:w-12 [&>button]:h-12 [&>button]:top-4 [&>button]:right-4 [&>button]:bg-gray-100 [&>button]:rounded-full [&>button]:text-gray-600 [&>button:hover]:bg-gray-200 [&>button:hover]:text-gray-900 [&>button>svg]:w-6 [&>button>svg]:h-6">
          <div className="p-5">
            <DialogHeader className="mb-4 space-y-3">
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center shadow-sm animate-in zoom-in duration-300">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <DialogTitle className="text-xl font-bold text-center text-gray-900 leading-tight">
                {orderSuccess.type === 'reservation' ? 'تم حجز المنتج بنجاح!' : 'تم حفظ طلبك بنجاح!'}
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-600 text-center leading-relaxed font-medium">
                {orderSuccess.type === 'reservation' ? (
                  'سيتم التواصل معك قريباً لتأكيد الحجز'
                ) : (
                  <>
                    {(() => {
                      const gov = orderSuccess.governorate?.trim() || '';
                      const isCairo = /^(cairo|القاهرة|القاهره|القاهرا)$/i.test(gov);
                      const isRemote = /^(قنا|الاقصر|الأقصر|اسوان|أسوان|شرم الشيخ|الغردقة|الغردقه|مرسى علم | مرسى مطروح)$/i.test(gov);
                      if (isCairo) return 'سيتم التواصل معك خلال 24 ساعة';
                      if (isRemote) return 'سيتم التواصل معك خلال 48 ساعة';
                      return 'سيتم التواصل معك خلال 48 ساعة';
                    })()}
                  </>
                )}

              </DialogDescription>
            </DialogHeader>

            {/* Payment Section - Elegant Design */}
            <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-4 border border-gray-100 mb-4 relative overflow-hidden shadow-sm">
              <div className="relative z-10 space-y-3">
                <div>
                  <p className="text-xs font-bold text-gray-700 mb-2 text-center">
                    بعد دفع مصاريف الشحن على رقم:
                  </p>

                  <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-1.5 pl-2 hover:border-primary/30 transition-all duration-300 shadow-sm group">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText('01025423389');
                        toast.success('تم نسخ الرقم بنجاح');
                      }}
                      className=" text-gray-400 hover:text-primary hover:bg-primary/5 rounded-md"
                      title="نسخ الرقم"
                    >
                      انسخ الرقم
                      <ClipboardCopy className="h-3.5 w-3.5" />
                    </Button>
                    <span className="text-base font-bold text-gray-900 tracking-wider font-mono">
                      01025423389
                    </span>
                  </div>
                </div>

                {/* Shipping Cost Display */}
                {orderSuccess.type !== 'reservation' && (
                  <div className="bg-blue-50/50 rounded-md p-2.5 border border-blue-100/50">
                    <p className="text-xs text-blue-800 font-medium text-center">
                      قيمة الشحن المطلوبة:{' '}
                      <span className="font-bold text-blue-900 text-base">
                        {(() => {
                          const gov = orderSuccess.governorate?.trim() || '';
                          const isCairo = /^(cairo|القاهرة|القاهره|القاهرا)$/i.test(gov);
                          const isRemote = /^(قنا|الاقصر|الأقصر|اسوان|أسوان|شرم الشيخ|الغردقة|الغردقه|مرسى علم | مرسى مطروح)$/i.test(gov);
                          const total = orderSuccess.totalAmount || 0;

                          if (isCairo) {
                            return total > 11000 ? '120 ج.م' : '100 ج.م';
                          } else if (isRemote) {
                            return '200 ج.م';
                          } else {
                            return total > 11000 ? '170 ج.م' : '150 ج.م';
                          }
                        })()}
                      </span>
                    </p>
                  </div>
                )}

                <div>
                  <p className="text-[10px] text-center text-gray-500 mb-2">يقبل التحويل عبر</p>
                  <div className="flex items-center justify-center gap-2">
                    {/* Instapay Badge */}
                    <div className="flex items-center gap-1.5 bg-[#4c2a74] text-white px-3 py-1.5 rounded-md shadow-sm hover:bg-[#3b205a] transition-colors cursor-default">
                      <span className="font-bold text-xs">InstaPay</span>
                    </div>
                    <span className="text-[10px] text-gray-400 font-medium">أو</span>
                    {/* Vodafone Cash Badge */}
                    <div className="flex items-center gap-1.5 bg-[#E60000] text-white px-3 py-1.5 rounded-md shadow-sm hover:bg-[#cc0000] transition-colors cursor-default">
                      <span className="font-bold text-xs">Vodafone Cash</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Decorative Background Elements */}
              <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
              <div className="absolute bottom-0 left-0 w-12 h-12 bg-purple-500/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-xl" />
            </div>

            <div className="space-y-2.5">
              <div>
                <Button
                  onClick={() => window.open(orderSuccess.whatsappUrl, '_blank')}
                  className="w-full gap-2 bg-[#25D366] hover:bg-[#128C7E] text-white font-bold h-10 text-sm shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 rounded-lg"
                >
                  <MessageCircle className="h-4 w-4" />
                  إرسال صورة عملية الدفع واتساب
                </Button>
                <p className="text-[10px] text-gray-400 text-center mt-1">على نفس الرقم 01025423389</p>
              </div>


            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div >
  );
};

export default ProductDetails; 