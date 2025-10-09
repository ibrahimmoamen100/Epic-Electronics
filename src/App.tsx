import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { createPortal } from "react-dom";
import { Suspense, lazy } from "react";
import "./i18n/config";
import { ScrollToTop } from "./components/ScrollToTop";
import { Layout } from "./components/Layout";
import ErrorBoundary from "./components/ErrorBoundary";
import { AuthProvider } from "@/contexts/AuthContext";
import { DataLoader } from "@/components/DataLoader";
import { analytics } from "@/lib/analytics";

// Lazy load pages with error handling
const Index = lazy(() => import("./pages/Index").catch(() => ({ default: () => <div>Error loading Index</div> })));
const Admin = lazy(() => import("./pages/Admin").catch(() => ({ default: () => <div>Error loading Admin</div> })));
const AdminOrders = lazy(() => import("./pages/admin/Orders").catch(() => ({ default: () => <div>Error loading AdminOrders</div> })));
const AdminAnalytics = lazy(() => import("./pages/admin/Analytics").catch(() => ({ default: () => <div>Error loading AdminAnalytics</div> })));
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

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          {createPortal(<Toaster />, document.body)}
          {createPortal(<Sonner />, document.body)}
          <DataLoader />
          <BrowserRouter>
            <ScrollToTop />
            <Layout>
              <ErrorBoundary>
                <Suspense fallback={<Loading />}>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/admin" element={<Admin />} />
                    <Route path="/admin/setup" element={<AdminSetup />} />
                    <Route path="/admin/orders" element={<AdminOrders />} />
                    <Route path="/admin/analytics" element={<AdminAnalytics />} />
                    <Route path="/admin/profit-analysis" element={<AdminProfitAnalysis />} />
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
                    <Route path="/orders" element={<Orders />} />
                    <Route path="/settings" element={<Settings />} />
                  </Routes>
                </Suspense>
              </ErrorBoundary>
            </Layout>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
