import { useStore } from "@/store/useStore";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { useMemo } from "react";
import { Filter } from "@/types/product";
import { Button } from "@/components/ui/button";

interface ActiveFilter {
  key: string;
  label: string;
  value: string;
  removeHandler: () => void;
}

export function ActiveFilters() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const filters = useStore((state) => state.filters);
  const setFilters = useStore((state) => state.setFilters);
  const products = useStore((state) => state.products) || [];

  // Calculate filtered products count - mirrored logic from Products.tsx
  const filteredProductsCount = useMemo(() => {
    return products.filter((product) => {
      // Exclude archived products
      if (product.isArchived) {
        return false;
      }

      // Search filter
      if (filters.search) {
        if (!product.name.toLowerCase().includes(filters.search.toLowerCase())) {
          return false;
        }
      }

      // Category filter (Array)
      if (filters.category && filters.category.length > 0) {
        if (!filters.category.includes(product.category)) return false;
      }

      // Subcategory filter (Array)
      if (filters.subcategory && filters.subcategory.length > 0) {
        if (!filters.subcategory.includes(product.subcategory || "")) return false;
      }

      // Brand filter (Array)
      if (filters.brand && filters.brand.length > 0) {
        if (!filters.brand.includes(product.brand)) return false;
      }

      // Color filter (Array check against Comma-Separated-Values in product)
      if (filters.color && filters.color.length > 0) {
        const productColors = product.color?.split(",").map(c => c.trim()) || [];
        if (!filters.color.some(c => productColors.includes(c))) return false;
      }

      // Size filter (Array)
      if (filters.size && filters.size.length > 0) {
        const productSizes = product.size?.split(",").map(s => s.trim()) || [];
        if (!filters.size.some(s => productSizes.includes(s))) return false;
      }

      // Processor Name filter (Array)
      if (filters.processorName && filters.processorName.length > 0) {
        if (!filters.processorName.includes(product.processor?.name || "")) return false;
      }

      // Processor Brand filter
      if (filters.processorBrand && filters.processorBrand.length > 0) {
        if (!filters.processorBrand.includes(product.processor?.processorBrand as any)) {
          return false;
        }
      }

      // Processor Generation filter
      if (filters.processorGeneration && filters.processorGeneration.length > 0) {
        if (!filters.processorGeneration.includes(product.processor?.processorGeneration || "")) {
          return false;
        }
      }

      // Processor Series filter
      if (filters.processorSeries && filters.processorSeries.length > 0) {
        if (!filters.processorSeries.includes(product.processor?.processorSeries || "")) {
          return false;
        }
      }

      // Integrated GPU filter
      if (filters.integratedGpu && filters.integratedGpu.length > 0) {
        if (!filters.integratedGpu.includes(product.processor?.integratedGpu || "")) {
          return false;
        }
      }

      // Dedicated Graphics Name filter (Array)
      if (filters.dedicatedGraphicsName && filters.dedicatedGraphicsName.length > 0) {
        if (!filters.dedicatedGraphicsName.includes(product.dedicatedGraphics?.name || "")) return false;
      }

      // Has Dedicated Graphics filter
      if (filters.hasDedicatedGraphics !== undefined) {
        if (!!product.dedicatedGraphics !== filters.hasDedicatedGraphics) {
          return false;
        }
      }

      // Screen Size filter (Array)
      if (filters.screenSize && filters.screenSize.length > 0) {
        const productScreenSize = product.display?.sizeInches !== undefined ? String(product.display.sizeInches) : "";
        if (!filters.screenSize.includes(productScreenSize)) return false;
      }

      // Dedicated GPU Brand filter
      if (filters.dedicatedGpuBrand && filters.dedicatedGpuBrand.length > 0) {
        if (!filters.dedicatedGpuBrand.includes(product.dedicatedGraphics?.dedicatedGpuBrand as any)) {
          return false;
        }
      }

      // Dedicated GPU Model filter
      if (filters.dedicatedGpuModel && filters.dedicatedGpuModel.length > 0) {
        if (!filters.dedicatedGpuModel.includes(product.dedicatedGraphics?.dedicatedGpuModel || "")) {
          return false;
        }
      }

      // Price range filters
      if (filters.minPrice !== undefined && product.price < filters.minPrice) {
        return false;
      }
      if (filters.maxPrice !== undefined && product.price > filters.maxPrice) {
        return false;
      }

      return true;
    }).length;
  }, [products, filters]);

  // Helper to remove item from array filter
  const removeFromArray = (key: keyof Filter, value: any) => {
    const currentValues = (filters[key] as any[]) || [];
    const newValues = currentValues.filter((v) => v !== value);
    setFilters({ ...filters, [key]: newValues.length > 0 ? newValues : undefined });
  };

  // Get all active filters
  const getActiveFilters = (): ActiveFilter[] => {
    const activeFilters: ActiveFilter[] = [];

    // Search filter
    if (filters.search) {
      activeFilters.push({
        key: "search",
        label: t("navigation.search"),
        value: filters.search,
        removeHandler: () => {
          setFilters({ ...filters, search: undefined });
        },
      });
    }

    // Category filter
    if (filters.category && filters.category.length > 0) {
      filters.category.forEach(cat => {
        activeFilters.push({
          key: `category-${cat}`,
          label: t("filters.category"),
          value: cat,
          removeHandler: () => removeFromArray('category', cat),
        });
      });
    }

    // Subcategory filter
    if (filters.subcategory && filters.subcategory.length > 0) {
      filters.subcategory.forEach(sub => {
        activeFilters.push({
          key: `subcat-${sub}`,
          label: t("filters.subcategory"),
          value: sub,
          removeHandler: () => removeFromArray('subcategory', sub),
        });
      });
    }

    // Brand filter
    if (filters.brand && filters.brand.length > 0) {
      filters.brand.forEach(b => {
        activeFilters.push({
          key: `brand-${b}`,
          label: t("filters.brand"),
          value: b,
          removeHandler: () => removeFromArray('brand', b),
        });
      });
    }

    // Color filter
    if (filters.color && filters.color.length > 0) {
      filters.color.forEach(c => {
        activeFilters.push({
          key: `color-${c}`,
          label: t("filters.color"),
          value: c,
          removeHandler: () => removeFromArray('color', c),
        });
      });
    }

    // Size filter
    if (filters.size && filters.size.length > 0) {
      filters.size.forEach(s => {
        activeFilters.push({
          key: `size-${s}`,
          label: t("filters.size"),
          value: s,
          removeHandler: () => removeFromArray('size', s),
        });
      });
    }

    // Processor Name filter
    if (filters.processorName && filters.processorName.length > 0) {
      filters.processorName.forEach(name => {
        activeFilters.push({
          key: `processorName-${name}`,
          label: t("filters.processor"),
          value: name,
          removeHandler: () => removeFromArray('processorName', name),
        });
      });
    }

    // Processor Brand filter
    if (filters.processorBrand && filters.processorBrand.length > 0) {
      filters.processorBrand.forEach((brand, index) => {
        activeFilters.push({
          key: `processorBrand-${index}`,
          label: `${t("filters.processor")} - ${t("filters.brand")}`,
          value: brand,
          removeHandler: () => removeFromArray('processorBrand', brand),
        });
      });
    }

    // Processor Generation filter
    if (filters.processorGeneration && filters.processorGeneration.length > 0) {
      filters.processorGeneration.forEach((gen, index) => {
        activeFilters.push({
          key: `processorGeneration-${index}`,
          label: `${t("filters.processor")} - ${t("filters.processorGeneration") || "الجيل"}`,
          value: gen,
          removeHandler: () => removeFromArray('processorGeneration', gen),
        });
      });
    }

    // Processor Series filter
    if (filters.processorSeries && filters.processorSeries.length > 0) {
      filters.processorSeries.forEach((series, index) => {
        activeFilters.push({
          key: `processorSeries-${index}`,
          label: `${t("filters.processor")} - ${t("filters.processorSeries") || "السلسلة"}`,
          value: series,
          removeHandler: () => removeFromArray('processorSeries', series),
        });
      });
    }

    // Integrated GPU filter
    if (filters.integratedGpu && filters.integratedGpu.length > 0) {
      filters.integratedGpu.forEach((gpu, index) => {
        activeFilters.push({
          key: `integratedGpu-${index}`,
          label: `${t("filters.processor")} - ${t("filters.integratedGpu") || "معالج رسومي مدمج"}`,
          value: gpu,
          removeHandler: () => removeFromArray('integratedGpu', gpu),
        });
      });
    }

    // Dedicated Graphics Name filter
    if (filters.dedicatedGraphicsName && filters.dedicatedGraphicsName.length > 0) {
      filters.dedicatedGraphicsName.forEach(name => {
        activeFilters.push({
          key: `gpuName-${name}`,
          label: t("filters.dedicatedGraphics"),
          value: name,
          removeHandler: () => removeFromArray('dedicatedGraphicsName', name),
        });
      });
    }

    // Dedicated GPU Brand filter
    if (filters.dedicatedGpuBrand && filters.dedicatedGpuBrand.length > 0) {
      filters.dedicatedGpuBrand.forEach((brand, index) => {
        activeFilters.push({
          key: `dedicatedGpuBrand-${index}`,
          label: `${t("filters.dedicatedGraphics")} - ${t("filters.brand")}`,
          value: brand,
          removeHandler: () => removeFromArray('dedicatedGpuBrand', brand),
        });
      });
    }

    // Dedicated GPU Model filter
    if (filters.dedicatedGpuModel && filters.dedicatedGpuModel.length > 0) {
      filters.dedicatedGpuModel.forEach((model, index) => {
        activeFilters.push({
          key: `dedicatedGpuModel-${index}`,
          label: `${t("filters.dedicatedGraphics")} - ${t("filters.model") || "الموديل"}`,
          value: model,
          removeHandler: () => removeFromArray('dedicatedGpuModel', model),
        });
      });
    }

    // Has Dedicated Graphics filter
    if (filters.hasDedicatedGraphics !== undefined) {
      activeFilters.push({
        key: "hasDedicatedGraphics",
        label: filters.hasDedicatedGraphics
          ? t("filters.onlyWithGPU")
          : `${t("filters.dedicatedGraphics")}: ${t("common.cancel")}`,
        value: filters.hasDedicatedGraphics ? "نعم" : "لا",
        removeHandler: () => {
          setFilters({ ...filters, hasDedicatedGraphics: undefined });
        },
      });
    }

    // Screen Size filter
    if (filters.screenSize && filters.screenSize.length > 0) {
      filters.screenSize.forEach(size => {
        activeFilters.push({
          key: `screen-${size}`,
          label: t("filters.screenSize"),
          value: `${size}"`,
          removeHandler: () => removeFromArray('screenSize', size),
        });
      });
    }

    // Price range filters
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      const priceLabel =
        filters.minPrice !== undefined && filters.maxPrice !== undefined
          ? `${filters.minPrice} - ${filters.maxPrice} ${t("common.currency")}`
          : filters.minPrice !== undefined
            ? `من ${filters.minPrice} ${t("common.currency")}`
            : `حتى ${filters.maxPrice} ${t("common.currency")}`;

      activeFilters.push({
        key: "priceRange",
        label: t("filters.priceRange"),
        value: priceLabel,
        removeHandler: () => {
          setFilters({ ...filters, minPrice: undefined, maxPrice: undefined });
        },
      });
    }

    return activeFilters;
  };

  const activeFilters = getActiveFilters();

  if (activeFilters.length === 0) {
    return null;
  }

  return (
    <div className="mb-6 space-y-3">
      {/* Products Count */}
      <div className="flex items-center justify-between pb-2 border-b">
        <span className="text-base font-semibold text-foreground">
          {t("products.title") || "المنتجات"}
        </span>
        <span className="text-sm font-medium text-primary bg-primary/10 px-3 py-1 rounded-full">
          {filteredProductsCount} {t("products.product") || "منتج"}
        </span>
      </div>

      {/* Active Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">
          {t("filters.filteredBy") || "تم التصفية حسب:"}
        </span>
        {activeFilters.map((filter) => (
          <div
            key={filter.key}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm border border-primary/20"
          >
            <span className="font-medium">
              <span className="text-muted-foreground ml-1">{filter.label}:</span>
              {filter.value}
            </span>
            <button
              onClick={filter.removeHandler}
              className="ml-1 hover:bg-primary/20 rounded-full p-0.5 transition-colors"
              aria-label={t("common.delete")}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {activeFilters.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => {
            setFilters({
              search: undefined,
              category: undefined,
              subcategory: undefined,
              brand: undefined,
              color: undefined,
              size: undefined,
              minPrice: undefined,
              maxPrice: undefined,
              supplier: undefined,
              processorName: undefined,
              processorBrand: undefined,
              processorGeneration: undefined,
              processorSeries: undefined,
              integratedGpu: undefined,
              dedicatedGraphicsName: undefined,
              dedicatedGpuBrand: undefined,
              dedicatedGpuModel: undefined,
              hasDedicatedGraphics: undefined,
              screenSize: undefined,
            });
            if (window.location.pathname.includes('/products/')) {
              navigate('/products');
            }
          }} className="text-xs text-muted-foreground hover:text-red-500">
            {t("filters.clearAll")}
          </Button>
        )}
      </div>
    </div>
  );
}
