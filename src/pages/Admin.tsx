import { useState, useMemo, useCallback, useEffect } from "react";
import { useStore } from "@/store/useStore";
import { Product } from "@/types/product";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EditProductModal } from "@/components/EditProductModal";
import { ProductSearch } from "@/components/ProductSearch";
import { ProductTable } from "@/components/ProductTable";
import { ProductForm } from "@/components/ProductForm";
import { AdminFilters } from "@/components/AdminFilters";
import AdminLogin from "@/components/AdminLogin";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { toast } from "sonner";
import {
  Package,
  Tag,
  Percent,
  Timer,
  Building2,
  Calendar as CalendarIcon,
  ChevronDown,
  Filter,
  ShoppingCart,
  ClipboardList,
  Clock,
  CheckCircle,
  Truck,
  CheckSquare,
  XCircle,
  BarChart3,
  TrendingUp,
  LogOut,
  User,
  RotateCcw,
  UserCheck,
} from "lucide-react";
import { Helmet } from "react-helmet-async";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";
import { DEFAULT_SUPPLIER } from "@/constants/supplier";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useRevenue } from "@/hooks/useRevenue";
import { salesService } from "@/lib/firebase";
import { formatCurrency } from "@/utils/format";
import { initializeAdmin, cleanupLocalAdminConfig } from "@/lib/adminAuth";

interface Order {
  id: string;
  userId: string;
  items: any[];
  total: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  deliveryInfo: {
    fullName: string;
    phoneNumber: string;
    address: string;
    city: string;
    notes?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const Admin = () => {
  const navigate = useNavigate();
  const { isAuthenticated, session, loading: authLoading, error: authError, logout, login } = useAdminAuth();
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const { totalRevenue, revenueByStatus, orderStatistics, loading: revenueLoading, error: revenueError } = useRevenue();
  const [filters, setFilters] = useState({
    minPrice: undefined as number | undefined,
    maxPrice: undefined as number | undefined,
    category: undefined as string | undefined,
    brand: undefined as string | undefined,
    supplier: undefined as string | undefined,
    processorName: undefined as string | undefined,
    dedicatedGraphicsName: undefined as string | undefined,
    hasDedicatedGraphics: undefined as boolean | undefined,
    isArchived: false,
    archivedStatus: "active" as "all" | "archived" | "active",
    specialOffer: "all" as "all" | "with-offer" | "without-offer",
  });
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const { products, addProduct, deleteProduct, updateProduct, loadProducts, loading, error, updateProductQuantity } = useStore();

  // Monitor authentication state changes
  useEffect(() => {
    console.log('🔄 Admin: Authentication state changed:', {
      isAuthenticated,
      authLoading,
      session: session ? 'exists' : 'null',
      error: authError
    });

    // Force re-render if authentication state changes
    if (isAuthenticated && session) {
      console.log('🔄 Admin: Authenticated with session, forcing re-render...');
    }
  }, [isAuthenticated, authLoading, session, authError]);

  // Load products from Firebase on component mount
  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Clean up any locally stored admin config on mount for security
  useEffect(() => {
    cleanupLocalAdminConfig();
  }, []);

  // Show error toast if there's an error
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
    if (revenueError) {
      toast.error(`خطأ في تحميل البيانات المالية: ${revenueError}`);
    }
  }, [error, revenueError]);

  // Fetch orders
  // Remove old fetchOrders useEffect - now handled by useRevenue hook

  // Get unique suppliers from products
  const uniqueSuppliers = useMemo(() => {
    const suppliers = new Set<string>();
    products?.forEach((product) => {
      if (product.wholesaleInfo?.supplierName) {
        suppliers.add(product.wholesaleInfo.supplierName);
      }
    });
    return Array.from(suppliers);
  }, [products]);

  // Memoize statistics calculations
  const statistics = useMemo(
    () => ({
      totalProducts: products?.length || 0,
      totalCategories: new Set(products?.map((p) => p.category)).size,
      totalBrands: new Set(products?.map((p) => p.brand)).size,
      totalSuppliers: uniqueSuppliers.length,
      productsWithOffers: products?.filter((p) => p.specialOffer).length || 0,
      archivedProducts: products?.filter((p) => p.isArchived).length || 0,
      totalOrders: orderStatistics?.totalOrders || 0,
      pendingOrders: orderStatistics?.pendingOrders || 0,
      confirmedOrders: orderStatistics?.confirmedOrders || 0,
      shippedOrders: orderStatistics?.shippedOrders || 0,
      deliveredOrders: orderStatistics?.deliveredOrders || 0,
      cancelledOrders: orderStatistics?.cancelledOrders || 0,
      totalRevenue: totalRevenue,
    }),
    [products, uniqueSuppliers, orderStatistics, totalRevenue]
  );

  const filterProductsByDate = (products: Product[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(
      today.getFullYear(),
      today.getMonth() - 1,
      today.getDate()
    );
    const yearAgo = new Date(
      today.getFullYear() - 1,
      today.getMonth(),
      today.getDate()
    );

    return products.filter((product) => {
      const productDate = new Date(product.createdAt || new Date());
      let matchesDate = true;

      if (dateRange?.from && dateRange?.to) {
        const startDate = new Date(dateRange.from);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(dateRange.to);
        endDate.setHours(23, 59, 59, 999);
        matchesDate = productDate >= startDate && productDate <= endDate;
      } else {
        switch (dateFilter) {
          case "today":
            matchesDate = productDate >= today;
            break;
          case "week":
            matchesDate = productDate >= weekAgo;
            break;
          case "month":
            matchesDate = productDate >= monthAgo;
            break;
          case "year":
            matchesDate = productDate >= yearAgo;
            break;
          default:
            matchesDate = true;
        }
      }

      const matchesPrice =
        (!filters.minPrice || product.price >= filters.minPrice) &&
        (!filters.maxPrice || product.price <= filters.maxPrice);

      const matchesCategory =
        !filters.category || product.category === filters.category;

      const matchesBrand = !filters.brand || product.brand === filters.brand;

      const matchesSupplier =
        !filters.supplier ||
        (filters.supplier === DEFAULT_SUPPLIER.name
          ? !product.wholesaleInfo?.supplierName
          : product.wholesaleInfo?.supplierName === filters.supplier);

      const matchesArchiveStatus =
        filters.archivedStatus === "all" ||
        (filters.archivedStatus === "archived" && product.isArchived) ||
        (filters.archivedStatus === "active" && !product.isArchived);

      const matchesSpecialOffer =
        filters.specialOffer === "all" ||
        (filters.specialOffer === "with-offer" && product.specialOffer) ||
        (filters.specialOffer === "without-offer" && !product.specialOffer);

      const matchesProcessorName =
        !filters.processorName || product.processor?.name === filters.processorName;

      const productDedicatedName = product.dedicatedGraphics?.name || undefined;
      const matchesDedicatedGraphicsName =
        !filters.dedicatedGraphicsName || productDedicatedName === filters.dedicatedGraphicsName;

      const matchesHasDedicatedGraphics =
        filters.hasDedicatedGraphics === undefined || !!product.dedicatedGraphics === filters.hasDedicatedGraphics;

      return (
        matchesDate &&
        matchesPrice &&
        matchesCategory &&
        matchesBrand &&
        matchesSupplier &&
        matchesArchiveStatus &&
        matchesSpecialOffer &&
        matchesProcessorName &&
        matchesDedicatedGraphicsName &&
        matchesHasDedicatedGraphics
      );
    });
  };

  const filteredProducts = filterProductsByDate(products);

  // Sort products by displayPriority (lower number = higher priority)
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    // Sort by displayPriority (lower number = higher priority)
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

  // Handle login using the hook's login function
  const handleLogin = useCallback(async (password: string) => {
    console.log('🔐 Admin: handleLogin called');
    const result = await login(password);
    console.log('🔐 Admin: handleLogin result:', result);

    if (result.success) {
      console.log('🔐 Admin: Login successful, waiting for state update...');
      console.log('🔐 Admin: Current state after login:', {
        isAuthenticated,
        authLoading,
        session: session ? 'exists' : 'null'
      });

      // Force a re-render by triggering a state update
      setTimeout(() => {
        console.log('🔐 Admin: Forcing re-render after successful login...');
        console.log('🔐 Admin: State after timeout:', {
          isAuthenticated,
          authLoading,
          session: session ? 'exists' : 'null'
        });

        // Additional verification
        if (!isAuthenticated) {
          console.log('🔐 Admin: WARNING - Still not authenticated after timeout!');
        } else {
          console.log('🔐 Admin: SUCCESS - Authentication confirmed after timeout!');
        }
      }, 200);
    }

    return result;
  }, [login]);



  const handleEdit = useCallback((product: Product) => {
    setEditingProduct(product);
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteProduct(id);
        toast.success("Product deleted successfully");
      } catch (error) {
        toast.error("Failed to delete product");
      }
    },
    [deleteProduct]
  );

  const handleUpdateQuantity = useCallback(
    async (productId: string, newQuantity: number) => {
      try {
        await updateProductQuantity(productId, newQuantity);
      } catch (error) {
        toast.error("فشل في تحديث الكمية");
      }
    },
    [updateProductQuantity]
  );

  const handleUpdatePriority = useCallback(
    async (productId: string, newPriority: number | null) => {
      try {
        const product = products.find(p => p.id === productId);
        if (product) {
          await updateProduct({ ...product, displayPriority: newPriority });
        }
      } catch (error) {
        toast.error("فشل في تحديث أولوية الظهور");
      }
    },
    [products, updateProduct]
  );

  // Reset all pages data
  // دالة لتهيئة إعدادات الإدارة يدوياً
  const handleInitializeAdmin = useCallback(async () => {
    try {
      console.log('🔧 Initializing admin configuration manually...');
      toast.loading('جاري تهيئة إعدادات الإدارة...', { id: 'init-admin' });

      const result = await initializeAdmin();

      if (result.success) {
        toast.success('تم تهيئة إعدادات الإدارة بنجاح! كلمة المرور: 45086932', {
          id: 'init-admin',
          duration: 5000
        });
        console.log('✅ Admin configuration initialized successfully');
      } else {
        toast.error(`فشل في تهيئة الإعدادات: ${result.error}`, {
          id: 'init-admin'
        });
        console.error('❌ Failed to initialize admin:', result.error);
      }
    } catch (error) {
      console.error('❌ Error initializing admin:', error);
      toast.error('حدث خطأ أثناء تهيئة الإعدادات', {
        id: 'init-admin'
      });
    }
  }, []);

  const handleResetAllPages = useCallback(async () => {
    // Show confirmation dialog
    const confirmed = window.confirm(
      "⚠️ تحذير: إعادة تعيين البيانات\n\n" +
      "هل أنت متأكد من إعادة تعيين جميع البيانات؟\n\n" +
      "سيتم حذف:\n" +
      "• جميع عمليات البيع في الكاشير (من Firebase و localStorage)\n" +
      "• بيانات إحصائيات الزوار\n" +
      "• بيانات تحليل الأرباح\n" +
      "• بيانات إدارة الطلبات\n\n" +
      "⚠️ لا يمكن التراجع عن هذا الإجراء!\n" +
      "سيتم إعادة تحميل الصفحة تلقائياً."
    );

    if (!confirmed) {
      toast.info("تم إلغاء عملية إعادة التعيين");
      return;
    }

    try {
      // Show loading toast
      toast.loading("جاري إعادة تعيين البيانات...", {
        id: "reset-data"
      });

      // Clear cashier sales data from Firebase
      console.log('Admin: Clearing sales from Firebase...');
      await salesService.clearAllSales();
      console.log('Admin: Firebase sales cleared successfully');

      // Clear cashier sales data from localStorage
      localStorage.removeItem("cashier-sales");

      // Clear analytics visitor data
      localStorage.removeItem("returning_visitor");

      // Clear any other related data
      const keysToRemove = [
        "cashier-sales",
        "returning_visitor",
        "analytics-data",
        "profit-analysis-data",
        "orders-data"
      ];

      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
      });

      // Update toast to success
      toast.success("تم إعادة تعيين جميع البيانات بنجاح", {
        id: "reset-data"
      });

      // Force page refresh to ensure all components reload with fresh data
      setTimeout(() => {
        window.location.reload();
      }, 1500);

    } catch (error) {
      console.error("Error resetting data:", error);
      toast.error("حدث خطأ أثناء إعادة تعيين البيانات", {
        id: "reset-data"
      });
    }
  }, []);

  const handleSaveEdit = useCallback(
    async (updatedProduct: Product) => {
      try {
        await updateProduct(updatedProduct);
        setEditingProduct(null);
        toast.success("Product updated successfully");
      } catch (error) {
        toast.error("Failed to update product");
      }
    },
    [updateProduct]
  );

  // Debug logging
  console.log('🔍 Admin component state:', {
    isAuthenticated,
    authLoading,
    session: session ? 'exists' : 'null',
    error: authError
  });

  // Additional debugging
  console.log('🔍 isAuthenticated type:', typeof isAuthenticated);
  console.log('🔍 isAuthenticated value:', isAuthenticated);
  console.log('🔍 authLoading value:', authLoading);
  console.log('🔍 session details:', session ? {
    token: session.token ? 'exists' : 'null',
    isAuthenticated: session.isAuthenticated,
    expiresAt: session.expiresAt
  } : 'null');

  // Show loading state while checking authentication
  if (authLoading) {
    console.log('🔄 Showing loading state...');
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Helmet>
          <title>جاري التحميل...</title>
          <meta
            name="description"
            content="جاري التحقق من تسجيل الدخول"
          />
        </Helmet>
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="text-muted-foreground">جاري التحقق من تسجيل الدخول...</span>
        </div>
      </div>
    );
  }

  // Show login form if not authenticated
  if (!isAuthenticated) {
    console.log('🔒 Showing login form (not authenticated)');
    console.log('🔒 Current state details:', {
      isAuthenticated,
      authLoading,
      session: session ? 'exists' : 'null',
      error: authError
    });
    return (
      <>
        <Helmet>
          <title>تسجيل دخول المسؤول</title>
          <meta
            name="description"
            content="صفحة تسجيل دخول المسؤول لنظام إدارة المتجر"
          />
        </Helmet>
        <AdminLogin onLogin={handleLogin} loading={authLoading} />
      </>
    );
  }

  console.log('✅ Showing admin dashboard (authenticated)');
  console.log('✅ Authentication confirmed:', {
    isAuthenticated,
    session: session ? 'exists' : 'null'
  });

  return (
    <div className="min-h-screen">
      <Helmet>
        <title>لوحة التحكم</title>
        <meta
          name="description"
          content="لوحة تحكم المسؤول لإدارة منتجات المتجر والمخزون"
        />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <main className="max-w-[90%] mx-auto py-8">
        <div className="mx-auto">
          <div className="mb-8 flex items-center justify-between">
            <h1 className="text-3xl font-bold">لوحة التحكم</h1>
            <div className="flex gap-2">
              <Button
                onClick={() => navigate("/admin/orders")}
                className="gap-2"
                aria-label="إدارة الطلبات"
              >
                <ClipboardList className="h-4 w-4" aria-hidden="true" />
                إدارة الطلبات
              </Button>

              <Button
                onClick={handleResetAllPages}
                variant="destructive"
                className="gap-2 hover:bg-red-700 border-2 border-red-600"
                aria-label="إعادة تعيين جميع البيانات"
                title="إعادة تعيين جميع البيانات (عمليات البيع، الإحصائيات، التحليلات)"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                إعادة تعيين البيانات
              </Button>
              <div className="flex items-center gap-2 ml-4 pl-4 border-l">
                {session && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span>المسؤول</span>
                  </div>
                )}
                <Button
                  onClick={logout}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  aria-label="تسجيل الخروج"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  تسجيل الخروج
                </Button>
              </div>
            </div>
          </div>

          {/* Statistics Section */}
          <div
            className="grid gap-4 md:grid-cols-6 mb-8"
            role="region"
            aria-label="إحصائيات المتجر"
          >
            <div className="bg-card rounded-lg border p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <Package
                  className="h-5 w-5 text-muted-foreground"
                  aria-hidden="true"
                />
                <h3 className="text-sm font-medium">إجمالي المنتجات</h3>
              </div>
              <p className="text-2xl font-bold mt-2">
                {statistics.totalProducts}
              </p>
            </div>
            <div className="bg-card rounded-lg border p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <Tag
                  className="h-5 w-5 text-muted-foreground"
                  aria-hidden="true"
                />
                <h3 className="text-sm font-medium">التصنيفات</h3>
              </div>
              <p className="text-2xl font-bold mt-2">
                {statistics.totalCategories}
              </p>
            </div>
            <div className="bg-card rounded-lg border p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <Tag
                  className="h-5 w-5 text-muted-foreground"
                  aria-hidden="true"
                />
                <h3 className="text-sm font-medium">العلامات التجارية</h3>
              </div>
              <p className="text-2xl font-bold mt-2">
                {statistics.totalBrands}
              </p>
            </div>
            <div className="bg-card rounded-lg border p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <Building2
                  className="h-5 w-5 text-muted-foreground"
                  aria-hidden="true"
                />
                <h3 className="text-sm font-medium">الموردين</h3>
              </div>
              <p className="text-2xl font-bold mt-2">
                {statistics.totalSuppliers}
              </p>
            </div>
            <div className="bg-card rounded-lg border p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <Percent
                  className="h-5 w-5 text-muted-foreground"
                  aria-hidden="true"
                />
                <h3 className="text-sm font-medium">العروض النشطة</h3>
              </div>
              <p className="text-2xl font-bold mt-2">
                {statistics.productsWithOffers}
              </p>
            </div>
            <div className="bg-card rounded-lg border p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <Timer
                  className="h-5 w-5 text-muted-foreground"
                  aria-hidden="true"
                />
                <h3 className="text-sm font-medium">المنتجات المؤرشفة</h3>
              </div>
              <p className="text-2xl font-bold mt-2">
                {statistics.archivedProducts}
              </p>
            </div>
          </div>

          {/* Orders Statistics Section */}
          <div
            className="grid gap-4 md:grid-cols-9 mb-8"
            role="region"
            aria-label="إحصائيات الطلبات"
          >
            {revenueLoading && (
              <div className="col-span-9 flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-2 text-muted-foreground">جاري تحميل بيانات الطلبات...</span>
              </div>
            )}
            {!revenueLoading && (
              <>
                <div className="bg-card rounded-lg border p-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <ClipboardList
                      className="h-5 w-5 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <h3 className="text-sm font-medium">إجمالي الطلبات</h3>
                  </div>
                  <p className="text-2xl font-bold mt-2">
                    {statistics.totalOrders}
                  </p>
                </div>
                <div className="bg-card rounded-lg border p-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Clock
                      className="h-5 w-5 text-yellow-600"
                      aria-hidden="true"
                    />
                    <h3 className="text-sm font-medium">قيد الانتظار</h3>
                  </div>
                  <p className="text-2xl font-bold mt-2 text-yellow-600">
                    {statistics.pendingOrders}
                  </p>
                </div>
                <div className="bg-card rounded-lg border p-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle
                      className="h-5 w-5 text-blue-600"
                      aria-hidden="true"
                    />
                    <h3 className="text-sm font-medium">تم التأكيد</h3>
                  </div>
                  <p className="text-2xl font-bold mt-2 text-blue-600">
                    {statistics.confirmedOrders}
                  </p>
                </div>
                <div className="bg-card rounded-lg border p-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Truck
                      className="h-5 w-5 text-purple-600"
                      aria-hidden="true"
                    />
                    <h3 className="text-sm font-medium">تم الشحن</h3>
                  </div>
                  <p className="text-2xl font-bold mt-2 text-purple-600">
                    {statistics.shippedOrders}
                  </p>
                </div>
                <div className="bg-card rounded-lg border p-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <CheckSquare
                      className="h-5 w-5 text-green-600"
                      aria-hidden="true"
                    />
                    <h3 className="text-sm font-medium">تم التوصيل</h3>
                  </div>
                  <p className="text-2xl font-bold mt-2 text-green-600">
                    {statistics.deliveredOrders}
                  </p>
                </div>
                <div className="bg-card rounded-lg border p-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <XCircle
                      className="h-5 w-5 text-red-600"
                      aria-hidden="true"
                    />
                    <h3 className="text-sm font-medium">ملغي</h3>
                  </div>
                  <p className="text-2xl font-bold mt-2 text-red-600">
                    {statistics.cancelledOrders}
                  </p>
                </div>
                <div className="bg-card rounded-lg border p-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <ShoppingCart
                      className="h-5 w-5 text-blue-600"
                      aria-hidden="true"
                    />
                    <h3 className="text-sm font-medium">مبيعات الكاشير</h3>
                  </div>
                  <p className="text-2xl font-bold mt-2 text-blue-600">
                    {orderStatistics?.totalCashierSales || 0}
                  </p>
                </div>
                <div className="bg-card rounded-lg border p-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-green-600 font-bold text-lg">$</span>
                    <h3 className="text-sm font-medium">إجمالي الإيرادات</h3>
                  </div>
                  <p className="text-2xl font-bold mt-2 text-green-600">
                    {formatCurrency((statistics.totalRevenue || 0), 'جنيه')}
                  </p>
                  <div className="text-xs text-gray-500 mt-1">
                    <div>طلبات: {formatCurrency((revenueByStatus?.delivered || 0), 'جنيه')}</div>
                    <div>كاشير: {formatCurrency((revenueByStatus?.cashier || 0), 'جنيه')}</div>
                  </div>
                </div>
              </>
            )}
          </div>

          <ProductForm onSubmit={addProduct} />

          <hr />
          <div className="mt-28 mb-8">
            {loading && (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-2 text-muted-foreground">جاري تحميل المنتجات...</span>
              </div>
            )}
            <Card className="p-6 mb-6 bg-card shadow-sm">
              <Collapsible
                open={isFiltersOpen}
                onOpenChange={setIsFiltersOpen}
                className="w-full space-y-2"
              >
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Filter className="h-5 w-5 text-primary" />
                      <h3 className="text-xl font-bold">تصفية المنتجات</h3>
                    </div>
                    <Button variant="ghost" size="sm" className="w-9 p-0">
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${isFiltersOpen ? "rotate-180" : "rotate-0"
                          }`}
                      />
                      <span className="sr-only">Toggle filters</span>
                    </Button>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4">
                  <AdminFilters
                    filters={filters}
                    onFilterChange={setFilters}
                    uniqueSuppliers={uniqueSuppliers}
                  />
                </CollapsibleContent>
              </Collapsible>
            </Card>
            <div className="flex gap-4 mb-4 w-full">
              <ProductSearch value={searchQuery} onChange={setSearchQuery} />
              <div className="flex gap-2">
                <Select
                  value={dateFilter}
                  onValueChange={(value) => {
                    setDateFilter(value);
                    if (value !== "custom") {
                      setDateRange(undefined);
                    }
                  }}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="فلتر حسب التاريخ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    <SelectItem value="today">اليوم</SelectItem>
                    <SelectItem value="week">الأسبوع</SelectItem>
                    <SelectItem value="month">الشهر</SelectItem>
                    <SelectItem value="year">السنة</SelectItem>
                    <SelectItem value="custom">تحديد نطاق تاريخ</SelectItem>
                  </SelectContent>
                </Select>
                {dateFilter === "custom" && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-[300px] justify-start text-left font-normal",
                          !dateRange && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange?.from ? (
                          dateRange.to ? (
                            <>
                              {format(dateRange.from, "PPP", { locale: ar })} -{" "}
                              {format(dateRange.to, "PPP", { locale: ar })}
                            </>
                          ) : (
                            format(dateRange.from, "PPP", { locale: ar })
                          )
                        ) : (
                          <span>اختر نطاق التاريخ</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="range"
                        selected={dateRange}
                        onSelect={setDateRange}
                        initialFocus
                        locale={ar}
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </div>
          </div>



          <ProductTable
            products={sortedProducts}
            searchQuery={searchQuery}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onUpdateQuantity={handleUpdateQuantity}
            onUpdatePriority={handleUpdatePriority}
          />
        </div>
      </main>

      <EditProductModal
        product={editingProduct}
        open={!!editingProduct}
        onOpenChange={(open) => !open && setEditingProduct(null)}
        onSave={handleSaveEdit}
      />
    </div>
  );
};

export default Admin;
