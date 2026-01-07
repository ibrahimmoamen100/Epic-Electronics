import React, { useState, useEffect, useCallback } from 'react';
import { Product, ProductSize, ProductAddon } from '@/types/product';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/utils/format';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Ruler,
  Plus,
  Check,
  ShoppingBag,
  Tag,
  Sparkles,
  Minus,
  ShoppingCart,
  Truck,
  CalendarClock
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export interface CheckoutFormData {
  fullName: string;
  phoneNumber: string;
  governorate: string;
  address: string;
  orderType: 'online_purchase' | 'reservation';
  appointmentDate?: string;
  appointmentTime?: string;
  notes?: string;
}

interface ProductOptionsProps {
  product: Product;
  currentPrice: number;
  undiscountedPrice?: number;
  maxQuantity?: number;
  quantity: number;
  onSelectionChange: (
    selectedSize: ProductSize | null,
    selectedAddons: ProductAddon[],
    finalPrice: number
  ) => void;
  onQuantityChange: (quantity: number) => void;
  onBuy: (quantity: number, formData: CheckoutFormData) => void;
}

export function ProductOptions({
  product,
  currentPrice,
  undiscountedPrice,
  maxQuantity = 999,
  quantity,
  onSelectionChange,
  onQuantityChange,
  onBuy
}: ProductOptionsProps) {
  const { t } = useTranslation();
  const [selectedSizeId, setSelectedSizeId] = useState<string | null>(null);
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);

  const [formData, setFormData] = useState<CheckoutFormData>({
    fullName: '',
    phoneNumber: '',
    governorate: '',
    address: '',
    orderType: 'online_purchase',
    appointmentDate: '',
    appointmentTime: '',
    notes: ''
  });

  const [formErrors, setFormErrors] = useState<Partial<Record<keyof CheckoutFormData, boolean>>>({});
  // Quantity state removed - controlled by parent

  // Calculate final price based on selections (without applying special offer discount)
  // The special offer discount is already applied in ProductDetails component
  const calculateFinalPrice = useCallback((sizeId: string | null, addonIds: string[]) => {
    let basePrice = product.price; // Base price

    // If sizes are available and one is selected, use that price instead of base price
    if (product.sizes && product.sizes.length > 0 && sizeId) {
      const selectedSize = product.sizes.find(size => size.id === sizeId);
      if (selectedSize) {
        basePrice = selectedSize.price;
      }
    }

    // Add addon prices
    if (product.addons && addonIds.length > 0) {
      const selectedAddons = product.addons.filter(addon => addonIds.includes(addon.id));
      selectedAddons.forEach(addon => {
        basePrice += addon.price_delta;
      });
    }

    // Return the calculated price without applying special offer discount
    // The discount will be applied in ProductDetails component
    return basePrice;
  }, [product.price, product.sizes, product.addons]);

  // Update parent component when selections change
  useEffect(() => {
    const selectedSize = selectedSizeId && product.sizes
      ? product.sizes.find(size => size.id === selectedSizeId) || null
      : null;

    const selectedAddons = product.addons
      ? product.addons.filter(addon => selectedAddonIds.includes(addon.id))
      : [];

    const finalPrice = calculateFinalPrice(selectedSizeId, selectedAddonIds);

    onSelectionChange(selectedSize, selectedAddons, finalPrice);
  }, [selectedSizeId, selectedAddonIds, product.sizes, product.addons, calculateFinalPrice, onSelectionChange]);

  // Initialize with first size if available
  useEffect(() => {
    if (product.sizes && product.sizes.length > 0 && !selectedSizeId) {
      setSelectedSizeId(product.sizes[0].id);
    }
  }, [product.sizes]);

  const handleSizeChange = (sizeId: string) => {
    setSelectedSizeId(sizeId);
  };

  const handleAddonToggle = (addonId: string, checked: boolean) => {
    if (checked) {
      setSelectedAddonIds(prev => [...prev, addonId]);
    } else {
      setSelectedAddonIds(prev => prev.filter(id => id !== addonId));
    }
  };

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity < 1) return;
    if (newQuantity > maxQuantity) {
      toast.warning(`أقصى كمية متاحة هي ${maxQuantity}`);
      return;
    }
    onQuantityChange(newQuantity);
  };

  const handleBuyClick = () => {
    // Validate quantity against stock
    if (quantity > maxQuantity) {
      toast.error("الكمية المطلوبة غير متوفرة");
      return;
    }

    // Validate Form
    const errors: Partial<Record<keyof CheckoutFormData, boolean>> = {};
    if (!formData.fullName.trim()) errors.fullName = true;
    if (!formData.phoneNumber.trim() || !/^01[0-9]{9,}$/.test(formData.phoneNumber)) errors.phoneNumber = true;

    // Conditional Validation
    if (formData.orderType === 'online_purchase') {
      if (!formData.governorate) errors.governorate = true;
      if (!formData.address.trim()) errors.address = true;
    } else {
      // Reservation validation
      if (!formData.appointmentDate) errors.appointmentDate = true;
      if (!formData.appointmentTime) errors.appointmentTime = true;
    }

    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      toast.error("يرجى ملء جميع الحقول المطلوبة بشكل صحيح");
      return;
    }

    onBuy(quantity, formData);
  };

  const hasSizes = product.sizes && product.sizes.length > 0;
  const hasAddons = product.addons && product.addons.length > 0;

  // Use passed undiscountedPrice or calculate it locally if not provided
  const originalPrice = undiscountedPrice ?? calculateFinalPrice(selectedSizeId, selectedAddonIds);

  return (
    <div className="space-y-8">
      {/* Sizes Section */}
      {hasSizes && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Ruler className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900"> حجم الرامات</h3>
              <p className="text-sm text-gray-500">اختر الحجم المناسب لك</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {product.sizes!.map((size) => (
              <button
                key={size.id}
                onClick={() => handleSizeChange(size.id)}
                className={`relative group p-4 rounded-xl border-2 transition-all duration-200 ${selectedSizeId === size.id
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
              >
                <div className="text-center space-y-2">
                  <div className="text-lg font-bold text-gray-900">
                    {size.label}
                  </div>
                  <div className="text-sm font-semibold text-primary">
                    {formatCurrency(size.price, 'جنيه')}
                  </div>
                </div>

                {selectedSizeId === size.id && (
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Addons Section */}
      {hasAddons && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Sparkles className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">الإضافات الاختيارية</h3>
              <p className="text-sm text-gray-500">اختر الإضافات التي تريدها</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {product.addons!.map((addon) => (
              <button
                key={addon.id}
                onClick={() => handleAddonToggle(addon.id, !selectedAddonIds.includes(addon.id))}
                className={`relative group p-4 rounded-xl border-2 transition-all duration-200 ${selectedAddonIds.includes(addon.id)
                  ? 'border-green-500 bg-green-50 ring-2 ring-green-200'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${selectedAddonIds.includes(addon.id)
                      ? 'border-green-500 bg-green-500'
                      : 'border-gray-300'
                      }`}>
                      {selectedAddonIds.includes(addon.id) && (
                        <Check className="h-3 w-3 text-white" />
                      )}
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-gray-900">{addon.label}</div>
                      <div className="text-sm text-gray-500">إضافة مميزة</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-green-100 text-green-700">
                      +{formatCurrency(addon.price_delta, 'جنيه')}
                    </Badge>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Final Price and Purchase Container */}
      <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl p-6 border border-primary/20">
        <div className="flex flex-col gap-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-lg">
                <ShoppingBag className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">السعر النهائي</h3>
                <p className="text-sm text-gray-500">شامل جميع الخيارات المختارة</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-primary">
                {formatCurrency(currentPrice * quantity, 'جنيه')}
              </div>
              {/* Show original price if discounted */}
              {currentPrice < originalPrice && (
                <div className="text-sm line-through text-gray-500 mt-1">
                  {formatCurrency(originalPrice * quantity, 'جنيه')}
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Quantity Selector */}
          <div className="flex items-center justify-between">
            <span className="font-medium text-gray-900">الكمية المطلوبة:</span>
            <div className="flex items-center gap-4 bg-white rounded-lg p-1 border shadow-sm">
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 text-primary hover:bg-primary/10"
                onClick={() => handleQuantityChange(quantity - 1)}
                disabled={quantity <= 1}
              >
                <Minus className="h-5 w-5" />
              </Button>
              <span className="w-12 text-center text-xl font-bold text-gray-900">
                {quantity}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 text-primary hover:bg-primary/10"
                onClick={() => handleQuantityChange(quantity + 1)}
                disabled={quantity >= maxQuantity}
              >
                <Plus className="h-5 w-5" />
              </Button>
            </div>
          </div>



          {/* Detailed Selection Summary (Optional but helpful) */}
          {(selectedSizeId || selectedAddonIds.length > 0) && (
            <div className="bg-white/50 rounded-lg p-4 text-sm space-y-2 border border-primary/10">
              {selectedSizeId && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">الحجم المحدد:</span>
                  <span className="font-medium text-gray-900">
                    {product.sizes?.find(s => s.id === selectedSizeId)?.label}
                  </span>
                </div>
              )}
              {selectedAddonIds.length > 0 && (
                <>
                  <div className="text-gray-600 mb-1">الإضافات المختارة:</div>
                  <div className="space-y-1">
                    {selectedAddonIds.map((addonId) => {
                      const addon = product.addons?.find(a => a.id === addonId);
                      if (!addon) return null;
                      return (
                        <div key={addonId} className="flex items-center justify-between bg-green-50 px-2 py-1 rounded border border-green-100">
                          <span>{addon.label}</span>
                          <span className="text-green-600 font-medium">+{formatCurrency(addon.price_delta, 'جنيه')}</span>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          )}


          <Separator />

          {/* Checkout Form */}
          <div className="space-y-4 pt-4 border-t border-primary/10">
            {/* Order Type Selection - First Field */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-gray-700">نوع الطلب</Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, orderType: 'online_purchase', appointmentDate: '', appointmentTime: '' }))} // Clear reservation fields on type change
                  className={`flex-1 py-2 text-sm rounded-md border text-center transition-all ${formData.orderType === 'online_purchase' ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
                >
                  <Truck className="inline-block w-4 h-4 mr-1 ml-1" />
                  شراء أونلاين
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, orderType: 'reservation', governorate: '', address: '' }))} // Clear online purchase fields on type change
                  className={`flex-1 py-2 text-sm rounded-md border text-center transition-all ${formData.orderType === 'reservation' ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
                >
                  <CalendarClock className="inline-block w-4 h-4 mr-1 ml-1" />
                  حجز منتج
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-gray-700">الاسم بالكامل <span className="text-red-500">*</span></Label>
              <Input
                placeholder="أدخل اسمك الكريم"
                value={formData.fullName}
                onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                className={`h-9 bg-white ${formErrors.fullName ? 'border-red-500' : ''}`}
              />
              {formErrors.fullName && <p className="text-[10px] text-red-500">مطلوب</p>}
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-gray-700">رقم الهاتف <span className="text-red-500">*</span></Label>
              <Input
                placeholder="01xxxxxxxxx"
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                className={`h-9 bg-white ${formErrors.phoneNumber ? 'border-red-500' : ''}`}
              />
              {formErrors.phoneNumber && <p className="text-[10px] text-red-500">رقم هاتف غير صحيح</p>}
            </div>

            {/* Fields for Online Purchase */}
            {formData.orderType === 'online_purchase' && (
              <>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-gray-700">المحافظة <span className="text-red-500">*</span></Label>
                  <Input
                    placeholder="اسم المحافظة"
                    value={formData.governorate}
                    onChange={(e) => setFormData(prev => ({ ...prev, governorate: e.target.value }))}
                    className={`h-9 bg-white ${formErrors.governorate ? 'border-red-500' : ''}`}
                  />
                  {formErrors.governorate && <p className="text-[10px] text-red-500">مطلوب</p>}

                  {formData.governorate && (
                    <div className="mt-2 p-2 bg-blue-50 border border-blue-100 rounded-md flex justify-between items-center text-xs text-blue-800 animate-in fade-in slide-in-from-top-1 duration-200">
                      <span>
                        مصاريف الشحن: <span className="font-bold">{['القاهرة', 'القاهره', 'cairo'].includes(formData.governorate.trim().toLowerCase()) ? '100' : '170'} جنيه</span>
                      </span>
                      <span>
                        يوصل في خلال: <span className="font-bold">{['القاهرة', 'القاهره', 'cairo'].includes(formData.governorate.trim().toLowerCase()) ? '24 ساعة' : '48 ساعة'}</span>
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-gray-700">العنوان بالتفصيل <span className="text-red-500">*</span></Label>
                  <Textarea
                    placeholder="اسم الشارع، رقم العمارة، علامة مميزة..."
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    className={`min-h-[60px] bg-white resize-none ${formErrors.address ? 'border-red-500' : ''}`}
                  />
                  {formErrors.address && <p className="text-[10px] text-red-500">مطلوب</p>}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-gray-700">ملاحظات <span className="text-gray-400 font-normal">(اختياري)</span></Label>
                  <Textarea
                    placeholder="أي تعليمات إضافية..."
                    value={formData.notes || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    className="min-h-[40px] bg-white resize-none"
                  />
                </div>
              </>
            )}

            {/* Fields for Reservation */}
            {formData.orderType === 'reservation' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-gray-700">تاريخ الحجز <span className="text-red-500">*</span></Label>
                    <Input
                      type="date"
                      value={formData.appointmentDate}
                      min={new Date().toISOString().split('T')[0]}
                      max={new Date(new Date().setDate(new Date().getDate() + 2)).toISOString().split('T')[0]}
                      onChange={(e) => setFormData(prev => ({ ...prev, appointmentDate: e.target.value }))}
                      className={`h-9 bg-white ${formErrors.appointmentDate ? 'border-red-500' : ''}`}
                    />
                    {formErrors.appointmentDate && <p className="text-[10px] text-red-500">مطلوب</p>}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-gray-700">الوقت <span className="text-red-500">*</span></Label>
                    <Input
                      type="time"
                      value={formData.appointmentTime}
                      onChange={(e) => setFormData(prev => ({ ...prev, appointmentTime: e.target.value }))}
                      className={`h-9 bg-white ${formErrors.appointmentTime ? 'border-red-500' : ''}`}
                    />
                    {formErrors.appointmentTime && <p className="text-[10px] text-red-500">مطلوب</p>}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-gray-700">ملاحظات <span className="text-gray-400 font-normal">(اختياري)</span></Label>
                  <Textarea
                    placeholder="أي تفاصيل أخرى..."
                    value={formData.notes || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    className="min-h-[40px] bg-white resize-none"
                  />
                </div>
              </>
            )}

            {/* Submit Button */}
            <Button
              className="w-full h-12 text-lg bg-primary hover:bg-primary/90 shadow-md hover:shadow-lg transition-all duration-300 mt-2"
              onClick={handleBuyClick}
              disabled={maxQuantity <= 0}
            >
              {maxQuantity <= 0 ? 'نفذت الكمية' : (
                <>
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  {formData.orderType === 'reservation' ? 'حجز الآن' : 'شراء الآن'}
                </>
              )}
            </Button>
          </div>


        </div>
      </div>
    </div>
  );
}
