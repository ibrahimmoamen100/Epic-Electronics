import { useState, useEffect, useMemo } from "react";
import { Product, ProductSchema } from "@/types/product";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PlusCircle,
  X,
  Calendar as CalendarIcon,
  Timer,
  Package,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useStore } from "@/store/useStore";
import { Calendar as CalendarIconAr } from "lucide-react";
import { ar } from "date-fns/locale";
import { formatPrice } from "@/utils/format";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import "@/styles/quill-custom.css";
import { useTranslation } from "react-i18next";
import { commonColors, getColorByName } from "@/constants/colors";
import { useFormPersistence } from "@/hooks/useFormPersistence";
import { UnsavedChangesAlert } from "@/components/UnsavedChangesAlert";

interface ProductFormProps {
  onSubmit: (product: Product) => void;
}

// Common size options
const commonSizes = ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "One Size"];

// Fixed category options
const fixedCategories = [
  "desktop",
  "laptop",
  "storage",
  "monitor",
  "network",
  "accessories",
  "other",
];

// Cache memory options
const cacheMemoryOptions = ["8MB", "12MB", "16MB", "20MB", "24MB", "32MB"];

// Integrated graphics options
const integratedGraphicsOptions = [
  "Intel UHD Graphics 770",
  "Intel UHD Graphics 630",
  "Intel UHD Graphics 620",

  "Intel Iris Xe Graphics",
  "AMD Radeon Graphics",
  "AMD Radeon Vega 6", "AMD Radeon Vega 8", "AMD Radeon Vega 10", "AMD Radeon Vega 11",
  "لا يوجد"
];

// Graphics card options
const graphicsCardOptions = [
  "RTX 4090", "RTX 4080", "RTX 4070", "RTX 4060",
  "RTX 3080", "RTX 3070", "RTX 3060", "RTX 3050",
  "GTX 1660 Ti", "GTX 1650",
  "RX 7900 XTX", "RX 7900 XT", "RX 7800 XT",
  "RX 6800 XT", "RX 6700 XT", "RX 6600 XT",
  "MX930", "MX950", "MX960", "MX970", "MX980", "MX990",

  "RX 5700 XT", "RX 5600 XT", "RTX A2000", "RTX A3000", "RTX A4000", "RTX A5000", "RTX A6000", "RTX A7000", "RTX A8000",
  "P1000", "P1200", "P2000", "P3000", "P4000",
  "M1000", "M1200", "M2000", "M3000", "M4000",
  "T1000", "T1200", "T2000", "T3000", "T4000",
];

// Graphics card manufacturers
const graphicsManufacturers = ["NVIDIA", "AMD", "Intel Arc", "أخرى"];

// VRAM options
const vramOptions = [2, 4, 6, 8, 12, 16, 24, 48];

// Memory type options
const memoryTypeOptions = ["GDDR6X", "GDDR6", "GDDR5", "HBM2", "HBM3", "أخرى"];

// Memory bus width options
const memoryBusWidthOptions = [64, 128, 192, 256, 320, 384, 512];

// Power connector options
const powerConnectorOptions = ["6-pin", "8-pin", "12-pin", "16-pin", "لا يتطلب موصل إضافي"];

// Available ports options
const availablePortsOptions = [
  "HDMI 2.1", "DisplayPort 1.4", "DisplayPort 2.1",
  "DVI-D", "USB-C", "VGA"
];

// Gaming technologies options
const gamingTechnologiesOptions = [
  "Ray Tracing", "DLSS", "FSR", "G-Sync Compatible",
  "FreeSync", "DirectX 12 Ultimate"
];

export function ProductForm({ onSubmit }: ProductFormProps) {
  const { products } = useStore();
  const { t } = useTranslation();

  // Initial form state
  const initialFormState = {
    id: crypto.randomUUID(),
    name: "",
    brand: "",
    price: "",
    category: "",
    subcategory: "",
    color: "",
    size: "",
    images: [] as string[],
    description: "",
    specialOffer: false,
    discountPercentage: "",
    discountPrice: "",
    offerEndsAt: "",
    isArchived: false,
    expirationDate: undefined as string | undefined,
    sizes: [] as Array<{ id: string; label: string; price: string; extraPrice: string }>,
    addons: [] as Array<{ id: string; label: string; price_delta: string }>,
    baseCost: "",
    processor: {
      name: "",
      processorBrand: undefined as "Intel" | "AMD" | "Other" | undefined,
      processorGeneration: "",
      processorSeries: "",
      processorSeriesSelect: "", // For select value
      customProcessorSeries: "", // For custom value
      cacheMemory: "",
      cacheMemorySelect: "", // For select value
      customCacheMemory: "", // For custom value
      baseClockSpeed: "",
      maxTurboSpeed: "",
      cores: "",
      threads: "",
      integratedGraphics: "",
      integratedGraphicsSelect: "", // For select value
      customIntegratedGraphics: "", // For custom value
      integratedGpu: "",
      integratedGpuSelect: "", // For select value
      customIntegratedGpu: "", // For custom value
    },
    dedicatedGraphics: {
      hasDedicatedGraphics: false,
      // nameSelect holds the select value ('custom' or one of the options).
      // customName holds the actual typed name when nameSelect === 'custom'.
      nameSelect: "",
      customName: "",
      name: "",
      manufacturer: "",
      dedicatedGpuBrand: undefined as "NVIDIA" | "AMD" | "Intel" | "Custom" | undefined,
      dedicatedGpuModel: "",
      vram: "",
      vramSelect: "", // For select value
      customVram: "", // For custom value
      memoryType: "",
      memorySpeed: "",
      memoryBusWidth: "",
      memoryBusWidthSelect: "", // For select value
      customMemoryBusWidth: "", // For custom value
      baseClock: "",
      boostClock: "",
      powerConsumption: "",
      powerConnectors: [],
      availablePorts: [],
      gamingTechnologies: [],
    },
    display: {
      sizeInches: "",
      resolution: "",
      panelType: "",
      refreshRate: "",
    },
    wholesaleInfo: {
      supplierName: "",
      supplierPhone: "",
      supplierEmail: "",
      supplierLocation: "",
      purchasePrice: 0,
      purchasedQuantity: 0,
      quantity: 0,
      notes: "",
    },
  };

  // Use form persistence hook
  const {
    state: formData,
    updateState: setFormData,
    clearSavedState,
    resetState,
    hasUnsavedChanges,
  } = useFormPersistence(initialFormState, {
    key: 'add_product_form',
    debounceMs: 2000, // Save every 2 seconds
    autoSave: true,
  });

  // Additional form state that doesn't need persistence
  const [colors, setColors] = useState<string[]>([]);
  const [sizes, setSizes] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState("");
  const [offerEndDate, setOfferEndDate] = useState<Date | undefined>(undefined);
  const [customBrand, setCustomBrand] = useState("");
  const [customSubcategory, setCustomSubcategory] = useState("");
  const [showCustomBrand, setShowCustomBrand] = useState(false);
  const [showCustomSubcategory, setShowCustomSubcategory] = useState(false);
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [discountPrice, setDiscountPrice] = useState("");
  const [showWholesaleInfo, setShowWholesaleInfo] = useState(false);
  const [showProcessorInfo, setShowProcessorInfo] = useState(false);
  const [showDedicatedGraphicsInfo, setShowDedicatedGraphicsInfo] = useState(false);
  const [showDisplayInfo, setShowDisplayInfo] = useState(false);

  // Functions to manage sizes
  const addSize = () => {
    const newSize = {
      id: crypto.randomUUID(),
      label: "",
      price: formData.price || "0",
      extraPrice: "0",
    };
    setFormData(prev => ({
      ...prev,
      sizes: [...prev.sizes, newSize]
    }));
  };

  // Update size prices when base price changes
  useEffect(() => {
    if (formData.sizes.length > 0) {
      setFormData(prev => ({
        ...prev,
        sizes: prev.sizes.map(size => {
          const basePrice = Number(prev.price) || 0;
          const extra = Number(size.extraPrice) || 0;
          return {
            ...size,
            price: (basePrice + extra).toString()
          };
        })
      }));
    }
  }, [formData.price]);

  const updateSize = (index: number, field: 'label' | 'extraPrice', value: string) => {
    setFormData(prev => {
      const newSizes = [...prev.sizes];
      const size = { ...newSizes[index] };

      if (field === 'extraPrice') {
        size.extraPrice = value;
        const basePrice = Number(prev.price) || 0;
        const extra = Number(value) || 0;
        size.price = (basePrice + extra).toString();
      } else {
        size[field] = value;
      }

      newSizes[index] = size;
      return { ...prev, sizes: newSizes };
    });
  };

  const removeSize = (index: number) => {
    setFormData(prev => ({
      ...prev,
      sizes: prev.sizes.filter((_, i) => i !== index)
    }));
  };

  // Functions to manage addons
  const addAddon = () => {
    const newAddon = {
      id: crypto.randomUUID(),
      label: "",
      price_delta: "",
    };
    setFormData(prev => ({
      ...prev,
      addons: [...prev.addons, newAddon]
    }));
  };

  const updateAddon = (index: number, field: 'label' | 'price_delta', value: string) => {
    setFormData(prev => ({
      ...prev,
      addons: prev.addons.map((addon, i) =>
        i === index ? { ...addon, [field]: value } : addon
      )
    }));
  };

  const removeAddon = (index: number) => {
    setFormData(prev => ({
      ...prev,
      addons: prev.addons.filter((_, i) => i !== index)
    }));
  };

  // Get unique brands and subcategories from existing products
  const getUniqueBrands = () => {
    const brands = products.map((product) => product.brand).filter(Boolean);
    return [...new Set(brands)].sort();
  };

  const getUniqueSubcategories = (category: string) => {
    const subcategories = products
      .filter((product) => product.category === category)
      .map((product) => product.subcategory)
      .filter(Boolean) as string[];
    return [...new Set(subcategories)].sort();
  };

  const uniqueBrands = getUniqueBrands();
  const uniqueSubcategories = formData.category
    ? getUniqueSubcategories(formData.category)
    : [];

  const addColor = (colorValue: string) => {
    if (!colors.includes(colorValue)) {
      setColors([...colors, colorValue]);
    }
  };

  const removeColor = (colorToRemove: string) => {
    setColors(colors.filter((color) => color !== colorToRemove));
  };

  const addOldSize = (size: string) => {
    if (!sizes.includes(size)) {
      setSizes([...sizes, size]);
    }
  };

  const removeOldSize = (sizeToRemove: string) => {
    setSizes(sizes.filter((size) => size !== sizeToRemove));
  };

  const addImageUrl = () => {
    if (imageUrl && !formData.images.includes(imageUrl)) {
      setFormData({ ...formData, images: [...formData.images, imageUrl] });
      setImageUrl("");
    }
  };

  const removeImage = (urlToRemove: string) => {
    setFormData({
      ...formData,
      images: formData.images.filter((url) => url !== urlToRemove),
    });
  };

  // Calculate discount percentage based on price and discount price
  const calculateDiscountPercentage = (
    price: number,
    discountPrice: number
  ) => {
    if (!price || !discountPrice) return "";
    const percentage = ((price - discountPrice) / price) * 100;
    return percentage.toFixed(0);
  };

  // Update form data when discount price changes
  const handleDiscountPriceChange = (value: string) => {
    setDiscountPrice(value);
    const price = Number(formData.price);
    const discountPriceNum = Number(value);
    if (price && discountPriceNum) {
      const percentage = calculateDiscountPercentage(price, discountPriceNum);
      setFormData({
        ...formData,
        discountPercentage: percentage,
        discountPrice: value,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Use custom values if they exist, otherwise use selected values
    const finalBrand = showCustomBrand ? customBrand : formData.brand;
    const finalSubcategory = showCustomSubcategory
      ? customSubcategory
      : formData.subcategory;
    const finalCategory = showCustomCategory
      ? formData.category
      : formData.category;

    if (
      !formData.name ||
      !finalBrand ||
      !formData.price ||
      !finalCategory ||
      !finalSubcategory
    ) {
      toast.error("الرجاء تعبئة جميع الحقول المطلوبة");
      return;
    }

    // Validate special offer fields if special offer is enabled
    if (formData.specialOffer) {
      if (!formData.discountPercentage) {
        toast.error("الرجاء إدخال نسبة الخصم للعرض الخاص");
        return;
      }
      if (!offerEndDate) {
        toast.error("الرجاء تحديد تاريخ انتهاء للعرض الخاص");
        return;
      }
    }

    // Validate wholesale info if enabled
    if (showWholesaleInfo && formData.wholesaleInfo) {
      const { purchasedQuantity, quantity } = formData.wholesaleInfo;
      if (purchasedQuantity < 0) {
        toast.error("الكمية المشتراة يجب أن تكون أكبر من أو تساوي صفر");
        return;
      }
      if (quantity < 0) {
        toast.error("الكمية المتاحة يجب أن تكون أكبر من أو تساوي صفر");
        return;
      }
      if (quantity > purchasedQuantity) {
        toast.error("الكمية المتاحة لا يمكن أن تكون أكبر من الكمية المشتراة");
        return;
      }
    }

    try {
      // Process sizes and addons
      const processedSizes = formData.sizes
        .filter(size => size.label.trim())
        .map(size => ({
          id: size.id,
          label: size.label.trim(),
          extraPrice: Number(size.extraPrice) || 0,
          price: Number(size.price)
        }));

      const processedAddons = formData.addons
        .filter(addon => addon.label.trim() && addon.price_delta.trim())
        .map(addon => ({
          id: addon.id,
          label: addon.label.trim(),
          price_delta: Number(addon.price_delta)
        }));

      // Process processor data
      const processedProcessor = showProcessorInfo && formData.processor ? {
        name: formData.processor.name || undefined,
        processorBrand: formData.processor.processorBrand || undefined,
        processorGeneration: formData.processor.processorGeneration || undefined,
        processorSeries: formData.processor.processorSeries || undefined,
        cacheMemory: formData.processor.cacheMemorySelect === 'custom'
          ? (formData.processor.customCacheMemory || undefined)
          : (formData.processor.cacheMemorySelect || undefined),
        baseClockSpeed: formData.processor.baseClockSpeed ? Number(formData.processor.baseClockSpeed) : undefined,
        maxTurboSpeed: formData.processor.maxTurboSpeed ? Number(formData.processor.maxTurboSpeed) : undefined,
        cores: formData.processor.cores ? Number(formData.processor.cores) : undefined,
        threads: formData.processor.threads ? Number(formData.processor.threads) : undefined,
        integratedGraphics: formData.processor.integratedGraphicsSelect === 'custom'
          ? (formData.processor.customIntegratedGraphics || undefined)
          : (formData.processor.integratedGraphicsSelect || undefined),
        integratedGpu: formData.processor.integratedGpuSelect === 'custom'
          ? (formData.processor.customIntegratedGpu || undefined)
          : (formData.processor.integratedGpuSelect || formData.processor.integratedGpu || undefined),
      } : undefined;

      // Process dedicated graphics data
      const processedDedicatedGraphics = showDedicatedGraphicsInfo && formData.dedicatedGraphics ? {
        hasDedicatedGraphics: formData.dedicatedGraphics.hasDedicatedGraphics || false,
        // If the user selected a custom model, use customName; otherwise use the selected name
        name: formData.dedicatedGraphics.nameSelect === 'custom'
          ? (formData.dedicatedGraphics.customName || undefined)
          : (formData.dedicatedGraphics.nameSelect || formData.dedicatedGraphics.name || undefined),
        manufacturer: formData.dedicatedGraphics.manufacturer || undefined,
        dedicatedGpuBrand: formData.dedicatedGraphics.dedicatedGpuBrand || undefined,
        dedicatedGpuModel: formData.dedicatedGraphics.dedicatedGpuModel || undefined,
        vram: formData.dedicatedGraphics.vramSelect === 'custom'
          ? (formData.dedicatedGraphics.customVram ? Number(formData.dedicatedGraphics.customVram) : undefined)
          : (formData.dedicatedGraphics.vramSelect ? Number(formData.dedicatedGraphics.vramSelect) : undefined),
        memoryType: formData.dedicatedGraphics.memoryType || undefined,
        memorySpeed: formData.dedicatedGraphics.memorySpeed ? Number(formData.dedicatedGraphics.memorySpeed) : undefined,
        memoryBusWidth: formData.dedicatedGraphics.memoryBusWidthSelect === 'custom'
          ? (formData.dedicatedGraphics.customMemoryBusWidth ? Number(formData.dedicatedGraphics.customMemoryBusWidth) : undefined)
          : (formData.dedicatedGraphics.memoryBusWidthSelect ? Number(formData.dedicatedGraphics.memoryBusWidthSelect) : undefined),
        baseClock: formData.dedicatedGraphics.baseClock ? Number(formData.dedicatedGraphics.baseClock) : undefined,
        boostClock: formData.dedicatedGraphics.boostClock ? Number(formData.dedicatedGraphics.boostClock) : undefined,
        powerConsumption: formData.dedicatedGraphics.powerConsumption ? Number(formData.dedicatedGraphics.powerConsumption) : undefined,
        powerConnectors: formData.dedicatedGraphics.powerConnectors || [],
        availablePorts: formData.dedicatedGraphics.availablePorts || [],
        gamingTechnologies: formData.dedicatedGraphics.gamingTechnologies || [],
      } : undefined;

      const processedDisplay = showDisplayInfo && formData.display ? {
        sizeInches: formData.display.sizeInches
          ? Number(formData.display.sizeInches)
          : undefined,
        resolution: formData.display.resolution || undefined,
        panelType: formData.display.panelType || undefined,
        refreshRate: formData.display.refreshRate
          ? Number(formData.display.refreshRate)
          : undefined,
      } : undefined;

      const product = {
        ...formData,
        brand: finalBrand,
        subcategory: finalSubcategory,
        category: finalCategory,
        price: Number(formData.price),
        color: colors.length > 0 ? colors.join(",") : "",
        size: sizes.length > 0 ? sizes.join(",") : "",
        sizes: processedSizes,
        addons: processedAddons,
        costs: formData.baseCost ? { base_cost: Number(formData.baseCost) } : undefined,
        processor: processedProcessor,
        dedicatedGraphics: processedDedicatedGraphics,
        display: processedDisplay,
        discountPercentage: formData.specialOffer && formData.discountPercentage
          ? Number(formData.discountPercentage)
          : null,
        discountPrice: formData.specialOffer && formData.discountPrice
          ? Number(formData.discountPrice)
          : null,
        offerEndsAt:
          formData.specialOffer && offerEndDate
            ? offerEndDate.toISOString()
            : null,
        isArchived: formData.isArchived,
        createdAt: new Date().toISOString(),
        expirationDate: formData.expirationDate || null,
        wholesaleInfo: showWholesaleInfo ? (() => {
          const wholesaleInfo = formData.wholesaleInfo;
          if (!wholesaleInfo) return null;

          // عند إضافة منتج جديد، نضمن أن الكمية المتاحة = الكمية المشتراة
          // إذا كانت الكمية المتاحة = 0 أو لم يتم تعيينها، نعيّنها = الكمية المشتراة
          const finalQuantity = wholesaleInfo.quantity === 0 && wholesaleInfo.purchasedQuantity > 0
            ? wholesaleInfo.purchasedQuantity
            : (wholesaleInfo.quantity || 0);

          return {
            ...wholesaleInfo,
            quantity: finalQuantity,
          };
        })() : null,
      };

      // Remove id from product data since Firebase will generate it
      const { id, ...productData } = product;

      // Update the store using Firebase
      await onSubmit(productData as any);

      // Reset form and clear saved state
      resetState();
      setColors([]);
      setSizes([]);
      setImageUrl("");
      setOfferEndDate(undefined);
      setCustomBrand("");
      setCustomSubcategory("");
      setShowCustomBrand(false);
      setShowCustomSubcategory(false);
      setShowCustomCategory(false);
      setDiscountPrice("");
      setShowWholesaleInfo(false);
      setShowProcessorInfo(false);
      setShowDedicatedGraphicsInfo(false);
      setShowDisplayInfo(false);

      // Success message (will be shown regardless of Firebase/localStorage)
      toast.success("تمت إضافة المنتج بنجاح");
    } catch (error) {
      console.error("خطأ في إضافة المنتج:", error);
      toast.error("فشل في إضافة المنتج");
    }
  };

  return (
    <>
      <UnsavedChangesAlert hasUnsavedChanges={hasUnsavedChanges} />
      <form
        onSubmit={handleSubmit}
        className="space-y-4 border p-6 rounded-lg bg-card shadow-sm"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold">إضافة منتج جديد</h2>
          </div>
          {hasUnsavedChanges && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>تم حفظ البيانات تلقائياً</span>
            </div>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium">الاسم *</label>
            <Input
              id="product-name"
              name="name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm font-medium">العلامة التجارية *</label>
            {!showCustomBrand ? (
              <div className="space-y-2">
                <Select
                  value={formData.brand}
                  onValueChange={(value) => {
                    if (value === "add-new") {
                      setShowCustomBrand(true);
                      setFormData({ ...formData, brand: "" });
                    } else {
                      setFormData({ ...formData, brand: value });
                    }
                  }}
                >
                  <SelectTrigger className="shrink-0">
                    <SelectValue placeholder="اختر علامة تجارية" />
                  </SelectTrigger>
                  <SelectContent position="popper" sideOffset={4}>
                    {uniqueBrands.map((brand) => (
                      <SelectItem key={brand} value={brand}>
                        {brand}
                      </SelectItem>
                    ))}
                    <SelectItem
                      value="add-new"
                      className="text-blue-600 font-medium"
                    >
                      + إضافة علامة تجارية جديدة
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Input
                  id="custom-brand"
                  name="brand"
                  required
                  value={customBrand}
                  onChange={(e) => setCustomBrand(e.target.value)}
                  placeholder="أدخل اسم العلامة التجارية الجديدة"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowCustomBrand(false);
                    setCustomBrand("");
                  }}
                >
                  العودة إلى الاختيار
                </Button>
              </div>
            )}
          </div>
          <div>
            <label className="text-sm font-medium">السعر *</label>
            <Input
              id="product-price"
              name="price"
              required
              type="number"
              min="0"
              step="0.01"
              value={formData.price}
              onChange={(e) =>
                setFormData({ ...formData, price: e.target.value })
              }
            />
            {formData.price && (
              <p className="text-sm text-muted-foreground mt-1">
                {formatPrice(Number(formData.price))} جنيه
              </p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium">التصنيف *</label>
            <div className="space-y-2">
              <Select
                value={showCustomCategory ? "custom" : formData.category}
                onValueChange={(value) => {
                  if (value === "custom") {
                    setShowCustomCategory(true);
                    setFormData({ ...formData, category: "", subcategory: "" });
                  } else {
                    setShowCustomCategory(false);
                    setFormData({
                      ...formData,
                      category: value,
                      subcategory: "",
                    });
                  }
                }}
              >
                <SelectTrigger className="shrink-0">
                  <SelectValue placeholder="اختر تصنيفًا" />
                </SelectTrigger>
                <SelectContent position="popper" sideOffset={4}>
                  {fixedCategories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                  <SelectItem
                    value="custom"
                    className="text-blue-600 font-medium"
                  >
                    + إضافة تصنيف جديد
                  </SelectItem>
                </SelectContent>
              </Select>
              {showCustomCategory && (
                <Input
                  type="text"
                  placeholder="أدخل تصنيف جديد"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  className="mt-2"
                />
              )}
            </div>
          </div>

          {formData.category && (
            <div>
              <label className="text-sm font-medium">التصنيف الفرعي *</label>
              {!showCustomSubcategory ? (
                <div className="space-y-2">
                  <Select
                    value={formData.subcategory}
                    onValueChange={(value) => {
                      if (value === "add-new") {
                        setShowCustomSubcategory(true);
                        setFormData({ ...formData, subcategory: "" });
                      } else {
                        setFormData({ ...formData, subcategory: value });
                      }
                    }}
                  >
                    <SelectTrigger className="shrink-0">
                      <SelectValue placeholder="اختر تصنيفًا فرعيًا" />
                    </SelectTrigger>
                    <SelectContent position="popper" sideOffset={4}>
                      {uniqueSubcategories.map((subcategory) => (
                        <SelectItem key={subcategory} value={subcategory}>
                          {subcategory}
                        </SelectItem>
                      ))}
                      <SelectItem
                        value="add-new"
                        className="text-blue-600 font-medium"
                      >
                        + إضافة تصنيف فرعي جديد
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-2">
                  <Input
                    required
                    id="custom-subcategory"
                    name="subcategory"
                    value={customSubcategory}
                    onChange={(e) => setCustomSubcategory(e.target.value)}
                    placeholder="أدخل اسم تصنيف فرعي جديد"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowCustomSubcategory(false);
                      setCustomSubcategory("");
                    }}
                  >
                    العودة إلى الاختيار
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Special Offer Section */}
        <div className="rounded-md border p-4 space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="special-offer"
              checked={formData.specialOffer}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, specialOffer: checked })
              }
            />
            <Label htmlFor="special-offer" className="font-medium">
              عرض خاص
            </Label>
          </div>

          {formData.specialOffer && (
            <div className="grid gap-4 sm:grid-cols-2 pt-2">
              <div>
                <label className="text-sm font-medium">سعر الخصم *</label>
                <div className="flex items-center">
                  <Input
                    type="number"
                    min="1"
                    value={discountPrice}
                    onChange={(e) => handleDiscountPriceChange(e.target.value)}
                    className="flex-1"
                    placeholder="أدخل سعر الخصم"
                  />
                  <span className="ms-2 text-lg">ج.م</span>
                </div>
                {formData.price && discountPrice && (
                  <p className="text-sm text-muted-foreground mt-1">
                    الخصم: {formData.discountPercentage}%
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium">
                  تاريخ انتهاء العرض *
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !offerEndDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {offerEndDate ? (
                        format(offerEndDate, "PPP", { locale: ar })
                      ) : (
                        <span>اختر تاريخًا</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={offerEndDate}
                      onSelect={setOfferEndDate}
                      initialFocus
                      disabled={(date) => date < new Date()}
                      className={cn("p-3 pointer-events-auto")}
                      locale={ar}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}
        </div>

        {/* Color section */}
        <div>
          <label className="text-sm font-medium mb-3 block">الألوان المتاحة *</label>
          <div className="space-y-4">
            {/* Color Categories */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Basic Colors */}
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">الألوان الأساسية</h4>
                <div className="grid grid-cols-5 gap-2">
                  {commonColors.filter(color => color.category === "basic").map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => addColor(color.value)}
                      disabled={colors.includes(color.value)}
                      className={cn(
                        "relative h-10 w-10 rounded-full border-2 transition-all hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed",
                        colors.includes(color.value)
                          ? "border-primary ring-2 ring-primary/20"
                          : "border-gray-300 hover:border-gray-400"
                      )}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    >
                      {colors.includes(color.value) && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-3 h-3 bg-white rounded-full shadow-sm"></div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Warm Colors */}
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">الألوان الدافئة</h4>
                <div className="grid grid-cols-5 gap-2">
                  {commonColors.filter(color => color.category === "warm").map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => addColor(color.value)}
                      disabled={colors.includes(color.value)}
                      className={cn(
                        "relative h-10 w-10 rounded-full border-2 transition-all hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed",
                        colors.includes(color.value)
                          ? "border-primary ring-2 ring-primary/20"
                          : "border-gray-300 hover:border-gray-400"
                      )}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    >
                      {colors.includes(color.value) && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-3 h-3 bg-white rounded-full shadow-sm"></div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cool Colors */}
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">الألوان الباردة</h4>
                <div className="grid grid-cols-5 gap-2">
                  {commonColors.filter(color => color.category === "cool").map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => addColor(color.value)}
                      disabled={colors.includes(color.value)}
                      className={cn(
                        "relative h-10 w-10 rounded-full border-2 transition-all hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed",
                        colors.includes(color.value)
                          ? "border-primary ring-2 ring-primary/20"
                          : "border-gray-300 hover:border-gray-400"
                      )}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    >
                      {colors.includes(color.value) && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-3 h-3 bg-white rounded-full shadow-sm"></div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fashion Colors */}
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">ألوان الموضة</h4>
                <div className="grid grid-cols-5 gap-2">
                  {commonColors.filter(color => color.category === "fashion").map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => addColor(color.value)}
                      disabled={colors.includes(color.value)}
                      className={cn(
                        "relative h-10 w-10 rounded-full border-2 transition-all hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed",
                        colors.includes(color.value)
                          ? "border-primary ring-2 ring-primary/20"
                          : "border-gray-300 hover:border-gray-400"
                      )}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    >
                      {colors.includes(color.value) && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-3 h-3 bg-white rounded-full shadow-sm"></div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Selected Colors Display */}
            {colors.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  الألوان المختارة ({colors.length})
                </h4>
                <div className="flex flex-wrap gap-3 p-3 bg-muted/30 rounded-lg border">
                  {colors.map((color, index) => {
                    const colorInfo = getColorByName(color);
                    return (
                      <div
                        key={index}
                        className="flex items-center gap-2 bg-background rounded-full px-3 py-2 border shadow-sm"
                      >
                        <div
                          className="h-6 w-6 rounded-full border-2 border-gray-300"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-sm font-medium">{colorInfo.name}</span>
                        <button
                          type="button"
                          onClick={() => removeColor(color)}
                          className="ml-1 p-1 rounded-full hover:bg-destructive hover:text-destructive-foreground transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quick Color Picker */}
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                اختيار سريع للألوان الشائعة
              </h4>
              <div className="flex flex-wrap gap-2">
                {commonColors.slice(0, 12).map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => addColor(color.value)}
                    disabled={colors.includes(color.value)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-full border text-sm transition-all hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed",
                      colors.includes(color.value)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background hover:border-primary/50"
                    )}
                  >
                    <div
                      className="h-4 w-4 rounded-full border"
                      style={{ backgroundColor: color.value }}
                    />
                    {color.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* sizes section */}
        {/* <div>
        <label className="text-sm font-medium">الأحجام *</label>
        <div className="space-y-2">
          <Select onValueChange={addOldSize}>
            <SelectTrigger className="w-full shrink-0">
              <SelectValue placeholder="اختر حجمًا" />
            </SelectTrigger>
            <SelectContent position="popper" sideOffset={4}>
              {commonSizes.map((size) => (
                <SelectItem key={size} value={size}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex flex-wrap gap-2 mt-2">
            {sizes.map((size, index) => (
              <div
                key={index}
                className="relative inline-flex items-center rounded-md border bg-background px-3 py-1"
              >
                {size}
                <button
                  type="button"
                  onClick={() => removeOldSize(size)}
                  className="ml-2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div> */}

        <div>
          <label className="text-sm font-medium">الصور</label>
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                type="url"
                id="image-url"
                name="imageUrl"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="أدخل رابط الصورة"
                className="flex-1"
              />
              <Button
                type="button"
                onClick={addImageUrl}
                variant="outline"
                className="flex gap-1 items-center"
              >
                <PlusCircle className="h-4 w-4" />
                إضافة
              </Button>
            </div>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {formData.images.map((url, index) => (
                <div key={index} className="relative">
                  <img
                    src={url}
                    alt={`Product ${index + 1}`}
                    className="aspect-square rounded-lg object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(url)}
                    className="absolute -right-1 -top-1 rounded-full bg-destructive p-1 text-destructive-foreground hover:bg-destructive/90"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="space-y-2">
            <label className="text-sm font-medium">الوصف *</label>
            <div
              className="prose prose-sm max-w-none dark:prose-invert
            prose-headings:font-semibold
            prose-p:leading-relaxed
            prose-ul:list-disc prose-ul:pl-4
            prose-ol:list-decimal prose-ol:pl-4
            prose-li:my-1
            prose-strong:text-foreground
            prose-em:text-foreground/80
            prose-ul:marker:text-foreground
            prose-ol:marker:text-foreground"
            >
              <div className="quill-container">
                <ReactQuill
                  theme="snow"
                  value={formData.description}
                  onChange={(value) =>
                    setFormData({ ...formData, description: value })
                  }
                  modules={{
                    toolbar: [
                      [{ header: [1, 2, 3, false] }],
                      ["bold", "italic", "underline", "strike"],
                      [{ list: "ordered" }, { list: "bullet" }],
                      ["clean"],
                    ],
                  }}
                  className="rtl-quill"
                  style={{
                    height: "auto",
                    minHeight: "200px",
                  }}
                  formats={[
                    "header",
                    "bold",
                    "italic",
                    "underline",
                    "strike",
                    "list",
                    "bullet",
                  ]}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Archive Status */}
        <div className="rounded-md border p-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="archive-status"
              checked={formData.isArchived}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, isArchived: checked })
              }
            />
            <Label htmlFor="archive-status" className="font-medium">
              أرشفة المنتج
            </Label>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            المنتجات المؤرشفة لن تكون مرئية للعملاء
          </p>
        </div>

        {/* Wholesale Information */}
        <div className="rounded-md border p-4 space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="wholesale-info"
              checked={showWholesaleInfo}
              onCheckedChange={(checked) => {
                setShowWholesaleInfo(checked);
                if (!checked) {
                  setFormData({
                    ...formData,
                    wholesaleInfo: undefined,
                  });
                } else if (!formData.wholesaleInfo) {
                  setFormData({
                    ...formData,
                    wholesaleInfo: {
                      supplierName: "",
                      supplierPhone: "",
                      supplierEmail: "",
                      supplierLocation: "",
                      purchasePrice: 0,
                      purchasedQuantity: 0,
                      quantity: 0,
                      notes: "",
                    },
                  });
                }
              }}
            />
            <Label htmlFor="wholesale-info" className="font-medium">
              معلومات البائع
            </Label>
          </div>

          {showWholesaleInfo && formData.wholesaleInfo && (
            <div className="grid gap-4 sm:grid-cols-2 pt-2">
              <div>
                <label className="text-sm font-medium">اسم البائع *</label>
                <Input
                  id="wholesale-supplier-name"
                  name="wholesaleSupplierName"
                  value={formData.wholesaleInfo.supplierName}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      wholesaleInfo: {
                        ...formData.wholesaleInfo!,
                        supplierName: e.target.value,
                      },
                    })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">رقم هاتف البائع *</label>
                <Input
                  id="wholesale-supplier-phone"
                  name="wholesaleSupplierPhone"
                  value={formData.wholesaleInfo.supplierPhone}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      wholesaleInfo: {
                        ...formData.wholesaleInfo!,
                        supplierPhone: e.target.value,
                      },
                    })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">موقع البائع *</label>
                <Input
                  value={formData.wholesaleInfo.supplierLocation}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      wholesaleInfo: {
                        ...formData.wholesaleInfo!,
                        supplierLocation: e.target.value,
                      },
                    })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">
                  بريد البائع الإلكتروني *
                </label>
                <Input
                  type="text"
                  value={formData.wholesaleInfo.supplierEmail}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      wholesaleInfo: {
                        ...formData.wholesaleInfo!,
                        supplierEmail: e.target.value,
                      },
                    })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">سعر الشراء *</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.wholesaleInfo.purchasePrice}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      wholesaleInfo: {
                        ...formData.wholesaleInfo!,
                        purchasePrice: Number(e.target.value),
                      },
                    })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">
                  الكمية التي تم شراؤها *
                </label>
                <Input
                  type="number"
                  min="0"
                  value={formData.wholesaleInfo?.purchasedQuantity || 0}
                  onChange={(e) => {
                    const purchasedQuantity = parseInt(e.target.value) || 0;
                    const currentQuantity = formData.wholesaleInfo?.quantity || 0;
                    // عند إضافة منتج جديد، نعيّن الكمية المتاحة = الكمية المشتراة
                    // إذا كانت الكمية المتاحة = 0 أو لم يتم تعيينها، نعيّنها = الكمية المشتراة
                    const newQuantity = currentQuantity === 0 ? purchasedQuantity : currentQuantity;
                    setFormData({
                      ...formData,
                      wholesaleInfo: {
                        ...formData.wholesaleInfo!,
                        purchasedQuantity: purchasedQuantity,
                        quantity: newQuantity,
                      },
                    });
                  }}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  الكمية الإجمالية التي تم شراؤها من المورد
                </p>
              </div>
              <div>
                <label className="text-sm font-medium">
                  الكمية المتوفرة حالياً *
                </label>
                <Input
                  type="number"
                  min="0"
                  value={formData.wholesaleInfo?.quantity || 0}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      wholesaleInfo: {
                        ...formData.wholesaleInfo!,
                        quantity: parseInt(e.target.value) || 0,
                      },
                    })
                  }
                />
                <p className="text-sm text-muted-foreground mt-1">
                  الكمية المتوفرة حالياً في المخزن (يتم خصمها تلقائياً عند البيع)
                </p>
                {formData.wholesaleInfo && formData.wholesaleInfo.purchasedQuantity > 0 && (
                  <p className="text-xs text-blue-600 mt-1">
                    المتبقي من الشراء: {formData.wholesaleInfo.purchasedQuantity - (formData.wholesaleInfo.quantity || 0)} قطعة
                  </p>
                )}
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium">ملاحظات</label>
                <Textarea
                  value={formData.wholesaleInfo.notes || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      wholesaleInfo: {
                        ...formData.wholesaleInfo!,
                        notes: e.target.value,
                      },
                    })
                  }
                />
              </div>
            </div>
          )}
        </div>

        {/* Expiration Date Section */}
        <div className="rounded-md border p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">تاريخ انتهاء الصلاحية</h3>
            <Switch
              id="expiration-date"
              checked={!!formData.expirationDate}
              onCheckedChange={(checked) => {
                if (checked) {
                  // Set default expiration date to 30 days from now if not set
                  const defaultDate = new Date();
                  defaultDate.setDate(defaultDate.getDate() + 30);
                  setFormData({
                    ...formData,
                    expirationDate: defaultDate.toISOString(),
                  });
                } else {
                  setFormData({ ...formData, expirationDate: undefined });
                }
              }}
            />
          </div>
          {formData.expirationDate && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.expirationDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.expirationDate ? (
                    format(new Date(formData.expirationDate), "PPP", {
                      locale: ar,
                    })
                  ) : (
                    <span>اختر تاريخ انتهاء الصلاحية</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={
                    formData.expirationDate
                      ? new Date(formData.expirationDate)
                      : undefined
                  }
                  onSelect={(date) => {
                    if (date) {
                      setFormData({
                        ...formData,
                        expirationDate: date.toISOString(),
                      });
                    }
                  }}
                  initialFocus
                  locale={ar}
                  disabled={(date) => date < new Date()}
                />
              </PopoverContent>
            </Popover>
          )}
          <p className="text-sm text-muted-foreground mt-1">
            عند انتهاء الصلاحية، سيتم أرشفة المنتج تلقائياً ولن يظهر للعملاء
          </p>
        </div>

        {/* Product Sizes Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-lg font-medium">أحجام المنتج (اختياري)</h3>
              <p className="text-sm text-muted-foreground">
                إضافة أحجام مختلفة للمنتج مع أسعارها المحددة
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addSize}
              className="flex items-center gap-2"
            >
              <PlusCircle className="h-4 w-4" />
              إضافة حجم
            </Button>
          </div>

          {formData.sizes.length > 0 && (
            <div className="space-y-3">
              {formData.sizes.map((size, index) => (
                <div key={size.id} className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 border rounded-lg">
                  <div>
                    <label className="text-sm font-medium">اسم الحجم *</label>
                    <Input
                      placeholder="مثال: 16GB RAM"
                      value={size.label}
                      onChange={(e) => updateSize(index, 'label', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">
                      {index === 0 ? "السعر الأساسي" : "سعر إضافي (+/-)"}
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={index === 0 ? 0 : size.extraPrice}
                      disabled={index === 0}
                      onChange={(e) => updateSize(index, 'extraPrice', e.target.value)}
                      className={index === 0 ? "bg-muted" : ""}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">السعر النهائي</label>
                    <Input
                      value={size.price}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removeSize(index)}
                      className="w-full"
                    >
                      <X className="h-4 w-4 mr-2" />
                      حذف
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Product Addons Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-lg font-medium">الإضافات الاختيارية</h3>
              <p className="text-sm text-muted-foreground">
                إضافة خصائص اختيارية يمكن للعميل اختيارها
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addAddon}
              className="flex items-center gap-2"
            >
              <PlusCircle className="h-4 w-4" />
              إضافة إضافة
            </Button>
          </div>

          {formData.addons.length > 0 && (
            <div className="space-y-3">
              {formData.addons.map((addon, index) => (
                <div key={addon.id} className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 border rounded-lg">
                  <div>
                    <label className="text-sm font-medium">اسم الإضافة *</label>
                    <Input
                      placeholder="مثال: SSD 1TB"
                      value={addon.label}
                      onChange={(e) => updateAddon(index, 'label', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">السعر الإضافي (ج.م) *</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={addon.price_delta}
                      onChange={(e) => updateAddon(index, 'price_delta', e.target.value)}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removeAddon(index)}
                      className="w-full"
                    >
                      <X className="h-4 w-4 mr-2" />
                      حذف
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Base Cost Section */}
        <div className="space-y-4">
          <div className="space-y-1">
            <h3 className="text-lg font-medium">التكلفة الأساسية (اختياري)</h3>
            <p className="text-sm text-muted-foreground">
              التكلفة الأساسية للمنتج لحساب الأرباح
            </p>
          </div>
          <div>
            <label className="text-sm font-medium">التكلفة الأساسية (ج.م)</label>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={formData.baseCost}
              onChange={(e) => setFormData({ ...formData, baseCost: e.target.value })}
            />
          </div>
        </div>

        {/* Processor Specifications Section */}
        <div className="rounded-md border p-4 space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="processor-info"
              checked={showProcessorInfo}
              onCheckedChange={(checked) => {
                setShowProcessorInfo(checked);
                if (!checked) {
                  setFormData({
                    ...formData,
                    processor: {
                      name: "",
                      cacheMemory: "",
                      baseClockSpeed: "",
                      maxTurboSpeed: "",
                      cores: "",
                      threads: "",
                      integratedGraphics: "",
                    },
                  });
                } else if (!formData.processor) {
                  setFormData({
                    ...formData,
                    processor: {
                      name: "",
                      cacheMemory: "",
                      baseClockSpeed: "",
                      maxTurboSpeed: "",
                      cores: "",
                      threads: "",
                      integratedGraphics: "",
                    },
                  });
                }
              }}
            />
            <Label htmlFor="processor-info" className="font-medium">
              مواصفات المعالج
            </Label>
          </div>

          {showProcessorInfo && formData.processor && (
            <div className="grid gap-4 sm:grid-cols-2 pt-2">
              <div>
                <label className="text-sm font-medium">نوع المعالج *</label>
                <Select
                  value={formData.processor.processorBrand || ""}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      processor: {
                        ...formData.processor,
                        processorBrand: value as "Intel" | "AMD" | "Other",
                        processorSeries: "", // Reset series when brand changes
                        processorSeriesSelect: "",
                        customProcessorSeries: "",
                      },
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر نوع المعالج" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Intel">Intel</SelectItem>
                    <SelectItem value="AMD">AMD</SelectItem>
                    <SelectItem value="Other">Other (قيمة مخصصة)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">جيل المعالج</label>
                <Input
                  value={formData.processor.processorGeneration}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      processor: {
                        ...formData.processor,
                        processorGeneration: e.target.value,
                      },
                    })
                  }
                  placeholder="مثال: الجيل السابع، 7th Gen، الجيل الثاني عشر"
                  maxLength={50}
                />
              </div>

              {formData.processor.processorBrand && (
                <div>
                  <label className="text-sm font-medium">فئة المعالج *</label>
                  <Select
                    value={formData.processor.processorSeriesSelect || ""}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        processor: {
                          ...formData.processor,
                          processorSeriesSelect: value,
                          processorSeries: value === "custom" ? formData.processor.customProcessorSeries : value,
                          customProcessorSeries: value === "custom" ? formData.processor.customProcessorSeries : "",
                        },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر فئة المعالج" />
                    </SelectTrigger>
                    <SelectContent>
                      {formData.processor.processorBrand === "Intel" && (
                        <>
                          <SelectItem value="Intel Core i3">Intel Core i3</SelectItem>
                          <SelectItem value="Intel Core i5">Intel Core i5</SelectItem>
                          <SelectItem value="Intel Core i7">Intel Core i7</SelectItem>
                          <SelectItem value="Intel Core i9">Intel Core i9</SelectItem>
                          <SelectItem value="Intel Ultra 5">Intel Ultra 5</SelectItem>
                          <SelectItem value="custom">قيمة مخصصة</SelectItem>
                        </>
                      )}
                      {formData.processor.processorBrand === "AMD" && (
                        <>
                          <SelectItem value="AMD Ryzen 3">AMD Ryzen 3</SelectItem>
                          <SelectItem value="AMD Ryzen 5">AMD Ryzen 5</SelectItem>
                          <SelectItem value="AMD Ryzen 7">AMD Ryzen 7</SelectItem>
                          <SelectItem value="AMD Ryzen 9">AMD Ryzen 9</SelectItem>
                          <SelectItem value="custom">قيمة مخصصة</SelectItem>
                        </>
                      )}
                      {formData.processor.processorBrand === "Other" && (
                        <SelectItem value="custom">قيمة مخصصة</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {formData.processor.processorSeriesSelect === "custom" && (
                    <Input
                      className="mt-2"
                      placeholder="أدخل فئة المعالج المخصصة"
                      value={formData.processor.customProcessorSeries}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          processor: {
                            ...formData.processor,
                            customProcessorSeries: e.target.value,
                            processorSeries: e.target.value,
                          },
                        })
                      }
                    />
                  )}
                </div>
              )}

              <div>
                <label className="text-sm font-medium">اسم المعالج</label>
                <Input
                  value={formData.processor.name}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      processor: {
                        ...formData.processor,
                        name: e.target.value,
                      },
                    })
                  }
                  placeholder="مثال: Intel Core i7-12700K"
                  maxLength={100}
                />
              </div>

              <div>
                <label className="text-sm font-medium">ذاكرة التخزين المؤقت</label>
                <Select
                  value={formData.processor.cacheMemorySelect}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      processor: {
                        ...formData.processor,
                        cacheMemorySelect: value,
                        // Clear custom value when switching away from custom
                        customCacheMemory: value === 'custom' ? formData.processor.customCacheMemory : '',
                      },
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر ذاكرة التخزين المؤقت" />
                  </SelectTrigger>
                  <SelectContent>
                    {cacheMemoryOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">قيمة مخصصة</SelectItem>
                  </SelectContent>
                </Select>
                {formData.processor.cacheMemorySelect === "custom" && (
                  <Input
                    className="mt-2"
                    placeholder="أدخل القيمة المخصصة"
                    value={formData.processor.customCacheMemory}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        processor: {
                          ...formData.processor,
                          customCacheMemory: e.target.value,
                        },
                      })
                    }
                  />
                )}
              </div>

              <div>
                <label className="text-sm font-medium">سرعة المعالج الأساسية (GHz)</label>
                <Input
                  type="number"
                  min="1.0"
                  max="5.0"
                  step="0.01"
                  value={formData.processor.baseClockSpeed}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      processor: {
                        ...formData.processor,
                        baseClockSpeed: e.target.value,
                      },
                    })
                  }
                  placeholder="مثال: 3.60"
                />
              </div>

              <div>
                <label className="text-sm font-medium">أقصى سرعة تيربو (GHz)</label>
                <Input
                  type="number"
                  min="1.0"
                  max="6.0"
                  step="0.01"
                  value={formData.processor.maxTurboSpeed}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      processor: {
                        ...formData.processor,
                        maxTurboSpeed: e.target.value,
                      },
                    })
                  }
                  placeholder="مثال: 4.90"
                />
              </div>

              <div>
                <label className="text-sm font-medium">عدد النوى</label>
                <Input
                  type="number"
                  min="2"
                  max="64"
                  value={formData.processor.cores}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      processor: {
                        ...formData.processor,
                        cores: e.target.value,
                      },
                    })
                  }
                  placeholder="مثال: 8"
                />
              </div>

              <div>
                <label className="text-sm font-medium">عدد الخيوط</label>
                <Input
                  type="number"
                  min="2"
                  max="128"
                  value={formData.processor.threads}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      processor: {
                        ...formData.processor,
                        threads: e.target.value,
                      },
                    })
                  }
                  placeholder="مثال: 16"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-sm font-medium">كرت الشاشة الداخلي المدمج في المعالج</label>
                <Select
                  value={formData.processor.integratedGpuSelect || ""}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      processor: {
                        ...formData.processor,
                        integratedGpuSelect: value,
                        integratedGpu: value === "custom" ? formData.processor.customIntegratedGpu : value,
                        customIntegratedGpu: value === "custom" ? formData.processor.customIntegratedGpu : "",
                      },
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر كرت الشاشة الداخلي" />
                  </SelectTrigger>
                  <SelectContent>
                    {formData.processor.processorBrand === "Intel" && (
                      <>
                        <SelectItem value="Intel UHD Graphics">Intel UHD Graphics</SelectItem>
                        <SelectItem value="Intel Iris Xe Graphics">Intel Iris Xe Graphics</SelectItem>
                        <SelectItem value="custom">قيمة مخصصة</SelectItem>
                      </>
                    )}
                    {formData.processor.processorBrand === "AMD" && (
                      <>
                        <SelectItem value="AMD Radeon Integrated">AMD Radeon Integrated</SelectItem>
                        <SelectItem value="custom">قيمة مخصصة</SelectItem>
                      </>
                    )}
                    {(!formData.processor.processorBrand || formData.processor.processorBrand === "Other") && (
                      <>
                        <SelectItem value="Intel UHD Graphics">Intel UHD Graphics</SelectItem>
                        <SelectItem value="Intel Iris Xe Graphics">Intel Iris Xe Graphics</SelectItem>
                        <SelectItem value="AMD Radeon Integrated">AMD Radeon Integrated</SelectItem>
                        <SelectItem value="custom">قيمة مخصصة</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
                {formData.processor.integratedGpuSelect === "custom" && (
                  <Input
                    className="mt-2"
                    placeholder="أدخل كرت الشاشة المخصص"
                    value={formData.processor.customIntegratedGpu}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        processor: {
                          ...formData.processor,
                          customIntegratedGpu: e.target.value,
                          integratedGpu: e.target.value,
                        },
                      })
                    }
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Dedicated Graphics Card Section */}
        <div className="rounded-md border p-4 space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="dedicated-graphics-info"
              checked={showDedicatedGraphicsInfo}
              onCheckedChange={(checked) => {
                setShowDedicatedGraphicsInfo(checked);
                if (!checked) {
                  setFormData({
                    ...formData,
                    dedicatedGraphics: {
                      hasDedicatedGraphics: false,
                      nameSelect: "",
                      customName: "",
                      name: "",
                      manufacturer: "",
                      vram: "",
                      memoryType: "",
                      memorySpeed: "",
                      memoryBusWidth: "",
                      baseClock: "",
                      boostClock: "",
                      powerConsumption: "",
                      powerConnectors: [],
                      availablePorts: [],
                      gamingTechnologies: [],
                    },
                  });
                } else if (!formData.dedicatedGraphics) {
                  setFormData({
                    ...formData,
                    dedicatedGraphics: {
                      hasDedicatedGraphics: false,
                      nameSelect: "",
                      customName: "",
                      name: "",
                      manufacturer: "",
                      vram: "",
                      memoryType: "",
                      memorySpeed: "",
                      memoryBusWidth: "",
                      baseClock: "",
                      boostClock: "",
                      powerConsumption: "",
                      powerConnectors: [],
                      availablePorts: [],
                      gamingTechnologies: [],
                    },
                  });
                }
              }}
            />
            <Label htmlFor="dedicated-graphics-info" className="font-medium">
              كرت الشاشة الخارجي
            </Label>
          </div>

          {showDedicatedGraphicsInfo && formData.dedicatedGraphics && (
            <div className="space-y-6 pt-2">
              {/* Has Dedicated Graphics Toggle */}
              <div className="flex items-center space-x-2">
                <Switch
                  id="has-dedicated-graphics"
                  checked={formData.dedicatedGraphics.hasDedicatedGraphics}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      dedicatedGraphics: {
                        ...formData.dedicatedGraphics,
                        hasDedicatedGraphics: checked,
                        dedicatedGpuBrand: checked ? formData.dedicatedGraphics.dedicatedGpuBrand : undefined,
                        dedicatedGpuModel: checked ? formData.dedicatedGraphics.dedicatedGpuModel : "",
                      },
                    })
                  }
                />
                <Label htmlFor="has-dedicated-graphics" className="font-medium">
                  يوجد كرت شاشة خارجي
                </Label>
              </div>

              {formData.dedicatedGraphics.hasDedicatedGraphics && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium">نوع كرت الشاشة *</label>
                    <Select
                      value={formData.dedicatedGraphics.dedicatedGpuBrand || ""}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          dedicatedGraphics: {
                            ...formData.dedicatedGraphics,
                            dedicatedGpuBrand: value as "NVIDIA" | "AMD" | "Intel" | "Custom",
                            dedicatedGpuModel: value === "Custom" ? formData.dedicatedGraphics.dedicatedGpuModel : "",
                          },
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر نوع كرت الشاشة" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NVIDIA">NVIDIA</SelectItem>
                        <SelectItem value="AMD">AMD</SelectItem>
                        <SelectItem value="Intel">Intel</SelectItem>
                        <SelectItem value="Custom">قيمة مخصصة</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">موديل كرت الشاشة *</label>
                    <Input
                      value={formData.dedicatedGraphics.dedicatedGpuModel}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          dedicatedGraphics: {
                            ...formData.dedicatedGraphics,
                            dedicatedGpuModel: e.target.value,
                          },
                        })
                      }
                      placeholder="مثال: RTX 3050, GTX 1650, Radeon RX 6600"
                      maxLength={100}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">اسم/موديل كرت الشاشة (قديم)</label>
                    <Select
                      value={formData.dedicatedGraphics.nameSelect}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          dedicatedGraphics: {
                            ...formData.dedicatedGraphics,
                            nameSelect: value,
                            // if switching away from custom, clear customName
                            customName: value === 'custom' ? formData.dedicatedGraphics.customName : '',
                          },
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر كرت الشاشة" />
                      </SelectTrigger>
                      <SelectContent>
                        {graphicsCardOptions.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                        <SelectItem value="custom">موديل مخصص</SelectItem>
                      </SelectContent>
                    </Select>
                    {formData.dedicatedGraphics.nameSelect === "custom" && (
                      <Input
                        className="mt-2"
                        placeholder="أدخل اسم كرت الشاشة المخصص"
                        value={formData.dedicatedGraphics.customName}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            dedicatedGraphics: {
                              ...formData.dedicatedGraphics,
                              customName: e.target.value,
                            },
                          })
                        }
                      />
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium">الشركة المصنعة *</label>
                    <Select
                      value={formData.dedicatedGraphics.manufacturer}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          dedicatedGraphics: {
                            ...formData.dedicatedGraphics,
                            manufacturer: value,
                          },
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الشركة المصنعة" />
                      </SelectTrigger>
                      <SelectContent>
                        {graphicsManufacturers.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formData.dedicatedGraphics.manufacturer === "أخرى" && (
                      <Input
                        className="mt-2"
                        placeholder="أدخل اسم الشركة المصنعة"
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            dedicatedGraphics: {
                              ...formData.dedicatedGraphics,
                              manufacturer: e.target.value,
                            },
                          })
                        }
                      />
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium">ذاكرة كرت الشاشة (GB)</label>
                    <Select
                      value={formData.dedicatedGraphics.vramSelect}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          dedicatedGraphics: {
                            ...formData.dedicatedGraphics,
                            vramSelect: value,
                            // Clear custom value when switching away from custom
                            customVram: value === 'custom' ? formData.dedicatedGraphics.customVram : '',
                          },
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر حجم الذاكرة" />
                      </SelectTrigger>
                      <SelectContent>
                        {vramOptions.map((option) => (
                          <SelectItem key={option} value={option.toString()}>
                            {option} GB
                          </SelectItem>
                        ))}
                        <SelectItem value="custom">قيمة مخصصة</SelectItem>
                      </SelectContent>
                    </Select>
                    {formData.dedicatedGraphics.vramSelect === "custom" && (
                      <Input
                        className="mt-2"
                        type="number"
                        min="1"
                        max="128"
                        placeholder="أدخل حجم الذاكرة (GB)"
                        value={formData.dedicatedGraphics.customVram}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            dedicatedGraphics: {
                              ...formData.dedicatedGraphics,
                              customVram: e.target.value,
                            },
                          })
                        }
                      />
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium">نوع الذاكرة</label>
                    <Select
                      value={formData.dedicatedGraphics.memoryType}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          dedicatedGraphics: {
                            ...formData.dedicatedGraphics,
                            memoryType: value,
                          },
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر نوع الذاكرة" />
                      </SelectTrigger>
                      <SelectContent>
                        {memoryTypeOptions.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">سرعة الذاكرة (MHz)</label>
                    <Input
                      type="number"
                      min="1000"
                      max="25000"
                      value={formData.dedicatedGraphics.memorySpeed}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          dedicatedGraphics: {
                            ...formData.dedicatedGraphics,
                            memorySpeed: e.target.value,
                          },
                        })
                      }
                      placeholder="مثال: 19500"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">عرض ناقل الذاكرة (bit)</label>
                    <Select
                      value={formData.dedicatedGraphics.memoryBusWidthSelect}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          dedicatedGraphics: {
                            ...formData.dedicatedGraphics,
                            memoryBusWidthSelect: value,
                            // Clear custom value when switching away from custom
                            customMemoryBusWidth: value === 'custom' ? formData.dedicatedGraphics.customMemoryBusWidth : '',
                          },
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر عرض الناقل" />
                      </SelectTrigger>
                      <SelectContent>
                        {memoryBusWidthOptions.map((option) => (
                          <SelectItem key={option} value={option.toString()}>
                            {option} bit
                          </SelectItem>
                        ))}
                        <SelectItem value="custom">قيمة مخصصة</SelectItem>
                      </SelectContent>
                    </Select>
                    {formData.dedicatedGraphics.memoryBusWidthSelect === "custom" && (
                      <Input
                        className="mt-2"
                        type="number"
                        min="64"
                        max="1024"
                        placeholder="أدخل عرض الناقل (bit)"
                        value={formData.dedicatedGraphics.customMemoryBusWidth}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            dedicatedGraphics: {
                              ...formData.dedicatedGraphics,
                              customMemoryBusWidth: e.target.value,
                            },
                          })
                        }
                      />
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium">التردد الأساسي (MHz)</label>
                    <Input
                      type="number"
                      min="300"
                      max="3000"
                      value={formData.dedicatedGraphics.baseClock}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          dedicatedGraphics: {
                            ...formData.dedicatedGraphics,
                            baseClock: e.target.value,
                          },
                        })
                      }
                      placeholder="مثال: 1500"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">تردد التعزيز (MHz)</label>
                    <Input
                      type="number"
                      min="500"
                      max="4000"
                      value={formData.dedicatedGraphics.boostClock}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          dedicatedGraphics: {
                            ...formData.dedicatedGraphics,
                            boostClock: e.target.value,
                          },
                        })
                      }
                      placeholder="مثال: 1800"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">استهلاك الطاقة (W)</label>
                    <Input
                      type="number"
                      min="30"
                      max="800"
                      value={formData.dedicatedGraphics.powerConsumption}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          dedicatedGraphics: {
                            ...formData.dedicatedGraphics,
                            powerConsumption: e.target.value,
                          },
                        })
                      }
                      placeholder="مثال: 300"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-sm font-medium">موصلات الطاقة المطلوبة</label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {powerConnectorOptions.map((option) => (
                        <div key={option} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`power-${option}`}
                            checked={formData.dedicatedGraphics.powerConnectors.includes(option)}
                            onChange={(e) => {
                              const newConnectors = e.target.checked
                                ? [...formData.dedicatedGraphics.powerConnectors, option]
                                : formData.dedicatedGraphics.powerConnectors.filter(conn => conn !== option);
                              setFormData({
                                ...formData,
                                dedicatedGraphics: {
                                  ...formData.dedicatedGraphics,
                                  powerConnectors: newConnectors,
                                },
                              });
                            }}
                            className="rounded"
                          />
                          <label htmlFor={`power-${option}`} className="text-sm">
                            {option}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-sm font-medium">المنافذ المتوفرة</label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {availablePortsOptions.map((option) => (
                        <div key={option} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`port-${option}`}
                            checked={formData.dedicatedGraphics.availablePorts.includes(option)}
                            onChange={(e) => {
                              const newPorts = e.target.checked
                                ? [...formData.dedicatedGraphics.availablePorts, option]
                                : formData.dedicatedGraphics.availablePorts.filter(port => port !== option);
                              setFormData({
                                ...formData,
                                dedicatedGraphics: {
                                  ...formData.dedicatedGraphics,
                                  availablePorts: newPorts,
                                },
                              });
                            }}
                            className="rounded"
                          />
                          <label htmlFor={`port-${option}`} className="text-sm">
                            {option}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-sm font-medium">تقنيات الألعاب المدعومة</label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {gamingTechnologiesOptions.map((option) => (
                        <div key={option} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`tech-${option}`}
                            checked={formData.dedicatedGraphics.gamingTechnologies.includes(option)}
                            onChange={(e) => {
                              const newTechnologies = e.target.checked
                                ? [...formData.dedicatedGraphics.gamingTechnologies, option]
                                : formData.dedicatedGraphics.gamingTechnologies.filter(tech => tech !== option);
                              setFormData({
                                ...formData,
                                dedicatedGraphics: {
                                  ...formData.dedicatedGraphics,
                                  gamingTechnologies: newTechnologies,
                                },
                              });
                            }}
                            className="rounded"
                          />
                          <label htmlFor={`tech-${option}`} className="text-sm">
                            {option}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Display Specifications Section */}
        <div className="rounded-md border p-4 space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="display-info"
              checked={showDisplayInfo}
              onCheckedChange={(checked) => {
                setShowDisplayInfo(checked);
                if (!checked) {
                  setFormData({
                    ...formData,
                    display: {
                      sizeInches: "",
                      resolution: "",
                      panelType: "",
                      refreshRate: "",
                    },
                  });
                } else if (!formData.display) {
                  setFormData({
                    ...formData,
                    display: {
                      sizeInches: "",
                      resolution: "",
                      panelType: "",
                      refreshRate: "",
                    },
                  });
                }
              }}
            />
            <Label htmlFor="display-info" className="font-medium">
              مواصفات الشاشة
            </Label>
          </div>

          {showDisplayInfo && formData.display && (
            <div className="grid gap-4 sm:grid-cols-2 pt-2">
              <div>
                <label className="text-sm font-medium">حجم الشاشة (بوصة)</label>
                <Input
                  type="number"
                  min="10"
                  max="100"
                  step="0.1"
                  value={formData.display.sizeInches}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      display: {
                        ...formData.display,
                        sizeInches: e.target.value,
                      },
                    })
                  }
                  placeholder="مثال: 24"
                />
              </div>

              <div>
                <label className="text-sm font-medium">دقة العرض</label>
                <Input
                  value={formData.display.resolution}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      display: {
                        ...formData.display,
                        resolution: e.target.value,
                      },
                    })
                  }
                  placeholder="مثال: Full HD (1920x1080)"
                />
              </div>

              <div>
                <label className="text-sm font-medium">نوع اللوحة</label>
                <Input
                  value={formData.display.panelType}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      display: {
                        ...formData.display,
                        panelType: e.target.value,
                      },
                    })
                  }
                  placeholder="مثال: IPS"
                />
              </div>

              <div>
                <label className="text-sm font-medium">معدل التحديث (Hz)</label>
                <Input
                  type="number"
                  min="30"
                  max="360"
                  step="1"
                  value={formData.display.refreshRate}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      display: {
                        ...formData.display,
                        refreshRate: e.target.value,
                      },
                    })
                  }
                  placeholder="مثال: 144"
                />
              </div>
            </div>
          )}
        </div>

        <Button type="submit" className="w-full">
          إضافة المنتج
        </Button>
      </form>
    </>
  );
}
