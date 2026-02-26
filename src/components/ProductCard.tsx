import { Product } from "@/types/product";
import { Button } from "@/components/ui/button";
import { Eye, ShoppingCart, Timer, Package, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { useStore } from "@/store/useStore";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";

import { formatCurrency } from "@/utils/format";
import { Badge } from "@/components/ui/badge";

interface ProductCardProps {
  product: Product;
  onView: () => void;
  onAddToCart?: () => void;
  showCopySpecsOnly?: boolean;
}

export const ProductCard = ({
  product,
  onView,
  onAddToCart,
  showCopySpecsOnly,
}: ProductCardProps) => {
  // Early return if product is not defined
  if (!product) {
    return null;
  }

  const addToCart = useStore((state) => state.addToCart);
  const cart = useStore((state) => state.cart);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Calculate available quantity
  const availableQuantity = product.wholesaleInfo?.quantity || 0;
  const isOutOfStock = availableQuantity <= 0;
  const isLowStock = availableQuantity > 0 && availableQuantity <= 5;

  // Check if product has options (colors, sizes, or addons)
  const hasOptions = (product.color && product.color.trim() !== '') ||
    (product.sizes && product.sizes.length > 0) ||
    (product.addons && product.addons.length > 0);

  // Check if product is new (added within last 3 days)
  const isNewProduct = product.createdAt
    ? (new Date().getTime() - new Date(product.createdAt).getTime()) / (1000 * 60 * 60 * 24) <= 3
    : false;

  // Calculate time remaining for special offers
  useEffect(() => {
    if (!product.specialOffer || !product.offerEndsAt) return;

    const calculateTimeRemaining = () => {
      const now = new Date();
      const endTime = new Date(product.offerEndsAt as string);
      const timeDiff = endTime.getTime() - now.getTime();

      if (timeDiff <= 0) {
        setTimeRemaining(null);
        return;
      }

      const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

      if (days > 0) {
        setTimeRemaining(`${days}d ${hours}h`);
      } else if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m`);
      } else {
        setTimeRemaining(`${minutes}m ${seconds}s`);
      }
    };

    calculateTimeRemaining();
    const timer = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(timer);
  }, [product.specialOffer, product.offerEndsAt]);

  // Check if product is in cart
  const isInCart = cart.some((item) => item.product?.id === product.id);

  const handleAddToCart = async () => {
    if (isOutOfStock) {
      toast.error("المنتج غير متوفر حالياً", {
        description: "تم نفاد الكمية المتاحة لهذا المنتج",
      });
      return;
    }

    if (isInCart) {
      toast.error(t("cart.productAlreadyInCart"), {
        description: t("cart.pleaseUpdateQuantity"),
        action: {
          label: t("cart.viewCart"),
          onClick: () => navigate("/cart"),
        },
      });
      return;
    }

    // If product has options, navigate to product details page
    if (hasOptions) {
      toast.info("يحتوي المنتج على خيارات متعددة", {
        description: `سيتم توجيهك إلى صفحة المنتج لاختيار ${getOptionsDescription()}`,
      });
      navigate(`/product/${product.id}`);
      return;
    }

    try {
      // Use addToCart which handles Firebase update automatically
      await addToCart(product, 1);
      toast.success(`${t("cart.productAdded")}: ${product.name}`, {
        description: t("cart.whatWouldYouLikeToDo"),
        action: {
          label: t("cart.checkout"),
          onClick: () => navigate("/cart"),
        },
        cancel: {
          label: t("cart.continueShopping"),
          onClick: () => { },
        },
        duration: 5000,
        dismissible: true,
      });
      onAddToCart?.();
    } catch (error) {
      toast.error("خطأ في إضافة المنتج", {
        description: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
      });
    }
  };

  const handleCopySpecs = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (!product) return;

    // 1. Prepare Data
    const brand = product.brand;
    const category = product.subcategory || product.category; // Preference to subcategory/series
    const processor = `${product.processor?.name || ''} ${product.processor?.processorGeneration ? `– ${product.processor.processorGeneration}` : ''}`.trim();

    // Graphics
    const internalGpu = product.processor?.integratedGpu || 'غير محدد';
    const externalGpu = product.dedicatedGraphics?.hasDedicatedGraphics
      ? `${product.dedicatedGraphics.dedicatedGpuModel || product.dedicatedGraphics.name || ''} – ${product.dedicatedGraphics.vram ? `${product.dedicatedGraphics.vram}GB VRAM` : ''}`
      : 'غير متوفر';

    // Storage 
    let storage = 'SSD M.2 – 256GB'; // Default fallback
    const storageTypeFirst = product.name.match(/(?:SSD|HDD|NVMe)\s*[-:]?\s*(\d+\s*(?:GB|TB)?)/i);
    const storageSizeFirst = product.name.match(/(\d+\s*(?:GB|TB))\s*(?:SSD|HDD|NVMe)/i);

    if (storageTypeFirst) {
      let cap = storageTypeFirst[1];
      if (!/g|t/i.test(cap)) {
        cap += 'GB';
      }
      storage = `SSD M.2 – ${cap}`;
    } else if (storageSizeFirst) {
      storage = `SSD M.2 – ${storageSizeFirst[1]}`;
    }

    // Display
    const display = product.display?.sizeInches ? `${product.display.sizeInches} بوصة` : '';

    // Special Features
    const features = product.description?.includes('360') || product.name.includes('360') || product.name.includes('x360')
      ? 'يدعم اللمس واللف 360 درجة'
      : (product.display?.resolution ? `دقة الشاشة ${product.display.resolution}` : '');

    // 2. Format RAM & Prices
    const sortedSizes = [...(product.sizes || [])].sort((a, b) => a.price - b.price);
    const priceToDisplay = product.specialOffer && product.discountPrice
      ? product.discountPrice
      : (product.specialOffer && product.discountPercentage
        ? product.price * (1 - product.discountPercentage / 100)
        : product.price);

    const ramSection = sortedSizes.length > 0
      ? `\n💾 الرامات والأسعار:\n${sortedSizes.map(size => `• برام ${size.label} بسعر: ${formatCurrency(size.price, 'جنيه')}`).join('\n')}`
      : `\n💰 السعر: ${formatCurrency(priceToDisplay, 'جنيه')}`;

    // 3. Construct Final Text
    const textLines = [
      `🔹 الماركة: ${brand}`,
      `🔹 الفئة: ${category}`,
      processor ? `🔹 المعالج: ${processor}` : null,
      `🔹 كرت الشاشة الداخلي: ${internalGpu}`,
      externalGpu !== 'غير متوفر' ? `🔹 كرت الشاشة الخارجي: ${externalGpu}` : null,
      `🔹 التخزين: ${storage}`,
      display ? `🔹 الشاشة: ${display}` : null,
      features ? `🔹 ${features}` : null,
      ramSection,
      '',
      '📸 يمكنك مشاهدة صور وفيديو اللابتوب والمواصفات كاملة',
      '🛒 مع إمكانية الشراء من خلال اللينك الرسمي على متجر شركة الحمد',
      `🔗 ${window.location.origin}/product/${product.id}`,
      '',
      'أو يمكن الشراء من هنا 👇',
      'فقط اترك اسمك، عنوانك، ورقم تليفونك',
      '',
      '🚚 مصاريف الشحن:',
      '• داخل القاهرة: 100 جنيه – التوصيل خلال 24 ساعة',
      '• باقي المحافظات: 180 جنيه – التوصيل خلال 48 ساعة'
    ].filter(Boolean);

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

  const handleViewDetails = () => {
    navigate(`/product/${product.id}`);
  };

  // Use the discount price as recorded in admin, or calculate if not available
  const discountedPrice =
    product.specialOffer && product.discountPrice
      ? product.discountPrice
      : (product.specialOffer && product.discountPercentage
        ? product.price - product.price * (product.discountPercentage / 100)
        : null);

  // Get current image for display
  const currentImage = product.images?.[currentImageIndex] || product.images?.[0] || '/placeholder.svg';

  // Get options count for better UX
  const getOptionsCount = () => {
    let count = 0;
    if (product.color && product.color.trim() !== '') count++;
    if (product.sizes && product.sizes.length > 0) count++;
    if (product.addons && product.addons.length > 0) count++;
    return count;
  };

  const optionsCount = getOptionsCount();

  // Get options description for better UX
  const getOptionsDescription = () => {
    const options = [];
    if (product.color && product.color.trim() !== '') options.push('ألوان');
    if (product.sizes && product.sizes.length > 0) options.push('مقاسات');
    if (product.addons && product.addons.length > 0) options.push('إضافات');
    return options.join('، ');
  };

  // Get button text based on options
  const getButtonText = () => {
    if (hasOptions) {
      return `اختيار ${getOptionsDescription()}`;
    }
    return 'إضافة للسلة';
  };

  return (
    <div
      className={`group relative overflow-hidden rounded-xl border bg-card transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:-translate-y-2 hover:scale-[1.02] ${isOutOfStock ? 'opacity-60' : ''} h-auto min-h-[500px] flex flex-col`}
      onMouseEnter={() => {
        // Show second image on hover if available
        if (product.images && product.images.length > 1) {
          setCurrentImageIndex(1);
        }
      }}
      onMouseLeave={() => {
        // Return to first image when not hovering
        setCurrentImageIndex(0);
      }}
    >
      <div className="aspect-[1/1] sm:aspect-[4/5] lg:aspect-[3/4] overflow-hidden relative bg-gray-50">
        <img
          src={currentImage}
          alt={product.name || 'Product'}
          className="h-full w-full object-contain transition-all duration-500 group-hover:scale-105"
          loading="lazy"
        />

        {/* Stock Status Badge */}
        {isOutOfStock && (
          <div className="absolute top-2 left-2 bg-red-600 text-white px-2 py-1 rounded-md text-xs font-bold shadow-lg">
            نفذت الكمية
          </div>
        )}

        {isLowStock && !isOutOfStock && (
          <div className="absolute top-2 left-2 bg-orange-600 text-white px-2 py-1 rounded-md text-xs font-bold shadow-lg z-10">
            كمية محدودة
          </div>
        )}

        <div className="absolute top-2 right-2 flex flex-col gap-2 items-end z-10">
          {product.specialOffer && timeRemaining && (
            <div className="bg-red-600 text-white px-2 py-1 rounded-md text-xs font-bold shadow-lg">
              -{product.discountPercentage}%
            </div>
          )}
          {isNewProduct && (
            <div className="bg-blue-600 text-white px-2 py-1 rounded-md text-xs font-bold shadow-lg flex items-center gap-1.5 animate-in fade-in zoom-in duration-300">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
              </span>
              جديد
            </div>
          )}
        </div>

        {/* Image indicator if multiple images */}
        {product.images && product.images.length > 1 && (
          <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded-md text-xs backdrop-blur-sm">
            {currentImageIndex + 1}/{product.images.length}
          </div>
        )}

        {/* Hover overlay for image transition */}
        {product.images && product.images.length > 1 && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
        )}

        {/* Quick view overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center pointer-events-none">

        </div>
      </div>

      <div className="p-3 sm:p-4 flex flex-col flex-1 justify-between">
        <div className="space-y-2 flex-1">
          <Link to={`/product/${product.id}`} className="text-sm text-primary hover:underline sm:text-base text-gray-600 line-clamp-1">
            <h3 className="font-semibold text-sm sm:text-base line-clamp-2 transition-colors duration-300 leading-tight ">
              {product.name || 'Unnamed Product'}
            </h3>
          </Link>
          <p className="text-xs sm:text-sm text-gray-600 line-clamp-1">
            {product.brand || 'Unknown Brand'}
          </p>
          {(product.category || product.subcategory) && (
            <p className="flex items-center gap-2 text-xs text-gray-500 line-clamp-1">
              <span>{product.category} {product.subcategory && `/ ${product.subcategory}`}</span>
            </p>
          )}

          {/* Product Specs Badges */}
          {/* Detailed Product Specs List */}
          <div className="mt-2 space-y-1.5 ">
            {product.processor?.processorSeries && (
              <div className="flex items-center text-[11px] gap-1.5">
                <span className="text-gray-400 font-medium shrink-0">معالج:</span>
                <span className="text-gray-700 font-semibold truncate" dir="ltr">{product.processor.processorSeries}</span>
              </div>
            )}

            {product.processor?.processorGeneration && (
              <div className="flex items-center text-[11px] gap-1.5">
                <span className="text-gray-400 font-medium shrink-0">الجيل:</span>
                <span className="text-gray-700 font-semibold truncate" dir="ltr">
                  {product.processor.processorGeneration.replace(/(\d+)(?:st|nd|rd|th)?\s*Gen(?:eration)?/i, "$1")}
                </span>
              </div>
            )}

            {/* Graphics - Show Internal if available */}
            {product.processor?.integratedGpu && (
              <div className="flex items-center text-[11px] gap-1.5">
                <span className="text-gray-400 font-medium shrink-0">ك.شاشة:</span>
                <span className="text-gray-700 font-semibold truncate" dir="ltr">{product.processor.integratedGpu}</span>
              </div>
            )}

            {/* Graphics - Show External if available */}
            {product.dedicatedGraphics?.hasDedicatedGraphics && (
              <div className="flex items-center text-[11px] gap-1.5">
                <span className="text-gray-400 font-medium shrink-0">خارجي:</span>
                <span className="text-gray-700 font-semibold truncate" dir="ltr">
                  {product.dedicatedGraphics.dedicatedGpuModel || product.dedicatedGraphics.name}
                  {product.dedicatedGraphics.vram && <span className="text-gray-500 ml-1">- {product.dedicatedGraphics.vram}GB</span>}
                </span>
              </div>
            )}

            {product.display?.sizeInches && (
              <div className="flex items-center text-[11px] gap-1.5">
                <span className="text-gray-400 font-medium shrink-0">شاشة:</span>
                <span className="text-gray-700 font-semibold">{product.display.sizeInches} بوصة</span>
              </div>
            )}
          </div>

          {/* Price Section */}
          <div className="flex gap-2 items-baseline">
            {discountedPrice !== null ? (
              <>
                <p className="font-bold text-base sm:text-lg text-red-600">
                  {formatCurrency(discountedPrice, 'جنيه')}
                </p>
                <p className="text-sm text-gray-500 line-through">
                  {formatCurrency(product.price, 'جنيه')}
                </p>
                <div className="ml-auto">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    -{product.discountPercentage}%
                  </span>
                </div>
              </>
            ) : (
              <p className="font-bold text-base sm:text-lg text-gray-900 transition-colors duration-300">
                {formatCurrency(product.price, 'جنيه')}
              </p>
            )}
          </div>

          {/* Stock Information */}
          <div className="flex items-center gap-1.5">
            <Package className="h-3 w-3 text-gray-500" />
            {isOutOfStock ? (
              <span className="text-xs text-red-600 font-medium">غير متوفر</span>
            ) : (
              // <span className="text-xs text-gray-600">
              //   متوفر: {availableQuantity} قطعة
              // </span>
              <span className="text-xs text-gray-600">
                In stock
              </span>
            )}
          </div>

          {/* Special Offer Timer */}
          {product.specialOffer && timeRemaining && (
            <div className="flex items-center text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-md">
              <Timer className="h-3 w-3 mr-1" />
              <span>ينتهي في: {timeRemaining}</span>
            </div>
          )}

        </div>

        {/* Action Buttons - Fixed at bottom */}
        <div className="mt-3 flex flex-col sm:flex-row gap-2 w-full">
          {showCopySpecsOnly ? (
            <Button
              size="default"
              className="w-full text-sm sm:text-sm transition-all duration-200 h-10 sm:h-9 group/btn bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg"
              onClick={handleCopySpecs}
            >
              <span className="mr-1.5">📄</span>
              <span className="font-medium">نسخ المواصفات</span>
            </Button>
          ) : (
            <>
              <Button
                size="default"
                variant="outline"
                className="flex-1 text-sm sm:text-sm transition-all hover:text-primary duration-200 h-10 sm:h-9 group/btn hover:bg-gray-50 border-gray-300 hover:border-primary"
                onClick={handleViewDetails}
              >
                <Eye className="h-4 w-4 mr-1.5 transition-transform duration-200 group-hover/btn:scale-110" />
                <span className="font-medium">تفاصيل</span>
              </Button>

              <Button
                size="default"
                className={`flex-1 text-sm sm:text-sm transition-all duration-200 h-10 sm:h-9 group/btn ${isOutOfStock
                  ? 'bg-gray-400 hover:bg-gray-500 cursor-not-allowed text-white'
                  : product.specialOffer
                    ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-md hover:shadow-lg'
                    : 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg'
                  }`}
                onClick={handleAddToCart}
                disabled={isOutOfStock || isInCart}
              >
                <ShoppingCart className="h-4 w-4 mr-1.5 transition-transform duration-200 group-hover/btn:scale-110" />
                <span className="font-medium">
                  {isOutOfStock ? 'غير متوفر' : (hasOptions ? 'اختيار' : 'إضافة')}
                </span>
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
