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

  // Processor names derived from filtered products and dependent on GPU filter
  const processorNames = useMemo(() => {
    let productsToConsider = filteredProducts;
    
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
  }, [filteredProducts, filters.dedicatedGraphicsName]);

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
      setFilters((prevFilters) => ({
        ...prevFilters,
        processorName: undefined,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [processorNames.join(',')]); // Use join to create a stable dependency

  useEffect(() => {
    // Only reset if we have available options and the current filter is not in the list
    // This happens when processor filter changes and the selected GPU is no longer compatible
    if (gpuNames.length > 0 && filters.dedicatedGraphicsName && !gpuNames.includes(filters.dedicatedGraphicsName)) {
      // GPU is no longer available (e.g., due to processor filter change), reset it
      setFilters((prevFilters) => ({
        ...prevFilters,
        dedicatedGraphicsName: undefined,
      }));
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

  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

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
                  {formatCurrency(filters.minPrice || minPrice, 'جنيه')}{" "}
                </span>
                <span className="text-sm text-muted-foreground">
                  {formatCurrency(filters.maxPrice || maxPrice, 'جنيه')}{" "}
                </span>
              </div>
              <Slider
                defaultValue={[minPrice, maxPrice]}
                min={minPrice}
                max={maxPrice}
                step={1}
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
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="all-categories" />
                <Label htmlFor="all-categories">
                  {t("filters.allCategories")}
                </Label>
              </div>
              {categories.map((category) => (
                <div key={category} className="flex items-center space-x-2">
                  <RadioGroupItem value={category} id={category} />
                  <Label htmlFor={category}>{category}</Label>
                </div>
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
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="all-subcategories" />
                  <Label htmlFor="all-subcategories">
                    {t("filters.allSubcategories")}
                  </Label>
                </div>
                {subcategories.map((subcategory) => (
                  <div
                    key={subcategory}
                    className="flex items-center space-x-2"
                  >
                    <RadioGroupItem value={subcategory} id={subcategory} />
                    <Label htmlFor={subcategory}>{subcategory}</Label>
                  </div>
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
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="all-brands" />
                <Label htmlFor="all-brands">{t("filters.allBrands")}</Label>
              </div>
              {brands.map((brand) => (
                <div key={brand} className="flex items-center space-x-2">
                  <RadioGroupItem value={brand} id={brand} />
                  <Label htmlFor={brand}>{brand}</Label>
                </div>
              ))}
            </RadioGroup>
          </AccordionContent>
        </AccordionItem>

        {/* Processor Filter */}
        <AccordionItem value="processor">
          <AccordionTrigger className="text-sm font-medium">
            {t("filters.processor")}
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
                // When processor changes, keep GPU filter but it will be automatically filtered to show only compatible GPUs
                setFilters({ 
                  ...filters, 
                  processorName: newProcessorName
                });
              }}
              className="space-y-2 pt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="all-processors" />
                <Label htmlFor="all-processors">{t("filters.allProcessors")}</Label>
              </div>
              {processorNames.length > 0 ? (
                processorNames.map((name) => (
                  <div key={name} className="flex items-center space-x-2">
                    <RadioGroupItem value={name} id={name} />
                    <Label htmlFor={name}>{name}</Label>
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground py-2">
                  {filters.dedicatedGraphicsName 
                    ? t("filters.noCompatibleProcessors") 
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
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="all-screen-sizes" />
                <Label htmlFor="all-screen-sizes">
                  {t("filters.allScreenSizes")}
                </Label>
              </div>
              {screenSizes.length > 0 ? (
                screenSizes.map((size) => (
                  <div key={size} className="flex items-center space-x-2">
                    <RadioGroupItem value={size} id={`screen-${size}`} />
                    <Label htmlFor={`screen-${size}`}>{size}"</Label>
                  </div>
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
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value={"all"} id={"all-gpus"} />
                  <Label htmlFor={"all-gpus"}>{t("filters.allGPUs")}</Label>
                </div>
                {gpuNames.length > 0 ? (
                  gpuNames.map((name) => (
                    <div key={name} className="flex items-center space-x-2">
                      <RadioGroupItem value={name} id={`gpu-${name}`} />
                      <Label htmlFor={`gpu-${name}`}>{name}</Label>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground py-2">
                    {filters.processorName 
                      ? t("filters.noCompatibleGPUs") 
                      : t("filters.noGPUsAvailable")}
                  </div>
                )}
              </RadioGroup>

              <div className="flex items-center mt-2">
                <Label htmlFor="has-gpu">{t("filters.onlyWithGPU")}</Label>
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
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="default" id="default-sort" />
                <Label htmlFor="default-sort">{t("filters.default")}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="price-asc" id="price-asc" />
                <Label htmlFor="price-asc">{t("filters.priceAsc")}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="price-desc" id="price-desc" />
                <Label htmlFor="price-desc">{t("filters.priceDesc")}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="name-asc" id="name-asc" />
                <Label htmlFor="name-asc">{t("filters.nameAsc")}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="name-desc" id="name-desc" />
                <Label htmlFor="name-desc">{t("filters.nameDesc")}</Label>
              </div>
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
            dedicatedGraphicsName: undefined,
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
