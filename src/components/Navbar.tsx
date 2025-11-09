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
  // احذف كل المستخدم وloading وكل ما يتعلق بالتحقق
  // const { userProfile, signInWithGoogle, signInWithGoogleRedirect, signOutUser, loading } = useAuth();
  // const [isSigningIn, setIsSigningIn] = useState(false);
  // const [isSigningOut, setIsSigningOut] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-auto items-center justify-between py-1 px-4 md:px-8">
        <div className="flex items-center gap-2">
          <Link to="/" className="text-3xl  font-bold">
            <img src='/logo.png' alt={STORE_LOGO_TEXT} className="w-auto h-16" />
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
            {/* فقط القائمة */}
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
                  {/* احذف كل منطقة auth من هنا */}

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
