import { useStore } from "@/store/useStore";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";

interface ActiveFilter {
  key: string;
  label: string;
  value: string | string[];
  removeHandler: () => void;
}

export function ActiveFilters() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const filters = useStore((state) => state.filters);
  const setFilters = useStore((state) => state.setFilters);

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
    if (filters.category) {
      activeFilters.push({
        key: "category",
        label: t("filters.category"),
        value: filters.category,
        removeHandler: () => {
          const newFilters = { ...filters, category: undefined, subcategory: undefined };
          setFilters(newFilters);
          navigate('/products');
        },
      });
    }

    // Subcategory filter
    if (filters.subcategory) {
      activeFilters.push({
        key: "subcategory",
        label: t("filters.subcategory"),
        value: filters.subcategory,
        removeHandler: () => {
          setFilters({ ...filters, subcategory: undefined });
        },
      });
    }

    // Brand filter
    if (filters.brand) {
      activeFilters.push({
        key: "brand",
        label: t("filters.brand"),
        value: filters.brand,
        removeHandler: () => {
          setFilters({ ...filters, brand: undefined });
        },
      });
    }

    // Color filter
    if (filters.color) {
      activeFilters.push({
        key: "color",
        label: t("filters.color"),
        value: filters.color,
        removeHandler: () => {
          setFilters({ ...filters, color: undefined });
        },
      });
    }

    // Size filter
    if (filters.size) {
      activeFilters.push({
        key: "size",
        label: t("filters.size"),
        value: filters.size,
        removeHandler: () => {
          setFilters({ ...filters, size: undefined });
        },
      });
    }

    // Processor Name filter
    if (filters.processorName) {
      activeFilters.push({
        key: "processorName",
        label: `${t("filters.processor")}: ${filters.processorName}`,
        value: filters.processorName,
        removeHandler: () => {
          setFilters({ ...filters, processorName: undefined });
        },
      });
    }

    // Processor Brand filter (array)
    if (filters.processorBrand && filters.processorBrand.length > 0) {
      filters.processorBrand.forEach((brand, index) => {
        activeFilters.push({
          key: `processorBrand-${index}`,
          label: `${t("filters.processor")} - ${t("filters.brand")}`,
          value: brand,
          removeHandler: () => {
            const newBrands = filters.processorBrand?.filter((b) => b !== brand);
            setFilters({
              ...filters,
              processorBrand: newBrands && newBrands.length > 0 ? newBrands : undefined,
            });
          },
        });
      });
    }

    // Processor Generation filter (array)
    if (filters.processorGeneration && filters.processorGeneration.length > 0) {
      filters.processorGeneration.forEach((gen, index) => {
        activeFilters.push({
          key: `processorGeneration-${index}`,
          label: `${t("filters.processor")} - ${t("filters.processorGeneration") || "الجيل"}`,
          value: gen,
          removeHandler: () => {
            const newGens = filters.processorGeneration?.filter((g) => g !== gen);
            setFilters({
              ...filters,
              processorGeneration: newGens && newGens.length > 0 ? newGens : undefined,
            });
          },
        });
      });
    }

    // Processor Series filter (array)
    if (filters.processorSeries && filters.processorSeries.length > 0) {
      filters.processorSeries.forEach((series, index) => {
        activeFilters.push({
          key: `processorSeries-${index}`,
          label: `${t("filters.processor")} - ${t("filters.processorSeries") || "السلسلة"}`,
          value: series,
          removeHandler: () => {
            const newSeries = filters.processorSeries?.filter((s) => s !== series);
            setFilters({
              ...filters,
              processorSeries: newSeries && newSeries.length > 0 ? newSeries : undefined,
            });
          },
        });
      });
    }

    // Integrated GPU filter (array)
    if (filters.integratedGpu && filters.integratedGpu.length > 0) {
      filters.integratedGpu.forEach((gpu, index) => {
        activeFilters.push({
          key: `integratedGpu-${index}`,
          label: `${t("filters.processor")} - ${t("filters.integratedGpu") || "معالج رسومي مدمج"}`,
          value: gpu,
          removeHandler: () => {
            const newGpus = filters.integratedGpu?.filter((g) => g !== gpu);
            setFilters({
              ...filters,
              integratedGpu: newGpus && newGpus.length > 0 ? newGpus : undefined,
            });
          },
        });
      });
    }

    // Dedicated Graphics Name filter
    if (filters.dedicatedGraphicsName) {
      activeFilters.push({
        key: "dedicatedGraphicsName",
        label: `${t("filters.dedicatedGraphics")}: ${filters.dedicatedGraphicsName}`,
        value: filters.dedicatedGraphicsName,
        removeHandler: () => {
          setFilters({ ...filters, dedicatedGraphicsName: undefined });
        },
      });
    }

    // Dedicated GPU Brand filter (array)
    if (filters.dedicatedGpuBrand && filters.dedicatedGpuBrand.length > 0) {
      filters.dedicatedGpuBrand.forEach((brand, index) => {
        activeFilters.push({
          key: `dedicatedGpuBrand-${index}`,
          label: `${t("filters.dedicatedGraphics")} - ${t("filters.brand")}`,
          value: brand,
          removeHandler: () => {
            const newBrands = filters.dedicatedGpuBrand?.filter((b) => b !== brand);
            setFilters({
              ...filters,
              dedicatedGpuBrand: newBrands && newBrands.length > 0 ? newBrands : undefined,
            });
          },
        });
      });
    }

    // Dedicated GPU Model filter (array)
    if (filters.dedicatedGpuModel && filters.dedicatedGpuModel.length > 0) {
      filters.dedicatedGpuModel.forEach((model, index) => {
        activeFilters.push({
          key: `dedicatedGpuModel-${index}`,
          label: `${t("filters.dedicatedGraphics")} - ${t("filters.model") || "الموديل"}`,
          value: model,
          removeHandler: () => {
            const newModels = filters.dedicatedGpuModel?.filter((m) => m !== model);
            setFilters({
              ...filters,
              dedicatedGpuModel: newModels && newModels.length > 0 ? newModels : undefined,
            });
          },
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
    if (filters.screenSize) {
      activeFilters.push({
        key: "screenSize",
        label: `${t("filters.screenSize")}: ${filters.screenSize}"`,
        value: filters.screenSize,
        removeHandler: () => {
          setFilters({ ...filters, screenSize: undefined });
        },
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
    <div className="mb-6">
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
              {typeof filter.value === "string" ? (
                <>
                  <span className="text-muted-foreground">{filter.label}:</span> {filter.value}
                </>
              ) : (
                filter.label
              )}
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
      </div>
    </div>
  );
}

