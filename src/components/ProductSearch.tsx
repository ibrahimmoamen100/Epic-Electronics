import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface ProductSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export function ProductSearch({ value, onChange }: ProductSearchProps) {
  return (
    <div className="relative w-full">
      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="ابحث عن اسم المنتج"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-9 w-full"
      />
    </div>
  );
}
