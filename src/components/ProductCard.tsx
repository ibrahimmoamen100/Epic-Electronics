import { Product } from "@/types/product";
import { Button } from "@/components/ui/button";
import { Eye, ShoppingCart, Timer, Package, AlertTriangle, Monitor, Cpu } from "lucide-react";
import { Link } from "react-router-dom";
import { useStore } from "@/store/useStore";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { formatCurrency } from "@/utils/format";
import { Badge } from "@/components/ui/badge";

interface ProductCardProps {
  product: Product;
  onView: () => void;
  onAddToCart?: () => void;
}

export const ProductCard = ({
  product,
  onView,
  onAddToCart,
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
    <motion.div
      className={`group relative overflow-hidden rounded-xl border bg-card transition-all duration-300 hover:border-primary/30 hover:shadow-lg ${isOutOfStock ? 'opacity-60' : ''} h-[450px] flex flex-col`}
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
      whileHover={{ y: -8, scale: 1.02 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
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
          <div className="absolute top-2 left-2 bg-orange-600 text-white px-2 py-1 rounded-md text-xs font-bold shadow-lg">
            كمية محدودة
          </div>
        )}

        {product.specialOffer && timeRemaining && (
          <div className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded-md text-xs font-bold shadow-lg">
            -{product.discountPercentage}%
          </div>
        )}

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
          <div className="flex flex-wrap gap-1 mt-1">
            {product.display?.sizeInches && (
              <Badge variant="outline" className="text-[10px] gap-1 py-0 px-1.5 h-5 bg-white/50 backdrop-blur-sm border-gray-200">
                <Monitor className="w-3 h-3 text-blue-500" />
                <span>{product.display.sizeInches} بوصه</span>
              </Badge>
            )}

            {product.processor?.processorSeries && (
              <Badge variant="outline" className="text-[10px] gap-1 py-0 px-1.5 h-5 bg-white/50 backdrop-blur-sm border-gray-200">
                <Cpu className="w-3 h-3 text-purple-500" />
                {product.processor.processorSeries}
              </Badge>
            )}

            {product.processor?.processorGeneration && (
              <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-5 bg-blue-50/50 text-blue-700 border-blue-100">
                {product.processor.processorGeneration.replace(/(\d+)(?:st|nd|rd|th)?\s*Gen(?:eration)?/i, "الجيل $1")}
              </Badge>
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

          {/* Options indicator */}
          {/* {hasOptions && (
            <div className="text-xs text-blue-600 font-medium flex items-center bg-blue-50 px-2 py-1 rounded-md">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-1 animate-pulse"></div>
              <span className="hidden sm:inline">{getOptionsDescription()}</span>
              <span className="sm:hidden">خيارات متعددة</span>
            </div>
          )} */}
        </div>

        {/* Action Buttons - Fixed at bottom */}
        <div className="mt-3 flex flex-col sm:flex-row gap-2 w-full">
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
        </div>
      </div>
    </motion.div>
  );
};
