import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useLocation, useSearchParams } from "react-router-dom";
import { useStore } from "@/store/useStore";
import { ProductCard } from "@/components/ProductCard";
import { ProductFilters } from "@/components/ProductFilters";
import { ProductModal } from "@/components/ProductModal";
import { Product } from "@/types/product";
import Footer from "@/components/Footer";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Filter, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { ProductSearch } from "@/components/ProductSearch";
import { ActiveFilters } from "@/components/ActiveFilters";
import { SEOHelmet } from "@/components/SEOHelmet";
import { DEFAULT_SUPPLIER } from "@/constants/supplier";

// ─── Helper: convert Filter → URLSearchParams (ordered per spec) ───────────
function filtersToSearchParams(filters: import("@/types/product").Filter): URLSearchParams {
  const params = new URLSearchParams();

  // 1. نطاق السعر
  if (filters.minPrice !== undefined) params.set("minPrice", String(filters.minPrice));
  if (filters.maxPrice !== undefined) params.set("maxPrice", String(filters.maxPrice));
  // 2. الفئة
  filters.category?.forEach((v) => params.append("category", v));
  // 3. الماركة
  filters.brand?.forEach((v) => params.append("brand", v));
  // 4. الفئة الفرعية
  filters.subcategory?.forEach((v) => params.append("subcategory", v));
  // 5. مميزات خاصة
  filters.features?.forEach((v) => params.append("features", v));
  // 6. حجم الشاشة
  filters.screenSize?.forEach((v) => params.append("screenSize", v));
  // 7. نوع المعالج (processorBrand)
  filters.processorBrand?.forEach((v) => params.append("processorBrand", v));
  // 8. فئة المعالج (processorSeries)
  filters.processorSeries?.forEach((v) => params.append("processorSeries", v));
  // 9. جيل المعالج
  filters.processorGeneration?.forEach((v) => params.append("processorGeneration", v));
  // 10. كرت شاشة خارجي (dedicatedGpuBrand)
  filters.dedicatedGpuBrand?.forEach((v) => params.append("dedicatedGpuBrand", v));
  // كرت شاشة خارجي - موديل
  filters.dedicatedGpuModel?.forEach((v) => params.append("dedicatedGpuModel", v));
  // 11. كرت الشاشة المدمج
  filters.integratedGpu?.forEach((v) => params.append("integratedGpu", v));
  // 12. اسم المعالج
  filters.processorName?.forEach((v) => params.append("processorName", v));

  // إضافية: hasDedicatedGraphics
  if (filters.hasDedicatedGraphics !== undefined)
    params.set("hasDedicatedGraphics", filters.hasDedicatedGraphics ? "true" : "false");

  return params;
}

// ─── Helper: parse URLSearchParams → Filter ─────────────────────────────────
function searchParamsToFilters(params: URLSearchParams): Partial<import("@/types/product").Filter> {
  const getArr = (key: string) => {
    const vals = params.getAll(key);
    return vals.length > 0 ? vals : undefined;
  };

  const minPriceStr = params.get("minPrice");
  const maxPriceStr = params.get("maxPrice");
  const hasDedStr = params.get("hasDedicatedGraphics");

  return {
    minPrice: minPriceStr ? Number(minPriceStr) : undefined,
    maxPrice: maxPriceStr ? Number(maxPriceStr) : undefined,
    category: getArr("category"),
    brand: getArr("brand"),
    subcategory: getArr("subcategory"),
    features: getArr("features"),
    screenSize: getArr("screenSize"),
    processorBrand: getArr("processorBrand") as any,
    processorSeries: getArr("processorSeries"),
    processorGeneration: getArr("processorGeneration"),
    dedicatedGpuBrand: getArr("dedicatedGpuBrand") as any,
    dedicatedGpuModel: getArr("dedicatedGpuModel"),
    integratedGpu: getArr("integratedGpu"),
    processorName: getArr("processorName"),
    hasDedicatedGraphics: hasDedStr !== null ? hasDedStr === "true" : undefined,
  };
}

export default function Products() {
  const { t } = useTranslation();
  const { category: categoryParam } = useParams();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const products = useStore((state) => state.products);
  const filters = useStore((state) => state.filters);
  const setFilters = useStore((state) => state.setFilters);
  const loadProducts = useStore((state) => state.loadProducts);
  const loading = useStore((state) => state.loading);
  const error = useStore((state) => state.error);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [openDrawer, setOpenDrawer] = useState(false);
  const productsPerPage = 12;

  // ─── refs for URL sync logic ─────────────────────────────────────────────
  // Tracks whether we've already processed the initial URL on mount
  const didReadFromUrl = useRef(false);
  // Prevents URL sync from running on the very first render (before the URL
  // read effect has had a chance to set the filters). Without this guard,
  // the sync effect fires with the empty initial store state and immediately
  // wipes the query-params out of the address bar on refresh.
  const isFirstRender = useRef(true);

  // Load products from Firebase on component mount
  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // On first mount: read filters from URL query params
  useEffect(() => {
    if (didReadFromUrl.current) return;
    didReadFromUrl.current = true;

    // Only apply if there are actual query params
    if (location.search && location.search.length > 1) {
      const fromUrl = searchParamsToFilters(searchParams);
      // Merge with category from URL path param if present
      const merged = { ...filters, ...fromUrl };
      if (categoryParam && !merged.category) {
        merged.category = [decodeURIComponent(categoryParam)];
      }
      setFilters(merged as any);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Whenever filters change → sync URL (only on /products route)
  useEffect(() => {
    // Skip the very first execution: at that point the URL-read effect above
    // has not yet applied the params from the address bar, so syncing here
    // would overwrite the URL with an empty query string.
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (categoryParam) return; // /products/:category path – skip URL sync

    const newParams = filtersToSearchParams(filters);
    const newStr = newParams.toString();
    const currentStr = searchParams.toString();
    if (newStr !== currentStr) {
      setSearchParams(newParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // Read category from URL path param and update filters
  useEffect(() => {
    if (categoryParam) {
      // Decode the category parameter (handle Arabic text)
      const decodedCategory = decodeURIComponent(categoryParam);
      const currentCategories = filters.category || [];
      const isSame = currentCategories.length === 1 && currentCategories[0] === decodedCategory;

      if (!isSame) {
        setFilters({
          ...filters,
          category: [decodedCategory],
          subcategory: undefined, // Reset subcategory when category changes
          brand: undefined, // Reset brand when category changes
          color: undefined, // Reset color when category changes
          size: undefined, // Reset size when category changes
        });
      }
    } else if (!location.search && filters.category && filters.category.length > 0) {
      // If no category in URL path and no query params either, clear category filter
      setFilters({
        ...filters,
        category: undefined,
        subcategory: undefined,
        brand: undefined,
        color: undefined,
        size: undefined,
      });
    }
  }, [categoryParam]);

  // Apply filters to products
  const filteredProducts = products?.filter((product) => {
    let matchesSearch = true;
    let matchesCategory = true;
    let matchesSubcategory = true;
    let matchesBrand = true;
    let matchesPrice = true;
    let matchesColor = true;
    let matchesSize = true;
    let matchesSupplier = true;
    let matchesProcessorName = true;
    let matchesDedicatedGraphicsName = true;
    let matchesHasDedicatedGraphics = true;
    let matchesScreenSize = true;
    let matchesProcessorBrand = true;
    let matchesProcessorGeneration = true;
    let matchesProcessorSeries = true;
    let matchesIntegratedGpu = true;
    let matchesDedicatedGpuBrand = true;
    let matchesDedicatedGpuModel = true;

    // Exclude archived products
    if (product.isArchived) {
      return false;
    }

    if (filters.search) {
      matchesSearch = product.name
        .toLowerCase()
        .includes(filters.search.toLowerCase());
    }

    if (filters.category && filters.category.length > 0) {
      matchesCategory = filters.category.includes(product.category);
    }

    if (filters.subcategory && filters.subcategory.length > 0) {
      matchesSubcategory = filters.subcategory.includes(product.subcategory || "");
    }

    if (filters.brand && filters.brand.length > 0) {
      matchesBrand = filters.brand.includes(product.brand);
    }

    if (filters.minPrice !== undefined) {
      matchesPrice = product.price >= filters.minPrice;
    }

    if (filters.maxPrice !== undefined) {
      matchesPrice = matchesPrice && product.price <= filters.maxPrice;
    }

    if (filters.color && filters.color.length > 0) {
      const productColors = product.color?.split(",").map(c => c.trim()) || [];
      matchesColor = filters.color.some(c => productColors.includes(c));
    }

    if (filters.processorName && filters.processorName.length > 0) {
      matchesProcessorName = filters.processorName.includes(product.processor?.name || "");
    }

    if (filters.dedicatedGraphicsName && filters.dedicatedGraphicsName.length > 0) {
      matchesDedicatedGraphicsName = filters.dedicatedGraphicsName.includes(product.dedicatedGraphics?.name || "");
    }

    if (filters.hasDedicatedGraphics !== undefined) {
      matchesHasDedicatedGraphics = !!product.dedicatedGraphics === filters.hasDedicatedGraphics;
    }

    if (filters.size && filters.size.length > 0) {
      const productSizes = product.size?.split(",").map(s => s.trim()) || [];
      matchesSize = filters.size.some(s => productSizes.includes(s));
    }

    if (filters.screenSize && filters.screenSize.length > 0) {
      matchesScreenSize =
        product.display?.sizeInches !== undefined
          ? filters.screenSize.includes(String(product.display.sizeInches))
          : false;
    }

    // Features filter
    if (filters.features && filters.features.length > 0) {
      const productFeatures = [];
      const termTouch = "touch";
      const termX360 = "x360";

      if (product.name.toLowerCase().includes(termTouch) ||
        product.description.toLowerCase().includes(termTouch) ||
        product.display?.resolution?.toLowerCase().includes(termTouch) ||
        product.display?.panelType?.toLowerCase().includes(termTouch)) {
        productFeatures.push('touch');
      }

      if (product.name.toLowerCase().includes(termX360) ||
        product.description.toLowerCase().includes(termX360)) {
        productFeatures.push('x360');
      }

      if (product.name.toLowerCase().includes('detachable') ||
        product.description.toLowerCase().includes('detachable')) {
        productFeatures.push('detachable');
      }

      // Check if product has any of the selected features
      if (!filters.features.some(f => productFeatures.includes(f))) {
        return false;
      }
    }

    // Processor brand filter (multiple selection)
    if (filters.processorBrand && filters.processorBrand.length > 0) {
      const processorBrand = product.processor?.processorBrand;
      if (processorBrand === "Intel" || processorBrand === "AMD" || processorBrand === "Other") {
        matchesProcessorBrand = filters.processorBrand.includes(processorBrand);
      } else {
        matchesProcessorBrand = false;
      }
    }

    // Processor generation filter (multiple selection)
    if (filters.processorGeneration && filters.processorGeneration.length > 0) {
      matchesProcessorGeneration = filters.processorGeneration.includes(
        product.processor?.processorGeneration || ""
      );
    }

    // Processor series filter (multiple selection)
    if (filters.processorSeries && filters.processorSeries.length > 0) {
      matchesProcessorSeries = filters.processorSeries.includes(
        product.processor?.processorSeries || ""
      );
    }

    // Integrated GPU filter (multiple selection)
    if (filters.integratedGpu && filters.integratedGpu.length > 0) {
      matchesIntegratedGpu = filters.integratedGpu.includes(
        product.processor?.integratedGpu || ""
      );
    }

    // Dedicated GPU brand filter (multiple selection)
    if (filters.dedicatedGpuBrand && filters.dedicatedGpuBrand.length > 0) {
      const dedicatedGpuBrand = product.dedicatedGraphics?.dedicatedGpuBrand;
      if (dedicatedGpuBrand === "NVIDIA" || dedicatedGpuBrand === "AMD" || dedicatedGpuBrand === "Intel" || dedicatedGpuBrand === "Custom") {
        matchesDedicatedGpuBrand = filters.dedicatedGpuBrand.includes(dedicatedGpuBrand);
      } else {
        matchesDedicatedGpuBrand = false;
      }
    }

    // Dedicated GPU model filter (multiple selection)
    if (filters.dedicatedGpuModel && filters.dedicatedGpuModel.length > 0) {
      matchesDedicatedGpuModel = filters.dedicatedGpuModel.includes(
        product.dedicatedGraphics?.dedicatedGpuModel || ""
      );
    }

    // Removed supplier filter for customers

    return (
      matchesSearch &&
      matchesCategory &&
      matchesSubcategory &&
      matchesBrand &&
      matchesPrice &&
      matchesColor &&
      matchesSize &&
      matchesProcessorName &&
      matchesDedicatedGraphicsName &&
      matchesHasDedicatedGraphics &&
      matchesScreenSize &&
      matchesProcessorBrand &&
      matchesProcessorGeneration &&
      matchesProcessorSeries &&
      matchesIntegratedGpu &&
      matchesDedicatedGpuBrand &&
      matchesDedicatedGpuModel
    );
  });

  // Apply sorting if needed
  const sortedProducts = [...(filteredProducts || [])].sort((a, b) => {
    // If user has selected a sort option, use it
    if (filters.sortBy === "price-asc") {
      return a.price - b.price;
    } else if (filters.sortBy === "price-desc") {
      return b.price - a.price;
    } else if (filters.sortBy === "name-asc") {
      return a.name.localeCompare(b.name);
    } else if (filters.sortBy === "name-desc") {
      return b.name.localeCompare(a.name);
    }

    // Default sorting: by displayPriority (lower number = higher priority)
    // Products without displayPriority or with 0 will be shown after products with priority
    const aPriority = (a.displayPriority && a.displayPriority > 0) ? a.displayPriority : Number.MAX_SAFE_INTEGER;
    const bPriority = (b.displayPriority && b.displayPriority > 0) ? b.displayPriority : Number.MAX_SAFE_INTEGER;

    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }

    // If both have same priority (or both don't have priority), sort by creation date (newest first)
    const aDate = new Date(a.createdAt || 0).getTime();
    const bDate = new Date(b.createdAt || 0).getTime();
    return bDate - aDate;
  });

  // Pagination logic
  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = sortedProducts.slice(
    indexOfFirstProduct,
    indexOfLastProduct
  );
  const totalPages = Math.ceil(sortedProducts.length / productsPerPage);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleViewProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  // Create page numbers array for pagination
  const pageNumbers = [];
  for (let i = 1; i <= totalPages; i++) {
    pageNumbers.push(i);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SEOHelmet
        title="جميع المنتجات - لابتوبات وكمبيوترات"
        description="تصفح جميع اللابتوبات والكمبيوترات المتوفرة في شركة الحمد للابتوبات. HP، Dell، Lenovo، Asus، MSI، Apple MacBook وجميع الماركات العالمية بأفضل الأسعار."
        keywords="لابتوبات, كمبيوترات, HP, Dell, Lenovo, Asus, MSI, Apple MacBook, Gaming Laptops, لاب توب جيمنج, لاب توب للبرمجة, شركة الحمد للابتوبات"
        url="/products"
      />
      <div className="container py-8">


        <ActiveFilters />

        <div className="w-full mb-6">
          <ProductSearch
            value={filters.search || ""}
            onChange={(value) => setFilters({ ...filters, search: value })}
          />
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Mobile Filter Button - Opens from bottom */}
          {/* Mobile Filter Button - Opens from bottom */}
          <div className="md:hidden mb-4">
            <Drawer open={openDrawer} onOpenChange={setOpenDrawer}>
              <DrawerTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full font-bold text-primary border-primary hover:bg-primary hover:text-white transition-all duration-300 shadow-sm"
                >
                  <Filter className="h-4 w-4 ml-2" />
                  التصفية حسب
                </Button>
              </DrawerTrigger>
              <DrawerContent>
                <div className="mx-auto w-full max-w-sm">
                  <DrawerHeader>
                    <DrawerTitle>{t("filters.title")}</DrawerTitle>
                  </DrawerHeader>
                  <div className="p-4 overflow-y-auto max-h-[80vh]">
                    <ProductFilters />
                  </div>
                  <DrawerFooter className="border-t">
                    <Button
                      variant="outline"
                      onClick={() => setOpenDrawer(false)}
                      className="w-full"
                    >
                      {t("filters.apply")}
                    </Button>
                  </DrawerFooter>
                </div>
              </DrawerContent>
            </Drawer>
          </div>


          {/* Desktop Sidebar */}
          <div className="hidden md:block lg:w-72 w-60 shrink-0">
            <div className="bg-card rounded-lg border p-4 sticky top-20">
              <h2 className="text-lg font-semibold mb-4">
                {t("filters.title")}
              </h2>
              <ProductFilters />
            </div>
          </div>

          {/* Products Grid */}
          <div className="flex-1">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-2 text-muted-foreground">جاري تحميل المنتجات...</span>
              </div>
            ) : currentProducts.length > 0 ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3  xl:grid-cols-4 gap-4">
                  {currentProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onView={() => handleViewProduct(product)}
                    />
                  ))}
                </div>

                {/* Pagination */}
                <div className="mt-8">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() =>
                            currentPage > 1 && handlePageChange(currentPage - 1)
                          }
                          className={
                            currentPage === 1
                              ? "pointer-events-none opacity-50"
                              : ""
                          }
                        />
                      </PaginationItem>

                      {pageNumbers.map((number) => {
                        // Show first page, last page, current page, and pages adjacent to current page
                        if (
                          number === 1 ||
                          number === totalPages ||
                          (number >= currentPage - 1 &&
                            number <= currentPage + 1)
                        ) {
                          return (
                            <PaginationItem key={number}>
                              <PaginationLink
                                isActive={currentPage === number}
                                onClick={() => handlePageChange(number)}
                              >
                                {number}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        }

                        // Show ellipsis
                        if (
                          number === currentPage - 2 ||
                          number === currentPage + 2
                        ) {
                          return (
                            <PaginationItem key={number}>
                              <PaginationEllipsis />
                            </PaginationItem>
                          );
                        }

                        return null;
                      })}

                      <PaginationItem>
                        <PaginationNext
                          onClick={() =>
                            currentPage < totalPages &&
                            handlePageChange(currentPage + 1)
                          }
                          className={
                            currentPage === totalPages
                              ? "pointer-events-none opacity-50"
                              : ""
                          }
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  {t("products.noProductsFound")}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
        />
      )}

      <Footer />
    </div>
  );
}
