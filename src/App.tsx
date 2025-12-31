import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { createPortal } from "react-dom";
import { Suspense, lazy } from "react";
import { Button } from "@/components/ui/button";
import "./i18n/config";
import { ScrollToTop } from "./components/ScrollToTop";
import { Layout } from "./components/Layout";
import ErrorBoundary from "./components/ErrorBoundary";
import { AuthProvider } from "@/contexts/AuthContext";
import { DataLoader } from "@/components/DataLoader";
import { analytics } from "@/lib/analytics";
import { useFacebookPixel } from "./useFacebookPixel";

// Lazy load pages with error handling
const Index = lazy(() => import("./pages/Index").catch(() => ({ default: () => <div>Error loading Index</div> })));
const Admin = lazy(() => import("./pages/Admin").catch(() => ({ default: () => <div>Error loading Admin</div> })));
const AdminOrders = lazy(() => import("./pages/admin/Orders").catch(() => ({ default: () => <div>Error loading AdminOrders</div> })));
const AdminAnalytics = lazy(async () => {
  try {
    const module = await import("./pages/admin/Analytics");
    return module;
  } catch (err: any) {
    console.error("Error loading AdminAnalytics:", err);
    return {
      default: () => (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-bold mb-2">خطأ في تحميل صفحة التحليلات</h2>
            <p className="text-muted-foreground">{err?.message || "خطأ غير معروف"}</p>
            <Button onClick={() => window.location.reload()} className="mt-4">
              إعادة تحميل الصفحة
            </Button>
          </div>
        </div>
      )
    };
  }
});
const AdminProfitAnalysis = lazy(() => import("./pages/admin/ProfitAnalysis").catch(() => ({ default: () => <div>Error loading AdminProfitAnalysis</div> })));
const AdminSetup = lazy(() => import("./pages/AdminSetup").catch(() => ({ default: () => <div>Error loading AdminSetup</div> })));
const Cashier = lazy(() => import("./pages/Cashier").catch(() => ({ default: () => <div>Error loading Cashier</div> })));
const Cart = lazy(() => import("./pages/Cart").catch(() => ({ default: () => <div>Error loading Cart</div> })));
const Products = lazy(() => import("./pages/Products").catch(() => ({ default: () => <div>Error loading Products</div> })));
const Locations = lazy(() => import("./pages/Locations").catch(() => ({ default: () => <div>Error loading Locations</div> })));
const About = lazy(() => import("./pages/About").catch(() => ({ default: () => <div>Error loading About</div> })));
const Careers = lazy(() => import("./pages/Careers").catch(() => ({ default: () => <div>Error loading Careers</div> })));
const ProductDetails = lazy(() => import("./pages/ProductDetails").catch(() => ({ default: () => <div>Error loading ProductDetails</div> })));
const FAQ = lazy(() => import("./pages/FAQ").catch(() => ({ default: () => <div>Error loading FAQ</div> })));
const Delivery = lazy(() => import("./pages/Delivery").catch(() => ({ default: () => <div>Error loading Delivery</div> })));
const Orders = lazy(() => import("./pages/Orders").catch(() => ({ default: () => <div>Error loading Orders</div> })));
const Settings = lazy(() => import("./pages/Settings").catch(() => ({ default: () => <div>Error loading Settings</div> })));
const Attendance = lazy(() => import("./pages/Attendance").catch(() => ({ default: () => <div>Error loading Attendance</div> })));
const Dashboard = lazy(() => import("./pages/Dashboard").catch(() => ({ default: () => <div>Error loading Dashboard</div> })));
import ProtectedDashboardRoute from "./components/ProtectedDashboardRoute";

// Loading component
const Loading = () => (
  <div className="flex min-h-screen items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
    },
  },
});

// New component that uses the Facebook Pixel hook
const AppRoutes = () => {
  useFacebookPixel(); // Now this is inside BrowserRouter context

  return (
    <>

      <ScrollToTop />
      <Layout>
        <ErrorBoundary>
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route path="/" element={<Index />} />

              {/* Dashboard & Protected Routes */}
              <Route path="/dashboard" element={<Dashboard />} />
              <Route element={<ProtectedDashboardRoute />}>
                <Route path="/orders" element={<AdminOrders />} />
                <Route path="/analytics" element={<AdminAnalytics />} />
                <Route path="/profit-analysis" element={<AdminProfitAnalysis />} />
                {/* Add other protected management pages if needed */}
              </Route>

              {/* Public/Other Routes */}
              <Route path="/admin" element={<Admin />} />
              <Route path="/admin/setup" element={<AdminSetup />} />

              {/* Redirects for old admin routes */}
              <Route path="/admin/orders" element={<Navigate to="/orders" replace />} />
              <Route path="/admin/analytics" element={<Navigate to="/analytics" replace />} />
              <Route path="/admin/profit-analysis" element={<Navigate to="/profit-analysis" replace />} />

              <Route path="/cashier" element={<Cashier />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/products" element={<Products />} />
              <Route path="/products/category/:category" element={<Products />} />
              {/* New SEO-friendly singular route */}
              <Route path="/product/:id" element={<ProductDetails />} />
              {/* Backward compatibility */}
              <Route path="/products/:id" element={<ProductDetails />} />
              <Route path="/locations" element={<Locations />} />
              <Route path="/about" element={<About />} />
              <Route path="/careers" element={<Careers />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/delivery" element={<Delivery />} />

              {/* Renamed Customer Orders Route */}
              <Route path="/my-orders" element={<Orders />} />

              <Route path="/settings" element={<Settings />} />
              <Route path="/attendance" element={<Attendance />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </Layout>
    </>
  );
};

const App = () => {
  return (
    <>
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <TooltipProvider>
              {createPortal(<Toaster />, document.body)}
              {createPortal(<Sonner />, document.body)}
              <DataLoader />
              <BrowserRouter>
                <AppRoutes />
              </BrowserRouter>
            </TooltipProvider>
          </AuthProvider>
        </QueryClientProvider>
      </HelmetProvider>
    </>
  );
};

export default App;