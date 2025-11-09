import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
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
import { DEFAULT_SUPPLIER } from "@/constants/supplier";

export default function Products() {
  const { t } = useTranslation();
  const { category: categoryParam } = useParams();
  const navigate = useNavigate();
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

  // Load products from Firebase on component mount
  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Read category from URL and update filters
  useEffect(() => {
    if (categoryParam) {
      // Decode the category parameter (handle Arabic text)
      const decodedCategory = decodeURIComponent(categoryParam);
      if (decodedCategory !== filters.category) {
        setFilters({
          ...filters,
          category: decodedCategory,
          subcategory: undefined, // Reset subcategory when category changes
          brand: undefined, // Reset brand when category changes
          color: undefined, // Reset color when category changes
          size: undefined, // Reset size when category changes
        });
      }
    } else if (filters.category) {
      // If no category in URL but filters has category, clear it
      setFilters({
        ...filters,
        category: undefined,
        subcategory: undefined,
        brand: undefined,
        color: undefined,
        size: undefined,
      });
    }
  }, [categoryParam, filters.category, setFilters]);

  // Apply filters to products
  const filteredProducts = products?.filter((product) => {
    let matchesSearch = true;
    let matchesCategory = true;
    let matchesSubcategory = true;
    let matchesBrand = true;
    let matchesColor = true;
    let matchesSize = true;
    let matchesSupplier = true;
  let matchesProcessorName = true;
  let matchesDedicatedGraphicsName = true;
  let matchesHasDedicatedGraphics = true;

    // Exclude archived products
    if (product.isArchived) {
      return false;
    }

    if (filters.search) {
      matchesSearch = product.name
        .toLowerCase()
        .includes(filters.search.toLowerCase());
    }

    if (filters.category) {
      matchesCategory = product.category === filters.category;
    }

    if (filters.subcategory) {
      matchesSubcategory = product.subcategory === filters.subcategory;
    }

    if (filters.brand) {
      matchesBrand = product.brand === filters.brand;
    }

    if (filters.color) {
      matchesColor = product.color
        ?.split(",")
        .some((c) => c.trim() === filters.color);
    }

    if (filters.processorName) {
      matchesProcessorName = product.processor?.name === filters.processorName;
    }

    if (filters.dedicatedGraphicsName) {
      matchesDedicatedGraphicsName = product.dedicatedGraphics?.name === filters.dedicatedGraphicsName;
    }

    if (filters.hasDedicatedGraphics !== undefined) {
      matchesHasDedicatedGraphics = !!product.dedicatedGraphics === filters.hasDedicatedGraphics;
    }

    if (filters.size) {
      matchesSize = product.size
        ?.split(",")
        .some((s) => s.trim() === filters.size);
    }

    // Removed supplier filter for customers

    return (
      matchesSearch &&
      matchesCategory &&
      matchesSubcategory &&
      matchesBrand &&
      matchesColor &&
      matchesSize
      && matchesProcessorName
      && matchesDedicatedGraphicsName
      && matchesHasDedicatedGraphics
    );
  });

  // Apply sorting if needed
  const sortedProducts = [...(filteredProducts || [])].sort((a, b) => {
    if (filters.sortBy === "price-asc") {
      return a.price - b.price;
    } else if (filters.sortBy === "price-desc") {
      return b.price - a.price;
    } else if (filters.sortBy === "name-asc") {
      return a.name.localeCompare(b.name);
    } else if (filters.sortBy === "name-desc") {
      return b.name.localeCompare(a.name);
    }
    return 0;
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
        <div className="container py-8">

        <div className="w-full mb-6">
          <ProductSearch
            value={filters.search || ""}
            onChange={(value) => setFilters({ ...filters, search: value })}
          />
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Mobile Filter Button - Opens from bottom */}
          <div className="md:hidden mb-4">
            <Drawer open={openDrawer} onOpenChange={setOpenDrawer}>
              <DrawerTrigger asChild>
                <Button variant="outline" className="w-full">
                  <Filter className="h-4 w-4 mr-2" />
                  {t("filters.title")}
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
