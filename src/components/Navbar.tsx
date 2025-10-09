import { ShoppingCart, Search, Menu, User, LogOut } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore } from "@/store/useStore";
import { useTranslation } from "react-i18next";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ProductFilters } from "@/components/ProductFilters";
import { ProductSearch } from "@/components/ProductSearch";
import { Facebook, Instagram, Twitter } from "lucide-react";
import { UserMenu } from "@/components/UserMenu";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useState } from "react";
import { STORE_LOGO_TEXT } from "@/constants/store";

const navigation = [
  { name: "navigation.products", href: "/products" },
  { name: "navigation.about", href: "/about" },
  { name: "navigation.locations", href: "/locations" },
  // { name: "navigation.careers", href: "/careers" },
  // { name: "navigation.faq", href: "/faq" },
  // { name: "navigation.delivery", href: "/delivery" },
];

export function Navbar() {
  const cart = useStore((state) => state.cart);
  const setFilters = useStore((state) => state.setFilters);
  const filters = useStore((state) => state.filters);
  const { t } = useTranslation();
  const { userProfile, signInWithGoogle, signInWithGoogleRedirect, signOutUser, loading } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-auto items-center justify-between py-1 px-4 md:px-8">
        <div className="flex items-center gap-2">
          <Link to="/" className="text-6xl  font-bold">
            <img src="/logo1.png" alt="this logo" className="w-52 " />
            {/* {STORE_LOGO_TEXT} */}
          </Link>
        </div>

        <div className="hidden md:flex items-center gap-6">
          {navigation.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className="text-sm font-medium relative group transition-all duration-300 hover:text-primary"
            >
              {t(item.name)}
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {/* Show UserMenu only on desktop */}
            <div className="hidden md:block">
              <UserMenu />
            </div>
            
            <Link to="/cart">
              <Button variant="outline" size="icon" className="relative">
                <ShoppingCart className="h-4 w-4" />
                {cart.length > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                    {cart.length}
                  </span>
                )}
              </Button>
            </Link>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="md:hidden">
                  <Menu className="h-4 w-4" />
                  <span className="sr-only">Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[350px]">
                <div className="py-6">
                  {/* User Authentication Section - Mobile Only */}
                  <div className="mb-6 pb-6 border-b">
                    {loading ? (
                      <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-50">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                        <span className="text-sm text-gray-600">جاري التحميل...</span>
                      </div>
                    ) : userProfile ? (
                      <div className="px-4 py-3 rounded-lg bg-primary/5 border border-primary/10">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-primary font-semibold text-sm">
                              {userProfile.displayName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-sm">{userProfile.displayName}</p>
                            <p className="text-xs text-gray-600">{userProfile.email}</p>
                          </div>
                        </div>
                        <div className="mt-3 flex gap-2">
                          <Link
                            to="/orders"
                            className="flex-1 text-center text-xs bg-primary text-white py-2 px-3 rounded-md hover:bg-primary/90 transition-colors"
                          >
                            طلباتي
                          </Link>
                          <Link
                            to="/settings"
                            className="flex-1 text-center text-xs bg-gray-100 text-gray-700 py-2 px-3 rounded-md hover:bg-gray-200 transition-colors"
                          >
                            الإعدادات
                          </Link>
                        </div>
                        <div className="mt-3">
                          <Button
                            onClick={async () => {
                              setIsSigningOut(true);
                              try {
                                await signOutUser();
                                toast.success('تم تسجيل الخروج بنجاح');
                              } catch (error) {
                                console.error('Sign out error:', error);
                                toast.error('حدث خطأ أثناء تسجيل الخروج');
                              } finally {
                                setIsSigningOut(false);
                              }
                            }}
                            disabled={isSigningOut}
                            variant="outline"
                            size="sm"
                            className="w-full text-red-600 border-red-200 hover:bg-red-50"
                          >
                            {isSigningOut ? (
                              <>
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-600 border-t-transparent mr-2"></div>
                                جاري تسجيل الخروج...
                              </>
                            ) : (
                              <>
                                <LogOut className="h-4 w-4 mr-2" />
                                تسجيل الخروج
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <Button
                          onClick={async () => {
                            setIsSigningIn(true);
                            try {
                              const result = await signInWithGoogle();
                              if (!result.success) {
                                if (result.error?.includes('حظر النافذة المنبثقة') || 
                                    result.error?.includes('إضافة المتصفح')) {
                                  toast.info('جاري المحاولة بطريقة بديلة...');
                                  const redirectResult = await signInWithGoogleRedirect();
                                  if (!redirectResult.success) {
                                    toast.error('فشل تسجيل الدخول. يرجى المحاولة مرة أخرى.');
                                  }
                                } else {
                                  toast.error(result.error || 'حدث خطأ أثناء تسجيل الدخول');
                                }
                              } else {
                                toast.success('تم تسجيل الدخول بنجاح');
                              }
                            } catch (error: any) {
                              console.error('Sign in error:', error);
                              toast.error('حدث خطأ غير متوقع أثناء تسجيل الدخول');
                            } finally {
                              setIsSigningIn(false);
                            }
                          }}
                          disabled={isSigningIn}
                          className="w-full bg-primary hover:bg-primary/90 text-white"
                          size="sm"
                        >
                          {isSigningIn ? (
                            <>
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2"></div>
                              جاري تسجيل الدخول...
                            </>
                          ) : (
                            <>
                              <User className="h-4 w-4 mr-2" />
                              تسجيل الدخول بحساب Google
                            </>
                          )}
                        </Button>
                        <p className="text-xs text-gray-500 text-center">
                          سجل دخولك للوصول لجميع الميزات
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Navigation Links */}
                  <div className="space-y-4">
                    {navigation.map((item) => (
                      <Link
                        key={item.href}
                        to={item.href}
                        className="block text-sm font-medium px-4 py-2 rounded-lg hover:bg-primary/10 hover:text-primary transition-all duration-300"
                      >
                        {t(item.name)}
                      </Link>
                    ))}
                    <Link
                      to="/cart"
                      className="block text-sm font-medium px-4 py-2 rounded-lg hover:bg-primary/10 hover:text-primary transition-all duration-300"
                    >
                      {t("navigation.cart")}
                    </Link>
                  </div>

                  {/* Social Media Section */}
                  <div className="mt-8 pt-8 border-t">
                    <p className="mb-4 text-sm font-medium">
                      {t("navigation.followUs")}
                    </p>
                    <div className="flex space-x-4">
                      <a
                        href="https://facebook.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-primary"
                      >
                        <Facebook className="h-5 w-5" />
                      </a>
                      <a
                        href="https://instagram.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-primary"
                      >
                        <Instagram className="h-5 w-5" />
                      </a>
                      <a
                        href="https://twitter.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-primary"
                      >
                        <Twitter className="h-5 w-5" />
                      </a>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}
