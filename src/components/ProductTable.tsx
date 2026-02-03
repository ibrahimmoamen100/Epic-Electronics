import { Product } from "@/types/product";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDistanceToNow, format } from "date-fns";
import { ar } from "date-fns/locale";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Copy,
  Timer,
  ArrowDownToLine,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import { DEFAULT_SUPPLIER } from "@/constants/supplier";
import { formatCurrency } from "@/utils/format";
import { Input } from "@/components/ui/input";

interface ProductTableProps {
  products?: Product[];
  searchQuery: string;
  onEdit: (product: Product) => void;
  onDelete: (productId: string) => void;
  onUpdateQuantity?: (productId: string, newQuantity: number) => void;
  onUpdatePriority?: (productId: string, newPriority: number | null) => Promise<boolean>;
}

export function ProductTable({
  products = [],
  searchQuery,
  onEdit,
  onDelete,
  onUpdateQuantity,
  onUpdatePriority,
}: ProductTableProps) {
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [editingQuantity, setEditingQuantity] = useState<string | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editingPriority, setEditingPriority] = useState<string | null>(null);
  const [editingPriorityProductId, setEditingPriorityProductId] = useState<string | null>(null);

  const filteredProducts = (products || []).filter(
    (product) =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success("Product ID copied to clipboard");
  };

  const handleDeleteClick = (product: Product) => {
    setProductToDelete(product);
  };

  const handleConfirmDelete = () => {
    if (productToDelete) {
      onDelete(productToDelete.id);
      setProductToDelete(null);
      toast.success("Product deleted successfully");
    }
  };

  const handleQuantityEdit = (productId: string, currentQuantity: number) => {
    setEditingProductId(productId);
    setEditingQuantity(currentQuantity.toString());
  };

  const handleQuantitySave = () => {
    if (editingProductId && editingQuantity && onUpdateQuantity) {
      const newQuantity = parseInt(editingQuantity);
      if (!isNaN(newQuantity) && newQuantity >= 0) {
        onUpdateQuantity(editingProductId, newQuantity);
        toast.success("تم تحديث الكمية بنجاح");
      } else {
        toast.error("يرجى إدخال رقم صحيح");
      }
    }
    setEditingProductId(null);
    setEditingQuantity(null);
  };

  const handleQuantityCancel = () => {
    setEditingProductId(null);
    setEditingQuantity(null);
  };

  const handlePriorityEdit = (productId: string, currentPriority: number | undefined) => {
    setEditingPriorityProductId(productId);
    setEditingPriority(currentPriority?.toString() || "");
  };

  const handlePrioritySave = async () => {
    if (editingPriorityProductId && onUpdatePriority) {
      // Treat empty string or 0 as null (no priority)
      const parsedValue = editingPriority === "" ? null : parseInt(editingPriority);
      const newPriority = (parsedValue === null || parsedValue === 0) ? null : parsedValue;

      if (newPriority === null || (!isNaN(newPriority) && newPriority > 0)) {
        const success = await onUpdatePriority(editingPriorityProductId, newPriority);
        if (success) {
          toast.success("تم تحديث أولوية الظهور بنجاح");
        }
      } else {
        toast.error("يرجى إدخال رقم صحيح (1 أو أكثر)");
      }
    }
    setEditingPriorityProductId(null);
    setEditingPriority(null);
  };

  const handlePriorityCancel = () => {
    setEditingPriorityProductId(null);
    setEditingPriority(null);
  };

  return (
    <>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px] text-center">ID</TableHead>
              <TableHead className="w-[300px]">المنتج</TableHead>
              <TableHead className="w-[120px] text-center">
                العلامة التجارية
              </TableHead>
              <TableHead className="w-[120px] text-center">السعر</TableHead>
              <TableHead className="w-[120px] text-center">التصنيف</TableHead>
              {/* <TableHead className="w-[120px] text-center">الألوان</TableHead> */}
              <TableHead className="w-[120px] text-center">المورد</TableHead>
              <TableHead className="w-[120px] text-center">الكمية</TableHead>
              <TableHead className="w-[100px] text-center">
                أولوية الظهور
              </TableHead>
              <TableHead className="w-[150px] text-center">
                العرض الخاص
              </TableHead>
              <TableHead className="w-[150px] text-center">
                تاريخ الإضافة
              </TableHead>
              <TableHead className="w-[80px] text-center">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                      {product.id.slice(0, 8)}...
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleCopyId(product.id)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-4">
                    <div className="relative h-16 w-16 rounded-lg overflow-hidden shrink-0">
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium">{product.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {product.description?.slice(0, 50)}...
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className="font-normal">
                    {product.brand}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  {product.specialOffer && product.discountPercentage ? (
                    <div className="flex flex-col items-center gap-1">
                      <Badge variant="destructive" className="w-fit">
                        {formatCurrency(
                          product.discountPrice ||
                          (product.price -
                            (product.price * product.discountPercentage) / 100),
                          'جنيه'
                        )}
                      </Badge>
                      <span className="text-muted-foreground line-through text-xs">
                        {formatCurrency(product.price, 'جنيه')}
                      </span>
                    </div>
                  ) : (
                    <span>{formatCurrency(product.price, 'جنيه')}</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex flex-col items-center gap-1">
                    <Badge variant="outline" className="font-normal">
                      {product.category}
                    </Badge>
                    {product.subcategory && (
                      <div className="flex items-center gap-1">
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 128 128"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className="text-muted-foreground"
                          style={{ transform: "rotate(0deg)" }}
                        >
                          <path
                            d="M78.1 0v6.2c22.4 0 40.5 18.2 40.5 40.6s-18.1 40.6-40.5 40.6H17.9l27.9-28-4.5-4.5L5.5 90.8l36 36.2 4.5-4.5-28.8-28.9h60.9c25.8 0 46.7-21 46.7-46.8S103.9 0 78.1 0z"
                            stroke="currentColor"
                            strokeWidth="10"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <Badge
                          variant="secondary"
                          className="font-normal text-xs"
                        >
                          {product.subcategory}
                        </Badge>
                      </div>
                    )}
                  </div>
                </TableCell>
                {/* <TableCell className="text-center">
                  <div className="flex justify-center gap-1">
                    {product.color.split(",").map((color, index) => (
                      <div
                        key={index}
                        className="h-6 w-6 rounded-full border"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </TableCell> */}
                <TableCell className="text-center">
                  <Badge variant="outline" className="font-normal">
                    {product.wholesaleInfo?.supplierName ||
                      DEFAULT_SUPPLIER.name}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex flex-col items-center gap-1">
                    {editingProductId === product.id ? (
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min="0"
                          value={editingQuantity || ""}
                          onChange={(e) => setEditingQuantity(e.target.value)}
                          className="w-16 h-8 text-center"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleQuantitySave();
                            } else if (e.key === "Escape") {
                              handleQuantityCancel();
                            }
                          }}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleQuantitySave}
                          className="h-8 w-8 p-0"
                        >
                          ✓
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleQuantityCancel}
                          className="h-8 w-8 p-0"
                        >
                          ✕
                        </Button>
                      </div>
                    ) : (
                      <div
                        className="cursor-pointer hover:bg-gray-100 p-1 rounded"
                        onClick={() => handleQuantityEdit(product.id, product.wholesaleInfo?.quantity || 0)}
                        title="انقر لتعديل الكمية"
                      >
                        <Badge
                          variant={product.wholesaleInfo?.quantity && product.wholesaleInfo.quantity > 0 ? "default" : "destructive"}
                          className="font-normal"
                        >
                          {product.wholesaleInfo?.quantity || 0} متاح
                        </Badge>
                      </div>
                    )}
                    {product.wholesaleInfo?.purchasedQuantity && (
                      <span className="text-xs text-muted-foreground">
                        تم شراء: {product.wholesaleInfo.purchasedQuantity}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  {editingPriorityProductId === product.id ? (
                    <div className="flex items-center justify-center gap-1">
                      <Input
                        type="number"
                        min="1"
                        placeholder="بدون"
                        value={editingPriority || ""}
                        onChange={(e) => setEditingPriority(e.target.value)}
                        className="w-16 h-8 text-center"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handlePrioritySave();
                          } else if (e.key === "Escape") {
                            handlePriorityCancel();
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handlePrioritySave}
                        className="h-8 w-8 p-0"
                      >
                        ✓
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handlePriorityCancel}
                        className="h-8 w-8 p-0"
                      >
                        ✕
                      </Button>
                    </div>
                  ) : (
                    <div
                      className="cursor-pointer hover:bg-gray-100 p-1 rounded"
                      onClick={() => handlePriorityEdit(product.id, product.displayPriority)}
                      title="انقر لتعديل الأولوية"
                    >
                      <Badge
                        variant={product.displayPriority && product.displayPriority > 0 ? "default" : "secondary"}
                        className="font-normal"
                      >
                        {product.displayPriority && product.displayPriority > 0 ? product.displayPriority : "بدون"}
                      </Badge>
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {product.specialOffer ? (
                    <div className="flex flex-col items-center gap-1">
                      <Badge variant="secondary" className="w-fit">
                        {product.discountPercentage}% خصم
                      </Badge>
                      {product.offerEndsAt && (
                        <div className="flex items-center justify-center text-xs gap-1 text-muted-foreground">
                          <Timer className="h-3 w-3" />
                          <span>
                            {formatDistanceToNow(
                              new Date(product.offerEndsAt),
                              { addSuffix: true }
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">-</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-sm">
                      {format(
                        new Date(product.createdAt || new Date()),
                        "dd/MM/yyyy hh:mm a",
                        { locale: ar }
                      )
                        .replace("AM", "ص")
                        .replace("PM", "م")}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(
                        new Date(product.createdAt || new Date()),
                        { addSuffix: true, locale: ar }
                      )}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">فتح القائمة</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => onEdit(product)}
                        className="flex items-center gap-2"
                      >
                        <Pencil className="h-4 w-4" />
                        تعديل
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDeleteClick(product)}
                        className="flex items-center gap-2 text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                        حذف
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleCopyId(product.id)}
                        className="flex items-center gap-2"
                      >
                        <Copy className="h-4 w-4" />
                        نسخ المعرف
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog
        open={!!productToDelete}
        onOpenChange={() => setProductToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
            <AlertDialogDescription>
              لا يمكن التراجع عن هذا الإجراء. سيتم حذف المنتج نهائياً.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
