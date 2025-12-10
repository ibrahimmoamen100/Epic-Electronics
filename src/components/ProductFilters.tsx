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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { useState, useMemo, useEffect } from "react";
import { DEFAULT_SUPPLIER } from "@/constants/supplier";
import { formatCurrency } from "@/utils/format";

const DEFAULT_SUPPLIER_NAME = "spark";
const DEFAULT_SUPPLIER_PHONE = "01025423389";

export function ProductFilters() {
  const filters = useStore((state) => state.filters) || {};
  const setFilters = useStore((state) => state.setFilters);
  const products = useStore((state) => state.products) || [];
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [expandedSections, setExpandedSections] = useState({
    price: true,
    category: true,
    brand: false,
    color: false,
    size: false,
  });

  // State to control accordion sections
  const [accordionValue, setAccordionValue] = useState<string[]>(["price", "category"]);

  const optionRow =
    "flex w-full items-center gap-3 rounded-lg border border-transparent px-3 py-2 md:px-4 md:py-2.5 hover:border-border/60 hover:bg-muted/60 transition-colors cursor-pointer";
  const optionSelected = "border-primary/60 bg-primary/5";

  // Get filtered products based on current filters (excluding CPU and GPU filters for dependent filtering)
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      // Exclude archived products
      if (product.isArchived) {
        return false;
      }
      // Category filter
      if (filters.category && product.category !== filters.category) {
        return false;
      }
      // Subcategory filter
      if (filters.subcategory && product.subcategory !== filters.subcategory) {
        return false;
      }
      // Brand filter
      if (filters.brand && product.brand !== filters.brand) {
        return false;
      }
      return true;
    });
  }, [products, filters.category, filters.subcategory, filters.brand]);

  // Get unique values for filters based on filtered products
  const categories = useMemo(() => {
    // If a brand is selected, show all categories for that brand
    if (filters.brand) {
      return Array.from(
        new Set(
          products
            ?.filter((p) => p.brand === filters.brand)
            .map((p) => p.category)
            .filter(Boolean) || []
        )
      ) as string[];
    }
    // Otherwise show all categories
    return Array.from(
      new Set(products?.map((p) => p.category).filter(Boolean) || [])
    ) as string[];
  }, [products, filters.brand]);

  // Get unique subcategories for the selected category
  const subcategories = useMemo(() => {
    if (!filters.category) return [];

    // If a brand is selected, show only subcategories that have that brand
    if (filters.brand) {
      return Array.from(
        new Set(
          products
            ?.filter(
              (p) =>
                p.category === filters.category && p.brand === filters.brand
            )
            .map((p) => p.subcategory)
            .filter(Boolean) || []
        )
      ) as string[];
    }

    // Otherwise show all subcategories for the selected category
    return Array.from(
      new Set(
        products
          ?.filter((p) => p.category === filters.category)
          .map((p) => p.subcategory)
          .filter(Boolean) || []
      )
    ) as string[];
  }, [products, filters.category, filters.brand]);

  const suppliers = useMemo(() => {
    // Removed supplier filtering for customers
    return [];
  }, []);

  const brands = useMemo(() => {
    // If a subcategory is selected, show only brands that have that subcategory
    if (filters.subcategory) {
      return Array.from(
        new Set(
          products
            ?.filter(
              (p) =>
                p.category === filters.category &&
                p.subcategory === filters.subcategory
            )
            .map((p) => p.brand)
            .filter(Boolean) || []
        )
      ) as string[];
    }

    // If a category is selected, show all brands for that category
    if (filters.category) {
      return Array.from(
        new Set(
          products
            ?.filter((p) => p.category === filters.category)
            .map((p) => p.brand)
            .filter(Boolean) || []
        )
      ) as string[];
    }

    // Otherwise show all brands
    return Array.from(
      new Set(products?.map((p) => p.brand).filter(Boolean) || [])
    ) as string[];
  }, [products, filters.category, filters.subcategory]);

  // Processor brands derived from filtered products
  const processorBrands = useMemo(() => {
    return Array.from(
      new Set(
        filteredProducts
          .map((p) => p.processor?.processorBrand)
          .filter((brand): brand is "Intel" | "AMD" | "Other" => 
            brand === "Intel" || brand === "AMD" || brand === "Other"
          )
      )
    );
  }, [filteredProducts]);

  // Processor generations derived from filtered products, filtered by processor brand if selected
  const processorGenerations = useMemo(() => {
    let productsToConsider = filteredProducts;
    
    // Filter by processor brand if selected
    if (filters.processorBrand && filters.processorBrand.length > 0) {
      productsToConsider = productsToConsider.filter((p) => {
        const processorBrand = p.processor?.processorBrand;
        if (processorBrand !== "Intel" && processorBrand !== "AMD" && processorBrand !== "Other") return false;
        return filters.processorBrand?.includes(processorBrand) || false;
      });
    }
    
    return Array.from(
      new Set(
        productsToConsider
          .map((p) => p.processor?.processorGeneration)
          .filter(Boolean) as string[]
      )
    ).sort();
  }, [filteredProducts, filters.processorBrand]);

  // Processor series derived from filtered products, filtered by processor brand and generation if selected
  const processorSeries = useMemo(() => {
    let productsToConsider = filteredProducts;
    
    // Filter by processor brand if selected
    if (filters.processorBrand && filters.processorBrand.length > 0) {
      productsToConsider = productsToConsider.filter((p) => {
        const processorBrand = p.processor?.processorBrand;
        if (processorBrand !== "Intel" && processorBrand !== "AMD" && processorBrand !== "Other") return false;
        return filters.processorBrand?.includes(processorBrand) || false;
      });
    }
    
    // Filter by processor generation if selected
    if (filters.processorGeneration && filters.processorGeneration.length > 0) {
      productsToConsider = productsToConsider.filter((p) =>
        filters.processorGeneration?.includes(p.processor?.processorGeneration || "")
      );
    }
    
    return Array.from(
      new Set(
        productsToConsider
          .map((p) => p.processor?.processorSeries)
          .filter(Boolean) as string[]
      )
    ).sort();
  }, [filteredProducts, filters.processorBrand, filters.processorGeneration]);

  // Integrated GPUs derived from filtered products, filtered by processor brand, generation, and series if selected
  const integratedGpus = useMemo(() => {
    let productsToConsider = filteredProducts;
    
    // Filter by processor brand if selected
    if (filters.processorBrand && filters.processorBrand.length > 0) {
      productsToConsider = productsToConsider.filter((p) => {
        const processorBrand = p.processor?.processorBrand;
        if (processorBrand !== "Intel" && processorBrand !== "AMD" && processorBrand !== "Other") return false;
        return filters.processorBrand?.includes(processorBrand) || false;
      });
    }
    
    // Filter by processor generation if selected
    if (filters.processorGeneration && filters.processorGeneration.length > 0) {
      productsToConsider = productsToConsider.filter((p) =>
        filters.processorGeneration?.includes(p.processor?.processorGeneration || "")
      );
    }
    
    // Filter by processor series if selected
    if (filters.processorSeries && filters.processorSeries.length > 0) {
      productsToConsider = productsToConsider.filter((p) =>
        filters.processorSeries?.includes(p.processor?.processorSeries || "")
      );
    }
    
    return Array.from(
      new Set(
        productsToConsider
          .map((p) => p.processor?.integratedGpu)
          .filter(Boolean) as string[]
      )
    ).sort();
  }, [filteredProducts, filters.processorBrand, filters.processorGeneration, filters.processorSeries]);

  // Dedicated GPU brands derived from filtered products
  const dedicatedGpuBrands = useMemo(() => {
    return Array.from(
      new Set(
        filteredProducts
          .map((p) => p.dedicatedGraphics?.dedicatedGpuBrand)
          .filter((brand): brand is "NVIDIA" | "AMD" | "Intel" | "Custom" => 
            brand === "NVIDIA" || brand === "AMD" || brand === "Intel" || brand === "Custom"
          )
      )
    );
  }, [filteredProducts]);

  // Dedicated GPU models derived from filtered products
  const dedicatedGpuModels = useMemo(() => {
    return Array.from(
      new Set(
        filteredProducts
          .map((p) => p.dedicatedGraphics?.dedicatedGpuModel)
          .filter(Boolean) as string[]
      )
    ).sort();
  }, [filteredProducts]);

  // Processor names derived from filtered products and dependent on processor filters (brand, generation, series, integratedGpu) and GPU filter
  const processorNames = useMemo(() => {
    let productsToConsider = filteredProducts;
    
    // Filter by processor brand if selected
    if (filters.processorBrand && filters.processorBrand.length > 0) {
      productsToConsider = productsToConsider.filter((p) => {
        const processorBrand = p.processor?.processorBrand;
        if (processorBrand !== "Intel" && processorBrand !== "AMD" && processorBrand !== "Other") return false;
        return filters.processorBrand?.includes(processorBrand) || false;
      });
    }
    
    // Filter by processor generation if selected
    if (filters.processorGeneration && filters.processorGeneration.length > 0) {
      productsToConsider = productsToConsider.filter((p) =>
        filters.processorGeneration?.includes(p.processor?.processorGeneration || "")
      );
    }
    
    // Filter by processor series if selected
    if (filters.processorSeries && filters.processorSeries.length > 0) {
      productsToConsider = productsToConsider.filter((p) =>
        filters.processorSeries?.includes(p.processor?.processorSeries || "")
      );
    }
    
    // Filter by integrated GPU if selected
    if (filters.integratedGpu && filters.integratedGpu.length > 0) {
      productsToConsider = productsToConsider.filter((p) =>
        filters.integratedGpu?.includes(p.processor?.integratedGpu || "")
      );
    }
    
    // If a GPU is selected, only show processors that exist in products with that GPU
    if (filters.dedicatedGraphicsName) {
      productsToConsider = productsToConsider.filter(
        (p) => p.dedicatedGraphics?.name === filters.dedicatedGraphicsName
      );
    }
    
    return Array.from(
      new Set(
        productsToConsider
          .map((p) => p.processor?.name)
          .filter(Boolean) as string[]
      )
    );
  }, [filteredProducts, filters.processorBrand, filters.processorGeneration, filters.processorSeries, filters.integratedGpu, filters.dedicatedGraphicsName]);

  // Dedicated GPU names derived from filtered products and dependent on CPU filter
  const gpuNames = useMemo(() => {
    let productsToConsider = filteredProducts;
    
    // If a processor is selected, only show GPUs that exist in products with that processor
    if (filters.processorName) {
      productsToConsider = productsToConsider.filter(
        (p) => p.processor?.name === filters.processorName
      );
    }
    
    return Array.from(
      new Set(
        productsToConsider
          .map((p) => p.dedicatedGraphics?.name)
          .filter(Boolean) as string[]
      )
    );
  }, [filteredProducts, filters.processorName]);

  const screenSizes = useMemo(() => {
    return Array.from(
      new Set(
        filteredProducts
          ?.map((p) => p.display?.sizeInches)
          .filter((size): size is number => typeof size === "number")
      ) || []
    )
      .sort((a, b) => a - b)
      .map((size) => size.toString());
  }, [filteredProducts]);

  // Validate and reset incompatible filters when available options change
  useEffect(() => {
    // Only reset if we have available options and the current filter is not in the list
    // This happens when GPU filter changes and the selected processor is no longer compatible
    if (processorNames.length > 0 && filters.processorName && !processorNames.includes(filters.processorName)) {
      // Processor is no longer available (e.g., due to GPU filter change), reset it
      setFilters({
        ...filters,
        processorName: undefined,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [processorNames.join(',')]); // Use join to create a stable dependency

  useEffect(() => {
    // Only reset if we have available options and the current filter is not in the list
    // This happens when processor filter changes and the selected GPU is no longer compatible
    if (gpuNames.length > 0 && filters.dedicatedGraphicsName && !gpuNames.includes(filters.dedicatedGraphicsName)) {
      // GPU is no longer available (e.g., due to processor filter change), reset it
      setFilters({
        ...filters,
        dedicatedGraphicsName: undefined,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gpuNames.join(',')]); // Use join to create a stable dependency

  const colors = useMemo(() => {
    return Array.from(
      new Set(
        filteredProducts
          ?.map((p) => p.color)
          .filter(Boolean)
          .flatMap((color) => color.split(","))
      ) || []
    ).map((color) => {
      // Map color codes to color names
      const colorMap: { [key: string]: string } = {
        "#000000": "Black",
        "#FFFFFF": "White",
        "#FF0000": "Red",
        "#008000": "Green",
        "#0000FF": "Blue",
        "#FFFF00": "Yellow",
        "#800080": "Purple",
        "#FFA500": "Orange",
        "#FFC0CB": "Pink",
        "#808080": "Gray",
        "#A52A2A": "Brown",
        "#F5F5DC": "Beige",
        "#000080": "Navy",
        "#800000": "Maroon",
        "#008080": "Teal",
        "#FFD700": "Gold",
        "#C0C0C0": "Silver",
      };
      return {
        code: color as string,
        name: colorMap[color as string] || color as string,
      };
    });
  }, [filteredProducts]);

  const sizes = useMemo(() => {
    return Array.from(
      new Set(
        filteredProducts
          ?.map((p) => p.size)
          .filter(Boolean)
          .flatMap((size) => size.split(","))
      ) || []
    );
  }, [filteredProducts]);

  // Get min and max prices for the price range slider based on filtered products
  const prices = useMemo(() => {
    return filteredProducts?.map((p) => p.price) || [];
  }, [filteredProducts]);

  const hasPrices = prices.length > 0;
  const minPrice = hasPrices ? Math.min(...prices) : 0;
  const maxPrice = hasPrices ? Math.max(...prices) : 0;
  const priceRange: [number, number] = [
    filters.minPrice ?? minPrice,
    filters.maxPrice ?? maxPrice,
  ];

  // Reset dependent filters when category changes
  const handleCategoryChange = (value: string) => {
    const newCategory = value === "all" ? undefined : value;
    
    setFilters({
      ...filters,
      category: newCategory,
      subcategory: undefined, // Reset subcategory when category changes
      brand: undefined, // Reset brand when category changes
      color: undefined, // Reset color when category changes
      size: undefined, // Reset size when category changes
    });

    // Auto-open subcategory section when a category is selected
    if (newCategory) {
      setAccordionValue(prev => {
        if (!prev.includes("subcategory")) {
          return [...prev, "subcategory"];
        }
        return prev;
      });
    }

    // Update URL
    if (newCategory) {
      const encodedCategory = encodeURIComponent(newCategory);
      navigate(`/products/category/${encodedCategory}`);
    } else {
      navigate('/products');
    }
  };

  // Reset dependent filters when subcategory changes
  const handleSubcategoryChange = (value: string) => {
    setFilters({
      ...filters,
      subcategory: value === "all" ? undefined : value,
      brand: undefined, // Reset brand when subcategory changes
      color: undefined, // Reset color when subcategory changes
      size: undefined, // Reset size when subcategory changes
    });
  };

  // Reset dependent filters when brand changes
  const handleBrandChange = (value: string) => {
    setFilters({
      ...filters,
      brand: value === "all" ? undefined : value,
      subcategory: undefined, // Reset subcategory when brand changes
      color: undefined, // Reset color when brand changes
      size: undefined, // Reset size when brand changes
    });

    // Auto-open subcategory section when a brand is selected (if category is also selected)
    if (value !== "all" && filters.category) {
      setAccordionValue(prev => {
        if (!prev.includes("subcategory")) {
          return [...prev, "subcategory"];
        }
        return prev;
      });
    }
  };

  return (
    <div className="w-full space-y-4">
      <Accordion
        type="multiple"
        className="w-full"
        value={accordionValue}
        onValueChange={setAccordionValue}
      >
        {/* Price Range Filter */}
        <AccordionItem value="price">
          <AccordionTrigger>{t("filters.priceRange")}</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-2">
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
                min={minPrice}
                max={maxPrice}
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

        {/* Category Filter */}
        <AccordionItem value="category">
          <AccordionTrigger>{t("filters.category")}</AccordionTrigger>
          <AccordionContent>
            <RadioGroup
              value={filters.category || "all"}
              onValueChange={handleCategoryChange}
              className="space-y-2 pt-2"
            >
              <Label
                htmlFor="all-categories"
                className={`${optionRow} ${!filters.category ? optionSelected : ""}`}
              >
                <RadioGroupItem value="all" id="all-categories" className="h-4 w-4" />
                <span>{t("filters.allCategories")}</span>
              </Label>
              {categories.map((category) => (
                <Label
                  key={category}
                  htmlFor={category}
                  className={`${optionRow} ${
                    filters.category === category ? optionSelected : ""
                  }`}
                >
                  <RadioGroupItem value={category} id={category} className="h-4 w-4" />
                  <span>{category}</span>
                </Label>
              ))}
            </RadioGroup>
          </AccordionContent>
        </AccordionItem>

        {/* Subcategory Filter - Always show but disable when no category is selected */}
        <AccordionItem value="subcategory">
          <AccordionTrigger
            className={!filters.category ? "text-muted-foreground" : ""}
            disabled={!filters.category}
          >
            {t("filters.subcategory")}
            {filters.brand && ` | (${filters.brand})`}
            {!filters.category && (
              <span className="text-xs text-muted-foreground ml-2">
                ({t("filters.selectCategoryFirst")})
              </span>
            )}
          </AccordionTrigger>
          <AccordionContent>
            {filters.category ? (
              <RadioGroup
                value={filters.subcategory || "all"}
                onValueChange={handleSubcategoryChange}
                className="space-y-2 pt-2"
              >
                <Label
                  htmlFor="all-subcategories"
                  className={`${optionRow} ${!filters.subcategory ? optionSelected : ""}`}
                >
                  <RadioGroupItem value="all" id="all-subcategories" className="h-4 w-4" />
                  <span>{t("filters.allSubcategories")}</span>
                </Label>
                {subcategories.map((subcategory) => (
                  <Label
                    key={subcategory}
                    htmlFor={subcategory}
                    className={`${optionRow} ${
                      filters.subcategory === subcategory ? optionSelected : ""
                    }`}
                  >
                    <RadioGroupItem value={subcategory} id={subcategory} className="h-4 w-4" />
                    <span>{subcategory}</span>
                  </Label>
                ))}
              </RadioGroup>
            ) : (
              <div className="text-sm text-muted-foreground py-2">
                {t("filters.selectCategoryFirst")}
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* Brand Filter */}
        <AccordionItem value="brand">
          <AccordionTrigger className="text-sm font-medium ">
            {t("filters.brand")} | {filters.category && `(${filters.category}`}
            {filters.subcategory && ` > ${filters.subcategory})`}
            {filters.category && !filters.subcategory && `)`}
          </AccordionTrigger>
          <AccordionContent>
            <RadioGroup
              value={filters.brand || "all"}
              onValueChange={handleBrandChange}
              className="space-y-2 pt-2"
            >
              <Label
                htmlFor="all-brands"
                className={`${optionRow} justify-between ${!filters.brand ? optionSelected : ""}`}
              >
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="all" id="all-brands" className="h-4 w-4" />
                  <span>{t("filters.allBrands")}</span>
                </div>
              </Label>
              {brands.map((brand) => {
                const count = filteredProducts.filter((p) => p.brand === brand).length;
                return (
                  <Label
                    key={brand}
                    htmlFor={brand}
                    className={`${optionRow} justify-between ${
                      filters.brand === brand ? optionSelected : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <RadioGroupItem value={brand} id={brand} className="h-4 w-4" />
                      <span>{brand}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">({count})</span>
                  </Label>
                );
              })}
            </RadioGroup>
          </AccordionContent>
        </AccordionItem>

        {/* Processor Brand Filter - First */}
        <AccordionItem value="processor-brand">
          <AccordionTrigger className="text-sm font-medium">
            نوع المعالج *
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2 pt-2">
              {processorBrands.length > 0 ? (
                processorBrands.map((brand) => {
                  const count = filteredProducts.filter((p) => {
                    const processorBrand = p.processor?.processorBrand;
                    return processorBrand === "Intel" || processorBrand === "AMD" || processorBrand === "Other"
                      ? processorBrand === brand
                      : false;
                  }).length;
                  const selected = filters.processorBrand?.includes(brand);
                  return (
                    <Label
                      key={brand}
                      htmlFor={`processor-brand-${brand}`}
                      className={`${optionRow} justify-between ${
                        selected ? optionSelected : ""
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <Checkbox
                          id={`processor-brand-${brand}`}
                          checked={selected || false}
                          onCheckedChange={(checked) => {
                            const currentBrands = filters.processorBrand || [];
                            if (checked) {
                              setFilters({
                                ...filters,
                                processorBrand: [...currentBrands, brand],
                                processorName: undefined, // Reset processor name when brand changes
                              });
                            } else {
                              setFilters({
                                ...filters,
                                processorBrand: currentBrands.filter((b) => b !== brand),
                                processorName: undefined, // Reset processor name when brand changes
                              });
                            }
                          }}
                        />
                        <span>{brand}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">({count})</span>
                    </Label>
                  );
                })
              ) : (
                <div className="text-sm text-muted-foreground py-2">
                  لا توجد أنواع معالجات متاحة حالياً
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Processor Generation Filter - Second */}
        <AccordionItem value="processor-generation">
          <AccordionTrigger className="text-sm font-medium">
            جيل المعالج
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2 pt-2">
              {processorGenerations.length > 0 ? (
                processorGenerations.map((generation) => {
                  // Count products with this generation that match other processor filters
                  const count = filteredProducts.filter((p) => {
                    if (p.processor?.processorGeneration !== generation) return false;
                    if (filters.processorBrand && filters.processorBrand.length > 0) {
                      const processorBrand = p.processor?.processorBrand;
                      if (processorBrand !== "Intel" && processorBrand !== "AMD" && processorBrand !== "Other") return false;
                      if (!filters.processorBrand.includes(processorBrand)) return false;
                    }
                    return true;
                  }).length;
                  const selected = filters.processorGeneration?.includes(generation);
                  return (
                    <Label
                      key={generation}
                      htmlFor={`processor-generation-${generation}`}
                      className={`${optionRow} justify-between ${
                        selected ? optionSelected : ""
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <Checkbox
                          id={`processor-generation-${generation}`}
                          checked={selected || false}
                          onCheckedChange={(checked) => {
                            const currentGenerations = filters.processorGeneration || [];
                            if (checked) {
                              setFilters({
                                ...filters,
                                processorGeneration: [...currentGenerations, generation],
                                processorName: undefined, // Reset processor name when generation changes
                              });
                            } else {
                              setFilters({
                                ...filters,
                                processorGeneration: currentGenerations.filter((g) => g !== generation),
                                processorName: undefined, // Reset processor name when generation changes
                              });
                            }
                          }}
                        />
                        <span>{generation}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">({count})</span>
                    </Label>
                  );
                })
              ) : (
                <div className="text-sm text-muted-foreground py-2">
                  لا توجد أجيال معالجات متاحة حالياً
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Processor Series Filter - Third */}
        <AccordionItem value="processor-series">
          <AccordionTrigger className="text-sm font-medium">
            فئة المعالج *
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2 pt-2">
              {processorSeries.length > 0 ? (
                processorSeries.map((series) => {
                  // Count products with this series that match other processor filters
                  const count = filteredProducts.filter((p) => {
                    if (p.processor?.processorSeries !== series) return false;
                    if (filters.processorBrand && filters.processorBrand.length > 0) {
                      const processorBrand = p.processor?.processorBrand;
                      if (processorBrand !== "Intel" && processorBrand !== "AMD" && processorBrand !== "Other") return false;
                      if (!filters.processorBrand.includes(processorBrand)) return false;
                    }
                    if (filters.processorGeneration && filters.processorGeneration.length > 0) {
                      if (!filters.processorGeneration.includes(p.processor?.processorGeneration || "")) return false;
                    }
                    return true;
                  }).length;
                  const selected = filters.processorSeries?.includes(series);
                  return (
                    <Label
                      key={series}
                      htmlFor={`processor-series-${series}`}
                      className={`${optionRow} justify-between ${
                        selected ? optionSelected : ""
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <Checkbox
                          id={`processor-series-${series}`}
                          checked={selected || false}
                          onCheckedChange={(checked) => {
                            const currentSeries = filters.processorSeries || [];
                            if (checked) {
                              setFilters({
                                ...filters,
                                processorSeries: [...currentSeries, series],
                                processorName: undefined, // Reset processor name when series changes
                              });
                            } else {
                              setFilters({
                                ...filters,
                                processorSeries: currentSeries.filter((s) => s !== series),
                                processorName: undefined, // Reset processor name when series changes
                              });
                            }
                          }}
                        />
                        <span>{series}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">({count})</span>
                    </Label>
                  );
                })
              ) : (
                <div className="text-sm text-muted-foreground py-2">
                  لا توجد فئات معالجات متاحة حالياً
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Integrated GPU Filter - Fourth */}
        <AccordionItem value="integrated-gpu">
          <AccordionTrigger className="text-sm font-medium">
            كرت الشاشة الداخلي المدمج في المعالج
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2 pt-2">
              {integratedGpus.length > 0 ? (
                integratedGpus.map((gpu) => {
                  // Count products with this integrated GPU that match other processor filters
                  const count = filteredProducts.filter((p) => {
                    if (p.processor?.integratedGpu !== gpu) return false;
                    if (filters.processorBrand && filters.processorBrand.length > 0) {
                      const processorBrand = p.processor?.processorBrand;
                      if (processorBrand !== "Intel" && processorBrand !== "AMD" && processorBrand !== "Other") return false;
                      if (!filters.processorBrand.includes(processorBrand)) return false;
                    }
                    if (filters.processorGeneration && filters.processorGeneration.length > 0) {
                      if (!filters.processorGeneration.includes(p.processor?.processorGeneration || "")) return false;
                    }
                    if (filters.processorSeries && filters.processorSeries.length > 0) {
                      if (!filters.processorSeries.includes(p.processor?.processorSeries || "")) return false;
                    }
                    return true;
                  }).length;
                  const selected = filters.integratedGpu?.includes(gpu);
                  return (
                    <Label
                      key={gpu}
                      htmlFor={`integrated-gpu-${gpu}`}
                      className={`${optionRow} justify-between ${
                        selected ? optionSelected : ""
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <Checkbox
                          id={`integrated-gpu-${gpu}`}
                          checked={selected || false}
                          onCheckedChange={(checked) => {
                            const currentGpus = filters.integratedGpu || [];
                            if (checked) {
                              setFilters({
                                ...filters,
                                integratedGpu: [...currentGpus, gpu],
                                processorName: undefined, // Reset processor name when integrated GPU changes
                              });
                            } else {
                              setFilters({
                                ...filters,
                                integratedGpu: currentGpus.filter((g) => g !== gpu),
                                processorName: undefined, // Reset processor name when integrated GPU changes
                              });
                            }
                          }}
                        />
                        <span>{gpu}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">({count})</span>
                    </Label>
                  );
                })
              ) : (
                <div className="text-sm text-muted-foreground py-2">
                  لا توجد كروت شاشة داخلية متاحة حالياً
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Processor Filter - Last, depends on previous filters */}
        <AccordionItem value="processor">
          <AccordionTrigger className="text-sm font-medium">
            {t("filters.processor")}
            {(filters.processorBrand || filters.processorGeneration || filters.processorSeries || filters.integratedGpu) && (
              <span className="text-xs text-muted-foreground ml-2">
                (مُصفى حسب التصفيات السابقة)
              </span>
            )}
            {filters.dedicatedGraphicsName && (
              <span className="text-xs text-muted-foreground ml-2">
                ({t("filters.compatibleWith")} {filters.dedicatedGraphicsName})
              </span>
            )}
          </AccordionTrigger>
          <AccordionContent>
            <RadioGroup
              value={filters.processorName || "all"}
              onValueChange={(value) => {
                const newProcessorName = value === "all" ? undefined : value;
                setFilters({ 
                  ...filters, 
                  processorName: newProcessorName
                });
              }}
              className="space-y-2 pt-2"
            >
              <Label
                htmlFor="all-processors"
                className={`${optionRow} justify-between ${!filters.processorName ? optionSelected : ""}`}
              >
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="all" id="all-processors" className="h-4 w-4" />
                  <span>{t("filters.allProcessors")}</span>
                </div>
              </Label>
              {processorNames.length > 0 ? (
                processorNames.map((name) => {
                  const count = filteredProducts.filter((p) => {
                    if (p.processor?.name !== name) return false;
                    // Match all processor filters
                    if (filters.processorBrand && filters.processorBrand.length > 0) {
                      const processorBrand = p.processor?.processorBrand;
                      if (processorBrand !== "Intel" && processorBrand !== "AMD" && processorBrand !== "Other") return false;
                      if (!filters.processorBrand.includes(processorBrand)) return false;
                    }
                    if (filters.processorGeneration && filters.processorGeneration.length > 0) {
                      if (!filters.processorGeneration.includes(p.processor?.processorGeneration || "")) return false;
                    }
                    if (filters.processorSeries && filters.processorSeries.length > 0) {
                      if (!filters.processorSeries.includes(p.processor?.processorSeries || "")) return false;
                    }
                    if (filters.integratedGpu && filters.integratedGpu.length > 0) {
                      if (!filters.integratedGpu.includes(p.processor?.integratedGpu || "")) return false;
                    }
                    return true;
                  }).length;
                  const selected = filters.processorName === name;
                  return (
                    <Label
                      key={name}
                      htmlFor={name}
                      className={`${optionRow} justify-between ${selected ? optionSelected : ""}`}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <RadioGroupItem value={name} id={name} className="h-4 w-4" />
                        <span>{name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">({count})</span>
                    </Label>
                  );
                })
              ) : (
                <div className="text-sm text-muted-foreground py-2">
                  {filters.dedicatedGraphicsName 
                    ? t("filters.noCompatibleProcessors") 
                    : (filters.processorBrand || filters.processorGeneration || filters.processorSeries || filters.integratedGpu)
                    ? "لا توجد معالجات متاحة مع التصفيات المحددة"
                    : t("filters.noProcessorsAvailable")}
                </div>
              )}
            </RadioGroup>
          </AccordionContent>
        </AccordionItem>

        {/* Screen Size Filter */}
        <AccordionItem value="screen-size">
          <AccordionTrigger className="text-sm font-medium">
            {t("filters.screenSize")}
          </AccordionTrigger>
          <AccordionContent>
            <RadioGroup
              value={filters.screenSize || "all"}
              onValueChange={(value) =>
                setFilters({
                  ...filters,
                  screenSize: value === "all" ? undefined : value,
                })
              }
              className="space-y-2 pt-2"
            >
              <Label
                htmlFor="all-screen-sizes"
                className={`${optionRow} ${!filters.screenSize ? optionSelected : ""}`}
              >
                <RadioGroupItem value="all" id="all-screen-sizes" className="h-4 w-4" />
                <span>{t("filters.allScreenSizes")}</span>
              </Label>
              {screenSizes.length > 0 ? (
                screenSizes.map((size) => (
                  <Label
                    key={size}
                    htmlFor={`screen-${size}`}
                    className={`${optionRow} ${
                      filters.screenSize === size ? optionSelected : ""
                    }`}
                  >
                    <RadioGroupItem value={size} id={`screen-${size}`} className="h-4 w-4" />
                    <span>{size}"</span>
                  </Label>
                ))
              ) : (
                <div className="text-sm text-muted-foreground py-2">
                  {t("filters.noScreenSizesAvailable")}
                </div>
              )}
            </RadioGroup>
          </AccordionContent>
        </AccordionItem>

        {/* Dedicated GPU Filter */}
        <AccordionItem value="gpu">
          <AccordionTrigger className="text-sm font-medium">
            {t("filters.dedicatedGraphics")}
            {filters.processorName && (
              <span className="text-xs text-muted-foreground ml-2">
                ({t("filters.compatibleWith")} {filters.processorName})
              </span>
            )}
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2 pt-2">
              <RadioGroup
                value={filters.dedicatedGraphicsName || "all"}
                onValueChange={(value) => {
                  const newGpuName = value === "all" ? undefined : value;
                  // When GPU changes, keep processor filter but it will be automatically filtered to show only compatible processors
                  setFilters({ 
                    ...filters, 
                    dedicatedGraphicsName: newGpuName
                  });
                }}
                className="space-y-2 pt-2"
              >
                <Label
                  htmlFor={"all-gpus"}
                  className={`${optionRow} ${!filters.dedicatedGraphicsName ? optionSelected : ""}`}
                >
                  <RadioGroupItem value={"all"} id={"all-gpus"} className="h-4 w-4" />
                  <span>{t("filters.allGPUs")}</span>
                </Label>
                {gpuNames.length > 0 ? (
                  gpuNames.map((name) => (
                    <Label
                      key={name}
                      htmlFor={`gpu-${name}`}
                      className={`${optionRow} ${
                        filters.dedicatedGraphicsName === name ? optionSelected : ""
                      }`}
                    >
                      <RadioGroupItem value={name} id={`gpu-${name}`} className="h-4 w-4" />
                      <span>{name}</span>
                    </Label>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground py-2">
                    {filters.processorName 
                      ? t("filters.noCompatibleGPUs") 
                      : t("filters.noGPUsAvailable")}
                  </div>
                )}
              </RadioGroup>

              <div className={`${optionRow} justify-between`}>
                <Label htmlFor="has-gpu" className="cursor-pointer">
                  {t("filters.onlyWithGPU")}
                </Label>
                <div className="ml-auto">
                  <input
                    id="has-gpu"
                    type="checkbox"
                    checked={!!filters.hasDedicatedGraphics}
                    onChange={(e) => setFilters({ ...filters, hasDedicatedGraphics: e.target.checked ? true : undefined })}
                  />
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Color Filter */}
        {/* <AccordionItem value="color">
          <AccordionTrigger className="text-sm font-medium">
            {t("filters.color")} {filters.category && `(${filters.category})`}{" "}
            {filters.brand && `(${filters.brand})`}
          </AccordionTrigger>
          <AccordionContent>
            <RadioGroup
              value={filters.color || "all"}
              onValueChange={(value) =>
                setFilters({
                  ...filters,
                  color: value === "all" ? undefined : value,
                })
              }
              className="space-y-2 pt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="all-colors" />
                <Label htmlFor="all-colors">{t("filters.allColors")}</Label>
              </div>
              {colors.map((color) => (
                <div key={color.code} className="flex items-center space-x-2">
                  <RadioGroupItem value={color.code} id={color.code} />
                  <div className="flex items-center gap-2">
                    <div
                      className="h-4 w-4 rounded-full border"
                      style={{ backgroundColor: color.code }}
                    />
                    <Label htmlFor={color.code}>
                      {t(`colors.${color.name}`)}
                    </Label>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </AccordionContent>
        </AccordionItem> */}

        {/* Size Filter */}
        {/* <AccordionItem value="size">
          <AccordionTrigger className="text-sm font-medium">
            {t("filters.size")} {filters.category && `(${filters.category})`}{" "}
            {filters.brand && `(${filters.brand})`}
          </AccordionTrigger>
          <AccordionContent>
            <RadioGroup
              value={filters.size || "all"}
              onValueChange={(value) =>
                setFilters({
                  ...filters,
                  size: value === "all" ? undefined : value,
                })
              }
              className="space-y-2 pt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="all-sizes" />
                <Label htmlFor="all-sizes">{t("filters.allSizes")}</Label>
              </div>
              {sizes.map((size) => (
                <div key={size} className="flex items-center space-x-2">
                  <RadioGroupItem value={size} id={size} />
                  <Label htmlFor={size}>{size}</Label>
                </div>
              ))}
            </RadioGroup>
          </AccordionContent>
        </AccordionItem> */}

        {/* Sort Filter */}
        <AccordionItem value="sort">
          <AccordionTrigger className="text-sm font-medium">
            {t("filters.sortBy")}
          </AccordionTrigger>
          <AccordionContent>
            <RadioGroup
              value={filters.sortBy || "default"}
              onValueChange={(
                value:
                  | "default"
                  | "price-asc"
                  | "price-desc"
                  | "name-asc"
                  | "name-desc"
              ) =>
                setFilters({
                  ...filters,
                  sortBy: value === "default" ? undefined : value,
                })
              }
              className="space-y-2 pt-2"
            >
              <Label
                htmlFor="default-sort"
                className={`${optionRow} ${!filters.sortBy ? optionSelected : ""}`}
              >
                <RadioGroupItem value="default" id="default-sort" className="h-4 w-4" />
                <span>{t("filters.default")}</span>
              </Label>
              <Label
                htmlFor="price-asc"
                className={`${optionRow} ${
                  filters.sortBy === "price-asc" ? optionSelected : ""
                }`}
              >
                <RadioGroupItem value="price-asc" id="price-asc" className="h-4 w-4" />
                <span>{t("filters.priceAsc")}</span>
              </Label>
              <Label
                htmlFor="price-desc"
                className={`${optionRow} ${
                  filters.sortBy === "price-desc" ? optionSelected : ""
                }`}
              >
                <RadioGroupItem value="price-desc" id="price-desc" className="h-4 w-4" />
                <span>{t("filters.priceDesc")}</span>
              </Label>
              <Label
                htmlFor="name-asc"
                className={`${optionRow} ${
                  filters.sortBy === "name-asc" ? optionSelected : ""
                }`}
              >
                <RadioGroupItem value="name-asc" id="name-asc" className="h-4 w-4" />
                <span>{t("filters.nameAsc")}</span>
              </Label>
              <Label
                htmlFor="name-desc"
                className={`${optionRow} ${
                  filters.sortBy === "name-desc" ? optionSelected : ""
                }`}
              >
                <RadioGroupItem value="name-desc" id="name-desc" className="h-4 w-4" />
                <span>{t("filters.nameDesc")}</span>
              </Label>
            </RadioGroup>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Clear Filters Button */}
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
          // Navigate back to products page to clear URL parameters
          navigate('/products');
        }}
      >
        {t("filters.clearAll")}
      </Button>
    </div>
  );
}
