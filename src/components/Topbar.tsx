import { Facebook, Phone, MapPin } from "lucide-react";
import { CONTACT_PHONES } from "@/constants/supplier";
import { Link } from "react-router-dom";

export function Topbar() {
  return (
    <div className="bg-primary text-primary-foreground shadow-sm relative z-50">
      <div className="container flex h-12 items-center justify-between">
        <div className="flex items-center gap-4">
          <a
            href={`tel:${CONTACT_PHONES.main}`}
            className="flex items-center flex-row-reverse gap-2 text-sm font-bold bg-white text-primary hover:text-primary-foreground hover:bg-primary/90 px-4 py-1.5 rounded-full transition-all duration-300"
          >
            <Phone className="h-4 w-4" />
            <span dir="ltr">{CONTACT_PHONES.main}</span>
          </a>
          <div className="w-px h-4 bg-primary-foreground/20 hidden sm:block" />

        </div>

        <Link
          to="/locations"
          className="flex items-center gap-2 text-sm font-bold bg-white text-primary hover:text-primary-foreground hover:bg-primary/90 px-4 py-1.5 rounded-full transition-all duration-300"
        >
          <MapPin className="h-4 w-4" />
          <span>موقعنا</span>
        </Link>
      </div>
    </div>
  );
}
