import { useStore } from "@/store/useStore";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { useState, useMemo } from "react";
import { formatCurrency } from "@/utils/format";
import { Filter, Product } from "@/types/product";

export function ProductFilters() {
  const filters = useStore((state) => state.filters) || {};
  const setFilters = useStore((state) => state.setFilters);
  const products = useStore((state) => state.products) || [];
  const { t } = useTranslation();
  const navigate = useNavigate();

  // State to control accordion sections
  const [accordionValue, setAccordionValue] = useState<string[]>(["price", "sort", "category", "subcategory"]);

  const optionRow =
    "flex w-full items-center gap-2 rounded-lg border border-transparent px-2 py-1.5 hover:border-border/60 hover:bg-muted/60 transition-colors cursor-pointer text-sm";
  const optionSelected = "border-primary/60 bg-primary/5";

  // Helper to toggle array filters
  const toggleFilter = (key: keyof Filter, value: any) => {
    const currentValues = (filters[key] as any[]) || [];
    const isSelected = currentValues.includes(value);

    let newValues;
    if (isSelected) {
      newValues = currentValues.filter((v) => v !== value);
    } else {
      newValues = [...currentValues, value];
    }

    setFilters({
      ...filters,
      [key]: newValues.length > 0 ? newValues : undefined
    });
  };

  /**
   * Core filtering logic reused for count calculations.
   * excludesKey: The filter key to ignore (for calculating potential results within a group).
   */
  const getFilteredProducts = (excludeKey?: keyof Filter) => {
    return products.filter((product) => {
      // Exclude archived products
      if (product.isArchived) return false;

      // Search
      if (filters.search && excludeKey !== 'search') {
        if (!product.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
      }

      // Price
      if (excludeKey !== 'minPrice' && excludeKey !== 'maxPrice') { // grouping price
        if (filters.minPrice !== undefined && product.price < filters.minPrice) return false;
        if (filters.maxPrice !== undefined && product.price > filters.maxPrice) return false;
      }

      // Arrays Logic
      const checkArray = (key: keyof Filter, productVal: any) => {
        if (key === excludeKey) return true;
        const filterVals = filters[key] as any[];
        if (filterVals && filterVals.length > 0) {
          if (!filterVals.includes(productVal)) return false;
        }
        return true;
      };

      if (!checkArray('category', product.category)) return false;
      if (!checkArray('subcategory', product.subcategory || "")) return false;
      if (!checkArray('brand', product.brand)) return false;

      // Color - custom logic because product.color is comma separated string
      if (excludeKey !== 'color' && filters.color && filters.color.length > 0) {
        const productColors = product.color?.split(",").map(c => c.trim()) || [];
        if (!filters.color.some(c => productColors.includes(c))) return false;
      }

      // Size - custom logic
      if (excludeKey !== 'size' && filters.size && filters.size.length > 0) {
        const productSizes = product.size?.split(",").map(s => s.trim()) || [];
        if (!filters.size.some(s => productSizes.includes(s))) return false;
      }

      if (!checkArray('processorName', product.processor?.name || "")) return false;
      if (!checkArray('processorBrand', product.processor?.processorBrand)) return false;
      if (!checkArray('processorGeneration', product.processor?.processorGeneration || "")) return false;
      if (!checkArray('processorSeries', product.processor?.processorSeries || "")) return false;
      if (!checkArray('integratedGpu', product.processor?.integratedGpu || "")) return false;
      if (!checkArray('dedicatedGraphicsName', product.dedicatedGraphics?.name || "")) return false;
      if (!checkArray('dedicatedGpuBrand', product.dedicatedGraphics?.dedicatedGpuBrand)) return false;
      if (!checkArray('dedicatedGpuModel', product.dedicatedGraphics?.dedicatedGpuModel || "")) return false;

      // Screen Size
      if (excludeKey !== 'screenSize' && filters.screenSize && filters.screenSize.length > 0) {
        const pSize = product.display?.sizeInches;
        if (pSize === undefined || !filters.screenSize.includes(String(pSize))) return false;
      }

      // Has Dedicated GPU
      if (excludeKey !== 'hasDedicatedGraphics' && filters.hasDedicatedGraphics !== undefined) {
        if (!!product.dedicatedGraphics !== filters.hasDedicatedGraphics) return false;
      }

      return true;
    });
  };

  // Memoize Counts
  const categoryCounts = useMemo(() => {
    const p = getFilteredProducts('category');
    const counts: Record<string, number> = {};
    p.forEach(prod => {
      if (prod.category) counts[prod.category] = (counts[prod.category] || 0) + 1;
    });
    return counts;
  }, [products, filters]);

  const subcategoryCounts = useMemo(() => {
    const p = getFilteredProducts('subcategory');
    const counts: Record<string, number> = {};
    p.forEach(prod => {
      if (prod.subcategory) counts[prod.subcategory] = (counts[prod.subcategory] || 0) + 1;
    });
    return counts;
  }, [products, filters]);

  const brandCounts = useMemo(() => {
    const p = getFilteredProducts('brand');
    const counts: Record<string, number> = {};
    p.forEach(prod => {
      if (prod.brand) counts[prod.brand] = (counts[prod.brand] || 0) + 1;
    });
    return counts;
  }, [products, filters]);

  const processorBrandCounts = useMemo(() => {
    const p = getFilteredProducts('processorBrand');
    const counts: Record<string, number> = {};
    p.forEach(prod => {
      const v = prod.processor?.processorBrand;
      if (v) counts[v] = (counts[v] || 0) + 1;
    });
    return counts;
  }, [products, filters]);

  const processorGenCounts = useMemo(() => {
    const p = getFilteredProducts('processorGeneration');
    const counts: Record<string, number> = {};
    p.forEach(prod => {
      const v = prod.processor?.processorGeneration;
      if (v) counts[v] = (counts[v] || 0) + 1;
    });
    return counts;
  }, [products, filters]);

  const processorSeriesCounts = useMemo(() => {
    const p = getFilteredProducts('processorSeries');
    const counts: Record<string, number> = {};
    p.forEach(prod => {
      const v = prod.processor?.processorSeries;
      if (v) counts[v] = (counts[v] || 0) + 1;
    });
    return counts;
  }, [products, filters]);

  const integratedGpuCounts = useMemo(() => {
    const p = getFilteredProducts('integratedGpu');
    const counts: Record<string, number> = {};
    p.forEach(prod => {
      const v = prod.processor?.integratedGpu;
      if (v) counts[v] = (counts[v] || 0) + 1;
    });
    return counts;
  }, [products, filters]);

  const processorNameCounts = useMemo(() => {
    const p = getFilteredProducts('processorName');
    const counts: Record<string, number> = {};
    p.forEach(prod => {
      const v = prod.processor?.name;
      if (v) counts[v] = (counts[v] || 0) + 1;
    });
    return counts;
  }, [products, filters]);

  const screenSizeCounts = useMemo(() => {
    const p = getFilteredProducts('screenSize');
    const counts: Record<string, number> = {};
    p.forEach(prod => {
      const v = prod.display?.sizeInches;
      if (v !== undefined) counts[String(v)] = (counts[String(v)] || 0) + 1;
    });
    return counts;
  }, [products, filters]);

  const gpuNameCounts = useMemo(() => {
    const p = getFilteredProducts('dedicatedGraphicsName');
    const counts: Record<string, number> = {};
    p.forEach(prod => {
      const v = prod.dedicatedGraphics?.name;
      if (v) counts[v] = (counts[v] || 0) + 1;
    });
    return counts;
  }, [products, filters]);


  // OPTIONS LISTS
  const categories = useMemo(() => Array.from(new Set(products.map(p => p.category).filter(Boolean))).sort(), [products]);

  const subcategories = useMemo(() => {
    // If categories are selected, limit subcategories to those.
    // Otherwise allow all.
    let list = products;
    if (filters.category && filters.category.length > 0) {
      list = products.filter(p => filters.category?.includes(p.category));
    }
    return Array.from(new Set(list.map(p => p.subcategory).filter(Boolean))).sort();
  }, [products, filters.category]);

  const brands = useMemo(() => Array.from(new Set(products.map(p => p.brand).filter(Boolean))).sort(), [products]);

  const topLevelContextProducts = useMemo(() => {
    return products.filter(p => {
      if (productIsArchived(p)) return false;
      // Apply Category and Brand filters to decide which deep specs are available
      if (filters.category?.length && !filters.category.includes(p.category)) return false;
      if (filters.brand?.length && !filters.brand.includes(p.brand)) return false;
      return true;
    });
  }, [products, filters.category, filters.brand]);

  function productIsArchived(p: Product) { return p.isArchived; }

  const processorBrands = useMemo(() => Array.from(new Set(topLevelContextProducts.map(p => p.processor?.processorBrand).filter(Boolean))) as string[], [topLevelContextProducts]);
  const processorGenerations = useMemo(() => Array.from(new Set(topLevelContextProducts.map(p => p.processor?.processorGeneration).filter(Boolean))).sort(), [topLevelContextProducts]);
  const processorSeries = useMemo(() => Array.from(new Set(topLevelContextProducts.map(p => p.processor?.processorSeries).filter(Boolean))).sort(), [topLevelContextProducts]);
  const integratedGpus = useMemo(() => Array.from(new Set(topLevelContextProducts.map(p => p.processor?.integratedGpu).filter(Boolean))).sort(), [topLevelContextProducts]);
  const processorNames = useMemo(() => Array.from(new Set(topLevelContextProducts.map(p => p.processor?.name).filter(Boolean))).sort(), [topLevelContextProducts]);
  const screenSizes = useMemo(() => Array.from(new Set(topLevelContextProducts.map(p => p.display?.sizeInches).filter(v => typeof v === 'number'))).sort((a, b) => a! - b!).map(String), [topLevelContextProducts]);
  const gpuNames = useMemo(() => Array.from(new Set(topLevelContextProducts.map(p => p.dedicatedGraphics?.name).filter(Boolean))).sort(), [topLevelContextProducts]);

  // Price Range
  const prices = useMemo(() => products.map(p => p.price), [products]);
  const hasPrices = prices.length > 0;
  const minPriceLimit = hasPrices ? Math.min(...prices) : 0;
  const maxPriceLimit = hasPrices ? Math.max(...prices) : 0;
  const priceRange: [number, number] = [
    filters.minPrice ?? minPriceLimit,
    filters.maxPrice ?? maxPriceLimit,
  ];

  const renderCheckboxOption = (
    idPrefix: string,
    label: string,
    isSelected: boolean,
    count: number,
    onChange: () => void
  ) => (
    <Label
      key={idPrefix}
      htmlFor={idPrefix}
      className={`${optionRow} space-x-reverse justify-between ${isSelected ? optionSelected : ""}`}
    >
      <div className="flex items-center gap-2 overflow-hidden">
        <Checkbox
          id={idPrefix}
          checked={isSelected}
          onCheckedChange={onChange}
          className="shrink-0"
        />
        <span className="truncate" title={label}>{label}</span>
      </div>
      <span className="text-xs text-muted-foreground shrink-0 tabular-nums">({count})</span>
    </Label>
  );

  return (
    <div className="w-full space-y-4">
      <Accordion
        type="multiple"
        className="w-full"
        value={accordionValue}
        onValueChange={setAccordionValue}
      >
        {/* 1. Price Range Filter */}
        <AccordionItem value="price">
          <AccordionTrigger>{t("filters.priceRange")}</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-2 px-1">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {formatCurrency(priceRange[1], 'جنيه')}{" "}
                </span>
                <span className="text-sm text-muted-foreground">
                  {formatCurrency(priceRange[0], 'جنيه')}{" "}
                </span>
              </div>
              <Slider
                value={priceRange}
                min={minPriceLimit}
                max={maxPriceLimit}
                step={1}
                disabled={!hasPrices}
                onValueChange={(value) =>
                  setFilters({
                    ...filters,
                    minPrice: value[0],
                    maxPrice: value[1],
                  })
                }
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 2. Sort Filter */}
        <AccordionItem value="sort">
          <AccordionTrigger>{t("filters.sortBy")}</AccordionTrigger>
          <AccordionContent>
            <RadioGroup
              value={filters.sortBy || "default"}
              onValueChange={(value: any) =>
                setFilters({ ...filters, sortBy: value === "default" ? undefined : value })
              }
              className="space-y-1 pt-2"
            >
              {[
                { val: 'default', text: t("filters.default") },
                { val: 'price-asc', text: t("filters.priceAsc") },
                { val: 'price-desc', text: t("filters.priceDesc") },
                { val: 'name-asc', text: t("filters.nameAsc") },
                { val: 'name-desc', text: t("filters.nameDesc") }
              ].map(({ val, text }) => (
                <Label key={val} className={`${optionRow} ${filters.sortBy === val || (!filters.sortBy && val === 'default') ? optionSelected : ""}`}>
                  <RadioGroupItem value={val} className="h-4 w-4" />
                  <span>{text}</span>
                </Label>
              ))}
            </RadioGroup>
          </AccordionContent>
        </AccordionItem>

        {/* 3. Category Filter */}
        <AccordionItem value="category">
          <AccordionTrigger>{t("filters.category")}</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-1 pt-2">
              {categories.map((category) => {
                const isSelected = filters.category?.includes(category) || false;
                const count = categoryCounts[category] || 0;
                return renderCheckboxOption(
                  `category-${category}`,
                  category,
                  isSelected,
                  count,
                  () => toggleFilter('category', category)
                );
              })}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 4. Subcategory Filter */}
        <AccordionItem value="subcategory">
          <AccordionTrigger>
            {t("filters.subcategory")}
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-1 pt-2">
              {subcategories.map((subcategory) => {
                const isSelected = filters.subcategory?.includes(subcategory) || false;
                const count = subcategoryCounts[subcategory] || 0;
                return renderCheckboxOption(
                  `subcat-${subcategory}`,
                  subcategory,
                  isSelected,
                  count,
                  () => toggleFilter('subcategory', subcategory)
                );
              })}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 5. Brand Filter */}
        <AccordionItem value="brand">
          <AccordionTrigger>{t("filters.brand")}</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-1 pt-2">
              {brands.map((brand) => {
                const isSelected = filters.brand?.includes(brand) || false;
                const count = brandCounts[brand] || 0;
                return renderCheckboxOption(`brand-${brand}`, brand, isSelected, count, () => toggleFilter('brand', brand));
              })}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 6. Screen Size */}
        <AccordionItem value="screen-size">
          <AccordionTrigger>{t("filters.screenSize")}</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-1 pt-2">
              {screenSizes.map(size => (
                renderCheckboxOption(`screen-${size}`, size + '"', filters.screenSize?.includes(size) || false, screenSizeCounts[size] || 0, () => toggleFilter('screenSize', size))
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 7. Processor Brand Filter */}
        <AccordionItem value="processor-brand">
          <AccordionTrigger>{t("filters.processorBrand") || "نوع المعالج"}</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-1 pt-2">
              {processorBrands.map((brand) => {
                const isSelected = filters.processorBrand?.includes(brand) || false;
                const count = processorBrandCounts[brand] || 0;
                return renderCheckboxOption(`proc-brand-${brand}`, brand, isSelected, count, () => toggleFilter('processorBrand', brand));
              })}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 8. Processor Series */}
        <AccordionItem value="processor-series">
          <AccordionTrigger>فئة المعالج</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-1 pt-2">
              {processorSeries.map(series => (
                renderCheckboxOption(`proc-series-${series}`, series, filters.processorSeries?.includes(series) || false, processorSeriesCounts[series] || 0, () => toggleFilter('processorSeries', series))
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 9. Processor Generation */}
        <AccordionItem value="processor-gen">
          <AccordionTrigger>جيل المعالج</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-1 pt-2">
              {processorGenerations.map(gen => (
                renderCheckboxOption(`proc-gen-${gen}`, gen, filters.processorGeneration?.includes(gen) || false, processorGenCounts[gen] || 0, () => toggleFilter('processorGeneration', gen))
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 10. Dedicated GPU */}
        <AccordionItem value="gpu">
          <AccordionTrigger>{t("filters.dedicatedGraphics")}</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-1 pt-2">
              {gpuNames.map(name => (
                renderCheckboxOption(`gpu-name-${name}`, name, filters.dedicatedGraphicsName?.includes(name) || false, gpuNameCounts[name] || 0, () => toggleFilter('dedicatedGraphicsName', name))
              ))}
              <div className={`${optionRow} justify-between mt-2`}>
                <Label htmlFor="has-gpu">{t("filters.onlyWithGPU")}</Label>
                <Checkbox
                  id="has-gpu"
                  checked={!!filters.hasDedicatedGraphics}
                  onCheckedChange={(checked) => setFilters({ ...filters, hasDedicatedGraphics: checked ? true : undefined })}
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 11. Integrated GPU */}
        <AccordionItem value="integrated-gpu">
          <AccordionTrigger>كرت الشاشة المدمج</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-1 pt-2">
              {integratedGpus.map(gpu => (
                renderCheckboxOption(`int-gpu-${gpu}`, gpu, filters.integratedGpu?.includes(gpu) || false, integratedGpuCounts[gpu] || 0, () => toggleFilter('integratedGpu', gpu))
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 12. Specific Processor Name */}
        <AccordionItem value="processor-name">
          <AccordionTrigger>{t("filters.processor")}</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-1 pt-2">
              {processorNames.map(name => (
                renderCheckboxOption(`proc-name-${name}`, name, filters.processorName?.includes(name) || false, processorNameCounts[name] || 0, () => toggleFilter('processorName', name))
              ))}
              {processorNames.length === 0 && <div className="text-sm text-muted-foreground">{t("filters.noProcessorsAvailable")}</div>}
            </div>
          </AccordionContent>
        </AccordionItem>

      </Accordion>

      <Button
        variant="outline"
        className="w-full"
        onClick={() => {
          setFilters({
            search: undefined,
            sortBy: undefined,
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
          navigate('/products');
        }}
      >
        {t("filters.clearAll")}
      </Button>
    </div>
  );
}
