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
  Sparkles
} from 'lucide-react';

interface ProductOptionsProps {
  product: Product;
  onSelectionChange: (
    selectedSize: ProductSize | null,
    selectedAddons: ProductAddon[],
    finalPrice: number
  ) => void;
}

export function ProductOptions({ product, onSelectionChange }: ProductOptionsProps) {
  const { t } = useTranslation();
  const [selectedSizeId, setSelectedSizeId] = useState<string | null>(null);
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);

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

  const hasSizes = product.sizes && product.sizes.length > 0;
  const hasAddons = product.addons && product.addons.length > 0;

  // If no sizes or addons, don't render anything
  if (!hasSizes && !hasAddons) {
    return null;
  }

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
              <h3 className="text-lg font-semibold text-gray-900">اختر الحجم</h3>
              <p className="text-sm text-gray-500">اختر الحجم المناسب لك</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {product.sizes!.map((size) => (
              <button
                key={size.id}
                onClick={() => handleSizeChange(size.id)}
                className={`relative group p-4 rounded-xl border-2 transition-all duration-200 ${
                  selectedSizeId === size.id 
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
                className={`relative group p-4 rounded-xl border-2 transition-all duration-200 ${
                  selectedAddonIds.includes(addon.id)
                    ? 'border-green-500 bg-green-50 ring-2 ring-green-200' 
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                      selectedAddonIds.includes(addon.id)
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

      {/* Price Summary */}
      <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl p-6 border border-primary/20">
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
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(calculateFinalPrice(selectedSizeId, selectedAddonIds), 'جنيه')}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              قبل الخصم
            </div>
          </div>
        </div>
        
        {/* Selected Options Summary */}
        {(selectedSizeId || selectedAddonIds.length > 0) && (
          <>
            <Separator className="my-4" />
            <div className="space-y-2">
              {selectedSizeId && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">الحجم المحدد:</span>
                  <span className="font-medium text-gray-900">
                    {product.sizes?.find(s => s.id === selectedSizeId)?.label}
                  </span>
                </div>
              )}
              {selectedAddonIds.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm text-gray-600">الإضافات المختارة:</div>
                  <div className="space-y-1">
                    {selectedAddonIds.map((addonId) => {
                      const addon = product.addons?.find(a => a.id === addonId);
                      if (!addon) return null;
                      
                      return (
                        <div key={addonId} className="flex items-center justify-between text-sm bg-green-50 px-3 py-2 rounded-lg border border-green-200">
                          <span className="font-medium text-gray-900">{addon.label}</span>
                          <span className="text-green-600 font-semibold">
                            +{formatCurrency(addon.price_delta, 'جنيه')}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
