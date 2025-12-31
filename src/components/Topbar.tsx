import { Facebook, Phone, MapPin } from "lucide-react";
import { CONTACT_PHONES } from "@/constants/supplier";
import { Link } from "react-router-dom";

export function Topbar() {
  return (
    <div className="bg-primary text-primary-foreground shadow-sm relative z-50">
      <div className="container flex h-12 items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-400 via-orange-500 to-purple-600 rounded-full blur opacity-60 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-pulse"></div>
            <a
              href={`tel:${CONTACT_PHONES.main}`}
              className="relative flex items-center flex-row-reverse gap-2 text-sm font-bold bg-white text-primary hover:text-primary-foreground px-4 py-1.5 rounded-full transition-all duration-300 hover:bg-transparent"
            >
              <Phone className="h-4 w-4" />
              <span dir="ltr">{CONTACT_PHONES.main}</span>
            </a>
          </div>
          <div className="w-px h-4 bg-primary-foreground/20 hidden sm:block" />

        </div>

        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-400 via-orange-500 to-purple-600 rounded-full blur opacity-60 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-pulse"></div>
          <Link
            to="/locations"
            className="relative flex items-center gap-2 text-sm font-bold bg-white text-primary hover:text-primary-foreground px-4 py-1.5 rounded-full transition-all duration-300 hover:bg-transparent"
          >
            <MapPin className="h-4 w-4" />
            <span>موقعنا</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
