import { Globe, Facebook, Instagram, Twitter, Phone } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "react-i18next";
import { CONTACT_PHONES } from "@/constants/supplier";

export function Topbar() {
  const { i18n } = useTranslation();

  const handleLanguageChange = (value: string) => {
    i18n.changeLanguage(value);
    // Update document direction based on language
    document.documentElement.dir = value === "ar" ? "rtl" : "ltr";
  };

  return (
    <div className="bg-primary text-primary-foreground">
      <div className="container flex h-12 items-center justify-between">
        <div className="flex items-center   gap-2">
          <a
            href={`tel:${CONTACT_PHONES.main}`}
            className="flex items-center flex-row-reverse gap-1 border border-primary-foreground/80 rounded-full p-1 text-sm md:text-base hover:text-primary-foreground/80"
          >
            <Phone className="h-3 w-3" />
            {CONTACT_PHONES.main}
          </a>
          <div className="flex items-center gap-2">
            <a
              href="https://www.facebook.com/groups/elmargstore"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary-foreground/80 border border-primary-foreground/80 rounded-full p-1"
            >
              <Facebook className="h-4 w-4" />
            </a>

          </div>
        </div>

        <Select onValueChange={handleLanguageChange} defaultValue="ar">
          <SelectTrigger className="w-[120px] text-black border-none outline-none focus:outline-none focus:border-none shrink-0">
            <Globe className="mr-2 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent
            className="text-foreground bg-background"
            position="popper"
            sideOffset={4}
            align="end"
          >
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="ar">العربية</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
